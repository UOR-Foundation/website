/**
 * SourcesPills — Horizontal row of source cards (Perplexity-style).
 * Shows immediately when wiki data arrives, before AI text streams in.
 */

import React from "react";
import type { SourceMeta } from "../lib/citation-parser";

interface SourcesPillsProps {
  sources: SourceMeta[];
}

const SourcesPills: React.FC<SourcesPillsProps> = ({ sources }) => {
  if (!sources.length) return null;

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
        Sources
      </span>
      {sources.map((s, i) => (
        <a
          key={i}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 shrink-0 bg-muted/15 hover:bg-muted/25 border border-border/10 hover:border-border/20 transition-all text-foreground/70 hover:text-foreground/90"
          style={{
            padding: "4px 10px 4px 6px",
            borderRadius: 20,
            textDecoration: "none",
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          <img
            src={`https://www.google.com/s2/favicons?domain=${s.domain}&sz=16`}
            alt=""
            width={14}
            height={14}
            style={{ borderRadius: 2, opacity: 0.8 }}
            loading="lazy"
          />
          <span>{s.domain}</span>
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
