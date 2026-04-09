/**
 * UOR Engine — Layer 0
 * ═══════════════════════════════════════════════════════════════
 *
 * THE foundational computational kernel of the UOR framework.
 * Pure math. Zero storage. Zero network. Zero side-effects.
 *
 * ARCHITECTURE:
 *   contract.ts  — Stable UorEngineContract interface (never breaks)
 *   adapter.ts   — Dynamic WASM→Contract wiring with TS fallback
 *   crate-manifest.ts — Version anchor for drift detection
 *
 * Upstream consumers use EITHER:
 *   1. getEngine() — returns full UorEngineContract
 *   2. Direct named imports (backward-compatible convenience)
 *
 * When the `uor-foundation` crate bumps:
 *   1. Drop new WASM artifacts into src/lib/wasm/uor-foundation/
 *   2. Run: npx ts-node scripts/sync-crate.ts
 *   3. Done. Zero upstream refactoring.
 *
 * @layer 0
 * @module engine
 */

// ── Contract + Adapter (the new way) ─────────────────────────────────────

export { getEngine, initEngine, engineType, crateVersion, getCapabilities, getWasmDiagnostics, isEngineReady, onEngineChange } from "./adapter";
export type { EngineMode, WasmDiagnostics } from "./adapter";
export type { UorEngineContract } from "./contract";
export { CRATE_MANIFEST } from "./crate-manifest";
export type { CrateExportName } from "./crate-manifest";

// ── Kernel Declaration (self-declared OS primitives) ─────────────────────

export {
  getKernelDeclaration,
  verifyKernel,
  namespaceToKernel,
  auditNamespaceCoverage,
  FANO_LINES,
} from "./kernel-declaration";
export type { KernelFunction, KernelFunctionName, KernelTier } from "./kernel-declaration";

// ── WASM Optimization Modules ────────────────────────────────────────────

export {
  getCachedModule,
  cacheModule,
  clearCache,
  loadWithCache,
  detectSimdSupport,
  detectSharedMemory,
} from "./wasm-cache";

export {
  WasmWorkerManager,
  getWorkerManager,
} from "./wasm-worker";
export type { WorkerCommand, WorkerResult } from "./wasm-worker";

// ── Core: Single Proof Hash (the heart of UOR) ────────────────────────────

export {
  singleProofHash,
  verifySingleProof,
  canonicalizeToNQuads,
} from "@/lib/uor-canonical";

export type { SingleProofResult } from "@/lib/uor-canonical";

// ── Cryptographic Primitives ──────────────────────────────────────────────

export { sha256hex } from "@/lib/crypto";

// ── Content Addressing (CID, IPv6, Braille, Glyph) ───────────────────────

export {
  computeCid,
  formatIpv6,
  ipv6ToContentBytes,
  encodeGlyph,
  sha256,
  bytesToHex,
  verifyIpv6Routing,
  buildIdentity,
} from "@/modules/uns/core/address";

export type { UorCanonicalIdentity } from "@/modules/uns/core/address";

// ── Address Utilities (from uor-address library layer) ────────────────────

export {
  computeUorAddress,
  computeIpv6Address,
  computeIpv6Full,
  verifyIpv6Address,
  computeModuleIdentity,
  canonicalJsonLd,
  stripSelfReferentialFields,
} from "@/lib/uor-address";

export type { ModuleIdentity } from "@/lib/uor-address";

// ── Backward-compatible ring re-exports ──────────────────────────────────
// These delegate to getEngine() so WASM is used when available.
// Existing `import { neg } from "@/modules/engine"` keeps working.

import { getEngine } from "./adapter";

/** @deprecated Use getEngine().neg() */
export const neg = (x: number) => getEngine().neg(x);
/** @deprecated Use getEngine().bnot() */
export const bnot = (x: number) => getEngine().bnot(x);
/** @deprecated Use getEngine().succ() */
export const succ = (x: number) => getEngine().succ(x);
/** @deprecated Use getEngine().pred() */
export const pred = (x: number) => getEngine().pred(x);
/** @deprecated Use getEngine().add() */
export const add = (a: number, b: number) => getEngine().add(a, b);
/** @deprecated Use getEngine().sub() */
export const sub = (a: number, b: number) => getEngine().sub(a, b);
/** @deprecated Use getEngine().mul() */
export const mul = (a: number, b: number) => getEngine().mul(a, b);
