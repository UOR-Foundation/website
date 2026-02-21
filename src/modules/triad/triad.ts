/**
 * UOR Triadic Coordinate System — the three canonical coordinates of any datum.
 *
 * Every datum decomposes into:
 *   - datum:    ByteTuple — WHAT it is
 *   - stratum:  number[]  — HOW MUCH information it carries (popcount per byte)
 *   - spectrum: number[][] — WHICH bits compose it (active basis indices per byte)
 *
 * Delegates to existing primitives in src/lib/uor-ring.ts (buildTriad, bytePopcount,
 * byteBasis). This module adds the semantic stratumLevel classification and
 * computeTriad as a ByteTuple-first entry point.
 *
 * Zero duplication — all arithmetic delegates to the ring engine.
 */

import type { ByteTuple, Triad } from "@/types/uor";
import { bytePopcount, byteBasis } from "@/lib/uor-ring";

// ── Triad computation (ByteTuple-first) ─────────────────────────────────────

/**
 * Compute the Triad positional vector for a raw ByteTuple.
 * Unlike buildTriad(value, n) in uor-ring.ts which takes a number,
 * this operates directly on bytes — useful when you already have the tuple.
 */
export function computeTriad(bytes: ByteTuple): Triad {
  const stratum = bytes.map(bytePopcount);
  const spectrum = bytes.map(byteBasis);
  const totalStratum = stratum.reduce((a, b) => a + b, 0);
  return { datum: bytes, stratum, spectrum, totalStratum };
}

// ── Re-exports for convenience (no duplication) ─────────────────────────────

export { bytePopcount as popcount, byteBasis as basisElements } from "@/lib/uor-ring";

// ── Stratum semantic classification ─────────────────────────────────────────

/**
 * Classify the stratum density into a semantic level.
 *
 * The stratum hierarchy is the UOR equivalent of RDFS type hierarchy:
 *   - "low"    (0–33%): algebraically simpler, broader concept
 *   - "medium" (34–66%): balanced information density
 *   - "high"   (67–100%): more information, more specific
 *
 * @param totalStratum - sum of per-byte popcounts
 * @param maxBits - total bit width of the ring (e.g. 8 for Q0)
 */
export function stratumLevel(
  totalStratum: number,
  maxBits: number
): "low" | "medium" | "high" {
  if (maxBits === 0) return "low";
  const density = totalStratum / maxBits;
  if (density <= 1 / 3) return "low";
  if (density <= 2 / 3) return "medium";
  return "high";
}

/** Compute density percentage (totalStratum / maxBits × 100). */
export function stratumDensity(totalStratum: number, maxBits: number): number {
  if (maxBits === 0) return 0;
  return (totalStratum / maxBits) * 100;
}
