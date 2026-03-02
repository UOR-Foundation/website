/**
 * Attention-Driven Compression — Aperture → Detail Level
 * ═══════════════════════════════════════════════════════
 *
 * Maps the kernel's attention aperture (0–1) to a compression
 * schedule that controls how much geometric detail surfaces display.
 *
 * When focus is high (aperture → 1.0):
 *   - Proof drawers auto-collapse
 *   - Trace narratives compress to single-line summaries
 *   - Trust arcs shrink to micro-badges
 *   - Only the response text remains prominent
 *
 * When attention is diffuse (aperture → 0.0):
 *   - Full proof-of-thought geometry is available
 *   - Trace narratives expand with all reasoning steps
 *   - Trust arcs render at full size
 *   - Constitutional guarantees auto-surface
 *
 * The compression is CONTINUOUS, not binary. Every UI element
 * has a compression curve that maps aperture → visibility/size.
 *
 * 3-6-9 Mapping:
 *   3 — STRUCTURE:  Define the compression schedule (this module)
 *   6 — EVOLUTION:  Apply compression in ExchangeCard rendering
 *   9 — COMPLETION: Verify compressed proof still passes O(1) checks
 *
 * @module hologram-ui/engine/attention-compression
 */

import {
  ALPHA_QSVG,
  PROJECTION_FIDELITY,
  GEOMETRIC_TICK_QUANTUM,
} from "@/modules/hologram-ui/engine/reasoning";

// ══════════════════════════════════════════════════════════════════════════
// Compression Schedule — aperture → detail level
// ══════════════════════════════════════════════════════════════════════════

/**
 * Detail level: a continuous 0–1 value for each UI element.
 * 0 = fully compressed (hidden/minimal)
 * 1 = fully expanded (all detail visible)
 */
export interface CompressionSchedule {
  /** The raw aperture value from the kernel */
  readonly aperture: number;
  /** Proof drawer detail: 0 = badge only, 1 = full drawer */
  readonly proofDetail: number;
  /** Trace narrative detail: 0 = one-line, 1 = full trace */
  readonly traceDetail: number;
  /** Trust arc scale: 0.5 = micro, 1 = full */
  readonly trustArcScale: number;
  /** Guarantees visibility: 0 = hidden, 1 = auto-show */
  readonly guaranteesVisibility: number;
  /** Sources/verify section visibility */
  readonly verifyVisibility: number;
  /** Follow-up suggestions: 0 = hidden, 1 = visible */
  readonly followUpVisibility: number;
  /** Remix diff detail level */
  readonly diffDetail: number;
  /** Typography scale factor for metadata (0.7–1.0) */
  readonly metaTypographyScale: number;
  /** Whether to auto-collapse expanded sections */
  readonly autoCollapse: boolean;
  /** Response text opacity boost (focused = slightly brighter) */
  readonly responseEmphasis: number;
  /** Compression label for diagnostics */
  readonly label: "expanded" | "balanced" | "compressed" | "minimal";
}

/**
 * Compute the compression schedule from an attention aperture value.
 *
 * The curves are designed so that:
 *   - aperture < 0.3 → mostly expanded (diffuse attention, exploring)
 *   - aperture 0.3–0.7 → balanced (normal interaction)
 *   - aperture > 0.7 → compressed (focused, reading/working)
 *
 * Each element has its own compression curve shaped by α (fine-structure),
 * ensuring the compression follows the same geometric principles as the
 * spectral verification system.
 */
export function computeCompression(aperture: number): CompressionSchedule {
  // Clamp to [0, 1]
  const a = Math.max(0, Math.min(1, aperture));

  // Inverse aperture = detail level (diffuse → more detail)
  const diffuse = 1 - a;

  // Smooth compression curves (sigmoid-like, parameterized by α)
  // Higher α-power = more aggressive compression
  const proofDetail = smoothStep(diffuse, 0.2, 0.7);
  const traceDetail = smoothStep(diffuse, 0.25, 0.75);
  const trustArcScale = lerp(0.5, 1.0, smoothStep(diffuse, 0.3, 0.6));
  const guaranteesVisibility = smoothStep(diffuse, 0.4, 0.8);
  const verifyVisibility = smoothStep(diffuse, 0.3, 0.7);
  const followUpVisibility = smoothStep(diffuse, 0.35, 0.75);
  const diffDetail = smoothStep(diffuse, 0.3, 0.7);
  const metaTypographyScale = lerp(0.75, 1.0, smoothStep(diffuse, 0.2, 0.6));
  const autoCollapse = a > 0.75;
  const responseEmphasis = lerp(1.0, 1.12, smoothStep(a, 0.5, 0.9));

  // Label
  const label: CompressionSchedule["label"] =
    a < 0.25 ? "expanded" :
    a < 0.5  ? "balanced" :
    a < 0.75 ? "compressed" :
    "minimal";

  return {
    aperture: a,
    proofDetail,
    traceDetail,
    trustArcScale,
    guaranteesVisibility,
    verifyVisibility,
    followUpVisibility,
    diffDetail,
    metaTypographyScale,
    autoCollapse,
    responseEmphasis,
    label,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// Compressed Proof Summary — single-line from full receipt
// ══════════════════════════════════════════════════════════════════════════

export interface CompressedProofSummary {
  /** One-line summary string */
  readonly summary: string;
  /** Compressed emoji indicator */
  readonly indicator: string;
  /** Whether the proof is healthy */
  readonly healthy: boolean;
}

/**
 * Compress a full proof-of-thought into a single-line summary.
 * Used when attention is focused and full proof drawer is collapsed.
 */
export function compressProofSummary(proof: {
  spectralGrade: string;
  driftDelta0: number;
  triadicPhase: 3 | 6 | 9;
  fidelity: number;
  eigenvaluesLocked: number;
  converged: boolean;
  verified: boolean;
  zk: boolean;
}): CompressedProofSummary {
  const healthy = proof.verified && (proof.spectralGrade === "A" || proof.spectralGrade === "B");

  const indicator = healthy ? "✦" : proof.verified ? "◇" : "△";

  const zkTag = proof.zk ? " · ZK" : "";
  const phaseTag = proof.triadicPhase === 9 ? "⟐" : proof.triadicPhase === 6 ? "⟡" : "⟢";

  const summary =
    `${proof.spectralGrade} ${phaseTag} ` +
    `δ₀=${proof.driftDelta0.toFixed(3)} · ` +
    `${proof.eigenvaluesLocked}/5 locked · ` +
    `${(proof.fidelity * 100).toFixed(0)}%${zkTag}`;

  return { summary, indicator, healthy };
}

// ══════════════════════════════════════════════════════════════════════════
// Compressed Trace — reduce narrative to essentials
// ══════════════════════════════════════════════════════════════════════════

/**
 * Compress a full trace narrative to a target detail level.
 *
 * detail = 1.0: full narrative (all steps)
 * detail = 0.5: summary (query + final assessment only)
 * detail = 0.0: single line ("Grade A · Converged · 3 iterations")
 */
export function compressTrace(
  narrative: string[],
  detail: number,
  meta?: { grade?: string; converged?: boolean; iterations?: number },
): string[] {
  if (detail >= 0.9) return narrative;

  if (detail < 0.15) {
    // Minimal: single line
    const parts: string[] = [];
    if (meta?.grade) parts.push(`Grade ${meta.grade}`);
    if (meta?.converged != null) parts.push(meta.converged ? "Converged" : "Open");
    if (meta?.iterations != null) parts.push(`${meta.iterations} iter`);
    return [parts.join(" · ") || "Reasoning trace available"];
  }

  // Medium: first step + last step
  if (narrative.length <= 2) return narrative;
  return [narrative[0], `… ${narrative.length - 2} steps …`, narrative[narrative.length - 1]];
}

// ══════════════════════════════════════════════════════════════════════════
// Attention-Weighted Priority — which elements should survive compression
// ══════════════════════════════════════════════════════════════════════════

export type ElementPriority = "critical" | "high" | "medium" | "low" | "ambient";

const PRIORITY_THRESHOLDS: Record<ElementPriority, number> = {
  critical: 0.0,  // Always visible
  high: 0.15,     // Hidden only at extreme focus
  medium: 0.35,   // Hidden in compressed mode
  low: 0.55,      // Hidden unless diffuse
  ambient: 0.75,  // Only in fully expanded mode
};

/**
 * Determine if an element should be visible given the current compression.
 */
export function shouldShowElement(
  priority: ElementPriority,
  compression: CompressionSchedule,
): boolean {
  const threshold = PRIORITY_THRESHOLDS[priority];
  return (1 - compression.aperture) >= threshold;
}

// ══════════════════════════════════════════════════════════════════════════
// Utility functions
// ══════════════════════════════════════════════════════════════════════════

/** Hermite smoothstep: 0 when x < edge0, 1 when x > edge1 */
function smoothStep(x: number, edge0: number, edge1: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Linear interpolation */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
