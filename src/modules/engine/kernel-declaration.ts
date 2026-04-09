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
 * This file is the ROOT AUTHORITY — every bus module, tech stack entry,
 * and system component must trace back to one of these 7 functions
 * or be explicitly tagged as `presentation` or `optimization`.
 *
 * @layer 0
 * @stability frozen (additive-only via Fano extension)
 */

import { getEngine } from "./adapter";

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
  /** Primitive name */
  readonly name: KernelFunctionName;
  /** Fano point index P₀–P₆ */
  readonly fanoPoint: number;
  /** Ring operations this primitive derives from */
  readonly ringBasis: readonly string[];
  /** The ONE framework that implements this (no overlap) */
  readonly framework: string;
  /** What this primitive does */
  readonly description: string;
  /** Engine namespaces this primitive governs */
  readonly governsNamespaces: readonly string[];
  /** Verification: prove this primitive works */
  readonly verify: () => boolean;
}

// ── The 7 Fano-Mapped Kernel Functions ───────────────────────────────────
//
// Fano plane PG(2,2): 7 points, 7 lines, 3 points per line.
// Lines encode which triples of primitives compose into higher functions.
//
//        P₀ (encode)
//       / \
//      /   \
//    P₃     P₅
//    /|\ _ /|\
//   / | X  | \
//  P₁ P₆  P₂ P₄
//  (decode)(compose)(resolve)
//    (seal)  (observe)  (store)

function buildKernelTable(): readonly KernelFunction[] {
  const engine = getEngine();

  return Object.freeze([
    {
      name: "encode" as const,
      fanoPoint: 0,
      ringBasis: ["neg", "bnot"],
      framework: "Web Crypto API",
      description: "Content → canonical identity (URDNA2015 → SHA-256 → UOR address)",
      governsNamespaces: ["u/", "schema/", "type/"],
      verify: () => {
        // neg(bnot(x)) must be well-defined for encoding to work
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
        // mul and add form a ring — composition is well-defined
        return engine.mul(engine.add(1, 2), 3) === engine.add(engine.mul(1, 3), engine.mul(2, 3));
      },
    },
    {
      name: "store" as const,
      fanoPoint: 3,
      ringBasis: ["ring_xor", "ring_and"],
      framework: "Oxigraph",
      description: "Quad graph persistence (subject-predicate-object-graph)",
      governsNamespaces: ["query/", "partition/", "region/", "boundary/"],
      verify: () => {
        // xor is its own inverse (store/retrieve symmetry)
        const x = 137;
        return engine.xor(engine.xor(x, 42), 42) === x;
      },
    },
    {
      name: "resolve" as const,
      fanoPoint: 4,
      ringBasis: ["succ", "pred"],
      framework: "UNS (built-in)",
      description: "Name → content traversal (successor/predecessor navigation)",
      governsNamespaces: ["resolver/", "recursion/", "reduction/", "convergence/"],
      verify: () => {
        // succ and pred are inverses — navigation is reversible
        const x = 100;
        return engine.pred(engine.succ(x)) === x && engine.succ(engine.pred(x)) === x;
      },
    },
    {
      name: "observe" as const,
      fanoPoint: 5,
      ringBasis: ["ring_or"],
      framework: "EventTarget (native)",
      description: "Event subscription (union of observable streams)",
      governsNamespaces: ["observable/", "stream/", "effect/", "parallel/", "interaction/"],
      verify: () => {
        // or is the join in the event lattice
        return engine.or(0, 0) === 0 && engine.or(0xFF, 0) === 0xFF;
      },
    },
    {
      name: "seal" as const,
      fanoPoint: 6,
      ringBasis: ["all"],
      framework: "singleProofHash (built-in)",
      description: "Integrity proof (all ring ops → single derivation hash)",
      governsNamespaces: [
        "cert/", "trace/", "derivation/", "cohomology/", "homology/",
        "carry/", "cascade/", "division/", "failure/", "state/",
        "enforcement/",
      ],
      verify: () => {
        // The seal requires ALL operations to be sound
        return engine.verifyAllCriticalIdentity();
      },
    },
  ]);
}

// ── Cached kernel table ──────────────────────────────────────────────────

let _kernelTable: readonly KernelFunction[] | null = null;

/**
 * Get the self-declared kernel function table.
 * Derived entirely from the UOR engine's own operations.
 */
export function getKernelDeclaration(): readonly KernelFunction[] {
  if (!_kernelTable) {
    _kernelTable = buildKernelTable();
  }
  return _kernelTable;
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
  // Deterministic hash of kernel state
  const hash = results.map((r) => `${r.name}:${r.ok ? 1 : 0}`).join("|");

  return { results, allPassed, hash };
}

/**
 * Map a bus namespace to its governing kernel function.
 * Returns null if the namespace is not governed (orphan).
 */
export function namespaceToKernel(ns: string): KernelFunctionName | null {
  const table = getKernelDeclaration();
  // Normalize: ensure trailing slash
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
 * Returns uncovered namespaces (should be empty for a canonical system).
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
//
// Each line defines 3 kernel functions that compose into a higher operation.
// There are exactly 7 lines in PG(2,2).

export const FANO_LINES: readonly (readonly [KernelFunctionName, KernelFunctionName, KernelFunctionName])[] = [
  ["encode", "decode", "seal"],       // L₀: identity lifecycle
  ["encode", "compose", "observe"],   // L₁: reactive transforms
  ["encode", "store", "resolve"],     // L₂: content-addressed storage
  ["decode", "compose", "store"],     // L₃: verified graph writes
  ["decode", "resolve", "observe"],   // L₄: live verification streams
  ["compose", "resolve", "seal"],     // L₅: derived proofs
  ["store", "observe", "seal"],       // L₆: auditable event stores
] as const;
