/**
 * MagazineLensRenderer — The Atlantic / National Geographic style.
 * Drop cap, pull-quotes, full-bleed hero image, inline media between sections.
 *
 * Uses AdaptiveContentContainer context for fluid, container-aware typography.
 */

import React, { useMemo } from "react";
import BalancedHeading from "../BalancedHeading";
import BalancedBlock from "../BalancedBlock";
import CitedMarkdown from "../CitedMarkdown";
import SourcesPills from "../SourcesPills";
import { InlineFigure, InlineVideo, InlineAudio, distributeMediaAcrossSections } from "../InlineMedia";
import { normalizeSource } from "../../lib/citation-parser";
import type { SourceMeta } from "../../lib/citation-parser";
import type { MediaData } from "../../lib/stream-knowledge";
import { useContainerWidth } from "../AdaptiveContentContainer";
import { FONTS } from "../../lib/pretext-layout";

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

function splitIntoSections(md: string): string[] {
  const parts = md.split(/(?=\n## )/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function createMagazineComponents(isFirstParagraph: { current: boolean }, bodyMaxWidth: number) {
  return {
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = typeof children === "string" ? children : String(children);
      return (
        <h2
          id={slugify(text)}
          className="text-foreground"
          style={{
            fontSize: "clamp(1.4rem, 3vw, 2rem)",
            fontWeight: 700,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            marginTop: "3rem",
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
      <h3 className="text-foreground/90" style={{ fontSize: "clamp(1.1rem, 2vw, 1.4rem)", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "2rem", marginBottom: "0.6rem", letterSpacing: "-0.02em", lineHeight: 1.2 }} {...props}>{children}</h3>
    ),
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
      const isFirst = isFirstParagraph.current;
      if (isFirst) isFirstParagraph.current = false;
      return (
        <p className={`text-foreground/80 ${isFirst ? "magazine-drop-cap" : ""}`} style={{ fontSize: 17, lineHeight: 1.85, fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "1.2em", maxWidth: bodyMaxWidth }} {...props}>{children}</p>
      );
    },
    blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
      <blockquote className="border-l-4 border-primary/30" style={{ margin: "2.5rem 0", padding: "1rem 1.5rem", fontSize: 22, fontStyle: "italic", lineHeight: 1.5, fontFamily: "Georgia, 'Times New Roman', serif", color: "hsl(var(--foreground) / 0.65)", maxWidth: Math.min(900, bodyMaxWidth * 1.25) }} {...props}>{children}</blockquote>
    ),
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <strong className="text-foreground font-bold" {...props}>{children}</strong>
    ),
    ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
      <ul className="text-foreground/80" style={{ paddingLeft: 24, marginBottom: "1em", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 17, lineHeight: 1.85, maxWidth: bodyMaxWidth }} {...props}>{children}</ul>
    ),
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
      <li style={{ marginBottom: 6 }} {...props}>{children}</li>
    ),
  };
}

const TITLE_FONT_SIZES = [
  { font: "800 36px 'DM Sans', system-ui, sans-serif", lineHeight: 40, fontSize: "3.2rem" },
  { font: "800 32px 'DM Sans', system-ui, sans-serif", lineHeight: 35, fontSize: "2.6rem" },
  { font: "800 28px 'DM Sans', system-ui, sans-serif", lineHeight: 32, fontSize: "2.2rem" },
  { font: "800 24px 'DM Sans', system-ui, sans-serif", lineHeight: 28, fontSize: "1.8rem" },
];

const MagazineLensRenderer: React.FC<LensRendererProps> = ({
  title,
  contentMarkdown,
  sources,
  synthesizing = false,
  media,
}) => {
  const { bodyMaxWidth } = useContainerWidth();
  const pullQuote = useMemo(() => extractPullQuote(contentMarkdown), [contentMarkdown]);
  const isFirstParagraph = useMemo(() => ({ current: true }), [contentMarkdown]);
  const components = useMemo(() => createMagazineComponents(isFirstParagraph, bodyMaxWidth), [isFirstParagraph, bodyMaxWidth]);
  const sourceMetas = useMemo(() => sources.map(normalizeSource), [sources]);
  const sections = useMemo(() => splitIntoSections(contentMarkdown), [contentMarkdown]);
  const inlineImageMap = useMemo(
    () => media ? distributeMediaAcrossSections(contentMarkdown, media.images.slice(1), 4) : new Map(),
    [contentMarkdown, media]
  );

  const heroImage = media?.images?.[0];

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
    <article style={{ margin: "0 auto" }}>
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

      {heroImage && !synthesizing && (
        <InlineFigure image={heroImage} variant="full-width" className="mb-8 -mx-6 sm:-mx-4 md:mx-0" />
      )}

      <BalancedHeading
        font="800 32px 'DM Sans', system-ui, sans-serif"
        lineHeight={35}
        as="h1"
        className="text-foreground"
        style={{ fontWeight: 800, fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 12 }}
        fontSizes={TITLE_FONT_SIZES}
        maxLines={3}
      >
        {title}
      </BalancedHeading>

      <p className="text-muted-foreground/40" style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 500, marginBottom: pullQuote ? 20 : 32 }}>
        UOR Knowledge · Feature
      </p>

      <SourcesPills sources={sourceMetas} />

      {pullQuote && (
        <BalancedBlock
          font={FONTS.georgiaPullQuote}
          lineHeight={33}
          as="div"
          className="border-l-4 border-primary/25"
          style={{ padding: "12px 20px", marginBottom: 32, fontSize: 20, fontStyle: "italic", lineHeight: 1.5, fontFamily: "Georgia, 'Times New Roman', serif", color: "hsl(var(--foreground) / 0.6)" }}
          maxWidth={Math.min(900, bodyMaxWidth * 1.25)}
        >
          {`"${pullQuote}"`}
        </BalancedBlock>
      )}

      {media?.audio && media.audio.length > 0 && !synthesizing && (
        <InlineAudio audio={media.audio[0]} className="mb-6" />
      )}

      {sections.length > 1 ? (
        sections.map((section, idx) => {
          const inlineImg = inlineImageMap.get(idx);
          const showInline = idx > 0 && inlineImg && !synthesizing;
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

      <div style={{ clear: "both" }} />

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
