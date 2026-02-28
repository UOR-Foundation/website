/**
 * useBrowserNavigation — Headless hook for all browser state & logic.
 *
 * Owns: URL state, page cache, history stack, search, scroll memory,
 * prefetch, and keyboard shortcuts. Zero UI.
 *
 * Rendering strategy:
 *   Live mode uses Firecrawl rawHtml + srcdoc with <base> injection.
 *   This preserves full fidelity — CSS, images, fonts all resolve to
 *   the original domain. No custom proxy needed.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { firecrawlApi, type SearchResult } from "@/lib/api/firecrawl";
import { type HistoryEntry, formatUrl, isUrl } from "./browser-palette";

/* ── URL-keyed page cache (module-scoped, survives re-mounts) ── */
const PAGE_CACHE_MAX = 50;
const pageCache = new Map<string, HistoryEntry>();

/* ── Scroll position memory ─────────────────────────────────── */
const scrollMemory = new Map<string, number>();

/* ── Prefetch tracking (avoid duplicate in-flight) ──────────── */
const prefetchInFlight = new Set<string>();

function cacheSet(url: string, entry: HistoryEntry) {
  if (pageCache.size >= PAGE_CACHE_MAX) {
    const oldest = pageCache.keys().next().value;
    if (oldest) pageCache.delete(oldest);
  }
  pageCache.set(url, entry);
}

/**
 * Inject a <base> tag into raw HTML so relative URLs resolve to the original domain.
 * Also strips X-Frame-Options meta tags and CSP meta tags.
 */
function prepareHtmlForSrcdoc(rawHtml: string, sourceUrl: string): string {
  try {
    const origin = new URL(sourceUrl);
    const base = `${origin.protocol}//${origin.host}`;
    
    let html = rawHtml;
    
    // Remove existing <base> tags
    html = html.replace(/<base\s[^>]*>/gi, "");
    
    // Remove CSP and X-Frame-Options meta tags
    html = html.replace(/<meta\s[^>]*http-equiv\s*=\s*["']?(content-security-policy|x-frame-options)["']?[^>]*>/gi, "");
    
    // Inject <base> after <head>
    const headMatch = html.match(/<head[^>]*>/i);
    if (headMatch) {
      const idx = html.indexOf(headMatch[0]) + headMatch[0].length;
      html = html.slice(0, idx) + `\n<base href="${base}/" target="_self">\n` + html.slice(idx);
    } else {
      // No <head> — prepend
      html = `<base href="${base}/" target="_self">\n` + html;
    }
    
    // Inject navigation interceptor so clicks stay in the iframe
    // and communicate back to the parent for URL bar updates
    const navScript = `
<script>
(function() {
  // Intercept link clicks
  document.addEventListener('click', function(e) {
    var a = e.target;
    while (a && a.tagName !== 'A') a = a.parentElement;
    if (a && a.href) {
      try {
        var url = new URL(a.href);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          e.preventDefault();
          e.stopPropagation();
          window.parent.postMessage({ type: 'hologram-navigate', url: a.href }, '*');
        }
      } catch(ex) {}
    }
  }, true);

  // Intercept form submissions
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form && form.action) {
      e.preventDefault();
      window.parent.postMessage({ type: 'hologram-navigate', url: form.action }, '*');
    }
  }, true);
})();
</script>`;
    
    const bodyClose = html.lastIndexOf('</body>');
    if (bodyClose !== -1) {
      html = html.slice(0, bodyClose) + navScript + html.slice(bodyClose);
    } else {
      html += navScript;
    }
    
    return html;
  } catch {
    return rawHtml;
  }
}

async function fetchPage(url: string): Promise<HistoryEntry> {
  const result = await firecrawlApi.scrape(url, {
    formats: ["markdown", "rawHtml", "links"],
    onlyMainContent: false,
  });
  if (!result.success) throw new Error(result.error || "Failed to load page");
  const d = result.data || (result as any);
  
  const rawHtml = d?.rawHtml || d?.html || "";
  const preparedHtml = rawHtml ? prepareHtmlForSrcdoc(rawHtml, url) : "";
  
  return {
    url,
    title: d?.metadata?.title || url,
    markdown: d?.markdown || "",
    rawHtml: preparedHtml,
    links: d?.links || [],
    visitedAt: Date.now(),
  };
}

export type ViewMode = "live" | "fidelity" | "reader";

export interface BrowserNavState {
  url: string;
  loading: boolean;
  error: string | null;
  page: HistoryEntry | null;
  searchResults: SearchResult[] | null;
  searchQuery: string | null;
  history: HistoryEntry[];
  historyIdx: number;
  showHistory: boolean;
  viewMode: ViewMode;
  popupsBlocked: boolean;
  privateRelay: boolean;
}

export interface BrowserNavActions {
  setUrl: (url: string) => void;
  navigate: (url: string, forceRefresh?: boolean) => Promise<void>;
  goBack: () => void;
  goForward: () => void;
  search: (query: string) => Promise<void>;
  handleSubmit: (e: React.FormEvent) => void;
  handleLinkClick: (href: string) => void;
  setShowHistory: (v: boolean | ((p: boolean) => boolean)) => void;
  clearHistory: () => void;
  prefetch: (url: string) => void;
  saveScrollPosition: (url: string, scrollTop: number) => void;
  getScrollPosition: (url: string) => number;
  selectHistoryEntry: (idx: number) => void;
  toggleViewMode: () => void;
  togglePopups: () => void;
  togglePrivateRelay: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function useBrowserNavigation(onClose: () => void): [BrowserNavState, BrowserNavActions] {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<HistoryEntry | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [showHistory, setShowHistory] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const [popupsBlocked, setPopupsBlocked] = useState(true);
  const [privateRelay, setPrivateRelay] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Refs for stable callbacks
  const historyRef = useRef(history);
  const historyIdxRef = useRef(historyIdx);
  const pageRef = useRef(page);
  historyRef.current = history;
  historyIdxRef.current = historyIdx;
  pageRef.current = page;

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Listen for navigation messages from the srcdoc iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'hologram-navigate' && e.data.url) {
        navigateFn(e.data.url);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "l") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); goBackFn(); return; }
      if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); goForwardFn(); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const pushToHistory = useCallback((entry: HistoryEntry) => {
    const h = historyRef.current;
    const idx = historyIdxRef.current;
    const newHistory = [...h.slice(0, idx + 1), entry];
    setHistory(newHistory);
    setHistoryIdx(newHistory.length - 1);
  }, []);

  const navigateFn = useCallback(async (targetUrl: string, forceRefresh = false) => {
    if (!targetUrl.trim()) return;
    const formatted = formatUrl(targetUrl);
    setUrl(formatted);
    setError(null);
    setSearchResults(null);
    setSearchQuery(null);

    // Cache hit → instant
    const cached = !forceRefresh && pageCache.get(formatted);
    if (cached) {
      const entry = { ...cached, visitedAt: Date.now() };
      setPage(entry);
      setLoading(false);
      pushToHistory(entry);
      return;
    }

    setLoading(true);
    setPage(null);

    try {
      const entry = await fetchPage(formatted);
      cacheSet(formatted, entry);
      setPage(entry);
      pushToHistory(entry);
    } catch (err: any) {
      setError(err.message || "Failed to load page");
    } finally {
      setLoading(false);
    }
  }, [pushToHistory]);

  const goBackFn = useCallback(() => {
    const h = historyRef.current;
    const idx = historyIdxRef.current;
    if (idx > 0) {
      const newIdx = idx - 1;
      setHistoryIdx(newIdx);
      setPage(h[newIdx]);
      setUrl(h[newIdx].url);
    }
  }, []);

  const goForwardFn = useCallback(() => {
    const h = historyRef.current;
    const idx = historyIdxRef.current;
    if (idx < h.length - 1) {
      const newIdx = idx + 1;
      setHistoryIdx(newIdx);
      setPage(h[newIdx]);
      setUrl(h[newIdx].url);
    }
  }, []);

  const searchFn = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setPage(null);
    setSearchQuery(query);
    setSearchResults(null);
    setUrl(query);
    try {
      const result = await firecrawlApi.search(query);
      if (!result.success) { setError(result.error || "Search failed"); return; }
      setSearchResults(result.data || []);
    } catch (err: any) {
      setError(err.message || "Search error");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const current = (inputRef.current?.value ?? "").trim();
    if (!current) return;
    if (isUrl(current)) { navigateFn(current); } else { searchFn(current); }
  }, [navigateFn, searchFn]);

  const handleLinkClick = useCallback((href: string) => {
    if (href.startsWith("http")) navigateFn(href);
  }, [navigateFn]);

  const clearHistory = useCallback(() => { setHistory([]); setHistoryIdx(-1); }, []);

  const prefetch = useCallback((rawUrl: string) => {
    const formatted = formatUrl(rawUrl);
    if (pageCache.has(formatted) || prefetchInFlight.has(formatted)) return;
    prefetchInFlight.add(formatted);
    fetchPage(formatted)
      .then((entry) => cacheSet(formatted, entry))
      .catch(() => {})
      .finally(() => prefetchInFlight.delete(formatted));
  }, []);

  const saveScrollPosition = useCallback((u: string, scrollTop: number) => { scrollMemory.set(u, scrollTop); }, []);
  const getScrollPosition = useCallback((u: string) => scrollMemory.get(u) ?? 0, []);

  const selectHistoryEntry = useCallback((realIdx: number) => {
    const h = historyRef.current;
    if (realIdx >= 0 && realIdx < h.length) {
      setHistoryIdx(realIdx);
      setPage(h[realIdx]);
      setUrl(h[realIdx].url);
      setSearchResults(null);
      setSearchQuery(null);
    }
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode((m) => m === "live" ? "fidelity" : m === "fidelity" ? "reader" : "live");
  }, []);

  const togglePopups = useCallback(() => { setPopupsBlocked((b) => !b); }, []);
  const togglePrivateRelay = useCallback(() => { setPrivateRelay((b) => !b); }, []);

  const state: BrowserNavState = {
    url, loading, error, page, searchResults, searchQuery,
    history, historyIdx, showHistory, viewMode, popupsBlocked, privateRelay,
  };

  const actions: BrowserNavActions = {
    setUrl, navigate: navigateFn, goBack: goBackFn, goForward: goForwardFn,
    search: searchFn, handleSubmit, handleLinkClick,
    setShowHistory, clearHistory, prefetch,
    saveScrollPosition, getScrollPosition, selectHistoryEntry,
    toggleViewMode, togglePopups, togglePrivateRelay, inputRef,
  };

  return [state, actions];
}
