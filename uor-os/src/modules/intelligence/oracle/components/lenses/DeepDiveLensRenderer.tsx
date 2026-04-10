/**
 * DeepDiveLensRenderer — Nature / arXiv / Scientific Journal style.
 * Abstract block, §-numbered sections, compact layout, inline figures with captions.
 *
 * Golden ratio (φ) proportioned typography and spacing.
 * Uses AdaptiveContentContainer context for fluid, container-aware typography.
 */

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import BalancedHeading from "../BalancedHeading";
import CitedMarkdown from "../CitedMarkdown";
import SourcesPills from "../SourcesPills";
import { InlineFigure, InlineVideo, InlineAudio, distributeMediaAcrossSections } from "../InlineMedia";
import { normalizeSource } from "../../lib/citation-parser";
import type { SourceMeta } from "../../lib/citation-parser";
import type { MediaData } from "../../lib/stream-knowledge";
import { useContainerWidth } from "../AdaptiveContentContainer";
import { TYPE, LINE_HEIGHT, RHYTHM, OPACITY, SPACE, RADIUS } from "@/modules/platform/desktop/lib/golden-ratio";

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

function extractAbstract(md: string): { abstract: string; rest: string } {
  const lines = md.split("\n");
  const firstHeading = lines.findIndex((l) => /^##\s+/.test(l));
  if (firstHeading <= 0) return { abstract: "", rest: md };
  return {
    abstract: lines.slice(0, firstHeading).join("\n").trim(),
    rest: lines.slice(firstHeading).join("\n").trim(),
  };
}

function splitIntoSections(md: string): string[] {
  const parts = md.split(/(?=\n## )/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function createDeepDiveComponents(sectionCounter: { current: number }, bodyMaxWidth: number) {
  return {
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = typeof children === "string" ? children : String(children);
      sectionCounter.current++;
      return (
        <h2 id={slugify(text)} className="text-foreground" style={{ fontSize: `${TYPE.large + 1}px`, fontWeight: 700, fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: RHYTHM.sectionSpacingTop, marginBottom: "0.5rem", lineHeight: LINE_HEIGHT.heading, textTransform: "uppercase", letterSpacing: "0.04em" }} {...props}>
          <span className="text-primary" style={{ fontFamily: "ui-monospace, monospace", marginRight: 8, fontWeight: 400, opacity: OPACITY.secondary }}>§{sectionCounter.current}</span>
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3 className="text-foreground" style={{ fontSize: 18, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "1.3rem", marginBottom: "0.4rem", fontStyle: "italic", lineHeight: LINE_HEIGHT.heading, opacity: OPACITY.primary }} {...props}>{children}</h3>
    ),
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p className="text-foreground" style={{ fontSize: 15, lineHeight: 1.65, fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "0.55em", textAlign: "justify", hyphens: "auto" as const, maxWidth: bodyMaxWidth, opacity: OPACITY.primary }} {...props}>{children}</p>
    ),
    blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
      <blockquote className="bg-muted/20 border-l-2 border-primary/30" style={{ margin: "1rem 0", padding: `8px ${SPACE.lg - 2}px`, fontSize: 14, lineHeight: 1.6, fontFamily: "'DM Sans', system-ui, sans-serif", fontStyle: "italic" }} {...props}>{children}</blockquote>
    ),
    code: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <code className="text-primary/80 bg-primary/[0.06]" style={{ fontFamily: "ui-monospace, 'Cascadia Code', monospace", fontSize: "0.88em", padding: "1px 5px", borderRadius: RADIUS.xs }} {...props}>{children}</code>
    ),
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <strong className="text-foreground font-semibold" {...props}>{children}</strong>
    ),
    ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
      <ul className="text-foreground" style={{ paddingLeft: 20, marginBottom: "0.55em", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 15, lineHeight: 1.65, maxWidth: bodyMaxWidth, opacity: OPACITY.primary }} {...props}>{children}</ul>
    ),
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
      <li style={{ marginBottom: 3 }} {...props}>{children}</li>
    ),
  };
}

const TITLE_FONT_SIZES = [
  { font: "700 30px 'DM Sans', system-ui, sans-serif", lineHeight: 36, fontSize: "2.4rem" },
  { font: "700 28px 'DM Sans', system-ui, sans-serif", lineHeight: 34, fontSize: "2rem" },
  { font: "700 24px 'DM Sans', system-ui, sans-serif", lineHeight: 30, fontSize: "1.6rem" },
];

const DeepDiveLensRenderer: React.FC<LensRendererProps> = ({
  title,
  contentMarkdown,
  sources,
  synthesizing = false,
  media,
}) => {
  const { bodyMaxWidth, isWide } = useContainerWidth();
  const { abstract, rest } = useMemo(() => extractAbstract(contentMarkdown), [contentMarkdown]);
  const sectionCounter = useMemo(() => ({ current: 0 }), [contentMarkdown]);
  const components = useMemo(() => createDeepDiveComponents(sectionCounter, bodyMaxWidth), [sectionCounter, bodyMaxWidth]);
  const sourceMetas = useMemo(() => sources.map(normalizeSource), [sources]);
  const bodySections = useMemo(() => splitIntoSections(rest || contentMarkdown), [rest, contentMarkdown]);
  const inlineImageMap = useMemo(
    () => media ? distributeMediaAcrossSections(contentMarkdown, media.images, 3) : new Map(),
    [contentMarkdown, media]
  );

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
    <article style={{ margin: "0 auto" }}>
      <BalancedHeading
        font="700 28px 'DM Sans', system-ui, sans-serif"
        lineHeight={34}
        as="h1"
        center
        className="text-foreground"
        style={{ fontWeight: 700, fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: LINE_HEIGHT.heading, letterSpacing: "-0.02em", marginBottom: SPACE.sm, textAlign: "center" }}
        fontSizes={TITLE_FONT_SIZES}
        maxLines={3}
      >
        {title}
      </BalancedHeading>

      <p className="text-muted-foreground text-center" style={{ fontSize: 12, fontFamily: "ui-monospace, monospace", letterSpacing: "0.06em", marginBottom: SPACE.md, opacity: OPACITY.tertiary }}>
        UOR Knowledge · Technical Review
      </p>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <SourcesPills sources={sourceMetas} />
      </div>

      {abstract && (
        <div className="bg-muted/15 border border-border/15" style={{ borderRadius: RADIUS.sm, padding: `${SPACE.lg - 2}px ${SPACE.lg + 2}px`, marginBottom: SPACE.lg + 4 }}>
          <span className="text-foreground" style={{ fontSize: TYPE.caption, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: SPACE.sm, opacity: OPACITY.secondary }}>Abstract</span>
          <div className="text-foreground" style={{ fontSize: 14, lineHeight: 1.6, fontFamily: "'DM Sans', system-ui, sans-serif", fontStyle: "italic", opacity: 0.75 }}>
            <ReactMarkdown components={{ p: ({ children }) => <p style={{ margin: 0 }}>{children}</p> }}>
              {abstract}
            </ReactMarkdown>
          </div>
        </div>
      )}

      <div style={{ columnCount: isWide ? 2 : 1, columnGap: 26 }}>
        {bodySections.length > 1 ? (
          bodySections.map((section, idx) => {
            const fig = inlineImageMap.get(idx);
            const showFig = fig && idx > 0 && !synthesizing;
            return (
              <React.Fragment key={idx}>
                <CitedMarkdown markdown={section} sources={sourceMetas} components={components} />
                {showFig && (
                  <figure className="my-4 break-inside-avoid" style={{ margin: 0 }}>
                    <div className="overflow-hidden border border-border/15" style={{ borderRadius: RADIUS.sm }}>
                      <img src={fig.url} alt={fig.caption || ""} loading="lazy" className="w-full object-cover" style={{ maxHeight: 220 }} />
                    </div>
                    <figcaption className="text-muted-foreground text-[11px] leading-snug" style={{ marginTop: SPACE.sm, opacity: OPACITY.secondary }}>
                      <span className="text-foreground font-medium" style={{ opacity: OPACITY.secondary }}>Fig. {idx}.</span> {fig.caption || ""}
                    </figcaption>
                  </figure>
                )}
              </React.Fragment>
            );
          })
        ) : (
          <CitedMarkdown markdown={rest || contentMarkdown} sources={sourceMetas} components={components} />
        )}

        {synthesizing && (
          <span className="inline-block bg-primary/70" style={{ width: 2, height: 16, verticalAlign: "text-bottom", marginLeft: 2, animation: "blink-cursor 0.8s steps(2) infinite" }} />
        )}
      </div>
      <style>{`@keyframes blink-cursor { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>

      {media && (media.videos.length > 0 || (media.audio && media.audio.length > 0)) && !synthesizing && (
        <details className="border border-border/15 mt-6 group" style={{ borderRadius: RADIUS.sm }}>
          <summary className="px-4 py-3 cursor-pointer text-foreground text-xs font-bold uppercase tracking-wider select-none" style={{ opacity: OPACITY.secondary }}>
            Supplementary Materials ({media.videos.length + (media.audio?.length || 0)})
          </summary>
          <div className="px-4 pb-4 pt-2 space-y-4">
            {media.videos.map((v, i) => (
              <InlineVideo key={i} video={v} variant="compact" />
            ))}
            {media.audio?.map((a, i) => (
              <InlineAudio key={i} audio={a} />
            ))}
          </div>
        </details>
      )}

      {sourceMetas.length > 0 && (
        <div className="border-t border-border/15 mt-8 pt-4">
          <span className="text-foreground text-[11px] uppercase tracking-[0.1em] font-bold" style={{ opacity: OPACITY.secondary }}>References</span>
          <ol className="mt-2 space-y-1 list-decimal list-inside">
            {sourceMetas.map((s, i) => (
              <li key={i} className="text-muted-foreground" style={{ fontSize: 12, fontFamily: "ui-monospace, monospace", opacity: OPACITY.secondary }}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary/60 hover:text-primary transition-colors underline underline-offset-2 decoration-primary/20">
                  {s.domain}
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
};

export default DeepDiveLensRenderer;
