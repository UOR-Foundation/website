/**
 * UOR Foundation v2.0.0 — TypeScript Projection
 *
 * Canonical source of truth: https://crates.io/crates/uor-foundation (Rust)
 * API documentation: https://docs.rs/uor-foundation
 *
 * These TypeScript types are a projection of the authoritative Rust crate's
 * trait definitions. The crate is the single source of truth for all
 * namespaces, classes, properties, and named individuals in the UOR ontology.
 *
 * 33 canonical namespaces across Tri-Space + Enforcement:
 *   Kernel  (15+): u/, schema/, op/, carry/, cascade/, convergence/, division/,
 *                  effect/, failure/, linear/, monoidal/, operad/, parallel/,
 *                  predicate/, recursion/, reduction/, region/, stream/
 *   Bridge  (13):  query/, resolver/, partition/, observable/, proof/, derivation/,
 *                  trace/, cert/, audio/, boundary/, cohomology/, conformance/,
 *                  homology/, interaction/
 *   User    (3):   type/, morphism/, state/
 *   Enforcement:   witnesses, builders, term, boundary
 *
 * @version 2.0.0
 * @see https://crates.io/crates/uor-foundation
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
  // v0.2.0 enums
  AchievabilityStatus,
  ComplexityClass,
  ExecutionPolicyKind,
  GroundingPhase,
  MeasurementUnit,
  PhaseBoundaryType,
  ProofModality,
  ProofStrategy,
  QuantifierKind,
  RewriteRule,
  SessionBoundaryType,
  SiteState,
  TriadProjection,
  ValidityScopeKind,
  VarianceAnnotation,
  VerificationDomain,
  ViolationKind,
} from "./enums";

export type { WittLevel } from "./enums";

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
  // v0.2.0 kernel types
  CarryBit, CarryChain, CarryProfile, EncodingQuality,
  CascadeMap, CascadeComposition, CascadeEpoch,
  NormedDivisionAlgebra, HopfFibration, ConvergenceTower,
  CayleyDicksonPair, MultiplicationTable, CayleyDicksonLevel,
  Effect, PinEffect, UnbindEffect, EndomorphismEffect, EffectChain,
  FailureKind, Failure, PartialResult, RecoveryStrategy,
  LinearResource, Lease, LinearBudget,
  MonoidalProduct, MonoidalUnit, MonoidalCategory,
  OperadOperation, Operad,
  ParallelTask, ParallelComposition, DisjointBudget,
  Predicate, QuantifiedPredicate, DispatchTable, MatchArm, MatchExpression,
  DescentMeasure, RecursionBound, RecursiveComputation,
  ReductionRule, PhaseGate, ReductionEpoch, ReductionPipeline, ReductionStrategy,
  Region, WorkingSet, RegionPartition,
  StreamElement, Stream, StreamTransform,
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
  // v0.2.0 bridge types
  Source, Sink, IngestEffect, EmitEffect, BoundarySession,
  Cochain, CoboundaryMap, CochainComplex, CohomologyGroup, ObstructionClass,
  Shape, PropertyShape, NodeShape, ConformanceReport, Violation,
  Simplex, Chain, BoundaryOperator, SimplicialComplex, ChainComplex, HomologyGroup,
  Participant, Interaction, Commutator, Associator, InteractionState,
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

// ── Enforcement Module (v0.2.0) ────────────────────────────────────────────
export type {
  EnforcementDatum,
  Validated,
  EnforcementDerivation,
  EnforcementFiberBudget,
  FreeRank,
  DatumBuilder,
  DerivationBuilder,
  FiberBudgetBuilder,
  TermBuilder,
  AssertionBuilder,
  BindingBuilder,
  SourceDeclBuilder,
  SinkDeclBuilder,
  BoundarySessionBuilder,
  TermKind,
  EnforcementTerm,
  TermArena,
  TermList,
  EnforcementBinding,
  Assertion,
  SourceDeclaration,
  SinkDeclaration,
  GroundedCoord,
  GroundedTuple,
  Grounding,
  GroundedValue,
} from "./enforcement";
