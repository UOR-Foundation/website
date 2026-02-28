/**
 * BrowserContent — Renders page content via Firecrawl rawHtml + srcdoc.
 *
 * Live mode: Full HTML rendered in a sandboxed iframe via srcdoc.
 *            A <base> tag is injected so all assets resolve to the original domain.
 * Fidelity:  Same as live (rawHtml srcdoc).
 * Reader:    Semantic markdown rendering.
 */

import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { P, type HistoryEntry, formatTimeAgo } from "./browser-palette";
import { type BrowserNavState, type BrowserNavActions } from "./useBrowserNavigation";
import BrowserSkeleton from "./BrowserSkeleton";
import type { SearchResult } from "@/lib/api/firecrawl";

/* ── Quick-link presets ────────────────────────────────────── */
const QUICK_LINKS = [
  { label: "Wikipedia", url: "https://en.wikipedia.org" },
  { label: "Hacker News", url: "https://news.ycombinator.com" },
  { label: "UOR Foundation", url: "https://uor.foundation" },
] as const;

interface BrowserContentProps {
  state: BrowserNavState;
  actions: BrowserNavActions;
}

export default function BrowserContent({ state, actions }: BrowserContentProps) {
  const { page, loading, error, searchResults, searchQuery, url, viewMode, popupsBlocked } = state;
  const { navigate, handleLinkClick, prefetch, saveScrollPosition, getScrollPosition, setUrl } = actions;
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevUrlRef = useRef<string | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const [contentVisible, setContentVisible] = useState(false);

  // ── Fade-in trigger when page loads ──
  useEffect(() => {
    if (page && !loading) {
      setContentVisible(false);
      const t = requestAnimationFrame(() => setContentVisible(true));
      return () => cancelAnimationFrame(t);
    }
  }, [page?.url, loading]);

  // ── Restore scroll position when page changes ──
  useEffect(() => {
    if (page && scrollRef.current) {
      const savedScroll = getScrollPosition(page.url);
      if (prevUrlRef.current !== page.url) {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ top: savedScroll, behavior: "instant" as any });
        });
      }
      prevUrlRef.current = page.url;
    }
  }, [page?.url, getScrollPosition]);

  // ── Save scroll + update reading progress ──
  const handleScroll = useCallback(() => {
    if (page && scrollRef.current) {
      saveScrollPosition(page.url, scrollRef.current.scrollTop);
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const max = scrollHeight - clientHeight;
      setReadingProgress(max > 0 ? Math.min(scrollTop / max, 1) : 0);
    }
  }, [page?.url, saveScrollPosition]);

  // ── Memoized markdown components ──
  const markdownComponents = useMemo(() => ({
    a: ({ href, children, ...props }: any) => (
      <a
        {...props}
        href={href}
        onClick={(e: React.MouseEvent) => {
          if (href && href.startsWith("http")) { e.preventDefault(); handleLinkClick(href); }
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
          e.currentTarget.style.borderBottomColor = P.gold;
          if (href && href.startsWith("http")) prefetch(href);
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
          e.currentTarget.style.borderBottomColor = "hsla(38, 30%, 55%, 0.2)";
        }}
        className="transition-colors"
        style={{ color: P.gold, textDecoration: "none", borderBottom: `1px solid hsla(38, 30%, 55%, 0.2)`, cursor: "pointer" }}
      >
        {children}
      </a>
    ),
    h1: ({ children }: any) => <h1 className="text-[24px] font-light tracking-tight mt-8 mb-4" style={{ color: P.text, lineHeight: 1.25 }}>{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-[18px] font-light tracking-tight mt-7 mb-3" style={{ color: P.text, lineHeight: 1.3, borderBottom: `1px solid ${P.border}`, paddingBottom: 6 }}>{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-[16px] font-medium mt-5 mb-2" style={{ color: P.text }}>{children}</h3>,
    h4: ({ children }: any) => <h4 className="text-[14px] font-medium mt-4 mb-2" style={{ color: P.text }}>{children}</h4>,
    p: ({ children }: any) => <p className="text-[14px] font-light leading-[1.8] mb-4" style={{ color: "hsl(38, 10%, 82%)" }}>{children}</p>,
    ul: ({ children }: any) => <ul className="space-y-1.5 mb-4 ml-5 list-disc" style={{ color: P.textMuted }}>{children}</ul>,
    ol: ({ children }: any) => <ol className="space-y-1.5 mb-4 ml-5 list-decimal" style={{ color: P.textMuted }}>{children}</ol>,
    li: ({ children }: any) => <li className="text-[13px] font-light leading-[1.7]" style={{ color: "hsl(38, 10%, 80%)" }}>{children}</li>,
    blockquote: ({ children }: any) => (
      <blockquote className="my-3 px-4 py-2.5 rounded-r-lg text-[12px] font-light italic" style={{ borderLeft: `2px solid ${P.gold}`, background: "hsla(38, 15%, 20%, 0.2)", color: "hsl(38, 12%, 75%)" }}>
        {children}
      </blockquote>
    ),
    code: ({ children, className }: any) => {
      const isBlock = className?.includes("language-");
      if (isBlock) {
        return (
          <pre className="my-3 p-3 rounded-lg overflow-x-auto text-[11px] font-mono" style={{ background: "hsla(25, 10%, 6%, 0.6)", border: `1px solid ${P.border}`, color: "hsl(38, 10%, 78%)" }}>
            <code>{children}</code>
          </pre>
        );
      }
      return <code className="px-1 py-0.5 rounded text-[11px] font-mono" style={{ background: "hsla(38, 10%, 20%, 0.3)", color: P.gold }}>{children}</code>;
    },
    hr: () => <hr className="my-6 border-none h-px" style={{ background: P.border }} />,
    img: ({ src, alt }: any) => (
      <figure className="my-5">
        <img src={src} alt={alt || ""} className="max-w-full rounded-lg" style={{ border: `1px solid ${P.border}` }} loading="lazy" />
        {alt && <figcaption className="mt-1.5 text-[10px] font-light text-center" style={{ color: P.textMuted }}>{alt}</figcaption>}
      </figure>
    ),
    table: ({ children }: any) => <div className="overflow-x-auto my-3"><table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>{children}</table></div>,
    th: ({ children }: any) => <th className="text-left px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider" style={{ borderBottom: `1px solid ${P.border}`, color: P.goldMuted }}>{children}</th>,
    td: ({ children }: any) => <td className="px-3 py-1.5 text-[12px] font-light" style={{ borderBottom: `1px solid hsla(38, 10%, 25%, 0.15)`, color: "hsl(38, 10%, 78%)" }}>{children}</td>,
  }), [handleLinkClick, prefetch]);

  /** Whether we have HTML to render in srcdoc */
  const hasSrcdocHtml = page?.rawHtml && page.rawHtml.length > 100;

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto lumen-scroll">
      {/* ── Live / Fidelity Mode — Full HTML via srcdoc ── */}
      {(viewMode === "live" || viewMode === "fidelity") && hasSrcdocHtml && !loading && (
        <iframe
          key={`srcdoc-${page!.url}`}
          srcDoc={page!.rawHtml}
          sandbox={`allow-same-origin allow-scripts allow-forms${popupsBlocked ? "" : " allow-popups allow-popups-to-escape-sandbox"}`}
          allow="clipboard-write; encrypted-media; autoplay"
          className="w-full h-full border-none"
          style={{ background: "#fff" }}
          title={page!.title || page!.url}
        />
      )}

      {/* ── Empty state ── */}
      {!page && !loading && !error && !searchResults && (
        <div className="flex flex-col items-center justify-center h-full gap-5 px-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "hsla(38, 20%, 25%, 0.2)", border: `1px solid ${P.border}` }}>
            <Globe className="w-6 h-6" style={{ color: P.gold, opacity: 0.7 }} strokeWidth={1} />
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-[13px] font-light leading-relaxed max-w-[280px]" style={{ color: P.textMuted }}>
              Enter any URL or search term above.
              Pages render natively — Lumen can read and reason about them.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {QUICK_LINKS.map((q) => (
              <button
                key={q.url}
                onClick={() => { setUrl(q.url); navigate(q.url); }}
                className="px-2.5 py-1 rounded-full text-[11px] font-light transition-all duration-200"
                style={{ color: P.goldMuted, border: `1px solid ${P.border}`, background: "transparent" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = P.surfaceHover; e.currentTarget.style.borderColor = P.borderFocus; prefetch(q.url); }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = P.border; }}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && <BrowserSkeleton />}

      {/* ── Error ── */}
      {error && (
        <div className="flex flex-col items-center justify-center h-full gap-3 px-8">
          <div className="text-center space-y-1.5">
            <p className="text-[14px] font-light" style={{ color: P.text }}>Unable to load</p>
            <p className="text-[11px] font-light" style={{ color: P.textMuted }}>{error}</p>
          </div>
          <button
            onClick={() => navigate(url, true)}
            className="px-3 py-1.5 rounded-full text-[11px] font-light transition-colors"
            style={{ color: P.gold, border: `1px solid ${P.border}` }}
            onMouseEnter={(e) => { e.currentTarget.style.background = P.surfaceHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Search Results ── */}
      {searchResults && !page && !loading && (
        <div className="px-10 py-8 max-w-[900px] mx-auto" style={{ color: P.text }}>
          <div className="mb-5 pb-3" style={{ borderBottom: `1px solid ${P.border}` }}>
            <p className="text-[10px] font-light uppercase tracking-widest mb-1" style={{ color: P.textMuted }}>Results</p>
            <h1 className="text-[18px] font-light tracking-tight" style={{ color: P.text }}>{searchQuery}</h1>
          </div>
          {searchResults.length === 0 && (
            <p className="text-[13px] font-light" style={{ color: P.textMuted }}>No results found.</p>
          )}
          <div className="space-y-3">
            {searchResults.map((r: SearchResult, i: number) => (
              <button
                key={i}
                onClick={() => navigate(r.url)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "hsla(38, 12%, 18%, 0.4)";
                  e.currentTarget.style.borderColor = P.borderFocus;
                  prefetch(r.url);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "hsla(38, 10%, 15%, 0.3)";
                  e.currentTarget.style.borderColor = P.border;
                }}
                className="w-full text-left p-4 rounded-lg transition-all duration-200 group"
                style={{ background: "hsla(38, 10%, 15%, 0.3)", border: `1px solid ${P.border}` }}
              >
                <p className="text-[10px] font-light truncate mb-0.5" style={{ color: P.goldMuted }}>{r.url}</p>
                <h3 className="text-[14px] font-light mb-1 group-hover:underline" style={{ color: P.gold }}>{r.title || r.url}</h3>
                {r.description && (
                  <p className="text-[12px] font-light leading-relaxed line-clamp-2" style={{ color: P.textMuted }}>{r.description}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Reader Mode (markdown) — fallback when no rawHtml ── */}
      {page && !loading && (viewMode === "reader" || ((viewMode === "live" || viewMode === "fidelity") && !hasSrcdocHtml)) && (
        <>
          <div className="sticky top-0 z-10 h-[2px] w-full" style={{ background: "transparent" }}>
            <div
              className="h-full transition-[width] duration-150 ease-out"
              style={{
                width: `${readingProgress * 100}%`,
                background: `linear-gradient(90deg, ${P.gold}, hsla(38, 40%, 65%, 0.3))`,
                boxShadow: readingProgress > 0 ? `0 0 8px hsla(38, 40%, 65%, 0.3)` : "none",
              }}
            />
          </div>
          <article
            className="px-8 md:px-14 py-8 max-w-[1000px] mx-auto w-full"
            style={{
              color: P.text,
              opacity: contentVisible ? 1 : 0,
              transform: contentVisible ? "translateY(0)" : "translateY(8px)",
              transition: "opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <div className="mb-6 pb-4" style={{ borderBottom: `1px solid ${P.border}` }}>
              <h1 className="text-[22px] font-light tracking-tight" style={{ color: P.text }}>{page.title}</h1>
              <p className="text-[10px] font-light mt-1 truncate" style={{ color: P.textMuted }}>{page.url}</p>
            </div>
            <div className="hologram-prose">
              <ReactMarkdown components={markdownComponents}>{page.markdown}</ReactMarkdown>
            </div>
          </article>
        </>
      )}
    </div>
  );
}
