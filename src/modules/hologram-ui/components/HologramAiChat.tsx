/**
 * Lumen AI Chat — In-System Intelligence Panel
 * ══════════════════════════════════════════════
 *
 * A serene, focused slide-out assistant for conversing with
 * cloud AI models via the Lumen AI engine. Warm charcoal panels,
 * gold accents, and Playfair Display typography.
 *
 * @module hologram-ui/components/HologramAiChat
 */

import { useState, useRef, useEffect, useCallback } from "react";
import type { TriadicPhase, CreatorStage } from "@/modules/hologram-ui/sovereign-creator";
import {
  X, Send, Loader2, Cpu, Sparkles, MessageSquare,
  Plus, Trash2, ChevronLeft, ChevronDown, Check, Cloud, Zap, User, Lock,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import TriadicWelcome from "@/modules/hologram-ui/components/TriadicWelcome";
import { useAttentionMode } from "@/modules/hologram-ui/hooks/useAttentionMode";
import { useFocusJournal } from "@/modules/hologram-ui/hooks/useFocusJournal";
import {
  AGENT_PERSONAS,
  AGENT_SKILLS,
  getDefaultPersona,
  getPersonaById,
  getSkillsForPersona,
  type AgentPersona,
  type AgentSkill,
} from "@/modules/hologram-ui/agent-personas";
import {
  getKnowledgeForSkill,
  getSourceCount,
  distillKnowledge,
} from "@/modules/hologram-ui/skill-knowledge-registry";
import { PHASES, computeBalance, PHASE_ORDER, type TriadicBalance } from "@/modules/hologram-ui/sovereign-creator";
import { AlertTriangle } from "lucide-react";
import {
  getAiEngine,
  RECOMMENDED_MODELS,
} from "@/modules/uns/core/hologram/ai-engine";
import {
  buildScaffold,
  processResponse,
  DEFAULT_CONFIG,
  type NeuroSymbolicResult,
} from "@/modules/ring-core/neuro-symbolic";
import AnnotatedResponse from "@/components/reasoning/EpistemicBadge";
import { saveReasoningProof } from "@/modules/ring-core/proof-persistence";
import {
  planPGI,
  composeFragments,
  storeClaims,
  type PGIResult,
} from "@/modules/ring-core/proof-gated-inference";
import {
  getAccelerator,
  streamOptimized,
} from "@/modules/ring-core/inference-accelerator";
import { StreamingCurvatureMonitor } from "@/modules/ring-core/symbolica-enhancements";

// ── Cloud AI Models (instant, no download) ─────────────────────────────────
const CLOUD_MODELS = [
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", desc: "fast, versatile, streaming", icon: "☁" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "balanced speed & reasoning", icon: "☁" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", desc: "strong reasoning, multimodal", icon: "☁" },
] as const;
import {
  checkInferenceCache,
  getInputHash,
  writeInferenceCache,
  replayAsStream,
} from "@/modules/uns/core/hologram/inference-cache";
import { useAiChatHistory, type Conversation } from "@/modules/hologram-ui/hooks/useAiChatHistory";
import { useContextProjection } from "@/modules/hologram-ui/hooks/useContextProjection";
import { extractTopicTags } from "@/modules/hologram-ui/engine/extractTopicTags";

// ── Palette constants ──────────────────────────────────────────────────────

const P = {
  bg: "hsl(25, 10%, 14%)",
  bgGrad: "linear-gradient(180deg, hsl(30, 8%, 18%) 0%, hsl(25, 10%, 14%) 100%)",
  surface: "hsla(30, 8%, 22%, 0.8)",
  surfaceHover: "hsla(38, 30%, 30%, 0.25)",
  border: "hsla(38, 30%, 30%, 0.25)",
  borderLight: "hsla(38, 30%, 30%, 0.15)",
  gold: "hsl(38, 50%, 50%)",
  goldLight: "hsl(38, 60%, 60%)",
  goldMuted: "hsl(38, 40%, 45%)",
  goldBg: "hsla(38, 50%, 50%, 0.15)",
  goldBgHover: "hsla(38, 40%, 40%, 0.15)",
  text: "hsl(38, 20%, 85%)",
  textMuted: "hsl(30, 10%, 60%)",
  textDim: "hsl(30, 10%, 50%)",
  textDimmer: "hsl(30, 10%, 45%)",
  font: "'DM Sans', sans-serif",
  fontDisplay: "'Playfair Display', serif",
} as const;

// ── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  meta?: {
    inferenceTimeMs?: number;
    tokensGenerated?: number;
    gpuAccelerated?: boolean;
    inputCid?: string;
    outputCid?: string;
    inferenceSource?: "cache" | "local" | "cloud";
    neuroSymbolic?: {
      claims: import("@/modules/ring-core/neuro-symbolic").AnnotatedClaim[];
      overallGrade: import("@/modules/ring-core/neuro-symbolic").EpistemicGrade;
      iterations: number;
      converged: boolean;
      curvature: number;
      proofId: string;
    };
  };
}

interface HologramAiChatProps {
  open: boolean;
  onClose: () => void;
  onPhaseChange?: (phase: TriadicPhase | null) => void;
  creatorStage?: CreatorStage;
  replayGuideKey?: number;
  /** Pre-seed the input with a prompt when opening */
  initialPrompt?: string;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function HologramAiChat({ open, onClose, onPhaseChange, creatorStage = 1, replayGuideKey = 0, initialPrompt }: HologramAiChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [loadProgress, setLoadProgress] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [selectedModelIdx, setSelectedModelIdx] = useState<number | null>(null);
  const [selectedCloudModel, setSelectedCloudModel] = useState<string>(CLOUD_MODELS[0].id);
  const [selectedPersona, setSelectedPersona] = useState<AgentPersona>(getDefaultPersona());
  const [activeSkill, setActiveSkill] = useState<AgentSkill | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const acceleratorRef = useRef(getAccelerator());

  const ai = getAiEngine();
  const attention = useAttentionMode();
  const history = useAiChatHistory();
  const journal = useFocusJournal();
  const ctx = useContextProjection();

  // Fire-and-forget: enrich context graph from conversation text
  const enrichContext = useCallback((userText: string, aiText: string) => {
    if (!ctx.authenticated) return;
    const tags = extractTopicTags(`${userText} ${aiText}`, 4);
    for (const { tag, weight } of tags) {
      ctx.addInterest(tag, weight).catch(() => {});
    }
    ctx.addDomain("hologram-intelligence").catch(() => {});
  }, [ctx]);

  // Determine active model name
  const activeModelName = ai.isReady
    ? ai.active!.modelId.split("/").pop()
    : CLOUD_MODELS.find((m) => m.id === selectedCloudModel)?.label ?? "Gemini 3 Flash";

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Focus input & handle initialPrompt
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
    if (open && initialPrompt && initialPrompt.trim()) {
      setInput(initialPrompt);
    }
  }, [open, initialPrompt]);

  // Close model picker on outside click
  useEffect(() => {
    if (!showModelPicker) return;
    const handler = (e: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showModelPicker]);

  // Welcome message
  useEffect(() => {
    if (open && messages.length === 0 && !history.activeConversationId) {
      setMessages([]);
    }
  }, [open]);

  // ── Track active triadic phase for DayProgressRing ──────────────────
  useEffect(() => {
    if (!onPhaseChange) return;
    if (open) {
      // Active skill phase takes priority, then persona phase
      const phase = activeSkill?.phase || selectedPersona.phase;
      onPhaseChange(phase);
    } else {
      onPhaseChange(null);
    }
  }, [open, selectedPersona, activeSkill, onPhaseChange]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  // ── Conversation management ──────────────────────────────────────────

  const resumeConversation = useCallback(async (conv: Conversation) => {
    const persisted = await history.loadMessages(conv.id);
    history.setActiveConversationId(conv.id);
    setShowHistory(false);

    const loaded: ChatMessage[] = persisted.map((m) => ({
      id: m.id,
      role: m.role as ChatMessage["role"],
      content: m.content,
      timestamp: new Date(m.created_at),
      meta: m.meta as ChatMessage["meta"],
    }));

    setMessages(loaded);
  }, [history]);

  const startNewConversation = useCallback(() => {
    history.setActiveConversationId(null);
    setShowHistory(false);
    setMessages([]);
  }, [history]);

  // ── Cloud model selection (instant, no download) ──────────────────────
  const selectCloudModel = useCallback((modelId: string) => {
    setSelectedCloudModel(modelId);
    setShowModelPicker(false);
    const label = CLOUD_MODELS.find((m) => m.id === modelId)?.label ?? modelId;
    setMessages((prev) => [
      ...prev,
      {
        id: `model-${Date.now()}`,
        role: "system",
        content: `${label} selected · Cloud AI ready`,
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Keep legacy local model loading for advanced use (not shown in default UI)
  const loadLocalModel = useCallback(async (index: number) => {
    const rec = RECOMMENDED_MODELS[index];
    if (!rec) return;
    setSelectedModelIdx(index);
    setShowModelPicker(false);
    setIsLoadingModel(true);
    setLoadProgress(`Downloading ${rec.id.split("/").pop()}…`);
    try {
      await ai.load(rec.id, rec.task, {
        dtype: rec.dtype,
        onProgress: (p) => {
          if (p.progress !== undefined && p.file) {
            setLoadProgress(`${p.file.split("/").pop()}: ${Math.round(p.progress ?? 0)}%`);
          }
        },
      });
      setMessages((prev) => [
        ...prev,
        { id: `loaded-${Date.now()}`, role: "system", content: `${rec.id.split("/").pop()} ready · ${ai.active!.device.toUpperCase()} · ${rec.sizeApprox}`, timestamp: new Date() },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: "system", content: `Local model failed: ${e instanceof Error ? e.message : String(e)}. Using Cloud AI instead.`, timestamp: new Date() },
      ]);
    } finally {
      setIsLoadingModel(false);
      setLoadProgress("");
    }
  }, [ai]);

  // ── Send message ─────────────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isGenerating) return;

    // Determine inference path: model ID for cache keying
    const modelId = ai.isReady
      ? ai.active!.modelId
      : `cloud/${selectedCloudModel}`;

    // If local model is loading, wait
    if (isLoadingModel) {
      setMessages((prev) => [
        ...prev,
        { id: `hint-${Date.now()}`, role: "system", content: "Model is still loading, please wait…", timestamp: new Date() },
      ]);
      return;
    }

    let convId = history.activeConversationId;
    if (history.isAuthenticated && !convId) {
      convId = await history.createConversation(
        text.length > 40 ? text.slice(0, 40) + "…" : text,
        modelId,
      );
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsGenerating(true);

    if (convId) history.saveMessage(convId, "user", text);

    const assistantId = `ai-${Date.now()}`;
    let streamedText = "";

    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", timestamp: new Date() },
    ]);

    // Throttled update — batch rapid token arrivals into smooth word-level updates
    let updateTimer: ReturnType<typeof requestAnimationFrame> | null = null;
    let pendingText = "";
    const updateAssistant = (newText: string) => {
      streamedText = newText;
      pendingText = newText;
      if (!updateTimer) {
        updateTimer = requestAnimationFrame(() => {
          updateTimer = null;
          setMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, content: pendingText } : m),
          );
        });
      }
    };

    try {
      // ── Accelerated Resolution (L0→L3 tiers) ─────────────────
      const acc = acceleratorRef.current;
      const resolved = await acc.resolve(text);

      if (resolved.text && (resolved.source === "l0-memory" || resolved.source === "l0-semantic" || resolved.source === "prefetch" || resolved.source === "l2-proof-store")) {
        // Instant replay — L0 memory (<0.1ms) or prefetched/proof-store
        const start = performance.now();
        const isL0 = resolved.source === "l0-memory" || resolved.source === "l0-semantic";
        await new Promise<void>((resolve) => {
          streamOptimized(
            resolved.text!,
            (chunk) => { streamedText += chunk; updateAssistant(streamedText); },
            resolve,
            { tokensPerSecond: isL0 ? 800 : 600, instant: false },
          );
        });
        const elapsed = Math.round(performance.now() - start);
        const tokCount = resolved.text!.split(/\s+/).length;

        const semanticInfo = resolved.source === "l0-semantic" && resolved.semanticMatch
          ? ` ≈${Math.round((resolved.semanticSimilarity ?? 0) * 100)}% "${resolved.semanticMatch.slice(0, 40)}"`
          : "";

        const meta: ChatMessage["meta"] = {
          inferenceTimeMs: elapsed,
          tokensGenerated: tokCount,
          gpuAccelerated: false,
          inputCid: `acc:${resolved.source}${semanticInfo}`,
          outputCid: `resolution:${resolved.resolutionTimeUs}μs`,
          inferenceSource: "cache" as const,
        };

        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: resolved.text!, meta } : m),
        );
        if (convId) history.saveMessage(convId, "assistant", resolved.text!, meta as Record<string, unknown>);
        journal.log({ message: resolved.text!.slice(0, 120), source: "chat", tags: [selectedPersona.phase, activeSkill?.id ?? "general"].filter(Boolean) as string[], phase: selectedPersona.phase, priority: "medium" }, !open);
        enrichContext(text, resolved.text!);
        setIsGenerating(false);
        return;
      }

      // ── Path 1: Full query-level cache (legacy, kept as fallback) ──
      const cacheHit = await checkInferenceCache(text, modelId);

      if (cacheHit) {
        const start = performance.now();
        await new Promise<void>((resolve) => {
          streamOptimized(
            cacheHit.output,
            (chunk) => { streamedText += chunk; updateAssistant(streamedText); },
            resolve,
            { tokensPerSecond: 500 },
          );
        });
        const elapsed = Math.round(performance.now() - start);
        const tokCount = cacheHit.output.split(/\s+/).length;

        // Populate L0 for future instant replay
        acc.cacheResult(text, cacheHit.output, cacheHit.epistemicGrade);

        const meta = {
          inferenceTimeMs: elapsed,
          tokensGenerated: tokCount,
          gpuAccelerated: false,
          inputCid: cacheHit.proofId,
          outputCid: `cache:hit#${cacheHit.hitCount}`,
          inferenceSource: "cache" as const,
        };

        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: cacheHit.output, meta } : m),
        );
        if (convId) history.saveMessage(convId, "assistant", cacheHit.output, meta as Record<string, unknown>);
        journal.log({ message: cacheHit.output.slice(0, 120), source: "chat", tags: [selectedPersona.phase, activeSkill?.id ?? "general"].filter(Boolean) as string[], phase: selectedPersona.phase, priority: "medium" }, !open);
        enrichContext(text, cacheHit.output);
        setIsGenerating(false);
        return;
      }

      // ── Path 2: Local Model (WebGPU/WASM) ────────────────────
      if (ai.isReady) {
        const result = await ai.run(text, {
          maxNewTokens: 256,
          temperature: 0.7,
          onToken: (token: string) => { streamedText += token; updateAssistant(streamedText); },
        });

        const finalContent = result.output || streamedText || "(empty response)";
        const meta = {
          inferenceTimeMs: result.inferenceTimeMs,
          tokensGenerated: result.tokensGenerated,
          gpuAccelerated: result.gpuAccelerated,
          inputCid: result.inputCid,
          outputCid: result.outputCid,
          inferenceSource: "local" as const,
        };

        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: finalContent, meta } : m),
        );
        if (convId) history.saveMessage(convId, "assistant", finalContent, meta as Record<string, unknown>);
        journal.log({ message: finalContent.slice(0, 120), source: "chat", tags: [selectedPersona.phase, activeSkill?.id ?? "general"].filter(Boolean) as string[], phase: selectedPersona.phase, priority: "medium" }, !open);
        enrichContext(text, finalContent);

        // Populate L0 + DB cache (fire-and-forget)
        acc.cacheResult(text, finalContent, "B");
        getInputHash(text, modelId).then((proof) => {
          writeInferenceCache({
            inputHash: proof.hashHex,
            inputCanonical: proof.nquads,
            outputText: finalContent,
            toolName: `local:${result.modelId}`,
            epistemicGrade: "B",
          });
        });

        setIsGenerating(false);
        return;
      }

      // ── Path 3: Cloud + Proof-Gated Inference ────────────
      const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hologram-ai-stream`;
      const skillId = activeSkill?.id || selectedPersona.defaultSkillId;
      const isReasoningSkill = skillId === "reason" || skillId === "research" || skillId === "debug";

      // DEDUCTIVE: Use accelerator's memoized scaffold (L1 cache)
      const scaffold = isReasoningSkill ? resolved.scaffold : null;

      // PGI: Use accelerator's pre-resolved lookup if available, else fresh
      let pgiPlan: Awaited<ReturnType<typeof planPGI>> | null = null;
      if (scaffold) {
        try {
          if (resolved.lookup) {
            // Already resolved by accelerator — skip redundant DB call
            pgiPlan = {
              claims: resolved.claims,
              lookup: resolved.lookup,
              privateFragments: resolved.lookup.misses.map(m => m.constraint.description),
              config: { quantum: 0, cacheNewProofs: true, minCacheGrade: "B" as const },
            };
          } else {
            pgiPlan = await planPGI(scaffold);
          }
        } catch {
          // Graceful degradation — fall through to full LLM
        }
      }

      const doStream = async (extraMessages: Array<{role: string; content: string}> = [], scaffoldPrompt?: string, curvatureMonitor?: StreamingCurvatureMonitor): Promise<string> => {
        const resp = await fetch(STREAM_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [
              ...messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content })),
              { role: "user", content: text },
              ...extraMessages,
            ],
            model: selectedCloudModel,
            personaId: selectedPersona.id,
            skillId,
            knowledgeDistillation: distillKnowledge(skillId),
            scaffold: scaffoldPrompt,
          }),
        });

        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
          throw new Error(errBody.error || `Cloud AI error: ${resp.status}`);
        }
        if (!resp.body) throw new Error("No response stream");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let done = false;
        while (!done) {
          const { done: d, value } = await reader.read();
          if (d) break;
          buf += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, idx);
            buf = buf.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") { done = true; break; }
            try {
              const parsed = JSON.parse(jsonStr);
              const c = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (c) {
                streamedText += c;
                updateAssistant(streamedText);
                // Symbolica Insight 2: real-time curvature monitoring
                if (curvatureMonitor && !curvatureMonitor.onToken(c)) {
                  console.warn(`[HODMA] Early termination: curvature ${(curvatureMonitor.currentCurvature * 100).toFixed(0)}%`);
                  done = true;
                  break;
                }
              }
            } catch { buf = line + "\n" + buf; break; }
          }
        }
        return streamedText;
      };

      const start = performance.now();

      // ── PGI Path: Replay cached claims, only send misses to LLM ──
      let pgiResult: PGIResult | null = null;
      if (pgiPlan && pgiPlan.lookup.hits.length > 0) {
        // Replay cached fragments instantly
        const cachedText = pgiPlan.lookup.hits
          .sort((a, b) => a.index - b.index)
          .map(h => h.cachedOutput)
          .join(" ");

        // Stream cached text at high speed via rAF optimizer
        await new Promise<void>((resolve) => {
          streamOptimized(
            cachedText,
            (chunk) => { streamedText += chunk; updateAssistant(streamedText); },
            resolve,
            { tokensPerSecond: 700 },
          );
        });

        // Now stream only the miss fragments to LLM
        const liveFragments: Array<{ claimIndex: number; text: string; grade: import("@/modules/ring-core/neuro-symbolic").EpistemicGrade }> = [];
        if (pgiPlan.lookup.misses.length > 0) {
          for (let i = 0; i < pgiPlan.privateFragments.length; i++) {
            const miss = pgiPlan.lookup.misses[i];
            const prevText = streamedText;
            // Send decontextualized fragment (privacy-preserving)
            await doStream([{ role: "user", content: pgiPlan.privateFragments[i] }], scaffold?.promptFragment);
            const newText = streamedText.slice(prevText.length).trim();
            if (newText) {
              liveFragments.push({ claimIndex: miss.index, text: newText, grade: "C" });
            }
          }
        }

        // Compose via tensor product
        pgiResult = composeFragments(
          pgiPlan.lookup.hits,
          liveFragments,
          scaffold?.quantum ?? 0,
        );

        // Store new claim-level proofs (fire-and-forget)
        storeClaims(pgiPlan.claims, liveFragments).catch(() => {});
      } else {
        // No PGI hits — fall back to standard D→I→A loop
        await doStream([], scaffold?.promptFragment);
      }

      // ABDUCTIVE: Measure curvature & annotate (if reasoning mode)
      let nsResult: NeuroSymbolicResult | null = null;
      if (scaffold && streamedText.length > 20) {
        let iteration = 0;
        let currentResponse = streamedText;
        while (iteration < DEFAULT_CONFIG.maxIterations) {
          const { report, refinementPrompt, result } = processResponse(scaffold, currentResponse, iteration);
          if (result) { nsResult = result; break; }
          if (refinementPrompt) {
            // Re-prompt LLM with constraint violations — DON'T reset streamedText
            // Instead, append a visual separator and continue streaming
            const separator = "\n\n";
            streamedText += separator;
            updateAssistant(streamedText);
            // Stream the refinement seamlessly on top of existing text
            const prevLen = streamedText.length;
            currentResponse = await doStream([
              { role: "assistant", content: currentResponse },
              { role: "user", content: refinementPrompt },
            ], scaffold.promptFragment);
            // Use only the new part for the next iteration's analysis
            currentResponse = streamedText.slice(prevLen).trim() || currentResponse;
          }
          iteration++;
        }
        // Fallback if loop exhausted
        if (!nsResult) {
          const { result } = processResponse(scaffold, currentResponse, iteration);
          nsResult = result;
        }
      }

      const elapsed = Math.round(performance.now() - start);
      const tokCount = streamedText.split(/\s+/).length;
      const finalContent = streamedText || "(empty response)";

      const meta: ChatMessage["meta"] = {
        inferenceTimeMs: elapsed,
        tokensGenerated: tokCount,
        gpuAccelerated: false,
        inputCid: "",
        outputCid: "",
        inferenceSource: "cloud" as const,
        ...(nsResult && {
          neuroSymbolic: {
            claims: pgiResult ? pgiResult.claims : nsResult.claims,
            overallGrade: nsResult.overallGrade,
            iterations: nsResult.iterations,
            converged: nsResult.converged,
            curvature: nsResult.finalCurvature,
            proofId: pgiResult ? pgiResult.proof.proofId : nsResult.proof.proofId,
          },
        }),
      };

      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: finalContent, meta } : m),
      );
      if (convId) history.saveMessage(convId, "assistant", finalContent, meta as Record<string, unknown>);
      journal.log({ message: finalContent.slice(0, 120), source: "chat", tags: [selectedPersona.phase, activeSkill?.id ?? "general"].filter(Boolean) as string[], phase: selectedPersona.phase, priority: "medium" }, !open);
      enrichContext(text, finalContent);

      // Phase 7: Persist reasoning proof (fire-and-forget)
      if (nsResult) {
        saveReasoningProof(nsResult, convId).catch(() => {});
      }

      // Populate L0 + DB cache for future O(1) replay
      acc.cacheResult(text, finalContent, nsResult?.overallGrade ?? "B");
      getInputHash(text, modelId).then((proof) => {
        if (meta) meta.inputCid = proof.cid;
        writeInferenceCache({
          inputHash: proof.hashHex,
          inputCanonical: proof.nquads,
          outputText: finalContent,
          toolName: `cloud:${selectedCloudModel}`,
          epistemicGrade: nsResult?.overallGrade ?? "B",
        });
      });

    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: "system", content: `Error: ${e instanceof Error ? e.message : String(e)}`, timestamp: new Date() },
      ]);
    } finally {
      setIsGenerating(false);
    }
  }, [input, isGenerating, ai, history, selectedCloudModel, isLoadingModel, selectedPersona, activeSkill, journal, open, enrichContext]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  if (!open) return null;

  // ── History Sidebar ──────────────────────────────────────────────────

  if (showHistory) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div
          className="relative w-full max-w-lg mx-4 flex flex-col overflow-hidden shadow-2xl animate-scale-in"
          style={{
            maxHeight: "min(85vh, 720px)",
            background: P.bgGrad,
            borderRadius: "16px",
            border: `1px solid ${P.border}`,
          }}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${P.borderLight}` }}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHistory(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.08]"
                style={{ color: P.textMuted }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="text-lg font-medium tracking-wide" style={{ fontFamily: P.fontDisplay, color: P.text }}>
                Conversations
              </h3>
            </div>
            <button
              onClick={startNewConversation}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm tracking-wider transition-colors hover:bg-white/[0.06]"
              style={{ color: P.goldMuted, border: `1px solid ${P.border}` }}
            >
              <Plus className="w-4 h-4" /> New
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5" style={{ minHeight: "300px" }}>
            {!history.isAuthenticated ? (
              <EmptyState icon={<MessageSquare className="w-8 h-8" />} text="Sign in to save and resume conversations." />
            ) : history.conversations.length === 0 ? (
              <EmptyState icon={<MessageSquare className="w-8 h-8" />} text="No conversations yet." />
            ) : (
              history.conversations.map((conv) => (
                <div key={conv.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => resumeConversation(conv)}
                    className="flex-1 flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all hover:bg-white/[0.04]"
                    style={{
                      background: conv.id === history.activeConversationId ? P.surfaceHover : "transparent",
                      border: conv.id === history.activeConversationId ? `1px solid ${P.border}` : "1px solid transparent",
                    }}
                  >
                    <MessageSquare className="w-4 h-4 flex-shrink-0" style={{ color: P.goldMuted }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: P.text }}>{conv.title}</p>
                      <p className="text-xs" style={{ color: P.textDim }}>
                        {new Date(conv.updated_at).toLocaleDateString()} · {conv.model_id?.split("/").pop() ?? ""}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => history.deleteConversation(conv.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10"
                    style={{ color: "hsl(0, 40%, 55%)" }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Main Chat View ───────────────────────────────────────────────────

  const hasMessages = messages.filter((m) => m.role !== "system").length > 0;

  const isFocus = attention.preset === "focus";

  return (
    <>
      {/* ── Slide-out panel — docked right, part of the OS ─────────── */}
      <div
        className="fixed top-0 right-0 bottom-0 z-[60] flex flex-col pointer-events-auto"
        style={{
          width: "min(420px, 85vw)",
          background: "transparent",
          borderLeft: "1px solid hsla(38, 15%, 40%, 0.08)",
          animation: "lumen-slide-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
      >
        {/* ── Header — whisper-quiet ────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0" style={{ background: "hsla(25, 10%, 8%, 0.75)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderBottom: "1px solid hsla(38, 15%, 30%, 0.08)" }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "hsla(38, 30%, 40%, 0.12)", border: "1px solid hsla(38, 20%, 50%, 0.08)" }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: P.goldLight }} />
            </div>
            <span
              className="text-[11px] font-medium tracking-[0.2em] uppercase"
              style={{ fontFamily: P.font, color: "hsla(38, 15%, 75%, 0.4)" }}
            >
              Lumen
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            {history.isAuthenticated && (
              <button
                onClick={() => setShowHistory(true)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.06] relative"
                style={{ color: P.textMuted }}
                title="Conversations"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {history.conversations.length > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-[8px] flex items-center justify-center font-medium"
                    style={{ background: P.gold, color: P.bg }}
                  >
                    {history.conversations.length > 9 ? "9+" : history.conversations.length}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={startNewConversation}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.06]"
              style={{ color: P.textMuted }}
              title="New conversation"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.06]"
              style={{ color: P.textMuted }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Skill Bar ──────────────────────────────────────────────── */}
        {hasMessages && (
          <div
            className="flex items-center gap-1.5 px-4 py-1.5 overflow-x-auto no-scrollbar flex-shrink-0"
          >
            <span className="text-[11px] tracking-wider flex-shrink-0 mr-1" style={{ color: P.textDim }}>
              {selectedPersona.name}
            </span>
            {AGENT_SKILLS.filter(s => s.phase === selectedPersona.phase).map((skill) => {
              const isActive = (activeSkill?.id || selectedPersona.defaultSkillId) === skill.id;
              const phaseDef = PHASES[skill.phase];
              return (
                <button
                  key={skill.id}
                  onClick={() => setActiveSkill(isActive && activeSkill ? null : skill)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] flex-shrink-0 transition-all"
                  style={{
                    background: isActive ? `hsla(${phaseDef.hue}, 40%, 40%, 0.2)` : "transparent",
                    border: `1px solid ${isActive ? `hsla(${phaseDef.hue}, 40%, 40%, 0.35)` : "transparent"}`,
                    color: isActive ? phaseDef.color : P.textDim,
                  }}
                  title={skill.description}
                >
                  <span>{skill.icon}</span>
                  {skill.name}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Messages / Welcome ─────────────────────────────────────── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {!hasMessages && !isLoadingModel && (
            <TriadicWelcome
              key={replayGuideKey}
              creatorStage={creatorStage}
              selectedPersona={selectedPersona}
              activeSkill={activeSkill}
              onSelectPersona={setSelectedPersona}
              onSelectSkill={setActiveSkill}
              forceOnboarding={replayGuideKey > 0}
            />
          )}

          {messages.filter((m) => m.role === "system").map((msg) => (
            <div key={msg.id} className="flex justify-center mb-4 animate-[message-fade-in_0.5s_ease-out_both]">
              <p
                className="text-[11px] px-3.5 py-1 rounded-full"
                style={{ color: P.textMuted, background: "hsla(38, 30%, 30%, 0.1)" }}
              >
                {msg.content}
              </p>
            </div>
          ))}

          <div className="space-y-4">
            {messages.filter((m) => m.role !== "system").map((msg, idx, arr) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreaming={isGenerating && msg.role === "assistant" && idx === arr.length - 1}
              />
            ))}
          </div>

          {isGenerating && !messages.some(m => m.role === "assistant" && m.content) && (
            <div className="flex items-center gap-3 px-3 py-4 mt-2 animate-in fade-in duration-500">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1 h-1 rounded-full"
                    style={{
                      background: P.goldMuted,
                      animation: `pulse 1.8s ease-in-out ${i * 0.25}s infinite`,
                    }}
                  />
                ))}
              </div>
              <span className="text-[11px] tracking-wider" style={{ color: P.textDim, fontFamily: P.font }}>
                Thinking…
              </span>
            </div>
          )}

          {isLoadingModel && (
            <div className="flex items-center gap-2 px-3 py-3">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: P.gold }} />
              <span className="text-sm font-mono" style={{ color: P.textDim }}>{loadProgress}</span>
            </div>
          )}
        </div>

        {/* ── Input Bar — bottom-anchored, centered ────────────────── */}
        <div className="flex justify-center px-4 pb-6 pt-2 flex-shrink-0 pointer-events-auto">
          <div className="w-full max-w-2xl">
          <div
            className="rounded-2xl overflow-visible transition-all"
            style={{
              background: "hsla(25, 10%, 8%, 0.85)",
              backdropFilter: "blur(30px) saturate(1.2)",
              WebkitBackdropFilter: "blur(30px) saturate(1.2)",
              border: "1px solid hsla(38, 15%, 30%, 0.2)",
              boxShadow: "0 4px 20px hsla(25, 10%, 5%, 0.4)",
            }}
          >
            {/* Text input area */}
            <div className="px-4 pt-3 pb-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); acceleratorRef.current.prefetcher.onInput(e.target.value); }}
                onKeyDown={handleKeyDown}
                placeholder={ai.isReady ? "Ask anything…" : "Ask anything — cloud AI is always ready…"}
                disabled={isGenerating}
                rows={1}
                className="w-full bg-transparent border-none outline-none resize-none text-[15px] placeholder:opacity-40 leading-relaxed"
                style={{
                  color: P.text,
                  fontFamily: P.font,
                  maxHeight: "120px",
                }}
              />
            </div>

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-3 pb-2.5">
              <div className="flex items-center gap-1">
                {/* Plus / attachment button */}
                <button
                  onClick={() => {
                    if (!ai.isReady && !isLoadingModel) setShowModelPicker((p) => !p);
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.08]"
                  style={{ color: P.textMuted }}
                  title={ai.isReady ? "Attach" : "Load model"}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Model selector dropdown */}
                <div className="relative" ref={modelPickerRef}>
                  <button
                    onClick={() => setShowModelPicker((p) => !p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors hover:bg-white/[0.06]"
                    style={{ color: P.textMuted }}
                  >
                    <Cloud className="w-3.5 h-3.5" style={{ color: ai.isReady ? P.goldMuted : P.goldMuted }} />
                    <span style={{ color: P.text }}>
                      {activeModelName || "Select model"}
                    </span>
                    {ai.isReady && (
                      <span className="text-[10px] tracking-wider" style={{ color: P.textDim }}>
                        {ai.active!.device.toUpperCase()}
                      </span>
                    )}
                    <ChevronDown className="w-3 h-3" style={{ color: P.textDim }} />
                  </button>

                  {/* Dropdown — fixed position to escape overflow:hidden */}
                  {showModelPicker && (
                    <div
                      className="fixed inset-0 z-[200]"
                      onClick={(e) => { e.stopPropagation(); setShowModelPicker(false); }}
                    >
                      <div
                        className="absolute w-72 rounded-xl overflow-hidden shadow-2xl animate-[message-fade-in_0.15s_ease-out_both]"
                        style={{
                          bottom: `${window.innerHeight - (modelPickerRef.current?.getBoundingClientRect().top ?? 0) + 8}px`,
                          right: `${window.innerWidth - (modelPickerRef.current?.getBoundingClientRect().right ?? 0)}px`,
                          background: "hsl(30, 8%, 14%)",
                          border: "1px solid hsla(38, 15%, 30%, 0.4)",
                          boxShadow: "0 -8px 40px hsla(0, 0%, 0%, 0.6), 0 0 0 1px hsla(38, 15%, 20%, 0.2)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-4 py-3" style={{ borderBottom: "1px solid hsla(38, 12%, 25%, 0.3)" }}>
                          <p className="text-[13px] font-medium" style={{ color: P.text }}>
                            Choose a model
                          </p>
                        </div>
                        <div className="py-1.5 max-h-[320px] overflow-y-auto">
                          {CLOUD_MODELS.map((m) => {
                            const isActive = selectedCloudModel === m.id && !ai.isReady;
                            return (
                              <button
                                key={m.id}
                                onClick={() => {
                                  selectCloudModel(m.id);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.06]"
                              >
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ background: isActive ? P.goldBg : "hsla(30, 8%, 22%, 0.8)" }}
                                >
                                  {isActive
                                    ? <Check className="w-4 h-4" style={{ color: P.goldLight }} />
                                    : <Cloud className="w-4 h-4" style={{ color: P.textMuted }} />
                                  }
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[14px] font-medium" style={{ color: isActive ? P.goldLight : P.text }}>
                                    {m.label}
                                  </p>
                                  <p className="text-[12px] mt-0.5" style={{ color: P.textMuted }}>
                                    {m.desc}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Send button */}
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isGenerating}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-20"
                  style={{
                    background: input.trim() ? P.goldBg : "transparent",
                    color: input.trim() ? P.goldLight : P.textDim,
                  }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Subtle status line */}
          <div className="flex items-center justify-between mt-1.5 px-2">
            <p className="text-[11px] tracking-wider" style={{ color: P.textDimmer }}>
              {ai.isReady ? "Private · On-device · Content-addressed" : "Cloud AI · Content-addressed · Cached"}
            </p>
            {history.isAuthenticated && history.activeConversationId && (
              <p className="text-[11px] tracking-wider" style={{ color: P.goldMuted }}>● Saving</p>
            )}
          </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div style={{ color: P.textDim }}>{icon}</div>
      <p className="text-sm text-center" style={{ color: P.textDim }}>{text}</p>
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────────────────────────

function MessageBubble({ message, isStreaming = false }: { message: ChatMessage; isStreaming?: boolean }) {
  const { role, content, meta } = message;
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-[message-fade-in_0.5s_ease-out_both]`}>
      <div className="flex gap-3 max-w-[90%]">
        {/* Avatar for assistant */}
        {!isUser && (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: P.goldBg }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: P.goldLight }} />
          </div>
        )}

        <div className="min-w-0">
          <div
            className="px-4 py-3 rounded-2xl"
            style={
              isUser
                 ? {
                    background: "hsla(38, 40%, 40%, 0.35)",
                    backdropFilter: "blur(24px) saturate(1.2)",
                    WebkitBackdropFilter: "blur(24px) saturate(1.2)",
                    border: `1px solid hsla(38, 40%, 35%, 0.3)`,
                    borderBottomRightRadius: "6px",
                    boxShadow: "0 2px 12px hsla(25, 10%, 5%, 0.3)",
                  }
                : {
                    background: "hsla(25, 10%, 8%, 0.82)",
                    backdropFilter: "blur(24px) saturate(1.2)",
                    WebkitBackdropFilter: "blur(24px) saturate(1.2)",
                    border: "1px solid hsla(38, 15%, 25%, 0.15)",
                    boxShadow: "0 2px 12px hsla(25, 10%, 5%, 0.3)",
                  }
            }
          >
            {isUser ? (
              <p
                className="text-[15px] leading-[1.7] whitespace-pre-wrap"
                style={{ color: P.text, fontFamily: P.font }}
              >
                {content}
              </p>
            ) : meta?.neuroSymbolic && !isStreaming ? (
              <div style={{ fontFamily: P.font }}>
                <AnnotatedResponse
                  claims={meta.neuroSymbolic.claims}
                  overallGrade={meta.neuroSymbolic.overallGrade}
                  iterations={meta.neuroSymbolic.iterations}
                  converged={meta.neuroSymbolic.converged}
                  curvature={meta.neuroSymbolic.curvature}
                />
              </div>
            ) : (
              <div
                className="text-[15px] leading-[1.8] prose prose-sm prose-invert max-w-none"
                style={{
                  color: "hsl(30, 12%, 78%)",
                  fontFamily: P.font,
                  textRendering: "optimizeLegibility",
                  ['--tw-prose-headings' as string]: P.text,
                  ['--tw-prose-bold' as string]: P.text,
                  ['--tw-prose-code' as string]: P.goldLight,
                  ['--tw-prose-links' as string]: P.goldLight,
                  ['--tw-prose-bullets' as string]: P.goldMuted,
                  ['--tw-prose-counters' as string]: P.goldMuted,
                }}
              >
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1
                        className="text-lg font-medium tracking-wide mt-4 mb-2"
                        style={{ fontFamily: P.fontDisplay, color: P.text }}
                      >
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2
                        className="text-base font-medium tracking-wide mt-3 mb-1.5"
                        style={{ fontFamily: P.fontDisplay, color: P.text }}
                      >
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3
                        className="text-sm font-medium tracking-wider uppercase mt-3 mb-1"
                        style={{ color: P.goldMuted, letterSpacing: "0.1em" }}
                      >
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="mb-2.5 last:mb-0" style={{ lineHeight: "1.8" }}>{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong style={{ color: P.text, fontWeight: 600 }}>{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em style={{ color: P.goldLight, fontStyle: "italic" }}>{children}</em>
                    ),
                    ul: ({ children }) => (
                      <ul className="space-y-1.5 my-2.5 pl-1" style={{ listStyle: "none" }}>{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="space-y-1.5 my-2.5 pl-1" style={{ listStyle: "none", counterReset: "item" }}>{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="flex gap-2 items-start text-[15px]" style={{ color: "hsl(30, 12%, 78%)" }}>
                        <span
                          className="flex-shrink-0 mt-[7px]"
                          style={{ color: P.goldMuted, fontSize: "6px" }}
                        >
                          ◆
                        </span>
                        <span>{children}</span>
                      </li>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote
                        className="my-3 pl-4 py-1"
                        style={{
                          borderLeft: `2px solid ${P.goldMuted}`,
                          color: P.textMuted,
                          fontStyle: "italic",
                        }}
                      >
                        {children}
                      </blockquote>
                    ),
                    hr: () => (
                      <hr className="my-4 border-none" style={{ height: "1px", background: P.border }} />
                    ),
                    code: ({ children, className, ...props }) => {
                      const isBlock = className?.includes("language-");
                      return isBlock ? (
                        <pre
                          style={{
                            background: "hsla(30, 8%, 12%, 0.8)",
                            border: `1px solid ${P.borderLight}`,
                            borderRadius: "10px",
                            padding: "14px 18px",
                            overflowX: "auto",
                            fontSize: "13px",
                            lineHeight: "1.6",
                            margin: "12px 0",
                          }}
                        >
                          <code className={className} {...props}>{children}</code>
                        </pre>
                      ) : (
                        <code
                          style={{
                            background: "hsla(38, 30%, 30%, 0.2)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "0.9em",
                            color: P.goldLight,
                          }}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    pre: ({ children }) => <>{children}</>,
                  }}
                >
                  {content}
                </ReactMarkdown>
                {isStreaming && (
                  <span
                    className="inline-block w-[2px] h-[1.1em] align-middle ml-0.5"
                    style={{
                      background: P.gold,
                      animation: "blink-caret 0.8s steps(2) infinite",
                      borderRadius: "1px",
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Inference metadata — clean, minimal */}
          {meta && !isStreaming && (
            <div
              className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 px-1 animate-in fade-in duration-500"
              style={{ animationDelay: "200ms", animationFillMode: "both" }}
            >
              {(meta as any).inferenceSource && (
                <span className="text-[10px] tracking-wider font-medium" style={{
                  color: (meta as any).inferenceSource === "cache" ? P.goldLight
                       : (meta as any).inferenceSource === "cloud" ? "hsl(200, 45%, 60%)"
                       : P.textDim,
                  fontFamily: P.font,
                }}>
                  {(meta as any).inferenceSource === "cache" ? "⚡ Cached"
                   : (meta as any).inferenceSource === "cloud" ? "☁ Cloud"
                   : "⬡ Local"}
                </span>
              )}
              {meta.inferenceTimeMs !== undefined && (
                <span className="text-[10px] tracking-wider" style={{ color: P.textDim, fontFamily: P.font }}>
                  {meta.inferenceTimeMs < 1000
                    ? `${meta.inferenceTimeMs}ms`
                    : `${(meta.inferenceTimeMs / 1000).toFixed(1)}s`}
                </span>
              )}
              {meta.tokensGenerated !== undefined && (
                <span className="text-[10px] tracking-wider" style={{ color: P.textDim, fontFamily: P.font }}>
                  ~{meta.tokensGenerated} tokens
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
