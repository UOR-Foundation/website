/**
 * OracleOverlay — A floating Oracle quick-ask panel that slides up
 * from the bottom of the reader view, enabling seamless Q&A
 * without leaving the rendered experience.
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X, ArrowRight, Maximize2, WifiOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { streamOracle, type Msg } from "@/modules/oracle/lib/stream-oracle";
import { useConnectivity } from "@/modules/desktop/hooks/useConnectivity";

interface Props {
  /** Context about the current rendered content for grounding */
  contextLabel?: string;
  contextContent?: string;
  /** Whether overlay is open */
  open: boolean;
  onClose: () => void;
  /** Switch to full Oracle mode with current messages */
  onExpandToOracle: (messages: Msg[]) => void;
  /** Render an Oracle response as a full knowledge page */
  onRenderAsPage: (query: string, content: string) => void;
  immersive?: boolean;
}

export default function OracleOverlay({
  contextLabel,
  contextContent,
  open,
  onClose,
  onExpandToOracle,
  onRenderAsPage,
  immersive,
}: Props) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const conn = useConnectivity();
  const oracleAvailable = conn.features.oracle.available;

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    // Build context-aware system prompt
    const contextMsg: Msg[] = contextLabel
      ? [{
          role: "user" as const,
          content: `I'm currently reading about "${contextLabel}". ${contextContent ? `Here's a brief excerpt:\n\n${contextContent.slice(0, 800)}` : ""}\n\nMy question: ${trimmed}`,
        }]
      : [{ role: "user" as const, content: trimmed }];

    const allMessages = [...messages, ...contextMsg];
    const userMsg: Msg = { role: "user", content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    let assistantSoFar = "";

    await streamOracle({
      messages: allMessages,
      onDelta: (chunk) => {
        assistantSoFar += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      },
      onDone: () => setStreaming(false),
      onError: () => setStreaming(false),
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "100%", opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 32, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[75] flex flex-col"
          style={{ maxHeight: "70dvh" }}
        >
          {/* Backdrop blur fade */}
          <div className="absolute inset-x-0 -top-16 h-16 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />

          <div className={`relative rounded-t-2xl border-t border-x border-border/20 shadow-[0_-8px_60px_-12px_hsl(0_0%_0%/0.5)] overflow-hidden flex flex-col ${
            immersive ? "bg-[hsl(0_0%_6%/0.95)]" : "bg-background/95"
          } backdrop-blur-2xl`}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary/80" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground/80">Oracle</span>
                  {contextLabel && (
                    <span className="ml-2 text-xs text-muted-foreground/40">
                      · {contextLabel}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {messages.length > 0 && (
                  <button
                    onClick={() => onExpandToOracle(messages)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground/50 hover:text-foreground/70 hover:bg-muted/10 transition-all"
                    title="Expand to full Oracle"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Expand</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-foreground/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-0" style={{ maxHeight: "calc(70dvh - 120px)" }}>
              {!oracleAvailable && messages.length === 0 && (
                <div className="text-center py-6 flex flex-col items-center gap-2">
                  <WifiOff className="w-5 h-5 text-muted-foreground/25" />
                  <p className="text-sm text-muted-foreground/40 leading-relaxed max-w-[260px]">
                    You're offline. The Oracle needs an internet connection. Your knowledge graph and local data are still fully available.
                  </p>
                </div>
              )}
              {oracleAvailable && messages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground/35">
                    Ask anything about {contextLabel ? `"${contextLabel}"` : "this content"}…
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[90%] ${
                    msg.role === "user"
                      ? "bg-primary/15 rounded-2xl rounded-br-md px-4 py-3"
                      : "prose prose-sm prose-invert max-w-none"
                  }`}>
                    {msg.role === "user" ? (
                      <p className="text-sm text-foreground/90 leading-relaxed">{msg.content}</p>
                    ) : (
                      <div className="text-sm text-foreground/75 leading-[1.7] [&>p]:mb-3">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {/* Render as page button on assistant messages */}
                  {msg.role === "assistant" && !streaming && (
                    <button
                      onClick={() => {
                        // Find the preceding user message
                        const userQuery = messages.slice(0, i).reverse().find(m => m.role === "user")?.content || contextLabel || "";
                        onRenderAsPage(userQuery, msg.content);
                      }}
                      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-primary/60 hover:text-primary/90 border border-primary/15 hover:border-primary/30 bg-primary/[0.04] hover:bg-primary/[0.08] transition-all"
                    >
                      <ArrowRight className="w-3 h-3" />
                      Render as page
                    </button>
                  )}
                </div>
              ))}
              {streaming && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex items-center gap-1.5 px-2 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse [animation-delay:150ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse [animation-delay:300ms]" />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-4 pb-[env(safe-area-inset-bottom,12px)] pt-2">
              <div className="flex items-center gap-2 bg-muted/10 border border-border/15 rounded-xl px-3 py-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder={contextLabel ? `Ask about ${contextLabel}…` : "Ask the Oracle…"}
                  className="flex-1 bg-transparent py-2.5 text-sm text-foreground placeholder:text-muted-foreground/25 focus:outline-none caret-primary"
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || streaming || !oracleAvailable}
                  className="p-2 rounded-lg text-foreground/60 hover:text-foreground/90 transition-all disabled:opacity-20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
