/**
 * stream-resonance — SSE client for the book-resonance edge function.
 */

import { getPreferredTier, createTTFTMeasure } from "@/modules/intelligence/oracle/lib/latency-tracker";

const RESONANCE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/book-resonance`;

export interface Invariant {
  name: string;
  description: string;
  books: string[];
  domains: string[];
  resonance: number;
  uor_form: string;
  insight: string;
  why_surprising?: string;
}

export interface BookSummary {
  id: string;
  title: string;
  author: string | null;
  domain: string;
  cover_url: string | null;
  source_url: string;
  tags: string[];
  created_at: string;
}

export async function listBooks(): Promise<BookSummary[]> {
  const resp = await fetch(RESONANCE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ action: "list" }),
  });
  if (!resp.ok) throw new Error("Failed to list books");
  const data = await resp.json();
  return data.books || [];
}

export async function ingestBooks(sourceUrl: string): Promise<{ ingested: number; books: BookSummary[] }> {
  const resp = await fetch(RESONANCE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ action: "ingest", sourceUrl }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || "Ingestion failed");
  }
  return resp.json();
}

export async function streamFuse({
  bookIds,
  onDelta,
  onDone,
  onError,
}: {
  bookIds: string[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  return streamSSE({ action: "fuse", bookIds }, onDelta, onDone, onError);
}

export async function streamDiscover({
  userContext,
  onDelta,
  onDone,
  onError,
}: {
  userContext?: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  return streamSSE({ action: "discover", userContext }, onDelta, onDone, onError);
}

async function streamSSE(
  body: Record<string, unknown>,
  onDelta: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
) {
  const ttft = createTTFTMeasure();
  const latencyTier = getPreferredTier();

  const resp = await fetch(RESONANCE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ ...body, latencyTier }),
  });

  if (!resp.ok || !resp.body) {
    if (resp.status === 429) { onError("Rate limited. Please try again shortly."); return; }
    if (resp.status === 402) { onError("Credits exhausted."); return; }
    onError("Failed to connect."); return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;

  while (!done) {
    const { done: readerDone, value } = await reader.read();
    if (readerDone) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { done = true; break; }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) { ttft.markFirstToken(); onDelta(content); }
      } catch {
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
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) { ttft.markFirstToken(); onDelta(content); }
      } catch { /* ignore */ }
    }
  }

  onDone();
}

/** Parse the streamed text (which should be a JSON array) into Invariant objects */
export function parseInvariants(raw: string): Invariant[] {
  try {
    // Strip markdown fences if present
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}
