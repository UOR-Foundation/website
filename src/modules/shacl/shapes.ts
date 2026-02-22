/**
 * UOR SHACL Shapes — TypeScript validation functions for UOR data shapes.
 *
 * Since we don't have a SHACL engine in-browser, each shape is a pure
 * validation function: (data) => { conforms, violations[] }.
 *
 * Shapes defined:
 *   - DatumShape: validates Datum records
 *   - DerivationShape: validates Derivation records
 *   - CertificateShape: validates Certificate records
 *   - PartitionShape: validates partition results
 *
 * Zero duplication — delegates classification to existing modules.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface Violation {
  shapeId: string;
  property: string;
  message: string;
  severity: "error" | "warning";
}

export interface ShapeResult {
  shapeId: string;
  conforms: boolean;
  violations: Violation[];
}

type ShapeFn = (data: Record<string, unknown>) => ShapeResult;

// ── Helpers ─────────────────────────────────────────────────────────────────

function violation(
  shapeId: string,
  property: string,
  message: string,
  severity: "error" | "warning" = "error"
): Violation {
  return { shapeId, property, message, severity };
}

function isUorIri(v: unknown): boolean {
  return typeof v === "string" && v.startsWith("https://uor.foundation/");
}

// ── DatumShape ──────────────────────────────────────────────────────────────

export function DatumShape(data: Record<string, unknown>): ShapeResult {
  const id = "shacl:DatumShape";
  const violations: Violation[] = [];

  if (!data.iri || typeof data.iri !== "string") {
    violations.push(violation(id, "iri", "Datum must have a string IRI"));
  } else if (!isUorIri(data.iri)) {
    violations.push(violation(id, "iri", "IRI must start with https://uor.foundation/"));
  }

  if (data.quantum === undefined || typeof data.quantum !== "number" || data.quantum < 0) {
    violations.push(violation(id, "quantum", "quantum must be a non-negative integer"));
  }

  if (!Array.isArray(data.bytes) || data.bytes.length === 0) {
    violations.push(violation(id, "bytes", "bytes must be a non-empty array"));
  }

  if (!Array.isArray(data.stratum)) {
    violations.push(violation(id, "stratum", "stratum must be an array"));
  }

  if (typeof data.total_stratum !== "number") {
    violations.push(violation(id, "total_stratum", "total_stratum must be a number"));
  }

  if (!Array.isArray(data.spectrum)) {
    violations.push(violation(id, "spectrum", "spectrum must be an array"));
  }

  if (typeof data.glyph !== "string" || (data.glyph as string).length === 0) {
    violations.push(violation(id, "glyph", "glyph must be a non-empty string"));
  }

  // Relation IRIs
  for (const rel of ["inverse_iri", "not_iri", "succ_iri", "pred_iri"]) {
    if (!isUorIri(data[rel])) {
      violations.push(violation(id, rel, `${rel} must be a valid UOR IRI`));
    }
  }

  return { shapeId: id, conforms: violations.length === 0, violations };
}

// ── DerivationShape ─────────────────────────────────────────────────────────

export function DerivationShape(data: Record<string, unknown>): ShapeResult {
  const id = "shacl:DerivationShape";
  const violations: Violation[] = [];

  if (typeof data.derivation_id !== "string") {
    violations.push(violation(id, "derivation_id", "derivation_id must be a string"));
  } else if (!(/^urn:uor:derivation:sha256:[0-9a-f]{64}$/.test(data.derivation_id as string))) {
    violations.push(violation(id, "derivation_id", "derivation_id must match urn:uor:derivation:sha256:<64 hex chars>"));
  }

  if (!isUorIri(data.result_iri)) {
    violations.push(violation(id, "result_iri", "result_iri must be a valid UOR IRI"));
  }

  const validGrades = ["A", "B", "C", "D"];
  if (!validGrades.includes(data.epistemic_grade as string)) {
    violations.push(violation(id, "epistemic_grade", "epistemic_grade must be A, B, C, or D"));
  }

  if (typeof data.canonical_term !== "string" || !(data.canonical_term as string).length) {
    violations.push(violation(id, "canonical_term", "canonical_term must be a non-empty string"));
  }

  if (typeof data.original_term !== "string" || !(data.original_term as string).length) {
    violations.push(violation(id, "original_term", "original_term must be a non-empty string"));
  }

  return { shapeId: id, conforms: violations.length === 0, violations };
}

// ── CertificateShape ────────────────────────────────────────────────────────

export function CertificateShape(data: Record<string, unknown>): ShapeResult {
  const id = "shacl:CertificateShape";
  const violations: Violation[] = [];

  if (typeof data.certificate_id !== "string" || !(data.certificate_id as string).length) {
    violations.push(violation(id, "certificate_id", "certificate_id must be a non-empty string"));
  }

  if (typeof data.certifies_iri !== "string" && typeof data.certifies !== "string") {
    violations.push(violation(id, "certifies", "Certificate must have cert:certifies or certifies_iri"));
  }

  if (typeof data.valid !== "boolean") {
    violations.push(violation(id, "valid", "valid must be a boolean"));
  }

  return { shapeId: id, conforms: violations.length === 0, violations };
}

// ── PartitionShape ──────────────────────────────────────────────────────────

export function PartitionShape(data: Record<string, unknown>): ShapeResult {
  const id = "shacl:PartitionShape";
  const violations: Violation[] = [];

  const sets = ["units", "exterior", "irreducible", "reducible"];
  let total = 0;

  for (const s of sets) {
    if (!Array.isArray(data[s])) {
      violations.push(violation(id, s, `${s} must be an array`));
    } else {
      total += (data[s] as unknown[]).length;
    }
  }

  // Check cardinality sums to 2^bits if bits is provided
  if (typeof data.bits === "number" && violations.length === 0) {
    const expected = Math.pow(2, data.bits as number);
    if (total !== expected) {
      violations.push(violation(id, "cardinality", `Total elements ${total} must equal 2^${data.bits} = ${expected}`));
    }
  }

  // Check disjointness
  if (violations.length === 0) {
    const all = [
      ...(data.units as number[]),
      ...(data.exterior as number[]),
      ...(data.irreducible as number[]),
      ...(data.reducible as number[]),
    ];
    if (new Set(all).size !== all.length) {
      violations.push(violation(id, "disjoint", "Partition sets must be disjoint"));
    }
  }

  return { shapeId: id, conforms: violations.length === 0, violations };
}

// ── Shape registry ──────────────────────────────────────────────────────────

export const SHAPES: Record<string, ShapeFn> = {
  "shacl:DatumShape": DatumShape,
  "shacl:DerivationShape": DerivationShape,
  "shacl:CertificateShape": CertificateShape,
  "shacl:PartitionShape": PartitionShape,
};

export const SHAPE_IDS = Object.keys(SHAPES);
