/**
 * video-stream — Serves a lightweight YouTube player page and proxies thumbnails.
 * Bypasses X-Frame-Options by being the direct iframe host for YouTube embeds.
 *
 * GET /video-stream?id=VIDEO_ID               → HTML player page (embeddable)
 * GET /video-stream?id=VIDEO_ID&thumb=1       → proxy thumbnail image
 * GET /video-stream?id=VIDEO_ID&info=1        → JSON metadata via oEmbed
 */

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ── Thumbnail proxy ─────────────────────────────────────────── */

async function proxyThumbnail(videoId: string): Promise<Response> {
  const qualities = ["maxresdefault", "hqdefault", "mqdefault", "default"];
  for (const q of qualities) {
    try {
      const resp = await fetch(`https://i.ytimg.com/vi/${videoId}/${q}.jpg`, {
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (resp.ok) {
        const ct = resp.headers.get("content-type") || "image/jpeg";
        // Check it's not a placeholder (YouTube returns 120x90 for missing)
        const cl = parseInt(resp.headers.get("content-length") || "0");
        if (q === "maxresdefault" && cl < 5000) {
          await resp.arrayBuffer(); // consume
          continue; // likely placeholder
        }
        return new Response(resp.body, {
          headers: {
            ...corsHeaders,
            "Content-Type": ct,
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
      await resp.text();
    } catch { /* next quality */ }
  }
  // Final fallback — redirect
  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` },
  });
}

/* ── oEmbed metadata ─────────────────────────────────────────── */

async function getVideoInfo(videoId: string): Promise<Response> {
  try {
    const resp = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (resp.ok) {
      const data = await resp.json();
      return new Response(JSON.stringify({
        title: data.title,
        uploader: data.author_name,
        thumbnailUrl: data.thumbnail_url,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await resp.text();
  } catch { /* fall through */ }
  return new Response(JSON.stringify({ title: "", uploader: "" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/* ── Embeddable player page ──────────────────────────────────── */

function playerPage(videoId: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#000}
iframe{width:100%;height:100%;border:none}
</style>
</head>
<body>
<iframe
  id="player"
  src="https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&color=white&playsinline=1&enablejsapi=1"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowfullscreen
></iframe>
<script>
// Post messages to parent for state sync
window.addEventListener('message', function(e) {
  if (e.source === document.getElementById('player').contentWindow) {
    window.parent.postMessage(e.data, '*');
  }
});
</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      // Allow our page to be embedded anywhere
      "X-Frame-Options": "ALLOWALL",
    },
  });
}

/* ── Handler ─────────────────────────────────────────────────── */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const videoId = url.searchParams.get("id");
    const thumbOnly = url.searchParams.get("thumb") === "1";
    const infoOnly = url.searchParams.get("info") === "1";

    if (!videoId || !/^[a-zA-Z0-9_-]{6,15}$/.test(videoId)) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid ?id= parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (thumbOnly) return await proxyThumbnail(videoId);
    if (infoOnly) return await getVideoInfo(videoId);
    return playerPage(videoId);
  } catch (err) {
    console.error("video-stream error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
