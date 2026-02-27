import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const BUCKET = "app-assets";
  const PREFIX = "whisper-models";
  const MODEL_ID = "onnx-community/whisper-tiny.en";
  const HF_BASE = `https://huggingface.co/${MODEL_ID}/resolve/main`;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const reqUrl = new URL(req.url);
  const file = reqUrl.searchParams.get("file");

  if (!file) {
    return new Response(
      JSON.stringify({ error: "Missing ?file= param" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const storageKey = `${PREFIX}/${MODEL_ID}/resolve/main/${file}`;
  const sourceUrl = `${HF_BASE}/${file}`;

  // Check cache
  const { data: existing } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storageKey, 10);

  if (existing?.signedUrl) {
    return new Response(
      JSON.stringify({ file, status: "cached" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Download from HuggingFace
  console.log(`[model-seeder] Downloading: ${sourceUrl}`);
  const res = await fetch(sourceUrl, { headers: { "User-Agent": "HologramVGPU/1.0" } });

  if (!res.ok) {
    return new Response(
      JSON.stringify({ file, status: "error", error: `HTTP ${res.status}` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const bytes = await res.arrayBuffer();
  const sizeMB = (bytes.byteLength / 1024 / 1024).toFixed(2);
  const ct = file.endsWith(".json") ? "application/json" : "application/octet-stream";

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storageKey, new Blob([bytes], { type: ct }), { contentType: ct, upsert: true });

  if (uploadErr) {
    return new Response(
      JSON.stringify({ file, status: "error", error: uploadErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  console.log(`[model-seeder] Seeded: ${file} (${sizeMB}MB)`);
  return new Response(
    JSON.stringify({ file, status: "seeded", sizeMB }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
