/**
 * UOR Foundation v2.0.0 — Barrel Export
 *
 * Single entry point for all 82 interfaces, 5 enums, and 5 named individuals.
 * Transcribed 1:1 from the Rust uor-foundation crate.
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
export { CRITICAL_IDENTITY, D2N, OP_GEOMETRY } from "./kernel/op";

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
