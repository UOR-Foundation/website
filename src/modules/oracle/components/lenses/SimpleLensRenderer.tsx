/**
 * SimpleLensRenderer — Children's textbook / Kurzgesagt style.
 * Large friendly type, emoji markers, playful inline images and videos.
 */

import React, { useMemo } from "react";
import CitedMarkdown from "../CitedMarkdown";
import SourcesPills from "../SourcesPills";
import { InlineFigure, InlineVideo, InlineAudio } from "../InlineMedia";
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

const SECTION_EMOJIS = ["🌟", "🔍", "💡", "🧩", "🌍", "🎯", "🚀", "🧪", "📖", "🎨", "⚡", "🌈"];

function splitIntoSections(md: string): string[] {
  const parts = md.split(/(?=\n## )/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function createSimpleComponents(sectionCounter: { current: number }) {
  return {
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = typeof children === "string" ? children : String(children);
      const emoji = SECTION_EMOJIS[sectionCounter.current % SECTION_EMOJIS.length];
      sectionCounter.current++;
      return (
        <h2 id={slugify(text)} className="text-foreground" style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 700, fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "3rem", marginBottom: "0.8rem", lineHeight: 1.2, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 10 }} {...props}>
          <span style={{ fontSize: "1.3em" }}>{emoji}</span>
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3 className="text-foreground/85" style={{ fontSize: "clamp(1.1rem, 2vw, 1.4rem)", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "1.5rem", marginBottom: "0.5rem", letterSpacing: "-0.02em", lineHeight: 1.2 }} {...props}>{children}</h3>
    ),
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
      const text = typeof children === "string" ? children : "";
      const isWow = text.startsWith("!") || /did you know/i.test(text) || /fun fact/i.test(text) || /imagine/i.test(text);
      if (isWow) {
        return (
          <div className="bg-primary/[0.06] border border-primary/15" style={{ borderRadius: 14, padding: "14px 18px", marginBottom: "1.2em", fontSize: 18, lineHeight: 1.9, fontFamily: "'DM Sans', system-ui, sans-serif", maxWidth: 740 }}>
            <span style={{ marginRight: 8, fontSize: "1.2em" }}>✨</span>
            <span className="text-foreground/85">{text.replace(/^!\s*/, "")}</span>
          </div>
        );
      }
      return (
        <p className="text-foreground/80" style={{ fontSize: 19, lineHeight: 2.0, fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "1em", maxWidth: 740 }} {...props}>{children}</p>
      );
    },
    blockquote: ({ children }: React.HTMLAttributes<HTMLQuoteElement>) => (
      <div className="bg-accent/[0.08] border border-accent/15" style={{ borderRadius: 14, padding: "14px 18px", margin: "1.2em 0", fontSize: 18, lineHeight: 1.8, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <span style={{ marginRight: 8, fontSize: "1.2em" }}>💬</span>
        {children}
      </div>
    ),
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <strong className="text-foreground font-bold" {...props}>{children}</strong>
    ),
    ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
      <ul className="text-foreground/80" style={{ paddingLeft: 28, marginBottom: "1em", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 19, lineHeight: 2.0, listStyleType: "'🔹 '", maxWidth: 740 }} {...props}>{children}</ul>
    ),
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
      <li style={{ marginBottom: 6 }} {...props}>{children}</li>
    ),
  };
}

const SimpleLensRenderer: React.FC<LensRendererProps> = ({
  title,
  contentMarkdown,
  sources,
  synthesizing = false,
  media,
}) => {
  const sectionCounter = useMemo(() => ({ current: 0 }), [contentMarkdown]);
  const components = useMemo(() => createSimpleComponents(sectionCounter), [sectionCounter]);
  const sourceMetas = useMemo(() => sources.map(normalizeSource), [sources]);
  const sections = useMemo(() => splitIntoSections(contentMarkdown), [contentMarkdown]);
  const images = media?.images || [];

  if (synthesizing && !contentMarkdown.trim()) {
    return (
      <div className="space-y-4 py-8">
        {[85, 100, 90, 75].map((w, i) => (
          <div key={i} className="animate-pulse rounded-xl" style={{ height: 18, width: `${w}%`, background: "hsl(var(--primary) / 0.08)", borderRadius: 12 }} />
        ))}
        <p className="text-muted-foreground/40 italic text-sm mt-4">✨ Making it simple…</p>
      </div>
    );
  }

  return (
    <article style={{ margin: "0 auto" }}>
      <h1 className="text-foreground" style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: 8 }}>
        {title}
      </h1>

      <p className="text-primary/50" style={{ fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
        🌟 Explained simply
      </p>

      <SourcesPills sources={sourceMetas} />

      {/* Fun hero image */}
      {images.length > 0 && !synthesizing && (
        <div className="my-6 bg-primary/[0.04] border border-primary/10 rounded-2xl overflow-hidden">
          <img src={images[0].url} alt={images[0].caption || ""} loading="lazy" className="w-full object-cover" style={{ maxHeight: 240 }} />
          {images[0].caption && (
            <div className="p-3">
              <p className="text-foreground/70 text-sm">👀 {images[0].caption}</p>
            </div>
          )}
        </div>
      )}

      {/* Content with playful inline images */}
      {sections.length > 1 ? (
        sections.map((section, idx) => {
          const img = images[idx + 1]; // +1 because hero used [0]
          const showImg = img && idx > 0 && idx <= 3 && !synthesizing;
          return (
            <React.Fragment key={idx}>
              <CitedMarkdown markdown={section} sources={sourceMetas} components={components} />
              {showImg && (
                <div className="my-4 bg-accent/[0.04] border border-accent/10 rounded-2xl overflow-hidden">
                  <img src={img.url} alt={img.caption || ""} loading="lazy" className="w-full object-cover" style={{ maxHeight: 200 }} />
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

      {/* Video */}
      {media && media.videos.length > 0 && !synthesizing && (
        <div className="my-6 bg-accent/[0.06] border border-accent/15 rounded-2xl overflow-hidden p-3">
          <p className="text-foreground/70 text-sm font-semibold flex items-center gap-2 mb-2">🎬 Watch and Learn!</p>
          <InlineVideo video={media.videos[0]} variant="compact" />
        </div>
      )}

      {/* Audio */}
      {media?.audio && media.audio.length > 0 && !synthesizing && (
        <InlineAudio audio={media.audio[0]} className="my-4" />
      )}

      {synthesizing && (
        <span className="inline-block bg-primary/70" style={{ width: 2, height: 20, verticalAlign: "text-bottom", marginLeft: 2, animation: "blink-cursor 0.8s steps(2) infinite" }} />
      )}
      <style>{`@keyframes blink-cursor { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>

      {/* References */}
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

export default SimpleLensRenderer;
