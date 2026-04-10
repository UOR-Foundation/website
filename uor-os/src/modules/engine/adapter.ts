/**
 * UOR Engine Adapter — Dynamic WASM→Contract Wiring
 * ═══════════════════════════════════════════════════════════════
 *
 * Implements UorEngineContract by dynamically mapping WASM exports
 * to contract methods, with automatic TypeScript fallback for any
 * missing export. New crate exports are auto-discovered and placed
 * in `extensions`.
 *
 * Performance tiers:
 *   1. IndexedDB cached WASM module  → ~5-20ms (repeat loads)
 *   2. Network fetch + compile       → ~100-500ms (first load)
 *   3. TypeScript fallback           → 0ms (no WASM)
 *
 * Bulk operations use WASM SIMD128 (16 bytes/instruction) when
 * available, falling back to scalar TS loops.
 *
 * @layer 0
 */

import type { UorEngineContract } from "./contract";
import { WASM_TO_CONTRACT, WASM_INTERNAL_EXPORTS } from "./contract";
import { CRATE_MANIFEST } from "./crate-manifest";
import { detectSimdSupport, detectSharedMemory } from "./wasm-cache";
import * as tsRing from "@/lib/uor-ring";

// ── Types ────────────────────────────────────────────────────────────────

type WasmModule = typeof import("@/lib/wasm/uor-foundation/uor_wasm_shim");

interface DriftReport {
  added: string[];
  removed: string[];
  versionMatch: boolean;
  actualVersion: string | null;
}

export type EngineMode = "loading" | "wasm" | "typescript-fallback";

export interface WasmDiagnostics {
  mode: EngineMode;
  wasmUrl: string;
  lastError: string | null;
  loadTimeMs: number | null;
  fetchStatus: number | null;
  contentType: string | null;
  cacheHit: boolean | null;
}

// ── Singleton state ──────────────────────────────────────────────────────

/** The active engine — only set to WASM after successful load, or TS after final failure */
let _activeEngine: UorEngineContract | null = null;
let _initPromise: Promise<UorEngineContract> | null = null;
let _simdSupported: boolean | null = null;
let _sharedMemory: boolean | null = null;
let _diagnostics: WasmDiagnostics = {
  mode: "loading",
  wasmUrl: "/wasm/uor_wasm_shim_bg.wasm",
  lastError: null,
  loadTimeMs: null,
  fetchStatus: null,
  contentType: null,
  cacheHit: null,
};

/** A non-persistent TS fallback used by getEngine() before init completes.
 *  This is NEVER stored in _activeEngine so it cannot block WASM loading. */
let _tempFallback: UorEngineContract | null = null;

// ── SIMD bulk op names in WASM ───────────────────────────────────────────

const BULK_WASM_OPS: Record<string, string> = {
  neg: "bulk_ring_neg",
  add: "bulk_ring_add",
  xor: "bulk_ring_xor",
};

// ── TS fallback implementations ──────────────────────────────────────────

const M = 256;

const SCALAR_OPS: Record<string, (x: number, b?: number) => number> = {
  neg: (x) => ((-x) & 0xFF) >>> 0,
  bnot: (x) => (~x & 0xFF) >>> 0,
  succ: (x) => (x + 1) % M,
  pred: (x) => (x - 1 + M) % M,
  add: (x, b = 0) => (x + b) % M,
  sub: (x, b = 0) => (x - b + M) % M,
  mul: (x, b = 0) => (x * b) % M,
  xor: (x, b = 0) => x ^ b,
  and: (x, b = 0) => x & b,
  or: (x, b = 0) => x | b,
};

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
  listNamespaces: () => [
    // encode (P₀)
    "u/", "schema/", "type/",
    // decode (P₁)
    "proof/", "conformance/", "predicate/",
    // compose (P₂)
    "morphism/", "op/", "monoidal/", "operad/", "linear/",
    // store (P₃)
    "query/", "partition/", "region/", "boundary/",
    // resolve (P₄)
    "resolver/", "recursion/", "reduction/", "convergence/",
    // observe (P₅)
    "observable/", "stream/", "effect/", "parallel/", "interaction/",
    // seal (P₆)
    "cert/", "trace/", "derivation/", "cohomology/", "homology/",
    "carry/", "cascade/", "division/", "failure/", "state/",
    "enforcement/",
  ],
  listEnums: () => [
    "Space", "PrimitiveOp", "MetricAxis", "FiberState", "GeometricCharacter",
  ],
  listEnforcementStructs: () => [],
};

// ── TS bulk implementations (scalar fallback) ────────────────────────────

function tsBulkApply(op: string, data: Uint8Array, operand?: number): Uint8Array {
  const fn = SCALAR_OPS[op];
  if (!fn) throw new Error(`Unknown bulk op: ${op}`);
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = fn(data[i], operand);
  }
  return result;
}

function tsBulkVerify(): { results: boolean[]; allPassed: boolean } {
  const results = new Array<boolean>(256);
  let allPassed = true;
  for (let i = 0; i < 256; i++) {
    const ok = SCALAR_OPS.add(i, SCALAR_OPS.neg(i)) === 0;
    results[i] = ok;
    if (!ok) allPassed = false;
  }
  return { results, allPassed };
}

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

  // ── Wire SIMD bulk ops ──────────────────────────────────────────────

  const wasmBulkApply = async (op: string, data: Uint8Array, operand?: number): Promise<Uint8Array> => {
    const bulkExportName = BULK_WASM_OPS[op];
    const bulkFn = bulkExportName ? (mod as any)[bulkExportName] : undefined;

    if (typeof bulkFn === "function") {
      try {
        const result = operand !== undefined ? bulkFn(data, operand) : bulkFn(data);
        return result instanceof Uint8Array ? result : new Uint8Array(result);
      } catch {
        // Fall through to scalar WASM
      }
    }

    const scalarFn = SCALAR_OPS[op];
    if (!scalarFn) throw new Error(`Unknown bulk op: ${op}`);
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      result[i] = scalarFn(data[i], operand);
    }
    return result;
  };

  const wasmBulkVerify = async (): Promise<{ results: boolean[]; allPassed: boolean }> => {
    const bulkVerifyFn = (mod as any).bulk_verify_all;
    if (typeof bulkVerifyFn === "function") {
      try {
        const rawResult = bulkVerifyFn();
        if (rawResult && typeof rawResult === "object" && "allPassed" in rawResult) {
          return rawResult;
        }
        if (rawResult instanceof Uint8Array || Array.isArray(rawResult)) {
          const results = Array.from(rawResult).map(v => v === 1 || v === true);
          return { results, allPassed: results.every(Boolean) };
        }
      } catch {
        // Fall through to scalar
      }
    }
    return tsBulkVerify();
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

    bulkApply: wasmBulkApply,
    bulkVerify: wasmBulkVerify,

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

    bulkApply: async (op, data, operand) => tsBulkApply(op, data, operand),
    bulkVerify: async () => tsBulkVerify(),

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
 *
 * KEY FIX: This no longer exits early if a temp TS fallback was served by getEngine().
 * It only exits early if WASM was already successfully loaded or if a prior
 * initEngine() call is in flight.
 */
export async function initEngine(): Promise<UorEngineContract> {
  // If WASM already loaded, return it
  if (_activeEngine?.engine === "wasm") return _activeEngine;
  // If already in-flight, return that promise
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const t0 = performance.now();

    // Detect capabilities in parallel
    const [simd, shared] = await Promise.all([
      detectSimdSupport(),
      Promise.resolve(detectSharedMemory()),
    ]);
    _simdSupported = simd;
    _sharedMemory = shared;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const mod = await import("@/lib/wasm/uor-foundation/uor_wasm_shim");
        await mod.default();
        const wasmEngine = buildFromWasm(mod);

        // SUCCESS — commit to WASM
        _activeEngine = wasmEngine;
        _diagnostics = {
          ..._diagnostics,
          mode: "wasm",
          lastError: null,
          loadTimeMs: Math.round(performance.now() - t0),
        };

        // Invalidate stale kernel cache
        _onEngineChange();

        const caps = [
          simd ? "SIMD" : null,
          shared ? "SharedMemory" : null,
        ].filter(Boolean).join(", ");
        console.log(
          `[UOR Engine] WASM v${wasmEngine.version} loaded` +
          ` (${Object.keys(wasmEngine.extensions).length} extensions` +
          `${caps ? `, caps: ${caps}` : ""})`
        );
        return wasmEngine;
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.warn(`[UOR Engine] WASM attempt ${attempt + 1} failed:`, errMsg);
        _diagnostics = {
          ..._diagnostics,
          lastError: errMsg,
        };
        if (attempt === 0) await new Promise(r => setTimeout(r, 500));
      }
    }

    // All WASM attempts failed — commit to TS fallback
    console.info("[UOR Engine] Using TypeScript fallback (identical math)");
    _activeEngine = buildFromTs();
    _diagnostics = {
      ..._diagnostics,
      mode: "typescript-fallback",
      loadTimeMs: Math.round(performance.now() - t0),
    };
    _onEngineChange();
    return _activeEngine;
  })();

  return _initPromise;
}

/**
 * Query detected WASM capabilities.
 */
export function getCapabilities(): { simd: boolean; sharedMemory: boolean } {
  return {
    simd: _simdSupported ?? false,
    sharedMemory: _sharedMemory ?? false,
  };
}

/**
 * Get the current engine instance.
 *
 * KEY FIX: If the engine has not been initialized yet, this returns a
 * TEMPORARY TS fallback that is NOT stored in _activeEngine. This means
 * calling getEngine() before initEngine() will NOT permanently lock
 * the system into TypeScript mode.
 *
 * For guaranteed WASM, call `await initEngine()` first.
 */
export function getEngine(): UorEngineContract {
  // If we have a committed engine (WASM or final TS fallback), use it
  if (_activeEngine) return _activeEngine;

  // Return a non-persistent temp fallback — does not block WASM loading
  if (!_tempFallback) {
    _tempFallback = buildFromTs();
    // Kick off WASM load in background (does not store result in _tempFallback)
    initEngine().catch(() => {});
  }
  return _tempFallback;
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

/**
 * Get WASM loading diagnostics for the system health report.
 */
export function getWasmDiagnostics(): WasmDiagnostics {
  return { ..._diagnostics };
}

/**
 * Check if the active engine is the committed one (not a temp fallback).
 */
export function isEngineReady(): boolean {
  return _activeEngine !== null;
}

// ── Engine change notification ───────────────────────────────────────────

type EngineChangeListener = () => void;
const _engineChangeListeners: EngineChangeListener[] = [];

/** Register a callback for when the engine changes (e.g. WASM finishes loading). */
export function onEngineChange(fn: EngineChangeListener): () => void {
  _engineChangeListeners.push(fn);
  return () => {
    const idx = _engineChangeListeners.indexOf(fn);
    if (idx >= 0) _engineChangeListeners.splice(idx, 1);
  };
}

function _onEngineChange() {
  // Clear temp fallback so getEngine() returns the committed engine
  _tempFallback = null;
  for (const fn of _engineChangeListeners) {
    try { fn(); } catch { /* listener error */ }
  }
}
