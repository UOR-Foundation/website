/**
 * web-proxy — Transparent reverse proxy for the Hologram browser.
 *
 * Fetches any URL server-side, strips frame-blocking headers
 * (X-Frame-Options, CSP frame-ancestors), and rewrites relative
 * asset URLs to absolute so the page renders correctly inside
 * an iframe served from our domain.
 *
 * Usage:  GET /web-proxy?url=https://google.com
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/** Headers that prevent iframe embedding — we strip all of these. */
const STRIPPED_HEADERS = new Set([
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
]);

/** Inject a <base> tag so relative URLs resolve against the original origin. */
function injectBaseTag(html: string, baseUrl: string): string {
  const origin = new URL(baseUrl);
  const base = `${origin.protocol}//${origin.host}`;

  // If a <base> tag already exists, replace its href
  if (/<base\s/i.test(html)) {
    return html.replace(
      /(<base\s[^>]*href=["'])[^"']*(["'])/i,
      `$1${base}/$2`,
    );
  }

  // Otherwise inject one right after <head>
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch) {
    const idx = html.indexOf(headMatch[0]) + headMatch[0].length;
    return html.slice(0, idx) + `<base href="${base}/">` + html.slice(idx);
  }

  // Fallback: prepend
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

    // Validate URL
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Only allow http(s)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return new Response(
        JSON.stringify({ error: 'Only HTTP/HTTPS URLs are supported' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch the target page
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    // Build clean response headers — strip frame-blockers, pass through the rest
    const responseHeaders = new Headers(corsHeaders);
    for (const [key, value] of upstream.headers.entries()) {
      if (STRIPPED_HEADERS.has(key.toLowerCase())) continue;
      // Don't forward hop-by-hop or encoding headers
      if (['transfer-encoding', 'connection', 'keep-alive'].includes(key.toLowerCase())) continue;
      responseHeaders.set(key, value);
    }

    const contentType = upstream.headers.get('content-type') || '';

    // For HTML responses, inject <base> tag for correct asset resolution
    if (contentType.includes('text/html')) {
      let html = await upstream.text();
      html = injectBaseTag(html, targetUrl);

      responseHeaders.set('Content-Type', contentType);
      return new Response(html, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    // For non-HTML (images, CSS, JS, etc.), stream through directly
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
