/**
 * UOR WASM Bridge — Lazy-loads the compiled uor-foundation WASM module.
 * Falls back to the TypeScript ring engine if WASM fails to load.
 *
 * The WASM binary is the actual Rust crate compiled to WebAssembly.
 * Every computation is canonically anchored to crates.io/crates/uor-foundation.
 */

import * as tsRing from "@/lib/uor-ring";

type WasmModule = typeof import("@/lib/wasm/uor-foundation/uor_wasm_shim");

let wasmModule: WasmModule | null = null;
let wasmLoadPromise: Promise<WasmModule | null> | null = null;
let wasmFailed = false;

/** Load the WASM module. Returns null if loading fails. */
export async function loadWasm(): Promise<WasmModule | null> {
  if (wasmModule) return wasmModule;
  if (wasmFailed) return null;
  if (wasmLoadPromise) return wasmLoadPromise;

  wasmLoadPromise = (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const mod = await import("@/lib/wasm/uor-foundation/uor_wasm_shim");
        await mod.default();
        wasmModule = mod;
        console.log("[UOR] WASM engine loaded — uor-foundation v" + mod.crate_version());
        return mod;
      } catch (e) {
        console.warn(`[UOR] WASM load attempt ${attempt + 1} failed:`, e);
        if (attempt === 0) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }
    console.info("[UOR] WASM unavailable — using TypeScript engine (identical math)");
    wasmFailed = true;
    return null;
  })();

  return wasmLoadPromise;
}

/** Check if WASM is loaded and ready */
export function isWasmReady(): boolean {
  return wasmModule !== null;
}

/** Get the engine type currently in use */
export function engineType(): "wasm" | "typescript" {
  return wasmModule ? "wasm" : "typescript";
}

/** Get crate version (WASM only) */
export function crateVersion(): string | null {
  return wasmModule?.crate_version() ?? null;
}

// ── Ring operations — WASM with TS fallback ─────────────────────────

export function neg(x: number): number {
  return wasmModule ? wasmModule.neg(x) : tsRing.neg(x);
}

export function bnot(x: number): number {
  return wasmModule ? wasmModule.bnot(x) : tsRing.bnot(x);
}

export function succ(x: number): number {
  return wasmModule ? wasmModule.succ(x) : tsRing.succ(x);
}

export function pred(x: number): number {
  return wasmModule ? wasmModule.pred(x) : tsRing.pred(x);
}

export function add(a: number, b: number): number {
  return wasmModule ? wasmModule.ring_add(a, b) : tsRing.add(a, b);
}

export function sub(a: number, b: number): number {
  return wasmModule ? wasmModule.ring_sub(a, b) : tsRing.sub(a, b);
}

export function mul(a: number, b: number): number {
  return wasmModule ? wasmModule.ring_mul(a, b) : tsRing.mul(a, b);
}

export function xor(a: number, b: number): number {
  return wasmModule ? wasmModule.ring_xor(a, b) : tsRing.xor(a, b);
}

export function and(a: number, b: number): number {
  return wasmModule ? wasmModule.ring_and(a, b) : tsRing.and(a, b);
}

export function or(a: number, b: number): number {
  return wasmModule ? wasmModule.ring_or(a, b) : tsRing.or(a, b);
}

export function verifyCriticalIdentity(x: number): boolean {
  return wasmModule ? wasmModule.verify_critical_identity(x) : tsRing.verifyCriticalIdentity(x);
}

export function verifyAllCriticalIdentity(): boolean {
  if (wasmModule) return wasmModule.verify_all_critical_identity();
  const r = tsRing.verifyAllCriticalIdentity();
  return r.verified;
}

export function bytePopcount(x: number): number {
  return wasmModule ? wasmModule.byte_popcount(x) : tsRing.bytePopcount(x);
}

export function byteBasis(x: number): number[] {
  if (wasmModule) return Array.from(wasmModule.byte_basis(x));
  return tsRing.byteBasis(x);
}

export function classifyByte(x: number): string {
  if (wasmModule) return wasmModule.classify_byte(x);
  return tsRing.classifyByte(x, 8).component.replace("partition:", "");
}

export function factorize(x: number): number[] {
  if (wasmModule) return Array.from(wasmModule.factorize(x));
  // TS fallback
  if (x < 2) return [];
  let n = x;
  const factors: number[] = [];
  for (let d = 2; d * d <= n; d++) {
    while (n % d === 0) { factors.push(d); n /= d; }
  }
  if (n > 1) factors.push(n);
  return factors;
}

export function evaluateExpr(expr: string): number {
  if (wasmModule) return wasmModule.evaluate_expr(expr);
  // TS fallback: parse simple expressions
  const match = expr.match(/^(\w+)\((\d+)(?:,\s*(\d+))?\)$/);
  if (!match) return -1;
  const [, op, a, b] = match;
  const x = parseInt(a);
  const y = b !== undefined ? parseInt(b) : undefined;
  return (tsRing.compute(op as any, x, y) as number) ?? -1;
}

export function listNamespaces(): string {
  return wasmModule?.list_namespaces() ?? "[]";
}
