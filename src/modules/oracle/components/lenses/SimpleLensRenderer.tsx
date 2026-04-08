/**
 * SimpleLensRenderer — Children's textbook / Kurzgesagt style.
 * Large friendly type, emoji markers, playful inline images and videos.
 *
 * Golden ratio (φ) proportioned spacing and typography scale.
 * Uses AdaptiveContentContainer context for fluid, container-aware typography.
 */

import React, { useMemo } from "react";
import BalancedHeading from "../BalancedHeading";
import CitedMarkdown from "../CitedMarkdown";
import SourcesPills from "../SourcesPills";
import { InlineFigure, InlineVideo, InlineAudio } from "../InlineMedia";
import { normalizeSource } from "../../lib/citation-parser";
import type { SourceMeta } from "../../lib/citation-parser";
import type { MediaData } from "../../lib/stream-knowledge";
import { useContainerWidth } from "../AdaptiveContentContainer";
import { TYPE, LINE_HEIGHT, RHYTHM, OPACITY, SPACE, RADIUS } from "@/modules/desktop/lib/golden-ratio";

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

const SECTION_EMOJIS = ["🌟", "🔍", "💡", "🧩", "🌍", "🎯", "🚀", "🧪", "📖", "🎨", "⚡", "🌈"];

function splitIntoSections(md: string): string[] {
  const parts = md.split(/(?=\n## )/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function createSimpleComponents(sectionCounter: { current: number }, bodyMaxWidth: number) {
  return {
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = typeof children === "string" ? children : String(children);
      const emoji = SECTION_EMOJIS[sectionCounter.current % SECTION_EMOJIS.length];
      sectionCounter.current++;
      return (
        <h2 id={slugify(text)} className="text-foreground" style={{ fontSize: `${TYPE.h2}px`, fontWeight: 700, fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: RHYTHM.sectionSpacingTop, marginBottom: RHYTHM.sectionSpacingBottom, lineHeight: LINE_HEIGHT.heading, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: SPACE.md }} {...props}>
          <span style={{ fontSize: "1.3em" }}>{emoji}</span>
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3 className="text-foreground" style={{ fontSize: `${TYPE.large}px`, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "1.5rem", marginBottom: "0.5rem", letterSpacing: "-0.02em", lineHeight: LINE_HEIGHT.heading, opacity: OPACITY.primary }} {...props}>{children}</h3>
    ),
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
      const text = typeof children === "string" ? children : "";
      const isWow = text.startsWith("!") || /did you know/i.test(text) || /fun fact/i.test(text) || /imagine/i.test(text);
      if (isWow) {
        return (
          <div className="bg-primary/[0.06] border border-primary/15" style={{ borderRadius: RADIUS.lg, padding: `${SPACE.lg - 2}px ${SPACE.lg + 2}px`, marginBottom: RHYTHM.paragraphSpacing, fontSize: 18, lineHeight: LINE_HEIGHT.relaxed, fontFamily: "'DM Sans', system-ui, sans-serif", maxWidth: bodyMaxWidth }}>
            <span style={{ marginRight: 8, fontSize: "1.2em" }}>✨</span>
            <span className="text-foreground" style={{ opacity: OPACITY.primary }}>{text.replace(/^!\s*/, "")}</span>
          </div>
        );
      }
      return (
        <p className="text-foreground" style={{ fontSize: 19, lineHeight: LINE_HEIGHT.loose, fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: RHYTHM.paragraphSpacing, maxWidth: bodyMaxWidth, opacity: OPACITY.primary }} {...props}>{children}</p>
      );
    },
    blockquote: ({ children }: React.HTMLAttributes<HTMLQuoteElement>) => (
      <div className="bg-accent/[0.08] border border-accent/15" style={{ borderRadius: RADIUS.lg, padding: `${SPACE.lg - 2}px ${SPACE.lg + 2}px`, margin: `${RHYTHM.paragraphSpacing} 0`, fontSize: 18, lineHeight: LINE_HEIGHT.body, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <span style={{ marginRight: 8, fontSize: "1.2em" }}>💬</span>
        {children}
      </div>
    ),
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <strong className="text-foreground font-bold" {...props}>{children}</strong>
    ),
    ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
      <ul className="text-foreground" style={{ paddingLeft: TYPE.h2, marginBottom: RHYTHM.paragraphSpacing, fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 19, lineHeight: LINE_HEIGHT.loose, listStyleType: "'🔹 '", maxWidth: bodyMaxWidth, opacity: OPACITY.primary }} {...props}>{children}</ul>
    ),
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
      <li style={{ marginBottom: SPACE.sm }} {...props}>{children}</li>
    ),
  };
}

const TITLE_FONT_SIZES = [
  { font: "800 36px 'DM Sans', system-ui, sans-serif", lineHeight: 40, fontSize: "3rem" },
  { font: "800 32px 'DM Sans', system-ui, sans-serif", lineHeight: 37, fontSize: "2.5rem" },
  { font: "800 28px 'DM Sans', system-ui, sans-serif", lineHeight: 33, fontSize: "2rem" },
];

const SimpleLensRenderer: React.FC<LensRendererProps> = ({
  title,
  contentMarkdown,
  sources,
  synthesizing = false,
  media,
}) => {
  const { bodyMaxWidth } = useContainerWidth();
  const sectionCounter = useMemo(() => ({ current: 0 }), [contentMarkdown]);
  const components = useMemo(() => createSimpleComponents(sectionCounter, bodyMaxWidth), [sectionCounter, bodyMaxWidth]);
  const sourceMetas = useMemo(() => sources.map(normalizeSource), [sources]);
  const sections = useMemo(() => splitIntoSections(contentMarkdown), [contentMarkdown]);
  const images = media?.images || [];

  if (synthesizing && !contentMarkdown.trim()) {
    return (
      <div className="space-y-4 py-8">
        {[85, 100, 90, 75].map((w, i) => (
          <div key={i} className="animate-pulse" style={{ height: 18, width: `${w}%`, background: "hsl(var(--primary) / 0.08)", borderRadius: RADIUS.md }} />
        ))}
        <p className="text-muted-foreground/40 italic text-sm mt-4">✨ Making it simple…</p>
      </div>
    );
  }

  return (
    <article style={{ margin: "0 auto" }}>
      <BalancedHeading
        font="800 32px 'DM Sans', system-ui, sans-serif"
        lineHeight={37}
        as="h1"
        className="text-foreground"
        style={{ fontWeight: 800, fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: 8 }}
        fontSizes={TITLE_FONT_SIZES}
        maxLines={3}
      >
        {title}
      </BalancedHeading>

      <p className="text-primary" style={{ fontSize: 14, fontWeight: 600, marginBottom: 20, opacity: OPACITY.secondary }}>
        🌟 Explained simply
      </p>

      <SourcesPills sources={sourceMetas} />

      {images.length > 0 && !synthesizing && (
        <div className="my-5 bg-primary/[0.04] border border-primary/10 overflow-hidden" style={{ borderRadius: RADIUS.xl }}>
          <img src={images[0].url} alt={images[0].caption || ""} loading="lazy" className="w-full object-cover" style={{ maxHeight: 300 }} />
          {images[0].caption && (
            <div className="p-3">
              <p className="text-foreground/70 text-sm">👀 {images[0].caption}</p>
            </div>
          )}
        </div>
      )}

      {sections.length > 1 ? (
        sections.map((section, idx) => {
          const img = images[idx + 1];
          const showImg = img && idx > 0 && idx <= 3 && !synthesizing;
          return (
            <React.Fragment key={idx}>
              <CitedMarkdown markdown={section} sources={sourceMetas} components={components} />
              {showImg && (
                <div className="my-4 bg-accent/[0.04] border border-accent/10 overflow-hidden" style={{ borderRadius: RADIUS.xl }}>
                  <img src={img.url} alt={img.caption || ""} loading="lazy" className="w-full object-cover" style={{ maxHeight: 240 }} />
                  {img.caption && (
                    <div className="p-2.5">
                      <p className="text-foreground/60 text-xs">🖼️ {img.caption}</p>
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })
      ) : (
        <CitedMarkdown markdown={contentMarkdown} sources={sourceMetas} components={components} />
      )}

      {media && media.videos.length > 0 && !synthesizing && (
        <div className="my-6 bg-accent/[0.06] border border-accent/15 overflow-hidden p-3" style={{ borderRadius: RADIUS.xl }}>
          <p className="text-foreground/70 text-sm font-semibold flex items-center gap-2 mb-2">🎬 Watch and Learn!</p>
          <InlineVideo video={media.videos[0]} variant="compact" />
        </div>
      )}

      {media?.audio && media.audio.length > 0 && !synthesizing && (
        <InlineAudio audio={media.audio[0]} className="my-4" />
      )}

      {synthesizing && (
        <span className="inline-block bg-primary/70" style={{ width: 2, height: 20, verticalAlign: "text-bottom", marginLeft: 2, animation: "blink-cursor 0.8s steps(2) infinite" }} />
      )}
      <style>{`@keyframes blink-cursor { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>

      {sourceMetas.length > 0 && !synthesizing && (
        <div className="border-t border-border/15 mt-10 pt-5">
          <span className="text-muted-foreground text-[11px] uppercase tracking-[0.12em] font-semibold" style={{ opacity: OPACITY.tertiary }}>References</span>
          <ol className="mt-2 space-y-1 list-decimal list-inside">
            {sourceMetas.map((s, i) => (
              <li key={i} className="text-muted-foreground" style={{ fontSize: 12, opacity: OPACITY.secondary }}>
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

export default SimpleLensRenderer;
