/**
 * UOR SDK — Canonical identity & hologram re-exports.
 *
 * Delegates to the UNS Core address model (single source of truth)
 * via src/lib/uor-address.ts (thin re-export layer).
 *
 * The hologram is the implementation of the UOR framework:
 *   Object → URDNA2015 → SHA-256 → UorCanonicalIdentity → Hologram (17 projections)
 */

export {
  singleProofHash,
  canonicalizeToNQuads,
  verifySingleProof,
} from "@/lib/uor-canonical";

export type { SingleProofResult } from "@/lib/uor-canonical";

export {
  computeCid,
  computeUorAddress,
  computeIpv6Address,
  computeIpv6Full,
  verifyIpv6Address,
  computeModuleIdentity,
  canonicalJsonLd,
} from "@/lib/uor-address";

export type { ModuleIdentity } from "@/lib/uor-address";

// ── Hologram Projection Registry ───────────────────────────────────────────
// The hologram IS the UOR implementation — one hash, every standard.

export { project, PROJECTIONS } from "@/modules/uns/core/hologram";
export type {
  Hologram,
  HologramProjection,
  HologramSpec,
  Fidelity,
  ProjectionInput,
} from "@/modules/uns/core/hologram";
