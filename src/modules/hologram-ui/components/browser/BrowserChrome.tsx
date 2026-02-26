/**
 * BrowserChrome — The ultra-thin top bar with nav, URL input, and actions.
 * Pure presentational — all logic comes from useBrowserNavigation.
 */

import React from "react";
import { ArrowLeft, ArrowRight, RotateCw, X, ExternalLink, Loader2, Search, Sparkles, Clock, Globe, BookOpen, ShieldCheck, ShieldOff, Lock, LockOpen } from "lucide-react";
import { P, isUrl } from "./browser-palette";
import { type BrowserNavState, type BrowserNavActions } from "./useBrowserNavigation";

/* ── Module-scoped IconBtn ─────────────────────────────────── */
export function IconBtn({ onClick, disabled, children, title, active }: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded-md transition-all duration-200 disabled:opacity-20"
      style={{ color: active ? P.gold : P.textMuted }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = P.surfaceHover; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

interface BrowserChromeProps {
  state: BrowserNavState;
  actions: BrowserNavActions;
  onClose: () => void;
  onSendToLumen?: (ctx: { title: string; url: string; markdown: string }) => void;
}

export default function BrowserChrome({ state, actions, onClose, onSendToLumen }: BrowserChromeProps) {
  const { url, loading, page, historyIdx, history, showHistory, viewMode, popupsBlocked, privateRelay } = state;
  const { setUrl, goBack, goForward, navigate, setShowHistory, toggleViewMode, togglePopups, togglePrivateRelay, inputRef } = actions;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUrl(url)) {
      navigate(url);
    } else {
      actions.search(url);
    }
  };

  return (
    <div
      className="flex items-center gap-1.5 px-3 shrink-0"
      style={{ height: 44, borderBottom: `1px solid ${P.border}`, background: "transparent" }}
    >
      <IconBtn onClick={goBack} disabled={historyIdx <= 0} title="Back (Alt+←)">
        <ArrowLeft className="w-4 h-4" />
      </IconBtn>
      <IconBtn onClick={goForward} disabled={historyIdx >= history.length - 1} title="Forward (Alt+→)">
        <ArrowRight className="w-4 h-4" />
      </IconBtn>
      <IconBtn onClick={() => page && navigate(page.url, true)} disabled={loading || !page} title="Reload">
        <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
      </IconBtn>

      <form onSubmit={handleSubmit} className="flex-1 flex items-center mx-1">
        <div
          className="flex items-center flex-1 gap-2 px-3 rounded-full transition-all duration-200"
          style={{ height: 30, background: "hsla(38, 8%, 50%, 0.06)", border: `1px solid hsla(38, 12%, 70%, 0.04)` }}
          onFocus={(e) => { e.currentTarget.style.borderColor = P.borderFocus; e.currentTarget.style.background = "hsla(38, 8%, 50%, 0.1)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "hsla(38, 12%, 70%, 0.04)"; e.currentTarget.style.background = "hsla(38, 8%, 50%, 0.06)"; }}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: P.gold }} />
          ) : (
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: P.textMuted, opacity: 0.6 }} />
          )}
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Search or enter URL  ·  ⌘L"
            className="flex-1 bg-transparent border-none outline-none text-[13px] font-light placeholder:opacity-30"
            style={{ color: P.text, fontFamily: P.font }}
          />
        </div>
      </form>

      {page && onSendToLumen && (
        <button
          onClick={() => onSendToLumen({ title: page.title, url: page.url, markdown: page.markdown })}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-light transition-all duration-200"
          style={{ color: P.gold, border: `1px solid hsla(38, 30%, 55%, 0.12)`, background: "transparent", opacity: 0.75 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "hsla(38, 25%, 30%, 0.15)"; e.currentTarget.style.opacity = "1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.opacity = "0.75"; }}
        >
          <Sparkles className="w-3 h-3" />
          Lumen
        </button>
      )}

      {page && (
        <IconBtn
          onClick={toggleViewMode}
          title={`Mode: ${viewMode === "live" ? "Live (interactive)" : viewMode === "fidelity" ? "Fidelity (static)" : "Reader (markdown)"} · Click to cycle`}
          active={viewMode !== "live"}
        >
          {viewMode === "live" ? <Globe className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
        </IconBtn>
      )}

      {page && viewMode === "live" && (
        <IconBtn
          onClick={togglePopups}
          title={popupsBlocked ? "Popups blocked · Click to allow" : "Popups allowed · Click to block"}
          active={!popupsBlocked}
        >
          {popupsBlocked ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
        </IconBtn>
      )}

      {/* Private Relay indicator */}
      <button
        onClick={togglePrivateRelay}
        title={privateRelay ? "Private Relay ON · IP hidden, cookies blocked, headers sanitized" : "Private Relay OFF · Direct connection"}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-light transition-all duration-200"
        style={{
          color: privateRelay ? "hsl(152, 50%, 60%)" : P.textMuted,
          border: `1px solid ${privateRelay ? "hsla(152, 50%, 60%, 0.2)" : P.border}`,
          background: privateRelay ? "hsla(152, 50%, 60%, 0.06)" : "transparent",
        }}
      >
        {privateRelay ? <Lock className="w-3 h-3" /> : <LockOpen className="w-3 h-3" />}
        {privateRelay ? "Relay" : "Direct"}
      </button>

      {page && (
        <IconBtn onClick={() => window.open(page.url, "_blank")} title="Open externally">
          <ExternalLink className="w-3.5 h-3.5" />
        </IconBtn>
      )}
      <IconBtn onClick={() => setShowHistory((v: boolean) => !v)} title="History" active={showHistory}>
        <Clock className="w-3.5 h-3.5" />
      </IconBtn>
      <IconBtn onClick={onClose} title="Close (Esc)">
        <X className="w-3.5 h-3.5" />
      </IconBtn>
    </div>
  );
}
