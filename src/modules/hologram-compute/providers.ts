/**
 * Hologram Compute — Provider Abstraction Layer
 * ══════════════════════════════════════════════
 *
 * A provider-agnostic compute substrate that unifies:
 *   - Local compute  (WebGPU + LUT constant-time engine)
 *   - Cloud compute  (future: GPU cloud providers)
 *   - P2P compute    (future: peer-contributed resources)
 *
 * The key insight: all compute is expressed as typed operations
 * on content-addressed data. The provider is just the "where" —
 * the operation semantics are identical regardless of substrate.
 *
 * Architecture:
 *   ComputeProvider (interface)
 *     ├── LocalGpuProvider   — WebGPU + UOR LUT engine
 *     ├── CloudProvider      — (future) remote GPU clusters
 *     └── PeerProvider       — (future) federated peer mesh
 *
 *   ComputeOrchestrator
 *     └── Selects optimal provider per-job (locality, cost, latency)
 *
 * @module hologram-compute/providers
 */

import { getHologramGpu, type GpuDeviceInfo, type GpuBenchmarkResult } from "@/modules/uns/core/hologram/gpu";
import { getLutEngine, type LutApplyResult, type CriticalIdentityProof, type LutEngineInfo, type LutName } from "@/modules/uns/core/hologram/gpu";
import { getDispatcher, type DispatcherSnapshot } from "./compute-dispatcher";
import { getClock, type ClockSnapshot } from "./adaptive-clock";

// ── Provider Types ──────────────────────────────────────────────────────────

export type ProviderKind = "local" | "cloud" | "peer";
export type ProviderStatus = "offline" | "initializing" | "ready" | "degraded" | "error";

/** Capability flags for a compute provider. */
export interface ComputeCapabilities {
  readonly matmul: boolean;
  readonly lutApply: boolean;
  readonly inference: boolean;
  readonly customShader: boolean;
  readonly maxBufferBytes: number;
  readonly maxWorkgroups: number;
  readonly estimatedGflops: number;
  readonly estimatedBandwidthGBps: number;
}

/** CPU-only LUT benchmark result (always available). */
export interface CpuLutBenchmarkResult {
  readonly "@type": "uor:CpuLutBenchmark";
  /** Millions of LUT ops per second. */
  readonly lutMopsPerSec: number;
  /** Throughput in GB/s (1 byte read + 1 byte write per op). */
  readonly lutThroughputGBps: number;
  /** Tables benchmarked. */
  readonly tablesTested: number;
  /** Total elements processed. */
  readonly totalElements: number;
  /** Wall-clock time in ms. */
  readonly timeMs: number;
}

/** A snapshot of provider health + metrics. */
export interface ProviderSnapshot {
  readonly kind: ProviderKind;
  readonly id: string;
  readonly name: string;
  readonly status: ProviderStatus;
  readonly capabilities: ComputeCapabilities;
  readonly deviceInfo: GpuDeviceInfo | null;
  readonly lutInfo: LutEngineInfo | null;
  readonly benchmarkResult: GpuBenchmarkResult | null;
  readonly cpuBenchmarkResult: CpuLutBenchmarkResult | null;
  readonly criticalIdentity: CriticalIdentityProof | null;
  readonly lastUpdated: string;
  /** Estimated cost per GFLOP-second (0 for local). */
  readonly costPerGflopS: number;
  /** Estimated tokens/sec for inference (0 if unknown). */
  readonly estimatedTokPerSec: number;
}

/** A compute job submitted to the orchestrator. */
export interface ComputeJob {
  readonly id: string;
  readonly type: "matmul" | "lut" | "shader" | "inference";
  readonly inputSizeBytes: number;
  readonly priority: "low" | "normal" | "high";
  readonly preferredProvider?: ProviderKind;
}

/** Result of a compute job. */
export interface ComputeJobResult {
  readonly jobId: string;
  readonly provider: ProviderKind;
  readonly providerId: string;
  readonly timeMs: number;
  readonly gpuAccelerated: boolean;
  readonly outputSizeBytes: number;
}

// ── Provider Interface ──────────────────────────────────────────────────────

export interface ComputeProvider {
  readonly kind: ProviderKind;
  readonly id: string;
  readonly name: string;
  init(): Promise<ProviderSnapshot>;
  snapshot(): Promise<ProviderSnapshot>;
  benchmark(): Promise<GpuBenchmarkResult | null>;
  destroy(): void;
}

// ── Local GPU Provider ──────────────────────────────────────────────────────

export class LocalGpuProvider implements ComputeProvider {
  readonly kind: ProviderKind = "local";
  readonly id = "local:webgpu";
  readonly name = "Local vGPU";

  private _snapshot: ProviderSnapshot | null = null;

  async init(): Promise<ProviderSnapshot> {
    const gpu = getHologramGpu();
    const lut = getLutEngine();

    const deviceInfo = await gpu.init();
    const lutInfo = await lut.info();
    const criticalIdentity = await lut.verifyCriticalIdentity();

    const caps: ComputeCapabilities = {
      matmul: gpu.isReady,
      lutApply: true, // always available (CPU fallback)
      inference: gpu.isReady,
      customShader: gpu.isReady,
      maxBufferBytes: deviceInfo.maxBufferSize,
      maxWorkgroups: deviceInfo.maxComputeInvocations,
      estimatedGflops: 0,
      estimatedBandwidthGBps: 0,
    };

    // Run CPU LUT benchmark immediately on init
    const cpuBench = this._runCpuLutBenchmark(lut);

    this._snapshot = {
      kind: "local",
      id: this.id,
      name: this.name,
      status: gpu.isReady ? "ready" : lutInfo.criticalIdentityHolds ? "degraded" : "error",
      capabilities: caps,
      deviceInfo,
      lutInfo,
      benchmarkResult: null,
      cpuBenchmarkResult: cpuBench,
      criticalIdentity,
      lastUpdated: new Date().toISOString(),
      costPerGflopS: 0,
      estimatedTokPerSec: cpuBench ? Math.round(cpuBench.lutMopsPerSec * 0.5) : 0,
    };

    return this._snapshot;
  }

  async snapshot(): Promise<ProviderSnapshot> {
    if (!this._snapshot) return this.init();
    return this._snapshot;
  }

  /** CPU-only LUT throughput benchmark — always works, no GPU needed. */
  private _runCpuLutBenchmark(lut: ReturnType<typeof getLutEngine>): CpuLutBenchmarkResult {
    const tables: LutName[] = ["neg", "bnot", "succ", "pred", "neg_bnot", "double", "square"];
    const elementCount = 65536; // 64KB per table
    const input = new Uint8Array(elementCount);
    // Fill with deterministic pattern
    for (let i = 0; i < elementCount; i++) input[i] = i & 0xff;

    const start = performance.now();
    let totalOps = 0;
    for (const name of tables) {
      // Use CPU apply path (synchronous TypedArray indexing)
      const table = lut.getTable(name);
      if (!table) continue;
      const out = new Uint8Array(elementCount);
      for (let i = 0; i < elementCount; i++) {
        out[i] = table[input[i]];
      }
      totalOps += elementCount;
    }
    const elapsed = performance.now() - start;

    const mops = (totalOps / 1e6) / (elapsed / 1000);
    // Each op = 1 byte read from table + 1 byte write = 2 bytes transferred
    const throughputGBps = (totalOps * 2) / (elapsed / 1000) / 1e9;

    return {
      "@type": "uor:CpuLutBenchmark",
      lutMopsPerSec: Math.round(mops * 10) / 10,
      lutThroughputGBps: Math.round(throughputGBps * 100) / 100,
      tablesTested: tables.length,
      totalElements: totalOps,
      timeMs: Math.round(elapsed * 100) / 100,
    };
  }

  async benchmark(): Promise<GpuBenchmarkResult | null> {
    const gpu = getHologramGpu();
    const lut = getLutEngine();
    await gpu.init();

    // Always re-run CPU benchmark
    const cpuBench = this._runCpuLutBenchmark(lut);

    if (gpu.isReady) {
      const result = await gpu.benchmark();
      if (this._snapshot) {
        this._snapshot = {
          ...this._snapshot,
          benchmarkResult: result,
          cpuBenchmarkResult: cpuBench,
          capabilities: {
            ...this._snapshot.capabilities,
            estimatedGflops: result.matmulGflops,
            estimatedBandwidthGBps: result.bandwidthGBps,
          },
          estimatedTokPerSec: Math.round(result.matmulGflops * 8),
          lastUpdated: new Date().toISOString(),
        };
      }
      return result;
    }

    // No GPU — update snapshot with CPU-only results
    if (this._snapshot) {
      this._snapshot = {
        ...this._snapshot,
        cpuBenchmarkResult: cpuBench,
        capabilities: {
          ...this._snapshot.capabilities,
          estimatedBandwidthGBps: cpuBench.lutThroughputGBps,
        },
        estimatedTokPerSec: Math.round(cpuBench.lutMopsPerSec * 0.5),
        lastUpdated: new Date().toISOString(),
      };
    }
    return null;
  }

  destroy(): void {
    getHologramGpu().destroy();
    this._snapshot = null;
  }
}

// ── Cloud Provider (Stub) ───────────────────────────────────────────────────

export class CloudProvider implements ComputeProvider {
  readonly kind: ProviderKind = "cloud";
  readonly id = "cloud:hologram";
  readonly name = "Hologram Cloud";

  async init(): Promise<ProviderSnapshot> {
    return {
      kind: "cloud",
      id: this.id,
      name: this.name,
      status: "offline",
      capabilities: {
        matmul: false, lutApply: false, inference: false, customShader: false,
        maxBufferBytes: 0, maxWorkgroups: 0, estimatedGflops: 0, estimatedBandwidthGBps: 0,
      },
      deviceInfo: null, lutInfo: null, benchmarkResult: null, cpuBenchmarkResult: null, criticalIdentity: null,
      lastUpdated: new Date().toISOString(),
      costPerGflopS: 0,
      estimatedTokPerSec: 0,
    };
  }

  async snapshot(): Promise<ProviderSnapshot> { return this.init(); }
  async benchmark(): Promise<null> { return null; }
  destroy(): void {}
}

// ── Peer Provider (Stub) ────────────────────────────────────────────────────

export class PeerProvider implements ComputeProvider {
  readonly kind: ProviderKind = "peer";
  readonly id = "peer:mesh";
  readonly name = "Peer Network";

  async init(): Promise<ProviderSnapshot> {
    return {
      kind: "peer",
      id: this.id,
      name: this.name,
      status: "offline",
      capabilities: {
        matmul: false, lutApply: false, inference: false, customShader: false,
        maxBufferBytes: 0, maxWorkgroups: 0, estimatedGflops: 0, estimatedBandwidthGBps: 0,
      },
      deviceInfo: null, lutInfo: null, benchmarkResult: null, cpuBenchmarkResult: null, criticalIdentity: null,
      lastUpdated: new Date().toISOString(),
      costPerGflopS: 0,
      estimatedTokPerSec: 0,
    };
  }

  async snapshot(): Promise<ProviderSnapshot> { return this.init(); }
  async benchmark(): Promise<null> { return null; }
  destroy(): void {}
}

// ── Compute Orchestrator ────────────────────────────────────────────────────

/**
 * The Hologram Compute Orchestrator.
 *
 * Manages all registered providers and selects the optimal one
 * per-job based on locality, cost, and latency heuristics.
 *
 * Today: routes everything to LocalGpuProvider.
 * Tomorrow: smart routing across local → cloud → peer mesh.
 */
export class ComputeOrchestrator {
  private providers: ComputeProvider[] = [];
  private snapshots = new Map<string, ProviderSnapshot>();

  constructor() {
    this.providers = [
      new LocalGpuProvider(),
      new CloudProvider(),
      new PeerProvider(),
    ];
  }

  /**
   * Initialize all providers, the ComputeDispatcher, and the AdaptiveClockBooster.
   * The dispatcher probes hardware and selects the optimal tier.
   * The clock starts with idle-gated boosting wired to the dispatcher.
   */
  async init(): Promise<ProviderSnapshot[]> {
    const results = await Promise.all(
      this.providers.map(async (p) => {
        const snap = await p.init();
        this.snapshots.set(p.id, snap);
        return snap;
      }),
    );

    // Boot the tiered compute dispatcher
    const dispatcher = getDispatcher();
    await dispatcher.init();

    // Wire the adaptive clock to the dispatcher's idle gating
    const clock = getClock();
    clock.onTick((_tick, _dt, boosting) => {
      if (boosting) {
        dispatcher.enterIdle();
      } else {
        dispatcher.exitIdle();
      }
    });
    clock.start();

    return results;
  }

  /** Get all provider snapshots. */
  async allSnapshots(): Promise<ProviderSnapshot[]> {
    if (this.snapshots.size === 0) await this.init();
    return [...this.snapshots.values()];
  }

  /** Get the ComputeDispatcher snapshot (tiered cascade status). */
  get dispatcherSnapshot(): DispatcherSnapshot {
    return getDispatcher().snapshot();
  }

  /** Get the AdaptiveClockBooster snapshot. */
  get clockSnapshot(): ClockSnapshot {
    return getClock().snapshot();
  }

  /** Get best available provider for a job type. */
  bestProvider(jobType: ComputeJob["type"]): ComputeProvider | null {
    for (const p of this.providers) {
      const snap = this.snapshots.get(p.id);
      if (!snap || snap.status === "offline" || snap.status === "error") continue;
      if (jobType === "matmul" && snap.capabilities.matmul) return p;
      if (jobType === "lut" && snap.capabilities.lutApply) return p;
      if (jobType === "inference" && snap.capabilities.inference) return p;
      if (jobType === "shader" && snap.capabilities.customShader) return p;
    }
    return null;
  }

  /** Run benchmark on a specific provider. */
  async benchmarkProvider(providerId: string): Promise<GpuBenchmarkResult | null> {
    const provider = this.providers.find(p => p.id === providerId);
    if (!provider) return null;
    const result = await provider.benchmark();
    if (result) {
      const snap = await provider.snapshot();
      this.snapshots.set(provider.id, snap);
    }
    return result;
  }

  /** Get the local provider (always available). */
  get local(): LocalGpuProvider {
    return this.providers[0] as LocalGpuProvider;
  }

  destroy(): void {
    this.providers.forEach(p => p.destroy());
    this.snapshots.clear();
    getDispatcher().destroy();
    getClock().destroy();
  }
}

// ── Singleton ───────────────────────────────────────────────────────────────

let _orchestrator: ComputeOrchestrator | null = null;

export function getOrchestrator(): ComputeOrchestrator {
  if (!_orchestrator) _orchestrator = new ComputeOrchestrator();
  return _orchestrator;
}
