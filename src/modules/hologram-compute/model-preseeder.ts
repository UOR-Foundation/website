/**
 * Model Pre-seeder
 * ════════════════
 *
 * Background pre-loads benchmark models into the browser's IndexedDB cache
 * (via @huggingface/transformers built-in caching) so benchmarks run
 * instantly without download delays.
 *
 * Runs once per device per model. Uses localStorage flags to skip subsequent visits.
 * Models are loaded sequentially (smallest first) to avoid memory pressure.
 */

const PRESEED_PREFIX = "hologram:model-preseeded:";

/** Models to pre-seed, ordered smallest → largest for fastest first-run UX */
const PRESEED_MODELS: { key: string; hfId: string; label: string; dtype?: Record<string, string> }[] = [
  // Tier 1 — small, fast to seed (< 300MB)
  { key: "smollm2-135m",   hfId: "HuggingFaceTB/SmolLM2-135M-Instruct",       label: "SmolLM2 135M" },
  { key: "gpt2",           hfId: "Xenova/gpt2",                                label: "GPT-2 124M",       dtype: { model: "fp32" } },
  // Tier 2 — medium (300MB–700MB)
  { key: "phi-1.5",        hfId: "Xenova/phi-1_5",                             label: "Phi-1.5 1.3B",     dtype: { model: "q4" } },
  { key: "tinyllama-1.1b", hfId: "Xenova/TinyLlama-1.1B-Chat-v1.0",           label: "TinyLlama 1.1B",   dtype: { model: "q4" } },
  // Tier 3 — large (1GB+)
  { key: "llama-3.2-1b",   hfId: "onnx-community/Llama-3.2-1B-Instruct",      label: "Llama 3.2 1B",     dtype: { model: "q4" } },
  { key: "llama-3.2-3b",   hfId: "onnx-community/Llama-3.2-3B-Instruct-ONNX", label: "Llama 3.2 3B",     dtype: { model: "q4" } },
];

/**
 * Pre-seed all benchmark models into IndexedDB cache.
 * Safe to call multiple times — skips already-seeded models.
 * Runs entirely in the background with no UI impact.
 */
export async function preseedBenchmarkModels(): Promise<void> {
  // Check if all models are already seeded
  const unseeded = PRESEED_MODELS.filter(
    (m) => localStorage.getItem(PRESEED_PREFIX + m.key) !== "1"
  );
  if (unseeded.length === 0) return;

  try {
    const transformers = await import("@huggingface/transformers");

    for (const model of unseeded) {
      try {
        console.log(`[model-preseeder] Background pre-loading ${model.label}…`);

        // Download tokenizer + model into transformers.js IndexedDB cache
        const modelOpts: any = {};
        if (model.dtype) modelOpts.dtype = model.dtype;

        await Promise.all([
          transformers.AutoTokenizer.from_pretrained(model.hfId),
          transformers.AutoModelForCausalLM.from_pretrained(model.hfId, modelOpts),
        ]);

        localStorage.setItem(PRESEED_PREFIX + model.key, "1");
        console.log(`[model-preseeder] ✅ ${model.label} cached in IndexedDB`);
      } catch (err) {
        // Non-fatal per model — continue with next
        console.warn(`[model-preseeder] Failed to pre-seed ${model.label} (will retry next load):`, err);
      }
    }
  } catch (err) {
    console.warn("[model-preseeder] Could not load transformers library:", err);
  }
}

/** Legacy alias */
export const preseedSmolLM2 = preseedBenchmarkModels;
