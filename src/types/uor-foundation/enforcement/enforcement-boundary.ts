/**
 * UOR Foundation v2.0.0. enforcement::boundary
 *
 * SourceDeclaration, SinkDeclaration, BoundarySession, GroundedCoord, GroundedTuple.
 *
 * @see foundation/src/enforcement/mod.rs
 */

import type { GroundingPhase } from "../enums";

/** SourceDeclaration. declares an input source for enforcement validation. */
export interface SourceDeclaration {
  /** Source identifier. */
  sourceId(): string;
  /** Media type accepted. */
  mediaType(): string;
  /** Schema constraint (shape ID). */
  schemaShapeId(): string | null;
}

/** SinkDeclaration. declares an output sink for enforcement validation. */
export interface SinkDeclaration {
  /** Sink identifier. */
  sinkId(): string;
  /** Media type emitted. */
  mediaType(): string;
  /** Schema constraint (shape ID). */
  schemaShapeId(): string | null;
}

/** GroundedCoord. a fiber coordinate with grounding proof. */
export interface GroundedCoord {
  /** Fiber bit index. */
  bitIndex(): number;
  /** Grounded value. */
  value(): number;
  /** Grounding phase. */
  phase(): GroundingPhase;
  /** Derivation proving grounding. */
  derivationId(): string | null;
}

/** GroundedTuple. a tuple of grounded coordinates. */
export interface GroundedTuple {
  /** Ordered coordinates. */
  coords(): GroundedCoord[];
  /** Number of coordinates. */
  width(): number;
  /** Whether all coordinates are fully grounded. */
  isFullyGrounded(): boolean;
}

/** Grounding. the trait for grounding ring values to verified forms. */
export interface Grounding {
  /** Current grounding phase. */
  phase(): GroundingPhase;
  /** Attempt to ground a value. */
  ground(value: number): GroundedCoord;
  /** Whether grounding is complete. */
  isGrounded(): boolean;
}

/** GroundedValue. a value that has been fully grounded. */
export interface GroundedValue {
  /** The grounded value. */
  value(): number;
  /** Proof of grounding (derivation ID). */
  proofId(): string;
  /** Grounding phase (always "Grounded" or "Verified"). */
  phase(): GroundingPhase;
}
