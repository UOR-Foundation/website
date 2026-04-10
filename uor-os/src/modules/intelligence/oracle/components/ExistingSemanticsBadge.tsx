/**
 * ExistingSemanticsBadge — Shows what structured data formats a website already publishes.
 * Makes backward compatibility tangible: users see UOR absorbing the existing web.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface ExistingSemanticsBadgeProps {
  existingSemantics: {
    jsonLd?: unknown[];
    openGraph?: Record<string, string>;
    meta?: Record<string, string>;
    hasStructuredData?: boolean;
  };
}

const ExistingSemanticsBadge: React.FC<ExistingSemanticsBadgeProps> = ({ existingSemantics }) => {
  const [expandedFormat, setExpandedFormat] = useState<string | null>(null);

  const formats = [
    {
      key: "jsonLd",
      label: "JSON-LD",
      found: Array.isArray(existingSemantics.jsonLd) && existingSemantics.jsonLd.length > 0,
      data: existingSemantics.jsonLd,
      spec: "https://www.w3.org/TR/json-ld11/",
    },
    {
      key: "openGraph",
      label: "Open Graph",
      found: !!existingSemantics.openGraph && Object.keys(existingSemantics.openGraph).length > 0,
      data: existingSemantics.openGraph,
      spec: "https://ogp.me/",
    },
    {
      key: "meta",
      label: "Meta",
      found: !!existingSemantics.meta && Object.keys(existingSemantics.meta).length > 0,
      data: existingSemantics.meta,
      spec: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta",
    },
  ];

  const foundCount = formats.filter(f => f.found).length;
  if (foundCount === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span
          style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}
          className="text-muted-foreground/40"
        >
          Absorbed
        </span>
        {formats.map((fmt) => (
          <button
            key={fmt.key}
            onClick={() => fmt.found && setExpandedFormat(expandedFormat === fmt.key ? null : fmt.key)}
            disabled={!fmt.found}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontFamily: "ui-monospace, monospace",
              padding: "2px 8px",
              borderRadius: 4,
              border: "none",
              cursor: fmt.found ? "pointer" : "default",
              transition: "all 0.15s",
            }}
            className={
              fmt.found
                ? expandedFormat === fmt.key
                  ? "bg-primary/20 text-primary"
                  : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
                : "bg-muted/10 text-muted-foreground/20"
            }
          >
            <span>{fmt.found ? "✓" : "✗"}</span>
            {fmt.label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {expandedFormat && (() => {
          const fmt = formats.find(f => f.key === expandedFormat);
          if (!fmt?.data) return null;
          return (
            <motion.div
              key={expandedFormat}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <div
                style={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border) / 0.12)",
                  padding: "8px 12px",
                  maxHeight: 200,
                  overflowY: "auto",
                }}
                className="bg-muted/5"
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 600 }} className="text-muted-foreground/50">
                    {fmt.label} — extracted from source
                  </span>
                  <a
                    href={fmt.spec}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 9 }}
                    className="text-primary/40 hover:text-primary/70 transition-colors"
                  >
                    spec ↗
                  </a>
                </div>
                <pre
                  style={{
                    fontSize: 10,
                    fontFamily: "ui-monospace, monospace",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    margin: 0,
                  }}
                  className="text-foreground/50"
                >
                  {JSON.stringify(fmt.data, null, 2)}
                </pre>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default ExistingSemanticsBadge;
