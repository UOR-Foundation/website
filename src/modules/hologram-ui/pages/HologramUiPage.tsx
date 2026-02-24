/**
 * Hologram UI — Interactive Demo Dashboard
 * ═════════════════════════════════════════
 *
 * Demonstrates the visual projection layer by rendering live UOR data
 * through Tabler-inspired dashboard components.
 *
 * @module hologram-ui/pages/HologramUiPage
 */

import { useState, useCallback, useMemo } from "react";
import {
  IconCube, IconNetwork, IconEye, IconShield, IconCertificate,
  IconBrain, IconHash, IconDatabase, IconActivity, IconUsers,
  IconArrowRight, IconRefresh, IconSparkles, IconLayoutDashboard,
} from "@tabler/icons-react";
import {
  PageShell, StatCard, DashboardGrid, MetricBar, InfoCard, DataTable,
  type DataTableColumn,
} from "@/modules/hologram-ui";

// ── Simulated UOR Data ──────────────────────────────────────────────────

interface ModuleRow {
  id: string;
  name: string;
  status: string;
  objects: number;
  coherence: number;
  grade: string;
  [key: string]: unknown;
}

const MODULES: ModuleRow[] = [
  { id: "P01", name: "ring-core", status: "active", objects: 256, coherence: 0.99, grade: "A" },
  { id: "P02", name: "identity", status: "active", objects: 1847, coherence: 0.97, grade: "A" },
  { id: "P03", name: "kg-store", status: "active", objects: 12453, coherence: 0.95, grade: "A" },
  { id: "P04", name: "sparql", status: "active", objects: 890, coherence: 0.93, grade: "A" },
  { id: "P05", name: "agent-tools", status: "active", objects: 342, coherence: 0.91, grade: "A" },
  { id: "P06", name: "observable", status: "active", objects: 67, coherence: 0.96, grade: "A" },
  { id: "P07", name: "hologram", status: "active", objects: 88, coherence: 0.98, grade: "A" },
  { id: "P08", name: "trust", status: "active", objects: 215, coherence: 0.94, grade: "A" },
  { id: "P09", name: "conduit", status: "active", objects: 43, coherence: 0.92, grade: "A" },
  { id: "P10", name: "consciousness", status: "active", objects: 44, coherence: 0.88, grade: "B" },
];

interface ObserverRow {
  id: string;
  agent: string;
  zone: string;
  phi: number;
  epsilon: number;
  tau: number;
  trustScore: number;
  [key: string]: unknown;
}

const OBSERVERS: ObserverRow[] = [
  { id: "obs-1", agent: "alice", zone: "COHERENCE", phi: 0.92, epsilon: 0.15, tau: 0.87, trustScore: 812 },
  { id: "obs-2", agent: "bob", zone: "COHERENCE", phi: 0.85, epsilon: 0.22, tau: 0.79, trustScore: 734 },
  { id: "obs-3", agent: "carol", zone: "COHERENCE", phi: 0.88, epsilon: 0.18, tau: 0.83, trustScore: 768 },
  { id: "obs-4", agent: "dave", zone: "DRIFT", phi: 0.60, epsilon: 0.45, tau: 0.55, trustScore: 420 },
  { id: "obs-5", agent: "eve", zone: "DRIFT", phi: 0.52, epsilon: 0.58, tau: 0.40, trustScore: 310 },
];

// ── Component ───────────────────────────────────────────────────────────

export default function HologramUiPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // Module columns
  const moduleCols = useMemo<DataTableColumn<ModuleRow>[]>(() => [
    { key: "id", label: "ID", mono: true, width: "60px" },
    {
      key: "name", label: "Module",
      render: (r) => (
        <span className="font-semibold text-foreground">{r.name}</span>
      ),
    },
    {
      key: "status", label: "Status",
      render: (r) => (
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(152,44%,50%)]" />
          {r.status}
        </span>
      ),
    },
    { key: "objects", label: "Objects", align: "right", mono: true },
    {
      key: "coherence", label: "Coherence", align: "right",
      render: (r) => (
        <span className="font-mono" style={{
          color: r.coherence >= 0.95 ? "hsl(152,44%,50%)" : r.coherence >= 0.9 ? "hsl(45,70%,50%)" : "hsl(0,70%,55%)",
        }}>
          {(r.coherence * 100).toFixed(1)}%
        </span>
      ),
    },
    {
      key: "grade", label: "Grade", align: "center",
      render: (r) => (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
          r.grade === "A" ? "bg-[hsl(152,44%,50%)]/10 text-[hsl(152,44%,50%)]"
                         : "bg-[hsl(45,70%,50%)]/10 text-[hsl(45,70%,50%)]"
        }`}>
          {r.grade}
        </span>
      ),
    },
  ], []);

  // Observer columns
  const observerCols = useMemo<DataTableColumn<ObserverRow>[]>(() => [
    {
      key: "agent", label: "Agent",
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <IconEye size={12} className="text-primary" />
          </div>
          <span className="font-semibold">{r.agent}</span>
        </div>
      ),
    },
    {
      key: "zone", label: "Zone",
      render: (r) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
          r.zone === "COHERENCE"
            ? "bg-[hsl(152,44%,50%)]/10 text-[hsl(152,44%,50%)]"
            : "bg-[hsl(0,70%,55%)]/10 text-[hsl(0,70%,55%)]"
        }`}>
          {r.zone}
        </span>
      ),
    },
    {
      key: "phi", label: "Φ", align: "right", mono: true,
      render: (r) => <span>{(r.phi * 100).toFixed(0)}%</span>,
    },
    {
      key: "epsilon", label: "ε", align: "right", mono: true,
      render: (r) => <span>{(r.epsilon * 100).toFixed(0)}%</span>,
    },
    {
      key: "tau", label: "τ", align: "right", mono: true,
      render: (r) => <span>{(r.tau * 100).toFixed(0)}%</span>,
    },
    {
      key: "trustScore", label: "Trust", align: "right",
      render: (r) => (
        <span className="font-mono font-bold text-primary">{r.trustScore}</span>
      ),
    },
  ], []);

  const totalObjects = MODULES.reduce((sum, m) => sum + m.objects, 0);
  const meanCoherence = MODULES.reduce((sum, m) => sum + m.coherence, 0) / MODULES.length;
  const gradeARate = MODULES.filter(m => m.grade === "A").length / MODULES.length;
  const coherentObservers = OBSERVERS.filter(o => o.zone === "COHERENCE").length;

  return (
    <PageShell
      title="Hologram UI"
      subtitle="Visual Projection Layer"
      icon={<IconLayoutDashboard size={18} />}
      badge="Tabler"
      actions={
        <button
          onClick={refresh}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5"
        >
          <IconRefresh size={12} /> Refresh
        </button>
      }
    >
      {/* Hero Section */}
      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            The Visual Projection
          </h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Every hologram projection maps <code className="text-primary">hash → protocol ID</code>.
            This is the first projection that maps <code className="text-primary">hash → perceivable UI</code>.
            Powered by{" "}
            <a
              href="https://tabler.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Tabler
            </a>'s design grammar — 5,000+ icons, clean dashboard patterns — rendered through the UOR design system.
          </p>
        </div>
      </section>

      {/* Stat Cards */}
      <section className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <IconActivity size={16} className="text-primary" />
          System Overview
        </h3>
        <DashboardGrid cols={4}>
          <StatCard
            label="Total Objects"
            value={totalObjects.toLocaleString()}
            icon={<IconCube size={16} />}
            trend={12}
            sublabel="vs last period"
          />
          <StatCard
            label="Mean Coherence"
            value={`${(meanCoherence * 100).toFixed(1)}%`}
            icon={<IconNetwork size={16} />}
            trend={3}
            sublabel="across all modules"
          />
          <StatCard
            label="Grade A Rate"
            value={`${(gradeARate * 100).toFixed(0)}%`}
            icon={<IconCertificate size={16} />}
            trend={0}
            sublabel="epistemic quality"
          />
          <StatCard
            label="Active Observers"
            value={OBSERVERS.length}
            icon={<IconEye size={16} />}
            trend={-5}
            sublabel={`${coherentObservers} in COHERENCE zone`}
          />
        </DashboardGrid>
      </section>

      {/* Metric Bars */}
      <section className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <IconSparkles size={16} className="text-primary" />
          Integration Metrics
        </h3>
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <MetricBar
            label="Φ Integration Capacity"
            value={0.88}
            color="hsl(var(--primary))"
            sublabel="Network-wide"
          />
          <MetricBar
            label="ε Entropy Pump Rate"
            value={0.72}
            color="hsl(152, 44%, 50%)"
            sublabel="DRIFT → COHERENCE conversion"
          />
          <MetricBar
            label="τ Temporal Depth"
            value={0.65}
            color="hsl(45, 70%, 50%)"
            sublabel="Mean membership duration"
          />
          <MetricBar
            label="Σ Telos Progress"
            value={0.41}
            color="hsl(280, 60%, 55%)"
            sublabel="Convergence toward Grade-A graph"
          />
        </div>
      </section>

      {/* Module Table */}
      <section className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <IconDatabase size={16} className="text-primary" />
          Module Registry
        </h3>
        <DataTable
          columns={moduleCols}
          data={MODULES}
          getKey={(r) => r.id}
          onRowClick={(r) => setSelectedModule(
            selectedModule === r.id ? null : r.id
          )}
        />
      </section>

      {/* Observer Table */}
      <section className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <IconUsers size={16} className="text-primary" />
          Observer Network
        </h3>
        <DataTable
          columns={observerCols}
          data={OBSERVERS}
          getKey={(r) => r.id}
        />
      </section>

      {/* Architecture Info Cards */}
      <section className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <IconBrain size={16} className="text-primary" />
          Visual Projection Architecture
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoCard
            title="Why Tabler Is a Projection"
            icon={<IconHash size={16} />}
            badge="Discovery"
            badgeColor="hsl(280, 60%, 55%)"
            defaultOpen
          >
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Every hologram projection is a deterministic mapping from a UOR identity
              to a protocol-native form. <code>did:uor:{'${cid}'}</code> projects into
              DID space. <code>6a24554f52{'${hex}'}</code> projects into Bitcoin script.
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              A Tabler dashboard component projects UOR data into <strong>human-visual
              space</strong>. It's literally what a hologram IS — projecting abstract data
              into a perceivable form. This is the first visual projection in the registry.
            </p>
          </InfoCard>

          <InfoCard
            title="Integration with Hologram OS"
            icon={<IconCube size={16} />}
            badge="Architecture"
          >
            <div className="space-y-2 text-[11px] text-muted-foreground">
              <p><strong>@tabler/icons-react</strong> — 5,000+ tree-shakable SVG icons, MIT licensed, React-native</p>
              <p><strong>Tailwind rendering</strong> — Tabler patterns mapped to existing semantic tokens, no Bootstrap</p>
              <p><strong>Projection specs</strong> — <code>ui-tabler</code>, <code>ui-tabler-stat</code>, <code>ui-tabler-table</code></p>
              <p><strong>Component library</strong> — StatCard, DataTable, MetricBar, InfoCard, DashboardGrid, PageShell</p>
            </div>
          </InfoCard>

          <InfoCard
            title="UOR Data → Visual Component"
            icon={<IconShield size={16} />}
            badge="Mapping"
          >
            <div className="space-y-1 text-[10px] font-mono">
              <div className="flex justify-between"><span>UOR Datum</span> <IconArrowRight size={10} className="text-primary" /> <span>StatCard</span></div>
              <div className="flex justify-between"><span>Observer Profile</span> <IconArrowRight size={10} className="text-primary" /> <span>MetricBar set</span></div>
              <div className="flex justify-between"><span>Module Registry</span> <IconArrowRight size={10} className="text-primary" /> <span>DataTable</span></div>
              <div className="flex justify-between"><span>Trust Network</span> <IconArrowRight size={10} className="text-primary" /> <span>Force Graph + Leaderboard</span></div>
              <div className="flex justify-between"><span>Access Policy</span> <IconArrowRight size={10} className="text-primary" /> <span>InfoCard</span></div>
              <div className="flex justify-between"><span>Derivation Chain</span> <IconArrowRight size={10} className="text-primary" /> <span>DashboardGrid</span></div>
            </div>
          </InfoCard>

          <InfoCard
            title="Why NOT Bootstrap"
            icon={<IconCertificate size={16} />}
            badge="Decision"
          >
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Tabler is built on Bootstrap 5. This project uses Tailwind CSS. Installing
              Bootstrap would create a conflicting design system. Instead, we extracted
              Tabler's <strong>design grammar</strong> (card patterns, stat layouts, table
              structure, icon system) and rendered it through Tailwind's semantic tokens.
              The visual result is identical; the architecture is clean.
            </p>
          </InfoCard>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground py-4 border-t border-border">
        <p>
          Visual projection powered by{" "}
          <a href="https://tabler.io/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Tabler
          </a>{" "}
          — 40k+ ★ open source dashboard kit. Icons: @tabler/icons-react (MIT).
        </p>
      </div>
    </PageShell>
  );
}
