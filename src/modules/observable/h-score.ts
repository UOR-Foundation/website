/**
 * UOR Observer Theory — H-Score (Hamming Distance to Grade-A Graph).
 *
 * H(O) = min over all d ∈ Grade_A_Graph of: popcount(O XOR d)
 *
 * The H-score measures how many bit positions an observed value
 * differs from the nearest ground-truth datum in the Grade-A
 * knowledge graph. An H-score of 0 means the observation is
 * algebraically verified; higher values indicate increasing
 * epistemic debt.
 *
 * @see .well-known/uor.json observer_theory — H-score definition
 * @see spec/src/namespaces/state.rs — observer state model
 */

// ── popcount ────────────────────────────────────────────────────────────────

/**
 * Count the number of set bits (Hamming weight) in an integer.
 *
 * Uses the standard bit-counting algorithm (Kernighan's method).
 * Works for 0 ≤ x ≤ 0xFFFFFFFF (32-bit unsigned).
 *
 * @param x  Non-negative integer.
 * @returns  Number of set bits.
 */
export function popcount(x: number): number {
  let count = 0;
  let v = x >>> 0; // Ensure unsigned 32-bit
  while (v) {
    v &= v - 1; // Clear lowest set bit
    count++;
  }
  return count;
}

// ── hScore ──────────────────────────────────────────────────────────────────

/**
 * Compute the H-score: minimum Hamming distance from an observed byte
 * to any datum in the Grade-A knowledge graph.
 *
 * H(O) = min over all d ∈ gradeAGraph of: popcount(O XOR d)
 *
 * For the full Q0 graph (all 256 elements), H-score is always 0
 * because every byte value is present. For sparse graphs, H > 0
 * indicates the observation diverges from verified knowledge.
 *
 * @param observedByte   The observed value (0-255 for Q0).
 * @param gradeAGraph    Array of verified datum values in the graph.
 * @returns              Minimum Hamming distance (0 = perfect coherence).
 */
export function hScore(observedByte: number, gradeAGraph: number[]): number {
  if (gradeAGraph.length === 0) return popcount(observedByte); // Max divergence

  let min = Infinity;
  for (const d of gradeAGraph) {
    const dist = popcount(observedByte ^ d);
    if (dist < min) {
      min = dist;
      if (min === 0) return 0; // Early exit on exact match
    }
  }
  return min;
}

// ── hScoreMultiByte ─────────────────────────────────────────────────────────

/**
 * Compute aggregate H-score over multiple bytes.
 *
 * For multi-byte observations, computes the mean H-score across
 * all bytes, giving a scalar coherence measure for arbitrary-length
 * agent outputs.
 *
 * @param observedBytes  The observed byte array.
 * @param gradeAGraph    Array of verified datum values.
 * @returns              Mean H-score across all bytes.
 */
export function hScoreMultiByte(
  observedBytes: Uint8Array,
  gradeAGraph: number[]
): number {
  if (observedBytes.length === 0) return 0;

  let total = 0;
  for (const byte of observedBytes) {
    total += hScore(byte, gradeAGraph);
  }
  return total / observedBytes.length;
}

// ── hScoreFromCanonicalId ───────────────────────────────────────────────────

/**
 * Compare first byte of a SHA-256 hex canonical ID to the Grade-A graph
 * canonical IDs' first bytes.
 *
 * This provides a content-addressed coherence check: how close is
 * this derivation's identity to verified derivations in the graph?
 *
 * @param observedCanonicalId  SHA-256 hex string (64 chars).
 * @param gradeAGraph          Array of verified canonical ID hex strings.
 * @returns                    Minimum Hamming distance on first bytes.
 */
export function hScoreFromCanonicalId(
  observedCanonicalId: string,
  gradeAGraph: string[]
): number {
  const observedByte = parseInt(observedCanonicalId.slice(0, 2), 16);
  if (isNaN(observedByte)) return 8; // Maximum 8-bit divergence

  const graphBytes = gradeAGraph
    .map((id) => parseInt(id.slice(0, 2), 16))
    .filter((n) => !isNaN(n));

  return hScore(observedByte, graphBytes);
}
