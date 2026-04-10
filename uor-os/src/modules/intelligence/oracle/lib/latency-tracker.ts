/**
 * latency-tracker — Dynamic TTFT-based model tier selection
 * ══════════════════════════════════════════════════════════
 *
 * Records Time-to-First-Token for every AI stream and maintains
 * a rolling window in localStorage. Exposes a preferred tier
 * that edge functions use to select the optimal model.
 *
 * Tiers:
 *   "quality"   → google/gemini-3-flash-preview   (TTFT < 800ms)
 *   "balanced"  → google/gemini-2.5-flash          (TTFT 800–2000ms)
 *   "fast"      → google/gemini-2.5-flash-lite     (TTFT > 2000ms)
 */

export type LatencyTier = "quality" | "balanced" | "fast";

const STORAGE_KEY = "uor:ttft-samples";
const WINDOW_SIZE = 5;

function getSamples(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n: unknown) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

function saveSamples(samples: number[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(samples.slice(-WINDOW_SIZE)));
}

/** Record a TTFT measurement (milliseconds) */
export function recordTTFT(ms: number) {
  if (!isFinite(ms) || ms <= 0) return;
  const samples = getSamples();
  samples.push(ms);
  saveSamples(samples);
}

/** Get the median of the rolling window */
function getMedianTTFT(): number | null {
  const samples = getSamples();
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Get the preferred latency tier based on recent TTFT history */
export function getPreferredTier(): LatencyTier {
  const median = getMedianTTFT();
  // No history yet → start balanced (safe middle ground)
  if (median === null) return "balanced";
  if (median < 800) return "quality";
  if (median <= 2000) return "balanced";
  return "fast";
}

/**
 * Creates a TTFT measurement helper for a single stream.
 * Call `markFirstToken()` when the first delta arrives.
 */
export function createTTFTMeasure() {
  const start = performance.now();
  let recorded = false;
  return {
    markFirstToken() {
      if (recorded) return;
      recorded = true;
      const ttft = performance.now() - start;
      recordTTFT(ttft);
    },
  };
}
