/**
 * Observer Patch Holography (OPH) — Intersubjective Consistency Engine
 * ════════════════════════════════════════════════════════════════════
 *
 * Implements the core axiom of Observer Patch Holography:
 *   When two observer patches overlap, their observations must agree
 *   on the intersection. Signals that satisfy this cocycle condition
 *   across multiple patches constitute "intersubjective reality."
 *
 * Structural Isomorphism:
 *   OPH Concept          → UOR Implementation
 *   ─────────────────────────────────────────────
 *   Observer Patch        → UserContextProfile (bounded interest region)
 *   Patch Overlap         → Tag-space intersection between two profiles
 *   Gauge Consistency     → Relevance agreement within tolerance
 *   Modular Flow          → Triadic phase (learn/work/play)
 *   Two-Parameter Bootstrap → (resolution, capacity) → all derived state
 *
 * The key insight: a signal is "real" not because one observer sees it,
 * but because every observer whose patch covers it agrees on its relevance.
 * This is the cocycle condition made computational.
 *
 * @module hologram-ui/engine/observerPatch
 */

import type { UserContextProfile, InboundSignal, ScoredSignal } from "./signalRelevance";
import { scoreSignal } from "./signalRelevance";

// ── Types ────────────────────────────────────────────────────────────────

/** An observer patch: a bounded region of the signal space. */
export interface ObserverPatch {
  /** Unique observer identifier */
  readonly id: string;
  /** The observer's context profile */
  readonly profile: UserContextProfile;
  /** Resolution: quantum level (0–3). Determines bit-depth of observation. */
  readonly resolution: number;
  /** Capacity: maximum simultaneous signals this observer can integrate. */
  readonly capacity: number;
}

/** Result of overlapping two patches. */
export interface PatchOverlap {
  /** IDs of the two overlapping patches */
  readonly patches: [string, string];
  /** Tags in the intersection of both patches' interest spaces */
  readonly sharedTags: string[];
  /** Overlap coefficient: |A ∩ B| / min(|A|, |B|)  ∈ [0, 1] */
  readonly overlapCoefficient: number;
  /** Phase alignment: do both observers share a dominant phase? */
  readonly phaseAligned: boolean;
}

/** A signal scored for intersubjective validity. */
export interface IntersubjectiveSignal extends ScoredSignal {
  /** Number of patches that observe this signal */
  readonly patchCount: number;
  /** Mean relevance across all observing patches */
  readonly consensusRelevance: number;
  /** Max relevance deviation between any two patches (gauge consistency) */
  readonly maxDeviation: number;
  /** Whether the cocycle condition holds (deviation < tolerance) */
  readonly cocycleConsistent: boolean;
}

/** System-wide holographic state derived from the two-parameter bootstrap. */
export interface HolographicState {
  /** Resolution parameter (quantum level 0–3) */
  readonly resolution: number;
  /** Capacity parameter (max entropy / bindings) */
  readonly capacity: number;
  /** Derived: bit-depth = 8 * 2^resolution */
  readonly bitDepth: number;
  /** Derived: state space size as readable string */
  readonly stateSpace: string;
  /** Derived: observation granularity = 1 / 2^bitDepth (clamped) */
  readonly granularity: number;
  /** Derived: max concurrent patches = floor(capacity / 2^resolution) */
  readonly maxPatches: number;
}

// ── Constants ────────────────────────────────────────────────────────────

/** Gauge consistency tolerance: max allowable relevance deviation. */
const COCYCLE_TOLERANCE = 0.25;

// ── Two-Parameter Bootstrap ──────────────────────────────────────────────

/**
 * Derive the complete holographic state from two parameters.
 *
 * This mirrors OPH's insight that all physics emerges from
 * pixel area (resolution) and screen capacity.
 *
 *   resolution → bit depth → state space → granularity
 *   capacity   → max patches → integration bandwidth
 */
export function bootstrap(resolution: number, capacity: number): HolographicState {
  const q = Math.max(0, Math.min(3, Math.round(resolution)));
  const bits = 8 * Math.pow(2, q);
  const c = Math.max(1, Math.round(capacity));

  return {
    resolution: q,
    capacity: c,
    bitDepth: bits,
    stateSpace: bits <= 32 ? Math.pow(2, bits).toLocaleString() : `2^${bits}`,
    granularity: Math.pow(2, -Math.min(bits, 52)), // clamped to float64 precision
    maxPatches: Math.max(1, Math.floor(c / Math.pow(2, q))),
  };
}

// ── Patch Construction ───────────────────────────────────────────────────

/**
 * Create an observer patch from a context profile.
 * Resolution and capacity default to Q0 / 256 if unspecified.
 */
export function createPatch(
  id: string,
  profile: UserContextProfile,
  resolution = 0,
  capacity = 256,
): ObserverPatch {
  return { id, profile, resolution, capacity };
}

// ── Patch Overlap ────────────────────────────────────────────────────────

/**
 * Compute the overlap between two observer patches.
 *
 * The overlap is defined on the tag space: the intersection of
 * both observers' active interest regions. The overlap coefficient
 * uses Szymkiewicz–Simpson (|A∩B| / min(|A|,|B|)) to handle
 * asymmetric patch sizes gracefully.
 */
export function computeOverlap(a: ObserverPatch, b: ObserverPatch): PatchOverlap {
  const tagsA = new Set(Object.keys(a.profile.interests));
  const tagsB = new Set(Object.keys(b.profile.interests));

  // Add active tasks and recent domains to each patch's coverage
  for (const t of a.profile.activeTasks) tagsA.add(t);
  for (const t of b.profile.activeTasks) tagsB.add(t);
  for (const d of a.profile.recentDomains.slice(0, 5)) tagsA.add(d);
  for (const d of b.profile.recentDomains.slice(0, 5)) tagsB.add(d);

  const shared = [...tagsA].filter((t) => tagsB.has(t));
  const minSize = Math.min(tagsA.size, tagsB.size);

  // Phase alignment: check if dominant phases match
  const dominantA = Object.entries(a.profile.phaseAffinity)
    .sort(([, wa], [, wb]) => wb - wa)[0]?.[0];
  const dominantB = Object.entries(b.profile.phaseAffinity)
    .sort(([, wa], [, wb]) => wb - wa)[0]?.[0];

  return {
    patches: [a.id, b.id],
    sharedTags: shared,
    overlapCoefficient: minSize > 0 ? shared.length / minSize : 0,
    phaseAligned: dominantA === dominantB,
  };
}

// ── Intersubjective Scoring ──────────────────────────────────────────────

/**
 * Score a signal across multiple observer patches and assess
 * intersubjective validity via the cocycle condition.
 *
 * The cocycle condition (from OPH gauge theory):
 *   For all pairs (i, j) where patch_i and patch_j both cover
 *   the signal's tag space: |relevance_i - relevance_j| < ε
 *
 * If the condition holds, the signal is intersubjectively real.
 * If not, it's observer-dependent (subjective).
 */
export function scoreIntersubjective(
  signal: InboundSignal,
  patches: ObserverPatch[],
): IntersubjectiveSignal {
  // Score signal from each patch's perspective
  const scores = patches.map((p) => scoreSignal(signal, p.profile));

  // Only consider patches whose interest space covers ≥1 signal tag
  const covering = scores.filter((s) => s.relevanceBreakdown.tagMatch > 0);
  const relevances = covering.length > 0
    ? covering.map((s) => s.relevance)
    : scores.map((s) => s.relevance);

  const mean = relevances.reduce((a, b) => a + b, 0) / relevances.length;

  // Gauge consistency: max pairwise deviation
  let maxDev = 0;
  for (let i = 0; i < relevances.length; i++) {
    for (let j = i + 1; j < relevances.length; j++) {
      maxDev = Math.max(maxDev, Math.abs(relevances[i] - relevances[j]));
    }
  }

  // Use the first score as the base (the "primary observer")
  const base = scores[0];

  return {
    ...base,
    relevance: mean,
    isSignal: mean >= 0.3,
    patchCount: patches.length,
    consensusRelevance: mean,
    maxDeviation: maxDev,
    cocycleConsistent: maxDev < COCYCLE_TOLERANCE,
  };
}

// ── Batch: Filter Intersubjective Reality ────────────────────────────────

/**
 * From a stream of inbound signals, extract only those that are
 * intersubjectively real (cocycle-consistent across all patches).
 *
 * This is the OPH "reality filter": what survives is what
 * multiple observers agree on. Everything else is noise.
 */
export function filterIntersubjectiveReality(
  signals: InboundSignal[],
  patches: ObserverPatch[],
): IntersubjectiveSignal[] {
  return signals
    .map((s) => scoreIntersubjective(s, patches))
    .filter((s) => s.cocycleConsistent && s.isSignal);
}

// ── Holographic SNR ──────────────────────────────────────────────────────

/**
 * Compute the holographic signal-to-noise ratio across all patches.
 *
 * Unlike single-observer SNR, this measures the ratio of
 * intersubjectively valid signals to total signals —
 * a measure of the system's collective coherence.
 */
export function holographicSNR(
  signals: InboundSignal[],
  patches: ObserverPatch[],
): { snr: number; total: number; intersubjective: number; subjective: number } {
  const scored = signals.map((s) => scoreIntersubjective(s, patches));
  const intersubjective = scored.filter((s) => s.cocycleConsistent && s.isSignal).length;
  const total = signals.length;

  return {
    snr: total > 0 ? intersubjective / total : 1,
    total,
    intersubjective,
    subjective: total - intersubjective,
  };
}
