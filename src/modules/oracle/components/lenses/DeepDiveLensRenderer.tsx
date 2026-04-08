/**
 * DeepDiveLensRenderer — Nature / arXiv / Scientific Journal style.
 * Abstract block, §-numbered sections, compact sans-serif, dense layout, footnote metadata.
 */

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import CitedMarkdown from "../CitedMarkdown";
import SourcesPills from "../SourcesPills";
import { normalizeSource } from "../../lib/citation-parser";
import type { SourceMeta } from "../../lib/citation-parser";

interface LensRendererProps {
  title: string;
  contentMarkdown: string;
  wikidata?: Record<string, unknown> | null;
  sources: string[];
  synthesizing?: boolean;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Extract lead paragraph as the "abstract" */
function extractAbstract(md: string): { abstract: string; rest: string } {
  const lines = md.split("\n");
  const firstHeading = lines.findIndex((l) => /^##\s+/.test(l));
  if (firstHeading <= 0) return { abstract: "", rest: md };
  return {
    abstract: lines.slice(0, firstHeading).join("\n").trim(),
    rest: lines.slice(firstHeading).join("\n").trim(),
  };
}

function createDeepDiveComponents(sectionCounter: { current: number }) {
  return {
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = typeof children === "string" ? children : String(children);
      sectionCounter.current++;
      return (
        <h2
          id={slugify(text)}
          className="text-foreground"
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            marginTop: "2rem",
            marginBottom: "0.5rem",
            lineHeight: 1.3,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
          {...props}
        >
          <span className="text-primary/50" style={{ fontFamily: "ui-monospace, monospace", marginRight: 8, fontWeight: 400 }}>
            §{sectionCounter.current}
          </span>
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3
        className="text-foreground/85"
        style={{
          fontSize: "0.95rem",
          fontWeight: 600,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          marginTop: "1.3rem",
          marginBottom: "0.4rem",
          fontStyle: "italic",
        }}
        {...props}
      >
        {children}
      </h3>
    ),
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p
        className="text-foreground/80"
        style={{
          fontSize: 15,
          lineHeight: 1.65,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          marginBottom: "0.55em",
          textAlign: "justify",
          hyphens: "auto" as const,
        }}
        {...props}
      >
        {children}
      </p>
    ),
    blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
      <blockquote
        className="bg-muted/20 border-l-2 border-primary/30"
        style={{
          margin: "1rem 0",
          padding: "8px 14px",
          fontSize: 14,
          lineHeight: 1.6,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontStyle: "italic",
        }}
        {...props}
      >
        {children}
      </blockquote>
    ),
    code: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <code
        className="text-primary/80 bg-primary/[0.06]"
        style={{
          fontFamily: "ui-monospace, 'Cascadia Code', monospace",
          fontSize: "0.88em",
          padding: "1px 5px",
          borderRadius: 3,
        }}
        {...props}
      >
        {children}
      </code>
    ),
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <strong className="text-foreground font-semibold" {...props}>{children}</strong>
    ),
    ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
      <ul
        className="text-foreground/80"
        style={{
          paddingLeft: 20,
          marginBottom: "0.55em",
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: 15,
          lineHeight: 1.65,
        }}
        {...props}
      >
        {children}
      </ul>
    ),
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
      <li style={{ marginBottom: 3 }} {...props}>{children}</li>
    ),
  };
}

const DeepDiveLensRenderer: React.FC<LensRendererProps> = ({
  title,
  contentMarkdown,
  sources,
  synthesizing = false,
}) => {
  const { abstract, rest } = useMemo(() => extractAbstract(contentMarkdown), [contentMarkdown]);
  const sectionCounter = useMemo(() => ({ current: 0 }), [contentMarkdown]);
  const components = useMemo(() => createDeepDiveComponents(sectionCounter), [sectionCounter]);
  const sourceMetas = useMemo(() => sources.map(normalizeSource), [sources]);

  if (synthesizing && !contentMarkdown.trim()) {
    return (
      <div className="space-y-3 py-8">
        {[100, 100, 95, 100, 90, 100, 85, 100].map((w, i) => (
          <div key={i} className="animate-pulse rounded" style={{ height: 12, width: `${w}%`, background: "hsl(var(--muted-foreground) / 0.06)" }} />
        ))}
        <p className="text-muted-foreground/40 italic text-xs mt-4">Synthesizing technical analysis…</p>
      </div>
    );
  }

  return (
    <article style={{ maxWidth: 740, margin: "0 auto" }}>
      {/* Journal-style title */}
      <h1
        className="text-foreground"
        style={{
          fontSize: "1.6rem",
          fontWeight: 700,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          lineHeight: 1.2,
          marginBottom: 6,
          textAlign: "center",
        }}
      >
        {title}
      </h1>

      {/* Byline */}
      <p
        className="text-muted-foreground/40 text-center"
        style={{
          fontSize: 12,
          fontFamily: "ui-monospace, monospace",
          letterSpacing: "0.06em",
          marginBottom: 12,
        }}
      >
        UOR Knowledge · Technical Review
      </p>

      {/* Source pills */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <SourcesPills sources={sourceMetas} />
      </div>

      {/* Abstract */}
      {abstract && (
        <div
          className="bg-muted/15 border border-border/15"
          style={{
            borderRadius: 6,
            padding: "14px 18px",
            marginBottom: 28,
          }}
        >
          <span
            className="text-foreground/60"
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              display: "block",
              marginBottom: 6,
            }}
          >
            Abstract
          </span>
          <div
            className="text-foreground/75"
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontStyle: "italic",
            }}
          >
            <ReactMarkdown components={{
              p: ({ children }) => <p style={{ margin: 0 }}>{children}</p>,
            }}>
              {abstract}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Body — dense layout with CSS columns on wide screens */}
      <div
        style={{
          columnCount: 1,
          columnGap: 32,
        }}
        className="lg:[column-count:2]"
      >
        <CitedMarkdown markdown={rest || contentMarkdown} sources={sourceMetas} components={components} />

        {synthesizing && (
          <span className="inline-block bg-primary/70" style={{ width: 2, height: 16, verticalAlign: "text-bottom", marginLeft: 2, animation: "blink-cursor 0.8s steps(2) infinite" }} />
        )}
      </div>
      <style>{`@keyframes blink-cursor { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>

      {/* References (journal style) */}
      {sourceMetas.length > 0 && (
        <div className="border-t border-border/15 mt-8 pt-4">
          <span className="text-foreground/50 text-[11px] uppercase tracking-[0.1em] font-bold">References</span>
          <ol className="mt-2 space-y-1 list-decimal list-inside">
            {sourceMetas.map((s, i) => (
              <li key={i} className="text-muted-foreground/50" style={{ fontSize: 12, fontFamily: "ui-monospace, monospace" }}>
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                  className="text-primary/60 hover:text-primary transition-colors underline underline-offset-2 decoration-primary/20">
                  {s.domain}
                </a>
                <span className="text-muted-foreground/30 ml-2" style={{ fontSize: 9 }}>
                  uor:{s.uorHash}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
};

export default DeepDiveLensRenderer;
