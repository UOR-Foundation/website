/**
 * MagazineLensRenderer — The Atlantic / National Geographic style.
 * Drop cap, pull-quotes, full-bleed hero image, inline media between sections.
 */

import React, { useMemo } from "react";
import CitedMarkdown from "../CitedMarkdown";
import SourcesPills from "../SourcesPills";
import { InlineFigure, InlineVideo, InlineAudio, distributeMediaAcrossSections } from "../InlineMedia";
import { normalizeSource } from "../../lib/citation-parser";
import type { SourceMeta } from "../../lib/citation-parser";
import type { MediaData } from "../../lib/stream-knowledge";

interface LensRendererProps {
  title: string;
  contentMarkdown: string;
  wikidata?: Record<string, unknown> | null;
  sources: string[];
  synthesizing?: boolean;
  media?: MediaData;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function extractPullQuote(md: string): string | null {
  const match = md.match(/^>\s*(.+)$/m);
  if (match) return match[1].replace(/^\*+|\*+$/g, "");
  const boldMatch = md.match(/\*\*([^*]{30,120})\*\*/);
  return boldMatch ? boldMatch[1] : null;
}

/** Split markdown into sections by ## headings for inline media placement */
function splitIntoSections(md: string): string[] {
  const parts = md.split(/(?=\n## )/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function createMagazineComponents(isFirstParagraph: { current: boolean }) {
  return {
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = typeof children === "string" ? children : String(children);
      return (
        <h2
          id={slugify(text)}
          className="text-foreground"
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            letterSpacing: "-0.02em",
            marginTop: "2.8rem",
            marginBottom: "1rem",
            paddingBottom: 12,
            borderBottom: "none",
            position: "relative",
          }}
          {...props}
        >
          {children}
          <span className="block text-center text-primary/30" style={{ position: "absolute", bottom: 0, left: 0, right: 0, fontSize: 14, letterSpacing: "0.5em" }}>
            ◆ ◆ ◆
          </span>
        </h2>
      );
    },
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3 className="text-foreground/90" style={{ fontSize: "1.15rem", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "2rem", marginBottom: "0.6rem", letterSpacing: "-0.01em" }} {...props}>{children}</h3>
    ),
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
      const isFirst = isFirstParagraph.current;
      if (isFirst) isFirstParagraph.current = false;
      return (
        <p className={`text-foreground/80 ${isFirst ? "magazine-drop-cap" : ""}`} style={{ fontSize: 17, lineHeight: 1.85, fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "1.2em" }} {...props}>{children}</p>
      );
    },
    blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
      <blockquote className="border-l-4 border-primary/30" style={{ margin: "2rem 0", padding: "1rem 1.5rem", fontSize: 22, fontStyle: "italic", lineHeight: 1.5, fontFamily: "Georgia, 'Times New Roman', serif", color: "hsl(var(--foreground) / 0.65)" }} {...props}>{children}</blockquote>
    ),
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <strong className="text-foreground font-bold" {...props}>{children}</strong>
    ),
    ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
      <ul className="text-foreground/80" style={{ paddingLeft: 24, marginBottom: "1em", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 17, lineHeight: 1.85 }} {...props}>{children}</ul>
    ),
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
      <li style={{ marginBottom: 6 }} {...props}>{children}</li>
    ),
  };
}

const MagazineLensRenderer: React.FC<LensRendererProps> = ({
  title,
  contentMarkdown,
  sources,
  synthesizing = false,
  media,
}) => {
  const pullQuote = useMemo(() => extractPullQuote(contentMarkdown), [contentMarkdown]);
  const isFirstParagraph = useMemo(() => ({ current: true }), [contentMarkdown]);
  const components = useMemo(() => createMagazineComponents(isFirstParagraph), [isFirstParagraph]);
  const sourceMetas = useMemo(() => sources.map(normalizeSource), [sources]);
  const sections = useMemo(() => splitIntoSections(contentMarkdown), [contentMarkdown]);
  const inlineImages = useMemo(
    () => media ? distributeMediaAcrossSections(contentMarkdown, media.images, 4) : new Map(),
    [contentMarkdown, media]
  );

  // Hero image = first available image
  const heroImage = media?.images?.[0];
  // Remaining images for inline distribution (skip hero)
  const inlinePool = media?.images?.slice(1) || [];

  if (synthesizing && !contentMarkdown.trim()) {
    return (
      <div className="space-y-4 py-8">
        {[90, 100, 85, 70, 95, 88].map((w, i) => (
          <div key={i} className="animate-pulse rounded" style={{ height: 16, width: `${w}%`, background: "hsl(var(--muted-foreground) / 0.07)" }} />
        ))}
        <p className="text-muted-foreground/40 italic text-sm mt-4">Composing magazine feature…</p>
      </div>
    );
  }

  return (
    <article style={{ maxWidth: 680, margin: "0 auto" }}>
      <style>{`
        .magazine-drop-cap::first-letter {
          float: left;
          font-size: 3.8em;
          line-height: 0.8;
          font-weight: 700;
          font-family: Georgia, 'Times New Roman', serif;
          color: hsl(var(--primary));
          margin-right: 0.08em;
          margin-top: 0.05em;
        }
      `}</style>

      {/* Hero image — full-bleed at top */}
      {heroImage && !synthesizing && (
        <InlineFigure image={heroImage} variant="full-width" className="mb-8 -mx-4 sm:mx-0" />
      )}

      {/* Title */}
      <h1 className="text-foreground" style={{ fontSize: "2.4rem", fontWeight: 800, fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 12 }}>
        {title}
      </h1>

      <p className="text-muted-foreground/40" style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 500, marginBottom: pullQuote ? 20 : 32 }}>
        UOR Knowledge · Feature
      </p>

      <SourcesPills sources={sourceMetas} />

      {/* Hero pull-quote */}
      {pullQuote && (
        <div className="border-l-4 border-primary/25" style={{ padding: "12px 20px", marginBottom: 32, fontSize: 20, fontStyle: "italic", lineHeight: 1.5, fontFamily: "Georgia, 'Times New Roman', serif", color: "hsl(var(--foreground) / 0.6)" }}>
          "{pullQuote}"
        </div>
      )}

      {/* Audio pronunciation if available */}
      {media?.audio && media.audio.length > 0 && !synthesizing && (
        <InlineAudio audio={media.audio[0]} className="mb-6" />
      )}

      {/* Content with inline images woven between sections */}
      {sections.length > 1 ? (
        sections.map((section, idx) => {
          const inlineImg = inlinePool[idx % inlinePool.length];
          const showInline = idx > 0 && idx <= 3 && inlineImg && !synthesizing;
          return (
            <React.Fragment key={idx}>
              <CitedMarkdown markdown={section} sources={sourceMetas} components={components} />
              {showInline && (
                <InlineFigure
                  image={inlineImg}
                  variant={idx % 2 === 0 ? "float-right" : "pull-left"}
                  className="my-4"
                />
              )}
            </React.Fragment>
          );
        })
      ) : (
        <CitedMarkdown markdown={contentMarkdown} sources={sourceMetas} components={components} />
      )}

      {synthesizing && (
        <span className="inline-block bg-primary/70" style={{ width: 2, height: 18, verticalAlign: "text-bottom", marginLeft: 2, animation: "blink-cursor 0.8s steps(2) infinite" }} />
      )}
      <style>{`@keyframes blink-cursor { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>

      {/* Clear floats */}
      <div style={{ clear: "both" }} />

      {/* Video section */}
      {media && media.videos.length > 0 && !synthesizing && (
        <div className="mt-8 mb-4">
          <p className="text-muted-foreground/40 text-xs uppercase tracking-widest font-semibold mb-3">Watch More</p>
          <InlineVideo video={media.videos[0]} variant="cinematic" />
          {media.videos.length > 1 && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              {media.videos.slice(1, 3).map((v, i) => (
                <InlineVideo key={i} video={v} variant="compact" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* References footer */}
      {sourceMetas.length > 0 && !synthesizing && (
        <div className="border-t border-border/15 mt-10 pt-5">
          <span className="text-muted-foreground/35 text-[11px] uppercase tracking-[0.12em] font-semibold">References</span>
          <ol className="mt-2 space-y-1 list-decimal list-inside">
            {sourceMetas.map((s, i) => (
              <li key={i} className="text-muted-foreground/50" style={{ fontSize: 12 }}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary/60 hover:text-primary transition-colors underline underline-offset-2 decoration-primary/20">
                  {s.title || s.domain}
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
};

export default MagazineLensRenderer;
