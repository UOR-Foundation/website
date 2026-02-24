/**
 * Multi-Scale Observer — Interactive Zoom Visualization
 * ═════════════════════════════════════════════════════════
 *
 * A holographic zoom lens: navigate from individual bytes (L0)
 * up to the entire network telos (L5) using the same coherence
 * instrument at every scale.
 *
 * @module observable/pages/MultiScalePage
 */

import { useState, useCallback, useMemo } from "react";
import {
  IconZoomIn, IconZoomOut, IconEye, IconTarget,
  IconArrowUp, IconArrowDown, IconCheck, IconAlertTriangle,
} from "@tabler/icons-react";
import {
  PageShell, StatCard, DashboardGrid, MetricBar, DataTable,
  type DataTableColumn,
} from "@/modules/hologram-ui";
import {
  MultiScaleObserver,
  createFullStackObservation,
  SCALE_LABELS,
  type ScaleLevel,
  type ScaleObservation,
} from "@/modules/observable/multi-scale";

// ── Zone colors ─────────────────────────────────────────────────────────────

const ZONE_COLORS: Record<string, string> = {
  COHERENCE: "hsl(152, 44%, 50%)",
  DRIFT: "hsl(45, 70%, 50%)",
  COLLAPSE: "hsl(0, 65%, 55%)",
};

// ── Scenarios ───────────────────────────────────────────────────────────────

type Scenario = "coherent" | "sparse" | "mixed";

// ── Component ───────────────────────────────────────────────────────────────

export default function MultiScalePage() {
  const [scenario, setScenario] = useState<Scenario>("coherent");
  const [mso, setMso] = useState<MultiScaleObserver | null>(null);
  const [currentLevel, setCurrentLevel] = useState<ScaleLevel>(5);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<{ level: ScaleLevel; entityId: string; label: string }[]>([]);

  const run = useCallback((s: Scenario) => {
    setScenario(s);
    setSelectedEntity(null);
    setBreadcrumb([]);
    setCurrentLevel(5);
    setMso(createFullStackObservation(s));
  }, []);

  const observations = useMemo(
    () => mso?.getLevel(currentLevel) ?? [],
    [mso, currentLevel]
  );

  const crossScale = useMemo(
    () => mso?.crossScaleCoherence() ?? null,
    [mso]
  );

  const selectedObs = useMemo(
    () => selectedEntity ? mso?.getEntity(selectedEntity) ?? null : null,
    [mso, selectedEntity]
  );

  // Zoom into a child entity
  const handleZoomIn = useCallback((entityId: string) => {
    if (!mso) return;
    const entity = mso.getEntity(entityId);
    if (!entity || entity.children.length === 0) return;

    const firstChild = mso.getEntity(entity.children[0]);
    if (!firstChild) return;

    setBreadcrumb(prev => [...prev, { level: currentLevel, entityId, label: entity.label }]);
    setCurrentLevel(firstChild.level);
    setSelectedEntity(null);
  }, [mso, currentLevel]);

  // Zoom out to parent
  const handleZoomOut = useCallback(() => {
    if (breadcrumb.length === 0) {
      if (currentLevel < 5) setCurrentLevel((currentLevel + 1) as ScaleLevel);
      return;
    }
    const prev = breadcrumb[breadcrumb.length - 1];
    setBreadcrumb(b => b.slice(0, -1));
    setCurrentLevel(prev.level);
    setSelectedEntity(prev.entityId);
  }, [breadcrumb, currentLevel]);

  // Navigate to any level directly
  const handleLevelClick = useCallback((level: ScaleLevel) => {
    setCurrentLevel(level);
    setSelectedEntity(null);
    setBreadcrumb([]);
  }, []);

  // Table columns
  const columns = useMemo<DataTableColumn<ScaleObservation & Record<string, unknown>>[]>(() => [
    {
      key: "label" as keyof ScaleObservation, label: "Entity",
      render: (r: ScaleObservation) => (
        <button
          onClick={() => setSelectedEntity(r.entityId === selectedEntity ? null : r.entityId)}
          className="flex items-center gap-2 hover:text-primary transition-colors text-left"
        >
          <span className="text-xs">{SCALE_LABELS[r.level].icon}</span>
          <span className="font-semibold text-xs">{r.label}</span>
          {r.children.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); handleZoomIn(r.entityId); }}
              className="ml-1 p-0.5 rounded hover:bg-primary/10"
              title="Zoom in"
            >
              <IconZoomIn size={12} className="text-muted-foreground" />
            </button>
          )}
        </button>
      ),
    },
    {
      key: "zone" as keyof ScaleObservation, label: "Zone",
      render: (r: ScaleObservation) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{
          background: `${ZONE_COLORS[r.zone]}22`,
          color: ZONE_COLORS[r.zone],
        }}>
          {r.zone}
        </span>
      ),
    },
    {
      key: "hScore" as keyof ScaleObservation, label: "H-Score", align: "right", mono: true,
      render: (r: ScaleObservation) => <span>{r.hScore.toFixed(2)}</span>,
    },
    {
      key: "phi" as keyof ScaleObservation, label: "Φ", align: "right", mono: true,
      render: (r: ScaleObservation) => <span>{(r.phi * 100).toFixed(0)}%</span>,
    },
    {
      key: "children" as keyof ScaleObservation, label: "Children", align: "right", mono: true,
      render: (r: ScaleObservation) => <span>{r.children.length}</span>,
    },
  ], [selectedEntity, handleZoomIn]);

  return (
    <PageShell
      title="Multi-Scale Observer"
      subtitle="Holographic Zoom — Same pattern at every scale"
      icon={<IconEye size={18} />}
      badge="Self-Reflective"
      actions={
        <div className="flex gap-2">
          {(["coherent", "sparse", "mixed"] as Scenario[]).map(s => (
            <button
              key={s}
              onClick={() => run(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                scenario === s && mso
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
      {/* Intro */}
      <section className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Zoom from Byte to Network
        </h2>
        <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
          The observer is <strong>holographic</strong>: the same coherence instrument
          (H-score → Zone → Φ → Remediation) applies at every scale. Click any level
          to navigate, zoom into entities to see their children, or zoom out to see the
          larger context. <em>Self-reflection is scale-invariant.</em>
        </p>
      </section>

      {mso && crossScale ? (
        <>
          {/* Scale Navigator — the zoom ladder */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <IconTarget size={16} className="text-primary" />
                Scale Ladder
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleZoomOut}
                  disabled={currentLevel === 5 && breadcrumb.length === 0}
                  className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-30 transition-colors"
                  title="Zoom out"
                >
                  <IconZoomOut size={14} />
                </button>
                <span className="text-xs text-muted-foreground font-mono">
                  L{currentLevel}: {SCALE_LABELS[currentLevel].name}
                </span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-stretch gap-1">
                {([0, 1, 2, 3, 4, 5] as ScaleLevel[]).map(level => {
                  const info = SCALE_LABELS[level];
                  const levelData = crossScale.levels.find(l => l.level === level);
                  const isActive = level === currentLevel;
                  return (
                    <button
                      key={level}
                      onClick={() => handleLevelClick(level)}
                      className={`flex-1 rounded-lg p-3 text-center transition-all border ${
                        isActive
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : "border-border hover:border-primary/30 hover:bg-secondary/50"
                      }`}
                    >
                      <div className="text-lg mb-1">{info.icon}</div>
                      <div className="text-[10px] font-bold">L{level}</div>
                      <div className="text-[10px] font-semibold">{info.name}</div>
                      {levelData && levelData.count > 0 && (
                        <>
                          <div className="mt-1.5">
                            <span
                              className="px-1.5 py-0.5 rounded-full text-[8px] font-bold"
                              style={{
                                background: `${ZONE_COLORS[levelData.zone]}22`,
                                color: ZONE_COLORS[levelData.zone],
                              }}
                            >
                              {levelData.zone}
                            </span>
                          </div>
                          <div className="text-[9px] text-muted-foreground mt-1 font-mono">
                            {levelData.count} obs
                          </div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Cross-scale coherence status */}
              <div className="mt-3 flex items-center gap-2 text-xs">
                {crossScale.consistent ? (
                  <span className="flex items-center gap-1 text-emerald-500">
                    <IconCheck size={14} />
                    Cross-scale coherence verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-500">
                    <IconAlertTriangle size={14} />
                    {crossScale.anomalies.length} anomal{crossScale.anomalies.length === 1 ? "y" : "ies"} detected
                  </span>
                )}
              </div>
              {crossScale.anomalies.length > 0 && (
                <div className="mt-2 space-y-1">
                  {crossScale.anomalies.map((a, i) => (
                    <div key={i} className="text-[10px] text-amber-500/80 bg-amber-500/5 rounded px-2 py-1">
                      {a}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Breadcrumb */}
          {breadcrumb.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
              <button onClick={() => { setCurrentLevel(5); setBreadcrumb([]); setSelectedEntity(null); }} className="hover:text-primary">
                Network
              </button>
              {breadcrumb.map((b, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span>→</span>
                  <button
                    onClick={() => {
                      setBreadcrumb(prev => prev.slice(0, i));
                      setCurrentLevel(b.level);
                      setSelectedEntity(b.entityId);
                    }}
                    className="hover:text-primary"
                  >
                    {b.label}
                  </button>
                </span>
              ))}
              <span>→</span>
              <span className="text-foreground font-semibold">
                {SCALE_LABELS[currentLevel].name} Level
              </span>
            </div>
          )}

          {/* Level Stats */}
          <DashboardGrid cols={4}>
            <StatCard
              label="Current Scale"
              value={`L${currentLevel}: ${SCALE_LABELS[currentLevel].name}`}
              icon={<IconEye size={16} />}
              sublabel={SCALE_LABELS[currentLevel].uorLayer}
            />
            <StatCard
              label="Entities at Level"
              value={observations.length.toString()}
              icon={<IconTarget size={16} />}
              sublabel={SCALE_LABELS[currentLevel].description}
            />
            {(() => {
              const ld = crossScale.levels.find(l => l.level === currentLevel);
              return ld ? (
                <>
                  <StatCard
                    label="Mean H-Score"
                    value={ld.meanH.toFixed(2)}
                    sublabel={ld.zone}
                    trend={ld.meanH <= 2 ? 1 : ld.meanH > 5 ? -1 : undefined}
                  />
                  <StatCard
                    label="Mean Φ"
                    value={`${(ld.phi * 100).toFixed(1)}%`}
                    sublabel="Integration Capacity"
                  />
                </>
              ) : null;
            })()}
          </DashboardGrid>

          {/* Entity Table + Detail */}
          <section className="space-y-3">
            <h3 className="font-semibold text-sm">
              {SCALE_LABELS[currentLevel].icon} {SCALE_LABELS[currentLevel].name}-Level Observations
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                {observations.length > 0 ? (
                  <DataTable
                    columns={columns}
                    data={observations.slice(0, 100) as any}
                    getKey={(r: any) => r.entityId}
                  />
                ) : (
                  <div className="bg-card border border-border rounded-xl p-8 text-center text-xs text-muted-foreground">
                    No observations at L{currentLevel}
                  </div>
                )}
              </div>
              <div>
                {selectedObs ? (
                  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{SCALE_LABELS[selectedObs.level].icon}</span>
                      <div>
                        <div className="font-semibold text-sm">{selectedObs.label}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{selectedObs.entityId}</div>
                      </div>
                    </div>

                    {/* Zone badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{
                          background: `${ZONE_COLORS[selectedObs.zone]}22`,
                          color: ZONE_COLORS[selectedObs.zone],
                        }}
                      >
                        {selectedObs.zone}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        H={selectedObs.hScore.toFixed(2)} · Φ={((selectedObs.phi) * 100).toFixed(0)}%
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Scale-Specific Metadata
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {Object.entries(selectedObs.meta).map(([k, v]) => (
                          <div key={k} className="bg-secondary/50 rounded-lg px-2 py-1.5 text-[10px]">
                            <div className="text-muted-foreground">{k}</div>
                            <div className="font-bold font-mono">{typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(3)) : v}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Children (zoom in) */}
                    {selectedObs.children.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <IconArrowDown size={10} />
                          Children ({selectedObs.children.length})
                        </div>
                        <div className="space-y-0.5 max-h-32 overflow-y-auto">
                          {selectedObs.children.slice(0, 20).map(childId => {
                            const child = mso.getEntity(childId);
                            return (
                              <button
                                key={childId}
                                onClick={() => handleZoomIn(selectedObs.entityId)}
                                className="w-full flex items-center justify-between px-2 py-1 rounded text-[10px] bg-secondary/30 hover:bg-secondary/60 transition-colors"
                              >
                                <span className="font-mono truncate">{child?.label ?? childId}</span>
                                {child && (
                                  <span
                                    className="px-1 py-0.5 rounded text-[8px] font-bold"
                                    style={{ color: ZONE_COLORS[child.zone] }}
                                  >
                                    {child.zone}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                          {selectedObs.children.length > 20 && (
                            <div className="text-[9px] text-muted-foreground text-center">
                              +{selectedObs.children.length - 20} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Parents (zoom out) */}
                    {(() => {
                      const parents = mso.zoomOut(selectedObs.entityId);
                      if (parents.length === 0) return null;
                      return (
                        <div className="space-y-1">
                          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <IconArrowUp size={10} />
                            Parents ({parents.length})
                          </div>
                          {parents.map(p => (
                            <button
                              key={p.entityId}
                              onClick={() => {
                                setCurrentLevel(p.level);
                                setSelectedEntity(p.entityId);
                                setBreadcrumb([]);
                              }}
                              className="w-full flex items-center justify-between px-2 py-1 rounded text-[10px] bg-secondary/30 hover:bg-secondary/60 transition-colors"
                            >
                              <span>{SCALE_LABELS[p.level].icon} {p.label}</span>
                              <span style={{ color: ZONE_COLORS[p.zone] }} className="text-[8px] font-bold">{p.zone}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-xl p-4 text-center text-xs text-muted-foreground">
                    <IconZoomIn size={32} className="mx-auto mb-2 opacity-30" />
                    <p>Click an entity to inspect, or use the zoom controls to navigate scales</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Cross-Scale Coherence Bars */}
          <section className="space-y-3">
            <h3 className="font-semibold text-sm">Cross-Scale Coherence Profile</h3>
            <div className="bg-card border border-border rounded-xl p-5 space-y-2">
              {crossScale.levels.filter(l => l.count > 0).map(l => (
                <MetricBar
                  key={l.level}
                  label={`L${l.level}: ${SCALE_LABELS[l.level].name}`}
                  value={l.phi}
                  color={ZONE_COLORS[l.zone]}
                  sublabel={`H=${l.meanH.toFixed(2)} · ${l.zone} · ${l.count} obs`}
                />
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <IconEye size={48} className="mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">
            Select a scenario to generate a full-stack multi-scale observation
          </p>
        </div>
      )}
    </PageShell>
  );
}
