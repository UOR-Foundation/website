/**
 * UOR Local LLM Engine — Dual-Dispatch (Ollama IPC ↔ Cloud Gateway)
 * ═════════════════════════════════════════════════════════════════
 *
 * When running in Tauri: inference dispatches to a local Ollama or
 * llama.cpp server via the Rust backend IPC. Zero network dependency.
 * The knowledge graph provides retrieval context natively.
 *
 * When running in browser: falls back to the cloud Oracle gateway
 * (Lovable AI via edge function).
 *
 * The API surface is identical — callers get the same streaming
 * interface regardless of backend.
 *
 * Architecture:
 *   ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
 *   │  Frontend    │ ──▶ │ local-llm    │ ──▶ │ Tauri IPC       │
 *   │  (React)     │     │ engine.ts    │     │ → Ollama HTTP   │
 *   └─────────────┘     │              │     │ → llama.cpp     │
 *                       │              │     └─────────────────┘
 *                       │              │     ┌─────────────────┐
 *                       │ (fallback)   │ ──▶ │ Cloud Gateway   │
 *                       │              │     │ → Lovable AI    │
 *                       └──────────────┘     └─────────────────┘
 *
 * @module lib/local-llm-engine
 * @layer 1
 */

import { isLocal, invoke } from "@/lib/runtime";

// ── Types ───────────────────────────────────────────────────────────────

export type LLMBackend = "ollama" | "llama-cpp" | "cloud";

export interface LocalModel {
  name: string;
  size: string;
  quantization: string;
  parameterCount: string;
  family: string;
  /** Whether this model is currently loaded in memory */
  loaded: boolean;
}

export interface LLMStatus {
  backend: LLMBackend;
  available: boolean;
  models: LocalModel[];
  activeModel: string | null;
  gpuAccelerated: boolean;
  vramUsedMb: number;
  /** Ollama/llama.cpp server version */
  serverVersion: string | null;
}

export interface CompletionRequest {
  prompt: string;
  model?: string;
  systemPrompt?: string;
  /** Knowledge graph context triples injected as RAG */
  graphContext?: string[];
  temperature?: number;
  maxTokens?: number;
  /** Whether to stream tokens */
  stream?: boolean;
}

export interface CompletionResult {
  text: string;
  backend: LLMBackend;
  model: string;
  tokensGenerated: number;
  durationMs: number;
  /** Tokens per second */
  throughput: number;
}

export interface StreamToken {
  token: string;
  done: boolean;
}

// ── Recommended Models ──────────────────────────────────────────────────

/** Models optimized for knowledge graph reasoning at various hardware tiers */
export const RECOMMENDED_MODELS = {
  /** 4GB RAM minimum — fast, good for simple queries */
  light: {
    ollama: "phi3:mini",
    llamaCpp: "phi-3-mini-4k-instruct.Q4_K_M.gguf",
    params: "3.8B",
  },
  /** 8GB RAM — balanced reasoning and speed */
  balanced: {
    ollama: "llama3.2:3b",
    llamaCpp: "Llama-3.2-3B-Instruct-Q5_K_M.gguf",
    params: "3B",
  },
  /** 16GB RAM — strong reasoning for complex graph queries */
  reasoning: {
    ollama: "llama3.1:8b",
    llamaCpp: "Meta-Llama-3.1-8B-Instruct-Q5_K_M.gguf",
    params: "8B",
  },
  /** 32GB+ RAM or GPU — maximum capability */
  advanced: {
    ollama: "qwen2.5:14b",
    llamaCpp: "Qwen2.5-14B-Instruct-Q4_K_M.gguf",
    params: "14B",
  },
} as const;

// ── System Prompts ──────────────────────────────────────────────────────

const KG_SYSTEM_PROMPT = `You are a sovereign AI assistant embedded in the UOR Operating System.
You have direct access to the user's local knowledge graph — a content-addressed
RDF store of triples. When graph context is provided, use it to ground your
responses in the user's actual data. Be precise, cite specific triples when
relevant, and prefer factual answers derived from the graph over general knowledge.

When no graph context is available, you may reason generally but clearly indicate
when your response is not grounded in the local knowledge graph.`;

// ── Ollama Detection (via Tauri IPC) ────────────────────────────────────

/**
 * Check if a local LLM backend is available.
 * In Tauri: pings Ollama at localhost:11434 via the Rust backend.
 * In browser: always returns cloud.
 */
export async function detectBackend(): Promise<LLMStatus> {
  if (isLocal()) {
    try {
      const status = await invoke<LLMStatus>("llm_status");
      if (status) return status;
    } catch {
      // Ollama not running — fall through
    }
  }

  return {
    backend: "cloud",
    available: true,
    models: [],
    activeModel: null,
    gpuAccelerated: false,
    vramUsedMb: 0,
    serverVersion: null,
  };
}

/**
 * List available models from the local LLM server.
 */
export async function listModels(): Promise<LocalModel[]> {
  if (!isLocal()) return [];
  try {
    const models = await invoke<LocalModel[]>("llm_list_models");
    return models ?? [];
  } catch {
    return [];
  }
}

/**
 * Pull/download a model to the local LLM server.
 */
export async function pullModel(
  modelName: string,
  onProgress?: (pct: number) => void,
): Promise<boolean> {
  if (!isLocal()) return false;
  try {
    const result = await invoke<{ success: boolean }>("llm_pull_model", {
      model: modelName,
    });
    return result?.success ?? false;
  } catch {
    return false;
  }
}

// ── Completion (Non-Streaming) ──────────────────────────────────────────

/**
 * Run a completion against the local LLM or cloud fallback.
 * Injects knowledge graph context as RAG prefix.
 */
export async function complete(req: CompletionRequest): Promise<CompletionResult> {
  const systemPrompt = req.systemPrompt ?? KG_SYSTEM_PROMPT;
  const contextBlock = req.graphContext?.length
    ? `\n\n--- Knowledge Graph Context ---\n${req.graphContext.join("\n")}\n--- End Context ---\n\n`
    : "";

  const fullPrompt = contextBlock + req.prompt;

  // Try local first
  if (isLocal()) {
    try {
      const result = await invoke<CompletionResult>("llm_complete", {
        prompt: fullPrompt,
        model: req.model ?? RECOMMENDED_MODELS.balanced.ollama,
        systemPrompt,
        temperature: req.temperature ?? 0.7,
        maxTokens: req.maxTokens ?? 2048,
      });
      if (result) return result;
    } catch (err) {
      console.warn("[LocalLLM] Native completion failed, falling back to cloud:", err);
    }
  }

  // Cloud fallback — delegate to the existing Oracle stream
  return cloudComplete(req, systemPrompt, fullPrompt);
}

async function cloudComplete(
  req: CompletionRequest,
  systemPrompt: string,
  fullPrompt: string,
): Promise<CompletionResult> {
  const start = performance.now();

  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uor-oracle`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: fullPrompt },
        ],
        temperature: req.temperature ?? 0.7,
      }),
    },
  );

  if (!resp.ok) throw new Error(`Cloud Oracle error: ${resp.status}`);

  // Collect SSE stream
  let text = "";
  const reader = resp.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") break;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) text += content;
      } catch { /* partial */ }
    }
  }

  const durationMs = performance.now() - start;
  const tokensGenerated = Math.ceil(text.length / 4); // rough estimate

  return {
    text,
    backend: "cloud",
    model: "cloud-oracle",
    tokensGenerated,
    durationMs,
    throughput: tokensGenerated / (durationMs / 1000),
  };
}

// ── Streaming Completion ────────────────────────────────────────────────

/**
 * Stream a completion from the local LLM.
 * Falls back to cloud streaming if local is unavailable.
 */
export async function streamComplete(
  req: CompletionRequest,
  onToken: (token: string) => void,
  onDone: (result: { backend: LLMBackend; model: string; tokensGenerated: number }) => void,
  onError?: (error: string) => void,
): Promise<void> {
  const systemPrompt = req.systemPrompt ?? KG_SYSTEM_PROMPT;
  const contextBlock = req.graphContext?.length
    ? `\n\n--- Knowledge Graph Context ---\n${req.graphContext.join("\n")}\n--- End Context ---\n\n`
    : "";
  const fullPrompt = contextBlock + req.prompt;

  // Try local streaming via IPC
  if (isLocal()) {
    try {
      const status = await detectBackend();
      if (status.available && status.backend !== "cloud") {
        await streamLocalLLM(fullPrompt, systemPrompt, req, onToken, onDone);
        return;
      }
    } catch {
      // Fall through to cloud
    }
  }

  // Cloud streaming fallback
  await streamCloudFallback(fullPrompt, systemPrompt, req, onToken, onDone, onError);
}

async function streamLocalLLM(
  fullPrompt: string,
  systemPrompt: string,
  req: CompletionRequest,
  onToken: (token: string) => void,
  onDone: (result: { backend: LLMBackend; model: string; tokensGenerated: number }) => void,
): Promise<void> {
  // In Tauri, we use a polling approach: the Rust backend starts
  // generation and we poll for tokens via IPC.
  const model = req.model ?? RECOMMENDED_MODELS.balanced.ollama;

  // Start generation
  const sessionId = await invoke<string>("llm_stream_start", {
    prompt: fullPrompt,
    model,
    systemPrompt,
    temperature: req.temperature ?? 0.7,
    maxTokens: req.maxTokens ?? 2048,
  });

  if (!sessionId) throw new Error("Failed to start local LLM stream");

  let tokensGenerated = 0;

  // Poll for tokens
  const poll = async () => {
    while (true) {
      const batch = await invoke<StreamToken[]>("llm_stream_poll", {
        sessionId,
      });

      if (!batch || batch.length === 0) {
        // No tokens yet, brief pause
        await new Promise(r => setTimeout(r, 10));
        continue;
      }

      for (const t of batch) {
        if (t.done) {
          onDone({ backend: "ollama", model, tokensGenerated });
          return;
        }
        onToken(t.token);
        tokensGenerated++;
      }
    }
  };

  await poll();
}

async function streamCloudFallback(
  fullPrompt: string,
  systemPrompt: string,
  req: CompletionRequest,
  onToken: (token: string) => void,
  onDone: (result: { backend: LLMBackend; model: string; tokensGenerated: number }) => void,
  onError?: (error: string) => void,
): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    onError?.("You're offline. Local LLM is not available — install Ollama for offline AI.");
    return;
  }

  const { streamOracle } = await import("@/modules/oracle/lib/stream-oracle");

  let tokensGenerated = 0;

  await streamOracle({
    messages: [
      { role: "user", content: fullPrompt },
    ],
    onDelta: (text) => {
      onToken(text);
      tokensGenerated++;
    },
    onDone: () => {
      onDone({ backend: "cloud", model: "cloud-oracle", tokensGenerated });
    },
    onError: (err) => {
      onError?.(err);
    },
  });
}

// ── Knowledge Graph RAG Helper ──────────────────────────────────────────

/**
 * Build graph context from triples for RAG injection.
 * Queries the local knowledge graph for relevant triples
 * and formats them as natural language context.
 */
export function formatGraphContext(
  triples: Array<{ subject: string; predicate: string; object: string }>,
): string[] {
  return triples.map(t => `${t.subject} → ${t.predicate} → ${t.object}`);
}

// ── Convenience API ─────────────────────────────────────────────────────

export const localLLM = {
  detectBackend,
  listModels,
  pullModel,
  complete,
  streamComplete,
  formatGraphContext,
  getBackend: (): LLMBackend => isLocal() ? "ollama" : "cloud",
  RECOMMENDED_MODELS,
} as const;
