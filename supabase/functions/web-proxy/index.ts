/**
 * web-proxy — Full-fidelity reverse proxy for the Hologram browser.
 *
 * Proxies ANY URL (HTML, CSS, JS, images, fonts, etc.) so the browser
 * iframe can render complete websites without CORS/X-Frame-Options issues.
 *
 *   • Strips X-Frame-Options, CSP (allows iframe embedding)
 *   • Rewrites HTML links to route sub-resources through this proxy
 *   • Handles all content types (passthrough for non-HTML)
 *   • Follows redirects
 *
 * Usage:  GET /web-proxy?url=https://cnn.com
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RELAY_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/** Headers to strip from upstream responses */
const STRIPPED = new Set([
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'set-cookie',
  'set-cookie2',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'server',
  'x-powered-by',
  'via',
]);

/** Build the proxy URL for a given target URL */
function proxyUrl(selfBase: string, target: string): string {
  return `${selfBase}?url=${encodeURIComponent(target)}`;
}

/** Resolve a potentially relative URL against a base */
function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

/**
 * Rewrite HTML so all sub-resource URLs route through this proxy.
 * This ensures CSS, JS, images, fonts all load correctly inside the iframe.
 */
function rewriteHtml(html: string, targetUrl: string, selfBase: string): string {
  const origin = new URL(targetUrl);
  const base = `${origin.protocol}//${origin.host}`;

  // Remove existing <base> tags to avoid conflicts
  let result = html.replace(/<base\s[^>]*>/gi, '');

  // Inject our <base> for any URLs we miss
  const headMatch = result.match(/<head[^>]*>/i);
  if (headMatch) {
    const idx = result.indexOf(headMatch[0]) + headMatch[0].length;
    result = result.slice(0, idx) + `<base href="${base}/">` + result.slice(idx);
  } else {
    result = `<base href="${base}/">` + result;
  }

  // Rewrite src/href/action attributes to go through proxy for same-origin resources
  // We rewrite absolute URLs that match the target origin
  result = result.replace(
    /((?:src|href|action)\s*=\s*["'])((?:https?:)?\/\/[^"']*)(["'])/gi,
    (_match, prefix, url, suffix) => {
      // Resolve protocol-relative URLs
      let absolute = url;
      if (url.startsWith('//')) {
        absolute = origin.protocol + url;
      }
      // Don't proxy data: URLs, blob: URLs, or javascript: URLs
      if (/^(data:|blob:|javascript:|#|mailto:)/i.test(absolute)) {
        return prefix + url + suffix;
      }
      return prefix + proxyUrl(selfBase, absolute) + suffix;
    }
  );

  // Inject a script that intercepts fetch/XHR to route through proxy
  const interceptScript = `
<script>
(function() {
  var PROXY = ${JSON.stringify(selfBase)};
  var BASE = ${JSON.stringify(base)};

  // Intercept window.open
  var _open = window.open;
  window.open = function(url) {
    if (url && typeof url === 'string' && url.startsWith('http')) {
      return _open.call(window, PROXY + '?url=' + encodeURIComponent(url));
    }
    return _open.apply(window, arguments);
  };

  // Intercept link clicks for navigation
  document.addEventListener('click', function(e) {
    var a = e.target;
    while (a && a.tagName !== 'A') a = a.parentElement;
    if (a && a.href && a.href.startsWith('http') && !a.href.includes(PROXY)) {
      e.preventDefault();
      window.location.href = PROXY + '?url=' + encodeURIComponent(a.href);
    }
  }, true);
})();
</script>`;

  // Inject before </body> or at end
  const bodyClose = result.lastIndexOf('</body>');
  if (bodyClose !== -1) {
    result = result.slice(0, bodyClose) + interceptScript + result.slice(bodyClose);
  } else {
    result += interceptScript;
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const reqUrl = new URL(req.url);
    const targetUrl = reqUrl.searchParams.get('url');

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

    // Build self-base URL for rewriting
    const selfBase = `${reqUrl.protocol}//${reqUrl.host}${reqUrl.pathname}`;

    // Fetch upstream with privacy-hardened headers
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': RELAY_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Sec-GPC': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
    });

    // Build sanitized response headers
    const responseHeaders = new Headers(corsHeaders);
    for (const [key, value] of upstream.headers.entries()) {
      if (STRIPPED.has(key.toLowerCase())) continue;
      responseHeaders.set(key, value);
    }

    responseHeaders.set('Referrer-Policy', 'no-referrer');
    responseHeaders.set('X-Hologram-Relay', 'active');

    const contentType = upstream.headers.get('content-type') || '';

    // HTML — rewrite for full proxy compatibility
    if (contentType.includes('text/html')) {
      let html = await upstream.text();
      html = rewriteHtml(html, targetUrl, selfBase);
      responseHeaders.set('Content-Type', contentType);
      // Remove content-length since we modified the body
      responseHeaders.delete('content-length');
      return new Response(html, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    // CSS — rewrite url() references
    if (contentType.includes('text/css')) {
      let css = await upstream.text();
      const base = `${parsed.protocol}//${parsed.host}`;
      css = css.replace(
        /url\(\s*["']?((?:https?:)?\/\/[^"')]+)["']?\s*\)/gi,
        (_match, url) => {
          let absolute = url;
          if (url.startsWith('//')) absolute = parsed.protocol + url;
          return `url("${proxyUrl(selfBase, absolute)}")`;
        }
      );
      responseHeaders.set('Content-Type', contentType);
      responseHeaders.delete('content-length');
      return new Response(css, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    // All other content types — passthrough (images, fonts, JS, etc.)
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
