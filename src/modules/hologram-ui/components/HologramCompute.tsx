/**
 * HologramCompute — Full-panel compute dashboard within the Hologram OS.
 *
 * Two modes:
 *   Overview  — Layperson view: your compute at a glance, key metrics, status
 *   Pro       — Cloud-like infrastructure dashboard for developers/skeptics
 *
 * Plus a visible link to the live benchmark demo.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  IconCpu, IconBolt, IconBrain, IconChartBar, IconX,
  IconCloudComputing, IconUsers, IconPlayerPlay,
  IconCircleCheck, IconFlame, IconActivity, IconBoltFilled,
  IconArrowRight, IconExternalLink,
} from "@tabler/icons-react";
import { getOrchestrator, type ProviderSnapshot } from "@/modules/hologram-compute";
import ConstantTimeBenchmark from "@/modules/hologram-compute/ConstantTimeBenchmark";

// ── Palette (matches browser panel styling) ─────────────────────────────────

const P = {
  bg: "hsl(25, 8%, 8%)",
  border: "hsla(38, 12%, 70%, 0.1)",
  font: "'DM Sans', system-ui, sans-serif",
  card: "hsla(25, 8%, 12%, 0.6)",
  cardBorder: "hsla(38, 12%, 70%, 0.08)",
  text: "hsl(38, 10%, 88%)",
  muted: "hsl(38, 8%, 55%)",
  gold: "hsl(38, 40%, 65%)",
  green: "hsl(152, 44%, 50%)",
  dim: "hsl(38, 8%, 35%)",
};

type Mode = "overview" | "pro";
type View = "dashboard" | "demo";

const STATUS_COLOR: Record<string, string> = {
  ready: P.green,
  degraded: P.gold,
  offline: P.dim,
  error: "hsl(0, 55%, 55%)",
};

function sc(s: string) { return STATUS_COLOR[s] ?? STATUS_COLOR.offline; }

// ── Main Component ──────────────────────────────────────────────────────────

interface HologramComputeProps {
  onClose: () => void;
}

export default function HologramCompute({ onClose }: HologramComputeProps) {
  const [snapshots, setSnapshots] = useState<ProviderSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [benchmarking, setBenchmarking] = useState(false);
  const [mode, setMode] = useState<Mode>("overview");
  const [view, setView] = useState<View>("dashboard");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const orch = getOrchestrator();
      const snaps = await orch.init();
      if (!cancelled) { setSnapshots(snaps); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const localSnap = useMemo(() => snapshots.find(s => s.kind === "local"), [snapshots]);

  const runBenchmark = useCallback(async () => {
    setBenchmarking(true);
    const orch = getOrchestrator();
    await orch.benchmarkProvider("local:webgpu");
    const snaps = await orch.allSnapshots();
    setSnapshots(snaps);
    setBenchmarking(false);
  }, []);

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden"
      style={{
        background: P.bg,
        backdropFilter: "blur(60px) saturate(1.6)",
        WebkitBackdropFilter: "blur(60px) saturate(1.6)",
        fontFamily: P.font,
        borderLeft: `1px solid ${P.border}`,
        boxShadow: "inset 0 0 80px hsla(25, 8%, 4%, 0.3)",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <header
        className="shrink-0 flex items-center justify-between px-6 h-14"
        style={{ borderBottom: `1px solid ${P.border}` }}
      >
        <div className="flex items-center gap-3">
          <IconCpu size={18} style={{ color: P.gold }} />
          <h1 className="text-[15px] font-medium" style={{ color: P.text }}>Compute</h1>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium"
            style={{ color: P.gold, background: "hsla(38, 40%, 65%, 0.12)" }}
          >
            vGPU
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div
            className="inline-flex items-center rounded-full p-0.5 gap-0.5"
            style={{ border: `1px solid ${P.cardBorder}`, background: P.card }}
          >
            {(["overview", "pro"] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setView("dashboard"); }}
                className="px-3.5 py-1 rounded-full text-[11px] font-medium transition-all duration-300"
                style={{
                  background: mode === m ? "hsla(38, 40%, 65%, 0.15)" : "transparent",
                  color: mode === m ? P.gold : P.muted,
                }}
              >
                {m === "overview" ? "Overview" : "Pro"}
              </button>
            ))}
          </div>

          {/* Demo link */}
          <button
            onClick={() => { setView(view === "demo" ? "dashboard" : "demo"); scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200"
            style={{
              color: view === "demo" ? P.gold : P.muted,
              background: view === "demo" ? "hsla(38, 40%, 65%, 0.12)" : "transparent",
              border: `1px solid ${view === "demo" ? "hsla(38, 40%, 65%, 0.2)" : P.cardBorder}`,
            }}
          >
            <IconChartBar size={12} />
            {view === "demo" ? "Back" : "Demo"}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors duration-200"
            style={{ color: P.muted }}
            onMouseEnter={e => (e.currentTarget.style.color = P.text)}
            onMouseLeave={e => (e.currentTarget.style.color = P.muted)}
          >
            <IconX size={16} />
          </button>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: P.gold, borderTopColor: "transparent" }} />
          </div>
        ) : view === "demo" ? (
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
            <div className="space-y-2">
              <h2
                className="text-xl font-light"
                style={{ color: P.text, fontFamily: "'Playfair Display', serif" }}
              >
                Performance Proof
              </h2>
              <p className="text-[13px] leading-relaxed" style={{ color: P.muted }}>
                Live benchmark comparing standard compute against the Hologram LUT engine.
                All data computed in real-time in your browser.
              </p>
            </div>
            <ConstantTimeBenchmark />
          </div>
        ) : mode === "overview" ? (
          <OverviewMode snap={localSnap} onBenchmark={runBenchmark} benchmarking={benchmarking} onDemo={() => setView("demo")} />
        ) : (
          <ProMode snapshots={snapshots} localSnap={localSnap} onBenchmark={runBenchmark} benchmarking={benchmarking} onDemo={() => setView("demo")} />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW MODE — Clear, human, for the layperson
// ═══════════════════════════════════════════════════════════════════════════

function OverviewMode({ snap, onBenchmark, benchmarking, onDemo }: {
  snap: ProviderSnapshot | undefined;
  onBenchmark: () => void;
  benchmarking: boolean;
  onDemo: () => void;
}) {
  const mops = snap?.cpuBenchmarkResult?.lutMopsPerSec ?? 0;
  const gflops = snap?.benchmarkResult?.matmulGflops ?? 0;
  const bw = snap?.benchmarkResult?.bandwidthGBps ?? snap?.cpuBenchmarkResult?.lutThroughputGBps ?? 0;
  const tables = snap?.lutInfo?.tableCount ?? 0;
  const tokSec = snap?.estimatedTokPerSec ?? 0;
  const isOnline = snap?.status === "ready" || snap?.status === "degraded";
  const hasBench = mops > 0 || gflops > 0;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-12">
      {/* Status */}
      <section className="text-center space-y-4">
        <h2
          className="text-2xl md:text-3xl font-light tracking-tight"
          style={{ color: P.text, fontFamily: "'Playfair Display', serif" }}
        >
          Your compute, everywhere
        </h2>
        <p className="text-[13px] leading-relaxed max-w-sm mx-auto" style={{ color: P.muted }}>
          AI processing that runs directly on your device.
          No cloud bills. No data leaves your machine.
        </p>
        <div className="flex items-center justify-center gap-2 pt-1">
          <div className="w-2 h-2 rounded-full" style={{ background: sc(snap?.status ?? "offline") }} />
          <span className="text-[12px]" style={{ color: P.muted }}>
            {isOnline ? "Active" : "Initializing"}
          </span>
        </div>
      </section>

      {/* Key metrics */}
      <section className="grid grid-cols-3 gap-6">
        <Metric
          value={gflops > 0 ? `${gflops.toFixed(0)}` : mops > 0 ? `${mops.toFixed(0)}M` : "—"}
          unit={gflops > 0 ? "GFLOPS" : "ops/s"}
          label="Processing"
        />
        <Metric value={bw > 0 ? bw.toFixed(1) : "—"} unit="GB/s" label="Throughput" />
        <Metric value={tokSec > 0 ? `~${tokSec}` : "—"} unit="tok/s" label="AI Speed" />
      </section>

      {/* Resources */}
      <section className="grid grid-cols-2 gap-3">
        <ResourceItem icon={<IconCpu size={16} />} label="Compute Engine" value={isOnline ? "Active" : "—"} on={isOnline} />
        <ResourceItem icon={<IconBolt size={16} />} label="LUT Tables" value={tables > 0 ? `${tables} loaded` : "—"} on={tables > 0} />
        <ResourceItem icon={<IconBrain size={16} />} label="AI Inference" value={tokSec > 0 ? "Ready" : "Awaiting benchmark"} on={tokSec > 0} />
        <ResourceItem icon={<IconBoltFilled size={16} />} label="Cost" value="$0 / forever" on />
      </section>

      {/* CTA */}
      <section className="text-center space-y-3">
        <button
          onClick={onBenchmark}
          disabled={benchmarking}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium transition-all duration-300 disabled:opacity-50"
          style={{ background: P.gold, color: "hsl(25, 8%, 8%)" }}
        >
          {benchmarking ? (
            <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Measuring…</>
          ) : (
            <><IconPlayerPlay size={14} /> {hasBench ? "Re-measure" : "Measure your device"}</>
          )}
        </button>
        {hasBench && (
          <p className="text-[11px]" style={{ color: P.dim }}>
            Last measured {snap?.lastUpdated ? new Date(snap.lastUpdated).toLocaleTimeString() : "just now"}
          </p>
        )}
      </section>

      {/* Demo teaser */}
      <section className="text-center">
        <button
          onClick={onDemo}
          className="inline-flex items-center gap-2 text-[12px] font-medium transition-colors duration-200"
          style={{ color: P.gold }}
        >
          <IconChartBar size={14} />
          See the live performance proof
          <IconArrowRight size={12} />
        </button>
      </section>

      {/* What's included */}
      <section className="space-y-4">
        <h3 className="text-[13px] font-medium" style={{ color: P.text }}>What's included</h3>
        <div className="space-y-2.5">
          {[
            ["Private AI inference on your device", true],
            ["Constant-time compute engine", true],
            ["Zero-cost — no cloud GPU bills", true],
            ["Cloud GPU clusters (H100, B200)", false],
            ["Peer-to-peer compute sharing", false],
          ].map(([text, available], i) => (
            <div key={i} className="flex items-center gap-3">
              <IconCircleCheck
                size={14}
                style={{ color: available ? P.green : P.dim, opacity: available ? 1 : 0.5 }}
              />
              <span className="text-[12px]" style={{ color: available ? P.text : P.dim }}>
                {text as string}
                {!available && <span className="ml-1.5 text-[10px]" style={{ color: P.dim }}>coming soon</span>}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PRO MODE — Cloud-like infrastructure dashboard
// ═══════════════════════════════════════════════════════════════════════════

function ProMode({ snapshots, localSnap, onBenchmark, benchmarking, onDemo }: {
  snapshots: ProviderSnapshot[];
  localSnap: ProviderSnapshot | undefined;
  onBenchmark: () => void;
  benchmarking: boolean;
  onDemo: () => void;
}) {
  const gpu = localSnap?.benchmarkResult;
  const cpu = localSnap?.cpuBenchmarkResult;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Top metrics */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCell label="Status" value={localSnap?.status === "ready" ? "Online" : localSnap?.status === "degraded" ? "CPU Mode" : "—"} color={sc(localSnap?.status ?? "")} />
        <StatCell label="GFLOPS" value={gpu?.matmulGflops.toFixed(1) ?? (cpu ? `${cpu.lutMopsPerSec.toFixed(0)}M` : "—")} />
        <StatCell label="Bandwidth" value={gpu?.bandwidthGBps.toFixed(1) ?? cpu?.lutThroughputGBps.toFixed(2) ?? "—"} unit="GB/s" />
        <StatCell label="LUT Tables" value={`${localSnap?.lutInfo?.tableCount ?? 0}`} unit={`× ${localSnap?.lutInfo?.tableSize ?? 256}`} />
        <StatCell label="Inference" value={localSnap?.estimatedTokPerSec ? `~${localSnap.estimatedTokPerSec}` : "—"} unit="tok/s" />
      </section>

      {/* Services */}
      <section className="space-y-3">
        <SectionTitle>Services</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ProCard
            icon={<IconCpu size={20} />}
            title="Local vGPU"
            desc="WebGPU compute with constant-time LUT engine. Auto CPU fallback."
            active
            action="Run Benchmark"
            onClick={onBenchmark}
            loading={benchmarking}
          />
          <ProCard
            icon={<IconCloudComputing size={20} />}
            title="GPU Clusters"
            desc="NVIDIA H100 / B200 cloud integration. Unified API."
          />
          <ProCard
            icon={<IconUsers size={20} />}
            title="Peer Compute"
            desc="Federated GPU mesh. Contribute and consume cycles."
          />
        </div>
      </section>

      {/* Infrastructure */}
      <section className="space-y-3">
        <SectionTitle>Infrastructure</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {snapshots.map(snap => (
            <ProviderCard key={snap.id} snap={snap} />
          ))}
        </div>
      </section>

      {/* LUT Engine */}
      {localSnap?.lutInfo && (
        <section className="space-y-3">
          <SectionTitle>Constant-Time Engine</SectionTitle>
          <div className="rounded-xl p-5" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xl font-mono font-light" style={{ color: P.text }}>{localSnap.lutInfo.tableCount}</p>
                <p className="text-[11px] mt-1" style={{ color: P.muted }}>Lookup Tables</p>
              </div>
              <div>
                <p className="text-xl font-mono font-light" style={{ color: P.text }}>{localSnap.lutInfo.tableSize}</p>
                <p className="text-[11px] mt-1" style={{ color: P.muted }}>Entries Each</p>
              </div>
              <div>
                <p className="text-xl font-mono font-light" style={{ color: P.text }}>{(localSnap.lutInfo.cacheSizeBytes / 1024).toFixed(1)}K</p>
                <p className="text-[11px] mt-1" style={{ color: P.muted }}>Cache Size</p>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-mono font-light" style={{ color: P.text }}>
                    {localSnap.lutInfo.criticalIdentityHolds ? "Verified" : "Failed"}
                  </p>
                  <IconCircleCheck size={14} style={{ color: localSnap.lutInfo.criticalIdentityHolds ? P.green : "hsl(0, 55%, 55%)" }} />
                </div>
                <p className="text-[11px] mt-1" style={{ color: P.muted }}>Critical Identity</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Workloads */}
      <section className="space-y-3">
        <SectionTitle>Workloads</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {[
            { name: "MatMul", desc: "Matrix multiplication", badge: "WGSL" },
            { name: "ReLU", desc: "Activation function", badge: "WGSL" },
            { name: "Softmax", desc: "Probability distribution", badge: "WGSL" },
            { name: "LUT Apply", desc: "Parallel table lookup", badge: "WGSL" },
            { name: "Vec Add", desc: "Vector addition", badge: "WGSL" },
            { name: "Hash Viz", desc: "Identity visualization", badge: "WGSL" },
          ].map(s => (
            <div
              key={s.name}
              className="flex items-center justify-between p-3 rounded-lg transition-colors duration-200"
              style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}
            >
              <div className="flex items-center gap-2.5">
                <IconFlame size={12} style={{ color: P.dim }} />
                <div>
                  <p className="text-[12px] font-medium" style={{ color: P.text }}>{s.name}</p>
                  <p className="text-[10px]" style={{ color: P.dim }}>{s.desc}</p>
                </div>
              </div>
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                style={{ color: P.muted, border: `1px solid ${P.cardBorder}` }}
              >
                {s.badge}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Demo link */}
      <section className="text-center pt-2">
        <button
          onClick={onDemo}
          className="inline-flex items-center gap-2 text-[12px] font-medium transition-colors duration-200"
          style={{ color: P.gold }}
        >
          <IconChartBar size={14} />
          View live performance proof
          <IconArrowRight size={12} />
        </button>
      </section>

      {/* Footer */}
      <div className="text-center text-[11px] py-4" style={{ color: P.dim, borderTop: `1px solid ${P.border}` }}>
        Hologram Compute — Local vGPU today. Cloud + Peer tomorrow.
      </div>
    </div>
  );
}

// ── Shared sub-components ───────────────────────────────────────────────────

function Metric({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <div className="text-center space-y-1">
      <div className="flex items-baseline justify-center gap-1">
        <span className="text-2xl font-light font-mono tracking-tight" style={{ color: P.text }}>{value}</span>
        <span className="text-[11px]" style={{ color: P.muted }}>{unit}</span>
      </div>
      <p className="text-[11px]" style={{ color: P.dim }}>{label}</p>
    </div>
  );
}

function ResourceItem({ icon, label, value, on }: { icon: React.ReactNode; label: string; value: string; on?: boolean }) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}
    >
      <div style={{ color: on ? P.green : P.dim }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px]" style={{ color: P.muted }}>{label}</p>
        <p className="text-[12px] font-medium truncate" style={{ color: P.text }}>{value}</p>
      </div>
    </div>
  );
}

function StatCell({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
      <p className="text-[10px] mb-1" style={{ color: P.muted }}>{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-base font-mono font-medium" style={{ color: color ?? P.text }}>{value}</span>
        {unit && <span className="text-[10px]" style={{ color: P.dim }}>{unit}</span>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: P.muted }}>
      {children}
    </h2>
  );
}

function ProCard({ icon, title, desc, active, action, onClick, loading }: {
  icon: React.ReactNode; title: string; desc: string; active?: boolean;
  action?: string; onClick?: () => void; loading?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4 space-y-3 transition-all duration-300"
      style={{
        background: P.card,
        border: `1px solid ${active ? P.cardBorder : "hsla(38, 12%, 70%, 0.04)"}`,
        opacity: active ? 1 : 0.55,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-lg" style={{ background: "hsla(38, 12%, 90%, 0.06)", color: active ? P.green : P.dim }}>
          {icon}
        </div>
        {!active && <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: P.dim }}>Planned</span>}
      </div>
      <div>
        <h3 className="text-[13px] font-semibold" style={{ color: P.text }}>{title}</h3>
        <p className="text-[11px] mt-1 leading-relaxed" style={{ color: P.muted }}>{desc}</p>
      </div>
      {action && onClick && (
        <button
          onClick={onClick}
          disabled={loading}
          className="flex items-center gap-1.5 text-[11px] font-medium transition-colors disabled:opacity-50"
          style={{ color: P.text }}
        >
          {loading ? <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: P.text, borderTopColor: "transparent" }} /> : <IconActivity size={12} />}
          {loading ? "Running…" : action}
        </button>
      )}
    </div>
  );
}

function ProviderCard({ snap }: { snap: ProviderSnapshot }) {
  const isActive = snap.status === "ready" || snap.status === "degraded";
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: P.card,
        border: `1px solid ${isActive ? P.cardBorder : "hsla(38, 12%, 70%, 0.04)"}`,
        opacity: isActive ? 1 : 0.45,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: sc(snap.status) }} />
          <span className="text-[12px] font-medium" style={{ color: P.text }}>{snap.name}</span>
        </div>
        <span className="text-[9px] font-mono" style={{ color: P.dim }}>{snap.id}</span>
      </div>
      {isActive && snap.cpuBenchmarkResult && (
        <div className="flex gap-4 text-[11px] pt-2" style={{ borderTop: `1px solid ${P.cardBorder}` }}>
          <div>
            <span style={{ color: P.muted }}>LUT</span>
            <p className="font-mono" style={{ color: P.text }}>{snap.cpuBenchmarkResult.lutMopsPerSec.toFixed(0)}M ops/s</p>
          </div>
          <div>
            <span style={{ color: P.muted }}>BW</span>
            <p className="font-mono" style={{ color: P.text }}>{snap.cpuBenchmarkResult.lutThroughputGBps.toFixed(2)} GB/s</p>
          </div>
        </div>
      )}
      {!isActive && (
        <p className="text-[11px]" style={{ color: P.dim }}>
          {snap.kind === "cloud" ? "Cloud GPU — coming soon" : "Peer mesh — coming soon"}
        </p>
      )}
    </div>
  );
}
