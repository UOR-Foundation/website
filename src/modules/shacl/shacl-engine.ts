/**
 * UOR SHACL Validation Engine — All 9 Shape Constraints as Runtime Guards.
 *
 * Implements the nine SHACL shapes from https://uor.foundation/shapes/uor-shapes.ttl
 * as TypeScript validation functions. Each constraint precisely mirrors its
 * Turtle source definition.
 *
 * Shapes:
 *   1. datum-term-disjoint       — Datum and Term are disjoint classes
 *   2. succ-composition          — neg(bnot(x)) = succ(x) proof integrity
 *   3. partition-cardinality     — four-set sum = 2^bits
 *   4. cert-required-fields      — certificate completeness
 *   5. trace-certifiedby         — trace must be certified by Dilithium-3
 *   6. transition-frames         — state transitions need canonical IDs
 *   7. critical-identity-proof   — proof:verified must be true
 *   8. derivation-id-format      — urn:uor:derivation:sha256:<64hex>
 *   9. partition-density-range   — density ∈ [0, 1]
 *
 * @see public/shacl/ — individual shape files
 * @see .well-known/uor.json — shape registry
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface ShaclViolation {
  shape: string;
  message: string;
  path?: string;
  value?: unknown;
  severity: "Violation" | "Warning";
}

export interface ShaclResult {
  conforms: boolean;
  violations: ShaclViolation[];
  shapesRun: string[];
}

// ── Constants ───────────────────────────────────────────────────────────────

const DERIVATION_ID_PATTERN = /^urn:uor:derivation:sha256:[0-9a-f]{64}$/;

const ALL_SHAPE_NAMES = [
  "datum-term-disjoint",
  "succ-composition",
  "partition-cardinality",
  "cert-required-fields",
  "trace-certifiedby",
  "transition-frames",
  "critical-identity-proof",
  "derivation-id-format",
  "partition-density-range",
] as const;

export type ShaclShapeName = (typeof ALL_SHAPE_NAMES)[number];

// ── Helpers ─────────────────────────────────────────────────────────────────

function v(
  shape: string,
  message: string,
  path?: string,
  value?: unknown,
  severity: "Violation" | "Warning" = "Violation"
): ShaclViolation {
  return { shape, message, path, value, severity };
}

function getTypes(obj: Record<string, unknown>): string[] {
  const t = obj["@type"];
  if (Array.isArray(t)) return t.map(String);
  if (typeof t === "string") return [t];
  return [];
}

function hasType(obj: Record<string, unknown>, type: string): boolean {
  return getTypes(obj).some(
    (t) => t === type || t.endsWith(`:${type}`) || t.endsWith(`/${type}`)
  );
}

// ── SHAPE 1: datum-term-disjoint ────────────────────────────────────────────

/**
 * schema:Datum and schema:Term must be disjoint classes.
 * Violation: object has @type containing BOTH 'schema:Datum' and 'schema:Term'.
 *
 * @see public/shacl/datum-term-disjoint.ttl
 */
function validateDatumTermDisjoint(obj: Record<string, unknown>): ShaclViolation[] {
  const types = getTypes(obj);
  const isDatum = types.some((t) => t.includes("Datum"));
  const isTerm = types.some((t) => t.includes("Term"));

  if (isDatum && isTerm) {
    return [
      v(
        "datum-term-disjoint",
        "schema:Datum and schema:Term are disjoint classes; an object cannot be both",
        "@type",
        types
      ),
    ];
  }
  return [];
}

// ── SHAPE 2: succ-composition ───────────────────────────────────────────────

/**
 * For any proof:CriticalIdentityProof, proof:neg_bnot_x must equal proof:succ_x.
 * This validates the fundamental algebraic identity neg(bnot(x)) = succ(x).
 *
 * @see public/shacl/succ-composition.ttl
 */
function validateSuccComposition(obj: Record<string, unknown>): ShaclViolation[] {
  if (!hasType(obj, "CriticalIdentityProof")) return [];

  const negBnot = obj["proof:neg_bnot_x"] ?? obj["neg_bnot_x"];
  const succX = obj["proof:succ_x"] ?? obj["succ_x"];

  if (negBnot === undefined || succX === undefined) return [];

  if (String(negBnot) !== String(succX)) {
    return [
      v(
        "succ-composition",
        `Critical identity violated: neg(bnot(x))=${negBnot} ≠ succ(x)=${succX}`,
        "proof:neg_bnot_x",
        { negBnot, succX }
      ),
    ];
  }
  return [];
}

// ── SHAPE 3: partition-cardinality ──────────────────────────────────────────

/**
 * For any partition:Partition, the four set cardinalities must sum to 2^bits.
 * Default Q0: sum must equal 256.
 *
 * @see public/shacl/partition-cardinality.ttl
 */
function validatePartitionCardinality(obj: Record<string, unknown>): ShaclViolation[] {
  if (!hasType(obj, "Partition")) return [];

  const sets = ["units", "exterior", "irreducible", "reducible"];
  let total = 0;
  let hasArrays = false;

  for (const s of sets) {
    const arr = obj[s] ?? obj[`partition:${s}`];
    if (Array.isArray(arr)) {
      total += arr.length;
      hasArrays = true;
    } else if (typeof arr === "number") {
      total += arr;
      hasArrays = true;
    }
  }

  if (!hasArrays) return [];

  const bits = (obj["bits"] as number) ?? (obj["partition:bits"] as number) ?? 8;
  const expected = Math.pow(2, bits);

  if (total !== expected) {
    return [
      v(
        "partition-cardinality",
        `Partition cardinality sum ${total} ≠ 2^${bits} = ${expected}`,
        "partition:cardinality",
        { total, expected }
      ),
    ];
  }
  return [];
}

// ── SHAPE 4: cert-required-fields ───────────────────────────────────────────

/**
 * Any cert:Certificate MUST have: cert:algorithm, cert:keyBytes or cert:signature,
 * and cert:certifiedBy (IRI to signer).
 *
 * @see public/shacl/cert-required-fields.ttl
 */
function validateCertRequiredFields(obj: Record<string, unknown>): ShaclViolation[] {
  if (!hasType(obj, "Certificate") && !hasType(obj, "InvolutionCertificate")) return [];

  const violations: ShaclViolation[] = [];

  const algo = obj["cert:algorithm"] ?? obj["algorithm"];
  if (!algo) {
    violations.push(
      v("cert-required-fields", "cert:Certificate must have cert:algorithm", "cert:algorithm")
    );
  }

  const keyBytes = obj["cert:keyBytes"] ?? obj["keyBytes"];
  const signature = obj["cert:signature"] ?? obj["signature"] ?? obj["cert:signatureBytes"] ?? obj["signatureBytes"];
  if (!keyBytes && !signature) {
    violations.push(
      v(
        "cert-required-fields",
        "cert:Certificate must have cert:keyBytes or cert:signature",
        "cert:keyBytes"
      )
    );
  }

  const certifiedBy = obj["cert:certifiedBy"] ?? obj["certifiedBy"];
  if (!certifiedBy) {
    violations.push(
      v(
        "cert-required-fields",
        "cert:Certificate must have cert:certifiedBy (IRI to signer)",
        "cert:certifiedBy"
      )
    );
  }

  return violations;
}

// ── SHAPE 5: trace-certifiedby ──────────────────────────────────────────────

/**
 * Any trace:ExecutionTrace MUST be cert:certifiedBy a Dilithium-3 certificate.
 *
 * @see public/shacl/trace-certifiedby.ttl
 */
function validateTraceCertifiedBy(obj: Record<string, unknown>): ShaclViolation[] {
  if (!hasType(obj, "ExecutionTrace") && !hasType(obj, "ComputationTrace")) return [];

  const certBy = obj["cert:certifiedBy"] ?? obj["certifiedBy"];
  if (!certBy) {
    return [
      v(
        "trace-certifiedby",
        "trace:ExecutionTrace must be cert:certifiedBy a Dilithium-3 certificate",
        "cert:certifiedBy"
      ),
    ];
  }

  // If algorithm is specified, it must be Dilithium-3
  const algo = obj["cert:algorithm"] ?? obj["algorithm"];
  if (algo && String(algo) !== "Dilithium-3" && String(algo) !== "dilithium3") {
    return [
      v(
        "trace-certifiedby",
        `trace cert:certifiedBy must use Dilithium-3, got '${algo}'`,
        "cert:algorithm",
        algo
      ),
    ];
  }

  return [];
}

// ── SHAPE 6: transition-frames ──────────────────────────────────────────────

/**
 * Any state:Transition MUST have state:previousCanonicalId AND state:nextCanonicalId.
 * Both must match the derivation ID pattern.
 *
 * @see public/shacl/transition-frames.ttl
 */
function validateTransitionFrames(obj: Record<string, unknown>): ShaclViolation[] {
  if (!hasType(obj, "Transition") && !hasType(obj, "StateTransition")) return [];

  const violations: ShaclViolation[] = [];

  const prev = obj["state:previousCanonicalId"] ?? obj["previousCanonicalId"] ?? obj["from_frame"];
  const next = obj["state:nextCanonicalId"] ?? obj["nextCanonicalId"] ?? obj["to_frame"];

  if (!prev) {
    violations.push(
      v(
        "transition-frames",
        "state:Transition must have state:previousCanonicalId",
        "state:previousCanonicalId"
      )
    );
  } else if (typeof prev === "string" && !DERIVATION_ID_PATTERN.test(prev)) {
    violations.push(
      v(
        "transition-frames",
        `state:previousCanonicalId must match derivation ID format, got '${prev}'`,
        "state:previousCanonicalId",
        prev
      )
    );
  }

  if (!next) {
    violations.push(
      v(
        "transition-frames",
        "state:Transition must have state:nextCanonicalId",
        "state:nextCanonicalId"
      )
    );
  } else if (typeof next === "string" && !DERIVATION_ID_PATTERN.test(next)) {
    violations.push(
      v(
        "transition-frames",
        `state:nextCanonicalId must match derivation ID format, got '${next}'`,
        "state:nextCanonicalId",
        next
      )
    );
  }

  return violations;
}

// ── SHAPE 7: critical-identity-proof ────────────────────────────────────────

/**
 * Any proof:CriticalIdentityProof MUST have proof:verified = true.
 *
 * @see public/shacl/critical-identity-proof.ttl
 */
function validateCriticalIdentityProof(obj: Record<string, unknown>): ShaclViolation[] {
  if (!hasType(obj, "CriticalIdentityProof")) return [];

  const verified = obj["proof:verified"] ?? obj["verified"];
  if (verified !== true && verified !== "true") {
    return [
      v(
        "critical-identity-proof",
        `proof:CriticalIdentityProof must have proof:verified=true, got '${verified}'`,
        "proof:verified",
        verified
      ),
    ];
  }
  return [];
}

// ── SHAPE 8: derivation-id-format ───────────────────────────────────────────

/**
 * Any derivation:derivationId MUST match urn:uor:derivation:sha256:<64hex>.
 *
 * @see public/shacl/derivation-id-format.ttl
 */
function validateDerivationIdFormat(obj: Record<string, unknown>): ShaclViolation[] {
  const id =
    obj["derivation:derivationId"] ?? obj["derivationId"] ?? obj["derivation_id"];
  if (id === undefined) return [];

  if (typeof id !== "string" || !DERIVATION_ID_PATTERN.test(id)) {
    return [
      v(
        "derivation-id-format",
        `derivation:derivationId must match urn:uor:derivation:sha256:<64hex>, got '${id}'`,
        "derivation:derivationId",
        id
      ),
    ];
  }
  return [];
}

// ── SHAPE 9: partition-density-range ────────────────────────────────────────

/**
 * Any partition:density value MUST be in [0, 1] (inclusive).
 *
 * @see public/shacl/partition-density-range.ttl
 */
function validatePartitionDensityRange(obj: Record<string, unknown>): ShaclViolation[] {
  const density = obj["partition:density"] ?? obj["density"];
  if (density === undefined) return [];

  if (typeof density !== "number" || density < 0 || density > 1) {
    return [
      v(
        "partition-density-range",
        `partition:density must be in [0, 1], got '${density}'`,
        "partition:density",
        density
      ),
    ];
  }
  return [];
}

// ── Shape Registry ──────────────────────────────────────────────────────────

type ShapeValidator = (obj: Record<string, unknown>) => ShaclViolation[];

const SHAPE_VALIDATORS: Record<ShaclShapeName, ShapeValidator> = {
  "datum-term-disjoint": validateDatumTermDisjoint,
  "succ-composition": validateSuccComposition,
  "partition-cardinality": validatePartitionCardinality,
  "cert-required-fields": validateCertRequiredFields,
  "trace-certifiedby": validateTraceCertifiedBy,
  "transition-frames": validateTransitionFrames,
  "critical-identity-proof": validateCriticalIdentityProof,
  "derivation-id-format": validateDerivationIdFormat,
  "partition-density-range": validatePartitionDensityRange,
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Run all applicable SHACL shapes against a JSON-LD object.
 *
 * Every shape is evaluated; only shapes whose type-guard matches
 * the object's @type will produce violations. Shapes that don't
 * match simply pass silently.
 *
 * @param obj  The JSON-LD object to validate (or plain record).
 * @returns    ShaclResult with conforms, violations, and shapesRun.
 */
export function validateShaclShapes(obj: unknown): ShaclResult {
  if (typeof obj !== "object" || obj === null) {
    return {
      conforms: true,
      violations: [],
      shapesRun: [...ALL_SHAPE_NAMES],
    };
  }

  const record = obj as Record<string, unknown>;
  const violations: ShaclViolation[] = [];

  for (const name of ALL_SHAPE_NAMES) {
    const vs = SHAPE_VALIDATORS[name](record);
    violations.push(...vs);
  }

  return {
    conforms: violations.length === 0,
    violations,
    shapesRun: [...ALL_SHAPE_NAMES],
  };
}

/**
 * Validate a single named shape against an object.
 */
export function validateShape(
  shapeName: ShaclShapeName,
  obj: unknown
): ShaclViolation[] {
  if (typeof obj !== "object" || obj === null) return [];
  return SHAPE_VALIDATORS[shapeName](obj as Record<string, unknown>);
}

/**
 * SHACL middleware factory — validates request body before handler.
 * Returns 422 Unprocessable Entity with ShaclResult on violation.
 *
 * For use in Hono-style route handlers:
 *   app.post('/uns/record', shaclMiddleware, handler)
 */
export function shaclGuard(body: unknown): {
  ok: boolean;
  status?: number;
  result: ShaclResult;
} {
  const result = validateShaclShapes(body);
  if (!result.conforms) {
    return { ok: false, status: 422, result };
  }
  return { ok: true, result };
}

export { ALL_SHAPE_NAMES, SHAPE_VALIDATORS };
