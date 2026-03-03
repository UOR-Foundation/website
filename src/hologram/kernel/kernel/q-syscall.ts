/**
 * Q-Syscall — Lens-Based Trap Table
 * ══════════════════════════════════
 *
 * Every classical Linux syscall maps to a typed morphism:
 *
 *   ┌──────────┬──────────────────────────────────────────────────┐
 *   │ Linux    │ Q-Syscall                                        │
 *   ├──────────┼──────────────────────────────────────────────────┤
 *   │ read()   │ focus(lens, obj) — dehydrate to canonical form   │
 *   │ write()  │ refract(lens, bytes, modality) — rehydrate       │
 *   │ open()   │ resolve(CID) — locate in address space           │
 *   │ exec()   │ compileLens(blueprint) → instantiate pipeline    │
 *   │ mmap()   │ pin(CID) — promote to hot memory tier            │
 *   │ ioctl()  │ project(identity, target) — holographic proj.    │
 *   │ clone()  │ forkBlueprint(bp) — new CID, same structure      │
 *   └──────────┴──────────────────────────────────────────────────┘
 *
 * The key property: every syscall IS a typed morphism, so the kernel
 * can verify at dispatch time that a call sequence preserves coherence.
 *
 * @module qkernel/q-syscall
 */

import { toHex, encodeUtf8 } from "../../genesis/axiom-ring";
import { sha256 } from "../../genesis/axiom-hash";
import { createCid } from "../../genesis/axiom-cid";
import { canonicalEncode } from "../../genesis/axiom-codec";
import type { QMmu } from "../mm/q-mmu";

// ═══════════════════════════════════════════════════════════════════════
// Morphism Types
// ═══════════════════════════════════════════════════════════════════════

/** The morphism classification for each syscall */
export type MorphismType =
  | "morphism:Isometry"
  | "morphism:Transform"
  | "morphism:Action"
  | "morphism:Embedding"
  | "categorical:Product"
  | "projection:Functor";

export interface SyscallResult<T = unknown> {
  readonly syscall: string;
  readonly morphism: MorphismType;
  readonly success: boolean;
  readonly result: T;
  readonly cid: string;
  readonly latencyMs: number;
  readonly callerPid: number;
}

export interface CompiledLens {
  readonly lensId: string;
  readonly blueprintCid: string;
  readonly modalities: readonly string[];
  readonly compiled: boolean;
  readonly compiledAt: number;
}

export interface LensBlueprint {
  readonly name: string;
  readonly version: string;
  readonly modalities: readonly string[];
  readonly pipeline: readonly PipelineStage[];
}

export interface PipelineStage {
  readonly name: string;
  readonly morphism: MorphismType;
  readonly config?: Record<string, unknown>;
}

export interface TrapTableEntry {
  readonly syscallNumber: number;
  readonly name: string;
  readonly morphism: MorphismType;
  readonly handler: string;
  readonly callCount: number;
}

export interface SyscallStats {
  readonly totalCalls: number;
  readonly callsByType: Record<string, number>;
  readonly callsByMorphism: Record<MorphismType, number>;
  readonly meanLatencyMs: number;
  readonly errorCount: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Supported Modalities
// ═══════════════════════════════════════════════════════════════════════

export const STANDARD_MODALITIES = [
  "nquads", "jsonld", "jsonld-framed", "compact-json",
  "turtle", "rdf-xml", "graphql-sdl", "hologram", "identity",
] as const;

export type Modality = (typeof STANDARD_MODALITIES)[number];

// ═══════════════════════════════════════════════════════════════════════
// Q-Syscall Implementation
// ═══════════════════════════════════════════════════════════════════════

export class QSyscall {
  private mmu: QMmu;
  private lenses = new Map<string, CompiledLens>();
  private callLog: SyscallResult[] = [];
  private trapTable: TrapTableEntry[] = [];

  constructor(mmu: QMmu) {
    this.mmu = mmu;
    this.initTrapTable();
  }

  private initTrapTable(): void {
    const entries: Omit<TrapTableEntry, "callCount">[] = [
      { syscallNumber: 0, name: "focus",         morphism: "morphism:Isometry",   handler: "focus" },
      { syscallNumber: 1, name: "refract",       morphism: "morphism:Transform",  handler: "refract" },
      { syscallNumber: 2, name: "resolve",       morphism: "morphism:Isometry",   handler: "resolve" },
      { syscallNumber: 3, name: "compileLens",   morphism: "morphism:Action",     handler: "compileLens" },
      { syscallNumber: 4, name: "pin",           morphism: "morphism:Embedding",  handler: "pin" },
      { syscallNumber: 5, name: "project",       morphism: "projection:Functor",  handler: "project" },
      { syscallNumber: 6, name: "forkBlueprint", morphism: "categorical:Product", handler: "forkBlueprint" },
    ];
    this.trapTable = entries.map(e => ({ ...e, callCount: 0 }));
  }

  // ── Syscall 0: focus (read) ─────────────────────────────────────

  focus(obj: unknown, callerPid: number): SyscallResult<{ cid: string; bytes: Uint8Array }> {
    const t0 = performance.now();
    const bytes = canonicalEncode(obj);
    const cid = this.mmu.store(bytes, callerPid);

    const result: SyscallResult<{ cid: string; bytes: Uint8Array }> = {
      syscall: "focus",
      morphism: "morphism:Isometry",
      success: true,
      result: { cid, bytes },
      cid,
      latencyMs: performance.now() - t0,
      callerPid,
    };
    this.recordCall(result);
    return result;
  }

  // ── Syscall 1: refract (write) ──────────────────────────────────

  refract(
    cid: string,
    modality: Modality,
    callerPid: number
  ): SyscallResult<{ content: string; modality: Modality }> {
    const t0 = performance.now();
    const bytes = this.mmu.load(cid);

    if (!bytes) {
      const result: SyscallResult<{ content: string; modality: Modality }> = {
        syscall: "refract",
        morphism: "morphism:Transform",
        success: false,
        result: { content: "", modality },
        cid,
        latencyMs: performance.now() - t0,
        callerPid,
      };
      this.recordCall(result);
      return result;
    }

    const raw = new TextDecoder().decode(bytes);

    let content: string;
    switch (modality) {
      case "identity":
        content = raw;
        break;
      case "compact-json":
        try { content = JSON.stringify(JSON.parse(raw)); } catch { content = raw; }
        break;
      case "jsonld":
        try {
          const obj = JSON.parse(raw);
          content = JSON.stringify({ "@context": "https://schema.org", ...obj }, null, 2);
        } catch { content = raw; }
        break;
      case "nquads":
        try {
          const obj = JSON.parse(raw);
          content = Object.entries(obj)
            .map(([k, v]) => `<urn:uor:${cid}> <urn:uor:prop:${k}> "${v}" .`)
            .join("\n");
        } catch { content = `<urn:uor:${cid}> <urn:uor:content> "${raw}" .`; }
        break;
      default:
        content = raw;
    }

    const resultCid = this.mmu.store(encodeUtf8(content), callerPid);

    const result: SyscallResult<{ content: string; modality: Modality }> = {
      syscall: "refract",
      morphism: "morphism:Transform",
      success: true,
      result: { content, modality },
      cid: resultCid,
      latencyMs: performance.now() - t0,
      callerPid,
    };
    this.recordCall(result);
    return result;
  }

  // ── Syscall 2: resolve (open) ───────────────────────────────────

  resolve(cid: string, callerPid: number): SyscallResult<{ found: boolean; tier?: string; byteLength?: number }> {
    const t0 = performance.now();
    const entry = this.mmu.lookup(cid);
    const exists = entry !== null || this.mmu.exists(cid);

    const result: SyscallResult<{ found: boolean; tier?: string; byteLength?: number }> = {
      syscall: "resolve",
      morphism: "morphism:Isometry",
      success: exists,
      result: entry
        ? { found: true, tier: entry.tier, byteLength: entry.byteLength }
        : { found: exists },
      cid,
      latencyMs: performance.now() - t0,
      callerPid,
    };
    this.recordCall(result);
    return result;
  }

  // ── Syscall 3: compileLens (exec) ───────────────────────────────

  compileLens(
    blueprint: LensBlueprint,
    callerPid: number
  ): SyscallResult<CompiledLens> {
    const t0 = performance.now();

    const bpBytes = canonicalEncode(blueprint);
    const bpCid = this.mmu.store(bpBytes, callerPid);

    const hashBytes = sha256(bpBytes);
    const lensId = toHex(hashBytes).slice(0, 16);

    const compiled: CompiledLens = {
      lensId,
      blueprintCid: bpCid,
      modalities: blueprint.modalities,
      compiled: true,
      compiledAt: Date.now(),
    };

    this.lenses.set(lensId, compiled);

    const result: SyscallResult<CompiledLens> = {
      syscall: "compileLens",
      morphism: "morphism:Action",
      success: true,
      result: compiled,
      cid: bpCid,
      latencyMs: performance.now() - t0,
      callerPid,
    };
    this.recordCall(result);
    return result;
  }

  // ── Syscall 4: pin (mmap) ───────────────────────────────────────

  pin(cid: string, callerPid: number): SyscallResult<{ pinned: boolean }> {
    const t0 = performance.now();
    const pinned = this.mmu.pin(cid);

    const result: SyscallResult<{ pinned: boolean }> = {
      syscall: "pin",
      morphism: "morphism:Embedding",
      success: pinned,
      result: { pinned },
      cid,
      latencyMs: performance.now() - t0,
      callerPid,
    };
    this.recordCall(result);
    return result;
  }

  // ── Syscall 5: project (ioctl) ──────────────────────────────────

  project(
    cid: string,
    targetProtocol: string,
    callerPid: number
  ): SyscallResult<{ projection: string; protocol: string }> {
    const t0 = performance.now();
    const bytes = this.mmu.load(cid);

    if (!bytes) {
      const result: SyscallResult<{ projection: string; protocol: string }> = {
        syscall: "project",
        morphism: "projection:Functor",
        success: false,
        result: { projection: "", protocol: targetProtocol },
        cid,
        latencyMs: performance.now() - t0,
        callerPid,
      };
      this.recordCall(result);
      return result;
    }

    const hashBytes = sha256(bytes);
    const hex = toHex(hashBytes);
    let projection: string;
    switch (targetProtocol) {
      case "ipv6":
        projection = `fd00:0075:6f72:${hex.slice(0, 4)}:${hex.slice(4, 8)}:${hex.slice(8, 12)}:${hex.slice(12, 16)}:${hex.slice(16, 20)}`;
        break;
      case "did":
        projection = `did:uor:${hex.slice(0, 32)}`;
        break;
      case "urn":
        projection = `urn:uor:derivation:sha256:${hex}`;
        break;
      case "ipfs":
        projection = createCid(hashBytes).string;
        break;
      default:
        projection = `${targetProtocol}:${hex.slice(0, 32)}`;
    }

    const result: SyscallResult<{ projection: string; protocol: string }> = {
      syscall: "project",
      morphism: "projection:Functor",
      success: true,
      result: { projection, protocol: targetProtocol },
      cid,
      latencyMs: performance.now() - t0,
      callerPid,
    };
    this.recordCall(result);
    return result;
  }

  // ── Syscall 6: forkBlueprint (clone) ────────────────────────────

  forkBlueprint(
    blueprint: LensBlueprint,
    newName: string,
    callerPid: number
  ): SyscallResult<{ original: string; forked: string; forkedBlueprint: LensBlueprint }> {
    const t0 = performance.now();

    const originalBytes = canonicalEncode(blueprint);
    const originalCid = this.mmu.store(originalBytes, callerPid);

    const forkedBp: LensBlueprint = {
      ...blueprint,
      name: newName,
      version: `${blueprint.version}-fork`,
    };

    const forkedBytes = canonicalEncode(forkedBp);
    const forkedCid = this.mmu.store(forkedBytes, callerPid);

    const result: SyscallResult<{ original: string; forked: string; forkedBlueprint: LensBlueprint }> = {
      syscall: "forkBlueprint",
      morphism: "categorical:Product",
      success: true,
      result: { original: originalCid, forked: forkedCid, forkedBlueprint: forkedBp },
      cid: forkedCid,
      latencyMs: performance.now() - t0,
      callerPid,
    };
    this.recordCall(result);
    return result;
  }

  // ── Introspection ───────────────────────────────────────────────

  getTrapTable(): readonly TrapTableEntry[] { return this.trapTable; }
  getLens(lensId: string): CompiledLens | undefined { return this.lenses.get(lensId); }
  allLenses(): CompiledLens[] { return Array.from(this.lenses.values()); }

  stats(): SyscallStats {
    const callsByType: Record<string, number> = {};
    const callsByMorphism: Record<string, number> = {};
    let totalLatency = 0;
    let errorCount = 0;

    for (const call of this.callLog) {
      callsByType[call.syscall] = (callsByType[call.syscall] || 0) + 1;
      callsByMorphism[call.morphism] = (callsByMorphism[call.morphism] || 0) + 1;
      totalLatency += call.latencyMs;
      if (!call.success) errorCount++;
    }

    return {
      totalCalls: this.callLog.length,
      callsByType,
      callsByMorphism: callsByMorphism as Record<MorphismType, number>,
      meanLatencyMs: this.callLog.length > 0 ? totalLatency / this.callLog.length : 0,
      errorCount,
    };
  }

  getCallLog(): readonly SyscallResult[] { return this.callLog; }

  private recordCall(result: SyscallResult): void {
    this.callLog.push(result);
    const entry = this.trapTable.find(e => e.name === result.syscall);
    if (entry) (entry as { callCount: number }).callCount++;
  }
}
