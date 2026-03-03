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

// ── Backend Adapter (Database / Auth / Functions) ─────

const backendAdapter = {
  from: (table: string) => (supabase as any).from(table),
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

// ── Identity Adapter (Canonical Hashing / PQC Signing) ─

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

// ── GPU Adapter (WebGPU / LUT Engine) ─────────────────

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
    return m.getHologramGpu().init();
  },
  benchmark: async (size?: number) => {
    const m = await getGpuModule();
    return m.getHologramGpu().benchmark(size);
  },
  matmul: async (a: Float32Array, b: Float32Array, M: number, N: number, K: number) => {
    const m = await getGpuModule();
    return m.getHologramGpu().matmul(a, b, M, N, K);
  },
  destroy: () => {},
};

const lutAdapter = {
  apply: async (table: string, input: Uint8Array) => {
    const m = await getGpuModule();
    return m.getLutEngine().apply(table, input);
  },
  info: async () => {
    const m = await getGpuModule();
    return m.getLutEngine().info();
  },
};

// ── Storage Adapter (Encrypted Key-Value) ─────────────

const storageAdapter = {
  writeSlot: async (key: string, value: string) => {
    const { writeSlot } = await import("@/modules/data-bank/lib/sync");
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user?.id) return;
    await writeSlot(session.user.id, key, value);
  },
  readSlot: async (key: string) => {
    const { readSlot } = await import("@/modules/data-bank/lib/sync");
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user?.id) return null;
    const result = await readSlot(session.user.id, key);
    return result?.value ?? null;
  },
  readSlotFromCloud: async (key: string) => {
    const { readSlotFromCloud } = await import("@/modules/data-bank/lib/sync");
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user?.id) return null;
    const result = await readSlotFromCloud(session.user.id, key);
    return result?.value ?? null;
  },
};

// ── Compression Adapter (Triple Codec) ────────────────

const compressionAdapter = {
  compress: async (triples: any[]) => {
    const m = await import("@/modules/data-bank/lib/graph-compression");
    const result = m.compressTriples(triples);
    return { data: result.buffer, stats: result.stats };
  },
  decompress: async (data: Uint8Array) => {
    const m = await import("@/modules/data-bank/lib/graph-compression");
    return m.decompressTriples(data);
  },
  compressToBase64: async (triples: any[]) => {
    const m = await import("@/modules/data-bank/lib/graph-compression");
    const result = m.compressToBase64(triples);
    return typeof result === "string" ? result : (result as any).encoded;
  },
  decompressFromBase64: async (encoded: string) => {
    const m = await import("@/modules/data-bank/lib/graph-compression");
    return m.decompressFromBase64(encoded) as any;
  },
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
