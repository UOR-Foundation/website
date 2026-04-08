/**
 * StoryLensRenderer — Longreads / Medium longform style.
 * Large serif title, author byline, generous paragraph spacing, immersive pull-quotes.
 */

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";

interface LensRendererProps {
  title: string;
  contentMarkdown: string;
  wikidata?: Record<string, unknown> | null;
  sources: string[];
  synthesizing?: boolean;
}

function createStoryComponents() {
  return {
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h2
        className="text-foreground/70"
        style={{
          fontSize: "1.4rem",
          fontWeight: 400,
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontStyle: "italic",
          marginTop: "3rem",
          marginBottom: "1rem",
          lineHeight: 1.3,
        }}
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3
        className="text-foreground/65"
        style={{
          fontSize: "1.1rem",
          fontWeight: 600,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          marginTop: "2rem",
          marginBottom: "0.6rem",
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
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
          fontSize: 18,
          lineHeight: 1.9,
          fontFamily: "Georgia, 'Times New Roman', serif",
          marginBottom: "1.8em",
        }}
        {...props}
      >
        {children}
      </p>
    ),
    blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
      <blockquote
        className="border-l-[3px] border-primary/25"
        style={{
          margin: "2.5rem 0",
          padding: "0 2rem",
          fontSize: 22,
          fontStyle: "italic",
          lineHeight: 1.55,
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "hsl(var(--foreground) / 0.55)",
        }}
        {...props}
      >
        {children}
      </blockquote>
    ),
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <strong className="text-foreground font-semibold" {...props}>{children}</strong>
    ),
    em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <em style={{ fontStyle: "italic" }} {...props}>{children}</em>
    ),
    ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
      <ul
        className="text-foreground/80"
        style={{
          paddingLeft: 24,
          marginBottom: "1.5em",
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 18,
          lineHeight: 1.9,
        }}
        {...props}
      >
        {children}
      </ul>
    ),
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
      <li style={{ marginBottom: 8 }} {...props}>{children}</li>
    ),
    hr: () => (
      <div className="text-center text-muted-foreground/20 my-10" style={{ fontSize: 18, letterSpacing: "0.6em" }}>
        ● ● ●
      </div>
    ),
  };
}

const StoryLensRenderer: React.FC<LensRendererProps> = ({
  title,
  contentMarkdown,
  sources,
  synthesizing = false,
}) => {
  const components = useMemo(() => createStoryComponents(), []);

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
      {/* Large serif display title */}
      <h1
        className="text-foreground"
        style={{
          fontSize: "2.5rem",
          fontWeight: 400,
          fontFamily: "Georgia, 'Times New Roman', serif",
          lineHeight: 1.15,
          marginBottom: 14,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h1>

      {/* Byline */}
      <div style={{ marginBottom: 40 }}>
        <p
          className="text-muted-foreground/50"
          style={{
            fontSize: 14,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontStyle: "italic",
          }}
        >
          A UOR Knowledge Story
        </p>
        <div
          className="bg-primary/20 mt-4"
          style={{ height: 1, width: 60 }}
        />
      </div>

      {/* Content */}
      <ReactMarkdown components={components}>{contentMarkdown}</ReactMarkdown>

      {synthesizing && (
        <span className="inline-block bg-primary/70" style={{ width: 2, height: 20, verticalAlign: "text-bottom", marginLeft: 2, animation: "blink-cursor 0.8s steps(2) infinite" }} />
      )}
      <style>{`@keyframes blink-cursor { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>

      {/* End mark */}
      {!synthesizing && contentMarkdown.trim().length > 100 && (
        <div className="text-center mt-12 mb-4">
          <span className="text-primary/30" style={{ fontSize: 20 }}>◼</span>
        </div>
      )}

      {sources.length > 0 && (
        <div className="border-t border-border/10 mt-8 pt-5">
          <span className="text-muted-foreground/35 text-[11px] uppercase tracking-[0.12em] font-semibold">Sources</span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {sources.map((url, i) => (
              <a key={i} href={url.startsWith("http") ? url : `https://${url}`} target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground/50 hover:text-primary/70 transition-colors text-[12px] underline underline-offset-2 decoration-border/30 hover:decoration-primary/50">
                {url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            ))}
          </div>
        </div>
      )}
    </article>
  );
};

export default StoryLensRenderer;
