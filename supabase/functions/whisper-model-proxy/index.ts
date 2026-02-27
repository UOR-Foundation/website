import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Whisper Model Proxy — Self-Hosted Model File Cache
 * ════════════════════════════════════════════════════
 *
 * Proxies HuggingFace model file requests through our own infrastructure,
 * caching files permanently in our storage bucket. This eliminates
 * external CDN dependencies for the Whisper ONNX model.
 *
 * Flow:
 *   1. Client requests model file via ?url=...
 *   2. Check if file is cached in app-assets storage bucket
 *   3. If cached → serve from storage (redirect to public URL)
 *   4. If not cached → fetch from HuggingFace, cache, return content
 *
 * All model files are stored under: whisper-models/{path}
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const BUCKET = "app-assets";
const PREFIX = "whisper-models";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function deriveStorageKey(url: string): string {
  try {
    const u = new URL(url);
    // Extract path after the domain: /onnx-community/whisper-tiny.en/resolve/main/config.json
    // Store as: whisper-models/onnx-community/whisper-tiny.en/resolve/main/config.json
    const path = u.pathname.replace(/^\//, "");
    return `${PREFIX}/${path}`;
  } catch {
    // Fallback: hash the URL
    return `${PREFIX}/unknown/${encodeURIComponent(url)}`;
  }
}

function guessContentType(path: string): string {
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".onnx")) return "application/octet-stream";
  if (path.endsWith(".txt")) return "text/plain";
  if (path.endsWith(".model")) return "application/octet-stream";
  return "application/octet-stream";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const reqUrl = new URL(req.url);
  const targetUrl = reqUrl.searchParams.get("url");

  if (!targetUrl) {
    return new Response(
      JSON.stringify({ error: "Missing 'url' query parameter" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Only allow HuggingFace URLs for security
  try {
    const parsed = new URL(targetUrl);
    if (
      !parsed.hostname.endsWith("huggingface.co") &&
      !parsed.hostname.endsWith("hf.co") &&
      !parsed.hostname.endsWith("cdn-lfs.huggingface.co") &&
      !parsed.hostname.endsWith("cdn-lfs-us-1.huggingface.co")
    ) {
      return new Response(
        JSON.stringify({ error: "Only HuggingFace URLs are allowed" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid URL" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const storageKey = deriveStorageKey(targetUrl);
  const contentType = guessContentType(storageKey);

  // Initialize Supabase admin client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Check cache ──────────────────────────────────────────────────────
  try {
    const { data: existing } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storageKey, 60); // 60s signed URL

    if (existing?.signedUrl) {
      // File exists in cache — redirect to the public URL
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storageKey}`;
      console.log(`[whisper-model-proxy] CACHE HIT: ${storageKey}`);
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: publicUrl,
          "X-Cache": "HIT",
          "X-Storage-Key": storageKey,
        },
      });
    }
  } catch {
    // Not cached, proceed to fetch
  }

  // ── Fetch from HuggingFace ───────────────────────────────────────────
  console.log(`[whisper-model-proxy] CACHE MISS — fetching: ${targetUrl}`);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(targetUrl, {
      headers: { "User-Agent": "HologramVGPU/1.0" },
    });
  } catch (err) {
    console.error(`[whisper-model-proxy] Upstream fetch failed:`, err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch from upstream" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!upstreamResponse.ok) {
    const text = await upstreamResponse.text();
    console.error(`[whisper-model-proxy] Upstream ${upstreamResponse.status}: ${text.slice(0, 200)}`);
    return new Response(
      JSON.stringify({ error: `Upstream returned ${upstreamResponse.status}` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Read the full body (needed for both caching and response)
  const fileBytes = await upstreamResponse.arrayBuffer();
  const fileBlob = new Blob([fileBytes], { type: contentType });
  const fileSizeMB = (fileBytes.byteLength / 1024 / 1024).toFixed(2);

  console.log(`[whisper-model-proxy] Downloaded ${fileSizeMB}MB — caching to ${storageKey}`);

  // ── Cache to storage (fire-and-forget for speed) ─────────────────────
  // Don't await — return response immediately while caching in background
  supabase.storage
    .from(BUCKET)
    .upload(storageKey, fileBlob, {
      contentType,
      upsert: true,
    })
    .then(({ error }) => {
      if (error) console.error(`[whisper-model-proxy] Cache upload failed:`, error.message);
      else console.log(`[whisper-model-proxy] Cached: ${storageKey} (${fileSizeMB}MB)`);
    });

  // ── Return the file ──────────────────────────────────────────────────
  return new Response(fileBytes, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": contentType,
      "Content-Length": String(fileBytes.byteLength),
      "X-Cache": "MISS",
      "X-Storage-Key": storageKey,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});
