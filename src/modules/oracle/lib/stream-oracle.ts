import type { EnrichedReceipt } from "@/modules/oracle/lib/receipt-registry";
import { getPreferredTier, createTTFTMeasure } from "@/modules/oracle/lib/latency-tracker";

export type Msg = { role: "user" | "assistant"; content: string; proof?: EnrichedReceipt };

const ORACLE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uor-oracle`;

/**
 * Efficient SSE line parser — avoids O(n²) string slicing by tracking
 * a read cursor instead of repeatedly creating substrings.
 */
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
  return buf.slice(start); // leftover
}

export async function streamOracle({
  messages,
  scaffoldFragment,
  temperature,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  scaffoldFragment?: string;
  temperature?: number;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  const ttft = createTTFTMeasure();
  const latencyTier = getPreferredTier();

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    onError("You're currently offline. The Oracle will be available when your connection returns.");
    return;
  }

  const resp = await fetch(ORACLE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, scaffoldFragment, temperature, latencyTier }),
    keepalive: true,
  });

  if (!resp.ok || !resp.body) {
    if (resp.status === 429) { onError("Rate limited. Please try again shortly."); return; }
    if (resp.status === 402) { onError("Credits exhausted. Please add funds."); return; }
    onError("Failed to connect to the Oracle."); return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let carry = "";
  let done = false;

  while (!done) {
    const { done: readerDone, value } = await reader.read();
    if (readerDone) break;
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
      if (jsonStr === "[DONE]") { done = true; break; }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) { ttft.markFirstToken(); onDelta(content); }
      } catch {
        // Incomplete JSON — will be handled in next chunk
      }
      result = gen.next();
    }
    // Capture leftover from generator return
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
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) { ttft.markFirstToken(); onDelta(content); }
      } catch { /* ignore */ }
    }
  }

  onDone();
}
