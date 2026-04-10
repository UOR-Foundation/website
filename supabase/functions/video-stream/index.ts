/**
 * video-stream — Piped API proxy for resolving YouTube video IDs
 * into direct stream URLs and proxied thumbnails.
 *
 * GET /video-stream?id=VIDEO_ID          → JSON { streamUrl, thumbnailUrl, title, ... }
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

// Simple in-memory cache (lives for the function's cold-start lifetime)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

interface PipedStream {
  url: string;
  quality: string;
  mimeType: string;
  bitrate: number;
  width?: number;
  height?: number;
  videoOnly?: boolean;
  audioOnly?: boolean; // not present on combined streams
}

interface PipedResponse {
  title: string;
  uploader: string;
  uploaderUrl: string;
  duration: number;
  thumbnailUrl: string;
  videoStreams: PipedStream[];
  audioStreams: PipedStream[];
}

async function fetchFromPiped(videoId: string): Promise<PipedResponse | null> {
  const cacheKey = `v:${videoId}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data as PipedResponse;
  }

  for (const instance of PIPED_INSTANCES) {
    try {
      const resp = await fetch(`${instance}/streams/${videoId}`, {
        headers: { "User-Agent": "UOR-MediaPlayer/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) {
        await resp.text(); // consume body
        continue;
      }
      const data = (await resp.json()) as PipedResponse;
      if (data && data.videoStreams) {
        cache.set(cacheKey, { data, ts: Date.now() });
        return data;
      }
    } catch {
      // try next instance
    }
  }
  return null;
}

function pickBestStream(data: PipedResponse): string | null {
  // Prefer combined (audio+video) streams, highest quality
  const combined = data.videoStreams
    .filter((s) => !s.videoOnly && s.mimeType?.startsWith("video/"))
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

  if (combined.length > 0) return combined[0].url;

  // Fallback: any video stream
  const anyVideo = data.videoStreams
    .filter((s) => s.url)
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

  if (anyVideo.length > 0) return anyVideo[0].url;

  return null;
}

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

    const data = await fetchFromPiped(videoId);

    if (!data) {
      return new Response(
        JSON.stringify({ error: "Could not resolve video from any Piped instance" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Thumbnail redirect mode
    if (thumbOnly) {
      const thumbUrl = data.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: thumbUrl },
      });
    }

    const streamUrl = pickBestStream(data);

    return new Response(
      JSON.stringify({
        streamUrl,
        thumbnailUrl: data.thumbnailUrl,
        title: data.title,
        uploader: data.uploader,
        duration: data.duration,
        // Also provide HLS/audio fallbacks
        audioStreamUrl: data.audioStreams?.length
          ? data.audioStreams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0].url
          : null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("video-stream error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
