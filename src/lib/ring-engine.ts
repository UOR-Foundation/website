/**
 * UOR Ring Engine — Dual-Dispatch (Native IPC ↔ JS Fallback)
 * ═════════════════════════════════════════════════════════════════
 *
 * When running in Tauri: ring operations dispatch to the native Rust
 * backend via IPC. The uor-foundation crate is compiled into the binary,
 * eliminating WASM overhead entirely.
 *
 * When running in browser: operations use the inline JS implementations
 * (identical Z/256Z arithmetic, just slower).
 *
 * The API surface is identical — callers never know which backend runs.
 *
 * @module lib/ring-engine
 * @layer 0
 */

import { isLocal, invoke } from "@/lib/runtime";

// ── Types ───────────────────────────────────────────────────────────────

export type RingOp = "neg" | "bnot" | "succ" | "pred" | "add" | "mul" | "popcount" | "verify_all";
export type StratumLevel = "low" | "medium" | "high";

export interface RingResult {
  value: number;
  backend: "native" | "wasm";
}

export interface StratumResult {
  popcount: number;
  level: StratumLevel;
  braille: string;
}

export interface BatchResult {
  results: number[];
  count: number;
  backend: "native" | "wasm";
}

// ── JS Fallback (Z/256Z) ───────────────────────────────────────────────

function jsRingOp(op: RingOp, a: number, b: number): number {
  switch (op) {
    case "neg": return (256 - a) & 0xFF;
    case "bnot": return (~a) & 0xFF;
    case "succ": return (a + 1) & 0xFF;
    case "pred": return (a - 1 + 256) & 0xFF;
    case "add": return (a + b) & 0xFF;
    case "mul": return (a * b) & 0xFF;
    case "popcount": {
      let n = a & 0xFF;
      let count = 0;
      while (n) { count += n & 1; n >>= 1; }
      return count;
    }
    case "verify_all": {
      for (let x = 0; x <= 255; x++) {
        const neg_bnot = (256 - ((~x) & 0xFF)) & 0xFF;
        const succ_x = (x + 1) & 0xFF;
        if (neg_bnot !== succ_x) return 0;
      }
      return 1;
    }
    default: return -1;
  }
}

function jsPopcount(x: number): number {
  let n = x & 0xFF;
  let count = 0;
  while (n) { count += n & 1; n >>= 1; }
  return count;
}

function jsStratumLevel(popcount: number): StratumLevel {
  if (popcount <= 2) return "low";
  if (popcount <= 5) return "medium";
  return "high";
}

function jsBraille(byte: number): string {
  return String.fromCodePoint(0x2800 + (byte & 0xFF));
}

// ── Dual-Dispatch Engine ────────────────────────────────────────────────

/**
 * Execute a single ring operation.
 * Tauri → native IPC. Browser → inline JS.
 */
export async function ringOp(op: RingOp, a: number, b: number = 0): Promise<RingResult> {
  if (isLocal()) {
    try {
      const result = await invoke<{ value: number }>("uor_ring_op", {
        op, a: a & 0xFF, b: b & 0xFF,
      });
      if (result) return { value: result.value, backend: "native" };
    } catch {
      // Fall through to JS
    }
  }
  return { value: jsRingOp(op, a & 0xFF, b & 0xFF), backend: "wasm" };
}

/**
 * Execute a batch of ring operations in a single IPC round-trip.
 * Critical for performance: 1 IPC call instead of N.
 */
export async function ringBatch(
  ops: Array<{ op: RingOp; a: number; b?: number }>
): Promise<BatchResult> {
  if (isLocal()) {
    try {
      const formatted = ops.map(o => [o.op, o.a & 0xFF, (o.b ?? 0) & 0xFF] as [string, number, number]);
      const result = await invoke<{ results: number[]; count: number }>("uor_ring_batch", {
        ops: formatted,
      });
      if (result) return { ...result, backend: "native" };
    } catch {
      // Fall through
    }
  }

  const results = ops.map(o => jsRingOp(o.op, o.a & 0xFF, (o.b ?? 0) & 0xFF));
  return { results, count: results.length, backend: "wasm" };
}

/**
 * Compute stratum analysis for a byte value.
 */
export async function stratum(value: number): Promise<StratumResult> {
  if (isLocal()) {
    try {
      const result = await invoke<StratumResult>("uor_stratum", { value: value & 0xFF });
      if (result) return result;
    } catch {
      // Fall through
    }
  }

  const pop = jsPopcount(value);
  return {
    popcount: pop,
    level: jsStratumLevel(pop),
    braille: jsBraille(value),
  };
}

/**
 * Convert bytes to Braille address string.
 */
export async function brailleEncode(bytes: Uint8Array | number[]): Promise<string> {
  if (isLocal()) {
    try {
      const result = await invoke<string>("uor_braille_encode", {
        bytes: Array.from(bytes),
      });
      if (result) return result;
    } catch {
      // Fall through
    }
  }

  return Array.from(bytes).map(b => jsBraille(b)).join("");
}

/**
 * Verify the critical identity: neg(bnot(x)) === succ(x) ∀x ∈ R₈.
 * Native: ~0.001ms (SIMD-eligible loop). JS: ~0.5ms.
 */
export async function verifyCriticalIdentity(): Promise<{ valid: boolean; backend: "native" | "wasm" }> {
  const result = await ringOp("verify_all", 0);
  return { valid: result.value === 1, backend: result.backend };
}

// ── Convenience ─────────────────────────────────────────────────────────

export const ringEngine = {
  op: ringOp,
  batch: ringBatch,
  stratum,
  brailleEncode,
  verifyCriticalIdentity,
  /** Returns the backend that WOULD be used (no IPC call) */
  getBackend: (): "native" | "wasm" => isLocal() ? "native" : "wasm",
} as const;
