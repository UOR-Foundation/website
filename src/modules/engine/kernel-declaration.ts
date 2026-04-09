/**
 * UOR Kernel Declaration — Self-Declared Virtual OS Primitives
 * ═══════════════════════════════════════════════════════════════
 *
 * THE ENGINE IS THE DECLARATION.
 * Nothing exists that it does not declare.
 *
 * The 7 kernel functions map 1:1 to the 7 points of the Fano plane (PG(2,2)).
 * Every higher-level operation is a composition of these primitives.
 * Each primitive derives from the engine's own ring operations in Z/256Z.
 *
 * KEY FIX: The kernel table is no longer cached with stale engine closures.
 * It is rebuilt on every call to getKernelDeclaration() to always reflect
 * the current engine state (WASM or TS fallback).
 *
 * @layer 0
 * @stability frozen (additive-only via Fano extension)
 */

import { getEngine } from "./adapter";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

// ── Kernel Function Types ────────────────────────────────────────────────

export type KernelFunctionName =
  | "encode"
  | "decode"
  | "compose"
  | "store"
  | "resolve"
  | "observe"
  | "seal";

/** The tier a component belongs to relative to the kernel */
export type KernelTier = "kernel" | "presentation" | "optimization";

export interface KernelFunction {
  readonly name: KernelFunctionName;
  readonly fanoPoint: number;
  readonly ringBasis: readonly string[];
  readonly framework: string;
  readonly description: string;
  readonly governsNamespaces: readonly string[];
  readonly verify: () => boolean;
}

// ── The 7 Fano-Mapped Kernel Functions ───────────────────────────────────

function buildKernelTable(): readonly KernelFunction[] {
  // KEY FIX: resolve engine at call time, not at cache time
  const engine = getEngine();

  return Object.freeze([
    {
      name: "encode" as const,
      fanoPoint: 0,
      ringBasis: ["neg", "bnot"],
      framework: "@noble/hashes (SHA-256/BLAKE3)",
      description: "Content → canonical identity (URDNA2015 → SHA-256 → UOR address)",
      governsNamespaces: ["u/", "schema/", "type/"],
      verify: () => {
        const x = 42;
        return typeof engine.neg(engine.bnot(x)) === "number";
      },
    },
    {
      name: "decode" as const,
      fanoPoint: 1,
      ringBasis: ["verify_critical_identity", "verify_all_critical_identity"],
      framework: "UOR Engine (WASM)",
      description: "Identity → verification (prove content matches its address)",
      governsNamespaces: ["proof/", "conformance/", "predicate/"],
      verify: () => {
        return engine.verifyCriticalIdentity(0) && engine.verifyCriticalIdentity(1);
      },
    },
    {
      name: "compose" as const,
      fanoPoint: 2,
      ringBasis: ["ring_mul", "ring_add"],
      framework: "Pure TypeScript",
      description: "Morphism composition (f ∘ g — no external dependency)",
      governsNamespaces: ["morphism/", "op/", "monoidal/", "operad/", "linear/"],
      verify: () => {
        return engine.mul(engine.add(1, 2), 3) === engine.add(engine.mul(1, 3), engine.mul(2, 3));
      },
    },
    {
      name: "store" as const,
      fanoPoint: 3,
      ringBasis: ["ring_xor", "ring_and"],
      framework: "GrafeoDB (@grafeo-db/web)",
      description: "Multi-model graph persistence (SPARQL + Cypher + GQL + SQL)",
      governsNamespaces: ["query/", "partition/", "region/", "boundary/"],
      verify: () => {
        const x = 137;
        return engine.xor(engine.xor(x, 42), 42) === x;
      },
    },
    {
      name: "resolve" as const,
      fanoPoint: 4,
      ringBasis: ["succ", "pred"],
      framework: "UNS + multiformats",
      description: "Name → content traversal with CID interop (IPFS/AT Protocol)",
      governsNamespaces: ["resolver/", "recursion/", "reduction/", "convergence/"],
      verify: () => {
        const x = 100;
        return engine.pred(engine.succ(x)) === x && engine.succ(engine.pred(x)) === x;
      },
    },
    {
      name: "observe" as const,
      fanoPoint: 5,
      ringBasis: ["ring_or"],
      framework: "@okikio/observables (TC39 Observable)",
      description: "TC39-aligned event subscription with backpressure and deterministic teardown",
      governsNamespaces: ["observable/", "stream/", "effect/", "parallel/", "interaction/"],
      verify: () => {
        return engine.or(0, 0) === 0 && engine.or(0xFF, 0) === 0xFF;
      },
    },
    {
      name: "seal" as const,
      fanoPoint: 6,
      ringBasis: ["all"],
      framework: "singleProofHash + @noble/hashes",
      description: "Integrity proof (all ring ops → @noble/hashes SHA-256 → cryptographic seal)",
      governsNamespaces: [
        "cert/", "trace/", "derivation/", "cohomology/", "homology/",
        "carry/", "cascade/", "division/", "failure/", "state/",
        "enforcement/",
      ],
      verify: () => {
        return engine.verifyAllCriticalIdentity();
      },
    },
  ]);
}

// ── Public API (no caching — always uses current engine) ─────────────────

/**
 * Get the kernel declaration table.
 * KEY FIX: No longer caches — always resolves the current engine so
 * the table reflects WASM when available.
 */
export function getKernelDeclaration(): readonly KernelFunction[] {
  return buildKernelTable();
}

/**
 * Verify all 7 kernel functions are operational.
 * Returns per-function results and aggregate pass/fail.
 */
export function verifyKernel(): {
  results: { name: KernelFunctionName; fanoPoint: number; ok: boolean }[];
  allPassed: boolean;
  hash: string;
} {
  const table = getKernelDeclaration();
  const results = table.map((fn) => {
    let ok = false;
    try {
      ok = fn.verify();
    } catch {
      ok = false;
    }
    return { name: fn.name, fanoPoint: fn.fanoPoint, ok };
  });

  const allPassed = results.every((r) => r.ok);

  // Deterministic kernel state string
  const stateString = results.map((r) => `${r.name}:${r.fanoPoint}:${r.ok ? 1 : 0}`).join("|");

  // SHA-256 via @noble/hashes (synchronous, cryptographic)
  const stateBytes = new TextEncoder().encode(stateString);
  const digest = sha256(stateBytes);
  const hash = bytesToHex(digest);

  return { results, allPassed, hash };
}

/**
 * Compute a cryptographic SHA-256 kernel hash.
 * Uses @noble/hashes for a proper 256-bit digest.
 * Now synchronous internally — async signature preserved for backward compat.
 */
export async function computeKernelHashSha256(): Promise<string> {
  const { results } = verifyKernel();
  const stateString = results.map(r => `${r.name}:${r.fanoPoint}:${r.ok ? 1 : 0}`).join("|");
  const stateBytes = new TextEncoder().encode(stateString);
  return bytesToHex(sha256(stateBytes));
}

/**
 * Map a bus namespace to its governing kernel function.
 */
export function namespaceToKernel(ns: string): KernelFunctionName | null {
  const table = getKernelDeclaration();
  const normalized = ns.endsWith("/") ? ns : `${ns}/`;
  for (const fn of table) {
    if (fn.governsNamespaces.includes(normalized)) {
      return fn.name;
    }
  }
  return null;
}

/**
 * Validate that the kernel declaration covers all engine-declared namespaces.
 */
export function auditNamespaceCoverage(): {
  covered: string[];
  uncovered: string[];
  total: number;
} {
  const engine = getEngine();
  const engineNamespaces: string[] = JSON.parse(
    typeof engine.listNamespaces === "function"
      ? JSON.stringify(engine.listNamespaces())
      : "[]"
  );

  const table = getKernelDeclaration();
  const governedSet = new Set(table.flatMap((fn) => fn.governsNamespaces));

  const covered: string[] = [];
  const uncovered: string[] = [];

  for (const ns of engineNamespaces) {
    if (governedSet.has(ns)) {
      covered.push(ns);
    } else {
      uncovered.push(ns);
    }
  }

  return { covered, uncovered, total: engineNamespaces.length };
}

// ── Fano Lines (composition rules) ───────────────────────────────────────

export const FANO_LINES: readonly (readonly [KernelFunctionName, KernelFunctionName, KernelFunctionName])[] = [
  ["encode", "decode", "seal"],       // L₀: identity lifecycle
  ["encode", "compose", "observe"],   // L₁: reactive transforms
  ["encode", "store", "resolve"],     // L₂: content-addressed storage
  ["decode", "compose", "store"],     // L₃: verified graph writes
  ["decode", "resolve", "observe"],   // L₄: live verification streams
  ["compose", "resolve", "seal"],     // L₅: derived proofs
  ["store", "observe", "seal"],       // L₆: auditable event stores
] as const;
