/**
 * DesktopWidgets — Home screen: immersive clock, greeting, rich search bar.
 * This IS the desktop — always visible when no windows are maximized.
 * Theme-aware, supports immersive/dark/light via DesktopTheme context.
 *
 * Uses Pretext canvas measurement for adaptive clock sizing and
 * orphan-free greeting text — no CSS clamp() hacks.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useContextManager } from "@/modules/sovereign-vault/hooks/useContextManager";
import ContextPills from "@/modules/sovereign-vault/components/ContextPills";
import { ArrowRight, Upload } from "lucide-react";
import type { WindowState } from "@/modules/desktop/hooks/useWindowManager";
import { useDesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";
import { useConnectivity } from "@/modules/desktop/hooks/useConnectivity";
import { useAuth } from "@/hooks/use-auth";
import VoiceInput from "@/modules/oracle/components/VoiceInput";
import { isValidTriword, triwordBreakdown } from "@/lib/uor-triword";
import BalancedBlock from "@/modules/oracle/components/BalancedBlock";
import { measureLineCount, FONTS } from "@/modules/oracle/lib/pretext-layout";
import DayRingClock from "@/modules/desktop/components/DayRingClock";
import { createSuggestionEngine, type SearchSuggestion } from "@/modules/oracle/lib/search-suggestions";
import { getSearchHistory } from "@/modules/oracle/lib/search-history";
import { loadProfile as loadAttentionProfile } from "@/modules/oracle/lib/attention-tracker";
import SearchSuggestions from "@/modules/desktop/SearchSuggestions";

interface Props {
  windows: WindowState[];
  onSearch?: (query: string) => void;
  onOpenApp?: (appId: string) => void;
}

type AddressKind = "triword" | "ipv6" | null;

function detectAddress(input: string): { kind: AddressKind; label: string | null } {
  const t = input.trim();
  if (!t) return { kind: null, label: null };
  const normalized = t.replace(/\s*[·.]\s*/g, ".").replace(/\s+/g, ".").toLowerCase();
  const parts = normalized.split(".");
  if (parts.length === 3 && parts.every((p) => p.length >= 2)) {
    if (isValidTriword(normalized)) {
      const bd = triwordBreakdown(normalized);
      return {
        kind: "triword",
        label: bd
          ? `${bd.observer.charAt(0).toUpperCase() + bd.observer.slice(1)}.${bd.observable.charAt(0).toUpperCase() + bd.observable.slice(1)}.${bd.context.charAt(0).toUpperCase() + bd.context.slice(1)}`
          : null,
      };
    }
  }
  if (/^[0-9a-fA-F:]+$/.test(t) && t.includes(":") && t.split(":").length >= 3) {
    return { kind: "ipv6", label: t };
  }
  return { kind: null, label: null };
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Adaptive clock font sizes — Pretext picks the largest that fits on 1 line */

export default function DesktopWidgets({ windows, onSearch, onOpenApp }: Props) {
  const [time, setTime] = useState(new Date());
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const plusBtnRef = useRef<HTMLButtonElement>(null);
  const { theme, isLight } = useDesktopTheme();
  const { profile } = useAuth();
  const ctx = useContextManager();
  const conn = useConnectivity();
  
  const hasMaximized = windows.some(w => w.maximized && !w.minimized);
  const hasAnyWindows = windows.some(w => !w.minimized);
  const [containerWidth, setContainerWidth] = useState(580);

  // Suggestion state
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const engineRef = useRef<ReturnType<typeof createSuggestionEngine> | null>(null);

  const detected = useMemo(() => detectAddress(query), [query]);
  const isAddress = detected.kind !== null;

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Initialize suggestion engine
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const history = await getSearchHistory(30);
      const attention = loadAttentionProfile();
      const contextKeywords = ctx.contextItems.map(c => c.filename);
      if (cancelled) return;
      engineRef.current = createSuggestionEngine({
        history,
        contextKeywords,
        domainHistory: attention.domainHistory,
      });
    })();
    return () => { cancelled = true; };
  }, [ctx.contextItems]);

  // Drive suggestions on query change
  useEffect(() => {
    if (!query.trim() || isAddress) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (engineRef.current) {
      setShowSuggestions(true);
      setActiveIdx(-1);
      engineRef.current.suggest(query, setSuggestions);
    }
    return () => engineRef.current?.cancel();
  }, [query, isAddress]);

  // Track container width for Pretext measurements
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setContainerWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Auto-focus search on desktop
  useEffect(() => {
    if (window.innerWidth >= 768) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, []);

  const clockStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }); // kept for suggestion engine
  const fullName = profile?.displayName || "";
  const firstName = fullName.split(/\s+/)[0];
  const displayName = firstName || "Explorer";
  // No trailing period — Apple-style
  const greetingText = `${getGreeting()}, ${displayName}.`;


  // Pretext-measured adaptive greeting size
  const greetingFontInfo = useMemo(() => {
    const lines = measureLineCount(greetingText, FONTS.osGreeting, containerWidth, 48);
    if (lines <= 1) return { font: FONTS.osGreeting, lineHeight: 48, fontSize: "38px" };
    return { font: FONTS.osGreetingSm, lineHeight: 36, fontSize: "28px" };
  }, [greetingText, containerWidth]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim() && onSearch) {
      onSearch(query.trim());
      setQuery("");
      setShowSuggestions(false);
    }
  }, [query, onSearch]);

  const handleSuggestionSelect = useCallback((text: string) => {
    setQuery(text);
    setShowSuggestions(false);
    if (onSearch) onSearch(text);
    setQuery("");
  }, [onSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      handleSuggestionSelect(suggestions[activeIdx].text);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }, [showSuggestions, suggestions, activeIdx, handleSuggestionSelect]);

  // Theme-aware colors
  const isImmersive = theme === "immersive";
  // Lighter clock — ethereal, weightless
  
  // Greeting defers to clock — lower opacity
  const greetingColor = isImmersive ? "text-white/70" : isLight ? "text-black/30" : "text-white/35";

  // Search bar styles — frosted glass
  const searchBg = isImmersive
    ? "hsl(200 10% 12% / 0.82)"
    : isLight
      ? "rgba(0,0,0,0.04)"
      : "rgba(255,255,255,0.04)";
  const searchBorder = isImmersive
    ? "1px solid hsl(0 0% 100% / 0.10)"
    : isLight
      ? "1px solid rgba(0,0,0,0.06)"
      : "1px solid rgba(255,255,255,0.06)";
  const searchShadow = isImmersive
    ? "0 8px 32px -8px hsl(0 0% 0% / 0.5)"
    : isLight ? "0 4px 24px -8px rgba(0,0,0,0.06)" : "0 4px 24px -8px rgba(0,0,0,0.2)";
  const inputColor = isImmersive
    ? "hsl(0 0% 100% / 0.95)"
    : isLight
      ? "hsl(0 0% 0% / 0.85)"
      : "hsl(0 0% 100% / 0.9)";
  const placeholderColor = isImmersive ? "hsl(0 0% 100% / 0.30)" : isLight ? "hsl(0 0% 0% / 0.22)" : "hsl(0 0% 100% / 0.22)";
  const btnBgStyle = isImmersive
    ? "hsl(0 0% 100% / 0.08)"
    : isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)";
  const btnBorderStyle = isImmersive
    ? "1px solid hsl(0 0% 100% / 0.08)"
    : isLight ? "1px solid rgba(0,0,0,0.05)" : "1px solid rgba(255,255,255,0.06)";
  const btnIconColor = isImmersive ? "text-white" : isLight ? "text-black/60" : "text-white/70";

  const widgetOpacity = hasMaximized ? 0 : 1;
  const clockOpacity = hasAnyWindows ? 0.4 : 1;

  return (
    <div
      className="fixed inset-0 z-[5] flex flex-col items-center pointer-events-none"
      style={{
        opacity: widgetOpacity,
        transition: "opacity 300ms ease-out",
      }}
    >
      {/* Golden-ratio vertical centering: top flex-[1.2], bottom flex-[1.618] */}
      <div style={{ flex: "1.2" }} />

      <div ref={containerRef} className="pointer-events-auto w-full max-w-[580px] px-6 flex flex-col items-center">
        {/* Day-progress ring clock */}
        <DayRingClock time={time} theme={theme} isLight={isLight} opacity={clockOpacity} />

        {/* Greeting */}
        <div
          className="mt-2 text-center"
          style={{ opacity: clockOpacity, transition: "opacity 300ms ease-out" }}
        >
          <BalancedBlock
            font={greetingFontInfo.font}
            lineHeight={greetingFontInfo.lineHeight}
            as="p"
            className={`${greetingColor} font-normal select-none whitespace-nowrap`}
            style={{
              fontSize: greetingFontInfo.fontSize,
              fontFamily: "'DM Sans', -apple-system, sans-serif",
              textShadow: isImmersive ? "0 1px 16px rgba(0,0,0,0.2)" : "none",
              letterSpacing: "0",
            }}
            center
          >
            {greetingText}
          </BalancedBlock>
        </div>

        {/* Search bar — tighter gap, frosted glass */}
        <form onSubmit={handleSubmit} className="w-full mt-6">
          <div className="relative w-full group">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => { if (query.trim() && suggestions.length > 0) setShowSuggestions(true); }}
              onBlur={() => { setTimeout(() => setShowSuggestions(false), 150); }}
              placeholder="What's on your mind?"
              className="relative w-full rounded-full pr-24 py-4 text-base focus:outline-none"
              style={{
                paddingLeft: "3.5rem",
                background: searchBg,
                border: searchBorder,
                boxShadow: searchShadow,
                color: inputColor,
                caretColor: isImmersive ? "hsl(195 70% 65%)" : undefined,
                fontFamily: isAddress
                  ? "var(--font-mono, ui-monospace, monospace)"
                  : "'DM Sans', -apple-system, sans-serif",
                letterSpacing: isAddress ? "0.03em" : undefined,
                fontWeight: isAddress ? 500 : undefined,
              }}
              role="combobox"
              aria-expanded={showSuggestions && suggestions.length > 0}
              aria-autocomplete="list"
              autoComplete="off"
            />

            {/* Suggestion dropdown */}
            <SearchSuggestions
              suggestions={suggestions}
              visible={showSuggestions}
              onSelect={handleSuggestionSelect}
              onDismiss={() => setShowSuggestions(false)}
              activeIndex={activeIdx}
              onActiveIndexChange={setActiveIdx}
            />

            {/* Context button — opens File Explorer */}
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10">
              <button
                ref={plusBtnRef}
                type="button"
                onClick={() => onOpenApp?.("files")}
                className="flex items-center justify-center transition-all relative p-1"
                style={{
                  color: isImmersive ? "hsl(0 0% 100% / 0.40)" : isLight ? "hsl(0 0% 0% / 0.25)" : "hsl(0 0% 100% / 0.30)",
                }}
                title="Open File Explorer"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>

            {/* Right-side actions */}
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
              <VoiceInput
                onTranscript={(text, isFinal) => {
                  setQuery(text);
                  if (isFinal && text.trim() && onSearch) onSearch(text.trim());
                }}
                size="sm"
                className={isImmersive
                  ? "text-white/60 hover:text-white/90 border-white/10 hover:border-white/25"
                  : isLight
                    ? "text-black/40 hover:text-black/70 border-black/10 hover:border-black/20"
                    : "text-white/50 hover:text-white/80 border-white/10 hover:border-white/20"
                }
              />
              <button
                type="submit"
                disabled={!query.trim()}
                className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-25 transition-all duration-200"
                style={{
                  background: btnBgStyle,
                  border: btnBorderStyle,
                }}
              >
                <ArrowRight className={`w-5 h-5 ${btnIconColor}`} />
              </button>
            </div>
          </div>
        </form>

        {/* Context pills — show active context items */}
        {ctx.contextItems.length > 0 && (
          <div className="w-full mt-3">
            <ContextPills items={ctx.contextItems} onRemove={ctx.remove} />
          </div>
        )}
      </div>

      {/* Offline banner — calm, reassuring */}
      {!conn.online && (
        <div className={`pointer-events-auto mt-4 px-4 py-2.5 rounded-full text-[12px] font-medium ${
          isImmersive ? "text-white/40 bg-white/[0.04] border border-white/[0.06]"
            : isLight ? "text-black/30 bg-black/[0.03] border border-black/[0.04]"
            : "text-white/35 bg-white/[0.03] border border-white/[0.05]"
        }`}>
          Offline mode — your knowledge graph and data are fully available
        </div>
      )}

      {/* Bottom spacer — golden ratio */}
      <div style={{ flex: "1.618" }} />

      {/* Placeholder style for placeholders */}
      <style>{`
        .pointer-events-auto input::placeholder {
          color: ${placeholderColor};
        }
      `}</style>
    </div>
  );
}
