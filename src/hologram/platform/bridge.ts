/**
 * Platform Bridge — THE Single Gateway
 * ══════════════════════════════════════
 *
 * ┌─────────────────────────────────────────────────────┐
 * │  THIS IS THE ONLY FILE IN HOLOGRAM THAT IMPORTS     │
 * │  FROM OUTSIDE src/hologram/.                        │
 * │                                                     │
 * │  Every external dependency — infrastructure, hooks,  │
 * │  identity, GPU — enters through HERE and nowhere    │
 * │  else. To migrate Hologram to a standalone repo,    │
 * │  rewrite THIS FILE ONLY.                            │
 * └─────────────────────────────────────────────────────┘
 *
 * Call initHologramPlatform() once at app startup.
 *
 * @module hologram/platform/bridge
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXTERNAL IMPORTS — Every outside dependency is listed
// here. Grep for '@/' in this file to audit ALL of them.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { supabase } from "@/integrations/supabase/client";
import { singleProofHash } from "@/modules/uns/core/identity";
import { generateKeypair, signRecord } from "@/modules/uns/core/keypair";

// React hooks re-exported for kernel UI components
export { useScreenTheme, type ScreenTheme } from "@/modules/hologram-ui/hooks/useScreenTheme";
export { useDataBank, type DataBankHandle } from "@/modules/data-bank";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERNAL IMPORTS — These stay within hologram/
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { HologramPlatform } from "./index";
import { setPlatform } from "./index";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BRIDGE AUDIT LOG — Runtime monitoring of every
// cross-boundary call. Captures adapter, method,
// timestamp, duration, payload size, and direction.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Direction of data flow relative to the Hologram kernel. */
export type BridgeDirection = "outbound" | "inbound" | "bidirectional";

/** A single audit log entry for one cross-boundary call. */
export interface BridgeAuditEntry {
  /** Monotonic sequence number (never resets) */
  seq: number;
  /** ISO-8601 timestamp when the call started */
  timestamp: string;
  /** High-resolution epoch (performance.now()) for duration calculation */
  startMs: number;
  /** Duration in milliseconds (set after call completes) */
  durationMs: number;
  /** Which adapter was called: backend, identity, gpu, lut, storage, compression */
  adapter: string;
  /** Method name within the adapter */
  method: string;
  /** Estimated payload size in bytes (input arguments) */
  inputBytes: number;
  /** Estimated payload size in bytes (return value) */
  outputBytes: number;
  /** Data flow direction */
  direction: BridgeDirection;
  /** True if the call threw or returned an error */
  error: boolean;
  /** Error message (only if error is true) */
  errorMessage?: string;
}

/** Maximum entries kept in memory (ring buffer) */
const MAX_AUDIT_ENTRIES = 1000;

/** The audit log — a ring buffer of recent cross-boundary calls. */
const _auditLog: BridgeAuditEntry[] = [];
let _seq = 0;
let _listeners: Array<(entry: BridgeAuditEntry) => void> = [];

/** Estimate byte size of a value for audit purposes. */
function estimateBytes(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (value instanceof Uint8Array || value instanceof Float32Array) return value.byteLength;
  if (value instanceof ArrayBuffer) return value.byteLength;
  if (typeof value === "string") return value.length * 2;
  if (typeof value === "number" || typeof value === "boolean") return 8;
  try {
    return JSON.stringify(value).length * 2;
  } catch {
    return 0;
  }
}

/** Record a completed audit entry. */
function recordAudit(entry: BridgeAuditEntry): void {
  if (_auditLog.length >= MAX_AUDIT_ENTRIES) {
    _auditLog.shift();
  }
  _auditLog.push(entry);
  for (const fn of _listeners) {
    try { fn(entry); } catch { /* listener errors are swallowed */ }
  }
}

/**
 * Wrap an adapter method with audit logging.
 * Returns a new function with identical signature that logs every call.
 */
function audited<T extends (...args: any[]) => any>(
  adapter: string,
  method: string,
  direction: BridgeDirection,
  fn: T,
): T {
  const wrapped = (async (...args: any[]) => {
    const seq = ++_seq;
    const startMs = performance.now();
    const timestamp = new Date().toISOString();
    const inputBytes = args.reduce((sum, a) => sum + estimateBytes(a), 0);

    let result: any;
    let error = false;
    let errorMessage: string | undefined;

    try {
      result = await fn(...args);
      return result;
    } catch (err: any) {
      error = true;
      errorMessage = err?.message ?? String(err);
      throw err;
    } finally {
      const durationMs = Math.round((performance.now() - startMs) * 100) / 100;
      const outputBytes = error ? 0 : estimateBytes(result);

      recordAudit({
        seq,
        timestamp,
        startMs,
        durationMs,
        adapter,
        method,
        inputBytes,
        outputBytes,
        direction,
        error,
        errorMessage,
      });
    }
  }) as unknown as T;

  return wrapped;
}

// ── Public Audit API ──────────────────────────────────

/** Get a snapshot of the audit log (most recent MAX_AUDIT_ENTRIES entries). */
export function getBridgeAuditLog(): readonly BridgeAuditEntry[] {
  return _auditLog;
}

/** Get summary statistics of all bridge traffic. */
export function getBridgeAuditStats(): {
  totalCalls: number;
  totalErrors: number;
  totalInputBytes: number;
  totalOutputBytes: number;
  avgDurationMs: number;
  callsByAdapter: Record<string, number>;
  errorsByAdapter: Record<string, number>;
} {
  const callsByAdapter: Record<string, number> = {};
  const errorsByAdapter: Record<string, number> = {};
  let totalErrors = 0;
  let totalInputBytes = 0;
  let totalOutputBytes = 0;
  let totalDuration = 0;

  for (const e of _auditLog) {
    callsByAdapter[e.adapter] = (callsByAdapter[e.adapter] ?? 0) + 1;
    if (e.error) {
      totalErrors++;
      errorsByAdapter[e.adapter] = (errorsByAdapter[e.adapter] ?? 0) + 1;
    }
    totalInputBytes += e.inputBytes;
    totalOutputBytes += e.outputBytes;
    totalDuration += e.durationMs;
  }

  return {
    totalCalls: _auditLog.length,
    totalErrors,
    totalInputBytes,
    totalOutputBytes,
    avgDurationMs: _auditLog.length > 0 ? Math.round((totalDuration / _auditLog.length) * 100) / 100 : 0,
    callsByAdapter,
    errorsByAdapter,
  };
}

/** Subscribe to real-time audit events. Returns an unsubscribe function. */
export function onBridgeAudit(listener: (entry: BridgeAuditEntry) => void): () => void {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((fn) => fn !== listener);
  };
}

/** Clear the audit log (useful for testing). */
export function clearBridgeAuditLog(): void {
  _auditLog.length = 0;
  _seq = 0;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADAPTERS — Each method is wrapped with audited() for
// automatic cross-boundary monitoring.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── Backend Adapter (Database / Auth / Functions) ─────

const backendAdapter = {
  from: (table: string) => {
    // Record the query initiation (sync — actual query happens downstream)
    const seq = ++_seq;
    const timestamp = new Date().toISOString();
    recordAudit({
      seq,
      timestamp,
      startMs: performance.now(),
      durationMs: 0,
      adapter: "backend",
      method: "from",
      inputBytes: estimateBytes(table),
      outputBytes: 0,
      direction: "outbound",
      error: false,
    });
    return (supabase as any).from(table);
  },
  auth: {
    getSession:      audited("backend", "auth.getSession",      "inbound",       () => supabase.auth.getSession()),
    getUser:         audited("backend", "auth.getUser",         "inbound",       () => supabase.auth.getUser()),
    refreshSession:  audited("backend", "auth.refreshSession",  "bidirectional", () => supabase.auth.refreshSession()),
    signOut:         audited("backend", "auth.signOut",         "outbound",      () => supabase.auth.signOut()),
    onAuthStateChange: (cb: (event: string, session: any) => void) =>
      supabase.auth.onAuthStateChange(cb),
  },
  functions: {
    invoke: audited("backend", "functions.invoke", "bidirectional",
      (name: string, options?: any) => supabase.functions.invoke(name, options)),
  },
};

// ── Identity Adapter (Canonical Hashing / PQC Signing) ─

const identityAdapter = {
  singleProofHash: audited("identity", "singleProofHash", "bidirectional",
    async (obj: unknown) => {
      const result = await singleProofHash(obj);
      return result as any;
    }),
  generateKeypair: audited("identity", "generateKeypair", "inbound",
    async () => {
      const kp = await generateKeypair();
      return kp as any;
    }),
  signRecord: audited("identity", "signRecord", "bidirectional",
    async <T extends object>(record: T, keypair: any) => {
      return signRecord(record, keypair) as any;
    }),
};

// ── GPU Adapter (WebGPU / LUT Engine) ─────────────────

let _gpuModule: any = null;
async function getGpuModule() {
  if (!_gpuModule) {
    _gpuModule = await import("@/modules/uns/core/hologram/gpu");
  }
  return _gpuModule;
}

const gpuAdapter = {
  init: audited("gpu", "init", "outbound", async () => {
    const m = await getGpuModule();
    return m.getHologramGpu().init();
  }),
  benchmark: audited("gpu", "benchmark", "bidirectional", async (size?: number) => {
    const m = await getGpuModule();
    return m.getHologramGpu().benchmark(size);
  }),
  matmul: audited("gpu", "matmul", "bidirectional",
    async (a: Float32Array, b: Float32Array, M: number, N: number, K: number) => {
      const m = await getGpuModule();
      return m.getHologramGpu().matmul(a, b, M, N, K);
    }),
  destroy: () => {},
};

const lutAdapter = {
  apply: audited("lut", "apply", "bidirectional",
    async (table: string, input: Uint8Array) => {
      const m = await getGpuModule();
      return m.getLutEngine().apply(table, input);
    }),
  info: audited("lut", "info", "inbound", async () => {
    const m = await getGpuModule();
    return m.getLutEngine().info();
  }),
};

// ── Storage Adapter (Encrypted Key-Value) ─────────────

const storageAdapter = {
  writeSlot: audited("storage", "writeSlot", "outbound",
    async (key: string, value: string) => {
      const { writeSlot } = await import("@/modules/data-bank/lib/sync");
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.user?.id) return;
      await writeSlot(session.user.id, key, value);
    }),
  readSlot: audited("storage", "readSlot", "inbound",
    async (key: string) => {
      const { readSlot } = await import("@/modules/data-bank/lib/sync");
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.user?.id) return null;
      const result = await readSlot(session.user.id, key);
      return result?.value ?? null;
    }),
  readSlotFromCloud: audited("storage", "readSlotFromCloud", "inbound",
    async (key: string) => {
      const { readSlotFromCloud } = await import("@/modules/data-bank/lib/sync");
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.user?.id) return null;
      const result = await readSlotFromCloud(session.user.id, key);
      return result?.value ?? null;
    }),
};

// ── Compression Adapter (Triple Codec) ────────────────

const compressionAdapter = {
  compress: audited("compression", "compress", "bidirectional",
    async (triples: any[]) => {
      const m = await import("@/modules/data-bank/lib/graph-compression");
      const result = m.compressTriples(triples);
      return { data: result.buffer, stats: result.stats };
    }),
  decompress: audited("compression", "decompress", "bidirectional",
    async (data: Uint8Array) => {
      const m = await import("@/modules/data-bank/lib/graph-compression");
      return m.decompressTriples(data);
    }),
  compressToBase64: audited("compression", "compressToBase64", "bidirectional",
    async (triples: any[]) => {
      const m = await import("@/modules/data-bank/lib/graph-compression");
      const result = m.compressToBase64(triples);
      return typeof result === "string" ? result : (result as any).encoded;
    }),
  decompressFromBase64: audited("compression", "decompressFromBase64", "bidirectional",
    async (encoded: string) => {
      const m = await import("@/modules/data-bank/lib/graph-compression");
      return m.decompressFromBase64(encoded) as any;
    }),
};

// ── Assemble & Initialize ─────────────────────────────

const platform: HologramPlatform = {
  backend: backendAdapter,
  identity: identityAdapter,
  gpu: gpuAdapter,
  lutEngine: lutAdapter,
  storage: storageAdapter,
  compression: compressionAdapter,
};

/** Initialize the hologram platform with current app infrastructure. */
export function initHologramPlatform(): void {
  setPlatform(platform);
}

// Auto-initialize on import
initHologramPlatform();
