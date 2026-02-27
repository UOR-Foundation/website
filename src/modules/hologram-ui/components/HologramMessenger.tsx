/**
 * HologramMessenger — Unified Messaging Hub
 * ══════════════════════════════════════════
 *
 * Superhuman-inspired unified inbox. Clean single-line rows,
 * contact panel on selection, light + dark mode, zero-inbox goal.
 *
 * Philosophy: Zero Inbox as the daily north star.
 * Triadic: Learn · Work · Play as thematic filters.
 *
 * @module hologram-ui/components/HologramMessenger
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  IconX, IconStar, IconClock, IconCheck,
  IconChevronRight, IconArchive, IconSearch,
  IconSparkles, IconTrophy, IconCircleCheck,
  IconMail, IconBrandTelegram, IconBrandWhatsapp,
  IconBrandLinkedin, IconBrandDiscord, IconShieldCheck,
  IconSend, IconFlame, IconCornerUpLeft,
  IconDotsVertical, IconPencil, IconSettings,
  IconCalendarEvent, IconBrain, IconUsers, IconUserPlus,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

import zeroInboxReward from "@/assets/zero-inbox-reward.jpg";
import MessengerCalendar, { type CalendarEvent } from "./messenger/MessengerCalendar";
import MessengerAIPanel from "./messenger/MessengerAIPanel";
import MessengerIntroductions from "./messenger/MessengerIntroductions";

// ── Palette by mode ─────────────────────────────────────────────────────────

type ThemeMode = "light" | "dark";

function palette(mode: ThemeMode) {
  if (mode === "light") return {
    bg:            "hsl(0, 0%, 100%)",
    surface:       "hsl(0, 0%, 98%)",
    surfaceHover:  "hsl(0, 0%, 96%)",
    surfaceActive: "hsl(220, 20%, 95%)",
    border:        "hsl(0, 0%, 91%)",
    text:          "hsl(0, 0%, 12%)",
    textSecondary: "hsl(0, 0%, 35%)",
    muted:         "hsl(0, 0%, 55%)",
    dim:           "hsl(0, 0%, 72%)",
    accent:        "hsl(220, 80%, 56%)",
    accentSoft:    "hsla(220, 80%, 56%, 0.08)",
    gold:          "hsl(38, 70%, 50%)",
    green:         "hsl(152, 55%, 42%)",
    red:           "hsl(0, 65%, 52%)",
    orange:        "hsl(28, 80%, 52%)",
    rowSelected:   "hsl(220, 25%, 96%)",
    divider:       "hsl(0, 0%, 93%)",
  };
  return {
    bg:            "hsl(228, 14%, 14%)",
    surface:       "hsl(228, 12%, 17%)",
    surfaceHover:  "hsl(228, 12%, 20%)",
    surfaceActive: "hsl(228, 15%, 22%)",
    border:        "hsla(220, 15%, 40%, 0.2)",
    text:          "hsl(220, 10%, 92%)",
    textSecondary: "hsl(220, 8%, 65%)",
    muted:         "hsl(220, 8%, 50%)",
    dim:           "hsl(220, 8%, 38%)",
    accent:        "hsl(220, 80%, 65%)",
    accentSoft:    "hsla(220, 80%, 65%, 0.1)",
    gold:          "hsl(38, 55%, 60%)",
    green:         "hsl(152, 44%, 50%)",
    red:           "hsl(0, 55%, 55%)",
    orange:        "hsl(28, 70%, 55%)",
    rowSelected:   "hsl(228, 15%, 20%)",
    divider:       "hsla(220, 15%, 40%, 0.15)",
  };
}

const FONT = "'DM Sans', system-ui, sans-serif";
const SERIF = "'Playfair Display', serif";

// ── Types ───────────────────────────────────────────────────────────────────

type TriadicPhase = "all" | "learn" | "work" | "play";
type Platform = "email" | "telegram" | "whatsapp" | "linkedin" | "discord" | "signal";
type MessengerView = "inbox" | "calendar" | "ai" | "introductions";

interface Message {
  id: string;
  from: string;
  email?: string;
  location?: string;
  bio?: string;
  subject: string;
  preview: string;
  platform: Platform;
  phase: "learn" | "work" | "play";
  priority: "urgent" | "normal" | "low";
  time: string;
  unread: boolean;
  starred: boolean;
  actionable: boolean;
  actionLabel?: string;
  tag?: { label: string; color: string };
  threadCount?: number;
  socialLinks?: { type: string; handle: string }[];
  recentThreads?: string[];
}

// ── Platform config ─────────────────────────────────────────────────────────

const PLATFORM_CFG: Record<Platform, { icon: typeof IconMail; color: string; label: string }> = {
  email:     { icon: IconMail,           color: "hsl(38, 40%, 55%)",   label: "Mail" },
  telegram:  { icon: IconBrandTelegram,  color: "hsl(200, 70%, 55%)", label: "Telegram" },
  whatsapp:  { icon: IconBrandWhatsapp,  color: "hsl(142, 60%, 48%)", label: "WhatsApp" },
  linkedin:  { icon: IconBrandLinkedin,  color: "hsl(210, 70%, 52%)", label: "LinkedIn" },
  discord:   { icon: IconBrandDiscord,   color: "hsl(235, 60%, 65%)", label: "Discord" },
  signal:    { icon: IconShieldCheck,    color: "hsl(210, 50%, 60%)", label: "Signal" },
};

// ── Mock data ───────────────────────────────────────────────────────────────

const MOCK_MESSAGES: Message[] = [
  {
    id: "1", from: "Elena Vasquez", email: "elena@arcanecapital.com", location: "San Francisco", bio: "Early stage VC focused on infrastructure and developer tools", subject: "Closing our deal", preview: "This is a snippet of text, it'll show a preview of content inside the email to give you a quick look...", platform: "email", phase: "work", priority: "urgent", time: "MAY 14", unread: true, starred: true, actionable: true, actionLabel: "Reply by EOD",
    tag: { label: "partnership", color: "hsl(265, 55%, 60%)" },
    socialLinks: [{ type: "LinkedIn", handle: "elena-vasquez" }, { type: "Twitter", handle: "@elenavc" }],
    recentThreads: ["Diligence list", "Your thoughts on this article that just…", "Re: messaging & bots"],
  },
  {
    id: "2", from: "Jonathan, Brett", subject: "Hologram launch communications – Invitation to edit", preview: "rahul@hologram.com has invited you to collaborate on the launch deck...", platform: "email", phase: "work", priority: "normal", time: "MAY 13", unread: true, starred: false, actionable: false,
  },
  {
    id: "3", from: "Gaurav, Rahul, Conrad", subject: "Superhuman announcement 🏆", preview: "Hello team, this is an announcement email that talks about our company objectives and key results...", platform: "email", phase: "work", priority: "normal", time: "MAY 13", unread: true, starred: false, actionable: false, threadCount: 3,
  },
  {
    id: "4", from: "Prof. Chen Wei", subject: "Updated Invitation: Recruiting Plan Summary", preview: "This event has been changed. More details: The recruiting plan has been updated with new criteria...", platform: "email", phase: "learn", priority: "normal", time: "MAY 13", unread: true, starred: false, actionable: true, actionLabel: "Read & respond",
  },
  {
    id: "5", from: "Marcus Holt", email: "marcus@signal.org", subject: "End-to-end encrypted draft review", preview: "Hey, the draft for the privacy framework is ready. Let me know your thoughts on section 3...", platform: "signal", phase: "work", priority: "normal", time: "MAY 12", unread: false, starred: false, actionable: true, actionLabel: "Review draft",
  },
  {
    id: "6", from: "Conrad Irwin", subject: "Competitors broken down by price", preview: "We did some research on who our competitors are and what they charge. Summary attached...", platform: "email", phase: "work", priority: "normal", time: "MAY 10", unread: false, starred: false, actionable: false,
  },
  {
    id: "7", from: "Design Guild", subject: "Start screen & next steps", preview: "Got it, can you please meet me outside the building? We need to finalize the onboarding flow.", platform: "discord", phase: "play", priority: "low", time: "MAY 10", unread: false, starred: false, actionable: false,
  },
  {
    id: "8", from: "Alex Mercer", subject: "Re: API integration timeline", preview: "Hey – just wanted to catch up about what we discussed. Do you have any questions about the timeline?", platform: "telegram", phase: "work", priority: "normal", time: "MAY 10", unread: false, starred: false, actionable: true, actionLabel: "Confirm timeline",
  },
  {
    id: "9", from: "Bhavesh, Conrad", subject: "Invitation: Hologram Offsite Nov 13, 2028", preview: "Welcome team, we are sending this invitation to confirm attendance at the annual offsite...", platform: "email", phase: "work", priority: "normal", time: "MAY 10", unread: false, starred: false, actionable: false,
  },
  {
    id: "10", from: "Angelo Wong", subject: "Important: Action Needed", preview: "Scope this new project of mine, thanks! I've attached the brief and would love your input by Friday.",
    platform: "linkedin", phase: "work", priority: "urgent", time: "MAY 9", unread: false, starred: false, actionable: true, actionLabel: "Review scope",
    tag: { label: "contract", color: "hsl(28, 70%, 55%)" },
  },
  {
    id: "11", from: "Lena Park", subject: "Surfing this weekend? 🏄", preview: "The forecast looks amazing for Saturday morning. Swells at 4-6ft, offshore winds. Shall we head out?", platform: "whatsapp", phase: "play", priority: "normal", time: "MAY 9", unread: false, starred: true, actionable: false,
  },
  {
    id: "12", from: "MIT OpenCourseWare", subject: "New lecture: Quantum Information", preview: "Lecture 12 in the Quantum Computing series is now available. Topics: quantum error correction...", platform: "email", phase: "learn", priority: "low", time: "MAY 8", unread: false, starred: false, actionable: false,
  },
];

// ── Component ───────────────────────────────────────────────────────────────

interface HologramMessengerProps {
  onClose: () => void;
}

export default function HologramMessenger({ onClose }: HologramMessengerProps) {
  // Read bgMode from localStorage to derive light/dark
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("hologram-bg-mode");
    return saved === "white" ? "light" : "dark";
  });

  // Listen for changes
  useEffect(() => {
    const check = () => {
      const saved = localStorage.getItem("hologram-bg-mode");
      setMode(saved === "white" ? "light" : "dark");
    };
    window.addEventListener("storage", check);
    const interval = setInterval(check, 1000);
    return () => { window.removeEventListener("storage", check); clearInterval(interval); };
  }, []);

  const P = palette(mode);
  const [phase, setPhase] = useState<TriadicPhase>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [activeView, setActiveView] = useState<MessengerView>("inbox");

  // Calendar state
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([
    { id: "ev1", title: "Team standup", startTime: new Date(2026, 1, 27, 9, 0), endTime: new Date(2026, 1, 27, 9, 30), color: "hsl(220, 80%, 56%)", status: "confirmed" },
    { id: "ev2", title: "Hologram launch review", startTime: new Date(2026, 1, 27, 14, 0), endTime: new Date(2026, 1, 27, 15, 30), color: "hsl(265, 55%, 60%)", status: "confirmed", location: "Zoom" },
    { id: "ev3", title: "Deep work block", startTime: new Date(2026, 1, 28, 10, 0), endTime: new Date(2026, 1, 28, 12, 0), color: "hsl(152, 55%, 42%)", status: "confirmed" },
  ]);
  const [suggestedEvent, setSuggestedEvent] = useState<Partial<CalendarEvent> | null>(null);

  // Introduction state
  const [introductions, setIntroductions] = useState<any[]>([]);

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

  const selected = useMemo(() => messages.find(m => m.id === selectedId), [messages, selectedId]);

  const stats = useMemo(() => ({
    total: messages.length,
    unread: messages.filter(m => m.unread).length,
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
  const [replyOpen, setReplyOpen] = useState(false);

  // Create event from message
  const createEventFromMessage = useCallback((msg: Message) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const end = new Date(tomorrow);
    end.setHours(11, 0, 0, 0);
    setSuggestedEvent({
      title: `Re: ${msg.subject}`,
      startTime: tomorrow,
      endTime: end,
      sourceMessageId: msg.id,
      sourcePlatform: msg.platform,
    });
    setActiveView("calendar");
  }, []);

  // Calendar handlers
  const handleCreateEvent = useCallback((event: Omit<CalendarEvent, "id">) => {
    setCalendarEvents(prev => [...prev, { ...event, id: `ev-${Date.now()}` } as CalendarEvent]);
  }, []);

  const handleDeleteEvent = useCallback((id: string) => {
    setCalendarEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  // Introduction handlers
  const handleCreateIntro = useCallback((intro: any) => {
    setIntroductions(prev => [...prev, { ...intro, id: `intro-${Date.now()}`, status: "sent", createdAt: new Date() }]);
  }, []);

  // Contacts derived from messages
  const contacts = useMemo(() =>
    [...new Set(messages.map(m => m.from))].map(name => ({
      name,
      email: messages.find(m => m.from === name)?.email,
      platform: messages.find(m => m.from === name)?.platform,
    })),
    [messages]
  );

  // Keyboard — Superhuman-style
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      // Escape: close reply → close reading pane → close messenger
      if (e.key === "Escape") {
        if (replyOpen) { setReplyOpen(false); return; }
        if (selectedId) { setSelectedId(null); return; }
        onClose();
        return;
      }

      // Arrow keys: navigate list
      if (e.key === "ArrowDown" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        const idx = selectedId ? filtered.findIndex(m => m.id === selectedId) : -1;
        const next = filtered[idx + 1];
        if (next) { setSelectedId(next.id); markRead(next.id); }
        else if (!selectedId && filtered.length > 0) { setSelectedId(filtered[0].id); markRead(filtered[0].id); }
        return;
      }
      if (e.key === "ArrowUp" || e.key === "k" || e.key === "K") {
        e.preventDefault();
        const idx = selectedId ? filtered.findIndex(m => m.id === selectedId) : filtered.length;
        const prev = filtered[idx - 1];
        if (prev) { setSelectedId(prev.id); markRead(prev.id); }
        return;
      }

      if (!selectedId) return;

      // E — archive / done
      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        const idx = filtered.findIndex(m => m.id === selectedId);
        archiveMessage(selectedId);
        // Auto-advance to next message
        const nextAfterArchive = filtered[idx + 1] ?? filtered[idx - 1];
        if (nextAfterArchive && nextAfterArchive.id !== selectedId) setSelectedId(nextAfterArchive.id);
        return;
      }
      // S — star
      if (e.key === "s" || e.key === "S") { e.preventDefault(); toggleStar(selectedId); return; }
      // R — reply
      if (e.key === "r" || e.key === "R") { e.preventDefault(); setReplyOpen(true); return; }
      // Enter — open reading pane (same as select)
      if (e.key === "Enter") { e.preventDefault(); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, filtered, archiveMessage, toggleStar, markRead, onClose, replyOpen]);

  // Phase tab config
  const tabs: { key: TriadicPhase; label: string; count: number }[] = [
    { key: "all", label: "Inbox", count: stats.unread },
    { key: "learn", label: "Learn", count: messages.filter(m => m.phase === "learn").length },
    { key: "work", label: "Work", count: messages.filter(m => m.phase === "work").length },
    { key: "play", label: "Play", count: messages.filter(m => m.phase === "play").length },
  ];

  // View switcher config
  const viewTabs: { key: MessengerView; icon: typeof IconMail; label: string }[] = [
    { key: "inbox", icon: IconMail, label: "Inbox" },
    { key: "calendar", icon: IconCalendarEvent, label: "Calendar" },
    { key: "ai", icon: IconBrain, label: "Lumen" },
    { key: "introductions", icon: IconUsers, label: "Intros" },
  ];

  return (
    <div
      className="flex flex-col h-full w-full select-none"
      style={{ background: P.bg, fontFamily: FONT, color: P.text }}
    >
      {/* ── Header bar ── */}
      <header
        className="flex items-center justify-between px-5 h-[56px] shrink-0"
        style={{ borderBottom: `1px solid ${P.divider}` }}
      >
        <div className="flex items-center gap-6">
          {/* View switcher icons */}
          <nav className="flex items-center gap-0.5">
            {viewTabs.map(({ key, icon: Icon, label }) => {
              const active = activeView === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveView(key)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all duration-150"
                  style={{
                    color: active ? P.accent : P.muted,
                    fontWeight: active ? 600 : 400,
                    fontSize: "13px",
                    background: active ? P.accentSoft : "transparent",
                  }}
                  title={label}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </nav>

          {/* Phase tabs — only in inbox view */}
          {activeView === "inbox" && (
            <>
              <div className="w-px h-5" style={{ background: P.divider }} />
              <nav className="flex items-center gap-1">
                {tabs.map(({ key, label, count }) => {
                  const active = phase === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setPhase(key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-150"
                      style={{
                        color: active ? P.text : P.muted,
                        fontWeight: active ? 600 : 400,
                        fontSize: "14px",
                        background: active ? "transparent" : "transparent",
                      }}
                    >
                      {label}
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 400,
                          color: active ? P.textSecondary : P.dim,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zero inbox indicator */}
          {isZeroInbox && activeView === "inbox" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md mr-2" style={{ background: `${P.green}15` }}>
              <IconTrophy size={15} style={{ color: P.green }} />
              <span style={{ fontSize: "12px", fontWeight: 600, color: P.green }}>Zero Inbox</span>
            </div>
          )}

          {/* Compose */}
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: P.muted }}
            title="Compose"
          >
            <IconPencil size={18} strokeWidth={1.5} />
          </button>

          {/* Search */}
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: P.muted }}
            title="Search"
          >
            <IconSearch size={18} strokeWidth={1.5} />
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => {
              const next = mode === "light" ? "dark" : "light";
              setMode(next);
              localStorage.setItem("hologram-bg-mode", next === "light" ? "white" : "dark");
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: P.muted }}
            title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
          >
            {mode === "light" ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            )}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: P.muted }}
          >
            <IconX size={18} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {activeView === "inbox" && (
          <>
            {/* ── Message list ── */}
            <div
              className="flex-1 flex flex-col min-w-0 overflow-y-auto"
              style={{ borderRight: selected ? `1px solid ${P.divider}` : "none" }}
            >
              {filtered.length === 0 ? (
                <ZeroInboxView P={P} />
              ) : (
                filtered.map((m, i) => (
                  <MessageRow
                    key={m.id}
                    message={m}
                    P={P}
                    selected={selectedId === m.id}
                    isFirst={i === 0}
                    onSelect={() => { setSelectedId(m.id); markRead(m.id); }}
                    onArchive={() => archiveMessage(m.id)}
                    onToggleStar={() => toggleStar(m.id)}
                    onCreateEvent={() => createEventFromMessage(m)}
                  />
                ))
              )}
            </div>

            {/* ── Contact / reading panel ── */}
            <AnimatePresence>
              {selected && (
                <motion.div
                  key="contact-panel"
                  className="shrink-0 flex flex-col overflow-y-auto"
                  style={{ width: "320px", borderLeft: `1px solid ${P.divider}` }}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ContactPanel
                    message={selected}
                    P={P}
                    replyOpen={replyOpen}
                    onCloseReply={() => setReplyOpen(false)}
                    onCreateEvent={() => createEventFromMessage(selected)}
                    onIntroduce={() => setActiveView("introductions")}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {activeView === "calendar" && (
          <div className="flex-1">
            <MessengerCalendar
              P={P}
              font={FONT}
              serif={SERIF}
              events={calendarEvents}
              onCreateEvent={handleCreateEvent}
              onDeleteEvent={handleDeleteEvent}
              suggestedEvent={suggestedEvent}
              onClearSuggestion={() => setSuggestedEvent(null)}
            />
          </div>
        )}

        {activeView === "ai" && (
          <div className="flex-1">
            <MessengerAIPanel
              P={P}
              font={FONT}
              serif={SERIF}
              messages={messages}
              events={calendarEvents}
              onCreateEvent={(e) => {
                setSuggestedEvent(e);
                setActiveView("calendar");
              }}
              onInitiateIntroduction={(a, b, reason) => {
                setActiveView("introductions");
              }}
            />
          </div>
        )}

        {activeView === "introductions" && (
          <div className="flex-1">
            <MessengerIntroductions
              P={P}
              font={FONT}
              serif={SERIF}
              contacts={contacts}
              introductions={introductions}
              onCreateIntro={handleCreateIntro}
            />
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        className="flex items-center justify-between px-5 h-[44px] shrink-0"
        style={{ borderTop: `1px solid ${P.divider}` }}
      >
        <div className="flex items-center gap-4">
          {(Object.keys(PLATFORM_CFG) as Platform[]).map(p => {
            const cfg = PLATFORM_CFG[p];
            return (
              <cfg.icon key={p} size={16} style={{ color: P.dim, opacity: 0.8 }} />
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          {activeView === "inbox" ? (
            [
              { key: "↑↓", label: "navigate" },
              { key: "E", label: "done" },
              { key: "S", label: "star" },
              { key: "R", label: "reply" },
              { key: "C", label: "calendar" },
              { key: "esc", label: "back" },
            ].map(h => (
              <div key={h.key} className="flex items-center gap-1 mr-2">
                <kbd
                  className="inline-flex items-center justify-center rounded px-1.5 h-[22px]"
                  style={{
                    fontSize: "11px",
                    fontFamily: "monospace",
                    fontWeight: 600,
                    color: P.dim,
                    background: P.surfaceHover,
                    border: `1px solid ${P.divider}`,
                    minWidth: "22px",
                  }}
                >
                  {h.key}
                </kbd>
                <span style={{ fontSize: "11px", color: P.dim }}>{h.label}</span>
              </div>
            ))
          ) : (
            <span style={{ fontSize: "11px", color: P.dim }}>
              {activeView === "calendar" && `${calendarEvents.length} events`}
              {activeView === "ai" && "Private context · Encrypted graph"}
              {activeView === "introductions" && `${introductions.length} introductions`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Message Row — Superhuman-style single line ──────────────────────────────

function MessageRow({
  message: m,
  P,
  selected,
  isFirst,
  onSelect,
  onArchive,
  onToggleStar,
  onCreateEvent,
}: {
  message: Message;
  P: ReturnType<typeof palette>;
  selected: boolean;
  isFirst: boolean;
  onSelect: () => void;
  onArchive: () => void;
  onToggleStar: () => void;
  onCreateEvent?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const cfg = PLATFORM_CFG[m.platform];

  return (
    <div
      className="group flex items-center gap-0 cursor-pointer transition-colors duration-100"
      style={{
        background: selected ? P.rowSelected : hovered ? P.surfaceHover : "transparent",
        borderBottom: `1px solid ${P.divider}`,
        minHeight: "50px",
        paddingLeft: "16px",
        paddingRight: "16px",
      }}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Unread dot */}
      <div className="w-4 shrink-0 flex items-center justify-center">
        {m.unread && (
          <div className="w-[8px] h-[8px] rounded-full" style={{ background: P.accent }} />
        )}
      </div>

      {/* Platform icon (subtle) */}
      {m.platform !== "email" && (
        <div className="w-6 shrink-0 flex items-center justify-center mr-1.5">
          <cfg.icon size={15} style={{ color: cfg.color, opacity: 0.7 }} />
        </div>
      )}

      {/* Sender */}
      <div
        className="shrink-0 truncate"
        style={{
          width: "175px",
          fontSize: "15px",
          fontWeight: m.unread ? 600 : 400,
          color: m.unread ? P.text : P.textSecondary,
          paddingRight: "12px",
        }}
      >
        {m.from}
      </div>

      {/* Tag */}
      {m.tag && (
        <span
          className="shrink-0 px-[7px] py-[2px] rounded text-[11px] font-semibold mr-2"
          style={{
            background: `${m.tag.color}20`,
            color: m.tag.color,
            border: `1px solid ${m.tag.color}30`,
          }}
        >
          {m.tag.label}
        </span>
      )}

      {/* Subject + preview */}
      <div className="flex-1 min-w-0 flex items-center gap-2 truncate">
        <span
          className="truncate"
          style={{
            fontSize: "14.5px",
            fontWeight: m.unread ? 600 : 400,
            color: m.unread ? P.text : P.textSecondary,
          }}
        >
          {m.subject}
        </span>
        <span
          className="truncate flex-1"
          style={{
            fontSize: "14px",
            fontWeight: 300,
            color: P.muted,
          }}
        >
          {m.preview}
        </span>
      </div>

      {/* Hover actions OR thread count + date */}
      <div className="shrink-0 flex items-center gap-1 ml-3">
        {hovered ? (
          <div className="flex items-center gap-0.5">
            <button
              onClick={e => { e.stopPropagation(); onArchive(); }}
              className="w-8 h-8 rounded flex items-center justify-center transition-opacity"
              style={{ color: P.muted }}
              title="Done (E)"
            >
              <IconCheck size={17} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); }}
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ color: P.muted }}
              title="Remind me"
            >
              <IconClock size={17} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onToggleStar(); }}
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ color: m.starred ? P.gold : P.muted }}
              title="Star (S)"
            >
              <IconStar size={17} fill={m.starred ? P.gold : "none"} />
            </button>
          </div>
        ) : (
          <>
            {m.threadCount && m.threadCount > 1 && (
              <span
                className="w-6 h-6 rounded flex items-center justify-center mr-1"
                style={{ background: P.accentSoft, fontSize: "11px", fontWeight: 600, color: P.accent }}
              >
                {m.threadCount}
              </span>
            )}
            <span
              style={{
                fontSize: "13px",
                color: P.dim,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
                minWidth: "50px",
                textAlign: "right",
              }}
            >
              {m.time}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Contact Panel — Superhuman-style right sidebar ──────────────────────────

function ContactPanel({ message: m, P, replyOpen, onCloseReply, onCreateEvent, onIntroduce }: { message: Message; P: ReturnType<typeof palette>; replyOpen: boolean; onCloseReply: () => void; onCreateEvent?: () => void; onIntroduce?: () => void }) {
  const cfg = PLATFORM_CFG[m.platform];
  const [replyText, setReplyText] = useState("");

  return (
    <div className="flex flex-col h-full" style={{ background: P.bg }}>
      {/* Contact header */}
      <div className="px-6 pt-6 pb-5" style={{ borderBottom: `1px solid ${P.divider}` }}>
        <h3 style={{ fontSize: "20px", fontWeight: 600, color: P.text, marginBottom: "12px", fontFamily: SERIF }}>
          {m.from.split(",")[0]}
        </h3>
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, ${cfg.color}25, ${cfg.color}10)`,
              border: `1px solid ${cfg.color}30`,
            }}
          >
            <span style={{ fontSize: "18px", fontWeight: 600, color: cfg.color }}>
              {m.from.charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            {m.email && (
              <div style={{ fontSize: "14px", color: P.accent, marginBottom: "2px" }}>{m.email}</div>
            )}
            {m.location && (
              <div style={{ fontSize: "13px", color: P.muted }}>{m.location}</div>
            )}
          </div>
        </div>
        {m.bio && (
          <p style={{ fontSize: "14px", lineHeight: 1.7, color: P.textSecondary, fontWeight: 300 }}>
            {m.bio}
          </p>
        )}
      </div>

      {/* Recent threads */}
      <div className="px-6 py-4" style={{ borderBottom: `1px solid ${P.divider}` }}>
        <div className="flex items-center gap-2 mb-3">
          <cfg.icon size={16} style={{ color: cfg.color }} />
          <span style={{ fontSize: "14px", fontWeight: 500, color: P.text }}>{cfg.label}</span>
        </div>
        {m.recentThreads ? (
          <div className="space-y-1.5">
            {m.recentThreads.map((t, i) => (
              <div key={i} className="truncate cursor-pointer" style={{ fontSize: "13.5px", color: P.muted, paddingLeft: "4px" }}>
                {t}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: "13px", color: P.dim, fontStyle: "italic" }}>No recent threads</div>
        )}
      </div>

      {/* Social links */}
      {m.socialLinks && m.socialLinks.length > 0 && (
        <div className="px-6 py-4" style={{ borderBottom: `1px solid ${P.divider}` }}>
          <div className="flex items-center gap-2 mb-3">
            <span style={{ fontSize: "13px", color: P.dim, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>Social</span>
          </div>
          <div className="space-y-2">
            {m.socialLinks.map((s, i) => {
              const icon = s.type === "Twitter" ? "𝕏" : s.type === "LinkedIn" ? "in" : "•";
              return (
                <div key={i} className="flex items-center gap-2.5">
                  <span style={{ fontSize: "13px", fontWeight: 600, color: P.muted, width: "16px", textAlign: "center" }}>{icon}</span>
                  <span style={{ fontSize: "14px", color: P.textSecondary }}>{s.handle}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Message preview */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        <div className="flex items-center gap-2 mb-3">
          <span style={{ fontSize: "13px", color: P.dim, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>Message</span>
        </div>
        <h4 style={{ fontSize: "15px", fontWeight: 500, color: P.text, marginBottom: "8px", lineHeight: 1.5 }}>
          {m.subject}
        </h4>
        <p style={{ fontSize: "14px", lineHeight: 1.75, color: P.textSecondary, fontWeight: 300 }}>
          {m.preview}
        </p>
        {m.actionLabel && (
          <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-lg" style={{ background: P.accentSoft, border: `1px solid ${P.accent}20` }}>
            <IconSparkles size={15} style={{ color: P.accent }} />
            <span style={{ fontSize: "13px", fontWeight: 500, color: P.accent }}>{m.actionLabel}</span>
          </div>
        )}

        {/* Quick actions: Calendar & Introduce */}
        <div className="flex items-center gap-2 mt-4">
          {onCreateEvent && (
            <button
              onClick={onCreateEvent}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ background: P.surface, border: `1px solid ${P.divider}`, color: P.textSecondary }}
            >
              <IconCalendarEvent size={13} /> Schedule
            </button>
          )}
          {onIntroduce && (
            <button
              onClick={onIntroduce}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ background: P.surface, border: `1px solid ${P.divider}`, color: P.textSecondary }}
            >
              <IconUserPlus size={13} /> Introduce
            </button>
          )}
        </div>
      </div>

      {/* Reply composer */}
      <AnimatePresence>
        {replyOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden shrink-0"
            style={{ borderTop: `1px solid ${P.divider}` }}
          >
            <div className="px-5 py-3">
              <div className="flex items-center gap-2 mb-2">
                <IconCornerUpLeft size={12} style={{ color: P.accent }} />
                <span style={{ fontSize: "11px", color: P.accent, fontWeight: 500 }}>Reply to {m.from.split(",")[0]}</span>
                <button onClick={onCloseReply} className="ml-auto" style={{ color: P.dim }}>
                  <IconX size={12} />
                </button>
              </div>
              <textarea
                autoFocus
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Write your reply…"
                rows={3}
                className="w-full resize-none rounded-lg px-3 py-2 outline-none"
                style={{
                  background: P.surface,
                  border: `1px solid ${P.divider}`,
                  color: P.text,
                  fontSize: "13px",
                  fontFamily: FONT,
                  lineHeight: 1.6,
                }}
                onKeyDown={e => {
                  if (e.key === "Escape") { e.stopPropagation(); onCloseReply(); }
                }}
              />
              <div className="flex items-center justify-between mt-2">
                <span style={{ fontSize: "10px", color: P.dim }}>⌘ Enter to send</span>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors"
                  style={{ background: P.accent, color: "white", fontSize: "12px", fontWeight: 500 }}
                >
                  <IconSend size={12} />
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brand */}
      <div className="px-6 py-3 shrink-0 flex items-center justify-center" style={{ borderTop: `1px solid ${P.divider}` }}>
        <span style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: P.dim, fontWeight: 500 }}>
          Hologram
        </span>
      </div>
    </div>
  );
}

// ── Zero Inbox ──────────────────────────────────────────────────────────────

const QUOTES = [
  { text: "Clarity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Simplicity is the final achievement.", author: "Frédéric Chopin" },
  { text: "The ability to simplify means to eliminate the unnecessary.", author: "Hans Hofmann" },
  { text: "In the midst of movement and chaos, keep stillness inside of you.", author: "Deepak Chopra" },
  { text: "Almost everything will work again if you unplug it for a few minutes — including you.", author: "Anne Lamott" },
];

function ZeroInboxView({ P }: { P: ReturnType<typeof palette> }) {
  const quote = useRef(QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  return (
    <div className="relative flex flex-col items-center justify-center h-full overflow-hidden">
      {/* Background landscape */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src={zeroInboxReward}
          alt="Serene landscape — zero inbox achieved"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Golden glow overlay */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 40%, hsla(38, 60%, 70%, 0.25) 0%, transparent 65%)",
          }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Breathing light rays */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, hsla(38, 50%, 85%, 0.12) 0%, transparent 40%, transparent 70%, hsla(38, 40%, 60%, 0.08) 100%)",
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 50%, hsla(0, 0%, 0%, 0.35) 100%)" }} />
      </motion.div>

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-6 max-w-md text-center px-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Trophy with glow */}
        <motion.div
          className="relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle, hsla(38, 55%, 65%, 0.4) 0%, transparent 70%)", transform: "scale(4)" }}
            animate={{ scale: [4, 4.5, 4], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <div
            className="relative w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-sm"
            style={{
              background: "hsla(38, 50%, 70%, 0.2)",
              border: "1px solid hsla(38, 50%, 75%, 0.3)",
              boxShadow: "0 0 40px hsla(38, 55%, 65%, 0.25)",
            }}
          >
            <IconTrophy size={28} style={{ color: "hsla(38, 55%, 80%, 1)" }} strokeWidth={1.3} />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <h2 style={{
            fontFamily: SERIF,
            fontSize: "28px",
            fontWeight: 400,
            color: "hsla(0, 0%, 100%, 0.95)",
            marginBottom: "6px",
            textShadow: "0 2px 20px hsla(0, 0%, 0%, 0.3)",
            letterSpacing: "0.01em",
          }}>
            Zero Inbox
          </h2>
          <p style={{
            fontSize: "15px",
            lineHeight: 1.7,
            color: "hsla(0, 0%, 100%, 0.7)",
            fontWeight: 300,
            textShadow: "0 1px 10px hsla(0, 0%, 0%, 0.3)",
          }}>
            Every message handled. Every thread resolved.
          </p>
        </motion.div>

        {/* All channels clear badge */}
        <motion.div
          className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md"
          style={{
            background: "hsla(152, 50%, 50%, 0.15)",
            border: "1px solid hsla(152, 50%, 60%, 0.25)",
          }}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <IconCircleCheck size={14} style={{ color: "hsla(152, 55%, 65%, 1)" }} />
          <span style={{ fontSize: "12px", color: "hsla(152, 55%, 70%, 1)", fontWeight: 500 }}>All channels clear</span>
        </motion.div>

        {/* Inspirational quote */}
        <motion.div
          className="mt-2"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <p style={{
            fontSize: "14px",
            fontStyle: "italic",
            color: "hsla(0, 0%, 100%, 0.6)",
            fontWeight: 300,
            lineHeight: 1.7,
            textShadow: "0 1px 8px hsla(0, 0%, 0%, 0.2)",
          }}>
            "{quote.current.text}"
          </p>
          <p style={{
            fontSize: "11px",
            color: "hsla(38, 40%, 75%, 0.7)",
            marginTop: "6px",
            fontWeight: 400,
            letterSpacing: "0.05em",
          }}>
            — {quote.current.author}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}