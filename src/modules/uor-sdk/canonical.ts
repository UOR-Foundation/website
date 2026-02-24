/**
 * UOR SDK — Canonical identity & hologram re-exports.
 *
 * Delegates to the UNS Core address model (single source of truth)
 * via src/lib/uor-address.ts (thin re-export layer).
 *
 * The hologram is the implementation of the UOR framework:
 *   Object → URDNA2015 → SHA-256 → UorCanonicalIdentity → Hologram (23 projections)
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

export { project, PROJECTIONS, unifiedProject, assessByteCoherence } from "@/modules/uns/core/hologram";
export type {
  Hologram,
  HologramProjection,
  HologramSpec,
  Fidelity,
  ProjectionInput,
  UnifiedHologram,
  UnifiedProjectionResult,
  ProjectionCoherence,
} from "@/modules/uns/core/hologram";

// ── Trust Spanning Protocol (TSP) ─────────────────────────────────────────
// Authenticated messaging, relationship forming, and trust channels.

export {
  resolveVid,
  sealEnvelope,
  createRfi,
  acceptRfi,
  createRoutedEnvelope,
  verifyEnvelope,
  verifyRelationship,
} from "@/modules/uns/core/tsp";

export type {
  TspMessageType,
  TspVid,
  TspEnvelope,
  SealedTspEnvelope,
  TspRfi,
  TspRfa,
  TspRelationship,
  RoutedTspEnvelope,
} from "@/modules/uns/core/tsp";

// ── First Person Project (FPP) ───────────────────────────────────────────
// Decentralized trust graph: PHCs, VRCs, VECs, personas, r-cards.

export {
  issuePhc,
  issueVrc,
  issueVec,
  createPersona,
  createRcard,
  createTrustGraphNode,
  exchangeVrcs,
  verifyPhc,
  verifyVrc,
  verifyTrustTriangle,
} from "@/modules/uns/core/fpp";

export type {
  PersonhoodCredential,
  SealedPhc,
  VerifiableRelationshipCredential,
  SealedVrc,
  VerifiableEndorsementCredential,
  SealedVec,
  PersonaType,
  FppPersona,
  ResolvedPersona,
  RelationshipCard,
  SealedRcard,
  TrustGraphNode,
  SealedTrustGraphNode,
} from "@/modules/uns/core/fpp";
