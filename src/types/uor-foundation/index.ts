/**
 * UOR Foundation v2.0.0 — Barrel Export
 *
 * Single entry point for all interfaces, 5 enums, and named individuals.
 * Transcribed 1:1 from the Rust uor-foundation crate.
 *
 * 14 canonical namespaces across Tri-Space:
 *   Kernel (3):  u/, schema/, op/
 *   Bridge (8):  query/, resolver/, partition/, observable/, proof/, derivation/, trace/, cert/
 *   User   (3):  type/, morphism/, state/
 *
 * @version 2.0.0
 * @see https://github.com/UOR-Foundation/UOR-Framework
 */

// ── Primitives ─────────────────────────────────────────────────────────────
export type { Primitives, P } from "./primitives";

// ── Enums ──────────────────────────────────────────────────────────────────
export type {
  Space,
  PrimitiveOp,
  MetricAxis,
  FiberState,
  GeometricCharacter,
} from "./enums";

// ── Kernel Space ───────────────────────────────────────────────────────────
export type {
  Address,
  Glyph,
  Datum,
  Term,
  Triad,
  Literal,
  Application,
  Ring,
  Operation,
  UnaryOp,
  BinaryOp,
  Involution,
  IdentityOp,
  Group,
  DihedralGroup,
} from "./kernel";

export { PI1, ZERO } from "./kernel/schema";
export { CRITICAL_IDENTITY, D2N, OP_GEOMETRY, OP_META } from "./kernel/op";
export type { OpMeta } from "./kernel/op";

// ── Bridge Space ───────────────────────────────────────────────────────────
export type {
  // Query
  Query,
  CoordinateQuery,
  MetricQuery,
  RepresentationQuery,
  // Resolver
  Resolver,
  DihedralFactorizationResolver,
  IterativeRefinementResolver,
  RefinementSuggestion,
  // Partition
  Component,
  Partition,
  IrreducibleSet,
  ReducibleSet,
  UnitSet,
  ExteriorSet,
  FiberCoordinate,
  FiberPinning,
  FiberBudget,
  // Observable
  Observable,
  StratumObservable,
  RingMetric,
  HammingMetric,
  CascadeObservable,
  CascadeLength,
  CurvatureObservable,
  HolonomyObservable,
  CatastropheObservable,
  CatastropheThreshold,
  DihedralElement,
  MetricObservable,
  PathObservable,
  // Proof
  Proof,
  CoherenceProof,
  CriticalIdentityProof,
  WitnessData,
  // Derivation
  Derivation as DerivationV2,
  DerivationStep,
  RewriteStep,
  RefinementStep,
  TermMetrics,
  // Trace
  ComputationTrace,
  ComputationStep,
  // Certificate
  Certificate,
  TransformCertificate,
  IsometryCertificate,
  InvolutionCertificate,
  // Audio
  AudioSampleFormat,
  AudioDatum as AudioDatumType,
  AudioFrame as AudioFrameType,
  AudioFeature as AudioFeatureType,
  AudioSegment as AudioSegmentType,
  AudioTrack as AudioTrackType,
  AudioLensProjection,
} from "./bridge";

export type { ResolutionState } from "./bridge/resolver";
export { OBSERVABLE_AXIS } from "./bridge/observable";

// ── User Space ─────────────────────────────────────────────────────────────
export type {
  // Type
  TypeDefinition,
  PrimitiveType,
  ProductType,
  SumType,
  ConstrainedType,
  Constraint,
  ResidueConstraint,
  CarryConstraint,
  DepthConstraint,
  CompositeConstraint,
  // Morphism
  Transform,
  Isometry,
  Embedding,
  Action,
  Composition,
  CompositionLaw,
  IdentityMorphism,
  // State
  Context,
  Binding,
  Frame,
  Transition,
} from "./user";

export { CRITICAL_COMPOSITION } from "./user/morphism";
