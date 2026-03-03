/**
 * Platform Bridge — Current App Wiring
 * ═════════════════════════════════════
 *
 * Wires the hologram platform interfaces to this application's
 * infrastructure (Supabase, UNS identity, GPU, etc.).
 *
 * Call initHologramPlatform() once at app startup.
 *
 * @module hologram/platform/bridge
 */

import { supabase } from "@/integrations/supabase/client";
import { singleProofHash } from "@/modules/uns/core/identity";
import { generateKeypair, signRecord } from "@/modules/uns/core/keypair";
import type { HologramPlatform } from "./index";
import { setPlatform } from "./index";

// ── Backend Adapter (Supabase) ────────────────────────────────────────

const backendAdapter = {
  from: (table: string) => supabase.from(table) as any,
  auth: {
    getSession: () => supabase.auth.getSession(),
    getUser: () => supabase.auth.getUser(),
    refreshSession: () => supabase.auth.refreshSession(),
    signOut: () => supabase.auth.signOut(),
    onAuthStateChange: (cb: (event: string, session: any) => void) =>
      supabase.auth.onAuthStateChange(cb),
  },
  functions: {
    invoke: (name: string, options?: any) => supabase.functions.invoke(name, options),
  },
};

// ── Identity Adapter (UNS) ────────────────────────────────────────────

const identityAdapter = {
  singleProofHash: async (obj: unknown) => {
    const result = await singleProofHash(obj);
    return result as any;
  },
  generateKeypair: async () => {
    const kp = await generateKeypair();
    return kp as any;
  },
  signRecord: async <T extends object>(record: T, keypair: any) => {
    return signRecord(record, keypair) as any;
  },
};

// ── GPU Adapter (lazy import) ─────────────────────────────────────────

let _gpuModule: any = null;
async function getGpuModule() {
  if (!_gpuModule) {
    _gpuModule = await import("@/modules/uns/core/hologram/gpu");
  }
  return _gpuModule;
}

const gpuAdapter = {
  init: async () => {
    const m = await getGpuModule();
    const gpu = m.getHologramGpu();
    return gpu.init();
  },
  benchmark: async (size?: number) => {
    const m = await getGpuModule();
    const gpu = m.getHologramGpu();
    return gpu.benchmark(size);
  },
  matmul: async (a: Float32Array, b: Float32Array, M: number, N: number, K: number) => {
    const m = await getGpuModule();
    const gpu = m.getHologramGpu();
    return gpu.matmul(a, b, M, N, K);
  },
  destroy: () => {
    // Lazy — no-op if GPU was never initialized
  },
};

const lutAdapter = {
  apply: async (table: string, input: Uint8Array) => {
    const m = await getGpuModule();
    const engine = m.getLutEngine();
    return engine.apply(table, input);
  },
  info: async () => {
    const m = await getGpuModule();
    const engine = m.getLutEngine();
    return engine.info();
  },
};

// ── Storage Adapter (Data Bank) ───────────────────────────────────────

const storageAdapter = {
  writeSlot: async (key: string, value: string) => {
    const { writeSlot } = await import("@/modules/data-bank/lib/sync");
    return writeSlot(key, value);
  },
  readSlot: async (key: string) => {
    const { readSlot } = await import("@/modules/data-bank/lib/sync");
    return readSlot(key);
  },
  readSlotFromCloud: async (key: string) => {
    const { readSlotFromCloud } = await import("@/modules/data-bank/lib/sync");
    return readSlotFromCloud(key);
  },
};

// ── Compression Adapter ───────────────────────────────────────────────

const compressionAdapter = {
  compress: async (triples: any[]) => {
    const m = await import("@/modules/data-bank/lib/graph-compression");
    return m.compressTriples(triples);
  },
  decompress: async (data: Uint8Array) => {
    const m = await import("@/modules/data-bank/lib/graph-compression");
    return m.decompressTriples(data);
  },
  compressToBase64: async (triples: any[]) => {
    const m = await import("@/modules/data-bank/lib/graph-compression");
    return m.compressToBase64(triples);
  },
  decompressFromBase64: async (encoded: string) => {
    const m = await import("@/modules/data-bank/lib/graph-compression");
    return m.decompressFromBase64(encoded);
  },
};

// ── Assemble & Export ─────────────────────────────────────────────────

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

// Auto-initialize on import (for backward compatibility)
initHologramPlatform();
