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
} from "./observer";
