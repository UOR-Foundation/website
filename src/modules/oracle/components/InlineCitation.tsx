/**
 * InlineCitation — A superscript citation badge with hover popover.
 * UOR-anchored: shows a deterministic content hash for each source.
 */

import React, { useState, useRef } from "react";
import type { SourceMeta } from "../lib/citation-parser";

const SUPERSCRIPT = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

function toSuperscript(n: number): string {
  return String(n)
    .split("")
    .map((d) => SUPERSCRIPT[parseInt(d)] || d)
    .join("");
}

interface InlineCitationProps {
  index: number;
  source: SourceMeta;
}

const InlineCitation: React.FC<InlineCitationProps> = ({ index, source }) => {
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  const ref = useRef<HTMLSpanElement>(null);

  const show = () => {
    clearTimeout(timeout.current);
    setOpen(true);
  };
  const hide = () => {
    timeout.current = setTimeout(() => setOpen(false), 200);
  };

  const typeIcon =
    source.type === "wikipedia" ? "📖" : source.type === "wikidata" ? "🔗" : "🌐";

  return (
    <span
      ref={ref}
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary/70 hover:text-primary transition-colors"
        aria-label={`Source ${index}: ${source.domain}`}
        tabIndex={0}
        style={{
          fontSize: "0.7em",
          fontFamily: "ui-monospace, monospace",
          fontWeight: 600,
          verticalAlign: "super",
          lineHeight: 1,
          textDecoration: "none",
          padding: "0 1px",
          borderRadius: 2,
          cursor: "pointer",
        }}
      >
        {toSuperscript(index)}
      </a>

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
            borderRadius: 8,
            padding: "8px 12px",
            minWidth: 220,
            maxWidth: 300,
            whiteSpace: "normal",
            pointerEvents: "auto",
          }}
        >
          <span className="flex items-center gap-1.5 mb-1">
            <span style={{ fontSize: 12 }}>{typeIcon}</span>
            <span
              className="text-foreground/90 font-medium"
              style={{ fontSize: 12 }}
            >
              {source.domain}
            </span>
          </span>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/70 hover:text-primary transition-colors block truncate"
            style={{ fontSize: 11, textDecoration: "none" }}
          >
            {source.url.replace(/^https?:\/\//, "").slice(0, 60)}
          </a>
          <span
            className="text-muted-foreground/40 block mt-1"
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
