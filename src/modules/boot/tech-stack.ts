/**
 * Canonical Tech Stack Manifest v2.0
 * ═══════════════════════════════════════════════════════════════
 *
 * Self-declaring manifest of every canonical framework the system
 * uses. Each entry documents WHY it was chosen via selection criteria.
 *
 * SELECTION POLICY: Every framework must satisfy all 7 criteria.
 * One framework per function — no overlapping responsibilities.
 *
 * @module boot/tech-stack
 */

import { sha256hex } from "@/lib/crypto";

// ── Selection Policy ────────────────────────────────────────────────────

export interface SelectionCriterion {
  readonly name: string;
  readonly definition: string;
}

/**
 * The 7 mandatory criteria every canonical framework must satisfy.
 * This is inscribed in the system — the system self-declares its policy.
 */
export const SELECTION_POLICY: readonly SelectionCriterion[] = [
  {
    name: "Open Source",
    definition: "OSI-approved license (MIT, Apache 2.0, BSD). No proprietary dependencies.",
  },
  {
    name: "Interoperability",
    definition: "W3C/IETF/ISO standards-based. Standard protocols (HTTP, RDF, SPARQL, WebSocket). No vendor lock-in.",
  },
  {
    name: "Performance",
    definition: "Battle-tested at scale by large organizations. WASM-capable or near-native where applicable.",
  },
  {
    name: "Portability",
    definition: "Runs identically on edge (Service Worker), local (browser/desktop), and cloud (Node/Deno/Bun).",
  },
  {
    name: "Maturity",
    definition: "3+ years in production use, active maintenance, >1000 GitHub stars or equivalent adoption signal.",
  },
  {
    name: "Minimality",
    definition: "One framework per function. No overlapping responsibilities.",
  },
  {
    name: "Future-Proof",
    definition: "Aligned with emerging standards (Web Components, WASM, HTTP/3, post-quantum).",
  },
] as const;

// ── Stack entry types ───────────────────────────────────────────────────

export type StackCategory =
  | "graph"
  | "compute"
  | "crypto"
  | "canonical"
  | "ui"
  | "bundler"
  | "state"
  | "styling"
  | "3d"
  | "post-quantum"
  | "cloud"
  | "local-persistence"
  | "animation"
  | "a11y-primitives"
  | "routing"
  | "compression"
  | "media"
  | "graph-layout"
  | "interaction";

export type StackCriticality = "critical" | "recommended" | "optional";

export interface SelectionCriteria {
  /** OSI-approved license identifier. */
  readonly license: string;
  /** W3C/IETF/ISO standard this implements, if any. */
  readonly standard?: string;
  /** Environments where this runs identically. */
  readonly portability: readonly string[];
  /** Evidence of adoption (stars, native API, RFC, etc.). */
  readonly adoptionSignal: string;
}

export interface StackEntry {
  readonly name: string;
  readonly role: string;
  readonly category: StackCategory;
  readonly criticality: StackCriticality;
  readonly fallback: string;
  /** Why this framework was selected — must satisfy all 7 SELECTION_POLICY criteria. */
  readonly criteria: SelectionCriteria;
  readonly verify: () => Promise<boolean>;
  readonly detectVersion: () => Promise<string | null>;
}

export interface StackValidationResult {
  readonly entry: StackEntry;
  readonly available: boolean;
  readonly version: string | null;
  readonly verifiedAt: string;
}

export interface StackHealth {
  readonly results: StackValidationResult[];
  readonly allCriticalPresent: boolean;
  readonly stackHash: string;
  readonly validatedAt: string;
}

// ── The Manifest ────────────────────────────────────────────────────────

export const TECH_STACK: readonly StackEntry[] = [
  // ─── CRITICAL ─────────────────────────────────────────────────────
  {
    name: "Oxigraph",
    role: "SPARQL 1.1 quad store — single canonical graph engine for all RDF data",
    category: "graph",
    criticality: "critical",
    fallback: "Array-based in-memory fallback (no SPARQL 1.1 support)",
    criteria: {
      license: "Apache-2.0",
      standard: "W3C SPARQL 1.1, W3C RDF 1.1",
      portability: ["browser", "node", "deno", "edge-worker"],
      adoptionSignal: "Rust/WASM, used by Wikidata query tooling",
    },
    verify: async () => {
      try {
        const ox = await import("oxigraph");
        return typeof (ox as any).Store === "function" || typeof ox.default?.Store === "function";
      } catch {
        return false;
      }
    },
    detectVersion: async () => "0.5.x",
  },
  {
    name: "UOR Foundation",
    role: "Ring algebra compute engine — WASM-compiled Rust crate for R₈ arithmetic",
    category: "compute",
    criticality: "critical",
    fallback: "TypeScript pure-math fallback (identical results, no binary integrity hash)",
    criteria: {
      license: "MIT",
      portability: ["browser", "node", "edge-worker"],
      adoptionSignal: "Custom Rust crate, WASM-first design",
    },
    verify: async () => {
      try {
        const { getEngine } = await import("@/modules/engine");
        return typeof getEngine().neg === "function";
      } catch {
        return false;
      }
    },
    detectVersion: async () => {
      try {
        const { getEngine } = await import("@/modules/engine");
        return getEngine().version;
      } catch {
        return null;
      }
    },
  },
  {
    name: "Web Crypto API",
    role: "SHA-256 hashing and cryptographic randomness for seal computation",
    category: "crypto",
    criticality: "critical",
    fallback: "None — system cannot produce seals without crypto.subtle",
    criteria: {
      license: "W3C",
      standard: "W3C Web Cryptography API",
      portability: ["browser", "node", "deno", "edge-worker", "bun"],
      adoptionSignal: "W3C native API — every modern runtime",
    },
    verify: async () => typeof crypto !== "undefined" && typeof crypto.subtle?.digest === "function",
    detectVersion: async () => typeof crypto !== "undefined" ? "native" : null,
  },
  {
    name: "jsonld",
    role: "URDNA2015 canonicalization — deterministic N-Quads for content addressing",
    category: "canonical",
    criticality: "critical",
    fallback: "JSON.stringify sort-keys fallback (not W3C compliant)",
    criteria: {
      license: "BSD-3-Clause",
      standard: "W3C JSON-LD 1.1, W3C RDF Dataset Canonicalization",
      portability: ["browser", "node", "deno"],
      adoptionSignal: "W3C reference implementation, 1.5k+ GitHub stars",
    },
    verify: async () => {
      try {
        const jsonld = await import("jsonld");
        return typeof jsonld.default?.canonize === "function" || typeof (jsonld as any).canonize === "function";
      } catch {
        return false;
      }
    },
    detectVersion: async () => {
      try { await import("jsonld"); return "9.x"; } catch { return null; }
    },
  },
  {
    name: "React",
    role: "Component rendering — all UI is React 18 concurrent mode",
    category: "ui",
    criticality: "critical",
    fallback: "None — application cannot render",
    criteria: {
      license: "MIT",
      standard: "JSX (TC39 stage), W3C DOM",
      portability: ["browser", "node (SSR)", "edge-worker (RSC)"],
      adoptionSignal: "230k+ GitHub stars, Meta, Vercel, Netflix",
    },
    verify: async () => {
      try {
        const React = await import("react");
        return typeof React.createElement === "function";
      } catch {
        return false;
      }
    },
    detectVersion: async () => {
      try { const R = await import("react"); return R.version; } catch { return null; }
    },
  },
  {
    name: "Vite",
    role: "Build system and HMR — ESM-native bundling",
    category: "bundler",
    criticality: "critical",
    fallback: "None — application cannot build",
    criteria: {
      license: "MIT",
      standard: "ES Modules (ECMA-262)",
      portability: ["node", "deno", "bun"],
      adoptionSignal: "70k+ GitHub stars, Evan You, Vue/Nuxt/SvelteKit",
    },
    verify: async () => typeof import.meta?.env !== "undefined",
    detectVersion: async () => "5.x",
  },

  // ─── RECOMMENDED ──────────────────────────────────────────────────
  {
    name: "TanStack Query",
    role: "Server state management — caching, deduplication, background refetch",
    category: "state",
    criticality: "recommended",
    fallback: "Manual fetch + useState (no cache, no deduplication)",
    criteria: {
      license: "MIT",
      portability: ["browser", "node (SSR)"],
      adoptionSignal: "45k+ GitHub stars, framework-agnostic core",
    },
    verify: async () => {
      try {
        const tq = await import("@tanstack/react-query");
        return typeof tq.useQuery === "function";
      } catch {
        return false;
      }
    },
    detectVersion: async () => {
      try { await import("@tanstack/react-query"); return "5.x"; } catch { return null; }
    },
  },
  {
    name: "Tailwind CSS",
    role: "Utility-first CSS — design system tokens via semantic classes",
    category: "styling",
    criticality: "recommended",
    fallback: "Inline styles (no design system consistency)",
    criteria: {
      license: "MIT",
      standard: "CSS 3 / CSS Custom Properties",
      portability: ["browser", "node (build-time)"],
      adoptionSignal: "85k+ GitHub stars, Tailwind Labs",
    },
    verify: async () => {
      try {
        return document.styleSheets.length > 0;
      } catch {
        return false;
      }
    },
    detectVersion: async () => "3.x",
  },
  {
    name: "Supabase",
    role: "Cloud relational store — persistent data, auth, edge functions, file storage",
    category: "cloud",
    criticality: "recommended",
    fallback: "Local-only mode (IndexedDB only, no sync)",
    criteria: {
      license: "Apache-2.0",
      standard: "PostgreSQL, HTTP REST, WebSocket (Realtime)",
      portability: ["browser", "node", "deno", "edge-worker", "bun"],
      adoptionSignal: "75k+ GitHub stars, YC-backed, Mozilla/GitHub use",
    },
    verify: async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        return typeof supabase.from === "function";
      } catch {
        return false;
      }
    },
    detectVersion: async () => "2.x",
  },
  {
    name: "IndexedDB",
    role: "Local persistence — offline-first storage for graph quads and audit trails",
    category: "local-persistence",
    criticality: "recommended",
    fallback: "In-memory only (data lost on page close)",
    criteria: {
      license: "W3C",
      standard: "W3C Indexed Database API 3.0",
      portability: ["browser", "service-worker"],
      adoptionSignal: "W3C native API — every browser since 2012",
    },
    verify: async () => typeof indexedDB !== "undefined",
    detectVersion: async () => typeof indexedDB !== "undefined" ? "native" : null,
  },
  {
    name: "Framer Motion",
    role: "Animation engine — declarative mount/unmount transitions and gestures",
    category: "animation",
    criticality: "recommended",
    fallback: "CSS transitions only (no AnimatePresence, no layout animations)",
    criteria: {
      license: "MIT",
      portability: ["browser"],
      adoptionSignal: "25k+ GitHub stars, Framer, used by Vercel/Stripe",
    },
    verify: async () => {
      try {
        const fm = await import("framer-motion");
        return typeof fm.motion !== "undefined";
      } catch {
        return false;
      }
    },
    detectVersion: async () => {
      try { await import("framer-motion"); return "12.x"; } catch { return null; }
    },
  },
  {
    name: "Radix UI",
    role: "Accessible headless primitives — dialogs, menus, tooltips, tabs",
    category: "a11y-primitives",
    criticality: "recommended",
    fallback: "Custom components (no WAI-ARIA compliance guarantees)",
    criteria: {
      license: "MIT",
      standard: "WAI-ARIA 1.2",
      portability: ["browser"],
      adoptionSignal: "16k+ GitHub stars, WorkOS, shadcn/ui foundation",
    },
    verify: async () => {
      try {
        await import("@radix-ui/react-dialog");
        return true;
      } catch {
        return false;
      }
    },
    detectVersion: async () => {
      try { await import("@radix-ui/react-dialog"); return "1.x"; } catch { return null; }
    },
  },
  {
    name: "React Router",
    role: "Client-side routing — declarative URL-driven navigation",
    category: "routing",
    criticality: "recommended",
    fallback: "Manual history.pushState (no nested routes, no loaders)",
    criteria: {
      license: "MIT",
      standard: "URL/History API (WHATWG)",
      portability: ["browser", "node (SSR)"],
      adoptionSignal: "54k+ GitHub stars, Remix/Shopify",
    },
    verify: async () => {
      try {
        const rr = await import("react-router-dom");
        return typeof rr.BrowserRouter !== "undefined";
      } catch {
        return false;
      }
    },
    detectVersion: async () => {
      try { await import("react-router-dom"); return "6.x"; } catch { return null; }
    },
  },

  // ─── OPTIONAL ─────────────────────────────────────────────────────
  {
    name: "Three.js / R3F",
    role: "3D holographic visualization — WebGL rendering for graph topologies",
    category: "3d",
    criticality: "optional",
    fallback: "2D graph views only",
    criteria: {
      license: "MIT",
      standard: "WebGL 2.0 (Khronos), WebGPU (W3C draft)",
      portability: ["browser"],
      adoptionSignal: "103k+ GitHub stars, Ricardo Cabello, NASA/Google use",
    },
    verify: async () => {
      try {
        const three = await import("three");
        return typeof three.WebGLRenderer === "function";
      } catch {
        return false;
      }
    },
    detectVersion: async () => {
      try {
        const three = await import("three");
        return (three as any).REVISION ?? "unknown";
      } catch {
        return null;
      }
    },
  },
  {
    name: "@noble/post-quantum",
    role: "Lattice-based cryptography — ML-KEM and ML-DSA for quantum-resistant seals",
    category: "post-quantum",
    criticality: "optional",
    fallback: "Classical SHA-256 only (no post-quantum key encapsulation)",
    criteria: {
      license: "MIT",
      standard: "NIST FIPS 203/204 (ML-KEM, ML-DSA)",
      portability: ["browser", "node", "deno", "bun"],
      adoptionSignal: "Audited by Cure53, Paul Miller, no native deps",
    },
    verify: async () => {
      try { await import("@noble/post-quantum"); return true; } catch { return false; }
    },
    detectVersion: async () => {
      try { await import("@noble/post-quantum"); return "0.5.x"; } catch { return null; }
    },
  },
  {
    name: "d3-force",
    role: "Force-directed graph layout — velocity Verlet integration for node positioning",
    category: "graph-layout",
    criticality: "optional",
    fallback: "Grid layout (no physics simulation)",
    criteria: {
      license: "ISC",
      portability: ["browser", "node"],
      adoptionSignal: "110k+ GitHub stars (d3), Mike Bostock, Observable",
    },
    verify: async () => {
      try {
        const d3 = await import("d3-force");
        return typeof d3.forceSimulation === "function";
      } catch {
        return false;
      }
    },
    detectVersion: async () => {
      try { await import("d3-force"); return "3.x"; } catch { return null; }
    },
  },
  {
    name: "fflate",
    role: "Compression — gzip/deflate/zlib for data transfer and storage",
    category: "compression",
    criticality: "optional",
    fallback: "No compression (larger payloads)",
    criteria: {
      license: "MIT",
      standard: "IETF RFC 1951 (DEFLATE), RFC 1952 (gzip)",
      portability: ["browser", "node", "deno", "edge-worker"],
      adoptionSignal: "2k+ GitHub stars, fastest pure-JS compression",
    },
    verify: async () => {
      try {
        const ff = await import("fflate");
        return typeof ff.gzipSync === "function";
      } catch {
        return false;
      }
    },
    detectVersion: async () => {
      try { await import("fflate"); return "0.8.x"; } catch { return null; }
    },
  },
  {
    name: "hls.js",
    role: "Adaptive media streaming — HLS protocol for audio/video playback",
    category: "media",
    criticality: "optional",
    fallback: "Native <video> only (no adaptive bitrate)",
    criteria: {
      license: "Apache-2.0",
      standard: "Apple HLS (RFC 8216)",
      portability: ["browser"],
      adoptionSignal: "15k+ GitHub stars, Dailymotion, used by major CDNs",
    },
    verify: async () => {
      try {
        const hls = await import("hls.js");
        return typeof hls.default === "function" || typeof (hls as any).Hls === "function";
      } catch {
        return false;
      }
    },
    detectVersion: async () => {
      try { await import("hls.js"); return "1.x"; } catch { return null; }
    },
  },
  {
    name: "@dnd-kit",
    role: "Accessible drag-and-drop — keyboard + pointer DnD primitives",
    category: "interaction",
    criticality: "optional",
    fallback: "No drag-and-drop (static lists only)",
    criteria: {
      license: "MIT",
      standard: "WAI-ARIA drag-and-drop pattern",
      portability: ["browser"],
      adoptionSignal: "13k+ GitHub stars, Clauderic Demers",
    },
    verify: async () => {
      try {
        await import("@dnd-kit/core");
        return true;
      } catch {
        return false;
      }
    },
    detectVersion: async () => {
      try { await import("@dnd-kit/core"); return "6.x"; } catch { return null; }
    },
  },
] as const;

// ── Validation ──────────────────────────────────────────────────────────

export async function validateStack(): Promise<StackHealth> {
  const results: StackValidationResult[] = [];
  const now = new Date().toISOString();

  const checks = TECH_STACK.map(async (entry) => {
    let available = false;
    let version: string | null = null;
    try {
      available = await entry.verify();
      if (available) {
        version = await entry.detectVersion();
      }
    } catch {
      available = false;
    }
    return { entry, available, version, verifiedAt: now };
  });

  const settled = await Promise.all(checks);
  results.push(...settled);

  const allCriticalPresent = results
    .filter((r) => r.entry.criticality === "critical")
    .every((r) => r.available);

  const fingerprint = results
    .map((r) => `${r.entry.name}:${r.available ? r.version ?? "unknown" : "missing"}`)
    .sort()
    .join("|");
  const stackHash = await sha256hex(fingerprint);

  return {
    results,
    allCriticalPresent,
    stackHash,
    validatedAt: now,
  };
}
