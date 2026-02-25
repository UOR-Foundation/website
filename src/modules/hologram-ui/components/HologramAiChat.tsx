/**
 * Hologram AI Chat — Claude-Inspired Conversation Interface
 * ══════════════════════════════════════════════════════════
 *
 * A serene, focused chat overlay for conversing with locally-running
 * ONNX models via the Hologram AI Engine. Inspired by Claude's clean
 * input design: model selector, attachment button, and streaming tokens
 * with warm charcoal panels, gold accents, and Playfair Display typography.
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
import { PHASES } from "@/modules/hologram-ui/sovereign-creator";
import {
  getAiEngine,
  RECOMMENDED_MODELS,
} from "@/modules/uns/core/hologram/ai-engine";

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
  };
}

interface HologramAiChatProps {
  open: boolean;
  onClose: () => void;
  onPhaseChange?: (phase: TriadicPhase | null) => void;
  creatorStage?: CreatorStage;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function HologramAiChat({ open, onClose, onPhaseChange, creatorStage = 1 }: HologramAiChatProps) {
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

  const ai = getAiEngine();
  const history = useAiChatHistory();

  // Determine active model name
  const activeModelName = ai.isReady
    ? ai.active!.modelId.split("/").pop()
    : CLOUD_MODELS.find((m) => m.id === selectedCloudModel)?.label ?? "Gemini 3 Flash";

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Focus input
  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

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

    const updateAssistant = (newText: string) => {
      streamedText = newText;
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: streamedText } : m),
      );
    };

    try {
      // ── Path 1: Cache Hit (O(1), ~200 tok/s) ──────────────────
      const cacheHit = await checkInferenceCache(text, modelId);

      if (cacheHit) {
        const start = performance.now();
        await new Promise<void>((resolve) => {
          replayAsStream(
            cacheHit.output,
            (token) => { streamedText += token; updateAssistant(streamedText); },
            resolve,
            5, // ~200 tok/s
          );
        });
        const elapsed = Math.round(performance.now() - start);
        const tokCount = cacheHit.output.split(/\s+/).length;

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

        // Cache write (fire-and-forget)
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

      // ── Path 3: Cloud Fallback (Lovable AI Gateway) ──────────
      const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hologram-ai-stream`;

      const resp = await fetch(STREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            // Send full conversation history for context
            ...messages
              .filter((m) => m.role !== "system")
              .map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: text },
          ],
          model: selectedCloudModel,
          personaId: selectedPersona.id,
          skillId: activeSkill?.id || selectedPersona.defaultSkillId,
          knowledgeDistillation: distillKnowledge(activeSkill?.id || selectedPersona.defaultSkillId),
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        throw new Error(errBody.error || `Cloud AI error: ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      const start = performance.now();

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) { streamedText += content; updateAssistant(streamedText); }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      const elapsed = Math.round(performance.now() - start);
      const tokCount = streamedText.split(/\s+/).length;
      const finalContent = streamedText || "(empty response)";

      const meta = {
        inferenceTimeMs: elapsed,
        tokensGenerated: tokCount,
        gpuAccelerated: false,
        inputCid: "",
        outputCid: "",
        inferenceSource: "cloud" as const,
      };

      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: finalContent, meta } : m),
      );
      if (convId) history.saveMessage(convId, "assistant", finalContent, meta as Record<string, unknown>);

      // Cache write for future O(1) replay
      getInputHash(text, modelId).then((proof) => {
        meta.inputCid = proof.cid;
        writeInferenceCache({
          inputHash: proof.hashHex,
          inputCanonical: proof.nquads,
          outputText: finalContent,
          toolName: `cloud:${selectedCloudModel}`,
          epistemicGrade: "B",
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
  }, [input, isGenerating, ai, history, selectedCloudModel, isLoadingModel, selectedPersona, activeSkill]);

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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-2xl mx-4 flex flex-col overflow-hidden shadow-2xl animate-scale-in"
        style={{
          maxHeight: "min(88vh, 800px)",
          background: P.bgGrad,
          borderRadius: "20px",
          border: `1px solid ${P.border}`,
        }}
      >
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-3.5" style={{ borderBottom: `1px solid ${P.borderLight}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: P.goldBg }}>
              <Sparkles className="w-4.5 h-4.5" style={{ color: P.goldLight }} />
            </div>
            <div>
              <h3 className="text-base font-medium tracking-wide" style={{ fontFamily: P.fontDisplay, color: P.text }}>
                Hologram Intelligence
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {history.isAuthenticated && (
              <button
                onClick={() => setShowHistory(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.08] relative"
                style={{ color: P.textMuted }}
                title="Conversations"
              >
                <MessageSquare className="w-4.5 h-4.5" />
                {history.conversations.length > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-medium"
                    style={{ background: P.gold, color: P.bg }}
                  >
                    {history.conversations.length > 9 ? "9+" : history.conversations.length}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={startNewConversation}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.08]"
              style={{ color: P.textMuted }}
              title="New conversation"
            >
              <Plus className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.08]"
              style={{ color: P.textMuted }}
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* ── Skill Bar (compact, always visible when in conversation) ── */}
        {hasMessages && (
          <div
            className="flex items-center gap-1.5 px-4 py-1.5 overflow-x-auto no-scrollbar"
            style={{ borderBottom: `1px solid ${P.borderLight}` }}
          >
            <span className="text-[10px] tracking-wider flex-shrink-0 mr-1" style={{ color: P.textDimmer }}>
              {selectedPersona.name}
            </span>
            {getSkillsForPersona(selectedPersona).map((skill) => {
              const isActive = (activeSkill?.id || selectedPersona.defaultSkillId) === skill.id;
              const phaseDef = PHASES[skill.phase];
              return (
                <button
                  key={skill.id}
                  onClick={() => setActiveSkill(isActive && activeSkill ? null : skill)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] flex-shrink-0 transition-all"
                  style={{
                    background: isActive ? `hsla(${phaseDef.hue}, 40%, 40%, 0.2)` : "transparent",
                    border: `1px solid ${isActive ? `hsla(${phaseDef.hue}, 40%, 40%, 0.35)` : "transparent"}`,
                    color: isActive ? phaseDef.color : P.textDimmer,
                  }}
                  title={skill.description}
                >
                  <span>{skill.icon}</span>
                  {skill.name}
                  {getSourceCount(skill.id) > 0 && (
                    <span className="text-[9px] opacity-50">·{getSourceCount(skill.id)}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Messages / Welcome ───────────────────────────────────── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6" style={{ minHeight: "320px" }}>
          {/* Welcome state when no messages */}
          {!hasMessages && !isLoadingModel && (
            <div className="flex flex-col items-center justify-center h-full gap-5 py-12">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: P.goldBg }}
              >
                <Sparkles className="w-7 h-7" style={{ color: P.goldLight }} />
              </div>
              <div className="text-center space-y-2">
                <h2
                  className="text-2xl font-medium tracking-wide"
                  style={{ fontFamily: P.fontDisplay, color: P.text }}
                >
                  How can I help you today?
                </h2>
            <p className="text-sm max-w-sm" style={{ color: P.textMuted }}>
                  {ai.isReady
                    ? `Running ${activeModelName} locally · ${selectedPersona.name}`
                    : `${selectedPersona.name} · ${selectedPersona.subtitle}`
                  }
                </p>
              </div>

              {/* Persona selector — triadic phase grouping */}
              <div className="w-full max-w-md mt-4 space-y-3">
                <p className="text-xs tracking-widest uppercase text-center mb-3" style={{ color: P.textDim }}>
                  Choose a perspective
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {AGENT_PERSONAS.map((persona) => {
                    const isActive = selectedPersona.id === persona.id;
                    const phaseDef = PHASES[persona.phase];
                    const userStage: CreatorStage = creatorStage;
                    const locked = persona.minStage > userStage;
                    return (
                      <button
                        key={persona.id}
                        onClick={() => !locked && setSelectedPersona(persona)}
                        disabled={locked}
                        className={`flex items-start gap-2.5 px-3 py-3 rounded-xl text-left transition-all ${locked ? "opacity-40 cursor-not-allowed" : "hover:scale-[1.01]"}`}
                        style={{
                          background: isActive ? persona.accent : P.surface,
                          border: `1px solid ${isActive ? `hsla(${phaseDef.hue}, 40%, 40%, 0.4)` : P.borderLight}`,
                        }}
                      >
                        <span
                          className="text-base mt-0.5 flex-shrink-0"
                          style={{ color: locked ? P.textDimmer : phaseDef.color }}
                        >
                          {locked ? <Lock className="w-4 h-4" /> : persona.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium" style={{ color: isActive ? P.goldLight : P.text }}>
                              {persona.name}
                            </p>
                            {locked && (
                              <span className="text-[9px]" style={{ color: P.textDimmer }}>Stage {persona.minStage}+</span>
                            )}
                            {isActive && <Check className="w-3 h-3 flex-shrink-0" style={{ color: P.goldLight }} />}
                          </div>
                          <p className="text-[10px] mt-0.5 leading-tight" style={{ color: P.textDim }}>
                            {persona.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-center mt-2" style={{ color: P.textDimmer }}>
                  {selectedPersona.description}
                </p>

                {/* Skill chips for selected persona */}
                <div className="mt-3">
                  <p className="text-[10px] tracking-widest uppercase text-center mb-2" style={{ color: P.textDimmer }}>
                    Available skills
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {getSkillsForPersona(selectedPersona).map((skill) => {
                      const isActive = (activeSkill?.id || selectedPersona.defaultSkillId) === skill.id;
                      const phaseDef = PHASES[skill.phase];
                      return (
                         <button
                          key={skill.id}
                          onClick={() => setActiveSkill(isActive && activeSkill ? null : skill)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition-all hover:scale-[1.03]"
                          style={{
                            background: isActive ? `hsla(${phaseDef.hue}, 40%, 40%, 0.25)` : "hsla(30, 8%, 26%, 0.5)",
                            border: `1px solid ${isActive ? `hsla(${phaseDef.hue}, 40%, 40%, 0.4)` : P.borderLight}`,
                            color: isActive ? phaseDef.color : P.textMuted,
                          }}
                          title={skill.description}
                        >
                          <span className="text-[10px]">{skill.icon}</span>
                          {skill.name}
                          {getSourceCount(skill.id) > 0 && (
                            <span className="text-[9px] opacity-60">·{getSourceCount(skill.id)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Knowledge Sources for active skill */}
                {(() => {
                  const activeId = activeSkill?.id || selectedPersona.defaultSkillId;
                  const knowledge = getKnowledgeForSkill(activeId);
                  if (!knowledge) return null;
                  const skillName = AGENT_SKILLS.find(s => s.id === activeId)?.name || activeId;
                  return (
                    <div className="mt-3">
                      <p className="text-[10px] tracking-widest uppercase text-center mb-2" style={{ color: P.textDimmer }}>
                        {skillName} draws from
                      </p>
                      <div className="flex flex-wrap justify-center gap-1">
                        {knowledge.people.map((p) => (
                          <span
                            key={p.name}
                            className="px-2 py-0.5 rounded-full text-[10px]"
                            style={{ background: "hsla(38, 30%, 30%, 0.15)", color: P.textMuted }}
                            title={p.essence}
                          >
                            {p.name}
                          </span>
                        ))}
                        {knowledge.frameworks.slice(0, 4).map((f) => (
                          <span
                            key={f.name}
                            className="px-2 py-0.5 rounded-full text-[10px]"
                            style={{ background: "hsla(25, 20%, 25%, 0.3)", color: P.textDim }}
                            title={f.essence}
                          >
                            {f.name}
                          </span>
                        ))}
                        {knowledge.frameworks.length > 4 && (
                          <span className="text-[10px] px-1" style={{ color: P.textDimmer }}>
                            +{knowledge.frameworks.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* System messages */}
          {messages.filter((m) => m.role === "system").map((msg) => (
            <div key={msg.id} className="flex justify-center mb-4 animate-[message-fade-in_0.5s_ease-out_both]">
              <p
                className="text-xs px-4 py-1.5 rounded-full"
                style={{ color: P.textMuted, background: "hsla(38, 30%, 30%, 0.12)" }}
              >
                {msg.content}
              </p>
            </div>
          ))}

          {/* User/Assistant messages */}
          <div className="space-y-5">
            {messages.filter((m) => m.role !== "system").map((msg, idx, arr) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreaming={isGenerating && msg.role === "assistant" && idx === arr.length - 1}
              />
            ))}
          </div>

          {isGenerating && (
            <div className="flex items-center gap-2 px-3 py-3 mt-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: P.gold, animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </div>
              <span className="text-xs" style={{ color: P.textDim }}>Generating…</span>
            </div>
          )}

          {isLoadingModel && (
            <div className="flex items-center gap-2 px-3 py-3">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: P.gold }} />
              <span className="text-sm font-mono" style={{ color: P.textDim }}>{loadProgress}</span>
            </div>
          )}
        </div>

        {/* ── Input Bar (Claude-style) ─────────────────────────────── */}
        <div className="px-4 pb-4 pt-2">
          <div
            className="rounded-2xl overflow-hidden transition-all"
            style={{
              background: P.surface,
              border: `1px solid ${P.border}`,
            }}
          >
            {/* Text input area */}
            <div className="px-4 pt-3 pb-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/[0.06]"
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

                  {/* Dropdown */}
                  {showModelPicker && (
                    <div
                      className="absolute bottom-full mb-2 right-0 w-72 rounded-xl overflow-hidden shadow-2xl animate-[message-fade-in_0.2s_ease-out_both]"
                      style={{
                        background: "hsl(30, 8%, 18%)",
                        border: `1px solid ${P.border}`,
                      }}
                    >
                      <div className="px-3 py-2.5" style={{ borderBottom: `1px solid ${P.borderLight}` }}>
                        <p className="text-xs font-medium tracking-wider uppercase" style={{ color: P.textDim }}>
                          Available Models
                        </p>
                      </div>
                      <div className="py-1">
                        {CLOUD_MODELS.map((m) => {
                          const isActive = selectedCloudModel === m.id && !ai.isReady;
                          return (
                            <button
                              key={m.id}
                              onClick={() => {
                                selectCloudModel(m.id);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
                            >
                              <div
                                className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                                style={{ background: isActive ? P.goldBg : "hsla(30, 8%, 26%, 0.6)" }}
                              >
                                {isActive
                                  ? <Check className="w-3.5 h-3.5" style={{ color: P.goldLight }} />
                                  : <Cloud className="w-3.5 h-3.5" style={{ color: P.textDim }} />
                                }
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium" style={{ color: isActive ? P.goldLight : P.text }}>
                                  {m.label}
                                </p>
                                <p className="text-[11px]" style={{ color: P.textDim }}>
                                  {m.desc}
                                </p>
                              </div>
                            </button>
                          );
                        })}
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
                    background: "hsla(38, 40%, 40%, 0.15)",
                    border: `1px solid hsla(38, 40%, 35%, 0.2)`,
                    borderBottomRightRadius: "6px",
                  }
                : {
                    background: "transparent",
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
            ) : (
              <div
                className="text-[15px] leading-[1.7] prose prose-sm prose-invert max-w-none"
                style={{
                  color: "hsl(30, 12%, 78%)",
                  fontFamily: P.font,
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
                    code: ({ children, className, ...props }) => {
                      const isBlock = className?.includes("language-");
                      return isBlock ? (
                        <pre
                          style={{
                            background: "hsla(30, 8%, 12%, 0.8)",
                            border: `1px solid ${P.borderLight}`,
                            borderRadius: "8px",
                            padding: "12px 16px",
                            overflowX: "auto",
                            fontSize: "13px",
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
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Inference metadata */}
          {meta && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 px-1">
              {(meta as any).inferenceSource && (
                <span className="text-[11px] font-mono" style={{
                  color: (meta as any).inferenceSource === "cache" ? P.goldLight
                       : (meta as any).inferenceSource === "cloud" ? "hsl(200, 50%, 60%)"
                       : P.textDim,
                }}>
                  {(meta as any).inferenceSource === "cache" ? "⚡ Cache"
                   : (meta as any).inferenceSource === "cloud" ? "☁ Cloud"
                   : "⬡ Local"}
                </span>
              )}
              {meta.inferenceTimeMs !== undefined && (
                <span className="text-[11px] font-mono" style={{ color: P.textDim }}>
                  {meta.inferenceTimeMs}ms
                </span>
              )}
              {meta.tokensGenerated !== undefined && (
                <span className="text-[11px] font-mono" style={{ color: P.textDim }}>
                  ~{meta.tokensGenerated} tok
                  {meta.inferenceTimeMs ? ` · ${Math.round(meta.tokensGenerated / (meta.inferenceTimeMs / 1000))}/s` : ""}
                </span>
              )}
              {meta.gpuAccelerated && (
                <span className="text-[11px] font-mono" style={{ color: P.gold }}>
                  WebGPU ✓
                </span>
              )}
              {meta.outputCid && (
                <span className="text-[11px] font-mono" style={{ color: P.textDimmer }}>
                  {meta.outputCid.slice(0, 16)}…
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
