/**
 * Hologram Engine — Coherence Facade
 * ════════════════════════════════════
 *
 * Single internal boundary for observable/observer classes.
 * Components within hologram-ui import from here — never from modules/observable directly.
 *
 * @module hologram-ui/engine/coherence
 */

// ── MetaObserver (God Conjecture Semantic Layer) ───────────────────────────
export {
  MetaObserver,
  createMetaObserver,
  UOR_MODULES,
} from "@/modules/observable/meta-observer";

export type {
  ModuleObserverProfile,
  ObservedOperation,
  RemediationPrescription,
  TelosVector,
  LogosClass,
} from "@/modules/observable/meta-observer";

// ── Observer Zones ─────────────────────────────────────────────────────────
export type {
  CoherenceZone,
  ObserverProfile,
  ObservationResult,
} from "@/modules/observable/observer";

// ── System Event Bus ───────────────────────────────────────────────────────
export {
  SystemEventBus,
  type SystemEvent,
  type SystemEventSource,
  type SystemEventListener,
} from "@/modules/observable/system-event-bus";

// ── H-Score & Geometry ─────────────────────────────────────────────────────
export {
  hScore,
  hScoreMultiByte,
  popcount,
} from "@/modules/observable/h-score";

export {
  ringMetric,
  hammingMetric,
  curvature,
  holonomy,
} from "@/modules/observable/geometry";
