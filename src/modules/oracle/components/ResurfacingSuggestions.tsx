/**
 * ResurfacingSuggestions — Gentle rediscovery prompts.
 *
 * Surfaces 1–3 important but neglected knowledge nodes.
 * "You haven't visited X in 12 days — it has 7 linked references."
 */

import { useState, useEffect } from "react";
import { getResurfacingSuggestions, type ResurfacingSuggestion } from "@/modules/oracle/lib/resurfacing";

export default function ResurfacingSuggestions() {
  const [suggestions, setSuggestions] = useState<ResurfacingSuggestion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await getResurfacingSuggestions(3);
      if (!cancelled) setSuggestions(s);
    })();
    return () => { cancelled = true; };
  }, []);

  const visible = suggestions.filter(s => !dismissed.has(s.address));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider flex items-center gap-1.5">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        Rediscover
      </h3>
      {visible.map((s) => (
        <button
          key={s.address}
          className="w-full text-left p-3 rounded-xl bg-muted/20 border border-border/20 hover:bg-muted/40 hover:border-border/40 transition-all group"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("uor:navigate-node", { detail: s.address }));
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground">
                {s.label}
              </span>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">{s.reason}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDismissed(prev => new Set(prev).add(s.address));
              }}
              className="text-muted-foreground/20 hover:text-muted-foreground/50 ml-2 shrink-0"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </button>
      ))}
    </div>
  );
}
