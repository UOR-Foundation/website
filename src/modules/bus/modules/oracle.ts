/**
 * Sovereign Bus — Oracle Module Registration.
 * ═════════════════════════════════════════════════════════════════
 *
 * Exposes AI inference: ask, stream.
 * Dual-dispatch: local LLM (Ollama) when available, cloud fallback.
 *
 * @version 2.0.0
 */

import { register } from "../registry";

register({
  ns: "oracle",
  label: "Oracle (AI)",
  defaultRemote: true,
  operations: {
    ask: {
      handler: async (params: any) => {
        // Try local LLM first (Tauri + Ollama)
        try {
          const { localLLM } = await import("@/lib/local-llm-engine");
          const status = await localLLM.detectBackend();
          if (status.available && status.backend !== "cloud") {
            const result = await localLLM.complete({
              prompt: params?.query ?? "",
              model: params?.model,
              graphContext: params?.graphContext,
            });
            return {
              response: result.text,
              offline: false,
              backend: result.backend,
              model: result.model,
              throughput: result.throughput,
            };
          }
        } catch {
          // Fall through to network check
        }

        // Cloud fallback
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          return {
            response: null,
            offline: true,
            message: "You're offline. Install Ollama (ollama.com) for local AI, or reconnect for cloud Oracle.",
          };
        }

        return {
          response: null,
          offline: false,
          message: "Use oracle/stream for cloud AI responses.",
        };
      },
      remote: true,
      description: "Send a prompt to the AI Oracle — uses local LLM when available, cloud fallback otherwise",
      paramsSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "The user prompt" },
          model: { type: "string", description: "Model ID (local or cloud)" },
          graphContext: { type: "array", description: "Knowledge graph triples for RAG" },
          context: { type: "array", description: "Additional context messages" },
          conversationId: { type: "string" },
        },
        required: ["query"],
      },
    },
    stream: {
      handler: async () => ({
        offline: true,
        message: "Streaming requires the stream-oracle client module.",
      }),
      remote: true,
      description: "Stream a response from the AI Oracle (SSE)",
    },
  },
});
