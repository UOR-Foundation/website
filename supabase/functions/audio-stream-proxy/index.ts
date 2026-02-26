/**
 * audio-stream-proxy — CORS Proxy for Internet Radio Streams
 * ═══════════════════════════════════════════════════════════
 *
 * Proxies audio streams (SomaFM, etc.) with proper CORS headers
 * so the Web Audio API AnalyserNode can read frequency/time-domain
 * data instead of falling back to synthesized Grade-C frames.
 *
 * Usage: GET /audio-stream-proxy?url=https://ice2.somafm.com/dronezone-256-mp3
 *
 * Security:
 *   - Only whitelisted domains are proxied (somafm.com)
 *   - Streams are passed through without buffering (streaming response)
 *   - No authentication required (public radio streams)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, range",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Expose-Headers": "Content-Length, Content-Type, Content-Range, Accept-Ranges",
};

/** Domains we allow proxying. */
const ALLOWED_HOSTS = [
  "ice2.somafm.com",
  "ice1.somafm.com",
  "ice4.somafm.com",
  "ice6.somafm.com",
  "somafm.com",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const params = new URL(req.url).searchParams;
  const streamUrl = params.get("url");

  if (!streamUrl) {
    return new Response(JSON.stringify({ error: "Missing ?url= parameter" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(streamUrl);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Whitelist check
  if (!ALLOWED_HOSTS.some((h) => parsed.hostname === h || parsed.hostname.endsWith("." + h))) {
    return new Response(JSON.stringify({ error: "Domain not allowed" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Forward range header if present (for seeking)
    const headers: Record<string, string> = {
      "User-Agent": "HologramOS/1.0 (AudioProxy)",
      "Icy-MetaData": "0", // Don't request ICY metadata to keep stream clean
    };
    const range = req.headers.get("Range");
    if (range) headers["Range"] = range;

    const upstream = await fetch(streamUrl, { headers });

    if (!upstream.ok && upstream.status !== 206) {
      return new Response(
        JSON.stringify({ error: `Upstream error: ${upstream.status}` }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Build response headers — pass through content info + add CORS
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": upstream.headers.get("Content-Type") || "audio/mpeg",
      "Cache-Control": "no-cache, no-store",
    };

    const contentLength = upstream.headers.get("Content-Length");
    if (contentLength) responseHeaders["Content-Length"] = contentLength;

    const acceptRanges = upstream.headers.get("Accept-Ranges");
    if (acceptRanges) responseHeaders["Accept-Ranges"] = acceptRanges;

    // Stream the response body through
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Proxy error: ${(err as Error).message}` }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
