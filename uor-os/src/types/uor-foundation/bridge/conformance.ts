/**
 * UOR Foundation v2.0.0. bridge::conformance
 *
 * SHACL-equivalent constraint shapes for validation.
 *
 * @see foundation/src/bridge/conformance_.rs
 * @namespace conformance/
 */

import type { ViolationKind } from "../enums";

/** Shape. a validation shape (SHACL-equivalent). */
export interface Shape {
  /** Shape identifier. */
  shapeId(): string;
  /** Target class or property. */
  targetClass(): string;
  /** Human-readable description. */
  description(): string;
}

/** PropertyShape. validates a specific property of a datum. */
export interface PropertyShape extends Shape {
  /** Property path being validated. */
  propertyPath(): string;
  /** Minimum cardinality. */
  minCount(): number | null;
  /** Maximum cardinality. */
  maxCount(): number | null;
  /** Data type constraint. */
  datatype(): string | null;
}

/** NodeShape. validates the structure of a node. */
export interface NodeShape extends Shape {
  /** Property shapes that must hold on the node. */
  properties(): PropertyShape[];
  /** Whether the node must be closed (no extra properties). */
  closed(): boolean;
}

/** ConformanceReport. result of validating data against shapes. */
export interface ConformanceReport {
  /** Whether all shapes are satisfied. */
  conforms(): boolean;
  /** Violations found. */
  violations(): Violation[];
  /** Number of shapes tested. */
  shapesTestedCount(): number;
}

/** Violation. a single constraint violation. */
export interface Violation {
  /** The shape that was violated. */
  shapeId(): string;
  /** Kind of violation. */
  kind(): ViolationKind;
  /** The offending value or path. */
  focusNode(): string;
  /** Human-readable message. */
  message(): string;
  /** Severity ("Info" | "Warning" | "Violation"). */
  severity(): string;
}
