/**
 * MagazineLensRenderer — Editorial-grade magazine layout.
 * Inspired by The Atlantic, National Geographic, and Vanity Fair online editions.
 *
 * Golden ratio (φ) proportioned typography, spacing, and rhythm.
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
import { TYPE, LINE_HEIGHT, RHYTHM, OPACITY, SPACE } from "@/modules/platform/desktop/lib/golden-ratio";

/* ─── Types ─────────────────────────────────────────────── */

interface LensRendererProps {
  title: string;
  contentMarkdown: string;
  wikidata?: Record<string, unknown> | null;
  sources: string[];
  synthesizing?: boolean;
  media?: MediaData;
}

/* ─── Helpers ───────────────────────────────────────────── */

function slugify(text: string): string {
  return text.toLowerCase().replace(/[a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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

function estimateReadingTime(md: string): number {
  const words = md.split(/\s+/).length;
  return Math.max(1, Math.round(words / 230));
}

/* ─── Component overrides ───────────────────────────────── */

function createMagazineComponents(isFirstParagraph: { current: boolean }, bodyMaxWidth: number) {
  return {
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = typeof children === "string" ? children : String(children);
      return (
        <div style={{ marginTop: "3em", marginBottom: RHYTHM.sectionSpacingBottom }}>
          {/* Thin centered rule as section divider */}
          <div className="flex justify-center" style={{ marginBottom: SPACE.lg }}>
            <div className="bg-border/40" style={{ width: 40, height: 1 }} />
          </div>
          <h2
            id={slugify(text)}
            className="text-foreground"
            style={{
              fontSize: `${TYPE.h2}px`,
              fontWeight: 700,
              fontFamily: "'DM Sans', system-ui, sans-serif",
              letterSpacing: "-0.02em",
              lineHeight: LINE_HEIGHT.heading,
              margin: 0,
            }}
            {...props}
          >
            {children}
          </h2>
        </div>
      );
    },
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3
        className="text-foreground"
        style={{
          fontSize: `${TYPE.large}px`,
          fontWeight: 600,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          marginTop: "2rem",
          marginBottom: "0.6rem",
          letterSpacing: "-0.02em",
          lineHeight: LINE_HEIGHT.heading,
          opacity: OPACITY.primary,
        }}
        {...props}
      >
        {children}
      </h3>
    ),
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
      const isFirst = isFirstParagraph.current;
      if (isFirst) isFirstParagraph.current = false;
      return (
        <p
          className={`text-foreground ${isFirst ? "magazine-drop-cap" : ""}`}
          style={{
            fontSize: 18,
            lineHeight: 1.8,
            fontFamily: "Georgia, 'Times New Roman', serif",
            marginBottom: RHYTHM.paragraphSpacing,
            maxWidth: bodyMaxWidth,
            opacity: OPACITY.primary,
          }}
          {...props}
        >
          {children}
        </p>
      );
    },
    blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
      <blockquote
        style={{
          margin: `${RHYTHM.pullQuoteMargin} 0`,
          padding: `${SPACE.md}px ${SPACE.xl}px`,
          fontSize: 22,
          fontStyle: "italic",
          lineHeight: 1.5,
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: `hsl(var(--foreground) / ${OPACITY.secondary})`,
          maxWidth: Math.min(900, bodyMaxWidth * 1.25),
          borderLeft: "none",
        }}
        {...props}
      >
        {children}
      </blockquote>
    ),
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <strong className="text-foreground font-bold" {...props}>{children}</strong>
    ),
    ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
      <ul
        className="text-foreground"
        style={{
          paddingLeft: SPACE.xl,
          marginBottom: RHYTHM.paragraphSpacing,
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 18,
          lineHeight: 1.8,
          maxWidth: bodyMaxWidth,
          opacity: OPACITY.primary,
        }}
        {...props}
      >
        {children}
      </ul>
    ),
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
      <li style={{ marginBottom: SPACE.sm }} {...props}>{children}</li>
    ),
  };
}

/* ─── Title sizes ───────────────────────────────────────── */

const TITLE_FONT_SIZES = [
  { font: "800 36px 'DM Sans', system-ui, sans-serif", lineHeight: 40, fontSize: "3.2rem" },
  { font: "800 32px 'DM Sans', system-ui, sans-serif", lineHeight: 35, fontSize: "2.6rem" },
  { font: "800 28px 'DM Sans', system-ui, sans-serif", lineHeight: 32, fontSize: "2.2rem" },
  { font: "800 24px 'DM Sans', system-ui, sans-serif", lineHeight: 28, fontSize: "1.8rem" },
];

/* ─── Main Component ────────────────────────────────────── */

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
  const readTime = useMemo(() => estimateReadingTime(contentMarkdown), [contentMarkdown]);
  const inlineImageMap = useMemo(
    () => media ? distributeMediaAcrossSections(contentMarkdown, media.images.slice(1), 4) : new Map(),
    [contentMarkdown, media]
  );

  const heroImage = media?.images?.[0];
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  /* Loading skeleton */
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
      {/* ── Drop cap & cursor animation styles ── */}
      <style>{`
        .magazine-drop-cap::first-letter {
          float: left;
          font-size: 4.2em;
          line-height: 0.78;
          font-weight: 700;
          font-family: Georgia, 'Times New Roman', serif;
          color: hsl(var(--primary));
          margin-right: 0.1em;
          margin-top: 0.06em;
          shape-outside: margin-box;
        }
        @keyframes blink-cursor { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>

      {/* ── Hero Image — full-bleed with editorial overlay ── */}
      {heroImage && !synthesizing ? (
        <div
          className="-mx-4 sm:-mx-8 relative overflow-hidden"
          style={{ aspectRatio: "16 / 9", marginBottom: SPACE.xl }}
        >
          <InlineFigure image={heroImage} variant="full-width" className="absolute inset-0 w-full h-full [&_img]:object-cover [&_img]:w-full [&_img]:h-full [&_figure]:m-0 [&_figcaption]:hidden" />
          {/* Gradient overlay for text */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          {/* Title + byline over hero */}
          <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-10 pb-8" style={{ maxWidth: bodyMaxWidth + 80 }}>
            <BalancedHeading
              font="800 36px 'DM Sans', system-ui, sans-serif"
              lineHeight={40}
              as="h1"
              style={{
                fontWeight: 800,
                fontFamily: "'DM Sans', system-ui, sans-serif",
                lineHeight: 1.08,
                letterSpacing: "-0.03em",
                color: "#fff",
                textShadow: "0 2px 12px rgba(0,0,0,0.4)",
                marginBottom: SPACE.sm,
              }}
              fontSizes={TITLE_FONT_SIZES}
              maxLines={3}
            >
              {title}
            </BalancedHeading>
            <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: SPACE.xs }}>
              <span
                className="text-white/70 uppercase"
                style={{ fontSize: 11, letterSpacing: "0.14em", fontWeight: 600 }}
              >
                Feature
              </span>
              <span className="text-white/30">·</span>
              <span className="text-white/50" style={{ fontSize: 12 }}>
                {readTime} min read
              </span>
              <span className="text-white/30">·</span>
              <span className="text-white/50" style={{ fontSize: 12 }}>
                {today}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ── Text-only header when no hero ── */
        <div style={{ paddingTop: SPACE.xxl, marginBottom: SPACE.lg }}>
          <BalancedHeading
            font="800 32px 'DM Sans', system-ui, sans-serif"
            lineHeight={35}
            as="h1"
            className="text-foreground"
            style={{
              fontWeight: 800,
              fontFamily: "'DM Sans', system-ui, sans-serif",
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              marginBottom: SPACE.md,
            }}
            fontSizes={TITLE_FONT_SIZES}
            maxLines={3}
          >
            {title}
          </BalancedHeading>
          {/* Byline bar */}
          <div className="flex items-center gap-3 flex-wrap text-muted-foreground" style={{ marginBottom: SPACE.sm }}>
            <span
              className="px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-semibold bg-primary/10 text-primary"
            >
              Feature
            </span>
            <span style={{ fontSize: 13, opacity: OPACITY.tertiary }}>{readTime} min read</span>
            <span style={{ fontSize: 13, opacity: OPACITY.ghost }}>·</span>
            <span style={{ fontSize: 13, opacity: OPACITY.tertiary }}>{today}</span>
          </div>
          {/* Thin rule below byline */}
          <div className="bg-border/30" style={{ height: 1, marginBottom: SPACE.lg }} />
        </div>
      )}

      <SourcesPills sources={sourceMetas} />

      {/* ── Pull quote — decorative editorial style ── */}
      {pullQuote && (
        <div style={{ margin: `${SPACE.xl}px 0`, textAlign: "center", maxWidth: Math.min(680, bodyMaxWidth) }}>
          <span
            className="text-primary/20 select-none block"
            style={{ fontSize: 48, lineHeight: 1, fontFamily: "Georgia, serif", marginBottom: -8 }}
          >
            "
          </span>
          <BalancedBlock
            font={FONTS.georgiaPullQuote}
            lineHeight={33}
            as="div"
            style={{
              padding: `0 ${SPACE.lg}px`,
              fontSize: 24,
              fontStyle: "italic",
              lineHeight: 1.5,
              fontFamily: "Georgia, 'Times New Roman', serif",
              color: `hsl(var(--foreground) / ${OPACITY.secondary})`,
            }}
            maxWidth={Math.min(680, bodyMaxWidth)}
          >
            {pullQuote}
          </BalancedBlock>
          <span
            className="text-primary/20 select-none block"
            style={{ fontSize: 48, lineHeight: 1, fontFamily: "Georgia, serif", marginTop: -4 }}
          >
            "
          </span>
        </div>
      )}

      {/* ── Audio embed ── */}
      {media?.audio && media.audio.length > 0 && !synthesizing && (
        <InlineAudio audio={media.audio[0]} className="mb-6" />
      )}

      {/* ── Body content with inline images ── */}
      {sections.length > 1 ? (
        sections.map((section, idx) => {
          const inlineImg = inlineImageMap.get(idx);
          const showInline = idx > 0 && inlineImg && !synthesizing;
          return (
            <React.Fragment key={idx}>
              {showInline && (
                <div style={{ margin: `${SPACE.xl}px 0` }}>
                  <InlineFigure
                    image={inlineImg}
                    variant={idx % 3 === 0 ? "full-width" : "float-right"}
                    className={
                      idx % 3 === 0
                        ? "-mx-4 sm:-mx-8 rounded-lg overflow-hidden"
                        : "rounded-lg overflow-hidden ml-6 mb-4"
                    }
                  />
                </div>
              )}
              <CitedMarkdown markdown={section} sources={sourceMetas} components={components} />
            </React.Fragment>
          );
        })
      ) : (
        <CitedMarkdown markdown={contentMarkdown} sources={sourceMetas} components={components} />
      )}

      {/* Typing cursor */}
      {synthesizing && (
        <span
          className="inline-block bg-primary/70"
          style={{ width: 2, height: 18, verticalAlign: "text-bottom", marginLeft: 2, animation: "blink-cursor 0.8s steps(2) infinite" }}
        />
      )}

      <div style={{ clear: "both" }} />

      {/* ── Video section — editorial embed ── */}
      {media && media.videos.length > 0 && !synthesizing && (
        <div style={{ marginTop: SPACE.xxl, marginBottom: SPACE.lg }}>
          <div className="bg-border/30" style={{ height: 1, marginBottom: SPACE.lg }} />
          <p
            className="text-muted-foreground uppercase tracking-widest font-semibold"
            style={{ fontSize: 11, opacity: OPACITY.tertiary, marginBottom: SPACE.md, letterSpacing: "0.14em" }}
          >
            Watch
          </p>
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

      {/* ── References — magazine endnotes ── */}
      {sourceMetas.length > 0 && !synthesizing && (
        <div style={{ marginTop: SPACE.xxl, paddingTop: SPACE.lg }}>
          {/* Decorative top border */}
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-border/40 flex-1" style={{ height: 1 }} />
            <span
              className="text-muted-foreground uppercase tracking-widest font-semibold flex-shrink-0"
              style={{ fontSize: 10, opacity: OPACITY.tertiary, letterSpacing: "0.16em" }}
            >
              References
            </span>
            <div className="bg-border/40 flex-1" style={{ height: 1 }} />
          </div>
          <ol className="space-y-1.5 list-decimal list-inside">
            {sourceMetas.map((s, i) => (
              <li key={i} className="text-muted-foreground" style={{ fontSize: 12, opacity: OPACITY.secondary, lineHeight: 1.6 }}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary/60 hover:text-primary transition-colors underline underline-offset-2 decoration-primary/20"
                >
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
