/**
 * speculative-prefetch — Debounced Wikipedia summary prefetch as user types.
 * Fires after 600ms of typing pause, returns title/thumbnail/extract.
 * Cached in a Map; cancelled on each keystroke via AbortController.
 */

const WIKI_SUMMARY_API = "https://en.wikipedia.org/api/rest_v1/page/summary/";

export interface PrefetchResult {
  title: string;
  thumbnail: string | null;
  description: string | null;
  extract: string | null;
}

const cache = new Map<string, PrefetchResult>();
let currentController: AbortController | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Cancel any in-flight prefetch */
export function cancelPrefetch() {
  if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
  if (currentController) { currentController.abort(); currentController = null; }
}

/** Get cached result instantly (no fetch) */
export function getCachedPrefetch(query: string): PrefetchResult | null {
  return cache.get(query.trim().toLowerCase()) || null;
}

/**
 * Debounced speculative prefetch. Calls onResult when data arrives.
 * Call cancelPrefetch() or invoke again to cancel prior requests.
 */
export function speculativePrefetch(
  query: string,
  onResult: (result: PrefetchResult | null) => void,
  delay = 350
) {
  cancelPrefetch();

  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) { onResult(null); return; }

  const key = trimmed.toLowerCase();

  // Return cached immediately
  const cached = cache.get(key);
  if (cached) { onResult(cached); return; }

  debounceTimer = setTimeout(async () => {
    const controller = new AbortController();
    currentController = controller;

    try {
      const encoded = encodeURIComponent(trimmed.replace(/ /g, "_"));
      const resp = await fetch(`${WIKI_SUMMARY_API}${encoded}`, {
        signal: controller.signal,
        headers: { "Api-User-Agent": "UOR-Knowledge/1.0" },
      });

      if (!resp.ok || controller.signal.aborted) { onResult(null); return; }

      const data = await resp.json();
      if (controller.signal.aborted) return;

      const result: PrefetchResult = {
        title: data.title || trimmed,
        thumbnail: data.thumbnail?.source || data.originalimage?.source || null,
        description: data.description || null,
        extract: data.extract || null,
      };

      cache.set(key, result);
      onResult(result);
    } catch {
      if (!controller.signal.aborted) onResult(null);
    }
  }, delay);
}
