/**
 * Sovereign Bus — Oracle Module Registration.
 * ═════════════════════════════════════════════════════════════════
 *
 * Exposes AI inference: ask, stream.
 * Remote — requires network for LLM inference via gateway.
 *
 * @version 1.0.0
 */

import { register } from "../registry";

register({
  ns: "oracle",
  label: "Oracle (AI)",
  defaultRemote: true,
  operations: {
    ask: {
      handler: async (params: any) => {
        // This handler is only called locally as a fallback;
        // normally the bus forwards to the remote gateway.
        // For local fallback: return a "needs network" message.
        return {
          response: null,
          offline: true,
          message: "Oracle requires network. Your knowledge graph and local data are fully available offline.",
        };
      },
      remote: true,
      description: "Send a prompt to the AI Oracle and receive a response",
      paramsSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "The user prompt" },
          model: { type: "string", description: "Model ID (e.g., google/gemini-2.5-flash)" },
          context: { type: "array", description: "Additional context messages" },
          conversationId: { type: "string" },
        },
        required: ["query"],
      },
    },
    stream: {
      handler: async () => ({
        offline: true,
        message: "Streaming requires network.",
      }),
      remote: true,
      description: "Stream a response from the AI Oracle (SSE)",
    },
  },
});
