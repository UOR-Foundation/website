import type { EnrichedReceipt } from "@/modules/oracle/lib/receipt-registry";
import { getPreferredTier, createTTFTMeasure } from "@/modules/oracle/lib/latency-tracker";

export type Msg = { role: "user" | "assistant"; content: string; proof?: EnrichedReceipt };

const ORACLE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uor-oracle`;

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

  const resp = await fetch(ORACLE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, scaffoldFragment, temperature, latencyTier }),
  });

  if (!resp.ok || !resp.body) {
    if (resp.status === 429) { onError("Rate limited. Please try again shortly."); return; }
    if (resp.status === 402) { onError("Credits exhausted. Please add funds."); return; }
    onError("Failed to connect to the Oracle."); return;
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
