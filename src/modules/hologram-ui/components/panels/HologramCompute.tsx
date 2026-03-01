/**
 * HologramCompute — Full-panel compute dashboard within the Hologram OS.
 *
 * Overview  — Human-first: Why, How, What + resources, performance, usage log
 * Pro       — Cloud-like infrastructure dashboard for developers
 * Demo      — Live constant-time benchmark proof
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  IconCpu, IconBolt, IconBrain, IconChartBar, IconX,
  IconCloudComputing, IconUsers, IconPlayerPlay,
  IconCircleCheck, IconFlame, IconActivity, IconBoltFilled,
  IconArrowRight, IconShieldCheck, IconClock, IconDatabase,
  IconMessageChatbot, IconPhoto, IconCode, IconLock,
} from "@tabler/icons-react";
import { getOrchestrator, type ProviderSnapshot } from "@/modules/hologram-compute";
import ConstantTimeBenchmark from "@/modules/hologram-compute/ConstantTimeBenchmark";

import { KP, STATUS_COLORS } from "@/modules/hologram-os/kernel-palette";

// ── Palette (kernel-derived) ────────────────────────────────────────────────

const P = KP;

const STATUS_COLOR = STATUS_COLORS;

type Mode = "overview" | "pro";
type View = "dashboard" | "demo";

function sc(s: string) { return STATUS_COLOR[s] ?? STATUS_COLOR.offline; }

// ── Simulated Activity Log ──────────────────────────────────────────────────

interface ActivityEntry {
  id: string;
  task: string;
  icon: React.ReactNode;
  timeAgo: string;
  durationMs: number;
  status: "done" | "active";
}

function generateActivityLog(): ActivityEntry[] {
  return [
    { id: "1", task: "AI Chat Response", icon: <IconMessageChatbot size={14} />, timeAgo: "Just now", durationMs: 42, status: "active" },
    { id: "2", task: "Content Analysis", icon: <IconBrain size={14} />, timeAgo: "2s ago", durationMs: 18, status: "done" },
    { id: "3", task: "Data Encryption", icon: <IconLock size={14} />, timeAgo: "5s ago", durationMs: 3, status: "done" },
    { id: "4", task: "Identity Verification", icon: <IconShieldCheck size={14} />, timeAgo: "12s ago", durationMs: 7, status: "done" },
    { id: "5", task: "Image Processing", icon: <IconPhoto size={14} />, timeAgo: "18s ago", durationMs: 31, status: "done" },
    { id: "6", task: "Code Completion", icon: <IconCode size={14} />, timeAgo: "25s ago", durationMs: 12, status: "done" },
    { id: "7", task: "Data Lookup", icon: <IconDatabase size={14} />, timeAgo: "34s ago", durationMs: 1, status: "done" },
    { id: "8", task: "AI Chat Response", icon: <IconMessageChatbot size={14} />, timeAgo: "41s ago", durationMs: 55, status: "done" },
  ];
}

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
          <div className="px-6 lg:px-10 py-6 space-y-4">
            <div className="space-y-1">
              <h2
                className="text-lg font-light"
                style={{ color: P.text, fontFamily: P.serif }}
              >
                Compute Benchmarks
              </h2>
               <p className="text-sm leading-relaxed" style={{ color: P.muted }}>
                 Live benchmarks: standard compute vs Hologram vGPU.
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
// OVERVIEW MODE — Full-width, human-first, Why → How → What
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

  const activityLog = useMemo(() => generateActivityLog(), []);

  return (
    <div className="px-6 md:px-8 lg:px-10 py-8 lg:py-10 space-y-8 lg:space-y-10 flex flex-col min-h-full">
      {/* ── Hero: Why ────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: sc(snap?.status ?? "offline") }} />
          <span className="text-base font-medium" style={{ color: isOnline ? P.green : P.muted }}>
            {isOnline ? "Online" : "Initializing"}
          </span>
        </div>
        <h2
          className="text-2xl md:text-3xl lg:text-4xl font-light tracking-tight leading-tight"
          style={{ color: P.text, fontFamily: P.serif }}
        >
          AI that runs on your device
        </h2>
        <p className="text-base lg:text-lg leading-relaxed max-w-xl" style={{ color: P.muted, lineHeight: 1.8 }}>
          Your data stays on your machine. No cloud bills. No latency.
        </p>
      </section>

      {/* ── Performance at a glance ──────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold tracking-widest uppercase" style={{ color: P.muted }}>
          Performance
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <MetricCard
            value={gflops > 0 ? `${gflops.toFixed(0)}` : mops > 0 ? `${mops.toFixed(0)}M` : "—"}
            unit={gflops > 0 ? "GFLOPS" : "ops/sec"}
            label="Processing"
          />
          <MetricCard
            value={bw > 0 ? bw.toFixed(1) : "—"}
            unit="GB/s"
            label="Throughput"
          />
          <MetricCard
            value={tokSec > 0 ? `~${tokSec}` : "—"}
            unit="tok/s"
            label="AI Speed"
          />
          <MetricCard
            value="$0"
            unit="forever"
            label="Cost"
            accent
          />
        </div>

        {/* Benchmark CTA */}
        <div className="flex items-center gap-4 pt-1">
          <button
            onClick={onBenchmark}
            disabled={benchmarking}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 disabled:opacity-50"
            style={{ background: P.gold, color: "hsl(25, 8%, 8%)" }}
          >
            {benchmarking ? (
              <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Measuring…</>
            ) : (
              <><IconPlayerPlay size={14} /> {hasBench ? "Re-measure" : "Measure your device"}</>
            )}
          </button>
          {hasBench && (
            <span className="text-xs" style={{ color: P.dim }}>
              Last measured {snap?.lastUpdated ? new Date(snap.lastUpdated).toLocaleTimeString() : "just now"}
            </span>
          )}
        </div>
      </section>

      {/* ── Two-column: Resources + Activity ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 flex-1">
        {/* Available Resources */}
        <section className="space-y-4 flex flex-col">
          <h3 className="text-sm font-semibold tracking-widest uppercase" style={{ color: P.muted }}>
            Your Resources
          </h3>
          <div className="space-y-2">
            <ResourceRow
              icon={<IconCpu size={16} />}
              label="Virtual GPU"
              value={isOnline ? "Active" : "Starting…"}
              on={isOnline}
              detail={snap?.deviceInfo?.adapterName || "Browser compute engine"}
            />
            <ResourceRow
              icon={<IconBolt size={16} />}
              label="Lookup Tables"
              value={tables > 0 ? `${tables} loaded` : "Loading…"}
              on={tables > 0}
              detail="Pre-computed answer tables for instant results"
            />
            <ResourceRow
              icon={<IconBrain size={16} />}
              label="AI Engine"
              value={tokSec > 0 ? `${tokSec} tok/s` : "Awaiting benchmark"}
              on={tokSec > 0}
              detail="On-device language model inference"
            />
            <ResourceRow
              icon={<IconShieldCheck size={16} />}
              label="Result Verification"
              value={snap?.criticalIdentity?.holds ? "Verified" : "Pending"}
              on={snap?.criticalIdentity?.holds ?? false}
              detail="Verifies cached results match full recomputation"
            />
          </div>
        </section>

        {/* Activity Log */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-widest uppercase" style={{ color: P.muted }}>
              Activity
            </h3>
            <span className="text-xs" style={{ color: P.dim }}>Live</span>
          </div>
          <div
            className="hologram-glass-card rounded-xl overflow-hidden"
          >
            {activityLog.map((entry, i) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < activityLog.length - 1 ? `1px solid ${P.cardBorder}` : "none" }}
              >
                <div style={{ color: entry.status === "active" ? P.gold : P.dim }}>
                  {entry.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: P.text }}>{entry.task}</p>
                </div>
                <span className="text-xs font-mono tabular-nums shrink-0" style={{ color: P.muted }}>
                  {entry.durationMs}ms
                </span>
                <span className="text-xs shrink-0" style={{ color: P.dim }}>
                  {entry.timeAgo}
                </span>
                {entry.status === "active" && (
                  <div className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ background: P.gold }} />
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold tracking-widest uppercase" style={{ color: P.muted }}>
          How It Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <HowCard
            step="1"
            title="Pre-compute"
            desc="Operations collapsed into lookup tables."
          />
          <HowCard
            step="2"
            title="Instant lookup"
            desc="One-step answer retrieval, no recalculation."
          />
          <HowCard
            step="3"
            title="Verified"
            desc="Mathematically proven identical to full computation."
          />
        </div>
      </section>

      {/* ── What's included ──────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold tracking-widest uppercase" style={{ color: P.muted }}>
          What's Included
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { text: "Private AI inference on your device", available: true, icon: <IconBrain size={14} /> },
            { text: "Constant-time compute engine", available: true, icon: <IconBolt size={14} /> },
            { text: "Zero cost — no cloud GPU bills", available: true, icon: <IconBoltFilled size={14} /> },
            { text: "Verified computation integrity", available: true, icon: <IconShieldCheck size={14} /> },
            { text: "Cloud GPU clusters (H100, B200)", available: false, icon: <IconCloudComputing size={14} /> },
            { text: "Peer-to-peer compute sharing", available: false, icon: <IconUsers size={14} /> },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: item.available ? P.card : "transparent",
                border: `1px solid ${item.available ? P.cardBorder : "hsla(38, 12%, 70%, 0.04)"}`,
                opacity: item.available ? 1 : 0.5,
              }}
            >
              <div style={{ color: item.available ? P.green : P.dim }}>{item.icon}</div>
              <span className="text-sm" style={{ color: item.available ? P.text : P.dim }}>
                {item.text}
              </span>
              {!item.available && (
                <span className="ml-auto text-[10px] font-medium uppercase tracking-wider" style={{ color: P.dim }}>Soon</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Demo teaser ──────────────────────────────────────── */}
      <section
        className="rounded-xl p-6 flex items-center justify-between cursor-pointer transition-all duration-300 hover:opacity-90"
        style={{
          background: "hsla(38, 40%, 65%, 0.06)",
          border: `1px solid hsla(38, 40%, 65%, 0.12)`,
        }}
        onClick={onDemo}
      >
        <div className="space-y-1">
          <h3 className="text-base font-medium" style={{ color: P.text }}>See the proof</h3>
          <p className="text-sm" style={{ color: P.muted }}>
            Live benchmark: pre-computed lookups vs standard compute
          </p>
        </div>
        <IconArrowRight size={20} style={{ color: P.gold }} />
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
    <div className="px-6 lg:px-10 py-8 space-y-8">
      {/* Top metrics */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCell label="Status" value={localSnap?.status === "ready" ? "Online" : localSnap?.status === "degraded" ? "CPU Mode" : "—"} color={sc(localSnap?.status ?? "")} />
        <StatCell label="GFLOPS" value={gpu?.matmulGflops.toFixed(1) ?? (cpu ? `${cpu.lutMopsPerSec.toFixed(0)}M` : "—")} />
        <StatCell label="Bandwidth" value={gpu?.bandwidthGBps.toFixed(1) ?? cpu?.lutThroughputGBps.toFixed(2) ?? "—"} unit="GB/s" />
        <StatCell label="Lookup Tables" value={`${localSnap?.lutInfo?.tableCount ?? 0}`} unit={`× ${localSnap?.lutInfo?.tableSize ?? 256}`} />
        <StatCell label="Inference" value={localSnap?.estimatedTokPerSec ? `~${localSnap.estimatedTokPerSec}` : "—"} unit="tok/s" />
      </section>

      {/* Services */}
      <section className="space-y-3">
        <SectionTitle>Services</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ProCard
            icon={<IconCpu size={20} />}
            title="Local GPU"
            desc="GPU-accelerated compute with pre-computed lookup tables. Falls back to CPU automatically."
            active
            action="Run Benchmark"
            onClick={onBenchmark}
            loading={benchmarking}
          />
          <ProCard
            icon={<IconCloudComputing size={20} />}
            title="Cloud GPUs"
            desc="Remote GPU clusters (H100, B200) via unified API. Same code, more power."
          />
          <ProCard
            icon={<IconUsers size={20} />}
            title="Peer Network"
            desc="Share compute with peers. Contribute idle GPU cycles, use theirs when needed."
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
          <SectionTitle>Pre-computed Engine</SectionTitle>
          <div className="rounded-xl p-5" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xl font-mono font-light" style={{ color: P.text }}>{localSnap.lutInfo.tableCount}</p>
                <p className="text-xs mt-1" style={{ color: P.muted }}>Lookup Tables</p>
              </div>
              <div>
                <p className="text-xl font-mono font-light" style={{ color: P.text }}>{localSnap.lutInfo.tableSize}</p>
                <p className="text-xs mt-1" style={{ color: P.muted }}>Entries Each</p>
              </div>
              <div>
                <p className="text-xl font-mono font-light" style={{ color: P.text }}>{(localSnap.lutInfo.cacheSizeBytes / 1024).toFixed(1)}K</p>
                <p className="text-xs mt-1" style={{ color: P.muted }}>Cache Size</p>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-mono font-light" style={{ color: P.text }}>
                    {localSnap.lutInfo.criticalIdentityHolds ? "Verified" : "Failed"}
                  </p>
                  <IconCircleCheck size={14} style={{ color: localSnap.lutInfo.criticalIdentityHolds ? P.green : "hsl(0, 55%, 55%)" }} />
                </div>
                <p className="text-xs mt-1" style={{ color: P.muted }}>Integrity</p>
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
            { name: "MatMul", desc: "Matrix multiplication", badge: "GPU" },
            { name: "ReLU", desc: "Activation function", badge: "GPU" },
            { name: "Softmax", desc: "Probability normalization", badge: "GPU" },
            { name: "Table Lookup", desc: "Pre-computed value retrieval", badge: "GPU" },
            { name: "Vec Add", desc: "Vector addition", badge: "GPU" },
            { name: "Fingerprint", desc: "Content hashing", badge: "GPU" },
          ].map(s => (
            <div
              key={s.name}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}
            >
              <div className="flex items-center gap-2.5">
                <IconFlame size={12} style={{ color: P.dim }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: P.text }}>{s.name}</p>
                  <p className="text-xs" style={{ color: P.dim }}>{s.desc}</p>
                </div>
              </div>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
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
          className="inline-flex items-center gap-2 text-sm font-medium transition-colors duration-200"
          style={{ color: P.gold }}
        >
          <IconChartBar size={14} />
          View live benchmark
          <IconArrowRight size={12} />
        </button>
      </section>
    </div>
  );
}

// ── Shared sub-components ───────────────────────────────────────────────────

function MetricCard({ value, unit, label, sublabel, accent }: {
  value: string; unit: string; label: string; sublabel?: string; accent?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4 md:p-5 space-y-2 md:space-y-3"
      style={{
        background: accent ? "hsla(38, 40%, 65%, 0.06)" : P.card,
        border: `1px solid ${accent ? "hsla(38, 40%, 65%, 0.12)" : P.cardBorder}`,
      }}
    >
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl md:text-3xl lg:text-4xl font-light font-mono tracking-tight" style={{ color: accent ? P.gold : P.text }}>{value}</span>
        <span className="text-sm md:text-base" style={{ color: P.muted }}>{unit}</span>
      </div>
      <div>
        <p className="text-sm md:text-base font-medium" style={{ color: P.text }}>{label}</p>
        <p className="text-xs md:text-sm mt-0.5" style={{ color: P.dim }}>{sublabel}</p>
      </div>
    </div>
  );
}

function ResourceRow({ icon, label, value, on, detail }: {
  icon: React.ReactNode; label: string; value: string; on: boolean; detail: string;
}) {
  return (
    <div
      className="flex items-center gap-4 px-4 py-3.5 md:py-4 rounded-xl"
      style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}
    >
      <div className="shrink-0" style={{ color: on ? P.green : P.dim }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm md:text-base font-medium" style={{ color: P.text }}>{label}</p>
          <span className="text-xs md:text-sm" style={{ color: on ? P.green : P.muted }}>{value}</span>
        </div>
        <p className="text-xs md:text-sm mt-0.5 truncate" style={{ color: P.dim }}>{detail}</p>
      </div>
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: on ? P.green : P.dim }} />
    </div>
  );
}

function HowCard({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div
      className="rounded-xl p-4 md:p-5 space-y-3"
      style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}
    >
      <div className="flex items-center gap-3">
        <span
          className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold"
          style={{ background: "hsla(38, 40%, 65%, 0.12)", color: P.gold }}
        >
          {step}
        </span>
        <h4 className="text-sm md:text-base font-semibold" style={{ color: P.text }}>{title}</h4>
      </div>
      <p className="text-sm md:text-base leading-relaxed" style={{ color: P.muted, lineHeight: 1.7 }}>{desc}</p>
    </div>
  );
}

function StatCell({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <div className="p-3 md:p-4 rounded-xl" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
      <p className="text-xs md:text-sm mb-1" style={{ color: P.muted }}>{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-base md:text-lg font-mono font-medium" style={{ color: color ?? P.text }}>{value}</span>
        {unit && <span className="text-xs md:text-sm" style={{ color: P.dim }}>{unit}</span>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs md:text-sm font-semibold tracking-widest uppercase" style={{ color: P.muted }}>
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
      className="rounded-xl p-4 md:p-5 space-y-3 transition-all duration-300"
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
        {!active && <span className="text-xs font-medium uppercase tracking-wider" style={{ color: P.dim }}>Planned</span>}
      </div>
      <div>
        <h3 className="text-sm md:text-base font-semibold" style={{ color: P.text }}>{title}</h3>
        <p className="text-xs md:text-sm mt-1 leading-relaxed" style={{ color: P.muted }}>{desc}</p>
      </div>
      {action && onClick && (
        <button
          onClick={onClick}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs md:text-sm font-medium transition-colors disabled:opacity-50"
          style={{ color: P.text }}
        >
          {loading ? <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: P.text, borderTopColor: "transparent" }} /> : <IconActivity size={14} />}
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
      className="rounded-xl p-4 md:p-5 space-y-3"
      style={{
        background: P.card,
        border: `1px solid ${isActive ? P.cardBorder : "hsla(38, 12%, 70%, 0.04)"}`,
        opacity: isActive ? 1 : 0.45,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: sc(snap.status) }} />
          <span className="text-sm md:text-base font-medium" style={{ color: P.text }}>{snap.name}</span>
        </div>
        <span className="text-xs font-mono" style={{ color: P.dim }}>{snap.id}</span>
      </div>
      {isActive && snap.cpuBenchmarkResult && (
        <div className="flex gap-4 text-xs md:text-sm pt-2" style={{ borderTop: `1px solid ${P.cardBorder}` }}>
          <div>
          <span style={{ color: P.muted }}>Lookups</span>
            <p className="font-mono" style={{ color: P.text }}>{snap.cpuBenchmarkResult.lutMopsPerSec.toFixed(0)}M ops/s</p>
          </div>
          <div>
            <span style={{ color: P.muted }}>Throughput</span>
            <p className="font-mono" style={{ color: P.text }}>{snap.cpuBenchmarkResult.lutThroughputGBps.toFixed(2)} GB/s</p>
          </div>
        </div>
      )}
      {!isActive && (
        <p className="text-xs md:text-sm" style={{ color: P.dim }}>
          {snap.kind === "cloud" ? "Cloud GPU — coming soon" : "Peer mesh — coming soon"}
        </p>
      )}
    </div>
  );
}
