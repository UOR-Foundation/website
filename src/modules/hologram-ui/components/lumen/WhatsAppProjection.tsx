/**
 * WhatsAppProjection — WhatsApp integration panel for Lumen
 * ══════════════════════════════════════════════════════════
 *
 * Two states:
 *   1. Setup: User enters phone number to connect Lumen to WhatsApp
 *   2. Simulator: Live WhatsApp-style chat showing Lumen onboarding
 *
 * In demo mode, messages go through the simulate_reply edge function
 * which uses real Lumen AI but routes through the app instead of Meta API.
 *
 * @module hologram-ui/components/lumen/WhatsAppProjection
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, Phone, Mic, Check, CheckCheck, ArrowLeft } from "lucide-react";
import { PP, GR } from "@/modules/hologram-ui/theme/portal-palette";
import { supabase } from "@/integrations/supabase/client";

// ── Types ─────────────────────────────────────────────────────

interface WhatsAppMessage {
  id: string;
  direction: "inbound" | "outbound";
  content: string;
  message_type: string;
  created_at: string;
  meta?: any;
}

type ViewState = "setup" | "chat";

// ── Component ─────────────────────────────────────────────────

export default function WhatsAppProjection() {
  const [view, setView] = useState<ViewState>("setup");
  const [phone, setPhone] = useState("");
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check for existing connection on mount
  useEffect(() => {
    checkExistingConnection();
  }, []);

  async function checkExistingConnection() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setInitializing(false); return; }

      const { data } = await supabase
        .from("whatsapp_connections")
        .select("*")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (data) {
        setConnectionId(data.id);
        setPhone(data.phone_number);
        await loadMessages(data.id);
        setView("chat");
      }
    } catch (e) {
      console.error("[WA] Init error:", e);
    } finally {
      setInitializing(false);
    }
  }

  async function loadMessages(connId: string) {
    const { data } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("connection_id", connId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (data) setMessages(data as WhatsAppMessage[]);
  }

  // Subscribe to realtime messages
  useEffect(() => {
    if (!connectionId) return;
    const channel = supabase
      .channel(`wa-messages-${connectionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_messages" },
        (payload) => {
          const raw = payload.new as any;
          if (raw.connection_id === connectionId) {
            const msg: WhatsAppMessage = {
              id: raw.id,
              direction: raw.direction,
              content: raw.content,
              message_type: raw.message_type,
              created_at: raw.created_at,
              meta: raw.meta,
            };
            setMessages(prev => [...prev, msg]);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [connectionId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ── Setup: Connect phone number ─────────────────────────────

  const handleConnect = useCallback(async () => {
    if (!phone.trim() || phone.length < 7) return;
    setLoading(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ action: "initiate_onboarding", phoneNumber: phone.replace(/\D/g, "") }),
        },
      );
      const data = await resp.json();
      if (data.connection_id) {
        setConnectionId(data.connection_id);
        // Add the initial outbound message locally
        setMessages([{
          id: crypto.randomUUID(),
          direction: "outbound",
          content: data.message,
          message_type: "text",
          created_at: new Date().toISOString(),
        }]);
        setView("chat");
      }
    } catch (e) {
      console.error("[WA] Connect error:", e);
    } finally {
      setLoading(false);
    }
  }, [phone]);

  // ── Chat: Send message ──────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!input.trim() || !connectionId || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    // Optimistic: add user message immediately
    const tempId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: tempId,
      direction: "inbound",
      content: text,
      message_type: "text",
      created_at: new Date().toISOString(),
    }]);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ action: "simulate_reply", connectionId, message: text }),
        },
      );
      const data = await resp.json();
      if (data.reply) {
        // The reply should come through realtime, but add it as fallback
        setMessages(prev => {
          if (prev.some(m => m.content === data.reply && m.direction === "outbound")) return prev;
          return [...prev, {
            id: crypto.randomUUID(),
            direction: "outbound",
            content: data.reply,
            message_type: "text",
            created_at: new Date().toISOString(),
          }];
        });
      }
    } catch (e) {
      console.error("[WA] Send error:", e);
    } finally {
      setSending(false);
    }
  }, [input, connectionId, sending]);

  // ── Render ──────────────────────────────────────────────────

  if (initializing) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: `${PP.accent}30`, borderTopColor: PP.accent }}
        />
      </div>
    );
  }

  if (view === "setup") return <SetupView phone={phone} setPhone={setPhone} loading={loading} onConnect={handleConnect} />;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* WhatsApp-style header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{
          background: "hsl(152, 68%, 25%)",
          borderBottom: "1px solid hsl(152, 60%, 20%)",
        }}
      >
        <button onClick={() => { setView("setup"); }} className="p-1">
          <ArrowLeft className="w-5 h-5 text-white/80" />
        </button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "hsl(38, 40%, 65%)" }}
        >
          <span className="text-lg">✧</span>
        </div>
        <div className="flex-1">
          <p className="text-white text-sm font-medium" style={{ fontFamily: PP.font }}>
            Lumen
          </p>
          <p className="text-white/60 text-xs" style={{ fontFamily: PP.font }}>
            {sending ? "typing..." : "online"}
          </p>
        </div>
        <Phone className="w-5 h-5 text-white/60" />
      </div>

      {/* WhatsApp chat wallpaper + messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
        style={{
          background: "hsl(30, 15%, 92%)",
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {/* System message */}
        <div className="flex justify-center mb-3">
          <span
            className="px-3 py-1 rounded-lg text-xs"
            style={{
              background: "hsla(45, 80%, 90%, 0.9)",
              color: "hsl(25, 30%, 35%)",
              fontFamily: PP.font,
              fontSize: "11px",
              boxShadow: "0 1px 2px hsla(0,0%,0%,0.08)",
            }}
          >
            🔒 Messages in demo mode — connect WhatsApp API for live messaging
          </span>
        </div>

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <MessageBubble key={msg.id || i} message={msg} />
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {sending && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div
              className="px-4 py-2.5 rounded-2xl rounded-tl-sm"
              style={{ background: "white", boxShadow: "0 1px 2px hsla(0,0%,0%,0.08)" }}
            >
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ background: "hsl(0,0%,70%)" }}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input bar */}
      <div
        className="flex items-end gap-2 px-2 py-2"
        style={{ background: "hsl(0, 0%, 96%)", borderTop: "1px solid hsl(0,0%,88%)" }}
      >
        <div
          className="flex-1 flex items-end rounded-3xl px-4 py-2"
          style={{ background: "white", minHeight: 42, border: "1px solid hsl(0,0%,88%)" }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Message Lumen..."
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ fontFamily: PP.font, color: "hsl(0,0%,15%)" }}
          />
        </div>
        <button
          onClick={input.trim() ? handleSend : undefined}
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: "hsl(152, 68%, 35%)",
            opacity: input.trim() ? 1 : 0.5,
          }}
        >
          {input.trim() ? (
            <Send className="w-5 h-5 text-white" />
          ) : (
            <Mic className="w-5 h-5 text-white" />
          )}
        </button>
      </div>
    </div>
  );
}

// ── Setup View ────────────────────────────────────────────────

function SetupView({
  phone,
  setPhone,
  loading,
  onConnect,
}: {
  phone: string;
  setPhone: (v: string) => void;
  loading: boolean;
  onConnect: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <div
          className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, hsl(152, 68%, 35%), hsl(152, 55%, 42%))",
            boxShadow: "0 12px 40px hsla(152, 60%, 30%, 0.3)",
          }}
        >
          <MessageCircle className="w-10 h-10 text-white" />
        </div>
        <h2
          className="text-lg font-medium"
          style={{ fontFamily: PP.fontDisplay, color: PP.text }}
        >
          Lumen on WhatsApp
        </h2>
        <p
          className="text-sm leading-relaxed max-w-[280px]"
          style={{ fontFamily: PP.font, color: PP.textSecondary }}
        >
          Connect your number and Lumen will reach out to you directly on WhatsApp.
          A personal companion, right where you already are.
        </p>
      </motion.div>

      {/* Phone input */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="w-full max-w-[300px] space-y-4"
      >
        <div
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
          style={{
            background: PP.canvasSubtle,
            border: `1px solid ${PP.bloomCardBorder}`,
          }}
        >
          <span style={{ fontSize: "20px" }}>📱</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{
              fontFamily: PP.font,
              color: PP.text,
              caretColor: PP.accent,
            }}
            onKeyDown={(e) => { if (e.key === "Enter") onConnect(); }}
          />
        </div>

        <button
          onClick={onConnect}
          disabled={loading || phone.length < 7}
          className="w-full py-3.5 rounded-2xl text-sm font-medium transition-all active:scale-[0.98]"
          style={{
            fontFamily: PP.font,
            background: phone.length >= 7
              ? "linear-gradient(135deg, hsl(152, 68%, 35%), hsl(152, 55%, 42%))"
              : PP.canvasSubtle,
            color: phone.length >= 7 ? "white" : PP.textWhisper,
            boxShadow: phone.length >= 7 ? "0 8px 24px hsla(152, 60%, 30%, 0.25)" : "none",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Connecting..." : "Connect Lumen to WhatsApp"}
        </button>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-2 max-w-[280px]"
      >
        {[
          { icon: "🤝", text: "Onboarding via natural conversation" },
          { icon: "🎙️", text: "Voice notes for hands-free interaction" },
          { icon: "🔗", text: "Network management & introductions" },
          { icon: "🌿", text: "Insights & support, always available" },
        ].map((f, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-2 rounded-xl"
            style={{ background: `${PP.canvasSubtle}80` }}
          >
            <span className="text-base">{f.icon}</span>
            <span
              className="text-xs"
              style={{ fontFamily: PP.font, color: PP.textSecondary }}
            >
              {f.text}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ── Message Bubble ────────────────────────────────────────────

function MessageBubble({ message }: { message: WhatsAppMessage }) {
  const isLumen = message.direction === "outbound";
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isLumen ? "justify-start" : "justify-end"} mb-1`}
    >
      <div
        className={`max-w-[82%] px-3 py-2 ${isLumen ? "rounded-2xl rounded-tl-sm" : "rounded-2xl rounded-tr-sm"}`}
        style={{
          background: isLumen ? "white" : "hsl(152, 58%, 88%)",
          boxShadow: "0 1px 2px hsla(0,0%,0%,0.06)",
        }}
      >
        <p
          className="text-sm leading-relaxed"
          style={{
            fontFamily: PP.font,
            color: "hsl(0, 0%, 12%)",
            wordBreak: "break-word",
          }}
        >
          {message.content}
        </p>
        <div className="flex items-center justify-end gap-1 mt-0.5">
          <span
            className="text-[10px]"
            style={{ color: "hsl(0, 0%, 55%)", fontFamily: PP.font }}
          >
            {time}
          </span>
          {!isLumen && (
            <CheckCheck className="w-3.5 h-3.5" style={{ color: "hsl(200, 80%, 55%)" }} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
