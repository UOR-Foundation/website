/**
 * model-seeder — Transparent Caching Proxy
 * ═══════════════════════════════════════════
 *
 * Acts as a lazy-caching proxy for Whisper ONNX model files.
 * On each request:
 *   1. Check if the file already exists in our storage bucket
 *   2. If cached → 302 redirect to the public bucket URL (zero overhead)
 *   3. If missing → download from HuggingFace, cache to bucket, then redirect
 *
 * This means the first request for each file triggers a one-time download,
 * and all subsequent requests are instant redirects. The client never
 * needs to know whether the file was cached or freshly seeded.
 *
 * Usage:
 *   GET /model-seeder?file=onnx/encoder_model_fp16.onnx
 *   GET /model-seeder?file=tokenizer.json
 *   GET /model-seeder?seed=all   (pre-seed all model files)
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
const MODEL_ID = "onnx-community/whisper-tiny.en";
const HF_BASE = `https://huggingface.co/${MODEL_ID}/resolve/main`;

/** All files needed for Whisper tiny.en (fp16 + q8 variants) */
const ALL_FILES = [
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

  // ── Batch seed mode ──────────────────────────────────────────────
  if (seedAll === "all") {
    const results: Record<string, string> = {};
    for (const f of ALL_FILES) {
      try {
        const status = await seedFile(supabase, supabaseUrl, f);
        results[f] = status;
      } catch (e) {
        results[f] = `error: ${e.message}`;
      }
    }
    return new Response(
      JSON.stringify({ status: "complete", results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── Single file proxy mode ───────────────────────────────────────
  if (!file) {
    return new Response(
      JSON.stringify({
        error: "Missing ?file= param",
        usage: "GET ?file=onnx/encoder_model_fp16.onnx or ?seed=all",
        available: ALL_FILES,
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const storageKey = `${PREFIX}/${MODEL_ID}/resolve/main/${file}`;
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storageKey}`;

  // 1. Check if file exists in storage (quick HEAD-like check)
  const { data: listData } = await supabase.storage
    .from(BUCKET)
    .list(`${PREFIX}/${MODEL_ID}/resolve/main/${file.includes("/") ? file.substring(0, file.lastIndexOf("/")) : ""}`, {
      search: file.includes("/") ? file.substring(file.lastIndexOf("/") + 1) : file,
      limit: 1,
    });

  if (listData && listData.length > 0) {
    // File exists → redirect to public URL (instant, no processing)
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: publicUrl,
        "X-Model-Cache": "hit",
      },
    });
  }

  // 2. File not cached → download from HuggingFace and seed
  console.log(`[model-seeder] Cache miss: ${file} — downloading from HuggingFace...`);
  const status = await seedFile(supabase, supabaseUrl, file);

  if (status === "seeded" || status === "cached") {
    // Now redirect to the freshly cached file
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: publicUrl,
        "X-Model-Cache": "miss-then-seeded",
      },
    });
  }

  return new Response(
    JSON.stringify({ file, status: "error", error: status }),
    { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

/**
 * Download a file from HuggingFace and upload to our storage bucket.
 * Returns "seeded", "cached", or an error string.
 */
async function seedFile(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  file: string,
): Promise<string> {
  const storageKey = `${PREFIX}/${MODEL_ID}/resolve/main/${file}`;
  const sourceUrl = `${HF_BASE}/${file}`;

  // Double-check cache (for batch mode)
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storageKey}`;
  try {
    const headRes = await fetch(publicUrl, { method: "HEAD" });
    if (headRes.ok) return "cached";
  } catch {
    // Not cached, continue
  }

  // Download from HuggingFace
  const res = await fetch(sourceUrl, {
    headers: { "User-Agent": "HologramVGPU/1.0" },
  });

  if (!res.ok) {
    throw new Error(`HuggingFace HTTP ${res.status} for ${file}`);
  }

  const bytes = await res.arrayBuffer();
  const sizeMB = (bytes.byteLength / 1024 / 1024).toFixed(2);
  const ct = file.endsWith(".json") ? "application/json" : "application/octet-stream";

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storageKey, new Blob([bytes], { type: ct }), {
      contentType: ct,
      upsert: true,
    });

  if (uploadErr) {
    throw new Error(`Upload failed: ${uploadErr.message}`);
  }

  console.log(`[model-seeder] ✅ Seeded: ${file} (${sizeMB}MB)`);
  return "seeded";
}
