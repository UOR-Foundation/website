/**
 * search-suggestions — Predictive autocomplete engine.
 *
 * Merges three sources into a ranked suggestion list:
 *   1. Personal search history (instant, fuzzy prefix match)
 *   2. Context-derived keywords (from active docs & attention profile)
 *   3. Wikipedia OpenSearch (debounced, global popularity)
 *
 * History and context are synchronous; Wikipedia is async with a 280ms debounce.
 * Results are deduped by lowercase text, capped at 8 total.
 */

import type { SearchHistoryEntry } from "./search-history";

export interface SearchSuggestion {
  text: string;
  type: "history" | "context" | "popular";
  thumbnail?: string | null;
  subtitle?: string | null;
}

export interface SuggestionEngineOptions {
  history: SearchHistoryEntry[];
  contextKeywords: string[];
  domainHistory: Array<{ domain: string }>;
}

const MAX_HISTORY = 3;
const MAX_CONTEXT = 2;
const MAX_POPULAR = 4;
const MAX_TOTAL = 8;
const DEBOUNCE_MS = 280;

/** Fuzzy prefix match — checks if every word-start in query appears in target. */
function prefixMatch(target: string, query: string): boolean {
  const t = target.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return false;
  // Simple: target starts with query OR contains word starting with query
  if (t.startsWith(q)) return true;
  const words = t.split(/\s+/);
  return words.some(w => w.startsWith(q));
}

/** Score for sorting history matches — earlier position = higher score. */
function matchScore(target: string, query: string): number {
  const t = target.toLowerCase();
  const q = query.toLowerCase().trim();
  if (t.startsWith(q)) return 100;
  if (t.includes(q)) return 50;
  return 10;
}

/** Fetch Wikipedia OpenSearch suggestions. */
async function fetchWikipediaSuggestions(
  query: string,
  signal?: AbortSignal
): Promise<SearchSuggestion[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=6&namespace=0&format=json&origin=*`;
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const data = await res.json();
    // OpenSearch returns [query, [titles], [descriptions], [urls]]
    const titles: string[] = data[1] || [];
    const descriptions: string[] = data[2] || [];
    return titles.map((title, i) => ({
      text: title,
      type: "popular" as const,
      subtitle: descriptions[i] || null,
      thumbnail: null,
    }));
  } catch {
    return [];
  }
}

export function createSuggestionEngine(options: SuggestionEngineOptions) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let abortController: AbortController | null = null;

  const { history, contextKeywords, domainHistory } = options;

  // Build context keyword set (dedupe, lowercase)
  const ctxWords: string[] = [];
  const ctxSeen = new Set<string>();
  for (const kw of contextKeywords) {
    const lower = kw.toLowerCase().trim();
    if (lower.length >= 2 && !ctxSeen.has(lower)) {
      ctxSeen.add(lower);
      ctxWords.push(kw.trim());
    }
  }
  for (const d of domainHistory) {
    const lower = d.domain.toLowerCase().trim();
    if (lower.length >= 2 && !ctxSeen.has(lower)) {
      ctxSeen.add(lower);
      ctxWords.push(d.domain.trim());
    }
  }

  function suggest(
    query: string,
    callback: (results: SearchSuggestion[]) => void
  ): void {
    // Cancel previous debounced call
    if (debounceTimer) clearTimeout(debounceTimer);
    if (abortController) abortController.abort();

    const q = query.trim();
    if (!q) {
      callback([]);
      return;
    }

    // === Synchronous: history + context ===
    const seen = new Set<string>();
    const results: SearchSuggestion[] = [];

    // 1. History matches
    const historyMatches = history
      .filter(h => prefixMatch(h.keyword, q))
      .sort((a, b) => matchScore(b.keyword, q) - matchScore(a.keyword, q))
      .slice(0, MAX_HISTORY);

    for (const h of historyMatches) {
      const key = h.keyword.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ text: h.keyword, type: "history" });
      }
    }

    // 2. Context matches
    const contextMatches = ctxWords
      .filter(kw => prefixMatch(kw, q))
      .slice(0, MAX_CONTEXT);

    for (const kw of contextMatches) {
      const key = kw.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ text: kw, type: "context" });
      }
    }

    // Emit sync results immediately
    callback(results.slice(0, MAX_TOTAL));

    // === Async: Wikipedia (debounced) ===
    if (q.length >= 2) {
      abortController = new AbortController();
      const signal = abortController.signal;

      debounceTimer = setTimeout(async () => {
        const wikiResults = await fetchWikipediaSuggestions(q, signal);
        if (signal.aborted) return;

        const merged = [...results];
        let added = 0;
        for (const w of wikiResults) {
          const key = w.text.toLowerCase();
          if (!seen.has(key) && added < MAX_POPULAR) {
            seen.add(key);
            merged.push(w);
            added++;
          }
        }
        callback(merged.slice(0, MAX_TOTAL));
      }, DEBOUNCE_MS);
    }
  }

  function cancel(): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (abortController) abortController.abort();
  }

  return { suggest, cancel };
}
