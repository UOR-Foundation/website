/**
 * UOR Foundation v2.0.0 — bridge::trace
 *
 * Execution traces for computation auditing.
 * v0.2.0 additions: GeodesicTrace, MeasurementEvent,
 * TraceAnnotation, TraceSegment.
 *
 * @see spec/src/namespaces/trace.rs
 * @namespace trace/
 */

// ── Core Trace Types ───────────────────────────────────────────────────────

export interface ComputationStep {
  index(): number;
  operation(): string;
  input(): number;
  output(): number;
  certified(): boolean;
  monodromy(): number;
}

export interface ComputationTrace {
  traceId(): string;
  steps(): ComputationStep[];
  stepCount(): number;
  allCertified(): boolean;
  totalMonodromy(): number;
  derivationId(): string | null;
  quantum(): number;
}

// ══════════════════════════════════════════════════════════════════════════
// v0.2.0 ADDITIONS
// ══════════════════════════════════════════════════════════════════════════

/**
 * GeodesicTrace — a trace recording the geodesic path between two
 * ring elements, capturing each intermediate step and its distance.
 *
 * @see spec/src/namespaces/trace.rs — GeodesicTrace
 */
export interface GeodesicTrace extends ComputationTrace {
  /** Source value. */
  sourceValue(): number;
  /** Target value. */
  targetValue(): number;
  /** Total geodesic distance. */
  geodesicDistance(): number;
  /** Whether the path is a true geodesic (shortest). */
  isMinimal(): boolean;
}

/**
 * MeasurementEvent — a point-in-time measurement of an observable
 * captured during a computation trace.
 *
 * @see spec/src/namespaces/trace.rs — MeasurementEvent
 */
export interface MeasurementEvent {
  /** Event identifier. */
  eventId(): string;
  /** Step index at which the measurement was taken. */
  stepIndex(): number;
  /** Observable IRI being measured. */
  observableIri(): string;
  /** Measured value. */
  measuredValue(): number;
  /** Measurement unit. */
  unit(): string;
  /** Measurement timestamp. */
  timestamp(): string;
}

/**
 * TraceAnnotation — metadata annotation on a trace or trace segment.
 *
 * @see spec/src/namespaces/trace.rs — TraceAnnotation
 */
export interface TraceAnnotation {
  /** Annotation key. */
  key(): string;
  /** Annotation value. */
  value(): string;
  /** Step range this annotation applies to [start, end). */
  stepRange(): [number, number];
  /** Annotation source ("system" | "user" | "enforcement"). */
  source(): "system" | "user" | "enforcement";
}

/**
 * TraceSegment — a contiguous sub-sequence of a computation trace
 * with its own summary metrics.
 *
 * @see spec/src/namespaces/trace.rs — TraceSegment
 */
export interface TraceSegment {
  /** Segment identifier. */
  segmentId(): string;
  /** Parent trace. */
  traceId(): string;
  /** Start step index (inclusive). */
  startIndex(): number;
  /** End step index (exclusive). */
  endIndex(): number;
  /** Steps in this segment. */
  steps(): ComputationStep[];
  /** Annotations on this segment. */
  annotations(): TraceAnnotation[];
  /** Total monodromy within this segment. */
  monodromy(): number;
}
