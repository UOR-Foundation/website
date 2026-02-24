/**
 * UOR Observable Module — observable: namespace barrel export.
 */

export { recordObservable, queryObservables } from "./observable";
export type { Observable } from "./observable";

// ── P26: Observer Theory — H-Score, Zones, Protocols ────────────────────────
export { popcount, hScore, hScoreMultiByte, hScoreFromCanonicalId } from "./h-score";
export { UnsObserver, assignZone } from "./observer";
export type {
  CoherenceZone,
  ObserverProfile,
  ObserverThresholds,
  ObservationResult,
  RemediationRecord,
  IntegrationMetrics,
} from "./observer";

// ── P31: Observable Geometry Layer — 7 Ring Metrics ─────────────────────────
export {
  ringMetric,
  hammingMetric,
  cascadeLength,
  CATASTROPHE_THRESHOLD,
  curvature,
  holonomy,
  commutator,
  observablePath,
  observableStream,
} from "./geometry";
export type { ObservableResult } from "./geometry";

// ── MetaObserver — God Conjecture Semantic Meta-Layer ───────────────────────
export {
  MetaObserver,
  createMetaObserver,
  UOR_MODULES,
} from "./meta-observer";
export type {
  ModuleObserverProfile,
  ObservedOperation,
  RemediationPrescription,
  TelosVector,
  LogosClass,
} from "./meta-observer";

// ── Multi-Scale Observer — Holographic Zoom Engine ─────────────────────────
export {
  MultiScaleObserver,
  createFullStackObservation,
  observeByte,
  observeDatum,
  observeOperation,
  observeModule,
  observeProjection,
  observeNetwork,
  SCALE_LABELS,
} from "./multi-scale";
export type {
  ScaleLevel,
  ScaleObservation,
} from "./multi-scale";

// ── Stream Projection — Live Coherence Rendering Engine ───────────────────
export { StreamProjection } from "./stream-projection";
export type { StreamSnapshot, LevelSnapshot, StreamListener } from "./stream-projection";
