/**
 * MetaObserver — Interactive Visualization
 * ═════════════════════════════════════════
 *
 * The Observer Meta-Layer as holographic dashboard.
 * Shows how the observer spans ALL modules, projecting
 * coherence assessment across the entire UOR stack.
 *
 * @module observable/pages/MetaObserverPage
 */

import { useState, useCallback, useMemo } from "react";
import {
  IconEye, IconBrain, IconShieldCheck, IconAlertTriangle,
  IconCircleDot, IconArrowRight, IconRefresh,
  IconFlame, IconTarget,
} from "@tabler/icons-react";
import {
  PageShell, StatCard, DashboardGrid, MetricBar, InfoCard, DataTable,
  type DataTableColumn,
} from "@/modules/hologram-ui";
import {
  MetaObserver, createMetaObserver, UOR_MODULES,
  type ModuleObserverProfile, type TelosVector,
} from "@/modules/observable/meta-observer";

// ── Zone colors (semantic tokens) ──────────────────────────────────────────

const ZONE_COLORS: Record<string, string> = {
  COHERENCE: "hsl(152, 44%, 50%)",
  DRIFT: "hsl(45, 70%, 50%)",
  COLLAPSE: "hsl(0, 65%, 55%)",
};

const DIRECTION_LABELS = {
  converging: { label: "Converging ↑", color: "hsl(152, 44%, 50%)" },
  stable: { label: "Stable →", color: "hsl(var(--muted-foreground))" },
  diverging: { label: "Diverging ↓", color: "hsl(0, 65%, 55%)" },
};

// ── Simulation ─────────────────────────────────────────────────────────────

type Scenario = "coherent" | "mixed" | "recovery" | "collapse";

function runSimulation(scenario: Scenario): {
  meta: MetaObserver;
  telos: TelosVector;
  profiles: ModuleObserverProfile[];
} {
  const meta = createMetaObserver();
  const now = new Date().toISOString();

  const modules = UOR_MODULES.map(m => m.id);

  switch (scenario) {
    case "coherent":
      // All modules produce isometric operations
      for (const id of modules) {
        for (let i = 0; i < 20; i++) {
          const v = Math.floor(Math.random() * 256);
          meta.observe({
            moduleId: id, operation: "transform",
            inputHash: v, outputHash: v ^ (Math.random() > 0.8 ? 1 : 0),
            timestamp: now, logosClass: "arbitrary",
          });
        }
      }
      break;

    case "mixed":
      // Some modules coherent, some drifting, one collapsing
      for (const id of modules) {
        const driftLevel =
          id === "consciousness" ? 0.9 :
          id === "trust" ? 0.6 :
          id === "code-kg" ? 0.4 : 0.1;
        for (let i = 0; i < 20; i++) {
          const v = Math.floor(Math.random() * 256);
          const noise = Math.random() < driftLevel ? Math.floor(Math.random() * 200) : (Math.random() > 0.7 ? 1 : 0);
          meta.observe({
            moduleId: id, operation: "transform",
            inputHash: v, outputHash: (v ^ noise) & 0xff,
            timestamp: now, logosClass: "arbitrary",
          });
        }
      }
      break;

    case "recovery":
      // Modules start in DRIFT then recover
      for (const id of modules) {
        // Phase 1: drift
        for (let i = 0; i < 10; i++) {
          meta.observe({
            moduleId: id, operation: "transform",
            inputHash: 0, outputHash: Math.floor(Math.random() * 128) + 64,
            timestamp: now, logosClass: "arbitrary",
          });
        }
        // Phase 2: recovery
        for (let i = 0; i < 15; i++) {
          const v = Math.floor(Math.random() * 256);
          meta.observe({
            moduleId: id, operation: "transform",
            inputHash: v, outputHash: v,
            timestamp: now, logosClass: "arbitrary",
          });
        }
      }
      break;

    case "collapse":
      // Progressive system-wide collapse
      for (const id of modules) {
        for (let i = 0; i < 20; i++) {
          meta.observe({
            moduleId: id, operation: "transform",
            inputHash: 0, outputHash: 0xff,
            timestamp: now, logosClass: "arbitrary",
          });
        }
      }
      break;
  }

  return {
    meta,
    telos: meta.telosVector(),
    profiles: meta.getAllProfiles(),
  };
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function MetaObserverPage() {
  const [scenario, setScenario] = useState<Scenario>("coherent");
  const [result, setResult] = useState<ReturnType<typeof runSimulation> | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const run = useCallback((s: Scenario) => {
    setScenario(s);
    setSelectedModule(null);
    setResult(runSimulation(s));
  }, []);

  const selectedProfile = useMemo(
    () => result?.profiles.find(p => p.moduleId === selectedModule) ?? null,
    [result, selectedModule],
  );

  const tableCols = useMemo<DataTableColumn<ModuleObserverProfile & Record<string, unknown>>[]>(() => [
    {
      key: "moduleName" as keyof ModuleObserverProfile, label: "Module",
      render: (r) => {
        const mod = UOR_MODULES.find(m => m.id === r.moduleId);
        return (
          <button
            onClick={() => setSelectedModule(r.moduleId === selectedModule ? null : r.moduleId)}
            className="flex items-center gap-2 hover:text-primary transition-colors text-left"
          >
            <span>{mod?.icon ?? "⚙️"}</span>
            <span className="font-semibold">{r.moduleName}</span>
          </button>
        );
      },
    },
    {
      key: "zone" as keyof ModuleObserverProfile, label: "Zone",
      render: (r) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{
          background: `${ZONE_COLORS[r.zone]}22`,
          color: ZONE_COLORS[r.zone],
        }}>
          {r.zone}
        </span>
      ),
    },
    {
      key: "hScore" as keyof ModuleObserverProfile, label: "H-Score", align: "right", mono: true,
      render: (r) => <span>{r.hScore.toFixed(2)}</span>,
    },
    {
      key: "phi" as keyof ModuleObserverProfile, label: "Φ", align: "right", mono: true,
      render: (r) => <span>{(r.phi * 100).toFixed(0)}%</span>,
    },
    {
      key: "logosCompliance" as keyof ModuleObserverProfile, label: "Logos", align: "right", mono: true,
      render: (r) => <span>{(r.logosCompliance * 100).toFixed(0)}%</span>,
    },
    {
      key: "entropyPumpRate" as keyof ModuleObserverProfile, label: "ε", align: "right", mono: true,
      render: (r) => (
        <span style={{ color: r.entropyPumpRate > 0 ? ZONE_COLORS.COHERENCE : r.entropyPumpRate < -0.1 ? ZONE_COLORS.COLLAPSE : undefined }}>
          {r.entropyPumpRate > 0 ? "+" : ""}{r.entropyPumpRate.toFixed(3)}
        </span>
      ),
    },
    {
      key: "tzimtzumDepth" as keyof ModuleObserverProfile, label: "τ", align: "right", mono: true,
    },
  ], [selectedModule]);

  return (
    <PageShell
      title="MetaObserver"
      subtitle="God Conjecture × Holographic Coherence"
      icon={<IconEye size={18} />}
      badge="Meta-Layer"
      actions={
        <div className="flex gap-2">
          {(["coherent", "mixed", "recovery", "collapse"] as Scenario[]).map(s => (
            <button
              key={s}
              onClick={() => run(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                scenario === s && result
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      }
    >
      {/* Hero */}
      <section className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          The Observer Spans Everything
        </h2>
        <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
          The Hologram projects <strong>identity</strong> into protocol spaces. The MetaObserver projects{" "}
          <strong>coherence</strong> across the entire UOR stack. Together they form a dual system:{" "}
          <em>what something IS</em> (hologram) and <em>how aligned it IS</em> (observer).
          Select a scenario to simulate network-wide coherence dynamics.
        </p>
      </section>

      {result ? (
        <>
          {/* Telos Vector */}
          <DashboardGrid cols={4}>
            <StatCard
              label="Telos Progress"
              value={`${(result.telos.progress * 100).toFixed(1)}%`}
              icon={<IconTarget size={16} />}
              sublabel={DIRECTION_LABELS[result.telos.direction].label}
              trend={result.telos.direction === "converging" ? 1 : result.telos.direction === "diverging" ? -1 : undefined}
            />
            <StatCard
              label="Mean Φ"
              value={`${(result.telos.meanPhi * 100).toFixed(1)}%`}
              icon={<IconBrain size={16} />}
              sublabel="Integration Capacity"
            />
            <StatCard
              label="Logos Compliance"
              value={`${(result.telos.logosRatio * 100).toFixed(1)}%`}
              icon={<IconShieldCheck size={16} />}
              sublabel="Isometric operations"
            />
            <StatCard
              label="Entropy Pump ε"
              value={result.telos.meanEpsilon > 0 ? `+${result.telos.meanEpsilon.toFixed(3)}` : result.telos.meanEpsilon.toFixed(3)}
              icon={<IconFlame size={16} />}
              sublabel={result.telos.meanEpsilon > 0 ? "Creating order" : result.telos.meanEpsilon < -0.05 ? "Generating entropy" : "Neutral"}
              trend={result.telos.meanEpsilon > 0 ? 1 : result.telos.meanEpsilon < -0.05 ? -1 : undefined}
            />
          </DashboardGrid>

          {/* Zone Distribution */}
          <section className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <IconCircleDot size={16} className="text-primary" />
              Coherence Zone Distribution
            </h3>
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <MetricBar
                label="COHERENCE"
                value={result.telos.zones.coherence / result.telos.totalModules}
                color={ZONE_COLORS.COHERENCE}
                sublabel={`${result.telos.zones.coherence} modules`}
              />
              <MetricBar
                label="DRIFT"
                value={result.telos.zones.drift / result.telos.totalModules}
                color={ZONE_COLORS.DRIFT}
                sublabel={`${result.telos.zones.drift} modules`}
              />
              <MetricBar
                label="COLLAPSE"
                value={result.telos.zones.collapse / result.telos.totalModules}
                color={ZONE_COLORS.COLLAPSE}
                sublabel={`${result.telos.zones.collapse} modules`}
              />
            </div>
          </section>

          {/* Module Table + Detail */}
          <section className="space-y-3">
            <h3 className="font-semibold text-sm">Module Observatory</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <DataTable
                  columns={tableCols}
                  data={result.profiles as any}
                  getKey={(r: any) => r.moduleId}
                />
              </div>
              <div>
                {selectedProfile ? (
                  <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{UOR_MODULES.find(m => m.id === selectedProfile.moduleId)?.icon}</span>
                      <div>
                        <div className="font-semibold text-sm">{selectedProfile.moduleName}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {UOR_MODULES.find(m => m.id === selectedProfile.moduleId)?.description}
                        </div>
                      </div>
                    </div>

                    {/* God Conjecture Metrics */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        God Conjecture Metrics
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-secondary/50 rounded-lg p-2">
                          <div className="text-muted-foreground">Φ Integration</div>
                          <div className="font-bold font-mono">{(selectedProfile.phi * 100).toFixed(1)}%</div>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-2">
                          <div className="text-muted-foreground">ε Entropy Pump</div>
                          <div className="font-bold font-mono" style={{
                            color: selectedProfile.entropyPumpRate > 0 ? ZONE_COLORS.COHERENCE : selectedProfile.entropyPumpRate < -0.1 ? ZONE_COLORS.COLLAPSE : undefined,
                          }}>
                            {selectedProfile.entropyPumpRate > 0 ? "+" : ""}{selectedProfile.entropyPumpRate.toFixed(3)}
                          </div>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-2">
                          <div className="text-muted-foreground">τ Tzimtzum</div>
                          <div className="font-bold font-mono">{selectedProfile.tzimtzumDepth}</div>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-2">
                          <div className="text-muted-foreground">Σ Sin (Debt)</div>
                          <div className="font-bold font-mono">{selectedProfile.cumulativeDebt.toFixed(1)}</div>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-2">
                          <div className="text-muted-foreground">Logos %</div>
                          <div className="font-bold font-mono">{(selectedProfile.logosCompliance * 100).toFixed(0)}%</div>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-2">
                          <div className="text-muted-foreground">Telos</div>
                          <div className="font-bold font-mono">{(selectedProfile.telosProgress * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Active Remediation */}
                    {selectedProfile.activeRemediation && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <IconAlertTriangle size={10} />
                          Active Remediation
                        </div>
                        <div className={`rounded-lg p-2 text-[10px] border ${
                          selectedProfile.activeRemediation.urgency === "critical"
                            ? "border-destructive/40 bg-destructive/10"
                            : "border-border bg-secondary/30"
                        }`}>
                          <div className="font-bold">{selectedProfile.activeRemediation.protocol}</div>
                          <div className="text-muted-foreground mt-1">{selectedProfile.activeRemediation.prescribedAction}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-xl p-4 text-center text-xs text-muted-foreground">
                    <IconEye size={32} className="mx-auto mb-2 opacity-30" />
                    <p>Click a module to inspect its God Conjecture metrics</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <IconEye size={48} className="mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">
            Select a scenario above to simulate the MetaObserver spanning all UOR modules
          </p>
        </div>
      )}

      {/* Architecture Documentation */}
      <section className="space-y-3">
        <h3 className="font-semibold text-sm">Architectural Duality</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoCard
            title="Hologram × Observer Duality"
            icon={<IconEye size={16} />}
            badge="Core"
            badgeColor="hsl(var(--primary))"
            defaultOpen
          >
            <div className="text-[11px] text-muted-foreground leading-relaxed space-y-2">
              <p>
                The <strong>Hologram</strong> projects <em>identity</em> — what something IS across protocol spaces
                (DID, CID, ActivityPub, Bitcoin, etc).
              </p>
              <p>
                The <strong>Observer</strong> projects <em>coherence</em> — how aligned something IS with the
                Grade-A knowledge graph.
              </p>
              <p>
                Together they form a dual system. The Hologram is the <em>noun</em> (identity).
                The Observer is the <em>adjective</em> (quality). Every module has both.
              </p>
            </div>
          </InfoCard>

          <InfoCard
            title="God Conjecture Semantics"
            icon={<IconBrain size={16} />}
            badge="Teleology"
            badgeColor="hsl(280, 50%, 55%)"
            defaultOpen
          >
            <div className="text-[10px] font-mono space-y-1">
              <div className="flex justify-between"><span>Ruliad</span><span>= All modules (computation space)</span></div>
              <div className="flex justify-between"><span>Tzimtzum (τ)</span><span>= Module restriction depth</span></div>
              <div className="flex justify-between"><span>Logos</span><span>= Isometric compliance %</span></div>
              <div className="flex justify-between"><span>Soul</span><span>= ModuleObserverProfile</span></div>
              <div className="flex justify-between"><span>Sin (Σ)</span><span>= Cumulative H-score debt</span></div>
              <div className="flex justify-between"><span>Virtue (Φ)</span><span>= Integration capacity</span></div>
              <div className="flex justify-between"><span>Entropy Pump (ε)</span><span>= Active remediation rate</span></div>
              <div className="flex justify-between"><span>Telos</span><span>= Network convergence vector</span></div>
              <div className="flex justify-between"><span>Free Will</span><span>= Irreducible computation</span></div>
            </div>
          </InfoCard>

          <InfoCard
            title="Active Entropy Pump"
            icon={<IconFlame size={16} />}
            badge="Absorber"
            badgeColor="hsl(35, 80%, 55%)"
          >
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              The MetaObserver doesn't just measure entropy — it actively <strong>prescribes remediation</strong>.
              When ε {">"} 0, the module is creating order (alive). When ε ≤ 0, the entropy pump issues
              OIP/EDP/CAP protocols to restore coherence. This IS the "absorber function" from
              the God Conjecture: life actively creating local pockets of order.
            </p>
          </InfoCard>

          <InfoCard
            title="Telos Vector"
            icon={<IconTarget size={16} />}
            badge="Direction"
            badgeColor="hsl(152, 44%, 50%)"
          >
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <code>telos = coherenceRatio × meanΦ × logosRatio</code>
              <br /><br />
              A single scalar measuring the system's progress toward maximum information integration.
              When all three factors align (high coherence, high integration, high Logos compliance),
              the network approaches its computational purpose.
            </p>
          </InfoCard>
        </div>
      </section>

      <div className="text-center text-xs text-muted-foreground py-4 border-t border-border">
        MetaObserver — God Conjecture × UOR Observer Theory.
        The observer IS the meta-layer. 16 tests passing.
      </div>
    </PageShell>
  );
}
