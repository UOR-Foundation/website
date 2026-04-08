/**
 * SearchSuggestions — Google-style autocomplete dropdown.
 *
 * Renders below the search input with grouped rows:
 *   🕐 History  |  🎯 Context  |  🔍 Popular
 *
 * Keyboard navigation (ArrowUp/Down/Enter/Escape) and click-to-select.
 * Theme-aware via DesktopTheme context.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Compass, Search } from "lucide-react";
import { useDesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";
import type { SearchSuggestion } from "@/modules/oracle/lib/search-suggestions";

interface Props {
  suggestions: SearchSuggestion[];
  visible: boolean;
  onSelect: (text: string) => void;
  onDismiss: () => void;
  /** Pass key events from the parent input for arrow/enter navigation */
  activeIndex: number;
  onActiveIndexChange: (idx: number) => void;
}

const ICON_MAP = {
  history: Clock,
  context: Compass,
  popular: Search,
} as const;

export default function SearchSuggestions({
  suggestions,
  visible,
  onSelect,
  onDismiss,
  activeIndex,
  onActiveIndexChange,
}: Props) {
  const { theme, isLight } = useDesktopTheme();
  const listRef = useRef<HTMLDivElement>(null);
  const isImmersive = theme === "immersive";

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-suggestion-item]");
    items[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!visible || suggestions.length === 0) return null;

  // Theme tokens
  const panelBg = isImmersive
    ? "hsl(200 15% 14% / 0.95)"
    : isLight
      ? "rgba(255,255,255,0.96)"
      : "rgba(28,28,30,0.95)";
  const panelBorder = isImmersive
    ? "1px solid hsl(0 0% 100% / 0.10)"
    : isLight
      ? "1px solid rgba(0,0,0,0.07)"
      : "1px solid rgba(255,255,255,0.07)";
  const panelShadow = isImmersive
    ? "0 16px 48px -8px rgba(0,0,0,0.6)"
    : isLight
      ? "0 12px 40px -8px rgba(0,0,0,0.12)"
      : "0 12px 40px -8px rgba(0,0,0,0.5)";

  const textColor = isImmersive
    ? "hsl(0 0% 100% / 0.85)"
    : isLight
      ? "hsl(0 0% 0% / 0.75)"
      : "hsl(0 0% 100% / 0.80)";
  const subtitleColor = isImmersive
    ? "hsl(0 0% 100% / 0.35)"
    : isLight
      ? "hsl(0 0% 0% / 0.35)"
      : "hsl(0 0% 100% / 0.35)";
  const iconColor = isImmersive
    ? "hsl(0 0% 100% / 0.30)"
    : isLight
      ? "hsl(0 0% 0% / 0.25)"
      : "hsl(0 0% 100% / 0.30)";
  const hoverBg = isImmersive
    ? "hsl(0 0% 100% / 0.06)"
    : isLight
      ? "rgba(0,0,0,0.04)"
      : "rgba(255,255,255,0.06)";
  const activeBg = isImmersive
    ? "hsl(0 0% 100% / 0.10)"
    : isLight
      ? "rgba(0,0,0,0.06)"
      : "rgba(255,255,255,0.08)";
  const dividerColor = isImmersive
    ? "hsl(0 0% 100% / 0.06)"
    : isLight
      ? "rgba(0,0,0,0.05)"
      : "rgba(255,255,255,0.06)";

  // Detect group transitions for dividers
  let lastType: string | null = null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        ref={listRef}
        className="absolute left-0 right-0 z-50 overflow-hidden"
        style={{
          top: "calc(100% + 6px)",
          borderRadius: 16,
          background: panelBg,
          backdropFilter: "blur(40px) saturate(1.3)",
          WebkitBackdropFilter: "blur(40px) saturate(1.3)",
          border: panelBorder,
          boxShadow: panelShadow,
          maxHeight: 360,
          overflowY: "auto",
        }}
        role="listbox"
      >
        <div className="py-1.5">
          {suggestions.map((s, i) => {
            const Icon = ICON_MAP[s.type];
            const showDivider = lastType !== null && lastType !== s.type;
            lastType = s.type;
            const isActive = i === activeIndex;

            return (
              <div key={`${s.type}-${s.text}`}>
                {showDivider && (
                  <div
                    className="mx-3 my-1"
                    style={{ height: 1, background: dividerColor }}
                  />
                )}
                <button
                  data-suggestion-item
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100 cursor-default"
                  style={{
                    background: isActive ? activeBg : "transparent",
                  }}
                  onMouseEnter={() => onActiveIndexChange(i)}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur
                    onSelect(s.text);
                  }}
                >
                  <Icon
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: iconColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-[14px] font-medium truncate block"
                      style={{
                        color: textColor,
                        fontFamily: "'DM Sans', -apple-system, sans-serif",
                      }}
                    >
                      {s.text}
                    </span>
                    {s.subtitle && (
                      <span
                        className="text-[11px] truncate block mt-0.5"
                        style={{ color: subtitleColor }}
                      >
                        {s.subtitle}
                      </span>
                    )}
                  </div>
                  {s.thumbnail && (
                    <img
                      src={s.thumbnail}
                      alt=""
                      className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                      loading="lazy"
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
