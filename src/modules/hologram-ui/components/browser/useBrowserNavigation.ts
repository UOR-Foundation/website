/**
 * useBrowserNavigation — Headless hook for all browser state & logic.
 *
 * Owns: URL state, page cache, history stack, search, scroll memory,
 * prefetch, and keyboard shortcuts. Zero UI.
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

async function fetchPage(url: string): Promise<HistoryEntry> {
  const result = await firecrawlApi.scrape(url, {
    formats: ["markdown", "links"],
    onlyMainContent: true,
  });
  if (!result.success) throw new Error(result.error || "Failed to load page");
  const d = result.data || (result as any);
  return {
    url,
    title: d?.metadata?.title || url,
    markdown: d?.markdown || "",
    links: d?.links || [],
    visitedAt: Date.now(),
  };
}

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
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Refs for stable callbacks
  const historyRef = useRef(history);
  const historyIdxRef = useRef(historyIdx);
  const pageRef = useRef(page);
  historyRef.current = history;
  historyIdxRef.current = historyIdx;
  pageRef.current = page;

  useEffect(() => { inputRef.current?.focus(); }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl+L → focus URL bar
      if ((e.metaKey || e.ctrlKey) && e.key === "l") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      // Escape → close browser
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      // Alt+← → back
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        goBackFn();
        return;
      }
      // Alt+→ → forward
      if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        goForwardFn();
        return;
      }
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

  const navigate = useCallback(async (targetUrl: string, forceRefresh = false) => {
    if (!targetUrl.trim()) return;
    const formatted = formatUrl(targetUrl);

    // Save current page scroll position before navigating
    const curPage = pageRef.current;
    // (scroll saving is done by the content area via saveScrollPosition)

    // Cache hit → instant
    const cached = !forceRefresh && pageCache.get(formatted);
    if (cached) {
      const entry = { ...cached, visitedAt: Date.now() };
      setPage(entry);
      setUrl(formatted);
      setError(null);
      setSearchResults(null);
      setSearchQuery(null);
      pushToHistory(entry);
      return;
    }

    setLoading(true);
    setError(null);
    setUrl(formatted);
    try {
      const entry = await fetchPage(formatted);
      cacheSet(formatted, entry);
      setPage(entry);
      pushToHistory(entry);
    } catch (err: any) {
      setError(err.message || "Network error");
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
      if (!result.success) {
        setError(result.error || "Search failed");
        return;
      }
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
    if (isUrl(current)) {
      navigate(current);
    } else {
      searchFn(current);
    }
  }, [navigate, searchFn]);

  const handleLinkClick = useCallback((href: string) => {
    if (href.startsWith("http")) navigate(href);
  }, [navigate]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIdx(-1);
  }, []);

  // ── Prefetch: silently warm the cache ──
  const prefetch = useCallback((rawUrl: string) => {
    const formatted = formatUrl(rawUrl);
    if (pageCache.has(formatted) || prefetchInFlight.has(formatted)) return;
    prefetchInFlight.add(formatted);
    fetchPage(formatted)
      .then((entry) => cacheSet(formatted, entry))
      .catch(() => {}) // silent failure
      .finally(() => prefetchInFlight.delete(formatted));
  }, []);

  const saveScrollPosition = useCallback((u: string, scrollTop: number) => {
    scrollMemory.set(u, scrollTop);
  }, []);

  const getScrollPosition = useCallback((u: string) => {
    return scrollMemory.get(u) ?? 0;
  }, []);

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

  const state: BrowserNavState = {
    url, loading, error, page, searchResults, searchQuery,
    history, historyIdx, showHistory,
  };

  const actions: BrowserNavActions = {
    setUrl, navigate, goBack: goBackFn, goForward: goForwardFn,
    search: searchFn, handleSubmit, handleLinkClick,
    setShowHistory, clearHistory, prefetch,
    saveScrollPosition, getScrollPosition, selectHistoryEntry,
    inputRef,
  };

  return [state, actions];
}
