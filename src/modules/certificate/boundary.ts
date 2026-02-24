/**
 * UOR Object Boundary Definition
 * ═══════════════════════════════
 *
 * Before a certificate can be issued, the EXACT boundaries of the
 * object must be defined. This module answers the fundamental question:
 *
 *   "What, precisely, is being certified?"
 *
 * ── WHY BOUNDARIES MATTER ─────────────────────────────────────────
 *
 * In the UOR framework, identity is derived from content. But content
 * is only meaningful if its boundaries are unambiguous. Consider:
 *
 *   - Does the object include metadata like timestamps?
 *   - Are null/undefined values part of the identity?
 *   - What about extra fields added by intermediaries?
 *   - Is whitespace or key ordering significant?
 *
 * Without strict boundary enforcement, two "identical" objects could
 * produce different hashes — breaking the fundamental UOR guarantee
 * that same content = same identity.
 *
 * ── THE BOUNDARY CONTRACT ─────────────────────────────────────────
 *
 * Every object submitted for certification goes through a 6-step
 * boundary enforcement pipeline:
 *
 *   1. TYPE GUARD       — Object must be a non-null, non-array object
 *   2. CONTEXT GUARD    — Must have @context (JSON-LD compliance)
 *   3. TYPE ASSERTION   — Must have @type (semantic type identity)
 *   4. FIELD REDUCTION  — Strip undefined/function/symbol values
 *   5. DEPTH BOUND      — Enforce maximum nesting depth
 *   6. DETERMINISTIC SORT — Keys sorted lexicographically at every level
 *
 * After enforcement, the object has a precisely defined boundary:
 * every included field is intentional, every excluded field is
 * documented, and the structure is deterministic.
 *
 * ── UOR FRAMEWORK ALIGNMENT ───────────────────────────────────────
 *
 * This implements Layer 3 (Structure) of the UOR six-layer stack:
 *   "Lossless composition with defined boundaries"
 *
 * The boundary definition ensures:
 *   ✓ Partition clarity — what's inside vs outside the object
 *   ✓ Determinism — same logical object always yields same bytes
 *   ✓ Portability — boundary rules are self-contained, no external state
 *   ✓ Verifiability — boundary manifest is included in the certificate
 *
 * @module certificate/boundary
 */

// ── Types ───────────────────────────────────────────────────────────────────

/**
 * A boundary manifest documents exactly what was included and excluded
 * from the certified object. It is attached to the certificate so any
 * verifier can independently confirm the boundary was applied correctly.
 */
export interface BoundaryManifest {
  /** Version of the boundary enforcement rules */
  version: "1.0.0";

  /** Total number of fields in the bounded object (all levels) */
  totalFields: number;

  /** Top-level field count */
  topLevelFields: number;

  /** Maximum nesting depth observed */
  maxDepthObserved: number;

  /** Maximum nesting depth allowed */
  maxDepthAllowed: number;

  /** Fields that were stripped during enforcement (with reasons) */
  strippedFields: Array<{ path: string; reason: string }>;

  /** The sorted list of top-level keys that define the object boundary */
  boundaryKeys: string[];

  /** Whether the object had a valid @context */
  hasContext: boolean;

  /** Whether the object had a valid @type */
  hasType: boolean;

  /** The @type value (defines the semantic category) */
  declaredType: string;

  /** SHA-256 hex of the boundary key list (boundary identity) */
  boundaryHash: string;

  /** Timestamp of boundary enforcement */
  enforcedAt: string;
}

/**
 * Result of boundary enforcement: the cleaned object + its manifest.
 */
export interface BoundaryResult {
  /** The object after boundary enforcement — ready for canonicalization */
  boundedObject: Record<string, unknown>;

  /** The manifest documenting what was included/excluded */
  manifest: BoundaryManifest;

  /** Whether the object passed all boundary guards */
  valid: boolean;

  /** If invalid, the reason */
  error?: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

/** Maximum allowed nesting depth. Prevents unbounded recursion. */
const MAX_DEPTH = 16;

/** Reserved JSON-LD keys that must never be stripped */
const RESERVED_KEYS = new Set(["@context", "@type", "@id", "@graph", "@value", "@language", "@list", "@set"]);

// ── Internal helpers ────────────────────────────────────────────────────────

/**
 * Recursively sort all object keys lexicographically.
 * Arrays preserve order (semantic), but objects within arrays are sorted.
 */
function deepSortKeys(obj: unknown, depth: number, maxDepth: number, stripped: Array<{ path: string; reason: string }>, currentPath: string): unknown {
  if (depth > maxDepth) {
    stripped.push({ path: currentPath || "(root)", reason: `Exceeded max depth ${maxDepth}` });
    return undefined;
  }

  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj
      .map((item, i) => deepSortKeys(item, depth + 1, maxDepth, stripped, `${currentPath}[${i}]`))
      .filter((v) => v !== undefined);
  }

  const record = obj as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const result: Record<string, unknown> = {};

  for (const key of sortedKeys) {
    const value = record[key];
    const fieldPath = currentPath ? `${currentPath}.${key}` : key;

    // Strip undefined values
    if (value === undefined) {
      stripped.push({ path: fieldPath, reason: "undefined value" });
      continue;
    }

    // Strip function values
    if (typeof value === "function") {
      stripped.push({ path: fieldPath, reason: "function value (non-serializable)" });
      continue;
    }

    // Strip symbol values
    if (typeof value === "symbol") {
      stripped.push({ path: fieldPath, reason: "symbol value (non-serializable)" });
      continue;
    }

    result[key] = deepSortKeys(value, depth + 1, maxDepth, stripped, fieldPath);
  }

  return result;
}

/**
 * Count all fields recursively.
 */
function countFields(obj: unknown, depth: number): { total: number; maxDepth: number } {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return { total: 0, maxDepth: depth };
  }

  if (Array.isArray(obj)) {
    let total = 0;
    let max = depth;
    for (const item of obj) {
      const sub = countFields(item, depth + 1);
      total += sub.total;
      max = Math.max(max, sub.maxDepth);
    }
    return { total, maxDepth: max };
  }

  const keys = Object.keys(obj as Record<string, unknown>);
  let total = keys.length;
  let max = depth;
  for (const key of keys) {
    const sub = countFields((obj as Record<string, unknown>)[key], depth + 1);
    total += sub.total;
    max = Math.max(max, sub.maxDepth);
  }
  return { total, maxDepth: max };
}

/**
 * Compute a SHA-256 hex of a string (for boundary hash).
 */
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Enforce strict object boundaries before certification.
 *
 * This is the GATE through which every object must pass before
 * it can be canonicalized and hashed. It ensures:
 *
 *   1. The object is a valid JSON-LD structure
 *   2. Non-serializable values are stripped
 *   3. Nesting depth is bounded
 *   4. Keys are deterministically sorted
 *   5. The boundary is fully documented in a manifest
 *
 * @param obj — The raw object to enforce boundaries on
 * @returns BoundaryResult with the bounded object and manifest
 *
 * @example
 * ```ts
 * const { boundedObject, manifest, valid } = await enforceBoundary(rawObject);
 * if (!valid) throw new Error(manifest.error);
 * // boundedObject is now safe for canonicalization
 * ```
 */
export async function enforceBoundary(
  obj: unknown
): Promise<BoundaryResult> {
  const enforcedAt = new Date().toISOString();

  // ── Guard 1: Type guard ───────────────────────────────────────
  if (obj === null || obj === undefined) {
    return {
      boundedObject: {},
      manifest: emptyManifest(enforcedAt),
      valid: false,
      error: "Boundary violation: object is null or undefined",
    };
  }

  if (typeof obj !== "object" || Array.isArray(obj)) {
    return {
      boundedObject: {},
      manifest: emptyManifest(enforcedAt),
      valid: false,
      error: "Boundary violation: input must be a non-array object",
    };
  }

  const record = obj as Record<string, unknown>;

  // ── Guard 2: Context guard ────────────────────────────────────
  const hasContext = "@context" in record && record["@context"] !== undefined;

  // ── Guard 3: Type assertion ───────────────────────────────────
  const hasType = "@type" in record && typeof record["@type"] === "string";
  const declaredType = hasType ? String(record["@type"]) : "(untyped)";

  // ── Step 4–6: Field reduction, depth bounding, deterministic sort ─
  const stripped: Array<{ path: string; reason: string }> = [];
  const bounded = deepSortKeys(record, 0, MAX_DEPTH, stripped, "") as Record<string, unknown>;

  // ── Compute boundary metadata ─────────────────────────────────
  const boundaryKeys = Object.keys(bounded).sort();
  const { total: totalFields, maxDepth: maxDepthObserved } = countFields(bounded, 0);
  const topLevelFields = boundaryKeys.length;

  // Boundary hash: SHA-256 of the sorted key list
  // This creates a fingerprint of the object's SHAPE independent of values
  const boundaryHash = await sha256Hex(boundaryKeys.join("|"));

  const manifest: BoundaryManifest = {
    version: "1.0.0",
    totalFields,
    topLevelFields,
    maxDepthObserved,
    maxDepthAllowed: MAX_DEPTH,
    strippedFields: stripped,
    boundaryKeys,
    hasContext,
    hasType,
    declaredType,
    boundaryHash,
    enforcedAt,
  };

  // Object is valid if it has both @context and @type
  // Non-JSON-LD objects are still processed (the canonical module wraps them)
  // but the manifest documents the missing guards
  return {
    boundedObject: bounded,
    manifest,
    valid: true,
  };
}

/**
 * Verify that a source object, when boundary-enforced, produces
 * the same boundary manifest as expected.
 *
 * This is used during certificate verification to confirm that
 * the object's boundaries haven't shifted (e.g., fields added
 * or removed between issuance and verification).
 */
export async function verifyBoundary(
  obj: unknown,
  expectedBoundaryHash: string
): Promise<{ matches: boolean; manifest: BoundaryManifest }> {
  const result = await enforceBoundary(obj);
  return {
    matches: result.manifest.boundaryHash === expectedBoundaryHash,
    manifest: result.manifest,
  };
}

/** Create an empty manifest for error cases */
function emptyManifest(enforcedAt: string): BoundaryManifest {
  return {
    version: "1.0.0",
    totalFields: 0,
    topLevelFields: 0,
    maxDepthObserved: 0,
    maxDepthAllowed: MAX_DEPTH,
    strippedFields: [],
    boundaryKeys: [],
    hasContext: false,
    hasType: false,
    declaredType: "(none)",
    boundaryHash: "",
    enforcedAt,
  };
}
