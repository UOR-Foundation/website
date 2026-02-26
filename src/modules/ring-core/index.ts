/**
 * ring-core module barrel export.
 *
 * Single entry point for the entire ring-core subsystem:
 *   Ring arithmetic, coherence, canonicalization, v2 algebra.
 */

// ── Ring Arithmetic ────────────────────────────────────────────────────────
export { UORRing, Q0, Q1, Q2, Q3, Q, fromBytes, toBytes } from "./ring";
export { CoherenceError, verifyQ0Exhaustive } from "./coherence";
export type { CoherenceResult } from "./coherence";
export { canonicalize, serializeTerm } from "./canonicalization";
export type { Term } from "./canonicalization";
export { default as RingExplorerPage } from "./pages/RingExplorerPage";
export { RingCoreModule } from "./ring-module";

// ── v2 Fiber Budget ───────────────────────────────────────────────────────
export { createFiberBudget, pinFiber, freeCount, resolution } from "./fiber-budget";

// ── v2 Observable Factory ─────────────────────────────────────────────────
export {
  stratum, ringMetric, hammingMetric,
  cascadeObs, cascadeLength,
  curvature, holonomy, catastrophe, catastropheThreshold, dihedralElement,
  metricObs, pathObs,
  OBSERVABLE_TYPES,
} from "./observable-factory";

// ── v2 Constraint Algebra ─────────────────────────────────────────────────
export {
  residueConstraint, carryConstraint, depthConstraint,
  compositeConstraint, applyConstraint, filterByConstraint,
} from "./constraint";

// ── v2 Resolver ───────────────────────────────────────────────────────────
export { resolve, deriveState } from "./resolver";
export type { ResolutionSnapshot, Suggestion, ConstraintStep } from "./resolver";

// ── v2 Certificate Factory ────────────────────────────────────────────────
export { transformCertificate, isometryCertificate, involutionCertificate } from "./certificate";

// ── v2 Composition ────────────────────────────────────────────────────────
export { compose, verifyCriticalComposition, verifyCriticalCompositionAll } from "./compose";

// ── v2 Geometric Reasoning ───────────────────────────────────────────────
export {
  AXIS_TO_REASONING, REASONING_TO_AXIS,
  deductiveStep, inductiveStep, inductiveNearest,
  abductiveCurvature, reasoningCycle, reasoningLoop,
  CATASTROPHE_THRESHOLD_Q0, CONVERGENCE_EPSILON,
} from "./reasoning";
export type {
  ReasoningMode, DeductiveResult, InductiveResult, AbductiveResult,
  AbductiveHypothesis, ReasoningCycle,
} from "./reasoning";

// ── v2 Abductive Loop ────────────────────────────────────────────────────
export {
  neuralToObservable, symbolicToObservable, measureCurvature,
  hypothesisToConstraint, abductiveLoop, inferenceToObservation,
} from "./abductive-loop";
export type {
  NeuralObservation, SymbolicPrediction, ObservableRegistration,
  AbductiveIteration, AbductiveLoopResult,
} from "./abductive-loop";

// ── v2 Proof State Machine ───────────────────────────────────────────────
export {
  createProof, addDeductiveStep, addInductiveStep, addAbductiveStep,
  proofFromLoop, certifyProof, verifyCertificate, composeProofs,
  stepsByMode, hasCompleteCycle, totalFibersResolved,
} from "./proof-machine";
export type {
  ProofStep, ReasoningProof, ProofCertificate, ComposedProof,
} from "./proof-machine";

// ── v2 Strategy Scheduler ────────────────────────────────────────────────
export {
  depthFirstDeductive, breadthFirstInductive, abductiveSpiral,
  composedScheduler, executeSchedule,
  modeSequence, scheduleStepsByMode, hasScheduledCycle,
} from "./strategy-scheduler";
export type {
  StrategyNode, StrategyStepResult, ScheduleResult, ScheduleConfig,
} from "./strategy-scheduler";

// ── v2 Reasoning Command ─────────────────────────────────────────────────
export {
  execReason, createReasoningSession, getTriAxisPanels,
} from "./reason-command";
export type { ReasoningSession } from "./reason-command";

// ── v2 Neuro-Symbolic Co-Reasoning ──────────────────────────────────────
export {
  buildScaffold, measureCurvatureAndAnnotate, formatAnnotatedResponse,
  overallGrade, buildRefinementPrompt, processResponse,
  DEFAULT_CONFIG,
} from "./neuro-symbolic";
export type {
  EpistemicGrade, AnnotatedClaim, SymbolicScaffold,
  CurvatureReport, NeuroSymbolicResult, NeuroSymbolicConfig,
} from "./neuro-symbolic";

// ── Phase 7: Proof Persistence ──────────────────────────────────────────
export {
  saveReasoningProof, loadReasoningProofs, loadProofById, getProofStats,
} from "./proof-persistence";
export type { PersistedProof } from "./proof-persistence";

// ── Phase 8: Proof-Gated Inference ──────────────────────────────────────
export {
  decomposeToClaims, batchLookupProofs, composeFragments,
  storeClaims, buildPrivateFragments, planPGI,
  DEFAULT_PGI_CONFIG,
} from "./proof-gated-inference";
export type {
  ClaimSlot, ProofLookupResult, PGIResult, PGIConfig,
} from "./proof-gated-inference";
