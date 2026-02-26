/**
 * HologramBrowser — Native Web Renderer
 * ═══════════════════════════════════════
 *
 * Fetches any web page via Firecrawl, then renders the content
 * natively as hologram-native React components (markdown).
 * No iframes. Every page becomes a first-class hologram document
 * that Lumen can read, reason about, and transform.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Globe, ArrowLeft, ArrowRight, RotateCw, X, ExternalLink, Loader2, Search, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { firecrawlApi } from "@/lib/api/firecrawl";

/* ── Palette (Aman-consistent) ──────────────────────────────── */
const P = {
  bg: "hsl(25, 8%, 10%)",
  surface: "hsla(28, 12%, 14%, 0.97)",
  surfaceHover: "hsla(38, 12%, 90%, 0.08)",
  border: "hsla(38, 12%, 70%, 0.1)",
  borderFocus: "hsla(38, 30%, 55%, 0.35)",
  text: "hsl(38, 10%, 88%)",
  textMuted: "hsl(38, 8%, 55%)",
  gold: "hsl(38, 40%, 65%)",
  goldMuted: "hsl(38, 25%, 50%)",
  font: "'DM Sans', system-ui, sans-serif",
} as const;

interface HistoryEntry {
  url: string;
  title: string;
  markdown: string;
  links: string[];
}

interface BrowserProps {
  onClose: () => void;
  onSendToLumen?: (context: { title: string; url: string; markdown: string }) => void;
}

export default function HologramBrowser({ onClose, onSendToLumen }: BrowserProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<HistoryEntry | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const navigate = useCallback(async (targetUrl: string) => {
    if (!targetUrl.trim()) return;

    let formatted = targetUrl.trim();
    if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
      formatted = `https://${formatted}`;
    }

    setLoading(true);
    setError(null);
    setUrl(formatted);

    try {
      const result = await firecrawlApi.scrape(formatted, {
        formats: ["markdown", "links"],
        onlyMainContent: false,
      });

      if (!result.success) {
        setError(result.error || "Failed to load page");
        setLoading(false);
        return;
      }

      const d = result.data || (result as any);
      const markdown = d?.markdown || "";
      const title = d?.metadata?.title || formatted;
      const links = d?.links || [];

      const entry: HistoryEntry = { url: formatted, title, markdown, links };
      setPage(entry);

      const newHistory = [...history.slice(0, historyIdx + 1), entry];
      setHistory(newHistory);
      setHistoryIdx(newHistory.length - 1);
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [history, historyIdx]);

  const goBack = useCallback(() => {
    if (historyIdx > 0) {
      const idx = historyIdx - 1;
      setHistoryIdx(idx);
      setPage(history[idx]);
      setUrl(history[idx].url);
    }
  }, [history, historyIdx]);

  const goForward = useCallback(() => {
    if (historyIdx < history.length - 1) {
      const idx = historyIdx + 1;
      setHistoryIdx(idx);
      setPage(history[idx]);
      setUrl(history[idx].url);
    }
  }, [history, historyIdx]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(url);
  };

  const handleLinkClick = (href: string) => {
    if (href.startsWith("http")) {
      navigate(href);
    }
  };

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{ background: P.bg, fontFamily: P.font }}
    >
      {/* ── Chrome Bar ──────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 shrink-0"
        style={{ borderBottom: `1px solid ${P.border}`, background: P.surface }}
      >
        {/* Nav buttons */}
        <button
          onClick={goBack}
          disabled={historyIdx <= 0}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-25"
          style={{ color: P.textMuted }}
          onMouseEnter={(e) => { if (historyIdx > 0) e.currentTarget.style.background = P.surfaceHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={goForward}
          disabled={historyIdx >= history.length - 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-25"
          style={{ color: P.textMuted }}
          onMouseEnter={(e) => { if (historyIdx < history.length - 1) e.currentTarget.style.background = P.surfaceHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => page && navigate(page.url)}
          disabled={loading || !page}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-25"
          style={{ color: P.textMuted }}
          onMouseEnter={(e) => { e.currentTarget.style.background = P.surfaceHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>

        {/* URL Bar */}
        <form onSubmit={handleSubmit} className="flex-1 flex items-center">
          <div
            className="flex items-center flex-1 gap-2 px-3 py-1.5 rounded-lg transition-colors"
            style={{
              background: "hsla(38, 10%, 20%, 0.5)",
              border: `1px solid ${P.border}`,
            }}
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: P.gold }} />
            ) : (
              <Search className="w-3.5 h-3.5 shrink-0" style={{ color: P.textMuted }} />
            )}
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter any URL or search…"
              className="flex-1 bg-transparent border-none outline-none text-[13px] font-light placeholder:opacity-40"
              style={{ color: P.text, fontFamily: P.font }}
            />
          </div>
        </form>

        {/* Send to Lumen */}
        {page && onSendToLumen && (
          <button
            onClick={() => onSendToLumen({ title: page.title, url: page.url, markdown: page.markdown })}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-light transition-all duration-200"
            style={{
              color: P.gold,
              border: `1px solid ${P.border}`,
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "hsla(38, 25%, 30%, 0.2)";
              e.currentTarget.style.borderColor = P.borderFocus;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = P.border;
            }}
          >
            <Sparkles className="w-3 h-3" />
            Send to Lumen
          </button>
        )}

        {/* Open externally */}
        {page && (
          <a
            href={page.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: P.textMuted }}
            onMouseEnter={(e) => { e.currentTarget.style.background = P.surfaceHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: P.textMuted }}
          onMouseEnter={(e) => { e.currentTarget.style.background = P.surfaceHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Content Area ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto lumen-scroll">
        {!page && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "hsla(38, 20%, 25%, 0.3)", border: `1px solid ${P.border}` }}
            >
              <Globe className="w-8 h-8" style={{ color: P.gold }} strokeWidth={1.2} />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-[18px] font-light" style={{ color: P.text }}>
                Hologram Browser
              </h2>
              <p className="text-[13px] font-light leading-relaxed max-w-[320px]" style={{ color: P.textMuted }}>
                Enter any URL to render it natively inside the hologram.
                Every page becomes a first-class document that Lumen can read,
                reason about, and transform.
              </p>
            </div>
            {/* Quick links */}
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { label: "Wikipedia", url: "https://en.wikipedia.org" },
                { label: "Hacker News", url: "https://news.ycombinator.com" },
                { label: "UOR Foundation", url: "https://uor.foundation" },
              ].map((q) => (
                <button
                  key={q.url}
                  onClick={() => { setUrl(q.url); navigate(q.url); }}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-light transition-all duration-200"
                  style={{
                    color: P.goldMuted,
                    border: `1px solid ${P.border}`,
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = P.surfaceHover;
                    e.currentTarget.style.borderColor = P.borderFocus;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = P.border;
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: P.gold }} />
            <p className="text-[13px] font-light" style={{ color: P.textMuted }}>
              Rendering into hologram…
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8">
            <div className="text-center space-y-2">
              <p className="text-[15px] font-light" style={{ color: P.text }}>Unable to load page</p>
              <p className="text-[12px] font-light" style={{ color: P.textMuted }}>{error}</p>
            </div>
            <button
              onClick={() => navigate(url)}
              className="px-4 py-2 rounded-lg text-[12px] font-light transition-colors"
              style={{
                color: P.gold,
                border: `1px solid ${P.border}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = P.surfaceHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              Retry
            </button>
          </div>
        )}

        {page && !loading && (
          <article
            className="px-12 py-10 max-w-[960px] mx-auto"
            style={{ color: P.text }}
          >
            {/* Page title bar */}
            <div className="mb-6 pb-4" style={{ borderBottom: `1px solid ${P.border}` }}>
              <h1 className="text-[20px] font-light tracking-tight" style={{ color: P.text }}>
                {page.title}
              </h1>
              <p className="text-[11px] font-light mt-1 truncate" style={{ color: P.textMuted }}>
                {page.url}
              </p>
            </div>

            {/* Natively rendered markdown content */}
            <div className="hologram-prose">
              <ReactMarkdown
                components={{
                  a: ({ href, children, ...props }) => (
                    <a
                      {...props}
                      href={href}
                      onClick={(e) => {
                        if (href && href.startsWith("http")) {
                          e.preventDefault();
                          handleLinkClick(href);
                        }
                      }}
                      className="transition-colors"
                      style={{
                        color: P.gold,
                        textDecoration: "none",
                        borderBottom: `1px solid hsla(38, 30%, 55%, 0.25)`,
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderBottomColor = P.gold;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderBottomColor = "hsla(38, 30%, 55%, 0.25)";
                      }}
                    >
                      {children}
                    </a>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-[22px] font-light tracking-tight mt-8 mb-4" style={{ color: P.text, lineHeight: 1.3 }}>
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-[18px] font-light tracking-tight mt-7 mb-3" style={{ color: P.text, lineHeight: 1.35 }}>
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-[15px] font-medium mt-6 mb-2" style={{ color: P.text }}>
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-[14px] font-light leading-[1.75] mb-4" style={{ color: "hsl(38, 10%, 80%)" }}>
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="space-y-1.5 mb-4 ml-4 list-disc" style={{ color: P.textMuted }}>
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="space-y-1.5 mb-4 ml-4 list-decimal" style={{ color: P.textMuted }}>
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-[13px] font-light leading-relaxed" style={{ color: "hsl(38, 10%, 78%)" }}>
                      {children}
                    </li>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote
                      className="my-4 px-5 py-3 rounded-r-lg text-[13px] font-light italic"
                      style={{
                        borderLeft: `3px solid ${P.gold}`,
                        background: "hsla(38, 15%, 20%, 0.3)",
                        color: "hsl(38, 12%, 75%)",
                      }}
                    >
                      {children}
                    </blockquote>
                  ),
                  code: ({ children, className }) => {
                    const isBlock = className?.includes("language-");
                    if (isBlock) {
                      return (
                        <pre
                          className="my-4 p-4 rounded-lg overflow-x-auto text-[12px] font-mono"
                          style={{
                            background: "hsla(25, 10%, 8%, 0.8)",
                            border: `1px solid ${P.border}`,
                            color: "hsl(38, 10%, 78%)",
                          }}
                        >
                          <code>{children}</code>
                        </pre>
                      );
                    }
                    return (
                      <code
                        className="px-1.5 py-0.5 rounded text-[12px] font-mono"
                        style={{
                          background: "hsla(38, 10%, 20%, 0.5)",
                          color: P.gold,
                        }}
                      >
                        {children}
                      </code>
                    );
                  },
                  hr: () => (
                    <hr className="my-8 border-none h-px" style={{ background: P.border }} />
                  ),
                  img: ({ src, alt }) => (
                    <img
                      src={src}
                      alt={alt || ""}
                      className="max-w-full rounded-lg my-4"
                      style={{ border: `1px solid ${P.border}` }}
                      loading="lazy"
                    />
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4">
                      <table
                        className="w-full text-[13px]"
                        style={{ borderCollapse: "collapse" }}
                      >
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th
                      className="text-left px-3 py-2 text-[12px] font-medium uppercase tracking-wider"
                      style={{
                        borderBottom: `1px solid ${P.border}`,
                        color: P.goldMuted,
                      }}
                    >
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td
                      className="px-3 py-2 text-[13px] font-light"
                      style={{
                        borderBottom: `1px solid hsla(38, 10%, 25%, 0.2)`,
                        color: "hsl(38, 10%, 78%)",
                      }}
                    >
                      {children}
                    </td>
                  ),
                }}
              >
                {page.markdown}
              </ReactMarkdown>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
