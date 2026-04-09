/**
 * Canonical Tech Stack Manifest
 * ═══════════════════════════════════════════════════════════════
 *
 * Self-declaring manifest of every canonical framework the system
 * prefers and depends on. At boot, each component is verified.
 *
 * The system inscribes its preferred stack, validates presence,
 * and includes a stack hash in the seal so any change is detected.
 *
 * @module boot/tech-stack
 */

import { sha256hex } from "@/lib/crypto";

// ── Stack entry type ────────────────────────────────────────────────────

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
  | "local-persistence";

export type StackCriticality = "critical" | "recommended" | "optional";

export interface StackEntry {
  /** Framework name. */
  readonly name: string;
  /** What this framework does in the system (plain English). */
  readonly role: string;
  /** Functional category. */
  readonly category: StackCategory;
  /** How important is this for core operation. */
  readonly criticality: StackCriticality;
  /** What happens if this component is unavailable. */
  readonly fallback: string;
  /** Async function that returns true if the component is available. */
  readonly verify: () => Promise<boolean>;
  /** Returns detected version string, or null if unavailable. */
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
  {
    name: "Oxigraph",
    role: "SPARQL 1.1 quad store — single canonical graph engine for all RDF data",
    category: "graph",
    criticality: "critical",
    fallback: "Array-based in-memory fallback (no SPARQL 1.1 support)",
    verify: async () => {
      try {
        const ox = await import("oxigraph");
        return typeof (ox as any).Store === "function" || typeof ox.default?.Store === "function";
      } catch {
        return false;
      }
    },
    detectVersion: async () => {
      try {
        // Oxigraph doesn't expose version directly; use package version
        return "0.5.x";
      } catch {
        return null;
      }
    },
  },
  {
    name: "UOR Foundation",
    role: "Ring algebra compute engine — WASM-compiled Rust crate for R₈ arithmetic",
    category: "compute",
    criticality: "critical",
    fallback: "TypeScript pure-math fallback (identical results, no binary integrity hash)",
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
    verify: async () => {
      return typeof crypto !== "undefined" && typeof crypto.subtle?.digest === "function";
    },
    detectVersion: async () => {
      return typeof crypto !== "undefined" ? "native" : null;
    },
  },
  {
    name: "jsonld",
    role: "URDNA2015 canonicalization — produces deterministic N-Quads for content addressing",
    category: "canonical",
    criticality: "critical",
    fallback: "JSON.stringify sort-keys fallback (not W3C compliant)",
    verify: async () => {
      try {
        const jsonld = await import("jsonld");
        return typeof jsonld.default?.canonize === "function" || typeof (jsonld as any).canonize === "function";
      } catch {
        return false;
      }
    },
    detectVersion: async () => {
      try {
        await import("jsonld");
        return "9.x";
      } catch {
        return null;
      }
    },
  },
  {
    name: "React",
    role: "Component rendering framework — all UI is React 18 concurrent mode",
    category: "ui",
    criticality: "critical",
    fallback: "None — application cannot render",
    verify: async () => {
      try {
        const React = await import("react");
        return typeof React.createElement === "function";
      } catch {
        return false;
      }
    },
    detectVersion: async () => {
      try {
        const React = await import("react");
        return React.version;
      } catch {
        return null;
      }
    },
  },
  {
    name: "Vite",
    role: "Build system and HMR — zero-config ESM bundling",
    category: "bundler",
    criticality: "critical",
    fallback: "None — application cannot build",
    verify: async () => {
      return typeof import.meta?.env !== "undefined";
    },
    detectVersion: async () => {
      return "5.x";
    },
  },
  {
    name: "TanStack Query",
    role: "Server state management — caching, deduplication, background refetch",
    category: "state",
    criticality: "recommended",
    fallback: "Manual fetch + useState (no cache, no deduplication)",
    verify: async () => {
      try {
        const tq = await import("@tanstack/react-query");
        return typeof tq.useQuery === "function";
      } catch {
        return false;
      }
    },
    detectVersion: async () => {
      try {
        await import("@tanstack/react-query");
        return "5.x";
      } catch {
        return null;
      }
    },
  },
  {
    name: "Three.js / R3F",
    role: "3D holographic visualization — WebGL rendering for graph topologies",
    category: "3d",
    criticality: "optional",
    fallback: "2D graph views only",
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
    verify: async () => {
      try {
        await import("@noble/post-quantum");
        return true;
      } catch {
        return false;
      }
    },
    detectVersion: async () => {
      try {
        await import("@noble/post-quantum");
        return "0.5.x";
      } catch {
        return null;
      }
    },
  },
  {
    name: "Supabase",
    role: "Cloud relational store — persistent data, auth, edge functions, file storage",
    category: "cloud",
    criticality: "recommended",
    fallback: "Local-only mode (IndexedDB only, no sync)",
    verify: async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        return typeof supabase.from === "function";
      } catch {
        return false;
      }
    },
    detectVersion: async () => {
      try {
        return "2.x";
      } catch {
        return null;
      }
    },
  },
  {
    name: "IndexedDB",
    role: "Local persistence — offline-first storage for graph quads and audit trails",
    category: "local-persistence",
    criticality: "recommended",
    fallback: "In-memory only (data lost on page close)",
    verify: async () => {
      return typeof indexedDB !== "undefined";
    },
    detectVersion: async () => {
      return typeof indexedDB !== "undefined" ? "native" : null;
    },
  },
] as const;

// ── Validation ──────────────────────────────────────────────────────────

/**
 * Validate the entire tech stack.
 * Returns health status with a hash of the validated stack.
 */
export async function validateStack(): Promise<StackHealth> {
  const results: StackValidationResult[] = [];
  const now = new Date().toISOString();

  // Run all verifications in parallel
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

  // Compute stack hash from sorted name:version pairs
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
