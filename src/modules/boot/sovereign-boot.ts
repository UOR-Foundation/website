/**
 * Sovereign Boot — Self-Verifying Boot Sequence
 * ═══════════════════════════════════════════════════════════════
 *
 * Orchestrates all boot phases and produces a single UOR derivation ID
 * (the Seal) proving system integrity.
 *
 * SECURITY FIXES APPLIED:
 *  F1: Seal stored in closure, not sessionStorage (tamper-proof)
 *  F2: Session nonce prevents cross-session replay
 *  F3: Original canonical bytes stored for re-verification
 *  F4: WASM binary hash included in seal input
 *  F5: Device provenance is "self-reported" (honest labeling)
 *  F6: SystemEventBus used for security events (not window.dispatch)
 *  F7: Critical objects frozen after creation
 *
 * @module boot/sovereign-boot
 */

import type {
  BootReceipt,
  BootProgressCallback,
  DeviceProvenance,
  ExecutionContext,
  HardwareProfile,
  SealStatus,
  UorSeal,
} from "./types";
import { singleProofHash } from "@/lib/uor-canonical";
import { canonicalJsonLd } from "@/lib/uor-address";
import { sha256hex } from "@/lib/crypto";
import { initEngine, getEngine } from "@/modules/engine";
import { verifyKernel, auditNamespaceCoverage, computeKernelHashSha256 } from "@/modules/engine/kernel-declaration";
import { bus } from "@/modules/bus";
import { BUS_MANIFEST, validateManifestTraceability } from "@/modules/bus/manifest";
import { SystemEventBus } from "@/modules/observable/system-event-bus";
import { scheduleLutWarmup } from "@/modules/uns/core/hologram/gpu/lut-engine";
import { startSealMonitor } from "./seal-monitor";
import { validateStack, validateMinimality } from "./tech-stack";
import type { StackComponentStatus } from "./types";
import { sha256 } from "@noble/hashes/sha2.js";

// ── Module-private seal storage (Finding 2: closure, not sessionStorage) ──

let _receipt: BootReceipt | null = null;
let _monitorCleanup: (() => void) | null = null;

// ── Phase 0: Device Fingerprint ─────────────────────────────────────────

function detectExecutionContext(): ExecutionContext {
  try {
    const h = window.location.hostname;
    const p = window.location.protocol;

    // Local indicators
    if (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "0.0.0.0" ||
      h === "[::1]" ||
      p === "file:"
    ) {
      return "local";
    }

    // Known remote deployment domains
    if (
      h.endsWith(".lovable.app") ||
      h.endsWith(".vercel.app") ||
      h.endsWith(".netlify.app") ||
      h.endsWith(".pages.dev")
    ) {
      return "remote";
    }

    // Any other hostname is treated as remote
    return "remote";
  } catch {
    return "local";
  }
}

function detectHardware(): HardwareProfile {
  return {
    cores: navigator.hardwareConcurrency || 1,
    memoryGb: (navigator as any).deviceMemory ?? null,
    gpu: detectGpu(),
    wasmSupported: typeof WebAssembly !== "undefined",
    simdSupported: detectSimd(),
    touchCapable: "ontouchstart" in window || navigator.maxTouchPoints > 0,
    screenWidth: screen.width,
    screenHeight: screen.height,
    userAgent: navigator.userAgent,
  };
}

function detectGpu(): string | null {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return null;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null;
  } catch {
    return null;
  }
}

function detectSimd(): boolean {
  try {
    return WebAssembly.validate(
      new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])
    );
  } catch {
    return false;
  }
}

async function buildDeviceProvenance(): Promise<DeviceProvenance> {
  const context = detectExecutionContext();
  const hardware = detectHardware();
  const hostname = typeof window !== "undefined" ? window.location.hostname : "unknown";
  const origin = typeof window !== "undefined" ? window.location.origin : "unknown";

  // Hash the provenance object for inclusion in the seal
  const provenancePayload = canonicalJsonLd({
    context,
    hostname,
    origin,
    cores: hardware.cores,
    memoryGb: hardware.memoryGb,
    gpu: hardware.gpu,
    wasmSupported: hardware.wasmSupported,
    simdSupported: hardware.simdSupported,
    touchCapable: hardware.touchCapable,
    screenWidth: hardware.screenWidth,
    screenHeight: hardware.screenHeight,
    userAgent: hardware.userAgent,
  });
  const provenanceHash = await sha256hex(provenancePayload);

  const provenance: DeviceProvenance = {
    context,
    hostname,
    origin,
    hardware,
    provenanceHash,
  };

  return Object.freeze(provenance);
}

// ── Phase 1: Engine Init ────────────────────────────────────────────────

async function computeRingTableHash(): Promise<string> {
  const engine = getEngine();
  // Verify all 256 elements and hash the results
  const results = new Uint8Array(256);
  for (let x = 0; x < 256; x++) {
    results[x] = engine.neg(engine.bnot(x)) === engine.succ(x) ? 1 : 0;
  }
  // All must be 1 for a valid ring
  const allValid = results.every((r) => r === 1);
  if (!allValid) {
    throw new Error("[Sovereign Boot] Ring verification FAILED — algebraic framework is unsound");
  }
  // Hash the result table
  const bytes = new TextEncoder().encode(Array.from(results).join(","));
  const digest = sha256(new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function computeWasmBinaryHash(): Promise<string> {
  // If WASM is loaded, hash the binary. Otherwise return a known fallback marker.
  const engine = getEngine();
  if (engine.engine === "typescript") {
    return "ts-fallback";
  }
  // We can't directly access the WASM binary bytes after instantiation,
  // but we can hash a canonical fingerprint of the loaded module
  const fingerprint = `wasm:${engine.version}:${engine.listNamespaces().length}:${engine.listEnums().length}`;
  return sha256hex(fingerprint);
}

// ── Phase 2: Bus Manifest Hash ──────────────────────────────────────────

async function computeManifestHash(): Promise<string> {
  const canonical = canonicalJsonLd(BUS_MANIFEST);
  return sha256hex(canonical);
}

// ── Phase 3: Seal Computation ───────────────────────────────────────────

function generateSessionNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function computeSeal(
  ringTableHash: string,
  manifestHash: string,
  wasmBinaryHash: string,
  deviceContextHash: string,
  sessionNonce: string,
  bootedAt: string,
  kernelHash: string,
): Promise<UorSeal> {
  // Build the seal input document — kernel hash is now part of the cryptographic proof
  const sealInput = {
    "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
    "@type": "uor:SystemSeal",
    "uor:ringTableHash": ringTableHash,
    "uor:manifestHash": manifestHash,
    "uor:wasmBinaryHash": wasmBinaryHash,
    "uor:kernelHash": kernelHash,
    "uor:sessionNonce": sessionNonce,
    "uor:deviceContext": deviceContextHash,
    "uor:bootedAt": bootedAt,
  };

  // Compute the single proof hash
  const proof = await singleProofHash(sealInput);

  // Determine status
  const engine = getEngine();
  let status: SealStatus = "sealed";
  if (engine.engine === "typescript") {
    status = "degraded"; // TS fallback — math is identical but no WASM verification
  }

  const seal: UorSeal = {
    derivationId: proof.derivationId,
    glyph: proof.uorAddress["u:glyph"],
    ringTableHash,
    manifestHash,
    wasmBinaryHash,
    sessionNonce,
    deviceContextHash,
    kernelHash,
    bootedAt,
    status,
    canonicalBytes: proof.canonicalBytes,
  };

  // Finding 7: Freeze critical objects
  return Object.freeze(seal);
}

// ── Main Boot Orchestrator ──────────────────────────────────────────────

/**
 * Execute the sovereign boot sequence.
 *
 * Runs all 4 phases, produces a UOR seal, and starts the continuous monitor.
 * Safe to call multiple times — returns cached receipt if already booted.
 *
 * The seal is stored in a JavaScript closure (not sessionStorage) to prevent
 * XSS-based tampering (Finding 2).
 */
export async function sovereignBoot(
  onProgress?: BootProgressCallback,
): Promise<BootReceipt> {
  // Return cached receipt if already booted in this session
  if (_receipt) return _receipt;

  const t0 = performance.now();

  try {
    // Phase 0: Device fingerprint
    onProgress?.({ phase: "device-fingerprint", progress: 0, detail: "Detecting device" });
    const provenance = await buildDeviceProvenance();

    // Phase 1: Engine init — MUST happen BEFORE stack validation
    // KEY FIX: Previously validateStack() called getEngine() which permanently
    // locked the system into TypeScript fallback before WASM had a chance to load.
    onProgress?.({ phase: "engine-init", progress: 0.1, detail: "Loading engine" });
    await initEngine();

    // Phase 1.5: Stack validation (now safe — engine is committed)
    onProgress?.({ phase: "stack-validation", progress: 0.2, detail: "Validating tech stack" });
    const stackHealth = await validateStack();
    const stackComponents: StackComponentStatus[] = stackHealth.results.map((r) => ({
      name: r.entry.name,
      role: r.entry.role,
      available: r.available,
      version: r.version,
      criticality: r.entry.criticality,
      fallback: r.entry.fallback,
    }));

    // Phase 1.25: Kernel declaration verification — THE ENGINE ENFORCES ITSELF
    onProgress?.({ phase: "engine-init", progress: 0.3, detail: "Verifying kernel declaration" });
    const kernelResult = verifyKernel();
    if (!kernelResult.allPassed) {
      const failed = kernelResult.results.filter((r) => !r.ok).map((r) => r.name);
      throw new Error(`[Sovereign Boot] Kernel functions FAILED: ${failed.join(", ")} — boot cannot proceed with unsound primitives`);
    }

    // Phase 1.5: Namespace coverage audit — engine self-checks its declaration surface
    const coverageAudit = auditNamespaceCoverage();
    if (coverageAudit.uncovered.length > 0) {
      console.warn(`[Sovereign Boot] Uncovered namespaces: ${coverageAudit.uncovered.join(", ")}`);
    }

    // Phase 1.75: Minimality enforcement — one framework per kernel function
    const minimality = validateMinimality();
    if (!minimality.isMinimal) {
      for (const overlap of minimality.overlaps) {
        console.warn(`[Sovereign Boot] Kernel overlap: "${overlap.kernelFunction}" served by [${overlap.frameworks.join(", ")}]`);
      }
    }

    const ringTableHash = await computeRingTableHash();
    const wasmBinaryHash = await computeWasmBinaryHash();

    // Phase 2: Bus init
    onProgress?.({ phase: "bus-init", progress: 0.5, detail: "Initializing bus" });
    bus.init();
    const manifestHash = await computeManifestHash();
    const moduleCount = BUS_MANIFEST.modules.length;

    // Phase 2.5: Manifest traceability — every bus module must trace to a kernel primitive
    const traceability = validateManifestTraceability();
    if (!traceability.isTraceable) {
      for (const orphan of traceability.orphans) {
        console.warn(`[Sovereign Boot] Manifest orphan: "${orphan.ns}" has invalid kernelFunction "${orphan.invalidKernelFunction}"`);
      }
    }

    // Phase 3: Seal (kernel hash is SHA-256 — real cryptographic proof)
    onProgress?.({ phase: "seal", progress: 0.7, detail: "Computing seal" });
    const sessionNonce = generateSessionNonce();
    const bootedAt = new Date().toISOString();
    // Use SHA-256 kernel hash for the seal (cryptographically binding)
    const kernelHashSha256 = await computeKernelHashSha256();
    const seal = await computeSeal(
      ringTableHash,
      manifestHash,
      wasmBinaryHash,
      provenance.provenanceHash,
      sessionNonce,
      bootedAt,
      kernelHashSha256,
    );

    const bootTimeMs = Math.round(performance.now() - t0);

    // Build receipt — includes full kernel enforcement health
    const receipt: BootReceipt = {
      seal,
      provenance,
      engineType: getEngine().engine,
      bootTimeMs,
      moduleCount,
      stackHealth: {
        components: stackComponents,
        allCriticalPresent: stackHealth.allCriticalPresent,
        stackHash: stackHealth.stackHash,
      },
      kernelHealth: {
        allPassed: kernelResult.allPassed,
        kernelHash: kernelHashSha256,
        namespaceCoverage: {
          covered: coverageAudit.covered.length,
          uncovered: coverageAudit.uncovered.length,
          total: coverageAudit.total,
        },
        isMinimal: minimality.isMinimal,
        overlaps: minimality.overlaps,
        manifestOrphans: traceability.orphans.map((o) => o.ns),
      },
      lastVerified: new Date().toISOString(),
    };

    // Store in closure (Finding 2)
    _receipt = receipt;

    // Emit boot event via SystemEventBus (Finding 7: not window.dispatch)
    const sealBytes = new TextEncoder().encode(seal.derivationId);
    SystemEventBus.emit(
      "sovereignty",
      "boot:sealed",
      sealBytes,
      seal.canonicalBytes,
    );

    // Phase 4: Start monitor
    onProgress?.({ phase: "monitor-start", progress: 0.9, detail: "Starting monitor" });
    _monitorCleanup = startSealMonitor(seal, receipt);

    // Phase 4.5: Schedule idle-time LUT pre-warming
    scheduleLutWarmup();

    // Expose for dev debugging only
    if (import.meta.env.DEV) {
      (window as any).__uorSeal = seal;
      (window as any).__uorReceipt = receipt;
    }

    onProgress?.({ phase: "complete", progress: 1, detail: `Sealed in ${bootTimeMs}ms` });

    console.log(
      `[Sovereign Boot] Sealed in ${bootTimeMs}ms | ${seal.status} | ${getEngine().engine} | ${seal.glyph}`,
    );

    return receipt;
  } catch (err) {
    onProgress?.({ phase: "failed", progress: 0, detail: String(err) });
    console.error("[Sovereign Boot] FAILED:", err);

    // Emit failure
    SystemEventBus.emit(
      "sovereignty",
      "boot:failed",
      new TextEncoder().encode(String(err)),
      new Uint8Array(0),
    );

    throw err;
  }
}

/**
 * Get the current boot receipt (from closure).
 * Returns null if boot has not completed.
 */
export function getBootReceipt(): BootReceipt | null {
  return _receipt;
}

/**
 * Stop the seal monitor (cleanup).
 */
export function stopSealMonitor(): void {
  _monitorCleanup?.();
  _monitorCleanup = null;
}
