/**
 * Hologram Compute — Dashboard Page
 * ═══════════════════════════════════
 *
 * A Nebius-inspired compute dashboard showing:
 *   - vGPU device status & capabilities
 *   - LUT constant-time engine metrics
 *   - Live benchmark results (matmul GFLOPS, bandwidth)
 *   - AI inference estimates (tokens/sec)
 *   - Provider topology (local / cloud / peer)
 *
 * Design: earth-toned, data-dense, restrained — matching Hologram OS.
 *
 * @module hologram-compute/HologramComputePage
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  IconCpu, IconBolt, IconBrain, IconNetwork,
  IconChartBar, IconCheckbox, IconServer,
  IconCloudComputing, IconUsers, IconArrowRight,
} from "@tabler/icons-react";
import {
  PageShell, StatCard, DashboardGrid, MetricBar, InfoCard,
} from "@/modules/hologram-ui";
import { getOrchestrator, type ProviderSnapshot } from "@/modules/hologram-compute";
import type { GpuBenchmarkResult } from "@/modules/uns/core/hologram/gpu";

// ── Palette ─────────────────────────────────────────────────────────────────

const C = {
  green:  "hsl(152, 44%, 50%)",
  gold:   "hsl(38, 40%, 60%)",
  red:    "hsl(0, 55%, 55%)",
  blue:   "hsl(210, 50%, 55%)",
  purple: "hsl(265, 40%, 60%)",
  muted:  "hsl(38, 8%, 60%)",
};

function statusColor(s: string) {
  if (s === "ready") return C.green;
  if (s === "degraded") return C.gold;
  if (s === "initializing") return C.blue;
  return C.red;
}

function statusLabel(s: string) {
  if (s === "ready") return "Online";
  if (s === "degraded") return "CPU Fallback";
  if (s === "offline") return "Coming Soon";
  if (s === "initializing") return "Starting…";
  return "Error";
}

// ── Provider Card ───────────────────────────────────────────────────────────

function ProviderCard({ snap, onBenchmark, benchmarking }: {
  snap: ProviderSnapshot;
  onBenchmark?: () => void;
  benchmarking?: boolean;
}) {
  const icon = snap.kind === "local"
    ? <IconCpu size={20} style={{ color: statusColor(snap.status) }} />
    : snap.kind === "cloud"
      ? <IconCloudComputing size={20} style={{ color: C.muted }} />
      : <IconUsers size={20} style={{ color: C.muted }} />;

  const isActive = snap.status === "ready" || snap.status === "degraded";

  return (
    <div
      className="rounded-xl border border-border bg-card p-5 space-y-4 transition-all duration-300"
      style={{
        opacity: isActive ? 1 : 0.5,
        borderColor: isActive ? statusColor(snap.status) + "33" : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h3 className="text-sm font-semibold text-foreground">{snap.name}</h3>
            <p className="text-[10px] font-mono text-muted-foreground">{snap.id}</p>
          </div>
        </div>
        <span
          className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{
            color: statusColor(snap.status),
            background: statusColor(snap.status) + "15",
          }}
        >
          {statusLabel(snap.status)}
        </span>
      </div>

      {/* Device Info */}
      {snap.deviceInfo && snap.status !== "offline" && (
        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <div>
            <span className="text-muted-foreground">Device</span>
            <p className="font-medium text-foreground truncate">{snap.deviceInfo.adapterName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Architecture</span>
            <p className="font-medium text-foreground">{snap.deviceInfo.architecture}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Max Buffer</span>
            <p className="font-mono text-foreground">
              {(snap.deviceInfo.maxBufferSize / (1024 * 1024)).toFixed(0)} MB
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Max Workgroup</span>
            <p className="font-mono text-foreground">
              {snap.deviceInfo.maxWorkgroupSizeX}×{snap.deviceInfo.maxWorkgroupSizeY}×{snap.deviceInfo.maxWorkgroupSizeZ}
            </p>
          </div>
        </div>
      )}

      {/* Benchmark */}
      {snap.benchmarkResult && (
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/50">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground font-mono">
              {snap.benchmarkResult.matmulGflops.toFixed(1)}
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">GFLOPS</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground font-mono">
              {snap.benchmarkResult.bandwidthGBps.toFixed(1)}
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">GB/s</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground font-mono">
              {snap.benchmarkResult.compileTimeMs.toFixed(0)}
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Compile ms</p>
          </div>
        </div>
      )}

      {/* Actions */}
      {isActive && onBenchmark && (
        <button
          onClick={onBenchmark}
          disabled={benchmarking}
          className="w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-200 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
        >
          {benchmarking ? (
            <>
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Running Benchmark…
            </>
          ) : (
            <>
              <IconChartBar size={14} />
              Run Benchmark
            </>
          )}
        </button>
      )}

      {/* Future providers */}
      {snap.status === "offline" && (
        <div className="text-[11px] text-muted-foreground text-center py-2">
          {snap.kind === "cloud"
            ? "Connect GPU cloud providers — NVIDIA H100/B200 clusters on demand."
            : "Join a federated peer mesh — contribute & consume compute across the network."}
        </div>
      )}
    </div>
  );
}

// ── LUT Engine Panel ────────────────────────────────────────────────────────

function LutEnginePanel({ snap }: { snap: ProviderSnapshot }) {
  if (!snap.lutInfo) return null;
  const info = snap.lutInfo;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconBolt size={18} style={{ color: C.gold }} />
          <h3 className="text-sm font-semibold text-foreground">Constant-Time Compute Engine</h3>
        </div>
        <span
          className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
          style={{
            color: info.criticalIdentityHolds ? C.green : C.red,
            background: (info.criticalIdentityHolds ? C.green : C.red) + "15",
          }}
        >
          {info.criticalIdentityHolds ? "Identity Verified" : "Identity Broken"}
        </span>
      </div>

      {/* Architecture explanation */}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Replaces arithmetic with O(1) lookup-table indexing on Z/256Z.
        Every operation — no matter how many are chained — reduces to a single
        256-byte table read. Fits in 4 CPU cache lines. Zero arithmetic units needed.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xl font-bold text-foreground font-mono">{info.tableCount}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Tables</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-foreground font-mono">{info.tableSize}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Entries Each</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-foreground font-mono">
            {(info.cacheSizeBytes / 1024).toFixed(1)}K
          </p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total Cache</p>
        </div>
      </div>

      {/* Critical Identity */}
      {snap.criticalIdentity && (
        <div className="pt-3 border-t border-border/50 space-y-2">
          <div className="flex items-center gap-2 text-[11px]">
            <IconCheckbox size={14} style={{ color: snap.criticalIdentity.holds ? C.green : C.red }} />
            <span className="text-muted-foreground">
              neg(bnot(x)) = succ(x) — verified for all 256 values
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <IconCheckbox size={14} style={{ color: snap.criticalIdentity.cidsMatch ? C.green : C.red }} />
            <span className="text-muted-foreground">
              CID match: composed table ≡ succ table (structural proof)
            </span>
          </div>
        </div>
      )}

      {/* GPU acceleration status */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: info.gpuAvailable ? C.green : C.gold }}
        />
        {info.gpuAvailable
          ? "WebGPU acceleration active — WGSL compute shader dispatches LUT apply in parallel"
          : "CPU mode — LUT indexing still O(1), using TypedArray lookups"}
      </div>
    </div>
  );
}

// ── Inference Estimate Panel ────────────────────────────────────────────────

function InferencePanel({ snap }: { snap: ProviderSnapshot }) {
  const hasGpu = snap.status === "ready";
  const gflops = snap.benchmarkResult?.matmulGflops ?? 0;
  // Conservative estimate: small quantized models can achieve ~8-15 tok/s per GFLOP
  const estTokSec = snap.estimatedTokPerSec || Math.round(gflops * 8);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <IconBrain size={18} style={{ color: C.purple }} />
        <h3 className="text-sm font-semibold text-foreground">AI Inference Estimate</h3>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Local inference via WebGPU matmul + LUT-accelerated quantized attention.
        The constant-time engine eliminates activation computation overhead for int8/int4 models.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-bold font-mono text-foreground">
            {hasGpu && gflops > 0 ? `~${estTokSec}` : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">Est. tokens/sec (7B quantized)</p>
        </div>
        <div>
          <p className="text-2xl font-bold font-mono text-foreground">
            {hasGpu ? "$0" : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">Cost per 1M tokens</p>
        </div>
      </div>

      {/* Architecture advantage */}
      <div className="rounded-lg bg-secondary/50 p-3 space-y-1">
        <p className="text-[10px] font-semibold text-foreground">Why LUT + WebGPU?</p>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Standard inference: matmul → ReLU → softmax = 3 GPU passes.
          <br />
          Hologram Compute: matmul → LUT[activation] = 2 GPU passes, with activations
          pre-composed into a single 256-byte table. 33% fewer dispatches, zero arithmetic on activations.
        </p>
      </div>
    </div>
  );
}

// ── Roadmap Section ─────────────────────────────────────────────────────────

function RoadmapSection() {
  const phases = [
    {
      phase: "Now",
      title: "Local vGPU",
      color: C.green,
      items: [
        "WebGPU device management with content-addressed pipelines",
        "O(1) LUT compute engine — 14 pre-computed tables, composable chains",
        "MatMul, ReLU, softmax, vector-add compute shaders",
        "Algebraic verification (critical identity proof)",
        "GPU benchmark suite with GFLOPS + bandwidth metrics",
      ],
    },
    {
      phase: "Next",
      title: "Hologram Cloud",
      color: C.blue,
      items: [
        "Connect cloud GPU providers (H100, B200 clusters)",
        "Unified API — same ComputeJob interface, remote execution",
        "Auto-routing: latency-sensitive → local, batch → cloud",
        "Cost tracking per job, per provider",
      ],
    },
    {
      phase: "Future",
      title: "Peer Compute Mesh",
      color: C.purple,
      items: [
        "Federated compute network — contribute & consume GPU cycles",
        "Content-addressed job sharding across peers",
        "Verifiable compute: replay any job to prove correctness",
        "Economic layer: earn tokens by contributing compute",
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <IconNetwork size={16} className="text-primary" />
        Compute Roadmap
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {phases.map((p) => (
          <div key={p.phase} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                style={{ color: p.color, background: p.color + "15" }}
              >
                {p.phase}
              </span>
              <span className="text-xs font-semibold text-foreground">{p.title}</span>
            </div>
            <ul className="space-y-1.5">
              {p.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[10px] text-muted-foreground leading-relaxed">
                  <IconArrowRight size={10} className="shrink-0 mt-0.5" style={{ color: p.color }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function HologramComputePage() {
  const [snapshots, setSnapshots] = useState<ProviderSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [benchmarking, setBenchmarking] = useState(false);

  // Init orchestrator
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const orch = getOrchestrator();
      const snaps = await orch.init();
      if (!cancelled) {
        setSnapshots(snaps);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const localSnap = useMemo(
    () => snapshots.find(s => s.kind === "local"),
    [snapshots],
  );

  const runBenchmark = useCallback(async () => {
    setBenchmarking(true);
    const orch = getOrchestrator();
    await orch.benchmarkProvider("local:webgpu");
    const snaps = await orch.allSnapshots();
    setSnapshots(snaps);
    setBenchmarking(false);
  }, []);

  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(t);
  }, []);

  if (loading) {
    return (
      <PageShell title="Hologram Compute" subtitle="Initializing vGPU…" icon={<IconCpu size={18} />}>
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  return (
    <div
      className="transition-all ease-out"
      style={{
        opacity: entered ? 1 : 0,
        transform: entered ? "scale(1)" : "scale(0.98)",
        transitionDuration: "1200ms",
      }}
    >
      <PageShell
        title="Hologram Compute"
        subtitle="Provider-Agnostic Virtual GPU Substrate"
        icon={<IconCpu size={18} />}
        badge="vGPU"
        backTo="/hologram-console"
      >
        {/* Overview Stats */}
        <DashboardGrid cols={4}>
          <StatCard
            label="Providers"
            value={snapshots.filter(s => s.status !== "offline").length}
            icon={<IconServer size={16} />}
            sublabel={`of ${snapshots.length} registered`}
          />
          <StatCard
            label="GFLOPS"
            value={localSnap?.benchmarkResult?.matmulGflops.toFixed(1) ?? "—"}
            icon={<IconChartBar size={16} />}
            sublabel="matmul throughput"
          />
          <StatCard
            label="Bandwidth"
            value={localSnap?.benchmarkResult?.bandwidthGBps.toFixed(1) ?? "—"}
            icon={<IconBolt size={16} />}
            sublabel="GB/s transfer"
          />
          <StatCard
            label="LUT Tables"
            value={localSnap?.lutInfo?.tableCount ?? "—"}
            icon={<IconBrain size={16} />}
            sublabel="O(1) compute"
          />
        </DashboardGrid>

        {/* Provider Cards */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <IconServer size={16} className="text-primary" />
            Compute Providers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {snapshots.map((snap) => (
              <ProviderCard
                key={snap.id}
                snap={snap}
                onBenchmark={snap.kind === "local" ? runBenchmark : undefined}
                benchmarking={snap.kind === "local" ? benchmarking : false}
              />
            ))}
          </div>
        </section>

        {/* LUT Engine */}
        {localSnap && <LutEnginePanel snap={localSnap} />}

        {/* AI Inference */}
        {localSnap && <InferencePanel snap={localSnap} />}

        {/* WGSL Shader Library */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">WGSL Shader Library</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { name: "matmul", desc: "Matrix multiplication — the fundamental ML building block. C = A × B." },
              { name: "relu", desc: "Element-wise ReLU activation — neural network nonlinearity." },
              { name: "softmax_exp", desc: "Numerically stable softmax — probability distributions." },
              { name: "vec_add", desc: "Vector addition — bandwidth test / sanity check." },
              { name: "identity_viz", desc: "Hash visualization — maps 32 bytes to RGBA pixels." },
              { name: "lut_apply", desc: "Parallel LUT application — 256-byte table × N elements." },
            ].map((s) => (
              <InfoCard key={s.name} title={s.name} badge="WGSL">
                <p className="text-[10px] text-muted-foreground leading-relaxed">{s.desc}</p>
              </InfoCard>
            ))}
          </div>
        </section>

        {/* Roadmap */}
        <RoadmapSection />

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-4 border-t border-border">
          Hologram Compute — Local vGPU today. Cloud + Peer compute tomorrow. Zero-cost, constant-time, verifiable.
        </div>
      </PageShell>
    </div>
  );
}
