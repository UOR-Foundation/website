/**
 * ReaderToolbar — Browser-like address bar for the immersive reader.
 * Always visible. Full-width, with golden-ratio proportions.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Home,
  Shield,
  Star,
  Info,
  Lock,
  Copy,
  Check,
  Clock,
  X,
  QrCode,
} from "lucide-react";
import QrPortalPanel from "@/modules/oracle/components/QrPortalPanel";
import { motion, AnimatePresence } from "framer-motion";
import { KNOWLEDGE_LENSES } from "@/modules/oracle/lib/knowledge-lenses";
import { useIsMobile } from "@/hooks/use-mobile";
import { getSearchHistory, type SearchHistoryEntry } from "@/modules/oracle/lib/search-history";

interface ReaderToolbarProps {
  triwordDisplay: string;
  typeLabel: string;
  activeLens: string;
  onLensChange: (lensId: string) => void;
  onBack: () => void;
  onToggleDetails: () => void;
  synthesizing?: boolean;
  immersive?: boolean;
  onSearchHistoryJump?: (keyword: string) => void;
}

/**
 * φ (golden ratio) constants for proportional spacing
 */
const PHI = 1.618;
const TOOLBAR_PY = 10; // ~10px vertical padding in chrome row
const CHROME_GAP = 6;  // gap between nav/address/actions

const ReaderToolbar: React.FC<ReaderToolbarProps> = ({
  triwordDisplay,
  typeLabel,
  activeLens,
  onLensChange,
  onBack,
  onToggleDetails,
  synthesizing = false,
  immersive = false,
  onSearchHistoryJump,
}) => {
  const isMobile = useIsMobile();
  const [copied, setCopied] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [portalOpen, setPortalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const historyRef = useRef<HTMLDivElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  const uorAddress = `uor://${triwordDisplay.toLowerCase().replace(/\s·\s/g, ".")}`;

  const handleAddressClick = useCallback(() => {
    setEditing(true);
    setEditValue(triwordDisplay);
    // Focus and select all on next tick
    setTimeout(() => {
      addressInputRef.current?.focus();
      addressInputRef.current?.select();
    }, 0);
  }, [triwordDisplay]);

  const handleAddressSubmit = useCallback(() => {
    const query = editValue.trim();
    setEditing(false);
    if (query && query !== triwordDisplay) {
      // Strip uor:// prefix if user pasted a full address
      const cleaned = query.replace(/^uor:\/\//, "").replace(/\./g, " ");
      onSearchHistoryJump?.(cleaned);
    }
  }, [editValue, triwordDisplay, onSearchHistoryJump]);

  const handleAddressKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddressSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditing(false);
    }
  }, [handleAddressSubmit]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(uorAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = uorAddress;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [uorAddress]);

  const handleHistoryToggle = useCallback(async () => {
    if (historyOpen) {
      setHistoryOpen(false);
      return;
    }
    const entries = await getSearchHistory(15);
    setHistory(entries);
    setHistoryOpen(true);
  }, [historyOpen]);

  useEffect(() => {
    if (!historyOpen) return;
    const handler = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [historyOpen]);

  /* ── Shared icon button ── */
  const IconBtn = ({
    onClick,
    title,
    children,
    disabled = false,
    className = "",
  }: {
    onClick?: () => void;
    title: string;
    children: React.ReactNode;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-2 rounded-lg transition-all shrink-0 ${
        immersive
          ? `text-white/40 hover:text-white/80 hover:bg-white/[0.07] ${disabled ? "opacity-20 cursor-default" : ""}`
          : `text-muted-foreground/40 hover:text-foreground/70 hover:bg-muted/15 ${disabled ? "opacity-20 cursor-default" : ""}`
      } ${className}`}
    >
      {children}
    </button>
  );

  /* ── Search history dropdown ── */
  const HistoryDropdown = () => (
    <AnimatePresence>
      {historyOpen && (
        <motion.div
          ref={historyRef}
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-full mt-1.5 z-50 rounded-xl overflow-hidden"
          style={{
            width: "min(320px, 90vw)",
            background: immersive ? "rgba(10,14,18,0.92)" : "hsl(var(--background) / 0.95)",
            border: immersive ? "1px solid rgba(255,255,255,0.1)" : "1px solid hsl(var(--border) / 0.15)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
          }}
        >
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b"
            style={{ borderColor: immersive ? "rgba(255,255,255,0.06)" : "hsl(var(--border) / 0.1)" }}
          >
            <span className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${immersive ? "text-white/50" : "text-muted-foreground/50"}`}>
              Recent Searches
            </span>
            <button onClick={() => setHistoryOpen(false)} className={`p-0.5 rounded ${immersive ? "text-white/30 hover:text-white/60" : "text-muted-foreground/30 hover:text-muted-foreground/60"} transition-colors`}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="max-h-[280px] overflow-y-auto py-1">
            {history.length === 0 ? (
              <p className={`text-center py-6 text-xs ${immersive ? "text-white/25" : "text-muted-foreground/30"}`}>
                No recent searches
              </p>
            ) : (
              history.map((entry, i) => (
                <button
                  key={`${entry.keyword}-${i}`}
                  onClick={() => {
                    setHistoryOpen(false);
                    onSearchHistoryJump?.(entry.keyword);
                  }}
                  className={`w-full text-left px-3.5 py-2 flex items-center gap-2.5 transition-colors ${
                    immersive
                      ? "hover:bg-white/[0.06] text-white/70 hover:text-white/90"
                      : "hover:bg-muted/10 text-foreground/70 hover:text-foreground/90"
                  }`}
                >
                  <Clock className={`w-3 h-3 shrink-0 ${immersive ? "text-white/20" : "text-muted-foreground/25"}`} />
                  <span className="text-[13px] truncate flex-1">{entry.keyword}</span>
                  {entry.searched_at && (
                    <span className={`text-[10px] shrink-0 ${immersive ? "text-white/20" : "text-muted-foreground/20"}`}>
                      {formatTimeAgo(entry.searched_at)}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── Compact mobile toolbar ──
  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="sticky top-0 z-40 flex items-center gap-1 px-2 backdrop-blur-2xl border-b"
        style={{
          background: immersive ? "rgba(255,255,255,0.06)" : "hsl(var(--background) / 0.82)",
          borderColor: immersive ? "rgba(255,255,255,0.04)" : "hsl(var(--border) / 0.05)",
          paddingTop: immersive ? "max(10px, env(safe-area-inset-top, 10px))" : "10px",
          paddingBottom: "6px",
        }}
      >
        <IconBtn onClick={onBack} title="Back"><ArrowLeft className="w-4 h-4" /></IconBtn>

        {/* Address bar */}
        <div className="flex-1 flex items-center gap-1.5 min-w-0 h-9 rounded-full px-3"
          style={{
            background: immersive ? "rgba(255,255,255,0.08)" : "hsl(var(--muted) / 0.15)",
            border: immersive ? "1px solid rgba(255,255,255,0.06)" : "1px solid hsl(var(--border) / 0.12)",
          }}
          onClick={!editing ? handleAddressClick : undefined}
        >
          <Lock className="w-3 h-3 text-emerald-400/70 shrink-0" />
          {editing ? (
            <input
              ref={addressInputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleAddressKeyDown}
              onBlur={() => setEditing(false)}
              className={`text-[13px] font-display flex-1 min-w-0 bg-transparent outline-none ${immersive ? "text-white/90 placeholder:text-white/30" : "text-foreground/90 placeholder:text-muted-foreground/30"}`}
              placeholder="Search or enter address…"
            />
          ) : (
            <span className={`text-[13px] font-display truncate flex-1 min-w-0 cursor-text ${immersive ? "text-white/70" : "text-foreground/70"}`}>
              {triwordDisplay}
            </span>
          )}
        </div>

        <IconBtn onClick={handleCopy} title="Copy address">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </IconBtn>
        <IconBtn onClick={onToggleDetails} title="Details"><Info className="w-3.5 h-3.5" /></IconBtn>
      </motion.div>
    );
  }

  // ── Desktop toolbar — full-width browser chrome with golden-ratio spacing ──
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="sticky top-0 z-40 w-full backdrop-blur-2xl"
      style={{
        background: immersive ? "rgba(10,14,18,0.88)" : "hsl(var(--background) / 0.88)",
        borderBottom: immersive
          ? "1px solid rgba(255,255,255,0.06)"
          : "1px solid hsl(var(--border) / 0.08)",
        /* Ensure absolutely no top border or stripe */
        borderTop: "none",
      }}
    >
      {/* ── Browser chrome row — golden-ratio vertical rhythm ── */}
      <div
        className="flex items-center w-full"
        style={{
          gap: `${Math.round(CHROME_GAP * PHI)}px`,   // ~10px — φ-scaled gap
          paddingLeft: `clamp(12px, ${Math.round(TOOLBAR_PY * PHI * PHI)}px, 32px)`,
          paddingRight: `clamp(12px, ${Math.round(TOOLBAR_PY * PHI * PHI)}px, 32px)`,
          paddingTop: `${Math.round(TOOLBAR_PY)}px`,
          paddingBottom: `${Math.round(TOOLBAR_PY * 0.618)}px`, // φ-inverse bottom
        }}
      >
        {/* Navigation buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <IconBtn onClick={onBack} title="Back (Alt+←)"><ArrowLeft className="w-4 h-4" /></IconBtn>
          <IconBtn disabled title="Forward (Alt+→)"><ArrowRight className="w-4 h-4" /></IconBtn>
          <IconBtn onClick={onBack} title="Reload"><RotateCcw className="w-3.5 h-3.5" /></IconBtn>
          <IconBtn onClick={onBack} title="Home"><Home className="w-4 h-4" /></IconBtn>
        </div>

        {/* ── Address bar — golden-ratio height ── */}
        <div
          className="flex-1 flex items-center gap-2.5 min-w-0 rounded-full px-4 group transition-all"
          style={{
            height: `${Math.round(20 * PHI)}px`, // ~32px → 36px with phi
            background: immersive ? "rgba(255,255,255,0.06)" : "hsl(var(--muted) / 0.12)",
            border: immersive ? "1px solid rgba(255,255,255,0.08)" : "1px solid hsl(var(--border) / 0.1)",
            boxShadow: immersive ? "inset 0 1px 3px rgba(0,0,0,0.12)" : "inset 0 1px 2px hsl(var(--background) / 0.25)",
          }}
        >
          <Lock className={`w-3.5 h-3.5 shrink-0 ${immersive ? "text-emerald-400/80" : "text-emerald-500/70"}`} />
          {editing ? (
            <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
              <span className={`text-[13px] shrink-0 select-none ${immersive ? "text-white/35" : "text-muted-foreground/35"}`}>uor://</span>
              <input
                ref={addressInputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleAddressKeyDown}
                onBlur={() => setEditing(false)}
                className={`text-[13px] font-display tracking-wide flex-1 min-w-0 bg-transparent outline-none ${immersive ? "text-white/90 placeholder:text-white/30" : "text-foreground/90 placeholder:text-muted-foreground/30"}`}
                placeholder="Search or type address…"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden cursor-text" onClick={handleAddressClick}>
              <span className={`text-[13px] shrink-0 select-none ${immersive ? "text-white/35" : "text-muted-foreground/35"}`}>uor://</span>
              <span className={`text-[13px] font-display tracking-wide truncate ${immersive ? "text-white/80" : "text-foreground/75"}`}>
                {triwordDisplay}
              </span>
            </div>
          )}

          {/* Copy address */}
          <button
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy address"}
            className={`p-1 rounded transition-all shrink-0 ${
              immersive
                ? "text-white/25 hover:text-white/60 hover:bg-white/[0.06]"
                : "text-muted-foreground/25 hover:text-foreground/55 hover:bg-muted/8"
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <Shield className={`w-3.5 h-3.5 shrink-0 transition-colors ${
            immersive
              ? "text-white/20 group-hover:text-white/35"
              : "text-muted-foreground/20 group-hover:text-muted-foreground/35"
          }`} />
        </div>

        {/* ── Right-side actions ── */}
        <div className="flex items-center gap-0.5 shrink-0 relative">
          <IconBtn title="Bookmark" onClick={() => {}}><Star className="w-4 h-4" /></IconBtn>
          <IconBtn onClick={() => setPortalOpen(!portalOpen)} title="Portal — scan to continue on mobile">
            <QrCode className={`w-4 h-4 ${portalOpen ? (immersive ? "text-white/80" : "text-foreground/80") : ""}`} />
          </IconBtn>
          <IconBtn onClick={handleHistoryToggle} title="Search history">
            <Clock className={`w-4 h-4 ${historyOpen ? (immersive ? "text-white/80" : "text-foreground/80") : ""}`} />
          </IconBtn>
          <IconBtn onClick={onToggleDetails} title="Page info">
            <Info className="w-4 h-4" />
          </IconBtn>
          <HistoryDropdown />
          <QrPortalPanel
            open={portalOpen}
            onClose={() => setPortalOpen(false)}
            targetUrl={window.location.pathname + window.location.search}
            targetLens={activeLens}
            immersive={immersive}
          />
        </div>
      </div>

      {/* ── Lens bar (tab row beneath address bar) ── */}
      <div
        className="flex items-center gap-1 w-full"
        style={{
          paddingLeft: `clamp(12px, ${Math.round(TOOLBAR_PY * PHI * PHI)}px, 32px)`,
          paddingRight: `clamp(12px, ${Math.round(TOOLBAR_PY * PHI * PHI)}px, 32px)`,
          paddingBottom: `${Math.round(TOOLBAR_PY * 0.618)}px`,
        }}
      >
        {KNOWLEDGE_LENSES.map((lens) => {
          const isActive = lens.id === activeLens;
          return (
            <button
              key={lens.id}
              onClick={() => !isActive && onLensChange(lens.id)}
              disabled={synthesizing && isActive}
              title={lens.description}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all border ${
                isActive
                  ? immersive
                    ? "bg-white/[0.12] text-white/90 border-white/[0.12]"
                    : "bg-primary/12 text-primary border-primary/20"
                  : immersive
                    ? "text-white/35 hover:text-white/65 hover:bg-white/[0.05] border-transparent"
                    : "text-muted-foreground/35 hover:text-foreground/55 hover:bg-muted/10 border-transparent"
              } ${synthesizing && !isActive ? "opacity-30 cursor-wait" : "cursor-pointer"}`}
            >
              {lens.label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

/** Format a timestamp to relative time */
function formatTimeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export default ReaderToolbar;
