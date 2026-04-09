/**
 * Deep Link Protocol Handler — uor://
 * ═════════════════════════════════════════════════════════════════
 *
 * Registers `uor://` as a system-wide protocol in Tauri.
 * Clicking uor://space/{spaceCid} or uor://resolve/{canonicalId}
 * from anywhere opens UOR OS directly to that content.
 *
 * In browser, falls back to URL query parameter parsing.
 *
 * @layer sovereign-spaces/deep-link
 */

import { isLocal } from "@/lib/runtime";

// ── Types ───────────────────────────────────────────────────────────────

export type DeepLinkAction =
  | { type: "open-space"; spaceCid: string }
  | { type: "resolve"; canonicalId: string }
  | { type: "open-app"; appId: string; args?: string }
  | { type: "search"; query: string }
  | { type: "unknown"; raw: string };

// ── Parser ──────────────────────────────────────────────────────────────

/**
 * Parse a uor:// URL into a typed action.
 *
 * Supported formats:
 *   uor://space/{spaceCid}
 *   uor://resolve/{canonicalId}
 *   uor://app/{appId}?args={...}
 *   uor://search?q={query}
 */
export function parseDeepLink(url: string): DeepLinkAction {
  try {
    // Normalize: uor:// → custom URL
    const normalized = url.replace(/^uor:\/\//, "https://uor.link/");
    const parsed = new URL(normalized);
    const segments = parsed.pathname.split("/").filter(Boolean);

    if (segments[0] === "space" && segments[1]) {
      return { type: "open-space", spaceCid: segments[1] };
    }
    if (segments[0] === "resolve" && segments[1]) {
      return { type: "resolve", canonicalId: decodeURIComponent(segments[1]) };
    }
    if (segments[0] === "app" && segments[1]) {
      return {
        type: "open-app",
        appId: segments[1],
        args: parsed.searchParams.get("args") ?? undefined,
      };
    }
    if (segments[0] === "search") {
      return { type: "search", query: parsed.searchParams.get("q") ?? "" };
    }

    return { type: "unknown", raw: url };
  } catch {
    return { type: "unknown", raw: url };
  }
}

// ── Handler ─────────────────────────────────────────────────────────────

type DeepLinkHandler = (action: DeepLinkAction) => void;
let _handler: DeepLinkHandler | null = null;

/**
 * Register a handler for incoming deep links.
 */
export function onDeepLink(handler: DeepLinkHandler): () => void {
  _handler = handler;
  return () => { _handler = null; };
}

/**
 * Initialize deep link listener.
 * In Tauri, listens to the deep-link plugin events.
 * In browser, checks for ?uor= query parameter on load.
 */
export async function initDeepLinks(): Promise<void> {
  if (isLocal()) {
    try {
      // @ts-ignore — Tauri plugin only available in desktop builds
      const mod = await import("@tauri-apps/plugin-deep-link");
      // Listen for incoming URLs
      await mod.onOpenUrl((urls: string[]) => {
        for (const url of urls) {
          const action = parseDeepLink(url);
          _handler?.(action);
        }
      });
      console.log("[DeepLink] Tauri deep-link listener active");
    } catch (err) {
      console.warn("[DeepLink] Plugin not available:", (err as Error).message);
    }
    return;
  }

  // Browser fallback: check URL params
  const params = new URLSearchParams(window.location.search);
  const uorLink = params.get("uor");
  if (uorLink) {
    const action = parseDeepLink(uorLink);
    _handler?.(action);
  }
}
