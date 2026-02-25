/**
 * Hologram AI Chat — In-Browser Model Conversation
 * ══════════════════════════════════════════════════
 *
 * A serene, Aman-styled chat overlay for conversing with locally-running
 * ONNX models via the Hologram AI Engine. Streaming token generation
 * with warm charcoal panels, gold accents, and Playfair Display typography.
 * Conversations persist to the database for authenticated users.
 *
 * @module hologram-ui/components/HologramAiChat
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Loader2, Cpu, Sparkles, MessageSquare, Plus, Trash2, ChevronLeft } from "lucide-react";
import {
  getAiEngine,
  RECOMMENDED_MODELS,
} from "@/modules/uns/core/hologram/ai-engine";
import { useAiChatHistory, type Conversation } from "@/modules/hologram-ui/hooks/useAiChatHistory";

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
}

// ── Component ──────────────────────────────────────────────────────────────

export default function HologramAiChat({ open, onClose }: HologramAiChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [loadProgress, setLoadProgress] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ai = getAiEngine();
  const history = useAiChatHistory();

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  // Welcome message
  useEffect(() => {
    if (open && messages.length === 0 && !history.activeConversationId) {
      setMessages([
        {
          id: "welcome",
          role: "system",
          content: ai.isReady
            ? `Connected to ${ai.active!.modelId.split("/").pop()} · ${ai.active!.device.toUpperCase()} accelerated`
            : "Welcome. Load a model to begin your conversation.",
          timestamp: new Date(),
        },
      ]);
      setIsFirstMessage(true);
    }
  }, [open]);

  /** Load a conversation from history */
  const resumeConversation = useCallback(async (conv: Conversation) => {
    const persisted = await history.loadMessages(conv.id);
    history.setActiveConversationId(conv.id);
    setShowHistory(false);
    setIsFirstMessage(false);

    const loaded: ChatMessage[] = persisted.map((m) => ({
      id: m.id,
      role: m.role as ChatMessage["role"],
      content: m.content,
      timestamp: new Date(m.created_at),
      meta: m.meta as ChatMessage["meta"],
    }));

    setMessages([
      {
        id: "resumed",
        role: "system",
        content: `Resumed: ${conv.title}`,
        timestamp: new Date(),
      },
      ...loaded,
    ]);
  }, [history]);

  /** Start a new conversation */
  const startNewConversation = useCallback(() => {
    history.setActiveConversationId(null);
    setShowHistory(false);
    setIsFirstMessage(true);
    setMessages([
      {
        id: "welcome",
        role: "system",
        content: ai.isReady
          ? `Connected to ${ai.active!.modelId.split("/").pop()} · Ready for a new conversation.`
          : "Welcome. Load a model to begin.",
        timestamp: new Date(),
      },
    ]);
  }, [ai, history]);

  const loadModel = useCallback(async (index: number) => {
    const rec = RECOMMENDED_MODELS[index];
    if (!rec) return;

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
        {
          id: `loaded-${Date.now()}`,
          role: "system",
          content: `✓ ${rec.id.split("/").pop()} loaded · ${ai.active!.device.toUpperCase()} · ${rec.sizeApprox}`,
          timestamp: new Date(),
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "system",
          content: `Failed to load: ${e instanceof Error ? e.message : String(e)}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoadingModel(false);
      setLoadProgress("");
    }
  }, [ai]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isGenerating) return;

    if (!ai.isReady) {
      setMessages((prev) => [
        ...prev,
        {
          id: `hint-${Date.now()}`,
          role: "system",
          content: "Please select a model below to begin.",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    // Auto-create a conversation for authenticated users on first message
    let convId = history.activeConversationId;
    if (history.isAuthenticated && !convId) {
      convId = await history.createConversation(
        text.length > 40 ? text.slice(0, 40) + "…" : text,
        ai.active?.modelId,
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

    // Persist user message
    if (convId) {
      history.saveMessage(convId, "user", text);
    }

    // Create a placeholder assistant message for streaming
    const assistantId = `ai-${Date.now()}`;
    let streamedText = "";

    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      },
    ]);

    try {
      const result = await ai.run(text, {
        maxNewTokens: 256,
        temperature: 0.7,
        onToken: (token: string) => {
          streamedText += token;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: streamedText } : m,
            ),
          );
        },
      });

      const finalContent = result.output || streamedText || "(empty response)";
      const meta = {
        inferenceTimeMs: result.inferenceTimeMs,
        tokensGenerated: result.tokensGenerated,
        gpuAccelerated: result.gpuAccelerated,
        inputCid: result.inputCid,
        outputCid: result.outputCid,
      };

      // Final update with metadata
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: finalContent, meta }
            : m,
        ),
      );

      // Persist assistant message
      if (convId) {
        history.saveMessage(convId, "assistant", finalContent, meta as Record<string, unknown>);
      }

      setIsFirstMessage(false);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "system",
          content: `Error: ${e instanceof Error ? e.message : String(e)}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  }, [input, isGenerating, ai, history]);

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

  // ── History Sidebar ──────────────────────────────────────────────────────
  if (showHistory) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div
          className="relative w-full max-w-lg mx-4 flex flex-col overflow-hidden shadow-2xl animate-scale-in"
          style={{
            maxHeight: "min(85vh, 720px)",
            background: "linear-gradient(180deg, hsl(30, 8%, 18%) 0%, hsl(25, 10%, 14%) 100%)",
            borderRadius: "16px",
            border: "1px solid hsla(38, 40%, 40%, 0.3)",
          }}
        >
          {/* History Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid hsla(38, 30%, 30%, 0.3)" }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHistory(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                style={{ color: "hsl(30, 10%, 60%)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "hsla(0,0%,100%,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3
                className="text-lg font-medium tracking-wide"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "hsl(38, 30%, 85%)",
                }}
              >
                Conversations
              </h3>
            </div>
            <button
              onClick={startNewConversation}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm tracking-wider transition-colors"
              style={{
                color: "hsl(38, 50%, 55%)",
                border: "1px solid hsla(38, 40%, 40%, 0.3)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "hsla(38, 40%, 40%, 0.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5" style={{ minHeight: "300px" }}>
            {!history.isAuthenticated ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <MessageSquare className="w-8 h-8" style={{ color: "hsl(30, 10%, 35%)" }} />
                <p className="text-base text-center" style={{ color: "hsl(30, 10%, 55%)" }}>
                  Sign in to save and resume conversations.
                </p>
              </div>
            ) : history.conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <MessageSquare className="w-8 h-8" style={{ color: "hsl(30, 10%, 35%)" }} />
                <p className="text-base text-center" style={{ color: "hsl(30, 10%, 55%)" }}>
                  No conversations yet. Start chatting to create one.
                </p>
              </div>
            ) : (
              history.conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center gap-2 group"
                >
                  <button
                    onClick={() => resumeConversation(conv)}
                    className="flex-1 flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all"
                    style={{
                      background: conv.id === history.activeConversationId
                        ? "hsla(38, 30%, 30%, 0.25)"
                        : "transparent",
                      border: conv.id === history.activeConversationId
                        ? "1px solid hsla(38, 40%, 40%, 0.3)"
                        : "1px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (conv.id !== history.activeConversationId) {
                        e.currentTarget.style.background = "hsla(30, 8%, 22%, 0.6)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (conv.id !== history.activeConversationId) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <MessageSquare className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(38, 40%, 45%)" }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: "hsl(38, 20%, 80%)" }}>
                        {conv.title}
                      </p>
                      <p className="text-xs" style={{ color: "hsl(30, 10%, 50%)" }}>
                        {new Date(conv.updated_at).toLocaleDateString()} · {conv.model_id?.split("/").pop() ?? ""}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => history.deleteConversation(conv.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "hsl(0, 40%, 55%)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "hsla(0, 40%, 40%, 0.15)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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

  // ── Main Chat View ───────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Chat Panel */}
      <div
        className="relative w-full max-w-lg mx-4 flex flex-col overflow-hidden shadow-2xl animate-scale-in"
        style={{
          maxHeight: "min(85vh, 720px)",
          background: "linear-gradient(180deg, hsl(30, 8%, 18%) 0%, hsl(25, 10%, 14%) 100%)",
          borderRadius: "16px",
          border: "1px solid hsla(38, 40%, 40%, 0.3)",
        }}
      >
        {/* ── Header ───────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid hsla(38, 30%, 30%, 0.3)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "hsla(38, 50%, 50%, 0.15)" }}
            >
              <Sparkles className="w-5 h-5" style={{ color: "hsl(38, 60%, 55%)" }} />
            </div>
            <div>
              <h3
                className="text-lg font-medium tracking-wide"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "hsl(38, 30%, 85%)",
                }}
              >
                Hologram AI
              </h3>
              <p className="text-xs tracking-wider" style={{ color: "hsla(30, 10%, 60%, 0.8)" }}>
                {ai.isReady
                  ? `${ai.active!.modelId.split("/").pop()} · ${ai.active!.device.toUpperCase()}`
                  : "Select a model to begin"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* History button */}
            {history.isAuthenticated && (
              <button
                onClick={() => setShowHistory(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors relative"
                style={{ color: "hsl(30, 10%, 60%)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "hsla(0,0%,100%,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                title="Conversation history"
              >
                <MessageSquare className="w-5 h-5" />
                {history.conversations.length > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-medium"
                    style={{
                      background: "hsl(38, 50%, 45%)",
                      color: "hsl(30, 8%, 14%)",
                    }}
                  >
                    {history.conversations.length > 9 ? "9+" : history.conversations.length}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ color: "hsl(30, 10%, 60%)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "hsla(0,0%,100%,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Messages ─────────────────────────────────────────────── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-5 space-y-5"
          style={{ minHeight: "300px" }}
        >
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isGenerating && (
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: "hsl(38, 50%, 50%)",
                      animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
              <span className="text-sm" style={{ color: "hsl(30, 10%, 55%)" }}>
                Generating…
              </span>
            </div>
          )}

          {isLoadingModel && (
            <div className="flex items-center gap-2 px-3 py-2">
              <Loader2
                className="w-4 h-4 animate-spin"
                style={{ color: "hsl(38, 50%, 50%)" }}
              />
              <span className="text-sm font-mono" style={{ color: "hsl(30, 10%, 55%)" }}>
                {loadProgress}
              </span>
            </div>
          )}
        </div>

        {/* ── Model Picker (shown when no model is loaded) ─────────── */}
        {!ai.isReady && !isLoadingModel && (
          <div
            className="px-5 pb-3"
            style={{ borderTop: "1px solid hsla(38, 30%, 30%, 0.2)" }}
          >
            <p
              className="text-xs tracking-widest uppercase pt-4 pb-3"
              style={{ color: "hsl(30, 10%, 55%)" }}
            >
              Select Model
            </p>
            <div className="grid grid-cols-1 gap-2">
              {RECOMMENDED_MODELS.slice(0, 3).map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => loadModel(i)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-lg text-left transition-all"
                  style={{
                    background: "hsla(30, 8%, 22%, 0.6)",
                    border: "1px solid hsla(38, 30%, 30%, 0.2)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "hsla(38, 30%, 30%, 0.25)";
                    e.currentTarget.style.borderColor = "hsla(38, 40%, 40%, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "hsla(30, 8%, 22%, 0.6)";
                    e.currentTarget.style.borderColor = "hsla(38, 30%, 30%, 0.2)";
                  }}
                >
                  <Cpu className="w-5 h-5 flex-shrink-0" style={{ color: "hsl(38, 50%, 50%)" }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "hsl(38, 20%, 80%)" }}>
                      {m.id.split("/").pop()}
                    </p>
                    <p className="text-xs" style={{ color: "hsl(30, 10%, 55%)" }}>
                      {m.sizeApprox} · {m.description.split("—")[1]?.trim() || m.task}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input Bar ────────────────────────────────────────────── */}
        <div
          className="px-4 py-3"
          style={{ borderTop: "1px solid hsla(38, 30%, 30%, 0.2)" }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-full"
            style={{
              background: "hsla(30, 8%, 22%, 0.8)",
              border: "1px solid hsla(38, 30%, 30%, 0.25)",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={ai.isReady ? "Ask anything…" : "Load a model to chat"}
              disabled={!ai.isReady || isGenerating}
              className="flex-1 bg-transparent border-none outline-none text-base placeholder:opacity-40"
              style={{
                color: "hsl(38, 20%, 85%)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isGenerating || !ai.isReady}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
              style={{
                background: input.trim() && ai.isReady
                  ? "hsla(38, 50%, 50%, 0.25)"
                  : "transparent",
              }}
            >
              <Send
                className="w-5 h-5"
                style={{
                  color: input.trim() && ai.isReady
                    ? "hsl(38, 60%, 60%)"
                    : "hsl(30, 10%, 40%)",
                }}
              />
            </button>
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1">
            {ai.isReady && (
              <p className="text-[11px] tracking-wider" style={{ color: "hsl(30, 10%, 45%)" }}>
                Running locally · {ai.active!.device.toUpperCase()} · Content-addressed
              </p>
            )}
            {!ai.isReady && <span />}
            {history.isAuthenticated && history.activeConversationId && (
              <p className="text-[11px] tracking-wider" style={{ color: "hsl(38, 40%, 50%)" }}>
                ● Saving
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const { role, content, meta } = message;

  if (role === "system") {
    return (
      <div className="flex justify-center">
        <p
          className="text-sm px-5 py-2 rounded-full"
          style={{
            color: "hsl(38, 30%, 60%)",
            background: "hsla(38, 30%, 30%, 0.15)",
          }}
        >
          {content}
        </p>
      </div>
    );
  }

  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[85%] px-5 py-4 rounded-2xl"
        style={
          isUser
            ? {
                background: "hsla(38, 40%, 40%, 0.2)",
                border: "1px solid hsla(38, 40%, 35%, 0.3)",
                borderBottomRightRadius: "6px",
              }
            : {
                background: "hsla(30, 8%, 25%, 0.6)",
                border: "1px solid hsla(30, 10%, 30%, 0.2)",
                borderBottomLeftRadius: "6px",
              }
        }
      >
        <p
          className="text-base leading-relaxed whitespace-pre-wrap"
          style={{
            color: isUser ? "hsl(38, 20%, 85%)" : "hsl(30, 15%, 78%)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {content}
        </p>

        {/* Inference metadata */}
        {meta && (
          <div
            className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 pt-2"
            style={{ borderTop: "1px solid hsla(30, 10%, 30%, 0.2)" }}
          >
            {meta.inferenceTimeMs !== undefined && (
              <span className="text-[11px] font-mono" style={{ color: "hsl(30, 10%, 50%)" }}>
                {meta.inferenceTimeMs}ms
              </span>
            )}
            {meta.tokensGenerated !== undefined && (
              <span className="text-[11px] font-mono" style={{ color: "hsl(30, 10%, 50%)" }}>
                ~{meta.tokensGenerated} tok
              </span>
            )}
            {meta.gpuAccelerated !== undefined && (
              <span className="text-[11px] font-mono" style={{ color: meta.gpuAccelerated ? "hsl(38, 50%, 50%)" : "hsl(30, 10%, 50%)" }}>
                {meta.gpuAccelerated ? "WebGPU ✓" : "WASM"}
              </span>
            )}
            {meta.outputCid && (
              <span className="text-[11px] font-mono" style={{ color: "hsl(30, 10%, 45%)" }}>
                {meta.outputCid.slice(0, 16)}…
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
