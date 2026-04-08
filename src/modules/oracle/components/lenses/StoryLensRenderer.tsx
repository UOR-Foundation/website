/**
 * StoryLensRenderer — Longreads / Medium longform style.
 * Cinematic hero image, inline scene-setting images, immersive narrative flow.
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

function splitIntoSections(md: string): string[] {
  const parts = md.split(/(?=\n## )/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function createStoryComponents() {
  return {
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h2 className="text-foreground/70" style={{ fontSize: "1.4rem", fontWeight: 400, fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", marginTop: "3rem", marginBottom: "1rem", lineHeight: 1.3 }} {...props}>{children}</h2>
    ),
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3 className="text-foreground/65" style={{ fontSize: "1.1rem", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "2rem", marginBottom: "0.6rem", letterSpacing: "0.06em", textTransform: "uppercase" as const }} {...props}>{children}</h3>
    ),
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p className="text-foreground/80" style={{ fontSize: 18, lineHeight: 1.9, fontFamily: "Georgia, 'Times New Roman', serif", marginBottom: "1.8em" }} {...props}>{children}</p>
    ),
    blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
      <blockquote className="border-l-[3px] border-primary/25" style={{ margin: "2.5rem 0", padding: "0 2rem", fontSize: 22, fontStyle: "italic", lineHeight: 1.55, fontFamily: "Georgia, 'Times New Roman', serif", color: "hsl(var(--foreground) / 0.55)" }} {...props}>{children}</blockquote>
    ),
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <strong className="text-foreground font-semibold" {...props}>{children}</strong>
    ),
    em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <em style={{ fontStyle: "italic" }} {...props}>{children}</em>
    ),
    ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
      <ul className="text-foreground/80" style={{ paddingLeft: 24, marginBottom: "1.5em", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, lineHeight: 1.9 }} {...props}>{children}</ul>
    ),
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
      <li style={{ marginBottom: 8 }} {...props}>{children}</li>
    ),
    hr: () => (
      <div className="text-center text-muted-foreground/20 my-10" style={{ fontSize: 18, letterSpacing: "0.6em" }}>● ● ●</div>
    ),
  };
}

const StoryLensRenderer: React.FC<LensRendererProps> = ({
  title,
  contentMarkdown,
  sources,
  synthesizing = false,
  media,
}) => {
  const components = useMemo(() => createStoryComponents(), []);
  const sourceMetas = useMemo(() => sources.map(normalizeSource), [sources]);
  const sections = useMemo(() => splitIntoSections(contentMarkdown), [contentMarkdown]);
  const heroImage = media?.images?.[0];
  const inlineImageMap = useMemo(
    () => media ? distributeMediaAcrossSections(contentMarkdown, media.images.slice(1), 4) : new Map(),
    [contentMarkdown, media]
  );

  if (synthesizing && !contentMarkdown.trim()) {
    return (
      <div className="space-y-5 py-12 max-w-lg mx-auto">
        <div className="animate-pulse rounded" style={{ height: 32, width: "80%", background: "hsl(var(--muted-foreground) / 0.07)" }} />
        <div className="animate-pulse rounded" style={{ height: 14, width: "40%", background: "hsl(var(--muted-foreground) / 0.05)" }} />
        <div className="h-8" />
        {[100, 95, 88, 92, 85].map((w, i) => (
          <div key={i} className="animate-pulse rounded" style={{ height: 14, width: `${w}%`, background: "hsl(var(--muted-foreground) / 0.06)" }} />
        ))}
        <p className="text-muted-foreground/40 italic text-sm mt-6">Crafting your story…</p>
      </div>
    );
  }

  return (
    <article style={{ maxWidth: 640, margin: "0 auto" }}>
      {/* Cinematic hero image */}
      {heroImage && !synthesizing && (
        <InlineFigure image={heroImage} variant="full-width" className="mb-10 -mx-6 sm:mx-0 rounded-none sm:rounded-lg" />
      )}

      {/* Large serif display title */}
      <h1 className="text-foreground" style={{ fontSize: "2.5rem", fontWeight: 400, fontFamily: "Georgia, 'Times New Roman', serif", lineHeight: 1.15, marginBottom: 14, letterSpacing: "-0.01em" }}>
        {title}
      </h1>

      {/* Byline */}
      <div style={{ marginBottom: 24 }}>
        <p className="text-muted-foreground/50" style={{ fontSize: 14, fontFamily: "'DM Sans', system-ui, sans-serif", fontStyle: "italic" }}>
          A UOR Knowledge Story
        </p>
        <div className="bg-primary/20 mt-4" style={{ height: 1, width: 60 }} />
      </div>

      <SourcesPills sources={sourceMetas} />

      {/* Audio */}
      {media?.audio && media.audio.length > 0 && !synthesizing && (
        <InlineAudio audio={media.audio[0]} className="my-6" />
      )}

      {/* Content with inline scene-setting images */}
      {sections.length > 1 ? (
        sections.map((section, idx) => {
          const img = inlineImageMap.get(idx);
          const showImg = img && idx > 0 && !synthesizing;
          return (
            <React.Fragment key={idx}>
              <CitedMarkdown markdown={section} sources={sourceMetas} components={components} />
              {showImg && (
                <InlineFigure image={img} variant="full-width" className="my-8" />
              )}
            </React.Fragment>
          );
        })
      ) : (
        <CitedMarkdown markdown={contentMarkdown} sources={sourceMetas} components={components} />
      )}

      {synthesizing && (
        <span className="inline-block bg-primary/70" style={{ width: 2, height: 20, verticalAlign: "text-bottom", marginLeft: 2, animation: "blink-cursor 0.8s steps(2) infinite" }} />
      )}
      <style>{`@keyframes blink-cursor { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>

      {/* End mark + video */}
      {!synthesizing && contentMarkdown.trim().length > 100 && (
        <>
          {media && media.videos.length > 0 && (
            <div className="mt-10 mb-6 space-y-4">
              <InlineVideo video={media.videos[0]} variant="cinematic" />
              {media.videos.length > 1 && (
                <InlineVideo video={media.videos[1]} variant="compact" />
              )}
            </div>
          )}
          <div className="text-center mt-12 mb-4">
            <span className="text-primary/30" style={{ fontSize: 20 }}>◼</span>
          </div>
        </>
      )}

      {/* References footer */}
      {sourceMetas.length > 0 && !synthesizing && (
        <div className="border-t border-border/10 mt-8 pt-5">
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

export default StoryLensRenderer;
