/**
 * Sovereign Bus — Local LLM Module Registration.
 * ═════════════════════════════════════════════════════════════════
 *
 * Exposes local LLM operations via the bus API.
 * Dual-dispatch: Tauri → Ollama IPC, Browser → Cloud Oracle fallback.
 *
 * @version 2.0.0
 */

import { register } from "../registry";

register({
  ns: "llm",
  label: "Local LLM Engine",
  layer: 1,
  operations: {
    status: {
      handler: async () => {
        const { localLLM } = await import("@/lib/local-llm-engine");
        return localLLM.detectBackend();
      },
      description: "Check local LLM availability: backend type, models, GPU status",
    },
    models: {
      handler: async () => {
        const { localLLM } = await import("@/lib/local-llm-engine");
        return { models: await localLLM.listModels(), backend: localLLM.getBackend() };
      },
      description: "List available local models (Ollama/llama.cpp)",
    },
    pull: {
      handler: async (params: any) => {
        const { localLLM } = await import("@/lib/local-llm-engine");
        if (!params?.model) throw new Error("Provide model name (e.g. llama3.2:3b)");
        const success = await localLLM.pullModel(params.model);
        return { success, model: params.model };
      },
      description: "Download a model to the local LLM server",
      paramsSchema: {
        type: "object",
        properties: {
          model: { type: "string", description: "Model name (e.g. llama3.2:3b, phi3:mini)" },
        },
        required: ["model"],
      },
    },
    complete: {
      handler: async (params: any) => {
        const { localLLM } = await import("@/lib/local-llm-engine");
        if (!params?.prompt) throw new Error("Provide prompt");
        return localLLM.complete({
          prompt: params.prompt,
          model: params.model,
          systemPrompt: params.systemPrompt,
          graphContext: params.graphContext,
          temperature: params.temperature,
          maxTokens: params.maxTokens,
        });
      },
      description: "Run inference locally (Ollama) or via cloud fallback. Supports knowledge graph RAG context.",
      paramsSchema: {
        type: "object",
        properties: {
          prompt: { type: "string" },
          model: { type: "string" },
          systemPrompt: { type: "string" },
          graphContext: { type: "array", items: { type: "string" } },
          temperature: { type: "number" },
          maxTokens: { type: "number" },
        },
        required: ["prompt"],
      },
    },
    backend: {
      handler: async () => {
        const { localLLM } = await import("@/lib/local-llm-engine");
        return {
          backend: localLLM.getBackend(),
          recommended: localLLM.RECOMMENDED_MODELS,
        };
      },
      description: "Check which LLM backend is active and get recommended models per hardware tier",
    },
  },
});
