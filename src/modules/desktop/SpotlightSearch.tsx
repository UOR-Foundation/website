/**
 * SpotlightSearch — Universal command palette (⌘K).
 * Frosted glass overlay for launching apps and searching.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DESKTOP_APPS } from "@/modules/desktop/lib/desktop-apps";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenApp: (appId: string) => void;
  onSearch: (query: string) => void;
}

const RECENT_KEY = "uor-os-recent-searches";

function getRecents(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").slice(0, 5);
  } catch {
    return [];
  }
}

function addRecent(q: string) {
  const list = getRecents().filter(r => r !== q);
  list.unshift(q);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 5)));
}

export default function SpotlightSearch({ open, onClose, onOpenApp, onSearch }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const recents = getRecents();

  // Filter apps
  const matchedApps = query.trim()
    ? DESKTOP_APPS.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
    : DESKTOP_APPS;

  const matchedRecents = query.trim()
    ? recents.filter(r => r.toLowerCase().includes(query.toLowerCase()))
    : recents;

  const items: { type: "app" | "recent"; id: string; label: string }[] = [
    ...matchedApps.map(a => ({ type: "app" as const, id: a.id, label: a.label })),
    ...matchedRecents.map(r => ({ type: "recent" as const, id: r, label: r })),
  ];

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const execute = useCallback((item?: { type: string; id: string; label: string }) => {
    if (!item && query.trim()) {
      addRecent(query.trim());
      onSearch(query.trim());
      onClose();
      return;
    }
    if (item?.type === "app") {
      onOpenApp(item.id);
      onClose();
    } else if (item?.type === "recent") {
      addRecent(item.label);
      onSearch(item.label);
      onClose();
    }
  }, [query, onSearch, onOpenApp, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      execute(items[selectedIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[300]"
            style={{ background: "rgba(0,0,0,0.35)" }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: "spring", damping: 30, stiffness: 500, duration: 0.2 }}
            className="fixed z-[301] left-1/2 top-[22%] -translate-x-1/2 w-[480px] max-w-[90vw] rounded-2xl overflow-hidden"
            style={{
              background: "rgba(30,30,30,0.82)",
              backdropFilter: "blur(48px) saturate(1.4)",
              WebkitBackdropFilter: "blur(48px) saturate(1.4)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 25px 60px -12px rgba(0,0,0,0.6)",
            }}
          >
            {/* Input */}
            <div className="flex items-center px-4 py-3 gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search apps and queries…"
                className="flex-1 bg-transparent text-[15px] text-white/90 placeholder:text-white/25 outline-none font-medium"
                style={{ fontFamily: "'DM Sans', -apple-system, sans-serif" }}
              />
              <kbd className="text-[10px] text-white/20 font-medium px-1.5 py-0.5 rounded border border-white/[0.06] bg-white/[0.03]">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[320px] overflow-y-auto py-1.5">
              {matchedApps.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 text-[10px] font-semibold text-white/20 uppercase tracking-wider">Apps</div>
                  {matchedApps.map((app, i) => {
                    const idx = i;
                    const Icon = app.icon;
                    return (
                      <button
                        key={app.id}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${selectedIndex === idx ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"}`}
                        onClick={() => execute({ type: "app", id: app.id, label: app.label })}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <Icon className="w-3.5 h-3.5 text-white/50" />
                        </div>
                        <span className="text-[13px] font-medium text-white/75">{app.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {matchedRecents.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 text-[10px] font-semibold text-white/20 uppercase tracking-wider mt-1">Recent</div>
                  {matchedRecents.map((r, i) => {
                    const idx = matchedApps.length + i;
                    return (
                      <button
                        key={r}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${selectedIndex === idx ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"}`}
                        onClick={() => execute({ type: "recent", id: r, label: r })}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        </div>
                        <span className="text-[13px] text-white/50">{r}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {items.length === 0 && query.trim() && (
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left bg-white/[0.06]"
                  onClick={() => execute()}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <span className="text-[13px] text-white/60">Search for "{query}"</span>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
