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

// ── Holographic Lens (Composable Projection Circuits) ─────────────────────
// Content-addressed circuits: elements + wiring → one hash → every standard.
// Bidirectional: focus (dehydrate) + refract (rehydrate) = universal codec.

export { composeLens, grindLens, focusLens, refractLens, dehydrate, rehydrate, roundTrip, nestLens, fromProjection, element, sequence, parallel } from "@/modules/uns/core/hologram";
export type {
  HolographicLens,
  LensElement,
  LensWire,
  LensMorphism,
  GroundLens,
  FocusResult,
  RefractionModality,
  RefractResult,
  DehydrationResult,
} from "@/modules/uns/core/hologram";

// ── Executable Blueprint (Self-Evolving Programs / Hologram OS) ───────────
// The merger of LensBlueprint (WHAT) + PolyTree (HOW) = Executable Blueprint.
// One hash, one program, one identity. The holographic principle applied to code.

export {
  createExecutableBlueprint,
  grindExecutableBlueprint,
  boot,
  resume,
  forkExecutableBlueprint,
  compileScheduler,
  serializeExecutable,
  deserializeExecutable,
  STATIC_SCHEDULER,
  ADAPTIVE_SCHEDULER,
  LIFECYCLE_SCHEDULER,
} from "@/modules/uns/core/hologram";
export type {
  ExecutableBlueprint,
  GroundExecutableBlueprint,
  IOChannel,
  IOChannelSet,
  RuntimeConstraints,
  SchedulerSpec,
  TransitionRule,
  TransitionEffect,
  HologramSession,
  InteractionResult,
  SuspendedSession,
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
  issueAgentDelegation,
  verifyAgentDelegation,
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
  AgentDelegationCredential,
  SealedAgentDelegation,
  AgentDelegationCheck,
} from "@/modules/uns/core/fpp";

// ── Polynomial Trees (Coinductive Interface Evolution) ────────────────────
// Spivak's PolyTr category: evolving projections via terminal coalgebra.

export {
  constantTree,
  evolvingTree,
  tensorProduct,
  coproduct,
  internalHom,
  identityMorphism,
  composeMorphisms,
  executeInteraction,
  truncate,
  fppTrustEvolutionTree,
  tspChannelEvolutionTree,
  agentCapabilityEvolutionTree,
  ZERO_TREE,
  UNIT_TREE,
  DIRECTIONS,
} from "@/modules/uns/core/hologram/polytree";

export type {
  PolyTree,
  Polynomial,
  PolyTreeMorphism,
  PolynomialMap,
  TransitionContext,
  InteractionStep,
  PolyTreeSnapshot,
  DirectionName,
} from "@/modules/uns/core/hologram/polytree";

// ── Post-Quantum Bridge (Lattice-Hash Duality) ──────────────────────────
// Dilithium-3 signing + Bitcoin OP_RETURN anchoring for quantum-proof blockchains.

export {
  pqKeygen,
  pqSign,
  pqVerify,
  pqBridgePipeline,
} from "@/modules/uns/core/pq-bridge";

export type {
  PqKeyPair,
  PqEnvelope,
  PqVerifyResult,
} from "@/modules/uns/core/pq-bridge";

// ── Lens Blueprints (Shareable, Content-Addressed Lens Circuits) ────────
// Serializable lens compositions that can be saved, shared, and instantiated
// in any environment running a hologram implementation.

export {
  createBlueprint,
  grindBlueprint,
  instantiateBlueprint,
  buildLens,
  serializeBlueprint,
  deserializeBlueprint,
  composeBlueprints,
  forkBlueprint,
  registerElementFactory,
  getRegisteredKinds,
  isKindRegistered,
} from "@/modules/uns/core/hologram/lens-blueprint";

export type {
  LensBlueprint,
  ElementSpec,
  GroundBlueprint,
  InstantiatedLens,
  ElementFactory,
} from "@/modules/uns/core/hologram/lens-blueprint";

// ── Pre-built Lens Library ──────────────────────────────────────────────
export {
  MEMORY_CRISIS_BLUEPRINT,
  createMemoryCrisisBlueprint,
  PROMPT_INJECTION_SHIELD_BLUEPRINT,
  createPromptInjectionShieldBlueprint,
  SECURE_MEMORY_BLUEPRINT,
  createSecureMemoryBlueprint,
} from "@/modules/uns/core/hologram/lenses";
