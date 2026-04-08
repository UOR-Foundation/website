/**
 * SimpleLensRenderer — Children's textbook / Kurzgesagt style.
 * Large friendly type, emoji section markers, pastel callout cards, warm and playful.
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

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const SECTION_EMOJIS = ["🌟", "🔍", "💡", "🧩", "🌍", "🎯", "🚀", "🧪", "📖", "🎨", "⚡", "🌈"];

function createSimpleComponents(sectionCounter: { current: number }) {
  return {
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = typeof children === "string" ? children : String(children);
      const emoji = SECTION_EMOJIS[sectionCounter.current % SECTION_EMOJIS.length];
      sectionCounter.current++;
      return (
        <h2
          id={slugify(text)}
          className="text-foreground"
          style={{
            fontSize: "1.55rem",
            fontWeight: 700,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            marginTop: "2.2rem",
            marginBottom: "0.8rem",
            lineHeight: 1.3,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
          {...props}
        >
          <span style={{ fontSize: "1.3em" }}>{emoji}</span>
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3
        className="text-foreground/85"
        style={{
          fontSize: "1.2rem",
          fontWeight: 600,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          marginTop: "1.5rem",
          marginBottom: "0.5rem",
        }}
        {...props}
      >
        {children}
      </h3>
    ),
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
      const text = typeof children === "string" ? children : "";
      const isWow = text.startsWith("!") || /did you know/i.test(text) || /fun fact/i.test(text) || /imagine/i.test(text);
      if (isWow) {
        return (
          <div
            className="bg-primary/[0.06] border border-primary/15"
            style={{
              borderRadius: 14,
              padding: "14px 18px",
              marginBottom: "1.2em",
              fontSize: 18,
              lineHeight: 1.9,
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            <span style={{ marginRight: 8, fontSize: "1.2em" }}>✨</span>
            <span className="text-foreground/85">{text.replace(/^!\s*/, "")}</span>
          </div>
        );
      }
      return (
        <p
          className="text-foreground/80"
          style={{
            fontSize: 19,
            lineHeight: 2.0,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            marginBottom: "1em",
          }}
          {...props}
        >
          {children}
        </p>
      );
    },
    blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
      <div
        className="bg-accent/[0.08] border border-accent/15"
        style={{
          borderRadius: 14,
          padding: "14px 18px",
          margin: "1.2em 0",
          fontSize: 18,
          lineHeight: 1.8,
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
        {...props}
      >
        <span style={{ marginRight: 8, fontSize: "1.2em" }}>💬</span>
        {children}
      </div>
    ),
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <strong className="text-foreground font-bold" {...props}>{children}</strong>
    ),
    ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
      <ul
        className="text-foreground/80"
        style={{
          paddingLeft: 28,
          marginBottom: "1em",
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: 19,
          lineHeight: 2.0,
          listStyleType: "'🔹 '",
        }}
        {...props}
      >
        {children}
      </ul>
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
}) => {
  const sectionCounter = useMemo(() => ({ current: 0 }), [contentMarkdown]);
  const components = useMemo(() => createSimpleComponents(sectionCounter), [sectionCounter]);

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
    <article style={{ maxWidth: 700, margin: "0 auto" }}>
      {/* Warm, friendly title */}
      <h1
        className="text-foreground"
        style={{
          fontSize: "2.2rem",
          fontWeight: 800,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          lineHeight: 1.15,
          marginBottom: 8,
        }}
      >
        {title}
      </h1>

      <p
        className="text-primary/50"
        style={{
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 28,
        }}
      >
        🌟 Explained simply
      </p>

      {/* Content */}
      <ReactMarkdown components={components}>{contentMarkdown}</ReactMarkdown>

      {synthesizing && (
        <span className="inline-block bg-primary/70" style={{ width: 2, height: 20, verticalAlign: "text-bottom", marginLeft: 2, animation: "blink-cursor 0.8s steps(2) infinite" }} />
      )}
      <style>{`@keyframes blink-cursor { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>

      {sources.length > 0 && (
        <div className="border-t border-border/15 mt-10 pt-5">
          <span className="text-muted-foreground/35 text-[11px] uppercase tracking-[0.12em] font-semibold">Sources</span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {sources.map((url, i) => (
              <a key={i} href={url.startsWith("http") ? url : `https://${url}`} target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground/50 hover:text-primary/70 bg-muted/10 hover:bg-primary/5 transition-colors text-[11px] px-2.5 py-1 rounded-full border border-border/10">
                {url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            ))}
          </div>
        </div>
      )}
    </article>
  );
};

export default SimpleLensRenderer;
