/**
 * HologramBrowser — Native Web Renderer
 * ═══════════════════════════════════════
 *
 * Fetches any web page via Firecrawl, then renders the content
 * natively as hologram-native React components (markdown).
 * No iframes. Every page becomes a first-class hologram document
 * that Lumen can read, reason about, and transform.
 *
 * Design: Glass-like, ultra-minimal chrome — conveys transparency,
 * privacy, and intelligence. Almost invisible frame.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Globe, ArrowLeft, ArrowRight, RotateCw, X, ExternalLink, Loader2, Search, Sparkles, Clock, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { firecrawlApi, type SearchResult } from "@/lib/api/firecrawl";

/* ── Glass palette — nearly invisible chrome ─────────────────── */
const P = {
  bg: "hsla(25, 8%, 6%, 0.97)",
  surface: "hsla(25, 8%, 12%, 0.75)",
  surfaceHover: "hsla(38, 12%, 90%, 0.08)",
  border: "hsla(38, 12%, 70%, 0.08)",
  borderFocus: "hsla(38, 30%, 55%, 0.25)",
  text: "hsl(38, 10%, 88%)",
  textMuted: "hsl(38, 8%, 50%)",
  gold: "hsl(38, 40%, 65%)",
  goldMuted: "hsl(38, 25%, 50%)",
  font: "'DM Sans', system-ui, sans-serif",
} as const;

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

interface HistoryEntry {
  url: string;
  title: string;
  markdown: string;
  links: string[];
  visitedAt: number;
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
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [showHistory, setShowHistory] = useState(false);
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
        onlyMainContent: true,
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
      const entry: HistoryEntry = { url: formatted, title, markdown, links, visitedAt: Date.now() };
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

  const isUrl = (input: string): boolean => {
    const trimmed = input.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return true;
    if (/^[^\s]+\.[^\s]+$/.test(trimmed)) return true;
    return false;
  };

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setPage(null);
    setSearchQuery(query);
    setSearchResults(null);
    setUrl(query);
    try {
      const result = await firecrawlApi.search(query);
      if (!result.success) {
        setError(result.error || "Search failed");
        setLoading(false);
        return;
      }
      setSearchResults(result.data || []);
    } catch (err: any) {
      setError(err.message || "Search error");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUrl(url)) {
      navigate(url);
    } else {
      search(url);
    }
  };

  const handleLinkClick = (href: string) => {
    if (href.startsWith("http")) {
      navigate(href);
    }
  };

  /* ── Minimal icon button ─────────────────────────────────────── */
  const IconBtn = ({ onClick, disabled, children, title, active }: {
    onClick?: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    title?: string;
    active?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-6 h-6 flex items-center justify-center rounded-md transition-all duration-200 disabled:opacity-20"
      style={{ color: active ? P.gold : P.textMuted }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = P.surfaceHover; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{
        background: P.bg,
        backdropFilter: "blur(60px) saturate(1.6)",
        WebkitBackdropFilter: "blur(60px) saturate(1.6)",
        fontFamily: P.font,
        borderLeft: `1px solid ${P.border}`,
        boxShadow: "inset 0 0 80px hsla(25, 8%, 4%, 0.3)",
      }}
    >
      {/* ── Glass Chrome Bar — ultra-thin ──────────────────────── */}
      <div
        className="flex items-center gap-1.5 px-3 shrink-0"
        style={{
          height: 38,
          borderBottom: `1px solid ${P.border}`,
          background: "transparent",
        }}
      >
        {/* Nav cluster — tight, quiet */}
        <IconBtn onClick={goBack} disabled={historyIdx <= 0}>
          <ArrowLeft className="w-3.5 h-3.5" />
        </IconBtn>
        <IconBtn onClick={goForward} disabled={historyIdx >= history.length - 1}>
          <ArrowRight className="w-3.5 h-3.5" />
        </IconBtn>
        <IconBtn onClick={() => page && navigate(page.url)} disabled={loading || !page}>
          <RotateCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
        </IconBtn>

        {/* URL Bar — glass pill */}
        <form onSubmit={handleSubmit} className="flex-1 flex items-center mx-1">
          <div
            className="flex items-center flex-1 gap-2 px-3 rounded-full transition-all duration-200"
            style={{
              height: 26,
              background: "hsla(38, 8%, 50%, 0.06)",
              border: `1px solid hsla(38, 12%, 70%, 0.04)`,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = P.borderFocus;
              e.currentTarget.style.background = "hsla(38, 8%, 50%, 0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "hsla(38, 12%, 70%, 0.04)";
              e.currentTarget.style.background = "hsla(38, 8%, 50%, 0.06)";
            }}
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin shrink-0" style={{ color: P.gold }} />
            ) : (
              <Search className="w-3 h-3 shrink-0" style={{ color: P.textMuted, opacity: 0.6 }} />
            )}
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Search or enter URL"
              className="flex-1 bg-transparent border-none outline-none text-[12px] font-light placeholder:opacity-30"
              style={{ color: P.text, fontFamily: P.font }}
            />
          </div>
        </form>

        {/* Action cluster — right side */}
        {page && onSendToLumen && (
          <button
            onClick={() => onSendToLumen({ title: page.title, url: page.url, markdown: page.markdown })}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-light transition-all duration-200"
            style={{
              color: P.gold,
              border: `1px solid hsla(38, 30%, 55%, 0.12)`,
              background: "transparent",
              opacity: 0.75,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "hsla(38, 25%, 30%, 0.15)";
              e.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.opacity = "0.75";
            }}
          >
            <Sparkles className="w-2.5 h-2.5" />
            Lumen
          </button>
        )}

        {page && (
          <IconBtn onClick={() => window.open(page.url, "_blank")} title="Open externally">
            <ExternalLink className="w-3 h-3" />
          </IconBtn>
        )}
        <IconBtn onClick={() => setShowHistory((v) => !v)} title="History" active={showHistory}>
          <Clock className="w-3 h-3" />
        </IconBtn>
        <IconBtn onClick={onClose} title="Close browser">
          <X className="w-3 h-3" />
        </IconBtn>
      </div>

      {/* ── Body: History sidebar + Content ──────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── History Sidebar ── */}
        {showHistory && (
          <div
            className="shrink-0 overflow-y-auto lumen-scroll flex flex-col"
            style={{
              width: 240,
              background: "hsla(25, 8%, 10%, 0.5)",
              borderRight: `1px solid ${P.border}`,
            }}
          >
            <div className="flex items-center justify-between px-4 py-2.5 shrink-0" style={{ borderBottom: `1px solid ${P.border}` }}>
              <span className="text-[10px] font-light uppercase tracking-widest" style={{ color: P.textMuted }}>History</span>
              {history.length > 0 && (
                <button
                  onClick={() => { setHistory([]); setHistoryIdx(-1); }}
                  className="flex items-center gap-1 text-[10px] font-light px-1.5 py-0.5 rounded transition-colors"
                  style={{ color: P.textMuted }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = P.gold; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = P.textMuted; }}
                >
                  <Trash2 className="w-2.5 h-2.5" /> Clear
                </button>
              )}
            </div>

            {history.length === 0 && (
              <div className="flex-1 flex items-center justify-center px-4">
                <p className="text-[11px] font-light text-center" style={{ color: P.textMuted }}>
                  No pages visited yet
                </p>
              </div>
            )}

            <div className="flex-1 py-1">
              {[...history].reverse().map((entry, i) => {
                const realIdx = history.length - 1 - i;
                const isActive = realIdx === historyIdx;
                return (
                  <button
                    key={`${entry.url}-${entry.visitedAt}`}
                    onClick={() => {
                      setHistoryIdx(realIdx);
                      setPage(entry);
                      setUrl(entry.url);
                      setSearchResults(null);
                      setSearchQuery(null);
                    }}
                    className="w-full text-left px-4 py-2 transition-all duration-150"
                    style={{
                      background: isActive ? "hsla(38, 15%, 25%, 0.15)" : "transparent",
                      borderLeft: isActive ? `2px solid ${P.gold}` : "2px solid transparent",
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = P.surfaceHover; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    <p className="text-[11px] font-light truncate mb-0.5" style={{ color: isActive ? P.gold : P.text }}>
                      {entry.title}
                    </p>
                    <p className="text-[9px] font-light truncate" style={{ color: P.textMuted }}>
                      {new URL(entry.url).hostname} · {formatTimeAgo(entry.visitedAt)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Content Area ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto lumen-scroll">
          {/* Empty state */}
          {!page && !loading && !error && !searchResults && (
            <div className="flex flex-col items-center justify-center h-full gap-5 px-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "hsla(38, 20%, 25%, 0.2)", border: `1px solid ${P.border}` }}
              >
                <Globe className="w-6 h-6" style={{ color: P.gold, opacity: 0.7 }} strokeWidth={1} />
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-[13px] font-light leading-relaxed max-w-[280px]" style={{ color: P.textMuted }}>
                  Enter any URL or search term above.
                  Pages render natively — Lumen can read and reason about them.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {[
                  { label: "Wikipedia", url: "https://en.wikipedia.org" },
                  { label: "Hacker News", url: "https://news.ycombinator.com" },
                  { label: "UOR Foundation", url: "https://uor.foundation" },
                ].map((q) => (
                  <button
                    key={q.url}
                    onClick={() => { setUrl(q.url); navigate(q.url); }}
                    className="px-2.5 py-1 rounded-full text-[11px] font-light transition-all duration-200"
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

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: P.gold, opacity: 0.6 }} />
              <p className="text-[12px] font-light" style={{ color: P.textMuted }}>
                Rendering…
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-8">
              <div className="text-center space-y-1.5">
                <p className="text-[14px] font-light" style={{ color: P.text }}>Unable to load</p>
                <p className="text-[11px] font-light" style={{ color: P.textMuted }}>{error}</p>
              </div>
              <button
                onClick={() => navigate(url)}
                className="px-3 py-1.5 rounded-full text-[11px] font-light transition-colors"
                style={{ color: P.gold, border: `1px solid ${P.border}` }}
                onMouseEnter={(e) => { e.currentTarget.style.background = P.surfaceHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Search Results */}
          {searchResults && !page && !loading && (
            <div className="px-10 py-8 max-w-[900px] mx-auto" style={{ color: P.text }}>
              <div className="mb-5 pb-3" style={{ borderBottom: `1px solid ${P.border}` }}>
                <p className="text-[10px] font-light uppercase tracking-widest mb-1" style={{ color: P.textMuted }}>
                  Results
                </p>
                <h1 className="text-[18px] font-light tracking-tight" style={{ color: P.text }}>
                  {searchQuery}
                </h1>
              </div>
              {searchResults.length === 0 && (
                <p className="text-[13px] font-light" style={{ color: P.textMuted }}>No results found.</p>
              )}
              <div className="space-y-3">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => { setSearchResults(null); setSearchQuery(null); navigate(r.url); }}
                    className="w-full text-left p-4 rounded-lg transition-all duration-200 group"
                    style={{ background: "hsla(38, 10%, 15%, 0.3)", border: `1px solid ${P.border}` }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "hsla(38, 12%, 18%, 0.4)"; e.currentTarget.style.borderColor = P.borderFocus; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "hsla(38, 10%, 15%, 0.3)"; e.currentTarget.style.borderColor = P.border; }}
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

          {/* Page Content */}
          {page && !loading && (
            <article
              className="px-8 md:px-14 py-8 max-w-[1000px] mx-auto w-full"
              style={{ color: P.text }}
            >
              <div className="mb-6 pb-4" style={{ borderBottom: `1px solid ${P.border}` }}>
                <h1 className="text-[22px] font-light tracking-tight" style={{ color: P.text }}>
                  {page.title}
                </h1>
                <p className="text-[10px] font-light mt-1 truncate" style={{ color: P.textMuted }}>
                  {page.url}
                </p>
              </div>

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
                          borderBottom: `1px solid hsla(38, 30%, 55%, 0.2)`,
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderBottomColor = P.gold; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderBottomColor = "hsla(38, 30%, 55%, 0.2)"; }}
                      >
                        {children}
                      </a>
                    ),
                    h1: ({ children }) => (
                      <h1 className="text-[24px] font-light tracking-tight mt-8 mb-4" style={{ color: P.text, lineHeight: 1.25 }}>
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-[18px] font-light tracking-tight mt-7 mb-3" style={{ color: P.text, lineHeight: 1.3, borderBottom: `1px solid ${P.border}`, paddingBottom: 6 }}>
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-[16px] font-medium mt-5 mb-2" style={{ color: P.text }}>
                        {children}
                      </h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className="text-[14px] font-medium mt-4 mb-2" style={{ color: P.text }}>
                        {children}
                      </h4>
                    ),
                    p: ({ children }) => (
                      <p className="text-[14px] font-light leading-[1.8] mb-4" style={{ color: "hsl(38, 10%, 82%)" }}>
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="space-y-1.5 mb-4 ml-5 list-disc" style={{ color: P.textMuted }}>
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="space-y-1.5 mb-4 ml-5 list-decimal" style={{ color: P.textMuted }}>
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-[13px] font-light leading-[1.7]" style={{ color: "hsl(38, 10%, 80%)" }}>
                        {children}
                      </li>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote
                        className="my-3 px-4 py-2.5 rounded-r-lg text-[12px] font-light italic"
                        style={{
                          borderLeft: `2px solid ${P.gold}`,
                          background: "hsla(38, 15%, 20%, 0.2)",
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
                            className="my-3 p-3 rounded-lg overflow-x-auto text-[11px] font-mono"
                            style={{
                              background: "hsla(25, 10%, 6%, 0.6)",
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
                          className="px-1 py-0.5 rounded text-[11px] font-mono"
                          style={{
                            background: "hsla(38, 10%, 20%, 0.3)",
                            color: P.gold,
                          }}
                        >
                          {children}
                        </code>
                      );
                    },
                    hr: () => (
                      <hr className="my-6 border-none h-px" style={{ background: P.border }} />
                    ),
                    img: ({ src, alt }) => (
                      <figure className="my-5">
                        <img
                          src={src}
                          alt={alt || ""}
                          className="max-w-full rounded-lg"
                          style={{ border: `1px solid ${P.border}` }}
                          loading="lazy"
                        />
                        {alt && (
                          <figcaption className="mt-1.5 text-[10px] font-light text-center" style={{ color: P.textMuted }}>
                            {alt}
                          </figcaption>
                        )}
                      </figure>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-3">
                        <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th
                        className="text-left px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider"
                        style={{ borderBottom: `1px solid ${P.border}`, color: P.goldMuted }}
                      >
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td
                        className="px-3 py-1.5 text-[12px] font-light"
                        style={{ borderBottom: `1px solid hsla(38, 10%, 25%, 0.15)`, color: "hsl(38, 10%, 78%)" }}
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
      </div>{/* end flex body */}
    </div>
  );
}
