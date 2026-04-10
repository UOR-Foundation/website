/**
 * WASM Worker — Off-Main-Thread Bulk Compute
 * ═══════════════════════════════════════════════════════════════
 *
 * Provides a Web Worker interface for CPU-intensive ring operations
 * that would otherwise block the UI thread:
 *
 *   - bulkApply: Apply a ring operation across an entire byte array
 *   - bulkVerify: Verify critical identities for all 256 values
 *   - batchFactorize: Factorize a range of values
 *
 * When WASM is available, the worker loads the WASM module for
 * SIMD128-accelerated bulk operations (16 bytes/instruction).
 * Falls back to pure JS ring ops if WASM is unavailable.
 *
 * @layer 0
 * @module engine/wasm-worker
 */

import type { UorEngineContract } from "./contract";

// ── Message Protocol ────────────────────────────────────────────────────

export type WorkerCommand =
  | { type: "bulkApply"; op: string; data: Uint8Array; operand?: number; id: string }
  | { type: "bulkVerify"; id: string }
  | { type: "batchFactorize"; start: number; end: number; id: string }
  | { type: "initWasm"; wasmUrl: string; id: string };

export type WorkerResult =
  | { type: "bulkApply"; data: Uint8Array; id: string }
  | { type: "bulkVerify"; results: boolean[]; allPassed: boolean; id: string }
  | { type: "batchFactorize"; results: number[][]; id: string }
  | { type: "initWasm"; success: boolean; id: string }
  | { type: "error"; message: string; id: string };

// ── Worker Manager (runs on main thread) ────────────────────────────────

export class WasmWorkerManager {
  private worker: Worker | null = null;
  private pending = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();
  private idCounter = 0;
  private readonly hasSharedMemory: boolean;
  private wasmReady = false;

  constructor() {
    this.hasSharedMemory = typeof SharedArrayBuffer !== "undefined";
  }

  /**
   * Whether the worker is ready to accept commands.
   */
  get ready(): boolean {
    return this.worker !== null;
  }

  /**
   * Initialize the worker. Must be called before sending commands.
   * If wasmUrl is provided, the worker will load the WASM module
   * for SIMD-accelerated bulk operations.
   */
  async init(engine: UorEngineContract, wasmUrl?: string): Promise<void> {
    if (this.worker) return;

    // Create inline worker script
    const workerScript = createWorkerScript();
    const blob = new Blob([workerScript], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);

    try {
      this.worker = new Worker(url, { type: "module" });
      this.worker.onmessage = (e: MessageEvent<WorkerResult>) => {
        const { id } = e.data;
        const handler = this.pending.get(id);
        if (handler) {
          this.pending.delete(id);
          if (e.data.type === "error") {
            handler.reject(new Error(e.data.message));
          } else {
            handler.resolve(e.data);
          }
        }
      };
      this.worker.onerror = (e) => {
        console.warn("[WASM Worker] Error:", e.message);
      };

      // If WASM is available on main thread, try to init in worker too
      if (wasmUrl && engine.engine === "wasm") {
        try {
          const id = String(++this.idCounter);
          const result = await new Promise<WorkerResult>((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.worker!.postMessage({ type: "initWasm", wasmUrl, id } as WorkerCommand);
          });
          if (result.type === "initWasm" && result.success) {
            this.wasmReady = true;
            console.log("[WASM Worker] SIMD-accelerated worker ready");
          }
        } catch {
          // Worker will use JS fallback — fine
        }
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Apply a unary or binary ring operation to every byte in the array.
   * Returns a new Uint8Array with results.
   */
  async bulkApply(
    op: string,
    data: Uint8Array,
    operand?: number,
  ): Promise<Uint8Array> {
    if (!this.worker) throw new Error("Worker not initialized");

    const id = String(++this.idCounter);
    const transferable = this.hasSharedMemory
      ? data // SharedArrayBuffer — zero copy
      : new Uint8Array(data); // Structured clone

    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve: (r: WorkerResult) => {
          if (r.type === "bulkApply") resolve(r.data);
          else reject(new Error("Unexpected response type"));
        },
        reject,
      });

      const msg: WorkerCommand = { type: "bulkApply", op, data: transferable, operand, id };
      if (!this.hasSharedMemory && transferable.buffer instanceof ArrayBuffer) {
        this.worker!.postMessage(msg, [transferable.buffer]);
      } else {
        this.worker!.postMessage(msg);
      }
    });
  }

  /**
   * Verify critical identity for all 256 byte values.
   * Returns { results: boolean[256], allPassed: boolean }.
   */
  async bulkVerify(): Promise<{ results: boolean[]; allPassed: boolean }> {
    if (!this.worker) throw new Error("Worker not initialized");

    const id = String(++this.idCounter);
    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve: (r: WorkerResult) => {
          if (r.type === "bulkVerify") resolve({ results: r.results, allPassed: r.allPassed });
          else reject(new Error("Unexpected response type"));
        },
        reject,
      });
      this.worker!.postMessage({ type: "bulkVerify", id } as WorkerCommand);
    });
  }

  /**
   * Factorize a range of values [start, end).
   */
  async batchFactorize(start: number, end: number): Promise<number[][]> {
    if (!this.worker) throw new Error("Worker not initialized");

    const id = String(++this.idCounter);
    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve: (r: WorkerResult) => {
          if (r.type === "batchFactorize") resolve(r.results);
          else reject(new Error("Unexpected response type"));
        },
        reject,
      });
      this.worker!.postMessage({ type: "batchFactorize", start, end, id } as WorkerCommand);
    });
  }

  /**
   * Terminate the worker and clean up.
   */
  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    for (const [, handler] of this.pending) {
      handler.reject(new Error("Worker disposed"));
    }
    this.pending.clear();
    this.wasmReady = false;
  }
}

// ── Inline Worker Script ────────────────────────────────────────────────

function createWorkerScript(): string {
  return `
// UOR Ring Z/256Z — WASM-aware worker with JS fallback
const M = 256;
let wasmMod = null;

// ── JS scalar ops (fallback) ────────────────────────────────────────
const OPS = {
  neg: (x) => ((-x) & 0xFF) >>> 0,
  bnot: (x) => (~x & 0xFF) >>> 0,
  succ: (x) => (x + 1) % M,
  pred: (x) => (x - 1 + M) % M,
  add: (x, b) => (x + b) % M,
  sub: (x, b) => (x - b + M) % M,
  mul: (x, b) => (x * b) % M,
  xor: (x, b) => x ^ b,
  and: (x, b) => x & b,
  or:  (x, b) => x | b,
};

// ── WASM SIMD bulk op mapping ───────────────────────────────────────
const BULK_WASM_OPS = {
  neg: "bulk_ring_neg",
  add: "bulk_ring_add",
  xor: "bulk_ring_xor",
};

function verifyCritical(x) {
  const v = x & 0xFF;
  return OPS.add(v, OPS.neg(v)) === 0;
}

function factorize(x) {
  if (x < 2) return [];
  let n = x;
  const factors = [];
  for (let d = 2; d * d <= n; d++) {
    while (n % d === 0) { factors.push(d); n /= d; }
  }
  if (n > 1) factors.push(n);
  return factors;
}

function bulkApplyJS(op, data, operand) {
  const fn = OPS[op];
  if (!fn) throw new Error("Unknown op: " + op);
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = fn(data[i], operand);
  }
  return result;
}

function bulkApplyWasm(op, data, operand) {
  const bulkName = BULK_WASM_OPS[op];
  if (bulkName && wasmMod && typeof wasmMod[bulkName] === "function") {
    try {
      const result = operand !== undefined
        ? wasmMod[bulkName](data, operand)
        : wasmMod[bulkName](data);
      return result instanceof Uint8Array ? result : new Uint8Array(result);
    } catch (e) {
      // Fall through to JS
    }
  }
  return bulkApplyJS(op, data, operand);
}

self.onmessage = async function(e) {
  const msg = e.data;
  try {
    switch (msg.type) {
      case "initWasm": {
        try {
          const response = await fetch(msg.wasmUrl);
          const bytes = await response.arrayBuffer();
          const result = await WebAssembly.instantiate(bytes, {});
          wasmMod = result.instance.exports;
          self.postMessage({ type: "initWasm", success: true, id: msg.id });
        } catch (err) {
          self.postMessage({ type: "initWasm", success: false, id: msg.id });
        }
        break;
      }
      case "bulkApply": {
        const result = wasmMod
          ? bulkApplyWasm(msg.op, msg.data, msg.operand)
          : bulkApplyJS(msg.op, msg.data, msg.operand);
        self.postMessage({ type: "bulkApply", data: result, id: msg.id }, [result.buffer]);
        break;
      }
      case "bulkVerify": {
        // If WASM has bulk_verify_all, use it
        if (wasmMod && typeof wasmMod.bulk_verify_all === "function") {
          try {
            const raw = wasmMod.bulk_verify_all();
            const results = Array.isArray(raw)
              ? raw.map(v => v === 1 || v === true)
              : new Array(256).fill(false).map((_, i) => verifyCritical(i));
            const allPassed = results.every(Boolean);
            self.postMessage({ type: "bulkVerify", results, allPassed, id: msg.id });
            break;
          } catch (e) { /* fall through */ }
        }
        const results = new Array(256);
        let allPassed = true;
        for (let i = 0; i < 256; i++) {
          results[i] = verifyCritical(i);
          if (!results[i]) allPassed = false;
        }
        self.postMessage({ type: "bulkVerify", results, allPassed, id: msg.id });
        break;
      }
      case "batchFactorize": {
        const results = [];
        for (let i = msg.start; i < msg.end; i++) {
          results.push(factorize(i));
        }
        self.postMessage({ type: "batchFactorize", results, id: msg.id });
        break;
      }
      default:
        self.postMessage({ type: "error", message: "Unknown command: " + msg.type, id: msg.id });
    }
  } catch (err) {
    self.postMessage({ type: "error", message: String(err), id: msg.id });
  }
};
`;
}

// ── Singleton ───────────────────────────────────────────────────────────

let _workerManager: WasmWorkerManager | null = null;

/**
 * Get or create the singleton WASM worker manager.
 */
export function getWorkerManager(): WasmWorkerManager {
  if (!_workerManager) {
    _workerManager = new WasmWorkerManager();
  }
  return _workerManager;
}
