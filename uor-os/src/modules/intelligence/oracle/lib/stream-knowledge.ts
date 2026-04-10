/**
 * stream-knowledge — SSE client for the streaming uor-knowledge edge function.
 *
 * Emits wiki metadata instantly, then AI tokens as they arrive.
 * Uses efficient line parsing to avoid O(n²) string concatenation.
 */

import { getPreferredTier, createTTFTMeasure } from "@/modules/intelligence/oracle/lib/latency-tracker";

const KNOWLEDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uor-knowledge`;

export interface MediaImage {
  url: string;
  caption?: string;
  uorHash: string;
  source: string;
  coherenceScore?: number;
  topicDomain?: string;
}

export interface MediaVideo {
  youtubeId: string;
  title: string;
  uorHash: string;
}

export interface MediaAudio {
  url: string;
  title: string;
  uorHash: string;
}

export interface MediaData {
  images: MediaImage[];
  videos: MediaVideo[];
  audio?: MediaAudio[];
}

export interface WikiMeta {
  qid: string | null;
  thumbnail: string | null;
  description: string | null;
  extract: string | null;
  pageUrl: string | null;
}

export interface ProvenanceMeta {
  model?: string;
  personalized?: boolean;
  personalizedTopics?: string[];
  queryDomain?: string;
  domainSubcategory?: string;
}

// Shared SSE line parser
function* parseSSELines(chunk: string, carry: string): Generator<string, string> {
  let buf = carry + chunk;
  let start = 0;
  let idx: number;
  while ((idx = buf.indexOf("\n", start)) !== -1) {
    let line = buf.slice(start, idx);
    if (line.endsWith("\r")) line = line.slice(0, -1);
    start = idx + 1;
    yield line;
  }
  return buf.slice(start);
}

function handleParsedEvent(
  parsed: any,
  ttft: ReturnType<typeof createTTFTMeasure>,
  onWiki: (wiki: WikiMeta | null, sources: Array<string | { url: string; title?: string; type?: string }>, provenance?: ProvenanceMeta) => void,
  onMedia: ((media: MediaData) => void) | undefined,
  onDelta: (text: string) => void,
) {
  if (parsed.type === "wiki") {
    onWiki(
      parsed.wiki as WikiMeta | null,
      parsed.sources || [],
      {
        model: parsed.model,
        personalized: parsed.personalized,
        personalizedTopics: parsed.personalizedTopics,
        queryDomain: parsed.queryDomain,
        domainSubcategory: parsed.domainSubcategory,
      }
    );
  } else if (parsed.type === "media" && parsed.media) {
    onMedia?.(parsed.media as MediaData);
  } else if (parsed.type === "delta" && parsed.content) {
    ttft.markFirstToken();
    onDelta(parsed.content);
  }
}

export async function streamKnowledge({
  keyword,
  context,
  lens,
  onWiki,
  onMedia,
  onDelta,
  onDone,
  onError,
  signal,
}: {
  keyword: string;
  context?: string[];
  lens?: string;
  onWiki: (
    wiki: WikiMeta | null,
    sources: Array<string | { url: string; title?: string; type?: string }>,
    provenance?: ProvenanceMeta
  ) => void;
  onMedia?: (media: MediaData) => void;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}) {
  const ttft = createTTFTMeasure();
  const latencyTier = getPreferredTier();

  const resp = await fetch(KNOWLEDGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      keyword,
      context: context?.length ? context : undefined,
      lens: lens || undefined,
      latencyTier,
    }),
    signal,
    keepalive: true,
  });

  if (!resp.ok || !resp.body) {
    if (resp.status === 429) { onError("Rate limited. Please try again shortly."); return; }
    if (resp.status === 402) { onError("Credits exhausted. Please add funds."); return; }

    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        const data = await resp.json();
        if (data.wiki) {
          onWiki(data.wiki as WikiMeta, data.sources || []);
          if (data.synthesis) onDelta(data.synthesis);
          onDone();
          return;
        }
        if (data.error) { onError(data.error); return; }
      } catch { /* fall through */ }
    }

    onError("Failed to connect to knowledge service.");
    return;
  }

  // Check if response is JSON (non-streaming fallback) vs SSE
  const contentType = resp.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const data = await resp.json();
      if (data.wiki) onWiki(data.wiki as WikiMeta, data.sources || []);
      if (data.synthesis) onDelta(data.synthesis);
      onDone();
      return;
    } catch { onError("Invalid response."); return; }
  }

  // SSE streaming with efficient line parser
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let carry = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });

    const gen = parseSSELines(chunk, carry);
    let result = gen.next();
    while (!result.done) {
      const line = result.value as string;
      if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) {
        result = gen.next();
        continue;
      }
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { streamDone = true; break; }

      try {
        const parsed = JSON.parse(jsonStr);
        handleParsedEvent(parsed, ttft, onWiki, onMedia, onDelta);
      } catch {
        // Incomplete JSON — will resolve in next chunk
      }
      result = gen.next();
    }
    if (result.done) carry = result.value as string;
  }

  // Flush remaining
  if (carry.trim()) {
    for (const raw of carry.split("\n")) {
      if (!raw || !raw.startsWith("data: ")) continue;
      const jsonStr = raw.replace(/\r$/, "").slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        handleParsedEvent(parsed, ttft, onWiki, onMedia, onDelta);
      } catch { /* ignore */ }
    }
  }

  onDone();
}
