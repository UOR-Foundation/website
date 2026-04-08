/**
 * DesktopWidgets — Perplexity-inspired home view for the desktop OS.
 * Crisp search bar, greeting, clock, quick actions.
 * Fades out when any window is maximized.
 */

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Sparkles, BookOpen, MessageCircle, ArrowRight } from "lucide-react";
import ImmersiveQuote from "@/modules/oracle/components/ImmersiveQuote";
import type { WindowState } from "@/modules/desktop/hooks/useWindowManager";

interface Props {
  windows: WindowState[];
  onSearch?: (query: string) => void;
  onOpenApp?: (appId: string) => void;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DesktopWidgets({ windows, onSearch, onOpenApp }: Props) {
  const [time, setTime] = useState(new Date());
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const hasMaximized = windows.some(w => w.maximized && !w.minimized);
  const hasAnyWindows = windows.some(w => !w.minimized);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hours = time.getHours() % 12 || 12;
  const minutes = time.getMinutes().toString().padStart(2, "0");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && onSearch) {
      onSearch(query.trim());
      setQuery("");
    }
  };

  const quickActions = [
    { id: "oracle", label: "Oracle", icon: Sparkles },
    { id: "library", label: "Library", icon: BookOpen },
    { id: "messenger", label: "Messenger", icon: MessageCircle },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-[5] flex flex-col items-center justify-center pointer-events-none"
      animate={{ opacity: hasMaximized ? 0 : 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="pointer-events-auto w-full max-w-[640px] px-6 flex flex-col items-center">
        {/* Clock */}
        <motion.div
          className="text-center mb-6"
          animate={{ opacity: hasAnyWindows ? 0.4 : 1, scale: hasAnyWindows ? 0.9 : 1 }}
          transition={{ duration: 0.5 }}
        >
          <h1
            className="text-white/80 font-bold tracking-tight leading-none"
            style={{
              fontSize: "clamp(56px, 9vw, 100px)",
              fontFamily: "'DM Sans', -apple-system, sans-serif",
              textShadow: "0 2px 20px rgba(0,0,0,0.25)",
            }}
          >
            {hours}:{minutes}
          </h1>
          <p
            className="text-white/35 font-medium tracking-wide mt-1"
            style={{
              fontSize: "clamp(14px, 1.6vw, 18px)",
              fontFamily: "'DM Sans', -apple-system, sans-serif",
            }}
          >
            {getGreeting()}
          </p>
        </motion.div>

        {/* Search bar — Perplexity style */}
        <form onSubmit={handleSubmit} className="w-full mb-5">
          <div
            className="relative flex items-center w-full rounded-2xl transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 4px 24px -8px rgba(0,0,0,0.3)",
            }}
          >
            <div className="flex items-center pl-4 pr-2">
              <Search className="w-[18px] h-[18px] text-white/25" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 bg-transparent text-[15px] text-white/90 placeholder:text-white/25 py-3.5 pr-2 outline-none font-medium"
              style={{ fontFamily: "'DM Sans', -apple-system, sans-serif" }}
            />
            {query.trim() ? (
              <button
                type="submit"
                className="mr-3 p-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] transition-colors"
              >
                <ArrowRight className="w-4 h-4 text-white/60" />
              </button>
            ) : (
              <button
                type="button"
                className="mr-3 p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] transition-colors"
                aria-label="Add context"
              >
                <Plus className="w-4 h-4 text-white/30" />
              </button>
            )}
          </div>
        </form>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          {quickActions.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onOpenApp?.(id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-medium text-white/35 hover:text-white/60 transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Quote — subtle */}
        <div className="mt-10 opacity-40">
          <ImmersiveQuote />
        </div>
      </div>
    </motion.div>
  );
}
