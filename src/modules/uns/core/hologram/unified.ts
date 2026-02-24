/**
 * Unified Projection Engine
 * ═════════════════════════
 *
 * THE MERGE: Identity + Coherence = one concept.
 *
 * Before: two separate registries —
 *   Hologram → projects identity  (hash → protocol string)
 *   Observer → projects coherence (operation → H-score/zone)
 *
 * After: one unified projection —
 *   hash → { value, coherence }
 *
 * Every projection now carries BOTH its protocol-native identifier
 * AND its coherence assessment (H-score, zone, Φ). This is the
 * holographic principle made literal: identity and coherence are
 * not separate systems — they are two aspects of the same projection.
 *
 *   const result = unifiedProject(identity);
 *   result.did.value       → "did:uor:{cid}"         // identity
 *   result.did.coherence   → { hScore: 0, zone: "COHERENCE", phi: 1 }
 *
 * The elegance: coherence is computed from the SAME hash bytes that
 * produce the identity string. No separate observation step needed.
 * The projection IS the observation.
 *
 * @module uns/core/hologram/unified
 */

import type { ProjectionInput, HologramSpec, Fidelity } from "./index";
import type { UorCanonicalIdentity } from "../address";
import { SPECS } from "./specs";
import { hScore, popcount } from "@/modules/observable/h-score";

// ── Types ───────────────────────────────────────────────────────────────────

export type CoherenceZone = "COHERENCE" | "DRIFT" | "COLLAPSE";

/** Coherence assessment — the observer dimension of every projection. */
export interface ProjectionCoherence {
  /** H-score: Hamming distance to nearest Grade-A datum. */
  readonly hScore: number;
  /** Coherence zone derived from H-score. */
  readonly zone: CoherenceZone;
  /** Integration capacity: 0–1, inverse of normalized H-score. */
  readonly phi: number;
  /** Fidelity of the identity projection. */
  readonly fidelity: Fidelity;
}

/** A unified projection result — identity + coherence in one object. */
export interface UnifiedProjectionResult {
  /** The protocol-native identifier string. */
  readonly value: string;
  /** Coherence assessment of this projection. */
  readonly coherence: ProjectionCoherence;
  /** URL to the standard's specification. */
  readonly spec: string;
  /** Loss warning if projection is lossy. */
  readonly lossWarning?: string;
}

/** The complete unified hologram — all projections with coherence. */
export interface UnifiedHologram {
  /** The source identity. */
  readonly source: ProjectionInput;
  /** Per-byte coherence of the source hash. */
  readonly sourceCoherence: ProjectionCoherence;
  /** All unified projections keyed by standard name. */
  readonly projections: Readonly<Record<string, UnifiedProjectionResult>>;
  /** System-wide coherence: mean across all projections. */
  readonly systemCoherence: {
    readonly meanH: number;
    readonly zone: CoherenceZone;
    readonly meanPhi: number;
    readonly losslessCount: number;
    readonly lossyCount: number;
  };
}

// ── Zone Assignment (scale-invariant) ───────────────────────────────────────

const THRESHOLDS = { low: 2, high: 5 };

function assignZone(h: number): CoherenceZone {
  if (h <= THRESHOLDS.low) return "COHERENCE";
  if (h <= THRESHOLDS.high) return "DRIFT";
  return "COLLAPSE";
}

// ── Source Normalization ────────────────────────────────────────────────────

type ProjectionSource = UorCanonicalIdentity | ProjectionInput;

function toInput(source: ProjectionSource): ProjectionInput {
  if ("hex" in source && "cid" in source && "hashBytes" in source) {
    return source as ProjectionInput;
  }
  const identity = source as UorCanonicalIdentity;
  const hex = identity["u:canonicalId"].split(":").pop()!;
  return { hashBytes: identity.hashBytes, cid: identity["u:cid"], hex };
}

// ── Coherence from Hash Bytes ──────────────────────────────────────────────

/**
 * Compute coherence directly from hash bytes against the Grade-A graph.
 *
 * This is the key insight: the SAME bytes that produce the identity
 * string also produce the coherence assessment. One computation, two
 * dimensions. The projection IS the observation.
 */
function assessCoherence(
  hashBytes: Uint8Array,
  fidelity: Fidelity,
  gradeAGraph: number[],
): ProjectionCoherence {
  // Mean H-score across first 4 bytes (sufficient for coherence signal)
  const sampleSize = Math.min(4, hashBytes.length);
  let totalH = 0;
  for (let i = 0; i < sampleSize; i++) {
    totalH += hScore(hashBytes[i], gradeAGraph);
  }
  const h = totalH / sampleSize;
  return {
    hScore: h,
    zone: assignZone(h),
    phi: h === 0 ? 1 : 1 / (1 + h),
    fidelity,
  };
}

// ── Unified Projection Function ────────────────────────────────────────────

/**
 * Project a UOR identity through all registered standards,
 * returning both identity AND coherence for each projection.
 *
 * This is the merged API: one call, both dimensions.
 *
 * @param source      UorCanonicalIdentity or ProjectionInput
 * @param gradeAGraph Grade-A byte values (default: full Q0 = all 256)
 */
export function unifiedProject(
  source: ProjectionSource,
  gradeAGraph?: number[],
): UnifiedHologram;

/**
 * Project a single standard with coherence.
 */
export function unifiedProject(
  source: ProjectionSource,
  gradeAGraph: number[] | undefined,
  target: string,
): UnifiedProjectionResult;

export function unifiedProject(
  source: ProjectionSource,
  gradeAGraph?: number[],
  target?: string,
): UnifiedHologram | UnifiedProjectionResult {
  const input = toInput(source);
  const graph = gradeAGraph ?? Array.from({ length: 256 }, (_, i) => i);

  if (target) {
    const spec = SPECS.get(target);
    if (!spec) {
      throw new Error(`Unknown projection: "${target}". Registered: ${[...SPECS.keys()].join(", ")}`);
    }
    return resolveUnified(spec, input, graph);
  }

  // Full hologram: all projections with coherence
  const projections: Record<string, UnifiedProjectionResult> = {};
  let totalH = 0;
  let totalPhi = 0;
  let lossless = 0;
  let lossy = 0;

  for (const [name, spec] of SPECS) {
    const result = resolveUnified(spec, input, graph);
    projections[name] = result;
    totalH += result.coherence.hScore;
    totalPhi += result.coherence.phi;
    if (spec.fidelity === "lossless") lossless++;
    else lossy++;
  }

  const n = SPECS.size || 1;
  const meanH = totalH / n;
  const meanPhi = totalPhi / n;

  const sourceCoherence = assessCoherence(input.hashBytes, "lossless", graph);

  return {
    source: input,
    sourceCoherence,
    projections,
    systemCoherence: {
      meanH,
      zone: assignZone(meanH),
      meanPhi,
      losslessCount: lossless,
      lossyCount: lossy,
    },
  };
}

function resolveUnified(
  spec: HologramSpec,
  input: ProjectionInput,
  gradeAGraph: number[],
): UnifiedProjectionResult {
  return {
    value: spec.project(input),
    coherence: assessCoherence(input.hashBytes, spec.fidelity, gradeAGraph),
    spec: spec.spec,
    ...(spec.lossWarning ? { lossWarning: spec.lossWarning } : {}),
  };
}

// ── Convenience: Coherence-Only Query ──────────────────────────────────────

/**
 * Quick coherence check on raw bytes without full projection.
 * Useful for the multi-scale observer at L0.
 */
export function assessByteCoherence(
  byte: number,
  gradeAGraph: number[] = Array.from({ length: 256 }, (_, i) => i),
): { hScore: number; zone: CoherenceZone; phi: number; popcount: number } {
  const h = hScore(byte, gradeAGraph);
  return {
    hScore: h,
    zone: assignZone(h),
    phi: h === 0 ? 1 : 1 / (1 + h),
    popcount: popcount(byte),
  };
}
