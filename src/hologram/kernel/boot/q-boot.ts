/**
 * Q-Boot — Quantum Kernel Initialization Sequence
 * ═══════════════════════════════════════════════
 *
 * The mathematical BIOS of Q-Linux.
 *
 * NOW DELEGATES to genesis/axiom-post for POST — single root of truth.
 * No duplication. The kernel's first breath is the genesis POST.
 * Everything else grows from that one verified seed.
 *
 *   ┌──────────┬────────────────────────────────────────────────────┐
 *   │ BIOS     │ Q-Boot                                             │
 *   ├──────────┼────────────────────────────────────────────────────┤
 *   │ POST     │ Genesis POST (7 axiom checks) — delegated          │
 *   │ GRUB     │ Mirror topology: 48 pairs, 7 Fano lines            │
 *   │ initrd   │ Cayley-Dickson tower (algebraic firmware)           │
 *   │ init     │ Genesis process (PID 0): session CID₀, H = 1.0    │
 *   └──────────┴────────────────────────────────────────────────────┘
 *
 * @module qkernel/q-boot
 */

import {
  verifyCriticalIdentity,
  encodeUtf8, toHex,
} from "../../genesis/axiom-ring";
import { sha256 } from "../../genesis/axiom-hash";
import { createCid } from "../../genesis/axiom-cid";
import { canonicalEncode } from "../../genesis/axiom-codec";
import { getConstitutionCid, getConstitutionalAttestation } from "../../genesis/axiom-constitution";
import {
  verifyTauInvolution, verifyMirrorCoherence,
  MIRROR_PAIRS, MIRROR_COUNT, ATLAS_VERTICES,
  FANO_POINTS, FANO_LINES,
} from "../../genesis/axiom-mirror";
import {
  post as genesisPost,
  type PostCheck as GenesisPostCheck,
  type PostResult as GenesisPostResult,
} from "../../genesis/axiom-post";
import {
  getTEEBridge,
  type TEECapabilities,
  type TEEAttestationQuote,
  type TEEAssertion,
} from "../security/tee-bridge";

// ═══════════════════════════════════════════════════════════════════════
// Boot Status Types
// ═══════════════════════════════════════════════════════════════════════

/** Re-export genesis POST types as the kernel's own */
export type PostCheck = GenesisPostCheck;
export type { GenesisPostResult };

/** Kernel-level POST result — wraps genesis POST with kernel metadata */
export interface PostResult {
  readonly checks: PostCheck[];
  readonly allPassed: boolean;
  readonly ringSize: number;
  readonly criticalIdentityVerified: boolean;
  readonly timestamp: string;
  /** The genesis POST result (canonical root) */
  readonly genesisPost: GenesisPostResult;
}

export type BootStage =
  | "off" | "post" | "bootloader" | "initrd"
  | "init" | "running" | "panic";

export interface QHardware {
  readonly vertexCount: number;
  readonly edgeCount: number;
  readonly fanoPoints: number;
  readonly fanoLines: number;
  readonly mirrorPairs: number;
  readonly signClasses: number;
  readonly verified: boolean;
}

export interface QFirmware {
  readonly levels: number;
  readonly algebras: readonly string[];
  readonly properties: readonly string[];
  readonly triangleIdentitiesHold: boolean;
  readonly roundTripLossless: boolean;
}

export interface GenesisProcess {
  readonly pid: 0;
  readonly name: "init";
  readonly sessionCid: string;
  readonly hScore: number;
  readonly zone: "convergent";
  readonly createdAt: string;
  readonly parentPid: null;
  readonly state: "running";
}

export interface QKernelBoot {
  readonly stage: BootStage;
  readonly post: PostResult;
  readonly hardware: QHardware;
  readonly firmware: QFirmware;
  readonly genesis: GenesisProcess;
  readonly bootTimeMs: number;
  readonly kernelCid: string;
  readonly constitutionCid: string;
  /** TEE capabilities detected on this device */
  readonly tee: TEECapabilities;
  /** TEE attestation quote (null if software fallback) */
  readonly teeAttestation: TEEAttestationQuote | null;
  /** TEE assertion verifying kernel integrity (null if software) */
  readonly teeAssertion: TEEAssertion | null;
}

// ═══════════════════════════════════════════════════════════════════════
// Stage 1: POST — Delegates to genesis/axiom-post (SINGLE ROOT)
// ═══════════════════════════════════════════════════════════════════════

export function post(): PostResult {
  // The one true POST — from the genesis seed crystal
  const gp = genesisPost();

  // Map genesis checks to kernel-format checks
  const checks: PostCheck[] = gp.checks.map(c => ({
    name: c.name,
    passed: c.passed,
    detail: c.detail ?? (c.passed ? "VERIFIED" : "FAILED"),
  }));

  return {
    checks,
    allPassed: gp.passed,
    ringSize: 256,
    criticalIdentityVerified: gp.passed,
    timestamp: new Date().toISOString(),
    genesisPost: gp,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Stage 2: Bootloader — Load Topology ("Hardware Detection")
// ═══════════════════════════════════════════════════════════════════════

export function loadHardware(): QHardware {
  const tauOk = verifyTauInvolution();
  const mirrorOk = verifyMirrorCoherence();
  const mirrorPairs = MIRROR_COUNT;
  const vertexCount = ATLAS_VERTICES;
  const edgeCount = mirrorPairs * 2;
  const signClasses = 8;

  const verified = tauOk && mirrorOk &&
    vertexCount === 96 &&
    FANO_POINTS === 7 &&
    FANO_LINES.length === 7 &&
    mirrorPairs === 48 &&
    signClasses === 8;

  return { vertexCount, edgeCount, fanoPoints: FANO_POINTS, fanoLines: FANO_LINES.length, mirrorPairs, signClasses, verified };
}

// ═══════════════════════════════════════════════════════════════════════
// Stage 3: initrd — Cayley-Dickson Tower ("Firmware Load")
// ═══════════════════════════════════════════════════════════════════════

export function hydrateFirmware(): QFirmware {
  const algebras = ["ℝ", "ℂ", "ℍ", "𝕆", "𝕊"] as const;
  const properties = [
    "ordered", "commutative", "associative", "alternative", "power-associative",
  ] as const;

  let triangleIdentitiesHold = true;
  for (let x = 0; x < 256; x++) { if (!verifyCriticalIdentity(x)) { triangleIdentitiesHold = false; break; } }
  const roundTripLossless = verifyTauInvolution();

  return { levels: algebras.length, algebras, properties, triangleIdentitiesHold, roundTripLossless };
}

// ═══════════════════════════════════════════════════════════════════════
// Stage 4: init — Genesis Process (PID 0)
// ═══════════════════════════════════════════════════════════════════════

export function createGenesisProcess(): GenesisProcess {
  const genesisPayload = canonicalEncode({
    pid: 0, name: "init", ring: "Z/256Z",
    vertices: ATLAS_VERTICES, fanoLines: FANO_LINES.length,
    mirrorPairs: MIRROR_COUNT,
    algebras: ["R", "C", "H", "O", "S"],
    bootedAt: new Date().toISOString(),
  });

  const hashBytes = sha256(genesisPayload);
  const sessionCid = createCid(hashBytes).string;

  return {
    pid: 0, name: "init", sessionCid,
    hScore: 1.0, zone: "convergent",
    createdAt: new Date().toISOString(),
    parentPid: null, state: "running",
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Full Boot Sequence
// ═══════════════════════════════════════════════════════════════════════

export async function boot(): Promise<QKernelBoot> {
  const t0 = performance.now();

  const postResult = post();
  if (!postResult.allPassed) {
    const softwareTee: TEECapabilities = {
      provider: "software", providerName: "POST failed",
      hardwareAttestation: false, sealedStorage: false,
      userVerification: false, residentKeys: false, detectedAt: Date.now(),
    };
    return {
      stage: "panic", post: postResult,
      hardware: { vertexCount: 0, edgeCount: 0, fanoPoints: 0, fanoLines: 0, mirrorPairs: 0, signClasses: 0, verified: false },
      firmware: { levels: 0, algebras: [], properties: [], triangleIdentitiesHold: false, roundTripLossless: false },
      genesis: { pid: 0, name: "init", sessionCid: "", hScore: 0, zone: "convergent", createdAt: "", parentPid: null, state: "running" },
      bootTimeMs: performance.now() - t0, kernelCid: "", constitutionCid: "",
      tee: softwareTee, teeAttestation: null, teeAssertion: null,
    };
  }

  const hardware = loadHardware();
  const firmware = hydrateFirmware();
  const genesis = createGenesisProcess();

  // ── TEE Detection (no auto-attestation) ───────────────────────
  // TEE attestation is deferred to the MySpacePanel identity ceremony.
  // Boot only detects capabilities — the single canonical entry point
  // (MySpacePanel) triggers attestation when the user authenticates.
  const teeBridge = getTEEBridge();
  const tee = await teeBridge.detect();

  const teeAttestation: TEEAttestationQuote | null = null;
  const teeAssertion: TEEAssertion | null = null;

  const constitutionCid = getConstitutionCid().string;

  // ── Kernel CID now includes TEE attestation ──────────────────
  const kernelState = canonicalEncode({
    post: postResult.allPassed,
    hw: { v: hardware.vertexCount, e: hardware.edgeCount, f: hardware.fanoLines, m: hardware.mirrorPairs },
    fw: { levels: firmware.levels, tri: firmware.triangleIdentitiesHold, rt: firmware.roundTripLossless },
    genesis: genesis.sessionCid,
    constitution: constitutionCid,
    tee: {
      provider: tee.provider,
      hardwareAttested: teeAttestation?.hardwareBacked ?? false,
      attestationCid: teeAttestation?.attestationCid ?? null,
      assertionCid: teeAssertion?.assertionCid ?? null,
    },
  });
  const kernelHash = sha256(kernelState);
  const kernelCid = createCid(kernelHash).string;

  return {
    stage: "running", post: postResult,
    hardware, firmware, genesis,
    bootTimeMs: performance.now() - t0, kernelCid, constitutionCid,
    tee, teeAttestation, teeAssertion,
  };
}

/**
 * Synchronous boot (legacy compatibility) — no TEE attestation.
 * Use async boot() for full TEE integration.
 */
export function bootSync(): QKernelBoot {
  const t0 = performance.now();
  const postResult = post();
  const softwareTee: TEECapabilities = {
    provider: "software", providerName: "Sync boot (no TEE)",
    hardwareAttestation: false, sealedStorage: false,
    userVerification: false, residentKeys: false, detectedAt: Date.now(),
  };

  if (!postResult.allPassed) {
    return {
      stage: "panic", post: postResult,
      hardware: { vertexCount: 0, edgeCount: 0, fanoPoints: 0, fanoLines: 0, mirrorPairs: 0, signClasses: 0, verified: false },
      firmware: { levels: 0, algebras: [], properties: [], triangleIdentitiesHold: false, roundTripLossless: false },
      genesis: { pid: 0, name: "init", sessionCid: "", hScore: 0, zone: "convergent", createdAt: "", parentPid: null, state: "running" },
      bootTimeMs: performance.now() - t0, kernelCid: "", constitutionCid: "",
      tee: softwareTee, teeAttestation: null, teeAssertion: null,
    };
  }

  const hardware = loadHardware();
  const firmware = hydrateFirmware();
  const genesis = createGenesisProcess();
  const constitutionCid = getConstitutionCid().string;

  const kernelState = canonicalEncode({
    post: postResult.allPassed,
    hw: { v: hardware.vertexCount, e: hardware.edgeCount, f: hardware.fanoLines, m: hardware.mirrorPairs },
    fw: { levels: firmware.levels, tri: firmware.triangleIdentitiesHold, rt: firmware.roundTripLossless },
    genesis: genesis.sessionCid,
    constitution: constitutionCid,
    tee: { provider: "software", hardwareAttested: false, attestationCid: null, assertionCid: null },
  });
  const kernelHash = sha256(kernelState);
  const kernelCid = createCid(kernelHash).string;

  return {
    stage: "running", post: postResult,
    hardware, firmware, genesis,
    bootTimeMs: performance.now() - t0, kernelCid, constitutionCid,
    tee: softwareTee, teeAttestation: null, teeAssertion: null,
  };
}
