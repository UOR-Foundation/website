/**
 * Model Pre-seeder
 * ════════════════
 *
 * Background pre-loads SmolLM2-135M into the browser's IndexedDB cache
 * (via @huggingface/transformers built-in caching) so benchmarks run
 * instantly without download delays.
 *
 * Runs once per device. Uses a localStorage flag to skip subsequent visits.
 */

const PRESEED_KEY = "hologram:model-preseeded:smollm2-135m";
const MODEL_HF_ID = "HuggingFaceTB/SmolLM2-135M-Instruct";

/**
 * Pre-seed SmolLM2-135M into IndexedDB cache.
 * Safe to call multiple times — no-ops after first successful seed.
 * Runs entirely in the background with no UI impact.
 */
export async function preseedSmolLM2(): Promise<void> {
  // Already seeded on this device
  if (localStorage.getItem(PRESEED_KEY) === "1") return;

  try {
    console.log("[model-preseeder] Background pre-loading SmolLM2-135M…");

    const transformers = await import("@huggingface/transformers");

    // Download tokenizer + model into transformers.js IndexedDB cache.
    // `from_pretrained` caches automatically — subsequent calls are instant.
    await Promise.all([
      transformers.AutoTokenizer.from_pretrained(MODEL_HF_ID),
      transformers.AutoModelForCausalLM.from_pretrained(MODEL_HF_ID),
    ]);

    localStorage.setItem(PRESEED_KEY, "1");
    console.log("[model-preseeder] ✅ SmolLM2-135M cached in IndexedDB");
  } catch (err) {
    // Non-fatal — benchmarks will just download on demand
    console.warn("[model-preseeder] Background pre-seed failed (will retry next load):", err);
  }
}
