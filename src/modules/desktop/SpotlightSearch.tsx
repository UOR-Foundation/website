/**
 * SpotlightSearch — Universal command palette (⌘K) powered by cmdk.
 * Theme-aware with fuzzy search, ARIA support, and grouped sections.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from "@/modules/core/ui/command";
import { DESKTOP_APPS } from "@/modules/desktop/lib/desktop-apps";
import { useDesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";
import { Search, Clock } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenApp: (appId: string) => void;
  onSearch: (query: string) => void;
}

const RECENT_KEY = "uor-os-recent-searches";
function getRecents(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").slice(0, 5); }
  catch { return []; }
}
function addRecent(q: string) {
  const list = getRecents().filter(r => r !== q);
  list.unshift(q);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 5)));
}

export default function SpotlightSearch({ open, onClose, onOpenApp, onSearch }: Props) {
  const [query, setQuery] = useState("");
  const { isLight } = useDesktopTheme();
  const recents = getRecents();

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const handleSelect = useCallback((value: string) => {
    if (value.startsWith("app:")) {
      onOpenApp(value.replace("app:", ""));
      onClose();
    } else if (value.startsWith("recent:")) {
      const q = value.replace("recent:", "");
      addRecent(q);
      onSearch(q);
      onClose();
    }
  }, [onOpenApp, onSearch, onClose]);

  const handleSubmit = useCallback(() => {
    if (query.trim()) {
      addRecent(query.trim());
      onSearch(query.trim());
      onClose();
    }
  }, [query, onSearch, onClose]);

  const panelBg = isLight ? "rgba(255,255,255,0.92)" : "rgba(30,30,30,0.85)";
  const panelBorder = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)";
  const panelShadow = isLight ? "0 25px 60px -12px rgba(0,0,0,0.15)" : "0 25px 60px -12px rgba(0,0,0,0.6)";
  const inputText = isLight ? "text-black/80 placeholder:text-black/25" : "text-white/90 placeholder:text-white/25";
  const headingColor = isLight ? "text-black/30" : "text-white/25";
  const itemText = isLight ? "text-black/65" : "text-white/75";
  const itemIconBg = isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)";
  const itemIconColor = isLight ? "text-black/40" : "text-white/50";
  const selectedBg = isLight ? "bg-black/[0.06]" : "bg-white/[0.08]";
  const emptyText = isLight ? "text-black/40" : "text-white/40";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[300]"
            style={{ background: isLight ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.35)" }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: "spring", damping: 30, stiffness: 500, duration: 0.2 }}
            className="fixed z-[301] left-1/2 top-[22%] -translate-x-1/2 w-[480px] max-w-[90vw] rounded-2xl overflow-hidden"
            style={{
              background: panelBg,
              backdropFilter: "blur(48px) saturate(1.4)",
              WebkitBackdropFilter: "blur(48px) saturate(1.4)",
              border: `1px solid ${panelBorder}`,
              boxShadow: panelShadow,
            }}
          >
            <Command
              className="bg-transparent"
              filter={(value, search) => {
                const label = value.replace(/^(app|recent):/, "").toLowerCase();
                return label.includes(search.toLowerCase()) ? 1 : 0;
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") { onClose(); }
                if (e.key === "Enter" && query.trim()) {
                  // If no item is highlighted, treat as a free-text search
                  const selected = document.querySelector("[cmdk-item][data-selected=true]");
                  if (!selected) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }
              }}
            >
              <div className="flex items-center px-4 py-3 gap-3" style={{ borderBottom: `1px solid ${isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}` }}>
                <Search className={`w-4 h-4 ${isLight ? "text-black/25" : "text-white/35"}`} />
                <CommandInput
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search apps and queries…"
                  className={`flex-1 bg-transparent text-[15px] ${inputText} outline-none font-medium h-auto py-0 border-0`}
                  style={{ fontFamily: "'DM Sans', -apple-system, sans-serif" }}
                />
                <kbd className={`text-[10px] ${isLight ? "text-black/20 border-black/[0.06] bg-black/[0.03]" : "text-white/20 border-white/[0.06] bg-white/[0.03]"} font-medium px-1.5 py-0.5 rounded border`}>
                  ESC
                </kbd>
              </div>

              <CommandList className="max-h-[320px] py-1.5">
                <CommandEmpty className={`py-6 text-center text-[13px] ${emptyText}`}>
                  {query.trim() ? (
                    <button onClick={handleSubmit} className="flex items-center gap-2 mx-auto">
                      <Search className="w-3.5 h-3.5" />
                      Search for "{query}"
                    </button>
                  ) : (
                    "Type to search…"
                  )}
                </CommandEmpty>

                <CommandGroup heading="Apps" className={`[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:${headingColor} [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-1.5`}>
                  {DESKTOP_APPS.map((app) => {
                    const Icon = app.icon;
                    return (
                      <CommandItem
                        key={app.id}
                        value={`app:${app.label}`}
                        onSelect={() => handleSelect(`app:${app.id}`)}
                        className={`flex items-center gap-3 px-4 py-2 mx-0 rounded-none cursor-default ${itemText} data-[selected=true]:${selectedBg}`}
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: itemIconBg }}>
                          <Icon className={`w-3.5 h-3.5 ${itemIconColor}`} />
                        </div>
                        <span className="text-[13px] font-medium">{app.label}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>

                {recents.length > 0 && (
                  <>
                    <CommandSeparator className={isLight ? "bg-black/[0.06]" : "bg-white/[0.06]"} />
                    <CommandGroup heading="Recent" className={`[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:${headingColor} [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-1.5`}>
                      {recents.map((r) => (
                        <CommandItem
                          key={r}
                          value={`recent:${r}`}
                          onSelect={() => handleSelect(`recent:${r}`)}
                          className={`flex items-center gap-3 px-4 py-2 mx-0 rounded-none cursor-default ${isLight ? "text-black/45" : "text-white/50"}`}
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)" }}>
                            <Clock className={`w-3 h-3 ${isLight ? "text-black/25" : "text-white/30"}`} />
                          </div>
                          <span className="text-[13px]">{r}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
