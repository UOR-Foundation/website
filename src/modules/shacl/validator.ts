/**
 * UOR SHACL Validator — validates data against UOR shape constraints.
 *
 * Provides:
 *   - validate(data, shapeId?): validate against specific or all shapes
 *   - validateOnWrite(data): enforces R1 (derivation-first writes)
 *
 * Delegates to shapes.ts for individual shape validation.
 */

import { SHAPES, SHAPE_IDS } from "./shapes";
import type { ShapeResult, Violation } from "./shapes";

// ── Aggregate result ────────────────────────────────────────────────────────

export interface ValidationReport {
  conforms: boolean;
  results: ShapeResult[];
  totalViolations: number;
}

// ── validate ────────────────────────────────────────────────────────────────

/**
 * Validate data against a specific shape or auto-detect.
 * If shapeId is provided, validates only against that shape.
 * Otherwise tries all shapes and returns the best match.
 */
export function validate(
  data: Record<string, unknown>,
  shapeId?: string
): ValidationReport {
  const results: ShapeResult[] = [];

  if (shapeId && SHAPES[shapeId]) {
    results.push(SHAPES[shapeId](data));
  } else if (shapeId) {
    results.push({
      shapeId,
      conforms: false,
      violations: [{ shapeId, property: "@type", message: `Unknown shape: ${shapeId}`, severity: "error" }],
    });
  } else {
    // Auto-detect: run all shapes
    for (const id of SHAPE_IDS) {
      results.push(SHAPES[id](data));
    }
  }

  const totalViolations = results.reduce((s, r) => s + r.violations.length, 0);

  return {
    conforms: results.every((r) => r.conforms),
    results,
    totalViolations,
  };
}

// ── validateOnWrite ─────────────────────────────────────────────────────────

/**
 * Enforces Requirement R1: every datum written must either have an
 * associated derivation or be tagged epistemic grade 'D'.
 *
 * Call this BEFORE any insert to kg-store.
 */
export function validateOnWrite(
  data: Record<string, unknown>
): ValidationReport {
  const results: ShapeResult[] = [];

  // If it's a datum record, validate datum shape
  if (data.iri && data.bytes) {
    results.push(SHAPES["shacl:DatumShape"](data));
  }

  // If it's a derivation record, validate derivation shape
  if (data.derivation_id) {
    results.push(SHAPES["shacl:DerivationShape"](data));
  }

  // If it's a certificate, validate certificate shape
  if (data.certificate_id) {
    results.push(SHAPES["shacl:CertificateShape"](data));
  }

  // R1 enforcement: datum without derivation gets a warning
  if (data.iri && data.bytes && !data.derivation_id && data.epistemic_grade !== "D") {
    results.push({
      shapeId: "shacl:R1",
      conforms: false,
      violations: [{
        shapeId: "shacl:R1",
        property: "derivation_id",
        message: "R1 violation: datum without derivation must be tagged grade 'D'",
        severity: "warning",
      }],
    });
  }

  const totalViolations = results.reduce((s, r) => s + r.violations.length, 0);

  return {
    conforms: results.every((r) => r.conforms),
    results,
    totalViolations,
  };
}
