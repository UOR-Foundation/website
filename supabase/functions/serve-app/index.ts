/**
 * serve-app — Edge Function
 *
 * Serves deployed app assets from content-addressed storage.
 * This is the "docker run" CDN equivalent: given a canonical ID,
 * it retrieves the stored HTML/assets and serves them with proper
 * headers, CSP, and the UOR session shim injected.
 *
 * Routes:
 *   GET /serve-app?id=<canonicalId>   → serve by canonical ID
 *   GET /serve-app?app=<name>&v=<ver> → serve by app name + version
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UOR_SHIM_CDN = "https://cdn.uor.foundation/app-sdk.min.js";

/**
 * Inject UOR session shim + CSP into served HTML.
 */
function instrumentHtml(
  html: string,
  canonicalId: string,
): string {
  const shimTag = `<script src="${UOR_SHIM_CDN}" data-uor-app-canonical="${canonicalId}"></script>`;

  const csp = [
    "default-src 'self' https://cdn.uor.foundation https://api.uor.foundation https://app.uor.app",
    "script-src 'self' 'unsafe-inline' https://cdn.uor.foundation",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' https://api.uor.foundation https://app.uor.app",
    "img-src 'self' data: blob:",
    "font-src 'self'",
  ].join("; ");

  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;

  // Inject before </head> if present
  if (html.includes("</head>")) {
    return html.replace("</head>", `${cspMeta}\n${shimTag}\n</head>`);
  }

  // Wrap in minimal document
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${cspMeta}
${shimTag}
</head>
<body>
${html}
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── POST: Ingest assets (called by client-side asset-ingestor) ──
    if (req.method === "POST") {
      const body = await req.json();
      const { sourceUrl, appName, version, imageCanonicalId, snapshotId, ingestedBy } = body;

      if (!sourceUrl || !appName || !version || !imageCanonicalId) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: sourceUrl, appName, version, imageCanonicalId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Check for existing (dedup)
      const { data: existing } = await supabase
        .from("app_asset_registry")
        .select("canonical_id, storage_path, size_bytes")
        .eq("canonical_id", imageCanonicalId)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({
            canonicalId: existing.canonical_id,
            storagePath: existing.storage_path,
            serveUrl: `${url.origin}/functions/v1/serve-app?id=${existing.canonical_id}`,
            sizeBytes: existing.size_bytes,
            deduplicated: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Fetch source HTML
      let htmlContent: string;
      try {
        const resp = await fetch(sourceUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        htmlContent = await resp.text();
      } catch {
        htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${appName} v${version}</title></head><body><h1>${appName}</h1><p>v${version}</p><p>Source: ${sourceUrl}</p></body></html>`;
      }

      const contentBytes = new TextEncoder().encode(htmlContent);
      const shortHash = imageCanonicalId.replace("urn:uor:derivation:sha256:", "").slice(0, 16);
      const storagePath = `${shortHash}/${appName}/${version}/index.html`;

      const blob = new Blob([contentBytes], { type: "text/html" });
      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(storagePath, blob, { contentType: "text/html", upsert: true });

      if (uploadError) {
        return new Response(
          JSON.stringify({ error: `Storage upload failed: ${uploadError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { error: registryError } = await supabase
        .from("app_asset_registry")
        .upsert({
          canonical_id: imageCanonicalId,
          app_name: appName,
          version,
          storage_path: storagePath,
          content_type: "text/html",
          size_bytes: contentBytes.length,
          source_url: sourceUrl,
          snapshot_id: snapshotId ?? null,
          ingested_by: ingestedBy ?? null,
        }, { onConflict: "canonical_id" });

      if (registryError) {
        return new Response(
          JSON.stringify({ error: `Registry insert failed: ${registryError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          canonicalId: imageCanonicalId,
          storagePath,
          serveUrl: `${url.origin}/functions/v1/serve-app?id=${imageCanonicalId}`,
          sizeBytes: contentBytes.length,
          deduplicated: false,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── GET: Serve assets ──
    const canonicalId = url.searchParams.get("id");
    const appName = url.searchParams.get("app");
    const version = url.searchParams.get("v") || "latest";

    if (!canonicalId && !appName) {
      return new Response(
        JSON.stringify({ error: "Provide ?id=<canonicalId> or ?app=<name>" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let resolvedCanonicalId = canonicalId;

    if (!resolvedCanonicalId && appName) {
      let query = supabase
        .from("app_asset_registry")
        .select("canonical_id")
        .eq("app_name", appName);

      if (version !== "latest") {
        query = query.eq("version", version);
      }

      const { data, error } = await query
        .order("ingested_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: `App not found: ${appName}@${version}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      resolvedCanonicalId = data.canonical_id;
    }

    const { data: asset, error: assetError } = await supabase
      .from("app_asset_registry")
      .select("*")
      .eq("canonical_id", resolvedCanonicalId)
      .single();

    if (assetError || !asset) {
      return new Response(
        JSON.stringify({ error: `Asset not found for canonical ID: ${resolvedCanonicalId}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("app-assets")
      .download(asset.storage_path);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: `Failed to retrieve asset: ${downloadError?.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const contentType = asset.content_type || "text/html";
    let body: string | Blob = fileData;

    if (contentType.includes("html")) {
      const rawHtml = await fileData.text();
      const instrumented = instrumentHtml(rawHtml, resolvedCanonicalId!);
      body = instrumented;
    }

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-UOR-Canonical-Id": resolvedCanonicalId!,
        "X-UOR-App": asset.app_name,
        "X-UOR-Version": asset.version,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
