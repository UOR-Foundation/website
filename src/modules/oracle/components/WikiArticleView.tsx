/**
 * WikiArticleView — Wikipedia-style article renderer for KnowledgeCard content.
 *
 * Features:
 * - Right-floated infobox sidebar with thumbnail, taxonomy, and Wikidata link
 * - Clickable table of contents parsed from ## headers
 * - Section headers with bottom border (Wikipedia convention)
 * - Serif body text, encyclopedic typography
 * - "From UOR Knowledge, the universal encyclopedia" tagline
 */

import React, { useMemo, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import CitedMarkdown from "./CitedMarkdown";
import SourcesPills from "./SourcesPills";
import { EncyclopediaMedia } from "./MediaGallery";
import { normalizeSource } from "../lib/citation-parser";
import type { SourceMeta } from "../lib/citation-parser";
import type { MediaData } from "../lib/stream-knowledge";

/* ── Types ───────────────────────────────────────────────────────────── */

interface WikiArticleViewProps {
  title: string;
  contentMarkdown: string;
  wikidata?: Record<string, unknown> | null;
  sources: string[];
  synthesizing?: boolean;
  media?: MediaData;
  immersive?: boolean;
}

interface TocEntry {
  id: string;
  text: string;
  index: number;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseToc(markdown: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const lines = markdown.split("\n");
  let idx = 0;
  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      idx++;
      entries.push({
        id: slugify(match[1]),
        text: match[1].trim(),
        index: idx,
      });
    }
  }
  return entries;
}

function splitLeadAndBody(markdown: string): { lead: string; body: string } {
  const lines = markdown.split("\n");
  const firstHeadingIdx = lines.findIndex((l) => /^##\s+/.test(l));
  if (firstHeadingIdx <= 0) return { lead: "", body: markdown };
  return {
    lead: lines.slice(0, firstHeadingIdx).join("\n").trim(),
    body: lines.slice(firstHeadingIdx).join("\n").trim(),
  };
}

/* ── Infobox ─────────────────────────────────────────────────────────── */

const Infobox: React.FC<{
  title: string;
  wikidata: Record<string, unknown>;
}> = ({ title, wikidata }) => {
  const thumbnail = wikidata.thumbnail as string | undefined;
  const description = wikidata.description as string | undefined;
  const qid = wikidata.qid as string | undefined;
  const taxonomy = wikidata.taxonomy as Record<string, string> | undefined;
  const facts = wikidata.facts as Record<string, string> | undefined;

  return (
    <div
      className="bg-muted/20 border border-border/20"
      style={{
        float: "right",
        width: window.innerWidth < 768 ? "100%" : 280,
        marginLeft: window.innerWidth < 768 ? 0 : 24,
        marginBottom: 16,
        borderRadius: 8,
        overflow: "hidden",
        fontSize: 13,
      }}
    >
      {/* Infobox title */}
      <div
        className="bg-muted/40 text-foreground"
        style={{
          padding: "10px 14px",
          fontWeight: 700,
          fontSize: 15,
          textAlign: "center",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        {title}
      </div>

      {/* Thumbnail */}
      {thumbnail && (
        <div style={{ padding: "12px 14px 8px" }}>
          <img
            src={thumbnail}
            alt={title}
            style={{
              width: "100%",
              borderRadius: 6,
              objectFit: "cover",
              maxHeight: 220,
            }}
          />
          {description && (
            <p
              className="text-muted-foreground/60"
              style={{
                fontSize: 11,
                fontStyle: "italic",
                textAlign: "center",
                marginTop: 6,
                lineHeight: 1.4,
              }}
            >
              {description}
            </p>
          )}
        </div>
      )}

      {/* Taxonomy / Scientific classification */}
      {taxonomy && Object.keys(taxonomy).length > 0 && (
        <div style={{ padding: "8px 14px 12px" }}>
          <div
            className="text-foreground/70"
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Scientific classification
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {Object.entries(taxonomy).map(([key, val]) => (
                <tr
                  key={key}
                  className="border-b border-border/10"
                  style={{ lineHeight: 1.5 }}
                >
                  <td
                    className="text-muted-foreground/60"
                    style={{
                      padding: "4px 6px 4px 0",
                      fontWeight: 600,
                      fontSize: 12,
                      verticalAlign: "top",
                    }}
                  >
                    {key}
                  </td>
                  <td
                    className="text-foreground/80"
                    style={{
                      padding: "4px 0",
                      fontSize: 12,
                      fontStyle: key === "Species" || key === "Genus" ? "italic" : "normal",
                    }}
                  >
                    {val}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Wikidata structured facts */}
      {facts && Object.keys(facts).length > 0 && (
        <div style={{ padding: "8px 14px 12px" }}>
          <div
            className="text-foreground/70"
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Quick facts
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {Object.entries(facts).map(([key, val]) => (
                <tr
                  key={key}
                  className="border-b border-border/10"
                  style={{ lineHeight: 1.5 }}
                >
                  <td
                    className="text-muted-foreground/60"
                    style={{
                      padding: "4px 6px 4px 0",
                      fontWeight: 600,
                      fontSize: 12,
                      verticalAlign: "top",
                    }}
                  >
                    {key}
                  </td>
                  <td
                    className="text-foreground/80"
                    style={{ padding: "4px 0", fontSize: 12 }}
                  >
                    {val}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Wikidata QID */}
      {qid && (
        <div
          className="border-t border-border/15"
          style={{ padding: "8px 14px", textAlign: "center" }}
        >
          <a
            href={`https://www.wikidata.org/wiki/${qid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/70 hover:text-primary transition-colors"
            style={{
              fontSize: 11,
              fontFamily: "ui-monospace, monospace",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Wikidata: {qid}
          </a>
        </div>
      )}
    </div>
  );
};

/* ── Table of Contents ───────────────────────────────────────────────── */

const TableOfContents: React.FC<{
  entries: TocEntry[];
  defaultCollapsed?: boolean;
}> = ({ entries, defaultCollapsed = false }) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (entries.length < 2) return null;

  return (
    <div
      className="bg-muted/15 border border-border/20"
      style={{
        borderRadius: 6,
        padding: collapsed ? "8px 14px" : "10px 14px 14px",
        marginBottom: 20,
        maxWidth: 340,
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <span
          className="text-foreground/80"
          style={{ fontSize: 13, fontWeight: 700 }}
        >
          Contents
        </span>
        <span className="text-muted-foreground/40" style={{ fontSize: 11 }}>
          [{collapsed ? "show" : "hide"}]
        </span>
      </div>
      {!collapsed && (
        <ol
          style={{
            margin: "8px 0 0",
            paddingLeft: 20,
            listStyleType: "decimal",
          }}
        >
          {entries.map((e) => (
            <li key={e.id} style={{ marginBottom: 3 }}>
              <button
                onClick={() => handleClick(e.id)}
                className="text-primary/70 hover:text-primary transition-colors"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  padding: 0,
                  textAlign: "left",
                  lineHeight: 1.5,
                }}
              >
                {e.text}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

/* ── Shimmer Skeleton ────────────────────────────────────────────────── */

const SynthesizingSkeleton: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
    {/* Fake infobox skeleton */}
    <div
      className="bg-muted/10 border border-border/10"
      style={{
        float: "right",
        width: 280,
        height: 320,
        marginLeft: 24,
        marginBottom: 16,
        borderRadius: 8,
      }}
    >
      <div className="animate-pulse bg-muted/20" style={{ height: 40, borderRadius: "8px 8px 0 0" }} />
      <div className="animate-pulse bg-muted/15" style={{ height: 180, margin: "12px 14px" }} />
    </div>
    {/* Fake text skeleton */}
    <div className="space-y-3">
      {[100, 95, 88, 70, 92, 98, 82, 60, 90, 75, 85, 50].map((w, i) => (
        <div
          key={i}
          className="animate-pulse rounded"
          style={{
            height: 14,
            width: `${w}%`,
            background: "hsl(var(--muted-foreground) / 0.07)",
          }}
        />
      ))}
    </div>
    <p style={{ fontSize: 11, fontStyle: "italic", clear: "both" }} className="text-muted-foreground/40">
      Synthesizing encyclopedic article…
    </p>
  </div>
);

/* ── Custom markdown components with Wikipedia styling ───────────────── */

function createMarkdownComponents() {
  return {
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = typeof children === "string" ? children : String(children);
      const id = slugify(text);
      return (
        <h2
          id={id}
          className="text-foreground border-b border-border/25"
          style={{
            fontSize: "1.35rem",
            fontWeight: 600,
            fontFamily: "Georgia, 'Times New Roman', serif",
            paddingBottom: 4,
            marginTop: "1.8rem",
            marginBottom: "0.6rem",
            lineHeight: 1.3,
          }}
          {...props}
        >
          {children}
        </h2>
      );
    },
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p
        className="text-foreground/85"
        style={{
          fontSize: 16,
          lineHeight: 1.8,
          fontFamily: "Georgia, 'Times New Roman', serif",
          marginBottom: "0.7em",
        }}
        {...props}
      >
        {children}
      </p>
    ),
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <strong className="text-foreground font-semibold" {...props}>
        {children}
      </strong>
    ),
    ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
      <ul
        style={{
          paddingLeft: 24,
          marginBottom: "0.7em",
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 16,
          lineHeight: 1.8,
        }}
        className="text-foreground/85"
        {...props}
      >
        {children}
      </ul>
    ),
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
      <li style={{ marginBottom: 4 }} {...props}>
        {children}
      </li>
    ),
  };
}

/* ── Main Component ──────────────────────────────────────────────────── */

const WikiArticleView: React.FC<WikiArticleViewProps> = ({
  title,
  contentMarkdown,
  wikidata,
  sources,
  synthesizing = false,
  media,
  immersive = false,
}) => {
  const isMobileView = typeof window !== "undefined" && window.innerWidth < 768;
  const isWideImmersive = immersive && typeof window !== "undefined" && window.innerWidth >= 1024;
  const toc = useMemo(() => parseToc(contentMarkdown), [contentMarkdown]);
  const { lead, body } = useMemo(() => splitLeadAndBody(contentMarkdown), [contentMarkdown]);
  const markdownComponents = useMemo(() => createMarkdownComponents(immersive), [immersive]);
  const sourceMetas = useMemo(() => sources.map(normalizeSource), [sources]);

  // Show skeleton only when synthesizing AND no content yet
  if (synthesizing && !contentMarkdown.trim()) {
    return <SynthesizingSkeleton />;
  }

  return (
    <article style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* ── Title ── */}
      <h1
        className="text-foreground"
        style={{
          fontSize: "1.85rem",
          fontWeight: 400,
          fontFamily: "Georgia, 'Times New Roman', serif",
          lineHeight: 1.2,
          margin: 0,
          paddingBottom: 4,
          borderBottom: "1px solid hsl(var(--border) / 0.25)",
        }}
      >
        {title}
      </h1>

      {/* ── Tagline ── */}
      <p
        className="text-muted-foreground/50"
        style={{
          fontSize: 12,
          fontStyle: "italic",
          margin: "6px 0 12px",
        }}
      >
        From UOR Knowledge, the universal encyclopedia
      </p>

      {/* ── Source pills ── */}
      <SourcesPills sources={sourceMetas} />

      {/* ── Infobox (floated right) ── */}
      {wikidata && <Infobox title={title} wikidata={wikidata} />}

      {/* ── Table of Contents ── */}
      <TableOfContents entries={toc} defaultCollapsed={isMobileView} />

      {/* ── Lead paragraph ── */}
      {lead && (
        <div style={{ marginBottom: 16 }}>
          <CitedMarkdown markdown={lead} sources={sourceMetas} components={markdownComponents} />
        </div>
      )}

      {/* ── Body sections ── */}
      <div>
        <CitedMarkdown markdown={body} sources={sourceMetas} components={markdownComponents} />
        {/* Typing cursor while streaming */}
        {synthesizing && (
          <span
            className="inline-block bg-primary/70"
            style={{
              width: 2,
              height: 18,
              verticalAlign: "text-bottom",
              marginLeft: 2,
              animation: "blink-cursor 0.8s steps(2) infinite",
            }}
          />
        )}
      </div>
      <style>{`@keyframes blink-cursor { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>

      {/* ── Clear float ── */}
      <div style={{ clear: "both" }} />

      {/* ── Media section ── */}
      {media && !synthesizing && <EncyclopediaMedia media={media} />}

      {/* ── Sources footer ── */}
      {sources.length > 0 && (
        <div
          className="border-t border-border/20"
          style={{
            marginTop: 32,
            paddingTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <span
            className="text-muted-foreground/40"
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              fontWeight: 600,
            }}
          >
            References
          </span>
          <ol className="mt-2 space-y-1 list-decimal list-inside">
            {sourceMetas.map((s, i) => (
              <li
                key={i}
                className="text-muted-foreground/50"
                style={{ fontSize: 12 }}
              >
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary/60 hover:text-primary transition-colors underline underline-offset-2 decoration-primary/20"
                >
                  {s.domain}
                </a>
                <span
                  className="text-muted-foreground/30 ml-2"
                  style={{ fontSize: 9, fontFamily: "ui-monospace, monospace" }}
                >
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

export default WikiArticleView;
