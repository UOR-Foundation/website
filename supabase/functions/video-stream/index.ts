/**
 * video-stream — Resolves YouTube video IDs into direct stream URLs
 * via Piped and Invidious public APIs.
 *
 * GET /video-stream?id=VIDEO_ID          → JSON { streamUrl, thumbnailUrl, title }
 * GET /video-stream?id=VIDEO_ID&thumb=1  → 302 redirect to proxied thumbnail
 */

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.in.projectsegfau.lt",
];

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://iv.melmac.space",
  "https://invidious.privacyredirect.com",
  "https://yewtu.be",
];

const cache = new Map<string, { data: StreamResult; ts: number }>();
const CACHE_TTL = 1000 * 60 * 30;

interface StreamResult {
  streamUrl: string | null;
  audioStreamUrl: string | null;
  thumbnailUrl: string;
  title: string;
  uploader: string;
  duration: number;
}

/* ── Piped ────────────────────────────────────────────────────── */

async function tryPiped(videoId: string): Promise<StreamResult | null> {
  for (const instance of PIPED_INSTANCES) {
    try {
      const resp = await fetch(`${instance}/streams/${videoId}`, {
        headers: { "User-Agent": "UOR-MediaPlayer/1.0" },
        signal: AbortSignal.timeout(6000),
      });
      if (!resp.ok) { await resp.text(); continue; }
      const data = await resp.json();
      if (!data?.videoStreams) continue;

      const combined = data.videoStreams
        .filter((s: any) => !s.videoOnly && s.mimeType?.startsWith("video/"))
        .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
      const streamUrl = combined[0]?.url
        || data.videoStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0]?.url
        || null;
      const audioStreamUrl = data.audioStreams?.length
        ? data.audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0].url
        : null;

      return {
        streamUrl,
        audioStreamUrl,
        thumbnailUrl: data.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        title: data.title || "",
        uploader: data.uploader || "",
        duration: data.duration || 0,
      };
    } catch { /* next */ }
  }
  return null;
}

/* ── Invidious ────────────────────────────────────────────────── */

async function tryInvidious(videoId: string): Promise<StreamResult | null> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const resp = await fetch(`${instance}/api/v1/videos/${videoId}`, {
        headers: { "User-Agent": "UOR-MediaPlayer/1.0" },
        signal: AbortSignal.timeout(6000),
      });
      if (!resp.ok) { await resp.text(); continue; }
      const data = await resp.json();

      // Invidious provides formatStreams (combined a/v) and adaptiveFormats
      const formats = (data.formatStreams || []).concat(data.adaptiveFormats || []);
      const videoStreams = formats
        .filter((f: any) => f.type?.startsWith("video/") && f.url)
        .sort((a: any, b: any) => (parseInt(b.bitrate) || 0) - (parseInt(a.bitrate) || 0));
      const audioStreams = formats
        .filter((f: any) => f.type?.startsWith("audio/") && f.url)
        .sort((a: any, b: any) => (parseInt(b.bitrate) || 0) - (parseInt(a.bitrate) || 0));

      // Prefer combined streams (formatStreams)
      const combined = (data.formatStreams || [])
        .filter((f: any) => f.url)
        .sort((a: any, b: any) => (parseInt(b.bitrate) || 0) - (parseInt(a.bitrate) || 0));

      const streamUrl = combined[0]?.url || videoStreams[0]?.url || null;
      const audioStreamUrl = audioStreams[0]?.url || null;

      const thumb = data.videoThumbnails?.find((t: any) => t.quality === "medium")?.url
        || data.videoThumbnails?.[0]?.url
        || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

      return {
        streamUrl,
        audioStreamUrl,
        thumbnailUrl: thumb,
        title: data.title || "",
        uploader: data.author || "",
        duration: data.lengthSeconds || 0,
      };
    } catch { /* next */ }
  }
  return null;
}

/* ── Combined resolver ───────────────────────────────────────── */

async function resolveVideo(videoId: string): Promise<StreamResult | null> {
  const cacheKey = `v:${videoId}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  // Try Piped first, then Invidious
  const result = await tryPiped(videoId) || await tryInvidious(videoId);
  if (result) cache.set(cacheKey, { data: result, ts: Date.now() });
  return result;
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

    if (!videoId || !/^[a-zA-Z0-9_-]{6,15}$/.test(videoId)) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid ?id= parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Thumbnail-only: try Invidious proxy thumbnail directly (fast)
    if (thumbOnly) {
      // Try Invidious thumbnail proxy first (doesn't need full stream resolution)
      for (const inst of INVIDIOUS_INSTANCES) {
        try {
          const thumbResp = await fetch(`${inst}/vi/${videoId}/mqdefault.jpg`, {
            signal: AbortSignal.timeout(4000),
            redirect: "follow",
          });
          if (thumbResp.ok && thumbResp.headers.get("content-type")?.startsWith("image/")) {
            return new Response(thumbResp.body, {
              headers: {
                ...corsHeaders,
                "Content-Type": thumbResp.headers.get("content-type") || "image/jpeg",
                "Cache-Control": "public, max-age=86400",
              },
            });
          }
          await thumbResp.text();
        } catch { /* next */ }
      }
      // Fallback: YouTube direct
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` },
      });
    }

    const data = await resolveVideo(videoId);
    if (!data) {
      return new Response(
        JSON.stringify({ error: "Could not resolve video from any instance" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("video-stream error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
