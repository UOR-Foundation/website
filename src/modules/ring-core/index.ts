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
