/**
 * SourcesPills — Horizontal row of source cards (Perplexity-style).
 * Shows immediately when wiki data arrives, before AI text streams in.
 * Includes quality indicators for high-signal sources.
 */

import React from "react";
import type { SourceMeta } from "../lib/citation-parser";

interface SourcesPillsProps {
  sources: SourceMeta[];
}

const TYPE_LABELS: Record<string, string> = {
  academic: "Academic",
  institutional: "Institutional",
  wikipedia: "Encyclopedia",
  wikidata: "Knowledge base",
  news: "News",
  web: "Web",
};

const SourcesPills: React.FC<SourcesPillsProps> = ({ sources }) => {
  if (!sources.length) return null;

  const isHighSignal = (s: SourceMeta) =>
    s.type === "academic" || s.type === "institutional" || s.type === "wikipedia" || (s.score && s.score >= 80);

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto pb-1 mb-4"
      style={{ scrollbarWidth: "none" }}
    >
      <span
        className="text-muted-foreground/40 shrink-0"
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {sources.length} {sources.length === 1 ? "Source" : "Sources"}
      </span>
      {sources.map((s, i) => (
        <a
          key={i}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          title={`${s.title || s.domain} — ${TYPE_LABELS[s.type] || "Web"}${s.score ? ` (signal: ${s.score})` : ""}`}
          className="flex items-center gap-1.5 shrink-0 bg-muted/15 hover:bg-muted/25 border border-border/10 hover:border-border/20 transition-all text-foreground/70 hover:text-foreground/90"
          style={{
            padding: "4px 10px 4px 6px",
            borderRadius: 20,
            textDecoration: "none",
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          {/* Quality indicator for high-signal sources */}
          {isHighSignal(s) && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                flexShrink: 0,
              }}
              className={
                s.type === "academic"
                  ? "bg-emerald-400"
                  : s.type === "institutional"
                  ? "bg-blue-400"
                  : "bg-amber-400"
              }
            />
          )}
          <img
            src={`https://www.google.com/s2/favicons?domain=${s.domain}&sz=16`}
            alt=""
            width={14}
            height={14}
            style={{ borderRadius: 2, opacity: 0.8 }}
            loading="lazy"
          />
          <span>{s.title && s.title.length < 30 ? s.title : s.domain}</span>
          <span
            className="text-muted-foreground/30"
            style={{
              fontSize: 9,
              fontFamily: "ui-monospace, monospace",
              marginLeft: 2,
            }}
          >
            {i + 1}
          </span>
        </a>
      ))}
    </div>
  );
};

export default SourcesPills;
