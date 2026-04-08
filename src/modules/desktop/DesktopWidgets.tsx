/**
 * DesktopWidgets — Minimal home: clock, greeting, search bar.
 * Nothing else. Trust the user.
 */

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, ArrowRight } from "lucide-react";
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

export default function DesktopWidgets({ windows, onSearch }: Props) {
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

  return (
    <motion.div
      className="fixed inset-0 z-[5] flex flex-col items-center justify-center pointer-events-none"
      animate={{ opacity: hasMaximized ? 0 : 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="pointer-events-auto w-full max-w-[580px] px-6 flex flex-col items-center">
        {/* Clock */}
        <motion.div
          className="text-center mb-8"
          animate={{ opacity: hasAnyWindows ? 0.3 : 1, scale: hasAnyWindows ? 0.92 : 1 }}
          transition={{ duration: 0.5 }}
        >
          <h1
            className="text-white/75 font-bold tracking-tight leading-none"
            style={{
              fontSize: "clamp(64px, 10vw, 108px)",
              fontFamily: "'DM Sans', -apple-system, sans-serif",
              textShadow: "0 2px 24px rgba(0,0,0,0.3)",
            }}
          >
            {hours}:{minutes}
          </h1>
          <p
            className="text-white/30 font-medium tracking-wide mt-2"
            style={{
              fontSize: "clamp(14px, 1.5vw, 17px)",
              fontFamily: "'DM Sans', -apple-system, sans-serif",
            }}
          >
            {getGreeting()}
          </p>
        </motion.div>

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="w-full">
          <div
            className="relative flex items-center w-full rounded-2xl transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 4px 24px -8px rgba(0,0,0,0.3)",
            }}
          >
            <div className="flex items-center pl-4 pr-2">
              <Search className="w-[16px] h-[16px] text-white/20" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 bg-transparent text-[15px] text-white/90 placeholder:text-white/20 py-3.5 pr-2 outline-none font-medium"
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
              <kbd className="mr-3 text-[10px] text-white/15 font-medium px-1.5 py-0.5 rounded border border-white/[0.05] bg-white/[0.02]">
                ⌘K
              </kbd>
            )}
          </div>
        </form>
      </div>
    </motion.div>
  );
}
