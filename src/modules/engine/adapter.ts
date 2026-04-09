/**
 * UOR Engine Adapter — Dynamic WASM→Contract Wiring
 * ═══════════════════════════════════════════════════════════════
 *
 * Implements UorEngineContract by dynamically mapping WASM exports
 * to contract methods, with automatic TypeScript fallback for any
 * missing export. New crate exports are auto-discovered and placed
 * in `extensions`.
 *
 * @layer 0
 */

import type { UorEngineContract } from "./contract";
import { WASM_TO_CONTRACT, WASM_INTERNAL_EXPORTS } from "./contract";
import { CRATE_MANIFEST } from "./crate-manifest";
import * as tsRing from "@/lib/uor-ring";

// ── Types ────────────────────────────────────────────────────────────────

type WasmModule = typeof import("@/lib/wasm/uor-foundation/uor_wasm_shim");

interface DriftReport {
  added: string[];
  removed: string[];
  versionMatch: boolean;
  actualVersion: string | null;
}

// ── Singleton state ──────────────────────────────────────────────────────

let engine: UorEngineContract | null = null;
let initPromise: Promise<UorEngineContract> | null = null;

// ── TS fallback implementations ──────────────────────────────────────────

const TS_FALLBACKS: Record<string, (...args: any[]) => any> = {
  neg: (x: number) => tsRing.neg(x),
  bnot: (x: number) => tsRing.bnot(x),
  succ: (x: number) => tsRing.succ(x),
  pred: (x: number) => tsRing.pred(x),
  add: (a: number, b: number) => tsRing.add(a, b),
  sub: (a: number, b: number) => tsRing.sub(a, b),
  mul: (a: number, b: number) => tsRing.mul(a, b),
  xor: (a: number, b: number) => tsRing.xor(a, b),
  and: (a: number, b: number) => tsRing.and(a, b),
  or: (a: number, b: number) => tsRing.or(a, b),
  verifyCriticalIdentity: (x: number) => tsRing.verifyCriticalIdentity(x),
  verifyAllCriticalIdentity: () => tsRing.verifyAllCriticalIdentity().verified,
  bytePopcount: (x: number) => tsRing.bytePopcount(x),
  byteBasis: (x: number) => tsRing.byteBasis(x),
  classifyByte: (x: number) => tsRing.classifyByte(x, 8).component.replace("partition:", ""),
  factorize: (x: number) => {
    if (x < 2) return [];
    let n = x;
    const factors: number[] = [];
    for (let d = 2; d * d <= n; d++) {
      while (n % d === 0) { factors.push(d); n /= d; }
    }
    if (n > 1) factors.push(n);
    return factors;
  },
  evaluateExpr: (expr: string) => {
    const match = expr.match(/^(\w+)\((\d+)(?:,\s*(\d+))?\)$/);
    if (!match) return -1;
    const [, op, a, b] = match;
    const x = parseInt(a);
    const y = b !== undefined ? parseInt(b) : undefined;
    return (tsRing.compute(op as any, x, y) as number) ?? -1;
  },
  constRingEvalQ0: (op: number, a: number, b: number = 0) => {
    const m = 256;
    switch (op) {
      case 0: return ((-a) & 0xFF) >>> 0;
      case 1: return (~a & 0xFF) >>> 0;
      case 2: return ((a + 1) % m);
      case 3: return ((a - 1 + m) % m);
      case 4: return ((a + b) % m);
      case 5: return ((a - b + m) % m);
      case 6: return ((a * b) % m);
      case 7: return (a ^ b);
      case 8: return (a & b);
      case 9: return (a | b);
      default: return 0;
    }
  },
  listNamespaces: () => [],
  listEnums: () => [
    "Space", "PrimitiveOp", "MetricAxis", "FiberState", "GeometricCharacter",
  ],
  listEnforcementStructs: () => [],
};

// ── Drift detection ──────────────────────────────────────────────────────

function detectDrift(wasmExports: string[]): DriftReport {
  const expected = new Set(CRATE_MANIFEST.expectedExports as readonly string[]);
  const actual = new Set(wasmExports);
  const added = wasmExports.filter(e => !expected.has(e));
  const removed = [...expected].filter(e => !actual.has(e));

  return {
    added,
    removed,
    versionMatch: added.length === 0 && removed.length === 0,
    actualVersion: null, // filled in by caller
  };
}

// ── Build engine from WASM module ────────────────────────────────────────

function buildFromWasm(mod: WasmModule): UorEngineContract {
  const allKeys = Object.keys(mod).filter(
    k => typeof (mod as any)[k] === "function" && !WASM_INTERNAL_EXPORTS.has(k)
  );

  const drift = detectDrift(allKeys);
  drift.actualVersion = typeof mod.crate_version === "function" ? mod.crate_version() : "unknown";

  if (drift.added.length > 0) {
    console.info(`[UOR Engine] ${drift.added.length} new WASM export(s) auto-wired to extensions:`, drift.added);
  }
  if (drift.removed.length > 0) {
    console.warn(`[UOR Engine] ${drift.removed.length} expected export(s) missing (TS fallback):`, drift.removed);
  }

  // Build extensions from unknown exports
  const extensions: Record<string, (...args: any[]) => any> = {};
  for (const exportName of drift.added) {
    if (!WASM_TO_CONTRACT[exportName]) {
      extensions[exportName] = (...args: any[]) => (mod as any)[exportName](...args);
    }
  }

  // Helper: wrap WASM fn with array conversion for Uint8Array returns
  const wrapArray = (fn: (...args: any[]) => any) =>
    (...args: any[]) => {
      const result = fn(...args);
      return result instanceof Uint8Array ? Array.from(result) : result;
    };

  // Helper: wrap WASM fn that returns JSON string → parsed array
  const wrapJsonArray = (fn: (...args: any[]) => any) =>
    (...args: any[]) => {
      try { return JSON.parse(fn(...args)); } catch { return []; }
    };

  return {
    version: drift.actualVersion,
    engine: "wasm",

    neg: (x) => mod.neg(x),
    bnot: (x) => mod.bnot(x),
    succ: (x) => mod.succ(x),
    pred: (x) => mod.pred(x),
    add: (a, b) => mod.ring_add(a, b),
    sub: (a, b) => mod.ring_sub(a, b),
    mul: (a, b) => mod.ring_mul(a, b),
    xor: (a, b) => mod.ring_xor(a, b),
    and: (a, b) => mod.ring_and(a, b),
    or: (a, b) => mod.ring_or(a, b),

    verifyCriticalIdentity: (x) => mod.verify_critical_identity(x),
    verifyAllCriticalIdentity: () => mod.verify_all_critical_identity(),

    bytePopcount: (x) => mod.byte_popcount(x),
    byteBasis: wrapArray((x: number) => mod.byte_basis(x)),
    classifyByte: (x) => mod.classify_byte(x),
    factorize: wrapArray((x: number) => mod.factorize(x)),
    evaluateExpr: (expr) => mod.evaluate_expr(expr),

    constRingEvalQ0: (op, a, b = 0) =>
      typeof (mod as any).const_ring_eval_q0 === "function"
        ? (mod as any).const_ring_eval_q0(op, a, b)
        : TS_FALLBACKS.constRingEvalQ0(op, a, b),

    listNamespaces: wrapJsonArray(() => mod.list_namespaces()),
    listEnums: wrapJsonArray(() =>
      typeof (mod as any).list_enums === "function"
        ? (mod as any).list_enums()
        : "[]"
    ),
    listEnforcementStructs: wrapJsonArray(() =>
      typeof (mod as any).list_enforcement_structs === "function"
        ? (mod as any).list_enforcement_structs()
        : "[]"
    ),

    extensions,
  };
}

// ── Build pure TS engine ────────────────────────────────────────────────

function buildFromTs(): UorEngineContract {
  return {
    version: CRATE_MANIFEST.version,
    engine: "typescript",

    neg: TS_FALLBACKS.neg,
    bnot: TS_FALLBACKS.bnot,
    succ: TS_FALLBACKS.succ,
    pred: TS_FALLBACKS.pred,
    add: TS_FALLBACKS.add,
    sub: TS_FALLBACKS.sub,
    mul: TS_FALLBACKS.mul,
    xor: TS_FALLBACKS.xor,
    and: TS_FALLBACKS.and,
    or: TS_FALLBACKS.or,

    verifyCriticalIdentity: TS_FALLBACKS.verifyCriticalIdentity,
    verifyAllCriticalIdentity: TS_FALLBACKS.verifyAllCriticalIdentity,

    bytePopcount: TS_FALLBACKS.bytePopcount,
    byteBasis: TS_FALLBACKS.byteBasis,
    classifyByte: TS_FALLBACKS.classifyByte,
    factorize: TS_FALLBACKS.factorize,
    evaluateExpr: TS_FALLBACKS.evaluateExpr,

    constRingEvalQ0: TS_FALLBACKS.constRingEvalQ0,

    listNamespaces: TS_FALLBACKS.listNamespaces,
    listEnums: TS_FALLBACKS.listEnums,
    listEnforcementStructs: TS_FALLBACKS.listEnforcementStructs,

    extensions: {},
  };
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Initialize the engine. Attempts WASM first, falls back to TS.
 * Safe to call multiple times — returns cached instance.
 */
export async function initEngine(): Promise<UorEngineContract> {
  if (engine) return engine;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const mod = await import("@/lib/wasm/uor-foundation/uor_wasm_shim");
        await mod.default();
        engine = buildFromWasm(mod);
        console.log(`[UOR Engine] WASM v${engine.version} loaded (${Object.keys(engine.extensions).length} extensions)`);
        return engine;
      } catch (e) {
        console.warn(`[UOR Engine] WASM attempt ${attempt + 1} failed:`, e);
        if (attempt === 0) await new Promise(r => setTimeout(r, 500));
      }
    }
    console.info("[UOR Engine] Using TypeScript fallback (identical math)");
    engine = buildFromTs();
    return engine;
  })();

  return initPromise;
}

/**
 * Get the current engine instance. Returns TS fallback if not yet initialized.
 * For guaranteed WASM, call `await initEngine()` first.
 */
export function getEngine(): UorEngineContract {
  if (!engine) {
    engine = buildFromTs();
    // Kick off WASM load in background
    initEngine().catch(() => {});
  }
  return engine;
}

/**
 * Check the current engine type.
 */
export function engineType(): "wasm" | "typescript" {
  return getEngine().engine;
}

/**
 * Get the crate version string.
 */
export function crateVersion(): string {
  return getEngine().version;
}
