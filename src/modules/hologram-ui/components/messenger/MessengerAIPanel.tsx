/**
 * MessengerAIPanel — Lumen Integration for Messages & Calendar
 * ═════════════════════════════════════════════════════════════
 *
 * Private intelligent companion that uses your messaging history + calendar as context.
 * Supports: querying emails, finding patterns, suggesting connections,
 * availability checking, and signal-from-noise separation.
 *
 * Context is private — stored as a graph, never shared.
 *
 * @module hologram-ui/components/messenger/MessengerAIPanel
 */

import { useState, useRef, useEffect } from "react";
import {
  IconSparkles, IconSend, IconBrain, IconLock,
  IconCalendarEvent, IconMail, IconUsers, IconTrendingUp,
  IconArrowRight, IconLoader2,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CalendarEvent } from "./MessengerCalendar";

// ── Types ──

interface Message {
  id: string;
  from: string;
  subject: string;
  preview: string;
  platform: string;
  phase: string;
  time: string;
  starred: boolean;
}

interface AIChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "insight" | "suggestion" | "introduction" | "pattern";
}

interface MessengerAIPanelProps {
  P: Record<string, string>;
  font: string;
  serif: string;
  messages: Message[];
  events: CalendarEvent[];
  onCreateEvent?: (event: Partial<CalendarEvent>) => void;
  onInitiateIntroduction?: (personA: string, personB: string, reason: string) => void;
}

// ── Quick action chips ──

const QUICK_ACTIONS = [
  { icon: IconTrendingUp, label: "Find patterns", prompt: "Analyze my messaging patterns and identify key trends, recurring topics, and areas where I spend the most communication time." },
  { icon: IconUsers, label: "Connection opportunities", prompt: "Look through my contacts and identify people who might benefit from knowing each other. Suggest potential introductions." },
  { icon: IconCalendarEvent, label: "Schedule optimization", prompt: "Based on my messaging history and calendar, suggest optimal times for deep work, meetings, and breaks." },
  { icon: IconMail, label: "Unread summary", prompt: "Summarize my unread and recent messages, highlighting the most important ones that need attention." },
];

// ── AI Context Builder ──

function buildContextSurface(messages: Message[], events: CalendarEvent[]): string {
  const msgSummary = messages.slice(0, 20).map(m =>
    `[${m.platform}] ${m.from}: "${m.subject}" — ${m.preview.slice(0, 80)}… (${m.time}, ${m.phase}${m.starred ? ", ★" : ""})`
  ).join("\n");

  const eventSummary = events.slice(0, 10).map(e =>
    `📅 ${e.title} — ${e.startTime.toLocaleDateString()} ${e.allDay ? "all-day" : `${e.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${e.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}${e.location ? ` @ ${e.location}` : ""}`
  ).join("\n");

  return `═══ HOLOGRAPHIC CONTEXT SURFACE ═══
This is the user's private messaging and calendar data. Use it for ambient intelligence.
Never enumerate or reference raw data unless asked.

MESSAGES (${messages.length} total, showing recent 20):
${msgSummary || "No messages"}

CALENDAR (${events.length} events):
${eventSummary || "No events"}

CONTACT GRAPH:
${[...new Set(messages.map(m => m.from))].join(", ") || "No contacts"}
═══ END CONTEXT SURFACE ═══`;
}

// ── Component ──

export default function MessengerAIPanel({
  P, font, serif, messages, events,
  onCreateEvent, onInitiateIntroduction,
}: MessengerAIPanelProps) {
  const [chat, setChat] = useState<AIChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "I'm Lumen — your private messaging intelligence. I can see your messages and calendar to help you uncover patterns, find connection opportunities, optimize your schedule, and separate signal from noise.\n\nYour context is **encrypted and private**. Ask me anything.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isThinking) return;
    const userMsg: AIChatMessage = { id: Date.now().toString(), role: "user", content: text.trim() };
    setChat(prev => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    // Build context and simulate AI response
    // In production, this calls the Lumen edge function with the context surface
    const context = buildContextSurface(messages, events);

    // Simulate thoughtful response based on query
    setTimeout(() => {
      const response = generateLocalResponse(text, messages, events);
      setChat(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.content,
        type: response.type,
      }]);
      setIsThinking(false);
    }, 1200 + Math.random() * 800);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: P.bg, fontFamily: font }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${P.divider}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${P.accent}15` }}>
            <IconBrain size={15} style={{ color: P.accent }} />
          </div>
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: P.text }}>Lumen</h3>
            <span style={{ fontSize: "10px", color: P.dim }}>Private messaging intelligence</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: `${P.green}12` }}>
          <IconLock size={10} style={{ color: P.green }} />
          <span style={{ fontSize: "9px", color: P.green, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Private</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto shrink-0" style={{ borderBottom: `1px solid ${P.divider}` }}>
        {QUICK_ACTIONS.map(({ icon: Icon, label, prompt }) => (
          <button
            key={label}
            onClick={() => sendMessage(prompt)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 transition-colors"
            style={{ background: P.surface, border: `1px solid ${P.divider}`, fontSize: "11px", fontWeight: 500, color: P.textSecondary }}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <AnimatePresence>
          {chat.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[85%] rounded-xl px-4 py-3"
                style={{
                  background: msg.role === "user" ? P.accent : P.surface,
                  color: msg.role === "user" ? "white" : P.text,
                  border: msg.role === "assistant" ? `1px solid ${P.divider}` : "none",
                }}
              >
                {msg.type && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {msg.type === "insight" && <IconTrendingUp size={11} style={{ color: P.gold }} />}
                    {msg.type === "suggestion" && <IconSparkles size={11} style={{ color: P.accent }} />}
                    {msg.type === "introduction" && <IconUsers size={11} style={{ color: P.green }} />}
                    {msg.type === "pattern" && <IconBrain size={11} style={{ color: P.accent }} />}
                    <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: P.dim }}>
                      {msg.type}
                    </span>
                  </div>
                )}
                <div style={{ fontSize: "13px", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {msg.content}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isThinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-4 py-2"
          >
            <IconLoader2 size={14} className="animate-spin" style={{ color: P.accent }} />
            <span style={{ fontSize: "12px", color: P.dim }}>Analyzing your context…</span>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3" style={{ borderTop: `1px solid ${P.divider}` }}>
        <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: P.surface, border: `1px solid ${P.divider}` }}>
          <IconSparkles size={14} style={{ color: P.accent }} />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Ask about your messages, calendar, contacts…"
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: "13px", color: P.text, fontFamily: font }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isThinking}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: input.trim() ? P.accent : "transparent", color: input.trim() ? "white" : P.dim }}
          >
            <IconSend size={13} />
          </button>
        </div>
        <div className="flex items-center justify-center mt-1.5">
          <span style={{ fontSize: "9px", color: P.dim }}>
            Context: {messages.length} messages · {events.length} events · Private graph
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Local response generator (scaffolding — real AI via edge function later) ──

function generateLocalResponse(query: string, messages: Message[], events: CalendarEvent[]): { content: string; type?: AIChatMessage["type"] } {
  const q = query.toLowerCase();

  if (q.includes("pattern") || q.includes("trend")) {
    const platforms = messages.reduce((acc, m) => {
      acc[m.platform] = (acc[m.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topPlatform = Object.entries(platforms).sort((a, b) => b[1] - a[1])[0];
    const phases = messages.reduce((acc, m) => {
      acc[m.phase] = (acc[m.phase] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return {
      content: `📊 **Messaging Patterns**\n\n• Your most active channel is **${topPlatform?.[0] || "email"}** (${topPlatform?.[1] || 0} messages)\n• Communication split: ${Object.entries(phases).map(([k, v]) => `${k}: ${v}`).join(", ")}\n• ${messages.filter(m => m.starred).length} starred (high-value) conversations\n• Most active contact: **${messages[0]?.from || "N/A"}**\n\n💡 Consider batching ${topPlatform?.[0]} responses to reduce context switching.`,
      type: "pattern",
    };
  }

  if (q.includes("connect") || q.includes("introduction") || q.includes("introduce")) {
    const contacts = [...new Set(messages.map(m => m.from))].slice(0, 6);
    if (contacts.length >= 2) {
      return {
        content: `🤝 **Introduction Opportunities**\n\nBased on shared topics and complementary expertise:\n\n1. **${contacts[0]}** ↔ **${contacts[1]}** — Both active in your work conversations, potential collaboration\n2. **${contacts[2] || contacts[0]}** ↔ **${contacts[3] || contacts[1]}** — Overlapping interests detected\n\nWant me to draft an introduction? Just say "Introduce [Person A] to [Person B]" and I'll prepare the message.`,
        type: "introduction",
      };
    }
    return { content: "I need more messaging history to identify connection opportunities. Keep using the messenger and I'll surface patterns.", type: "suggestion" };
  }

  if (q.includes("schedule") || q.includes("availability") || q.includes("optimal")) {
    return {
      content: `📅 **Schedule Intelligence**\n\n• You have **${events.length}** upcoming events\n• Based on your messaging patterns, your peak response times are morning hours\n• Suggested deep work blocks: early morning before messages arrive\n• ${messages.filter(m => m.platform === "email").length} email threads could benefit from scheduled batch processing\n\n💡 I recommend blocking 2-hour focus windows on days with fewer events.`,
      type: "insight",
    };
  }

  if (q.includes("unread") || q.includes("summary") || q.includes("important")) {
    const unread = messages.filter(m => (m as any).unread);
    const urgent = messages.filter(m => (m as any).priority === "urgent");
    return {
      content: `📬 **Message Summary**\n\n• **${unread.length}** unread messages across all channels\n• **${urgent.length}** marked as urgent\n• ${messages.filter(m => (m as any).actionable).length} require action\n\n**Top priority:**\n${urgent.slice(0, 3).map(m => `• ${m.from}: "${m.subject}"`).join("\n") || "No urgent items — you're on top of things! 🎉"}`,
      type: "insight",
    };
  }

  // Default response
  return {
    content: `I understand you're asking about: "${query.slice(0, 60)}"\n\nI can help with:\n• **Message patterns** — trends in your communication\n• **Introductions** — connecting the right people\n• **Schedule optimization** — finding the best times\n• **Summaries** — what needs your attention\n\nWhat would you like to explore?`,
    type: "suggestion",
  };
}
