/**
 * UOR Foundation v2.0.0 — TypeScript Projection
 *
 * Canonical source of truth: https://crates.io/crates/uor-foundation (Rust)
 * API documentation: https://docs.rs/uor-foundation
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
 */

// ── Primitives ─────────────────────────────────────────────────────────────
export type { Primitives, P } from "./primitives";

// ── Enums ──────────────────────────────────────────────────────────────────
export type {
  Space, PrimitiveOp, MetricAxis, FiberState, GeometricCharacter,
  AchievabilityStatus, ComplexityClass, ExecutionPolicyKind,
  GroundingPhase, MeasurementUnit, PhaseBoundaryType,
  ProofModality, ProofStrategy, QuantifierKind, RewriteRule,
  SessionBoundaryType, SiteState, TriadProjection,
  ValidityScopeKind, VarianceAnnotation, VerificationDomain, ViolationKind,
} from "./enums";
export type { WittLevel } from "./enums";

// ── Kernel Space ───────────────────────────────────────────────────────────
export type {
  Address, Glyph,
  // schema
  Datum, Term, Triad, Literal, Application, Ring,
  TermExpression, VariableBinding, W16Ring, W32Ring, RingHomomorphism, RingExtension,
  // op
  Operation, UnaryOp, BinaryOp, Involution, IdentityOp, Group, DihedralGroup,
  DispatchOperation, SessionCompositionOperation, LiftOperation,
  ReductionOperation, ParallelOperation, OperationChain,
  // v0.2.0 kernel modules
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
  Query, CoordinateQuery, MetricQuery, RepresentationQuery,
  // Resolver
  Resolver, DihedralFactorizationResolver, IterativeRefinementResolver,
  RefinementSuggestion,
  HomotopyResolver, SessionResolver, GeodesicResolver, SpectralResolver,
  LiftResolver, CascadeResolver, EnforcementResolver, ReductionResolver,
  CompositeResolver, ResolutionPlan,
  // Partition
  Component, Partition, IrreducibleSet, ReducibleSet, UnitSet, ExteriorSet,
  FiberCoordinate, FiberPinning, FiberBudget,
  SiteBinding, PartitionProduct, PartitionRefinement, FiberProjection,
  // Observable
  Observable, StratumObservable, RingMetric, HammingMetric,
  CascadeObservable, CascadeLength, CurvatureObservable,
  HolonomyObservable, CatastropheObservable, CatastropheThreshold,
  DihedralElement, MetricObservable, PathObservable,
  TopologicalObservable, SpectralGap, SpectralObservable,
  EntropyObservable, ComplexityObservable, SessionObservable,
  BoundaryObservable, FiberObservable, ConvergenceObservable,
  ReductionObservable, InteractionObservable, HomologyObservable,
  CohomologyObservable, GroundingObservable, AggregateObservable,
  // Proof
  Proof, CoherenceProof, CriticalIdentityProof, WitnessData,
  InductiveProof, TacticApplication, ProofTerm, ProofContext,
  ProofObligation, ProofScript,
  // Derivation
  Derivation as DerivationV2, DerivationStep, RewriteStep, RefinementStep, TermMetrics,
  // Trace
  ComputationTrace, ComputationStep,
  GeodesicTrace, MeasurementEvent, TraceAnnotation, TraceSegment,
  // Certificate
  Certificate, TransformCertificate, IsometryCertificate, InvolutionCertificate,
  GeodesicCertificate, LiftChainCertificate, DeformationCertificate,
  CompositionCertificate, EmbeddingCertificate, ActionCertificate,
  SessionCertificate, CertificateChain,
  // Audio
  AudioSampleFormat, AudioDatum as AudioDatumType, AudioFrame as AudioFrameType,
  AudioFeature as AudioFeatureType, AudioSegment as AudioSegmentType,
  AudioTrack as AudioTrackType, AudioLensProjection,
  // v0.2.0 bridge modules
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
  // Type (core)
  TypeDefinition, PrimitiveType, ProductType, SumType,
  ConstrainedType, Constraint, ResidueConstraint, CarryConstraint,
  DepthConstraint, CompositeConstraint,
  // Type (v0.2.0)
  ModuliSpace, LiftChain, DeformationFamily, GaloisConnection,
  TypeScheme, TypeVariable, RecursiveType, RefinementType,
  DependentType, HigherKindedType, UniverseLevel, TypeEquality,
  Subtyping, TypeInference, UnificationResult, TypeContext,
  TypeJudgment, TypeDerivation,
  // Morphism (core)
  Transform, Isometry, Embedding, Action, Composition,
  CompositionLaw, IdentityMorphism,
  // Morphism (v0.2.0)
  GroundingMap, ProjectionMap, Witness, SymbolSequence,
  TopologicalDelta, FunctorMorphism, NaturalTransformation,
  AdjunctionPair, MonadMorphism, ComonadMorphism,
  DiagramMorphism, LimitCone,
  // State (core)
  Context, Binding, Frame, Transition,
  // State (v0.2.0)
  Session, SessionBoundary, SharedContext, ContextLease,
  ContextMigration, StateCheckpoint, StateSnapshot,
} from "./user";

export { CRITICAL_COMPOSITION } from "./user/morphism";

// ── Enforcement Module (v0.2.0) ────────────────────────────────────────────
export type {
  EnforcementDatum, Validated, EnforcementDerivation,
  EnforcementFiberBudget, FreeRank,
  DatumBuilder, DerivationBuilder, FiberBudgetBuilder,
  TermBuilder, AssertionBuilder, BindingBuilder,
  SourceDeclBuilder, SinkDeclBuilder, BoundarySessionBuilder,
  TermKind, EnforcementTerm, TermArena, TermList,
  EnforcementBinding, Assertion,
  SourceDeclaration, SinkDeclaration,
  GroundedCoord, GroundedTuple,
  Grounding, GroundedValue,
} from "./enforcement";
