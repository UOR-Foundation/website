/**
 * HologramMessenger — Unified Messaging Hub
 * ══════════════════════════════════════════
 *
 * Superhuman-inspired unified inbox that aggregates all messaging
 * channels (Email, Telegram, WhatsApp, LinkedIn, Discord, Signal)
 * into a single, delightful experience.
 *
 * Philosophy: Zero Inbox as the daily north star.
 * Triadic: Learn · Work · Play as thematic filters.
 *
 * @module hologram-ui/components/HologramMessenger
 */

import { useState, useMemo, useCallback } from "react";
import {
  IconX, IconInbox, IconStar, IconClock, IconCheck,
  IconChevronRight, IconArchive, IconBell, IconBellOff,
  IconSearch, IconFilter, IconSparkles, IconTrophy,
  IconArrowRight, IconCircleCheck, IconMail, IconBrandTelegram,
  IconBrandWhatsapp, IconBrandLinkedin, IconBrandDiscord,
  IconShieldCheck, IconSend, IconPinned, IconFlame,
  IconBookmark, IconCornerUpLeft, IconDotsVertical,
  IconCalendar, IconLink, IconUsers,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Palette ─────────────────────────────────────────────────────────────────

const P = {
  bg: "hsl(25, 8%, 8%)",
  surface: "hsla(25, 8%, 12%, 0.6)",
  surfaceHover: "hsla(25, 8%, 15%, 0.8)",
  surfaceActive: "hsla(38, 15%, 18%, 0.5)",
  border: "hsla(38, 12%, 70%, 0.1)",
  borderHover: "hsla(38, 12%, 70%, 0.18)",
  font: "'DM Sans', system-ui, sans-serif",
  serif: "'Playfair Display', serif",
  text: "hsl(38, 10%, 88%)",
  muted: "hsl(38, 8%, 55%)",
  dim: "hsl(38, 8%, 35%)",
  gold: "hsl(38, 40%, 65%)",
  goldBright: "hsl(38, 55%, 68%)",
  green: "hsl(152, 44%, 50%)",
  blue: "hsl(215, 55%, 60%)",
  purple: "hsl(265, 45%, 62%)",
  red: "hsl(0, 55%, 55%)",
  orange: "hsl(28, 70%, 55%)",
};

// ── Types ───────────────────────────────────────────────────────────────────

type TriadicPhase = "all" | "learn" | "work" | "play";
type MessagePriority = "urgent" | "normal" | "low";
type Platform = "email" | "telegram" | "whatsapp" | "linkedin" | "discord" | "signal";

interface Message {
  id: string;
  from: string;
  avatar?: string;
  subject: string;
  preview: string;
  platform: Platform;
  phase: "learn" | "work" | "play";
  priority: MessagePriority;
  time: string;
  unread: boolean;
  starred: boolean;
  actionable: boolean;
  actionLabel?: string;
  threadCount?: number;
}

// ── Platform config ─────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<Platform, { icon: typeof IconMail; color: string; label: string }> = {
  email:     { icon: IconMail,           color: "hsl(38, 40%, 65%)",   label: "Email" },
  telegram:  { icon: IconBrandTelegram,  color: "hsl(200, 70%, 55%)", label: "Telegram" },
  whatsapp:  { icon: IconBrandWhatsapp,  color: "hsl(142, 60%, 48%)", label: "WhatsApp" },
  linkedin:  { icon: IconBrandLinkedin,  color: "hsl(210, 70%, 52%)", label: "LinkedIn" },
  discord:   { icon: IconBrandDiscord,   color: "hsl(235, 60%, 65%)", label: "Discord" },
  signal:    { icon: IconShieldCheck,    color: "hsl(210, 50%, 60%)", label: "Signal" },
};

// ── Mock messages ───────────────────────────────────────────────────────────

const MOCK_MESSAGES: Message[] = [
  {
    id: "1", from: "Elena Vasquez", subject: "Partnership proposal — Q3 strategy", preview: "Hi, I wanted to follow up on our conversation about the strategic partnership. I've attached the revised terms and would love to schedule a call this week to discuss the next steps...", platform: "email", phase: "work", priority: "urgent", time: "2m ago", unread: true, starred: true, actionable: true, actionLabel: "Reply by EOD", threadCount: 4,
  },
  {
    id: "2", from: "Prof. Chen Wei", subject: "New paper on categorical semantics", preview: "Published our findings on adjoint functors in type theory. Thought you'd find this relevant to your work on UOR canonical forms...", platform: "email", phase: "learn", priority: "normal", time: "18m ago", unread: true, starred: false, actionable: true, actionLabel: "Read & annotate",
  },
  {
    id: "3", from: "Marcus (Signal)", subject: "End-to-end encrypted", preview: "Hey, the draft for the privacy framework is ready. Sent it through Signal for security. Let me know your thoughts on section 3.", platform: "signal", phase: "work", priority: "normal", time: "35m ago", unread: true, starred: false, actionable: true, actionLabel: "Review draft",
  },
  {
    id: "4", from: "Design Guild", subject: "Weekly inspiration thread 🎨", preview: "This week: brutalist web aesthetics meets generative art. Some incredible examples of constraint-driven creativity...", platform: "discord", phase: "play", priority: "low", time: "1h ago", unread: true, starred: false, actionable: false,
  },
  {
    id: "5", from: "Sarah Chen", subject: "Investor update deck", preview: "The deck is looking great. Just need your sign-off on the traction metrics slide and the competitive landscape section before Friday.", platform: "linkedin", phase: "work", priority: "urgent", time: "1h ago", unread: true, starred: true, actionable: true, actionLabel: "Approve by Fri", threadCount: 2,
  },
  {
    id: "6", from: "Yoga with Kai", subject: "Morning session reminder", preview: "Your 7am breathwork session starts in 30 minutes. Today's focus: box breathing for sustained concentration.", platform: "whatsapp", phase: "play", priority: "low", time: "2h ago", unread: false, starred: false, actionable: false,
  },
  {
    id: "7", from: "Alex Mercer", subject: "Re: API integration timeline", preview: "Updated the Gantt chart with the revised milestones. The webhook integration should land by sprint 14 if we keep the current velocity.", platform: "telegram", phase: "work", priority: "normal", time: "3h ago", unread: false, starred: false, actionable: true, actionLabel: "Confirm timeline",
  },
  {
    id: "8", from: "Book Club", subject: "June pick: Gödel, Escher, Bach", preview: "Excited to announce our next read! Discussion starts June 15th. Chapter 1-3 for the first session.", platform: "discord", phase: "learn", priority: "low", time: "4h ago", unread: false, starred: true, actionable: false,
  },
  {
    id: "9", from: "Lena Park", subject: "Surfing this weekend? 🏄", preview: "The forecast looks amazing for Saturday morning. Swells at 4-6ft, offshore winds. Shall we head to the usual spot at 6am?", platform: "whatsapp", phase: "play", priority: "normal", time: "5h ago", unread: false, starred: false, actionable: true, actionLabel: "Confirm plans",
  },
  {
    id: "10", from: "MIT OpenCourseWare", subject: "New lecture: Quantum Information", preview: "Lecture 12 in the Quantum Computing series is now available. Topics: quantum error correction and fault-tolerant computation.", platform: "email", phase: "learn", priority: "low", time: "6h ago", unread: false, starred: false, actionable: false,
  },
];

// ── Component ───────────────────────────────────────────────────────────────

interface HologramMessengerProps {
  onClose: () => void;
}

export default function HologramMessenger({ onClose }: HologramMessengerProps) {
  const [phase, setPhase] = useState<TriadicPhase>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState(MOCK_MESSAGES);

  const filtered = useMemo(() => {
    let list = messages;
    if (phase !== "all") list = list.filter(m => m.phase === phase);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m =>
        m.from.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.preview.toLowerCase().includes(q)
      );
    }
    return list;
  }, [messages, phase, searchQuery]);

  const selected = useMemo(() => filtered.find(m => m.id === selectedId), [filtered, selectedId]);

  const stats = useMemo(() => ({
    total: messages.length,
    unread: messages.filter(m => m.unread).length,
    actionable: messages.filter(m => m.actionable && m.unread).length,
    starred: messages.filter(m => m.starred).length,
  }), [messages]);

  const archiveMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const markRead = useCallback((id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, unread: false } : m));
  }, []);

  const toggleStar = useCallback((id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, starred: !m.starred } : m));
  }, []);

  const isZeroInbox = stats.unread === 0;

  // ── Phase tabs ────────────────────────────────────────────────────────

  const phaseButtons: { key: TriadicPhase; label: string; count: number }[] = [
    { key: "all", label: "All", count: messages.length },
    { key: "learn", label: "Learn", count: messages.filter(m => m.phase === "learn").length },
    { key: "work", label: "Work", count: messages.filter(m => m.phase === "work").length },
    { key: "play", label: "Play", count: messages.filter(m => m.phase === "play").length },
  ];

  return (
    <div
      className="flex flex-col h-full w-full select-none"
      style={{ background: P.bg, fontFamily: P.font, color: P.text }}
    >
      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: `1px solid ${P.border}` }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <IconInbox size={22} style={{ color: P.gold }} strokeWidth={1.5} />
            <h1
              style={{ fontFamily: P.serif, fontSize: "22px", fontWeight: 400, letterSpacing: "-0.01em", color: P.text }}
            >
              Messenger
            </h1>
          </div>

          {/* Unread badge */}
          {stats.unread > 0 && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: "hsla(38, 40%, 65%, 0.12)", border: `1px solid hsla(38, 40%, 65%, 0.15)` }}
            >
              <span style={{ fontSize: "12px", fontWeight: 500, color: P.gold }}>{stats.unread} unread</span>
            </div>
          )}

          {stats.actionable > 0 && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: "hsla(28, 70%, 55%, 0.12)", border: `1px solid hsla(28, 70%, 55%, 0.15)` }}
            >
              <IconFlame size={12} style={{ color: P.orange }} />
              <span style={{ fontSize: "12px", fontWeight: 500, color: P.orange }}>{stats.actionable} actionable</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: P.surface, border: `1px solid ${P.border}` }}
          >
            <IconSearch size={14} style={{ color: P.dim }} />
            <input
              type="text"
              placeholder="Search messages…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm placeholder:text-[hsl(38,8%,40%)]"
              style={{ color: P.text, fontFamily: P.font, width: "160px" }}
            />
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200"
            style={{ color: P.muted }}
          >
            <IconX size={18} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* ── Phase tabs ── */}
      <div
        className="flex items-center gap-1 px-6 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${P.border}` }}
      >
        {phaseButtons.map(({ key, label, count }) => {
          const active = phase === key;
          return (
            <button
              key={key}
              onClick={() => setPhase(key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200"
              style={{
                background: active ? P.surfaceActive : "transparent",
                border: active ? `1px solid ${P.borderHover}` : "1px solid transparent",
                color: active ? P.gold : P.muted,
                fontSize: "13px",
                fontWeight: active ? 500 : 400,
                letterSpacing: "0.02em",
              }}
            >
              {label}
              <span
                className="px-1.5 py-0.5 rounded-md"
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  background: active ? "hsla(38, 40%, 65%, 0.15)" : "hsla(38, 8%, 55%, 0.1)",
                  color: active ? P.gold : P.dim,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}

        {/* Zero Inbox Goal */}
        <div className="ml-auto flex items-center gap-2">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              background: isZeroInbox ? "hsla(152, 44%, 50%, 0.1)" : "hsla(38, 8%, 55%, 0.06)",
              border: `1px solid ${isZeroInbox ? "hsla(152, 44%, 50%, 0.2)" : P.border}`,
            }}
          >
            {isZeroInbox ? (
              <>
                <IconTrophy size={14} style={{ color: P.green }} />
                <span style={{ fontSize: "12px", fontWeight: 500, color: P.green }}>Zero Inbox ✨</span>
              </>
            ) : (
              <>
                <div
                  className="relative w-16 h-1.5 rounded-full overflow-hidden"
                  style={{ background: "hsla(38, 8%, 55%, 0.15)" }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(5, ((stats.total - stats.unread) / Math.max(stats.total, 1)) * 100)}%`,
                      background: `linear-gradient(90deg, ${P.gold}, ${P.goldBright})`,
                    }}
                  />
                </div>
                <span style={{ fontSize: "11px", color: P.muted }}>
                  {stats.total - stats.unread}/{stats.total} clear
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Message list ── */}
        <div
          className="flex flex-col overflow-y-auto"
          style={{
            width: selected ? "420px" : "100%",
            borderRight: selected ? `1px solid ${P.border}` : "none",
            transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* Actionable section */}
          {stats.actionable > 0 && phase === "all" && !searchQuery && (
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center gap-2 px-2 pb-2">
                <IconFlame size={13} style={{ color: P.orange }} />
                <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: P.orange }}>
                  Action Required
                </span>
              </div>
              {messages.filter(m => m.actionable && m.unread).map(m => (
                <MessageRow
                  key={m.id}
                  message={m}
                  selected={selectedId === m.id}
                  onSelect={() => { setSelectedId(m.id); markRead(m.id); }}
                  onArchive={() => archiveMessage(m.id)}
                  onToggleStar={() => toggleStar(m.id)}
                  showAction
                />
              ))}
            </div>
          )}

          {/* All messages */}
          <div className="px-4 py-2 flex-1">
            {(stats.actionable > 0 && phase === "all" && !searchQuery) && (
              <div className="flex items-center gap-2 px-2 pb-2 pt-2">
                <IconInbox size={13} style={{ color: P.muted }} />
                <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: P.muted }}>
                  Everything Else
                </span>
              </div>
            )}
            {filtered
              .filter(m => !(phase === "all" && !searchQuery && m.actionable && m.unread))
              .map(m => (
                <MessageRow
                  key={m.id}
                  message={m}
                  selected={selectedId === m.id}
                  onSelect={() => { setSelectedId(m.id); markRead(m.id); }}
                  onArchive={() => archiveMessage(m.id)}
                  onToggleStar={() => toggleStar(m.id)}
                />
              ))}

            {filtered.length === 0 && (
              <ZeroInboxView />
            )}
          </div>
        </div>

        {/* ── Reading pane ── */}
        <AnimatePresence>
          {selected && (
            <motion.div
              key="reading-pane"
              className="flex-1 flex flex-col min-w-0 overflow-y-auto"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <ReadingPane
                message={selected}
                onArchive={() => archiveMessage(selected.id)}
                onToggleStar={() => toggleStar(selected.id)}
                onClose={() => setSelectedId(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Footer: platform badges ── */}
      <div
        className="flex items-center gap-4 px-6 py-3 shrink-0"
        style={{ borderTop: `1px solid ${P.border}` }}
      >
        <span style={{ fontSize: "11px", color: P.dim, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Connected
        </span>
        {(Object.keys(PLATFORM_CONFIG) as Platform[]).map(p => {
          const cfg = PLATFORM_CONFIG[p];
          const count = messages.filter(m => m.platform === p).length;
          return (
            <div key={p} className="flex items-center gap-1.5 group" title={cfg.label}>
              <cfg.icon size={14} style={{ color: cfg.color, opacity: 0.7 }} />
              {count > 0 && (
                <span style={{ fontSize: "10px", color: P.dim }}>{count}</span>
              )}
            </div>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          <span style={{ fontSize: "11px", color: P.dim, fontStyle: "italic" }}>
            ⌘K to compose · E to archive · S to star
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Message Row ─────────────────────────────────────────────────────────────

function MessageRow({
  message: m,
  selected,
  onSelect,
  onArchive,
  onToggleStar,
  showAction,
}: {
  message: Message;
  selected: boolean;
  onSelect: () => void;
  onArchive: () => void;
  onToggleStar: () => void;
  showAction?: boolean;
}) {
  const cfg = PLATFORM_CONFIG[m.platform];
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group flex items-start gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200"
      style={{
        background: selected ? P.surfaceActive : hovered ? P.surfaceHover : "transparent",
        border: `1px solid ${selected ? P.borderHover : "transparent"}`,
        marginBottom: "2px",
      }}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div
        className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{
          background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}11)`,
          border: `1px solid ${cfg.color}33`,
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 600, color: cfg.color }}>
          {m.from.charAt(0)}
        </span>
        {/* Platform indicator */}
        <div
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: P.bg, border: `1.5px solid ${P.border}` }}
        >
          <cfg.icon size={9} style={{ color: cfg.color }} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="truncate"
            style={{
              fontSize: "13.5px",
              fontWeight: m.unread ? 600 : 400,
              color: m.unread ? P.text : P.muted,
              maxWidth: "180px",
            }}
          >
            {m.from}
          </span>
          {m.priority === "urgent" && (
            <div
              className="px-1.5 py-0.5 rounded"
              style={{ background: "hsla(0, 55%, 55%, 0.12)", border: "1px solid hsla(0, 55%, 55%, 0.15)" }}
            >
              <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.06em", color: P.red, textTransform: "uppercase" }}>
                Urgent
              </span>
            </div>
          )}
          <span className="ml-auto shrink-0" style={{ fontSize: "11px", color: P.dim }}>
            {m.time}
          </span>
        </div>
        <div
          className="truncate mb-1"
          style={{
            fontSize: "13px",
            fontWeight: m.unread ? 500 : 400,
            color: m.unread ? "hsl(38, 10%, 82%)" : P.muted,
          }}
        >
          {m.subject}
          {m.threadCount && (
            <span style={{ fontSize: "11px", color: P.dim, marginLeft: "6px" }}>
              ({m.threadCount})
            </span>
          )}
        </div>
        <div
          className="truncate"
          style={{ fontSize: "12px", color: P.dim, lineHeight: 1.5 }}
        >
          {m.preview}
        </div>

        {/* Action label */}
        {showAction && m.actionLabel && (
          <div
            className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-md"
            style={{
              background: "hsla(38, 40%, 65%, 0.08)",
              border: `1px solid hsla(38, 40%, 65%, 0.12)`,
            }}
          >
            <IconArrowRight size={10} style={{ color: P.gold }} />
            <span style={{ fontSize: "11px", fontWeight: 500, color: P.gold }}>
              {m.actionLabel}
            </span>
          </div>
        )}
      </div>

      {/* Quick actions (visible on hover) */}
      <div
        className="flex items-center gap-0.5 shrink-0 mt-1 transition-opacity duration-200"
        style={{ opacity: hovered ? 1 : 0 }}
      >
        <button
          onClick={e => { e.stopPropagation(); onArchive(); }}
          className="w-6 h-6 rounded flex items-center justify-center transition-colors"
          style={{ color: P.muted }}
          title="Archive (E)"
        >
          <IconArchive size={13} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onToggleStar(); }}
          className="w-6 h-6 rounded flex items-center justify-center transition-colors"
          style={{ color: m.starred ? P.gold : P.muted }}
          title="Star (S)"
        >
          <IconStar size={13} fill={m.starred ? P.gold : "none"} />
        </button>
      </div>

      {/* Unread indicator */}
      {m.unread && !hovered && (
        <div
          className="w-2 h-2 rounded-full shrink-0 mt-2"
          style={{ background: P.gold }}
        />
      )}
    </div>
  );
}

// ── Reading Pane ────────────────────────────────────────────────────────────

function ReadingPane({
  message: m,
  onArchive,
  onToggleStar,
  onClose,
}: {
  message: Message;
  onArchive: () => void;
  onToggleStar: () => void;
  onClose: () => void;
}) {
  const cfg = PLATFORM_CONFIG[m.platform];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${P.border}` }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: P.muted }}
          >
            <IconChevronRight size={16} className="rotate-180" />
          </button>
          <cfg.icon size={14} style={{ color: cfg.color }} />
          <span style={{ fontSize: "11px", color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleStar}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ color: m.starred ? P.gold : P.muted }}
            title="Star"
          >
            <IconStar size={15} fill={m.starred ? P.gold : "none"} />
          </button>
          <button
            onClick={() => {}}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ color: P.muted }}
            title="Snooze"
          >
            <IconClock size={15} />
          </button>
          <button
            onClick={onArchive}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ color: P.muted }}
            title="Archive"
          >
            <IconArchive size={15} />
          </button>
          <button
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ color: P.muted }}
          >
            <IconDotsVertical size={15} />
          </button>
        </div>
      </div>

      {/* Message content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <h2
          style={{
            fontFamily: P.serif,
            fontSize: "24px",
            fontWeight: 400,
            color: P.text,
            lineHeight: 1.35,
            letterSpacing: "-0.01em",
            marginBottom: "16px",
          }}
        >
          {m.subject}
        </h2>

        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}11)`,
              border: `1px solid ${cfg.color}33`,
            }}
          >
            <span style={{ fontSize: "15px", fontWeight: 600, color: cfg.color }}>
              {m.from.charAt(0)}
            </span>
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 500, color: P.text }}>{m.from}</div>
            <div style={{ fontSize: "12px", color: P.dim }}>{m.time} · via {cfg.label}</div>
          </div>

          {m.priority === "urgent" && (
            <div
              className="ml-auto px-2 py-1 rounded-md"
              style={{ background: "hsla(0, 55%, 55%, 0.1)", border: "1px solid hsla(0, 55%, 55%, 0.15)" }}
            >
              <span style={{ fontSize: "10px", fontWeight: 600, color: P.red, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Urgent
              </span>
            </div>
          )}
        </div>

        {/* Action banner */}
        {m.actionLabel && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6"
            style={{
              background: "hsla(38, 40%, 65%, 0.06)",
              border: `1px solid hsla(38, 40%, 65%, 0.12)`,
            }}
          >
            <IconSparkles size={16} style={{ color: P.gold }} />
            <span style={{ fontSize: "13px", color: P.gold, fontWeight: 500 }}>
              {m.actionLabel}
            </span>
            <button
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors duration-200"
              style={{
                background: "hsla(38, 40%, 65%, 0.12)",
                border: `1px solid hsla(38, 40%, 65%, 0.18)`,
                color: P.gold,
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              <IconCheck size={12} />
              Mark done
            </button>
          </div>
        )}

        {/* Message body */}
        <div
          style={{
            fontSize: "14.5px",
            lineHeight: 1.85,
            color: "hsl(38, 10%, 80%)",
            fontWeight: 300,
            letterSpacing: "0.01em",
          }}
        >
          <p style={{ marginBottom: "16px" }}>{m.preview}</p>
          <p style={{ color: P.muted }}>
            This is a preview of the full message content. In the connected version, the complete message thread
            would render here with full formatting, attachments, and inline reply capabilities.
          </p>
        </div>
      </div>

      {/* Reply bar */}
      <div
        className="flex items-center gap-3 px-6 py-4 shrink-0"
        style={{ borderTop: `1px solid ${P.border}` }}
      >
        <div
          className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl cursor-text"
          style={{
            background: P.surface,
            border: `1px solid ${P.border}`,
          }}
        >
          <IconCornerUpLeft size={14} style={{ color: P.dim }} />
          <span style={{ fontSize: "13px", color: P.dim }}>Reply to {m.from}…</span>
        </div>
        <button
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200"
          style={{
            background: "hsla(38, 40%, 65%, 0.12)",
            border: `1px solid hsla(38, 40%, 65%, 0.15)`,
            color: P.gold,
          }}
        >
          <IconSend size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Zero Inbox Achievement View ─────────────────────────────────────────────

function ZeroInboxView() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 px-8">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-6 max-w-md text-center"
      >
        {/* Trophy glow */}
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, hsla(38, 55%, 65%, 0.15) 0%, transparent 70%)",
              transform: "scale(3)",
            }}
          />
          <div
            className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsla(38, 40%, 65%, 0.15), hsla(38, 55%, 68%, 0.08))",
              border: `1px solid hsla(38, 40%, 65%, 0.2)`,
              boxShadow: "0 8px 32px hsla(38, 40%, 65%, 0.1)",
            }}
          >
            <IconTrophy size={36} style={{ color: P.goldBright }} strokeWidth={1.2} />
          </div>
        </div>

        <div>
          <h2
            style={{
              fontFamily: P.serif,
              fontSize: "26px",
              fontWeight: 400,
              color: P.text,
              letterSpacing: "-0.01em",
              marginBottom: "8px",
            }}
          >
            Zero Inbox
          </h2>
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.7,
              color: P.muted,
              fontWeight: 300,
            }}
          >
            Every message handled. Every thread resolved.
            <br />
            You've achieved perfect clarity.
          </p>
        </div>

        <div
          className="flex items-center gap-3 px-5 py-3 rounded-xl"
          style={{
            background: "hsla(152, 44%, 50%, 0.06)",
            border: `1px solid hsla(152, 44%, 50%, 0.12)`,
          }}
        >
          <IconCircleCheck size={16} style={{ color: P.green }} />
          <span style={{ fontSize: "13px", color: P.green, fontWeight: 500 }}>
            All channels clear
          </span>
        </div>

        <p style={{ fontSize: "12px", color: P.dim, fontStyle: "italic", marginTop: "8px" }}>
          "Clarity is the ultimate sophistication."
        </p>
      </motion.div>
    </div>
  );
}
