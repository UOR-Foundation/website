/**
 * web-proxy — Private Relay proxy for the Hologram browser.
 *
 * Fetches any URL server-side with full privacy hygiene:
 *   • Strips X-Frame-Options, CSP frame-ancestors (iframe embedding)
 *   • Strips Set-Cookie (no third-party tracking)
 *   • Normalizes User-Agent (anti-fingerprinting)
 *   • Sends no Referer to upstream
 *   • Injects <base> tag for correct relative URL resolution
 *
 * Usage:  GET /web-proxy?url=https://google.com
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/** Normalized UA — generic enough to blend in, modern enough to get full content. */
const RELAY_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/** Response headers we strip for privacy + iframe compatibility. */
const STRIPPED_RESPONSE_HEADERS = new Set([
  // Frame-blocking
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  // Tracking
  'set-cookie',
  'set-cookie2',
  // Hop-by-hop / encoding
  'transfer-encoding',
  'connection',
  'keep-alive',
  // Fingerprinting
  'server',
  'x-powered-by',
  'via',
]);

/** Inject a <base> tag so relative URLs resolve against the original origin. */
function injectBaseTag(html: string, baseUrl: string): string {
  const origin = new URL(baseUrl);
  const base = `${origin.protocol}//${origin.host}`;

  if (/<base\s/i.test(html)) {
    return html.replace(
      /(<base\s[^>]*href=["'])[^"']*(["'])/i,
      `$1${base}/$2`,
    );
  }

  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch) {
    const idx = html.indexOf(headMatch[0]) + headMatch[0].length;
    return html.slice(0, idx) + `<base href="${base}/">` + html.slice(idx);
  }

  return `<base href="${base}/">` + html;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const params = new URL(req.url).searchParams;
    const targetUrl = params.get('url');

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing ?url= parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return new Response(
        JSON.stringify({ error: 'Only HTTP/HTTPS URLs are supported' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Privacy-hardened upstream request ──
    // No Referer, no cookies, normalized UA, minimal accept headers
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': RELAY_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Sec-GPC': '1',
        // Explicitly NO Referer, NO Cookie, NO Authorization
      },
      redirect: 'follow',
    });

    // ── Build sanitized response headers ──
    const responseHeaders = new Headers(corsHeaders);
    for (const [key, value] of upstream.headers.entries()) {
      if (STRIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) continue;
      responseHeaders.set(key, value);
    }

    // Add privacy-affirming headers
    responseHeaders.set('Referrer-Policy', 'no-referrer');
    responseHeaders.set('X-Hologram-Relay', 'active');

    const contentType = upstream.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      let html = await upstream.text();
      html = injectBaseTag(html, targetUrl);
      responseHeaders.set('Content-Type', contentType);
      return new Response(html, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('web-proxy error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Proxy error' }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
