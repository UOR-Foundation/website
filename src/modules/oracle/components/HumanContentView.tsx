/**
 * HumanContentView — Research-informed, typographically rich renderer
 * for UOR address content in human-readable mode.
 *
 * Design principles:
 * - Visual hierarchy via typographic scale (title → label → body → meta)
 * - Serif for long-form text to reduce cognitive load
 * - Type-aware headers (Concept, Fork, Query, Chain, etc.)
 * - Pull-quote treatment for definitions
 * - Progressive disclosure for nested objects
 * - Semantic Web Tower visualization for WebPage types
 */

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import SemanticWebTower from "./SemanticWebTower";
import ShadowHtmlRenderer from "./ShadowHtmlRenderer";
import { engineType, crateVersion } from "@/lib/wasm/uor-bridge";

/* ── Type color mapping ──────────────────────────────────────────────── */

const TYPE_STYLES: Record<string, { color: string; bg: string }> = {
  Concept:     { color: "hsl(var(--primary))",          bg: "hsl(var(--primary) / 0.08)" },
  Fork:        { color: "hsl(270 60% 65%)",             bg: "hsl(270 60% 65% / 0.08)" },
  Query:       { color: "hsl(210 80% 60%)",             bg: "hsl(210 80% 60% / 0.08)" },
  Response:    { color: "hsl(160 60% 50%)",             bg: "hsl(160 60% 50% / 0.08)" },
  Chain:       { color: "hsl(30 80% 55%)",              bg: "hsl(30 80% 55% / 0.08)" },
  ChainLink:   { color: "hsl(30 80% 55%)",              bg: "hsl(30 80% 55% / 0.08)" },
  Datum:       { color: "hsl(var(--primary))",          bg: "hsl(var(--primary) / 0.08)" },
  Observable:  { color: "hsl(190 70% 50%)",             bg: "hsl(190 70% 50% / 0.08)" },
  Derivation:  { color: "hsl(340 60% 55%)",             bg: "hsl(340 60% 55% / 0.08)" },
  WebPage:     { color: "hsl(200 70% 55%)",             bg: "hsl(200 70% 55% / 0.08)" },
};

const DEFAULT_STYLE = { color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted) / 0.15)" };

/* ── Label mapping ───────────────────────────────────────────────────── */

const LABEL_MAP: Record<string, string> = {
  "@type": "Type",
  "@id": "Address",
  "@context": "",
  "uor:label": "Label",
  "uor:definition": "Definition",
  "uor:domain": "Domain",
  "uor:enables": "Enables",
  "uor:properties": "Properties",
  "uor:sourceAddress": "Source Address",
  "uor:forkNote": "Fork Note",
  "uor:parentAddress": "Parent Address",
  "uor:childAddress": "Child Address",
  "uor:query": "Query",
  "uor:response": "Response",
  "uor:timestamp": "Timestamp",
  "uor:chainLength": "Chain Length",
  "uor:links": "Links",
  "uor:position": "Position",
  "uor:proofAddress": "Proof Address",
  "uor:proofCid": "Proof CID",
  "uor:sourceUrl": "Source",
  "uor:content": "Content",
  "uor:title": "Title",
  "uor:description": "Description",
  "uor:language": "Language",
  "uor:linkedResources": "Linked Resources",
  "uor:scrapedAt": "Encoded At",
  "uor:existingSemantics": "Existing Semantics",
  "uor:semanticWebLayers": "Semantic Web Layers",
  "uor:wikidata": "",
};

function humanLabel(key: string): string {
  if (LABEL_MAP[key] !== undefined) return LABEL_MAP[key];
  return key
    .replace(/^(uor|schema):/, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/* ── Metadata keys (rendered in footer) ──────────────────────────────── */

const META_KEYS = new Set([
  "uor:timestamp", "uor:position", "uor:chainLength",
  "uor:proofAddress", "uor:proofCid", "uor:scrapedAt",
  "uor:language",
]);

/* ── Title keys (rendered as the main heading) ───────────────────────── */

const TITLE_KEYS = ["uor:label", "uor:query", "uor:title", "@id"];

/* ── Long text keys (always get serif treatment) ─────────────────────── */

const LONG_TEXT_KEYS = new Set([
  "uor:definition", "uor:response", "uor:forkNote", "uor:content",
]);

/* ── Component ───────────────────────────────────────────────────────── */

interface HumanContentViewProps {
  source: unknown;
}

const HumanContentView: React.FC<HumanContentViewProps> = ({ source }) => {
  const src = source as Record<string, unknown> | null;
  if (!src || typeof src !== "object") {
    return (
      <p style={{ fontSize: 17, lineHeight: 1.75, fontFamily: "Georgia, 'Times New Roman', serif" }}
        className="text-foreground/80">
        {String(source)}
      </p>
    );
  }

  // Extract type
  const rawType = typeof src["@type"] === "string" ? src["@type"].replace(/^uor:/, "") : null;
  const typeStyle = rawType ? (TYPE_STYLES[rawType] ?? DEFAULT_STYLE) : null;

  // Extract title
  let title: string | null = null;
  for (const k of TITLE_KEYS) {
    if (typeof src[k] === "string" && src[k]) {
      title = src[k] as string;
      break;
    }
  }

  // Partition entries
  const entries = Object.entries(src).filter(([key]) => key !== "@context");
  const metaEntries = entries.filter(([key]) => META_KEYS.has(key));
  const titleKey = TITLE_KEYS.find((k) => typeof src[k] === "string" && src[k]);
  const bodyEntries = entries.filter(
    ([key]) => key !== "@type" && key !== "@context" && key !== titleKey && !META_KEYS.has(key) && key !== "uor:semanticWebLayers" && key !== "uor:wikidata"
  );

  // Wikipedia data
  const wikidata = src["uor:wikidata"] as Record<string, unknown> | undefined;

  // Semantic Web Tower data
  const semanticWebLayers = src["uor:semanticWebLayers"] as Record<string, string> | undefined;
  const isWebPage = rawType === "WebPage";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* ── Type pill + Title ── */}
      <header style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rawType && typeStyle && (
          <span
            style={{
              fontSize: 11,
              fontFamily: "ui-monospace, 'SF Mono', monospace",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              fontWeight: 600,
              color: typeStyle.color,
              background: typeStyle.bg,
              padding: "3px 10px",
              borderRadius: 6,
              alignSelf: "flex-start",
            }}
          >
            {rawType}
          </span>
        )}

        {/* Wikipedia-enhanced header with thumbnail */}
        {wikidata ? (
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              {title && (
                <h3
                  style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.3, margin: 0, wordBreak: "break-word" }}
                  className="text-foreground font-display"
                >
                  {title}
                </h3>
              )}
              {wikidata.description && (
                <p
                  style={{ fontSize: 15, margin: 0, fontStyle: "italic", lineHeight: 1.5 }}
                  className="text-muted-foreground/70"
                >
                  {wikidata.description as string}
                </p>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                {wikidata.qid && (
                  <a
                    href={`https://www.wikidata.org/wiki/${wikidata.qid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 11,
                      fontFamily: "ui-monospace, monospace",
                      padding: "2px 8px",
                      borderRadius: 4,
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                    className="bg-primary/10 text-primary/70 hover:text-primary transition-colors"
                  >
                    {wikidata.qid as string}
                  </a>
                )}
                <span style={{ fontSize: 10 }} className="text-muted-foreground/30">
                  Wikidata
                </span>
              </div>
            </div>
            {wikidata.thumbnail && (
              <img
                src={wikidata.thumbnail as string}
                alt={title || ""}
                style={{
                  width: 120,
                  height: 120,
                  objectFit: "cover",
                  borderRadius: 10,
                  flexShrink: 0,
                  border: "1px solid hsl(var(--border) / 0.15)",
                }}
              />
            )}
          </div>
        ) : (
          title && (
            <h3
              style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.3, margin: 0, wordBreak: "break-word" }}
              className="text-foreground font-display"
            >
              {title}
            </h3>
          )
        )}
      </header>

      {/* ── Wikipedia taxonomy card ── */}
      {wikidata?.taxonomy && typeof wikidata.taxonomy === "object" && Object.keys(wikidata.taxonomy as Record<string, string>).length > 0 && (
        <WikiTaxonomyCard taxonomy={wikidata.taxonomy as Record<string, string>} />
      )}

      {/* ── Body entries ── */}
      {bodyEntries.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {bodyEntries.map(([key, value]) => (
            <EntryRenderer key={key} entryKey={key} value={value} />
          ))}
        </div>
      )}

      {/* ── Semantic Web Tower (WebPage only) ── */}
      {isWebPage && semanticWebLayers && (
        <SemanticWebTower
          layers={semanticWebLayers}
          engine={engineType()}
          crateVersion={crateVersion()}
        />
      )}

      {/* ── Metadata footer ── */}
      {metaEntries.length > 0 && (
        <footer
          style={{
            borderTop: "1px solid hsl(var(--border) / 0.15)",
            paddingTop: 16,
            display: "flex",
            flexWrap: "wrap",
            gap: "12px 24px",
          }}
        >
          {metaEntries.map(([key, value]) => (
            <div key={key} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontWeight: 500,
                }}
                className="text-muted-foreground/40"
              >
                {humanLabel(key)}
              </span>
              <span
                style={{ fontSize: 13, fontFamily: "ui-monospace, monospace" }}
                className="text-foreground/55"
              >
                {String(value)}
              </span>
            </div>
          ))}
        </footer>
      )}
    </div>
  );
};

/* ── Entry renderer ──────────────────────────────────────────────────── */

function EntryRenderer({ entryKey, value }: { entryKey: string; value: unknown }) {
  const label = humanLabel(entryKey);
  if (!label) return null;

  // Source URL — clickable link
  if (entryKey === "uor:sourceUrl" && typeof value === "string") {
    return (
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <SectionLabel inline>{label}</SectionLabel>
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 15, textDecoration: "underline", textUnderlineOffset: 3 }}
          className="text-primary/70 hover:text-primary transition-colors"
        >
          {value}
        </a>
      </div>
    );
  }

  // Markdown content (WebPage body)
  if (entryKey === "uor:content" && typeof value === "string" && value.length > 200) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <SectionLabel>{label}</SectionLabel>
        <div
          style={{
            borderLeft: "2px solid hsl(var(--primary) / 0.3)",
            paddingLeft: 20,
            maxHeight: 400,
            overflowY: "auto",
          }}
          className="prose prose-sm dark:prose-invert max-w-none text-foreground/80"
        >
          <ReactMarkdown>{value}</ReactMarkdown>
        </div>
      </div>
    );
  }

  // Existing semantics — collapsible section
  if (entryKey === "uor:existingSemantics" && typeof value === "object" && value !== null) {
    return <CollapsibleSemantics label={label} data={value as Record<string, unknown>} />;
  }

  // Long text (definition, response, or any string > 100 chars)
  if (
    typeof value === "string" &&
    (LONG_TEXT_KEYS.has(entryKey) || value.length > 100)
  ) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <SectionLabel>{label}</SectionLabel>
        <div
          style={{
            borderLeft: "2px solid hsl(var(--primary) / 0.3)",
            paddingLeft: 20,
          }}
        >
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.75,
              fontFamily: "Georgia, 'Times New Roman', serif",
              margin: 0,
            }}
            className="text-foreground/80"
          >
            {value}
          </p>
        </div>
      </div>
    );
  }

  // Short string
  if (typeof value === "string") {
    return (
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <SectionLabel inline>{label}</SectionLabel>
        <span
          style={{ fontSize: 15 }}
          className="text-foreground/70"
        >
          {value}
        </span>
      </div>
    );
  }

  // Number / boolean
  if (typeof value === "number" || typeof value === "boolean") {
    return (
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <SectionLabel inline>{label}</SectionLabel>
        <span
          style={{ fontSize: 15, fontFamily: "ui-monospace, monospace" }}
          className="text-foreground/70"
        >
          {String(value)}
        </span>
      </div>
    );
  }

  // Array
  if (Array.isArray(value)) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <SectionLabel>{label}</SectionLabel>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
          {value.slice(0, 20).map((item, i) => (
            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, paddingLeft: 4 }}>
              <span
                style={{ width: 6, height: 6, borderRadius: "50%", marginTop: 8, flexShrink: 0 }}
                className="bg-primary/30"
              />
              {typeof item === "object" && item !== null ? (
                <NestedCard data={item as Record<string, unknown>} />
              ) : (
                <span style={{ fontSize: 16, lineHeight: 1.6 }} className="text-foreground/70">
                  {String(item)}
                </span>
              )}
            </li>
          ))}
          {value.length > 20 && (
            <li className="text-muted-foreground/40 text-xs pl-4">
              … and {value.length - 20} more
            </li>
          )}
        </ul>
      </div>
    );
  }

  // Nested object
  if (typeof value === "object" && value !== null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <SectionLabel>{label}</SectionLabel>
        <NestedCard data={value as Record<string, unknown>} />
      </div>
    );
  }

  return null;
}

/* ── Collapsible Semantics section ───────────────────────────────────── */

function CollapsibleSemantics({ label, data }: { label: string; data: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const hasData = (data as { hasStructuredData?: boolean }).hasStructuredData;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <SectionLabel>{label}</SectionLabel>
        {hasData && (
          <span
            style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4 }}
            className="bg-emerald-500/10 text-emerald-400"
          >
            found
          </span>
        )}
        <span
          style={{
            fontSize: 10,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
          className="text-muted-foreground/30"
        >
          ▼
        </span>
      </button>
      {open && <NestedCard data={data} />}
    </div>
  );
}

/* ── Nested object card ──────────────────────────────────────────────── */

function NestedCard({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([k]) => k !== "@context");
  return (
    <div
      style={{
        border: "1px solid hsl(var(--border) / 0.12)",
        borderRadius: 10,
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
      className="bg-muted/5"
    >
      {entries.map(([k, v], i) => {
        const lbl = humanLabel(k);
        const isLong = typeof v === "string" && v.length > 100;
        return (
          <div
            key={k}
            style={{
              display: "flex",
              flexDirection: isLong ? "column" : "row",
              alignItems: isLong ? "flex-start" : "baseline",
              gap: isLong ? 4 : 10,
              padding: "4px 0",
              borderBottom: i < entries.length - 1 ? "1px solid hsl(var(--border) / 0.08)" : undefined,
            }}
          >
            <span
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight: 500,
                flexShrink: 0,
                minWidth: isLong ? undefined : 90,
              }}
              className="text-muted-foreground/45"
            >
              {lbl}
            </span>
            {isLong ? (
              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.65,
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  margin: 0,
                }}
                className="text-foreground/70"
              >
                {v as string}
              </p>
            ) : (
              <span
                style={{
                  fontSize: 14,
                  fontFamily: typeof v === "number" ? "ui-monospace, monospace" : undefined,
                  wordBreak: "break-all",
                }}
                className="text-foreground/65"
              >
                {typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Wikipedia Taxonomy Card ─────────────────────────────────────────── */

function WikiTaxonomyCard({ taxonomy }: { taxonomy: Record<string, string> }) {
  const entries = Object.entries(taxonomy);
  if (entries.length === 0) return null;

  return (
    <div
      style={{
        border: "1px solid hsl(var(--border) / 0.15)",
        borderRadius: 10,
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
      className="bg-muted/5"
    >
      <span
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontWeight: 600,
          marginBottom: 4,
        }}
        className="text-muted-foreground/50"
      >
        Scientific Classification
      </span>
      {entries.map(([key, val]) => (
        <div
          key={key}
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            padding: "2px 0",
          }}
        >
          <span
            style={{
              fontSize: 12,
              minWidth: 80,
              fontWeight: 500,
              flexShrink: 0,
            }}
            className="text-muted-foreground/60"
          >
            {key}
          </span>
          <span
            style={{
              fontSize: 14,
              fontStyle: key.toLowerCase() === "species" || key.toLowerCase() === "genus" ? "italic" : undefined,
            }}
            className="text-foreground/70"
          >
            {val}
          </span>
        </div>
      ))}
    </div>
  );
}


function SectionLabel({ children, inline }: { children: React.ReactNode; inline?: boolean }) {
  return (
    <span
      style={{
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        fontWeight: 600,
        flexShrink: 0,
        ...(inline ? { minWidth: 100 } : {}),
      }}
      className="text-muted-foreground/50"
    >
      {children}
    </span>
  );
}

export default HumanContentView;
