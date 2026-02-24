/**
 * UOR Object Boundary Definition
 * ═══════════════════════════════
 *
 * Before a certificate can be issued, the EXACT boundaries of the
 * object must be defined. This module answers:
 *
 *   "What, precisely, is being certified?"
 *
 * Every object passes through a 5-step enforcement pipeline:
 *
 *   1. TYPE GUARD       — Must be a non-null, non-array object
 *   2. CONTEXT GUARD    — Must have @context (JSON-LD compliance)
 *   3. TYPE ASSERTION   — Must have @type (semantic type identity)
 *   4. FIELD REDUCTION  — Strip undefined/function/symbol values
 *   5. DEPTH BOUND + DETERMINISTIC SORT — Bounded nesting, sorted keys
 *
 * Implements Layer 3 (Structure) of the UOR six-layer stack.
 *
 * @module certificate/boundary
 */

import { sha256hex } from "./utils";

// ── Types ───────────────────────────────────────────────────────────────────

export interface BoundaryManifest {
  version: "1.0.0";
  totalFields: number;
  topLevelFields: number;
  maxDepthObserved: number;
  maxDepthAllowed: number;
  strippedFields: Array<{ path: string; reason: string }>;
  boundaryKeys: string[];
  hasContext: boolean;
  hasType: boolean;
  declaredType: string;
  boundaryHash: string;
  enforcedAt: string;
}

export interface BoundaryResult {
  boundedObject: Record<string, unknown>;
  manifest: BoundaryManifest;
  valid: boolean;
  error?: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

const MAX_DEPTH = 16;

// ── Internal helpers ────────────────────────────────────────────────────────

function deepSortKeys(
  obj: unknown,
  depth: number,
  maxDepth: number,
  stripped: Array<{ path: string; reason: string }>,
  path: string
): unknown {
  if (depth > maxDepth) {
    stripped.push({ path: path || "(root)", reason: `Exceeded max depth ${maxDepth}` });
    return undefined;
  }
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj
      .map((item, i) => deepSortKeys(item, depth + 1, maxDepth, stripped, `${path}[${i}]`))
      .filter((v) => v !== undefined);
  }

  const record = obj as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(record).sort()) {
    const value = record[key];
    const fp = path ? `${path}.${key}` : key;

    if (value === undefined) { stripped.push({ path: fp, reason: "undefined" }); continue; }
    if (typeof value === "function") { stripped.push({ path: fp, reason: "function" }); continue; }
    if (typeof value === "symbol") { stripped.push({ path: fp, reason: "symbol" }); continue; }

    result[key] = deepSortKeys(value, depth + 1, maxDepth, stripped, fp);
  }
  return result;
}

function countFields(obj: unknown, depth: number): { total: number; maxDepth: number } {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return { total: 0, maxDepth: depth };
  }
  if (Array.isArray(obj)) {
    let total = 0, max = depth;
    for (const item of obj) {
      const sub = countFields(item, depth + 1);
      total += sub.total;
      max = Math.max(max, sub.maxDepth);
    }
    return { total, maxDepth: max };
  }
  const keys = Object.keys(obj as Record<string, unknown>);
  let total = keys.length, max = depth;
  for (const key of keys) {
    const sub = countFields((obj as Record<string, unknown>)[key], depth + 1);
    total += sub.total;
    max = Math.max(max, sub.maxDepth);
  }
  return { total, maxDepth: max };
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function enforceBoundary(obj: unknown): Promise<BoundaryResult> {
  const enforcedAt = new Date().toISOString();

  if (obj === null || obj === undefined) {
    return { boundedObject: {}, manifest: emptyManifest(enforcedAt), valid: false, error: "Object is null or undefined" };
  }
  if (typeof obj !== "object" || Array.isArray(obj)) {
    return { boundedObject: {}, manifest: emptyManifest(enforcedAt), valid: false, error: "Input must be a non-array object" };
  }

  const record = obj as Record<string, unknown>;
  const hasContext = "@context" in record && record["@context"] !== undefined;
  const hasType = "@type" in record && typeof record["@type"] === "string";
  const declaredType = hasType ? String(record["@type"]) : "(untyped)";

  const stripped: Array<{ path: string; reason: string }> = [];
  const bounded = deepSortKeys(record, 0, MAX_DEPTH, stripped, "") as Record<string, unknown>;

  const boundaryKeys = Object.keys(bounded).sort();
  const { total: totalFields, maxDepth: maxDepthObserved } = countFields(bounded, 0);
  const boundaryHash = await sha256hex(boundaryKeys.join("|"));

  return {
    boundedObject: bounded,
    manifest: {
      version: "1.0.0",
      totalFields,
      topLevelFields: boundaryKeys.length,
      maxDepthObserved,
      maxDepthAllowed: MAX_DEPTH,
      strippedFields: stripped,
      boundaryKeys,
      hasContext,
      hasType,
      declaredType,
      boundaryHash,
      enforcedAt,
    },
    valid: true,
  };
}

function emptyManifest(enforcedAt: string): BoundaryManifest {
  return {
    version: "1.0.0", totalFields: 0, topLevelFields: 0,
    maxDepthObserved: 0, maxDepthAllowed: MAX_DEPTH,
    strippedFields: [], boundaryKeys: [],
    hasContext: false, hasType: false, declaredType: "(none)",
    boundaryHash: "", enforcedAt,
  };
}
