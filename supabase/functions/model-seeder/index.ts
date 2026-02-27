/**
 * model-seeder — Universal Caching Proxy for HuggingFace Models
 * ══════════════════════════════════════════════════════════════
 *
 * Transparent lazy-caching proxy for any allowed HuggingFace model.
 * On each request:
 *   1. Check if the file exists in our storage bucket
 *   2. If cached → 302 redirect to the public bucket URL
 *   3. If missing → download from HuggingFace, cache to bucket, then redirect
 *
 * Supports multiple models via ?model= param.
 *
 * Usage:
 *   GET ?file=onnx/encoder_model_fp16.onnx                              → default model
 *   GET ?file=config.json&model=onnx-community/whisper-base             → specific model
 *   GET ?seed=all                                                       → pre-seed default
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUCKET = "app-assets";
const PREFIX = "whisper-models";
const DEFAULT_MODEL = "onnx-community/whisper-tiny.en";

/** Allowed model IDs (security: prevent arbitrary HF proxying) */
const ALLOWED_MODELS = new Set([
  "onnx-community/whisper-tiny.en",
  "onnx-community/whisper-base",
  "onnx-community/whisper-base.en",
  "openai/whisper-tiny.en",
  // Stable Diffusion 1.5 — browser-optimized ONNX (WebNN/WebGPU)
  "microsoft/stable-diffusion-v1.5-webnn",
]);

/** Default files to seed for whisper-tiny.en */
const DEFAULT_SEED_FILES = [
  "config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "preprocessor_config.json",
  "generation_config.json",
  "onnx/encoder_model_fp16.onnx",
  "onnx/decoder_model_merged_fp16.onnx",
  "onnx/encoder_model_quantized.onnx",
  "onnx/decoder_model_merged_quantized.onnx",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const reqUrl = new URL(req.url);
  const file = reqUrl.searchParams.get("file");
  const seedAll = reqUrl.searchParams.get("seed");
  const modelParam = reqUrl.searchParams.get("model");

  // Resolve model ID — validate against allowlist
  const modelId = modelParam && ALLOWED_MODELS.has(modelParam)
    ? modelParam
    : DEFAULT_MODEL;

  // ── Batch seed mode ──────────────────────────────────────────────
  if (seedAll === "all") {
    const results: Record<string, string> = {};
    for (const f of DEFAULT_SEED_FILES) {
      try {
        results[f] = await seedFile(supabase, supabaseUrl, modelId, f);
      } catch (e) {
        results[f] = `error: ${e.message}`;
      }
    }
    return new Response(
      JSON.stringify({ status: "complete", model: modelId, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── Single file proxy mode ───────────────────────────────────────
  if (!file) {
    return new Response(
      JSON.stringify({
        error: "Missing ?file= param",
        usage: "GET ?file=onnx/encoder_model_fp16.onnx[&model=onnx-community/whisper-base]",
        models: [...ALLOWED_MODELS],
        defaultFiles: DEFAULT_SEED_FILES,
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const storageKey = `${PREFIX}/${modelId}/resolve/main/${file}`;
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storageKey}`;

  // 1. Check cache via public URL HEAD
  try {
    const headRes = await fetch(publicUrl, { method: "HEAD" });
    if (headRes.ok) {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: publicUrl, "X-Model-Cache": "hit" },
      });
    }
  } catch { /* not cached */ }

  // 2. Cache miss → seed from HuggingFace
  console.log(`[model-seeder] Cache miss: ${modelId}/${file}`);
  try {
    await seedFile(supabase, supabaseUrl, modelId, file);
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: publicUrl, "X-Model-Cache": "miss-then-seeded" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ file, model: modelId, status: "error", error: e.message }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function seedFile(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  modelId: string,
  file: string,
): Promise<string> {
  const storageKey = `${PREFIX}/${modelId}/resolve/main/${file}`;
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storageKey}`;
  const sourceUrl = `https://huggingface.co/${modelId}/resolve/main/${file}`;

  // Double-check cache
  try {
    const headRes = await fetch(publicUrl, { method: "HEAD" });
    if (headRes.ok) return "cached";
  } catch { /* continue */ }

  // Download from HuggingFace
  const res = await fetch(sourceUrl, { headers: { "User-Agent": "HologramVGPU/1.0" } });
  if (!res.ok) throw new Error(`HF HTTP ${res.status} for ${modelId}/${file}`);

  const ct = file.endsWith(".json") ? "application/json" : "application/octet-stream";

  // Stream directly to storage using the REST API to avoid buffering
  // the entire file in memory (prevents "Memory limit exceeded" for large ONNX files)
  const contentLength = res.headers.get("content-length");
  const sizeMB = contentLength ? (parseInt(contentLength) / 1024 / 1024).toFixed(2) : "unknown";

  // For files under 50MB, use the JS client (simpler)
  // For larger files, stream via the REST API with the raw body
  const bodySize = contentLength ? parseInt(contentLength) : 0;

  if (bodySize > 0 && bodySize < 50 * 1024 * 1024) {
    // Small-enough file: buffer and upload via client
    const bytes = await res.arrayBuffer();
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storageKey, new Blob([bytes], { type: ct }), { contentType: ct, upsert: true });
    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);
  } else {
    // Large file or unknown size: stream the body directly to Storage REST API
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET}/${storageKey}`;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
        "Content-Type": ct,
        "x-upsert": "true",
        ...(contentLength ? { "Content-Length": contentLength } : {}),
      },
      body: res.body, // stream directly — no buffering!
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Streaming upload failed (${uploadRes.status}): ${errText}`);
    }
  }

  console.log(`[model-seeder] ✅ ${modelId}/${file} (${sizeMB}MB)`);
  return "seeded";
}
