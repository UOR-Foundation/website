import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Whisper Model Seeder — Self-Host ONNX Model Files
 * ═══════════════════════════════════════════════════
 *
 * Downloads Whisper ONNX model files from HuggingFace and stores
 * them in our storage bucket for fully self-hosted serving.
 *
 * Call once to seed. After that, the client loads model files
 * directly from our storage — zero external dependencies.
 *
 * POST /whisper-model-seeder
 *   → Downloads all required model files
 *   → Stores in app-assets/whisper-models/
 *   → Returns list of cached files
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "app-assets";
const PREFIX = "whisper-models";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MODEL_ID = "onnx-community/whisper-tiny.en";
const HF_BASE = `https://huggingface.co/${MODEL_ID}/resolve/main`;

/**
 * Essential model files for Whisper tiny.en ONNX inference.
 * These are the minimum required for Transformers.js pipeline.
 */
const MODEL_FILES = [
  "config.json",
  "generation_config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "preprocessor_config.json",
  // ONNX model shards (quantized q8 for WASM, fp32 for WebGPU)
  "onnx/encoder_model.onnx",
  "onnx/encoder_model_quantized.onnx",
  "onnx/decoder_model_merged.onnx",
  "onnx/decoder_model_merged_quantized.onnx",
];

function guessContentType(path: string): string {
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".onnx")) return "application/octet-stream";
  if (path.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // Auth: verify_jwt=false in config.toml, use service role for storage ops

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Allow seeding a single file via query param (for large files that OOM in batch)
  const reqUrl = new URL(req.url);
  const singleFile = reqUrl.searchParams.get("file");
  const filesToSeed = singleFile ? [singleFile] : MODEL_FILES;

  const results: { file: string; status: string; sizeMB?: string; error?: string }[] = [];
  let totalBytes = 0;

  for (const file of filesToSeed) {
    const storageKey = `${PREFIX}/${MODEL_ID}/resolve/main/${file}`;
    const sourceUrl = `${HF_BASE}/${file}`;

    // Check if already cached
    const { data: existing } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storageKey, 10);

    if (existing?.signedUrl) {
      results.push({ file, status: "cached" });
      console.log(`[seeder] ✓ Already cached: ${file}`);
      continue;
    }

    // Download from HuggingFace — stream directly to storage to avoid OOM
    console.log(`[seeder] ⬇ Downloading: ${sourceUrl}`);
    try {
      const res = await fetch(sourceUrl, {
        headers: { "User-Agent": "HologramVGPU/1.0" },
      });

      if (!res.ok) {
        results.push({ file, status: "error", error: `HTTP ${res.status}` });
        console.error(`[seeder] ✗ Failed ${file}: ${res.status}`);
        continue;
      }

      const contentLength = parseInt(res.headers.get("content-length") ?? "0", 10);
      const sizeMB = (contentLength / 1024 / 1024).toFixed(2);
      const contentType = guessContentType(file);

      // Stream the response body directly to storage upload
      // This avoids buffering the entire file in memory (prevents OOM for large ONNX files)
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(storageKey, res.body!, {
          contentType,
          upsert: true,
          duplex: "half",
        } as any);

      if (uploadErr) {
        results.push({ file, status: "error", error: uploadErr.message });
        console.error(`[seeder] ✗ Upload failed ${file}:`, uploadErr.message);
      } else {
        totalBytes += contentLength;
        results.push({ file, status: "seeded", sizeMB });
        console.log(`[seeder] ✓ Seeded: ${file} (${sizeMB}MB)`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      results.push({ file, status: "error", error: msg });
      console.error(`[seeder] ✗ Error ${file}:`, msg);
    }
  }

  const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
  const seeded = results.filter(r => r.status === "seeded").length;
  const cached = results.filter(r => r.status === "cached").length;
  const failed = results.filter(r => r.status === "error").length;

  console.log(`[seeder] Done: ${seeded} seeded, ${cached} cached, ${failed} failed (${totalMB}MB downloaded)`);

  return new Response(
    JSON.stringify({
      model: MODEL_ID,
      summary: { seeded, cached, failed, totalDownloadedMB: totalMB },
      files: results,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
