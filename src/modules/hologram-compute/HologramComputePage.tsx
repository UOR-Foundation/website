/**
 * Hologram Compute — Dashboard Page
 * ═══════════════════════════════════
 *
 * Dual-mode compute dashboard:
 *   Consumer:  Aman-resort clarity — your compute at a glance
 *   Developer: Nebius-style professional infrastructure dashboard
 *
 * @module hologram-compute/HologramComputePage
 */

import { useState, useEffect, useMemo } from "react";
import {
  IconCpu, IconBolt, IconBrain, IconServer,
  IconCloudComputing, IconUsers, IconArrowRight,
  IconCircleCheck, IconFlame, IconBoltFilled,
} from "@tabler/icons-react";
import { PageShell } from "@/modules/hologram-ui";
import { getOrchestrator, type ProviderSnapshot } from "@/modules/hologram-compute";
import ConstantTimeBenchmark from "./ConstantTimeBenchmark";

// ── Shared ──────────────────────────────────────────────────────────────────

type Mode = "consumer" | "developer";

const STATUS_COLOR: Record<string, string> = {
  ready: "hsl(152 44% 50%)",
  degraded: "hsl(38 40% 60%)",
  offline: "hsl(38 8% 50%)",
  error: "hsl(0 55% 55%)",
};

function sc(s: string) { return STATUS_COLOR[s] ?? STATUS_COLOR.offline; }

// ── Mode Toggle ─────────────────────────────────────────────────────────────

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-card p-0.5 gap-0.5">
      {(["consumer", "developer"] as Mode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className="px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300"
          style={{
            background: mode === m ? "hsl(var(--foreground))" : "transparent",
            color: mode === m ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
          }}
        >
          {m === "consumer" ? "Overview" : "Developer"}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSUMER VIEW — Aman-inspired tranquility
// ═══════════════════════════════════════════════════════════════════════════

function ConsumerView({ snap }: {
  snap: ProviderSnapshot | undefined;
}) {
  const tables = snap?.lutInfo?.tableCount ?? 0;
  const isOnline = snap?.status === "ready" || snap?.status === "degraded";

  return (
    <div className="space-y-12">
      {/* Hero — single sentence value prop */}
      <section className="text-center space-y-4 py-8">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: sc(snap?.status ?? "offline") }} />
          <span className="text-sm" style={{ color: sc(snap?.status ?? "offline") }}>
            {isOnline ? "Online" : "Initializing"}
          </span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl text-foreground tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
          Ultra-fast AI on your device
        </h1>
        <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
          Your data never leaves your machine. No cloud bills. No waiting.
          Everything happens right here, powered by your own hardware.
        </p>
      </section>

      {/* Simple resource summary */}
      <section className="max-w-xl mx-auto space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <ResourceRow icon={<IconCpu size={18} />} label="Compute Engine" value={isOnline ? "Active" : "—"} accent={isOnline} />
          <ResourceRow icon={<IconBolt size={18} />} label="LUT Tables" value={tables > 0 ? `${tables} loaded` : "—"} accent={tables > 0} />
          <ResourceRow icon={<IconBrain size={18} />} label="AI Inference" value={isOnline ? "Ready" : "Awaiting init"} accent={isOnline} />
          <ResourceRow icon={<IconBoltFilled size={18} />} label="Cost" value="$0 / forever" accent />
        </div>
      </section>

      {/* Constant-time proof */}
      <section className="space-y-2">
        <div className="text-center space-y-0.5">
          <h2 className="font-serif text-lg text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            See the difference
          </h2>
          <p className="text-xs text-muted-foreground">
            Standard compute slows linearly with complexity. The Hologram vGPU stays constant.
          </p>
        </div>
        <ConstantTimeBenchmark />
      </section>

      {/* What's included — clean list */}
      <section className="max-w-lg mx-auto space-y-4">
        <h2 className="font-serif text-xl text-foreground text-center" style={{ fontFamily: "'Playfair Display', serif" }}>
          What's included
        </h2>
        <div className="space-y-3">
          {[
            ["Private AI inference directly on your device", true],
            ["Constant-time compute engine (14 pre-computed tables)", true],
            ["Zero-cost — no cloud GPU bills", true],
            ["Cloud GPU clusters (H100, B200)", false],
            ["Peer-to-peer compute sharing", false],
          ].map(([text, available], i) => (
            <div key={i} className="flex items-center gap-3">
              <IconCircleCheck
                size={16}
                style={{ color: available ? "hsl(152 44% 50%)" : "hsl(var(--muted-foreground))", opacity: available ? 1 : 0.4 }}
              />
              <span className={`text-sm ${available ? "text-foreground" : "text-muted-foreground"}`}>
                {text as string}
                {!available && <span className="ml-2 text-xs opacity-60">coming soon</span>}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricPill({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <div className="text-center space-y-1">
      <div className="flex items-baseline justify-center gap-1.5">
        <span className="text-3xl font-light text-foreground tracking-tight font-mono">{value}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ResourceRow({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: string; accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
      <div style={{ color: accent ? "hsl(152 44% 50%)" : "hsl(var(--muted-foreground))" }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DEVELOPER VIEW — Nebius-style infrastructure dashboard
// ═══════════════════════════════════════════════════════════════════════════

function DeveloperView({ snapshots, localSnap }: {
  snapshots: ProviderSnapshot[];
  localSnap: ProviderSnapshot | undefined;
}) {
  return (
    <div className="space-y-8">
      {/* Top status bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <DevStat label="Status" value={localSnap?.status === "ready" ? "Online" : localSnap?.status === "degraded" ? "CPU Mode" : "—"} color={sc(localSnap?.status ?? "")} />
        <DevStat label="LUT Tables" value={`${localSnap?.lutInfo?.tableCount ?? 0}`} unit={`× ${localSnap?.lutInfo?.tableSize ?? 256}`} />
        <DevStat label="Cache" value={localSnap?.lutInfo ? `${(localSnap.lutInfo.cacheSizeBytes / 1024).toFixed(1)}K` : "—"} unit="bytes" />
      </div>

      {/* Compute Services — Nebius-style featured cards */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ServiceCard
            icon={<IconCpu size={22} />}
            title="Virtual Machines"
            desc="WebGPU-accelerated compute with constant-time LUT engine. Auto-fallback to CPU."
            status="active"
          />
          <ServiceCard
            icon={<IconCloudComputing size={22} />}
            title="GPU Clusters"
            desc="Connect NVIDIA H100 / B200 cloud providers. Unified API, auto-routing."
            status="planned"
          />
          <ServiceCard
            icon={<IconUsers size={22} />}
            title="Peer Compute"
            desc="Federated compute mesh. Contribute and consume GPU cycles across the network."
            status="planned"
          />
        </div>
      </section>

      {/* Infrastructure — detailed provider cards */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">Infrastructure</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {snapshots.map(snap => (
            <ProviderDetail key={snap.id} snap={snap} />
          ))}
        </div>
      </section>

      {/* Benchmark demo */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">Performance Proof</h2>
        <ConstantTimeBenchmark />
      </section>

      {/* LUT Engine detail */}
      {localSnap?.lutInfo && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">Constant-Time Engine</h2>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-2xl font-mono font-light text-foreground">{localSnap.lutInfo.tableCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Lookup Tables</p>
              </div>
              <div>
                <p className="text-2xl font-mono font-light text-foreground">{localSnap.lutInfo.tableSize}</p>
                <p className="text-xs text-muted-foreground mt-1">Entries Each</p>
              </div>
              <div>
                <p className="text-2xl font-mono font-light text-foreground">{(localSnap.lutInfo.cacheSizeBytes / 1024).toFixed(1)}K</p>
                <p className="text-xs text-muted-foreground mt-1">Cache Size</p>
              </div>
              <div>
                <p className="text-2xl font-mono font-light text-foreground flex items-center gap-2">
                  {localSnap.lutInfo.criticalIdentityHolds ? "Verified" : "Failed"}
                  <IconCircleCheck size={16} style={{ color: localSnap.lutInfo.criticalIdentityHolds ? "hsl(152 44% 50%)" : "hsl(0 55% 55%)" }} />
                </p>
                <p className="text-xs text-muted-foreground mt-1">Critical Identity</p>
              </div>
            </div>
            {localSnap.criticalIdentity && (
              <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground font-mono">
                <span>neg(bnot(x)) = succ(x) ∀ x ∈ [0,255] — {localSnap.criticalIdentity.holds ? "✓" : "✗"}</span>
                <span>CID structural match — {localSnap.criticalIdentity.cidsMatch ? "✓" : "✗"}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Workloads / Shader Library */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">Workloads</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { name: "MatMul", desc: "Matrix multiplication — ML foundation", badge: "WGSL" },
            { name: "ReLU", desc: "Activation function — neural network nonlinearity", badge: "WGSL" },
            { name: "Softmax", desc: "Probability distribution — attention layers", badge: "WGSL" },
            { name: "LUT Apply", desc: "Parallel table lookup — constant-time operations", badge: "WGSL" },
            { name: "Vec Add", desc: "Vector addition — bandwidth benchmark", badge: "WGSL" },
            { name: "Hash Viz", desc: "Identity visualization — 32 bytes → RGBA", badge: "WGSL" },
          ].map(s => (
            <div key={s.name} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3">
                <IconFlame size={14} className="text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">{s.badge}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Roadmap */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">Roadmap</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { phase: "Now", title: "Local vGPU", color: "hsl(152 44% 50%)", items: [
              "WebGPU + CPU fallback compute",
              "14 pre-composed O(1) LUT tables",
              "WGSL shader library (matmul, ReLU, softmax)",
              "Content-addressed pipelines",
              "GPU benchmark suite",
            ]},
            { phase: "Next", title: "Cloud GPU", color: "hsl(210 50% 55%)", items: [
              "NVIDIA H100 / B200 cluster integration",
              "Unified ComputeJob API",
              "Auto-routing: local → cloud by latency",
              "Per-job cost tracking",
            ]},
            { phase: "Future", title: "Peer Mesh", color: "hsl(265 40% 60%)", items: [
              "Federated GPU cycle marketplace",
              "Content-addressed job sharding",
              "Verifiable replay proofs",
              "Token economics for contributors",
            ]},
          ].map(p => (
            <div key={p.phase} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ color: p.color, background: p.color.replace(")", " / 0.12)") }}>
                  {p.phase}
                </span>
                <span className="text-sm font-semibold text-foreground">{p.title}</span>
              </div>
              <ul className="space-y-1.5">
                {p.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                    <IconArrowRight size={10} className="shrink-0 mt-1" style={{ color: p.color }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Developer sub-components ────────────────────────────────────────────────

function DevStat({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <div className="p-3 rounded-xl border border-border bg-card">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-mono font-medium" style={{ color: color ?? "hsl(var(--foreground))" }}>{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function ServiceCard({ icon, title, desc, status }: {
  icon: React.ReactNode; title: string; desc: string; status: "active" | "planned";
}) {
  const isActive = status === "active";
  return (
    <div className={`rounded-xl border bg-card p-5 space-y-4 transition-all duration-300 ${isActive ? "border-border" : "border-border/50 opacity-60"}`}>
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-lg bg-secondary" style={{ color: isActive ? "hsl(152 44% 50%)" : "hsl(var(--muted-foreground))" }}>
          {icon}
        </div>
        {!isActive && (
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Planned</span>
        )}
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function ProviderDetail({ snap }: { snap: ProviderSnapshot }) {
  const isActive = snap.status === "ready" || snap.status === "degraded";
  return (
    <div className={`rounded-xl border bg-card p-4 space-y-3 ${isActive ? "border-border" : "border-border/50 opacity-50"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: sc(snap.status) }} />
          <span className="text-sm font-medium text-foreground">{snap.name}</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">{snap.id}</span>
      </div>
      {isActive && snap.deviceInfo && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Device</span>
            <p className="font-mono text-foreground truncate">{snap.deviceInfo.adapterName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Arch</span>
            <p className="font-mono text-foreground">{snap.deviceInfo.architecture}</p>
          </div>
        </div>
      )}
      {isActive && snap.cpuBenchmarkResult && (
        <div className="flex gap-4 text-xs pt-2 border-t border-border/50">
          <div>
            <span className="text-muted-foreground">LUT</span>
            <p className="font-mono text-foreground">{snap.cpuBenchmarkResult.lutMopsPerSec.toFixed(0)}M ops/s</p>
          </div>
          <div>
            <span className="text-muted-foreground">BW</span>
            <p className="font-mono text-foreground">{snap.cpuBenchmarkResult.lutThroughputGBps.toFixed(2)} GB/s</p>
          </div>
        </div>
      )}
      {!isActive && (
        <p className="text-xs text-muted-foreground">
          {snap.kind === "cloud" ? "Cloud GPU integration — coming soon" : "Peer mesh network — coming soon"}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function HologramComputePage() {
  const [snapshots, setSnapshots] = useState<ProviderSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("consumer");

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


  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(t);
  }, []);

  if (loading) {
    return (
      <PageShell title="Compute" subtitle="Initializing…" icon={<IconCpu size={18} />}>
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
        title="Compute"
        subtitle={mode === "consumer" ? "Private AI on your device" : "Provider-Agnostic Hologram Virtual GPU Substrate"}
        icon={<IconCpu size={18} />}
        badge="vGPU"
        backTo="/hologram-console"
        headerRight={<ModeToggle mode={mode} onChange={setMode} />}
      >
        {mode === "consumer" ? (
          <ConsumerView snap={localSnap} />
        ) : (
          <DeveloperView snapshots={snapshots} localSnap={localSnap} />
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-6 mt-8 border-t border-border">
          Hologram Compute — Local vGPU today. Cloud + Peer compute tomorrow.
        </div>
      </PageShell>
    </div>
  );
}
