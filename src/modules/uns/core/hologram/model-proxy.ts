/**
 * Model Proxy — Universal HuggingFace → Self-Hosted Caching Layer
 * ════════════════════════════════════════════════════════════════
 *
 * Provides a fetch interceptor that transparently routes all HuggingFace
 * model file requests through our model-seeder edge function, which acts
 * as a lazy-caching proxy backed by our storage bucket.
 *
 * Flow:
 *   HF URL → model-seeder?file=<path> → (cache hit? → 302 redirect to bucket)
 *                                        (cache miss? → download from HF, cache, 302)
 *
 * After first access, all files are served from our own infrastructure.
 * Zero HuggingFace dependency at runtime once seeded.
 *
 * @module uns/core/hologram/model-proxy
 */

// ── Constants ──────────────────────────────────────────────────────────────

const MODEL_SEEDER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/model-seeder`;

const HF_DOMAINS = [
  "huggingface.co",
  "hf.co",
  "cdn-lfs.huggingface.co",
  "cdn-lfs-us-1.huggingface.co",
  "cdn-lfs-us-1.hf.co",
];

// ── Proxy Fetch ────────────────────────────────────────────────────────────

/**
 * Build a proxy URL for a given HuggingFace model file.
 * Works for any model ID (whisper-tiny.en, whisper-base, etc.)
 */
export function buildProxyUrl(file: string, modelId?: string): string {
  // If modelId is provided, prefix the file path so model-seeder knows which model
  // The model-seeder currently handles onnx-community/whisper-tiny.en by default,
  // but the file param is the path after /resolve/main/
  return `${MODEL_SEEDER_URL}?file=${encodeURIComponent(file)}${modelId ? `&model=${encodeURIComponent(modelId)}` : ""}`;
}

/**
 * Extract the file path from a HuggingFace URL.
 * e.g. https://huggingface.co/onnx-community/whisper-tiny.en/resolve/main/onnx/encoder_model_fp16.onnx
 *    → { modelId: "onnx-community/whisper-tiny.en", file: "onnx/encoder_model_fp16.onnx" }
 */
function parseHfUrl(url: string): { modelId: string; file: string } | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^\/([^/]+\/[^/]+)\/resolve\/main\/(.+)$/);
    if (match) {
      return { modelId: match[1], file: match[2] };
    }
    // CDN-LFS URLs have a different pattern — extract filename
    const fileName = parsed.pathname.split("/").pop();
    if (fileName) {
      return { modelId: "unknown", file: fileName };
    }
  } catch { /* invalid URL */ }
  return null;
}

/**
 * Create a fetch interceptor that routes all HuggingFace requests
 * through our model-seeder caching proxy.
 *
 * Usage:
 *   const restore = installModelProxy();
 *   // ... do work that fetches from HuggingFace ...
 *   restore(); // restore original fetch
 */
export function installModelProxy(): () => void {
  const originalFetch = globalThis.fetch;

  const proxyFetch: typeof fetch = async (input, init) => {
    let url = "";
    if (typeof input === "string") url = input;
    else if (input instanceof URL) url = input.toString();
    else if (input instanceof Request) url = input.url;

    const isHfUrl = HF_DOMAINS.some(d => url.includes(d));
    if (isHfUrl) {
      const parsed = parseHfUrl(url);
      if (parsed) {
        const proxyUrl = buildProxyUrl(parsed.file, parsed.modelId);
        const fileName = url.split("/").pop();
        console.log(`[ModelProxy] 🔄 ${fileName}`);

        try {
          return await originalFetch(proxyUrl, {
            ...init,
            redirect: "follow",
          });
        } catch (e) {
          console.warn(`[ModelProxy] Proxy failed for ${fileName}, direct fallback:`, e);
          return originalFetch(input, init);
        }
      }
    }
    return originalFetch(input, init);
  };

  globalThis.fetch = proxyFetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

/**
 * Fetch a single file through the model-seeder proxy.
 * Convenience wrapper for direct use (no global fetch interception).
 */
export async function fetchViaProxy(file: string, modelId?: string): Promise<Response> {
  const proxyUrl = buildProxyUrl(file, modelId);
  console.log(`[ModelProxy] 🔄 ${file}`);
  return fetch(proxyUrl, { redirect: "follow" });
}
