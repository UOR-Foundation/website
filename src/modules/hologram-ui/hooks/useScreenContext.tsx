/**
 * useScreenContext — Ambient Awareness for Lumini.AI
 * ═══════════════════════════════════════════════════
 *
 * A lightweight observer system that captures the user's current viewport
 * state — route, visible content, selected text, active media, and metadata
 * from "context beacons" registered by content components.
 *
 * The screen context is assembled on-demand into a compact digest that
 * Lumini.AI receives as ambient awareness, enabling it to comment on,
 * analyze, or enhance whatever the user is currently experiencing.
 *
 * Architecture:
 *   ┌─────────────┐     ┌──────────────┐     ┌────────────┐
 *   │ Page / Comp  │────▶│ Context      │────▶│ Lumini.AI  │
 *   │ (beacon)     │     │ Registry     │     │ (digest)   │
 *   └─────────────┘     └──────────────┘     └────────────┘
 *
 * @module hologram-ui/hooks/useScreenContext
 */

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

// ── Types ──────────────────────────────────────────────────────────────────

export type BeaconContentType =
  | "page" | "article" | "documentation" | "code" | "visualization"
  | "tool" | "media" | "conversation" | "profile" | "settings"
  | "explorer" | "dashboard" | "project" | "book" | "video"
  | "audio" | "website" | "custom";

export interface ContextBeacon {
  id: string;
  title: string;
  summary: string;
  contentType: BeaconContentType;
  metadata?: Record<string, unknown>;
  contentSnapshot?: string;
  priority?: number;
  updatedAt: number;
}

export interface ScreenContextDigest {
  route: string;
  section: string;
  selectedText: string | null;
  beacons: ContextBeacon[];
  promptDigest: string;
  hasContext: boolean;
  assembledAt: number;
}

// ── Route → Section mapping ────────────────────────────────────────────────

const ROUTE_SECTIONS: Record<string, string> = {
  "/hologram-os": "Hologram Home",
  "/console/apps": "App Library",
  "/console/overview": "System Overview",
  "/console/dns": "DNS & Resolution",
  "/console/shield": "Security Shield",
  "/console/compute": "Compute Engine",
  "/console/store": "Data Store",
  "/console/trust": "Trust Network",
  "/console/agents": "Agent Console",
  "/your-space": "Personal Space",
  "/ring-explorer": "Ring Explorer",
  "/derivation-lab": "Derivation Lab",
  "/knowledge-graph": "Knowledge Graph",
  "/sparql-editor": "SPARQL Editor",
  "/code-knowledge-graph": "Code Nexus",
  "/agent-console": "Agent Console",
  "/conformance": "Conformance Suite",
  "/research": "Research Papers",
  "/standard": "UOR Standard",
  "/semantic-web": "Semantic Web",
  "/projects": "Projects",
  "/blog": "Blog",
  "/api": "API Documentation",
  "/settings": "Settings",
};

function routeToSection(path: string): string {
  if (ROUTE_SECTIONS[path]) return ROUTE_SECTIONS[path];
  for (const [prefix, section] of Object.entries(ROUTE_SECTIONS)) {
    if (path.startsWith(prefix)) return section;
  }
  if (path.startsWith("/blog/")) return "Blog Article";
  if (path.startsWith("/projects/")) {
    const slug = path.split("/").pop() || "";
    return `Project: ${slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`;
  }
  if (path.startsWith("/u/")) return "UOR Datum";
  return path.slice(1).replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Home";
}

// ── Beacon Registry (external store) ───────────────────────────────────────

type Listener = () => void;

class BeaconRegistry {
  private beacons = new Map<string, ContextBeacon>();
  private listeners = new Set<Listener>();
  private version = 0;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): number => this.version;

  register(beacon: ContextBeacon): void {
    this.beacons.set(beacon.id, { ...beacon, updatedAt: Date.now() });
    this.version++;
    this.notify();
  }

  update(id: string, partial: Partial<Omit<ContextBeacon, "id">>): void {
    const existing = this.beacons.get(id);
    if (!existing) return;
    this.beacons.set(id, { ...existing, ...partial, updatedAt: Date.now() });
    this.version++;
    this.notify();
  }

  unregister(id: string): void {
    if (!this.beacons.delete(id)) return;
    this.version++;
    this.notify();
  }

  getBeacons(): ContextBeacon[] {
    return Array.from(this.beacons.values())
      .sort((a, b) => (b.priority ?? 1) - (a.priority ?? 1));
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }
}

const registry = new BeaconRegistry();

// ── Context ────────────────────────────────────────────────────────────────

interface ScreenContextValue {
  registerBeacon: (beacon: ContextBeacon) => void;
  updateBeacon: (id: string, partial: Partial<Omit<ContextBeacon, "id">>) => void;
  unregisterBeacon: (id: string) => void;
  getDigest: () => ScreenContextDigest;
  getPromptContext: () => string;
  version: number;
}

const ScreenContextCtx = createContext<ScreenContextValue | null>(null);

export function ScreenContextProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const version = useSyncExternalStore(registry.subscribe, registry.getSnapshot);

  const registerBeacon = useCallback((beacon: ContextBeacon) => registry.register(beacon), []);
  const updateBeacon = useCallback((id: string, partial: Partial<Omit<ContextBeacon, "id">>) => registry.update(id, partial), []);
  const unregisterBeacon = useCallback((id: string) => registry.unregister(id), []);

  const getDigest = useCallback((): ScreenContextDigest => {
    const route = location.pathname;
    const section = routeToSection(route);
    const beacons = registry.getBeacons();

    let selectedText: string | null = null;
    try {
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) {
        selectedText = sel.toString().trim().slice(0, 2000);
      }
    } catch {}

    const parts: string[] = [];
    parts.push(`[Location: ${section} (${route})]`);

    if (selectedText) {
      parts.push(`[User has selected this text: "${selectedText.slice(0, 500)}${selectedText.length > 500 ? "…" : ""}"]`);
    }

    for (const b of beacons.slice(0, 5)) {
      let line = `[Viewing ${b.contentType}: "${b.title}"]`;
      if (b.summary) line += ` — ${b.summary}`;
      if (b.contentSnapshot) {
        const snap = b.contentSnapshot.slice(0, 1500);
        line += `\n--- Content Preview ---\n${snap}`;
        if (b.contentSnapshot.length > 1500) line += "\n[…truncated]";
      }
      if (b.metadata && Object.keys(b.metadata).length > 0) {
        line += `\n[Metadata: ${JSON.stringify(b.metadata)}]`;
      }
      parts.push(line);
    }

    const promptDigest = parts.join("\n\n");
    return {
      route,
      section,
      selectedText,
      beacons,
      promptDigest,
      hasContext: beacons.length > 0 || !!selectedText,
      assembledAt: Date.now(),
    };
  }, [location.pathname]);

  const getPromptContext = useCallback(() => getDigest().promptDigest, [getDigest]);

  return (
    <ScreenContextCtx.Provider value={{
      registerBeacon, updateBeacon, unregisterBeacon, getDigest, getPromptContext, version,
    }}>
      {children}
    </ScreenContextCtx.Provider>
  );
}

// ── Hooks ──────────────────────────────────────────────────────────────────

const FALLBACK: ScreenContextValue = {
  registerBeacon: () => {},
  updateBeacon: () => {},
  unregisterBeacon: () => {},
  getDigest: () => ({
    route: "/", section: "Home", selectedText: null, beacons: [],
    promptDigest: "[Location: Home (/)]", hasContext: false, assembledAt: Date.now(),
  }),
  getPromptContext: () => "[Location: Home (/)]",
  version: 0,
};

export function useScreenContext() {
  return useContext(ScreenContextCtx) ?? FALLBACK;
}

/**
 * useContextBeacon — Register a context beacon from any content component.
 *
 * @example
 * ```tsx
 * useContextBeacon({
 *   id: "blog-post-123",
 *   title: "Building the Internet's Knowledge Graph",
 *   summary: "A deep dive into content-addressing for the semantic web",
 *   contentType: "article",
 *   contentSnapshot: articleText.slice(0, 2000),
 * });
 * ```
 */
export function useContextBeacon(beacon: Omit<ContextBeacon, "updatedAt">) {
  const { registerBeacon, updateBeacon, unregisterBeacon } = useScreenContext();

  // Register on mount, unregister on unmount
  useEffect(() => {
    registerBeacon({ ...beacon, updatedAt: Date.now() });
    return () => unregisterBeacon(beacon.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update when key content changes
  const digest = `${beacon.title}|${beacon.summary}|${beacon.contentSnapshot?.slice(0, 100)}`;
  const prevDigest = useRef(digest);

  useEffect(() => {
    if (digest !== prevDigest.current) {
      prevDigest.current = digest;
      updateBeacon(beacon.id, { ...beacon, updatedAt: Date.now() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digest]);
}
