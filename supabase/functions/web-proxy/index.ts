/**
 * web-proxy — Lightweight reverse proxy for the Hologram Browser.
 * Fetches a URL server-side and returns the response with iframe-blocking headers stripped.
 *
 * Usage:  GET /web-proxy?url=https://example.com
 */

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STRIP = new Set([
  "x-frame-options",
  "content-security-policy",
  "content-security-policy-report-only",
  "set-cookie",
  "set-cookie2",
  "transfer-encoding",
  "connection",
  "keep-alive",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const u = new URL(req.url);
    const target = u.searchParams.get("url");
    if (!target) {
      return new Response(JSON.stringify({ error: "Missing ?url=" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = new URL(target);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return new Response(JSON.stringify({ error: "HTTP(S) only" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const selfBase = `${u.protocol}//${u.host}${u.pathname}`;
    const upstream = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    const h = new Headers(corsHeaders);
    for (const [k, v] of upstream.headers.entries()) {
      if (!STRIP.has(k.toLowerCase())) h.set(k, v);
    }
    h.set("X-Hologram-Relay", "active");

    const ct = upstream.headers.get("content-type") || "";

    if (ct.includes("text/html")) {
      let html = await upstream.text();
      const base = `${parsed.protocol}//${parsed.host}`;

      // Remove existing <base>, inject ours
      html = html.replace(/<base\s[^>]*>/gi, "");
      const headIdx = html.search(/<head[^>]*>/i);
      if (headIdx !== -1) {
        const tag = html.match(/<head[^>]*>/i)![0];
        const ins = headIdx + tag.length;
        html =
          html.slice(0, ins) + `<base href="${base}/">` + html.slice(ins);
      }

      // Rewrite absolute src/href to proxy
      html = html.replace(
        /((?:src|href|action)\s*=\s*["'])(https?:\/\/[^"']*)(["'])/gi,
        (_m, pre, url, suf) => {
          if (/^(data:|blob:|javascript:|mailto:)/i.test(url)) return pre + url + suf;
          return pre + selfBase + "?url=" + encodeURIComponent(url) + suf;
        },
      );

      // Inject click interceptor
      const script = `<script>(function(){var P="${selfBase}";document.addEventListener("click",function(e){var a=e.target;while(a&&a.tagName!=="A")a=a.parentElement;if(a&&a.href&&a.href.startsWith("http")&&!a.href.includes(P)){e.preventDefault();window.location.href=P+"?url="+encodeURIComponent(a.href)}},true)})()</script>`;
      const bi = html.lastIndexOf("</body>");
      html = bi !== -1 ? html.slice(0, bi) + script + html.slice(bi) : html + script;

      h.set("Content-Type", ct);
      h.delete("content-length");
      return new Response(html, { status: upstream.status, headers: h });
    }

    // CSS — rewrite url()
    if (ct.includes("text/css")) {
      let css = await upstream.text();
      css = css.replace(
        /url\(\s*["']?(https?:\/\/[^"')]+)["']?\s*\)/gi,
        (_m, url) => `url("${selfBase}?url=${encodeURIComponent(url)}")`,
      );
      h.set("Content-Type", ct);
      h.delete("content-length");
      return new Response(css, { status: upstream.status, headers: h });
    }

    // Everything else — passthrough
    return new Response(upstream.body, { status: upstream.status, headers: h });
  } catch (err) {
    console.error("web-proxy error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Proxy error" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
