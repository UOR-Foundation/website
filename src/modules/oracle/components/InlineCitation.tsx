/**
 * InlineCitation — A superscript citation badge with hover/tap popover.
 * UOR-anchored: shows a deterministic content hash for each source.
 * Perplexity-style: title, type badge, one-tap open source.
 */

import React, { useState, useRef, useCallback } from "react";
import type { SourceMeta } from "../lib/citation-parser";

const SUPERSCRIPT = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

function toSuperscript(n: number): string {
  return String(n)
    .split("")
    .map((d) => SUPERSCRIPT[parseInt(d)] || d)
    .join("");
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  wikipedia: { icon: "📖", label: "Wikipedia", color: "bg-blue-500/15 text-blue-400" },
  wikidata: { icon: "🔗", label: "Wikidata", color: "bg-emerald-500/15 text-emerald-400" },
  academic: { icon: "🎓", label: "Academic", color: "bg-emerald-500/15 text-emerald-400" },
  institutional: { icon: "🏛️", label: "Institutional", color: "bg-blue-500/15 text-blue-400" },
  news: { icon: "📰", label: "News", color: "bg-amber-500/15 text-amber-400" },
  web: { icon: "🌐", label: "Web", color: "bg-muted text-muted-foreground" },
};

interface InlineCitationProps {
  index: number;
  source: SourceMeta;
}

const InlineCitation: React.FC<InlineCitationProps> = ({ index, source }) => {
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  const ref = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    clearTimeout(timeout.current);
    setOpen(true);
  }, []);
  const hide = useCallback(() => {
    timeout.current = setTimeout(() => setOpen(false), 200);
  }, []);

  // Touch support: toggle on tap
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setOpen((prev) => !prev);
  }, []);

  const cfg = TYPE_CONFIG[source.type] || TYPE_CONFIG.web;
  const displayTitle = source.title || source.domain;

  return (
    <span
      ref={ref}
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onTouchStart={handleTouchStart}
    >
      <span
        className="text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
        aria-label={`Source ${index}: ${displayTitle}`}
        tabIndex={0}
        role="button"
        style={{
          fontSize: "0.7em",
          fontFamily: "ui-monospace, monospace",
          fontWeight: 600,
          verticalAlign: "super",
          lineHeight: 1,
          textDecoration: "none",
          padding: "0 2px",
          borderRadius: 3,
        }}
      >
        {toSuperscript(index)}
      </span>

      {/* Popover */}
      {open && (
        <span
          className="absolute z-50 bg-popover border border-border/30 shadow-lg"
          onMouseEnter={show}
          onMouseLeave={hide}
          style={{
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            borderRadius: 10,
            padding: "10px 14px",
            minWidth: 240,
            maxWidth: 320,
            whiteSpace: "normal",
            pointerEvents: "auto",
          }}
        >
          {/* Type badge */}
          <span className="flex items-center gap-2 mb-1.5">
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ${cfg.color}`}
              style={{ fontSize: 10, fontWeight: 600 }}
            >
              <span style={{ fontSize: 11 }}>{cfg.icon}</span>
              {cfg.label}
            </span>
          </span>

          {/* Source title */}
          <span
            className="text-foreground/90 font-medium block mb-1"
            style={{ fontSize: 12, lineHeight: 1.4 }}
          >
            {displayTitle}
          </span>

          {/* URL preview */}
          <span
            className="text-muted-foreground/50 block truncate mb-2"
            style={{ fontSize: 10 }}
          >
            {source.url.replace(/^https?:\/\//, "").slice(0, 60)}
          </span>

          {/* Open Source button */}
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary/80 hover:text-primary bg-primary/10 hover:bg-primary/15 transition-colors"
            style={{
              fontSize: 11,
              fontWeight: 600,
              textDecoration: "none",
              padding: "4px 10px",
              borderRadius: 6,
            }}
          >
            Open source ↗
          </a>

          {/* UOR hash */}
          <span
            className="text-muted-foreground/30 block mt-2"
            style={{
              fontSize: 9,
              fontFamily: "ui-monospace, monospace",
              letterSpacing: "0.05em",
            }}
          >
            uor:{source.uorHash}
          </span>

          {/* Arrow */}
          <span
            className="absolute bg-popover border-b border-r border-border/30"
            style={{
              width: 8,
              height: 8,
              bottom: -4,
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)",
            }}
          />
        </span>
      )}
    </span>
  );
};

export default InlineCitation;
