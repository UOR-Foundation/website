/**
 * BrowserHistory — Sidebar showing visited pages with clear action.
 */

import { Trash2 } from "lucide-react";
import { P, formatTimeAgo } from "./browser-palette";
import { type BrowserNavState, type BrowserNavActions } from "./useBrowserNavigation";

interface BrowserHistoryProps {
  state: BrowserNavState;
  actions: BrowserNavActions;
}

export default function BrowserHistory({ state, actions }: BrowserHistoryProps) {
  const { history, historyIdx } = state;
  const { clearHistory, selectHistoryEntry } = actions;

  return (
    <div
      className="shrink-0 overflow-y-auto lumen-scroll flex flex-col"
      style={{ width: 240, background: "hsla(25, 8%, 10%, 0.5)", borderRight: `1px solid ${P.border}` }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0" style={{ borderBottom: `1px solid ${P.border}` }}>
        <span className="text-[10px] font-light uppercase tracking-widest" style={{ color: P.textMuted }}>History</span>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1 text-[10px] font-light px-1.5 py-0.5 rounded transition-colors"
            style={{ color: P.textMuted }}
            onMouseEnter={(e) => { e.currentTarget.style.color = P.gold; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = P.textMuted; }}
          >
            <Trash2 className="w-2.5 h-2.5" /> Clear
          </button>
        )}
      </div>

      {history.length === 0 && (
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-[11px] font-light text-center" style={{ color: P.textMuted }}>No pages visited yet</p>
        </div>
      )}

      <div className="flex-1 py-1">
        {[...history].reverse().map((entry, i) => {
          const realIdx = history.length - 1 - i;
          const isActive = realIdx === historyIdx;
          return (
            <button
              key={`${entry.url}-${entry.visitedAt}`}
              onClick={() => selectHistoryEntry(realIdx)}
              className="w-full text-left px-4 py-2 transition-all duration-150"
              style={{
                background: isActive ? "hsla(38, 15%, 25%, 0.15)" : "transparent",
                borderLeft: isActive ? `2px solid ${P.gold}` : "2px solid transparent",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = P.surfaceHover; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <p className="text-[11px] font-light truncate mb-0.5" style={{ color: isActive ? P.gold : P.text }}>
                {entry.title}
              </p>
              <p className="text-[9px] font-light truncate" style={{ color: P.textMuted }}>
                {new URL(entry.url).hostname} · {formatTimeAgo(entry.visitedAt)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
