/**
 * stream-knowledge — SSE client for the streaming uor-knowledge edge function.
 *
 * Emits wiki metadata instantly, then AI tokens as they arrive.
 */

const KNOWLEDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uor-knowledge`;

export interface WikiMeta {
  qid: string | null;
  thumbnail: string | null;
  description: string | null;
  extract: string | null;
  pageUrl: string | null;
}

export async function streamKnowledge({
  keyword,
  context,
  lens,
  onWiki,
  onDelta,
  onDone,
  onError,
}: {
  keyword: string;
  /** Recent search keywords for contextual personalization */
  context?: string[];
  /** Rendering lens ID (e.g. "encyclopedia", "magazine", "expert") */
  lens?: string;
  onWiki: (wiki: WikiMeta | null, sources: string[]) => void;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
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
    }),
  });

  if (!resp.ok || !resp.body) {
    // Non-streaming error responses (JSON)
    if (resp.status === 429) { onError("Rate limited. Please try again shortly."); return; }
    if (resp.status === 402) { onError("Credits exhausted. Please add funds."); return; }

    // Could be a non-streaming JSON fallback (wiki-only, AI failed)
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

  // SSE streaming
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nlIdx: number;
    while ((nlIdx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, nlIdx);
      buffer = buffer.slice(nlIdx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { streamDone = true; break; }

      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.type === "wiki") {
          onWiki(parsed.wiki as WikiMeta | null, parsed.sources || []);
        } else if (parsed.type === "delta" && parsed.content) {
          onDelta(parsed.content);
        }
      } catch {
        // Incomplete JSON — put back
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  // Flush remaining
  if (buffer.trim()) {
    for (let raw of buffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.type === "wiki") {
          onWiki(parsed.wiki as WikiMeta | null, parsed.sources || []);
        } else if (parsed.type === "delta" && parsed.content) {
          onDelta(parsed.content);
        }
      } catch { /* ignore */ }
    }
  }

  onDone();
}
