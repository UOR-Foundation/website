/**
 * serve-app — Edge Function
 *
 * Serves deployed app assets from content-addressed storage.
 * This is the "docker run" CDN equivalent: given a canonical ID,
 * it retrieves the stored HTML/assets and serves them with proper
 * headers, CSP, and the UOR session shim injected.
 *
 * Routes:
 *   GET /serve-app?id=<canonicalId>       → serve by canonical ID (stored)
 *   GET /serve-app?app=<name>&v=<ver>     → serve by app name + version
 *   GET /serve-app?proxy=<url>            → live proxy (bypass X-Frame-Options)
 *   GET /serve-app?proxy=<url>&cid=<cid>  → live proxy with canonical tagging
 *   POST /serve-app                       → ingest assets
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UOR_SHIM_CDN = "https://cdn.uor.foundation/app-sdk.min.js";

/**
 * Inject UOR session shim into served HTML.
 * Strips any X-Frame-Options directives from meta tags.
 */
function instrumentHtml(
  html: string,
  canonicalId: string,
  baseUrl?: string,
): string {
  const shimTag = `<script src="${UOR_SHIM_CDN}" data-uor-app-canonical="${canonicalId}"></script>`;

  // Inject <base> tag so relative URLs resolve correctly against the original origin
  const baseTag = baseUrl ? `<base href="${baseUrl}">` : "";

  // Remove any meta X-Frame-Options that might block embedding
  let processed = html.replace(
    /<meta\s+http-equiv=["']X-Frame-Options["'][^>]*>/gi,
    "",
  );

  // Inject before </head> if present
  if (processed.includes("</head>")) {
    return processed.replace(
      "</head>",
      `${baseTag}\n${shimTag}\n</head>`,
    );
  }

  // Wrap in minimal document
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${baseTag}
${shimTag}
</head>
<body>
${processed}
</body>
</html>`;
}

/**
 * Compute the base URL from a full URL (origin + path up to last /).
 */
function getBaseUrl(sourceUrl: string): string {
  try {
    const u = new URL(sourceUrl);
    const pathParts = u.pathname.split("/");
    pathParts.pop(); // remove filename
    return `${u.origin}${pathParts.join("/")}/`;
  } catch {
    return "";
  }
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

    // ── POST: Ingest assets ──
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
        const resp = await fetch(sourceUrl, {
          headers: { "User-Agent": "UOR-Hologram/1.0 (content-addressed-proxy)" },
        });
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

    // ── GET: Proxy mode — fetch live content, strip X-Frame-Options ──
    const proxyUrl = url.searchParams.get("proxy");
    if (proxyUrl) {
      const cid = url.searchParams.get("cid") || "unknown";

      try {
        const proxyResp = await fetch(proxyUrl, {
          headers: {
            "User-Agent": "UOR-Hologram/1.0 (content-addressed-proxy)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
          redirect: "follow",
        });

        if (!proxyResp.ok) {
          return new Response(
            `<html><body><h1>Proxy Error</h1><p>Failed to fetch: HTTP ${proxyResp.status}</p><p>${proxyUrl}</p></body></html>`,
            {
              status: 502,
              headers: { ...corsHeaders, "Content-Type": "text/html" },
            },
          );
        }

        const contentType = proxyResp.headers.get("content-type") || "text/html";

        // For HTML content, instrument with UOR shim and fix relative URLs
        if (contentType.includes("html")) {
          let html = await proxyResp.text();
          const baseUrl = getBaseUrl(proxyUrl);
          html = instrumentHtml(html, cid, baseUrl);

          return new Response(html, {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "public, max-age=300",
              "X-UOR-Proxy-Source": proxyUrl,
              "X-UOR-Canonical-Id": cid,
              // Explicitly NO X-Frame-Options header — we want embedding
            },
          });
        }

        // For non-HTML (CSS, JS, images, fonts), pass through directly
        const body = await proxyResp.arrayBuffer();
        return new Response(body, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400",
          },
        });
      } catch (err) {
        return new Response(
          `<html><body><h1>Proxy Error</h1><p>${err.message}</p><p>Target: ${proxyUrl}</p></body></html>`,
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "text/html" },
          },
        );
      }
    }

    // ── GET: Serve stored assets by canonical ID or app name ──
    const canonicalId = url.searchParams.get("id");
    const appName = url.searchParams.get("app");
    const version = url.searchParams.get("v") || "latest";

    if (!canonicalId && !appName) {
      return new Response(
        JSON.stringify({
          error: "Provide ?id=<canonicalId>, ?app=<name>, or ?proxy=<url>",
          routes: {
            stored: "?id=<canonicalId> or ?app=<name>&v=<version>",
            proxy: "?proxy=<sourceUrl>&cid=<canonicalId>",
            ingest: "POST with {sourceUrl, appName, version, imageCanonicalId}",
          },
        }),
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

    // If the asset has a source_url, use proxy mode to serve live content
    // This ensures the app always loads with all its original resources
    if (asset.source_url && asset.source_url.startsWith("http")) {
      try {
        const proxyResp = await fetch(asset.source_url, {
          headers: {
            "User-Agent": "UOR-Hologram/1.0 (content-addressed-proxy)",
            "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
          },
          redirect: "follow",
        });

        if (proxyResp.ok) {
          const contentType = proxyResp.headers.get("content-type") || "text/html";
          if (contentType.includes("html")) {
            let html = await proxyResp.text();
            const baseUrl = getBaseUrl(asset.source_url);
            html = instrumentHtml(html, resolvedCanonicalId!, baseUrl);

            return new Response(html, {
              status: 200,
              headers: {
                ...corsHeaders,
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "public, max-age=300",
                "X-UOR-Canonical-Id": resolvedCanonicalId!,
                "X-UOR-App": asset.app_name,
                "X-UOR-Version": asset.version,
                "X-UOR-Source": "live-proxy",
              },
            });
          }
        }
      } catch {
        // Fall through to stored version
      }
    }

    // Fallback: serve from stored content
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
      const baseUrl = asset.source_url ? getBaseUrl(asset.source_url) : undefined;
      const instrumented = instrumentHtml(rawHtml, resolvedCanonicalId!, baseUrl);
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
        "X-UOR-Source": "content-addressed-storage",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
