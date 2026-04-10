import { useMemo, useState, useCallback, useEffect, lazy, Suspense } from "react";
import { Download, LayoutGrid, Share2, ShieldCheck, BookOpen } from "lucide-react";
import { runAudit, type AuditFinding, type AuditReport } from "../audit";
import { ALL_ATOMS, ATOM_INDEX, type AtomCategory, type UorAtom, FIRMWARE_VERSION } from "../atoms";
import { PROVENANCE_REGISTRY, SYSTEM_LAYERS, type SystemLayer } from "../provenance-map";
import { exportMarkdown } from "../export";
import AtomSidebar from "../components/AtomSidebar";
import NodeDetailPanel, { type SelectedNode } from "../components/NodeDetailPanel";
import ProvenanceGraph from "../components/ProvenanceGraph";
import ZoomControls, { type ZoomLevel, ZOOM_LABELS } from "../components/ZoomControls";
import { SystemTable, ModuleTable, PipelineTable, PrimitiveGrid } from "../components/LevelTables";
import StatBlock from "@/modules/platform/core/components/StatBlock";
import Breadcrumbs from "@/modules/platform/core/components/Breadcrumbs";

const HealthGatesPanel = lazy(() => import("../components/HealthGatesPanel"));
const OntologyPanel = lazy(() => import("../components/OntologyPanel"));

// ── Zoom Context ────────────────────────────────────────────────

interface ZoomContext {
  layerId?: string;
  module?: string;
  finding?: AuditFinding;
}

// ── Main Page ───────────────────────────────────────────────────

export default function ComplianceDashboardPage() {
  const report = useMemo<AuditReport>(() => runAudit(), []);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(3);
  const [zoomContext, setZoomContext] = useState<ZoomContext>({});
  const [view, setView] = useState<"table" | "graph" | "gates" | "ontology">("table");
  const [search, setSearch] = useState("");
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AtomCategory | null>(null);

  // Keyboard zoom
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "=" || e.key === "+") { setZoomLevel((l) => Math.max(0, l - 1) as ZoomLevel); }
      if (e.key === "-") { setZoomLevel((l) => Math.min(3, l + 1) as ZoomLevel); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Get current layer for context
  const currentLayer = useMemo(() => {
    if (!zoomContext.layerId) return undefined;
    return SYSTEM_LAYERS.find((l) => l.id === zoomContext.layerId);
  }, [zoomContext.layerId]);

  // Get current module filter list
  const currentModuleFilter = useMemo(() => {
    if (currentLayer) return currentLayer.modules;
    return undefined;
  }, [currentLayer]);

  // Get atoms in scope for a finding
  const scopedAtoms = useMemo(() => {
    if (zoomContext.finding) return zoomContext.finding.validAtoms;
    if (zoomContext.module) {
      const mod = PROVENANCE_REGISTRY.find((m) => m.module === zoomContext.module);
      return mod ? [...new Set(mod.exports.flatMap((e) => e.atoms))] : undefined;
    }
    if (currentModuleFilter) {
      const mods = PROVENANCE_REGISTRY.filter((m) => currentModuleFilter.includes(m.module));
      return [...new Set(mods.flatMap((m) => m.exports.flatMap((e) => e.atoms)))];
    }
    return undefined;
  }, [zoomContext, currentModuleFilter]);

  // HUD stats scoped to current level
  const scopedStats = useMemo(() => {
    const modFilter = currentModuleFilter;
    const findings = modFilter
      ? report.findings.filter((f) => modFilter.includes(f.module))
      : zoomContext.module
        ? report.findings.filter((f) => f.module === zoomContext.module)
        : report.findings;
    const atoms = scopedAtoms ? scopedAtoms.length : ALL_ATOMS.length;
    const modules = modFilter
      ? PROVENANCE_REGISTRY.filter((m) => modFilter.includes(m.module)).length
      : zoomContext.module ? 1 : PROVENANCE_REGISTRY.length;
    const grounded = findings.filter((f) => f.status === "grounded").length;

    return { atoms, modules, pipelines: findings.length, grounded, score: findings.length > 0 ? Math.round((grounded / findings.length) * 100) : 0 };
  }, [report, currentModuleFilter, zoomContext.module, scopedAtoms]);

  // Navigation handlers
  const handleLayerClick = useCallback((layer: SystemLayer) => {
    setZoomLevel(2);
    setZoomContext({ layerId: layer.id });
  }, []);

  const handleModuleClick = useCallback((module: string) => {
    const layer = SYSTEM_LAYERS.find((l) => l.modules.includes(module));
    setZoomLevel(1);
    setZoomContext({ layerId: layer?.id, module });
  }, []);

  const handlePipelineClick = useCallback((finding: AuditFinding) => {
    const layer = SYSTEM_LAYERS.find((l) => l.modules.includes(finding.module));
    setZoomLevel(0);
    setZoomContext({ layerId: layer?.id, module: finding.module, finding });
  }, []);

  const handleAtomClick = useCallback((atom: UorAtom) => {
    setSelectedNode({ type: "atom", atom });
  }, []);

  const handleZoomChange = useCallback((level: ZoomLevel) => {
    setZoomLevel(level);
    // Clear context below the new level
    if (level === 3) setZoomContext({});
    else if (level === 2) setZoomContext((c) => ({ layerId: c.layerId }));
    else if (level === 1) setZoomContext((c) => ({ layerId: c.layerId, module: c.module }));
  }, []);

  // Breadcrumbs
  const breadcrumbPath = useMemo(() => {
    const path: { label: string; action?: () => void }[] = [
      { label: "Compliance", action: () => { setZoomLevel(3); setZoomContext({}); } },
    ];
    if (currentLayer) {
      path.push({ label: currentLayer.label, action: () => { setZoomLevel(2); setZoomContext({ layerId: currentLayer.id }); } });
    }
    if (zoomContext.module) {
      path.push({ label: zoomContext.module, action: () => { setZoomLevel(1); setZoomContext((c) => ({ layerId: c.layerId, module: c.module })); } });
    }
    if (zoomContext.finding) {
      path.push({ label: zoomContext.finding.export });
    }
    return path;
  }, [currentLayer, zoomContext]);

  const handleExportMd = () => {
    const content = exportMarkdown(report);
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `uor-compliance-v${FIRMWARE_VERSION}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 flex bg-[hsl(220_15%_4%)] text-zinc-200 overflow-hidden">
      {/* Left Sidebar */}
      <AtomSidebar
        report={report}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
        onAtomSelect={handleAtomClick}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06]">
          <Breadcrumbs path={breadcrumbPath} />

          <div className="ml-auto flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-44 px-3 py-1.5 text-xs font-mono bg-white/[0.03] border border-white/[0.06] rounded text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-white/15"
            />

            {/* View Toggle */}
            <div className="flex bg-white/[0.03] border border-white/[0.06] rounded overflow-hidden">
              <button
                onClick={() => setView("table")}
                className={`px-2.5 py-1.5 text-xs font-mono flex items-center gap-1 transition-colors ${
                  view === "table" ? "bg-white/[0.08] text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <LayoutGrid size={11} />
              </button>
              <button
                onClick={() => setView("graph")}
                className={`px-2.5 py-1.5 text-xs font-mono flex items-center gap-1 transition-colors ${
                  view === "graph" ? "bg-white/[0.08] text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Share2 size={11} />
              </button>
              <button
                onClick={() => setView("gates")}
                className={`px-2.5 py-1.5 text-xs font-mono flex items-center gap-1 transition-colors ${
                  view === "gates" ? "bg-white/[0.08] text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <ShieldCheck size={11} />
              </button>
              <button
                onClick={() => setView("ontology")}
                className={`px-2.5 py-1.5 text-xs font-mono flex items-center gap-1 transition-colors ${
                  view === "ontology" ? "bg-white/[0.08] text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <BookOpen size={11} />
              </button>
            </div>

            <button
              onClick={handleExportMd}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Export Markdown"
            >
              <Download size={13} />
            </button>
          </div>
        </div>

        {/* Zoom Controls + HUD */}
        <div className="flex items-center gap-6 px-5 py-2.5 border-b border-white/[0.04]">
          <ZoomControls level={zoomLevel} onChange={handleZoomChange} />

          <div className="ml-auto flex items-center gap-5">
            <StatBlock value={scopedStats.atoms} label="Primitives" />
            <StatBlock value={scopedStats.pipelines} label="Pipelines" />
            <StatBlock value={scopedStats.modules} label="Modules" />
            <StatBlock value={`${scopedStats.score}%`} label="Grounded" />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {view === "ontology" ? (
            <Suspense fallback={<div className="p-5 text-xs font-mono text-zinc-500">Loading ontology…</div>}>
              <OntologyPanel />
            </Suspense>
          ) : view === "gates" ? (
            <Suspense fallback={<div className="p-5 text-xs font-mono text-zinc-500">Loading gates…</div>}>
              <HealthGatesPanel />
            </Suspense>
          ) : view === "table" ? (
            <div className="h-full overflow-y-auto p-5">
              {zoomLevel === 3 && (
                <SystemTable report={report} onLayerClick={handleLayerClick} />
              )}
              {zoomLevel === 2 && (
                <ModuleTable
                  report={report}
                  filterModules={currentModuleFilter}
                  onModuleClick={handleModuleClick}
                />
              )}
              {zoomLevel === 1 && (
                <PipelineTable
                  report={report}
                  filterModule={zoomContext.module}
                  onPipelineClick={handlePipelineClick}
                />
              )}
              {zoomLevel === 0 && (
                <PrimitiveGrid
                  report={report}
                  filterAtoms={scopedAtoms}
                  onAtomClick={handleAtomClick}
                />
              )}
            </div>
          ) : (
            <ProvenanceGraph
              findings={report.findings}
              selectedCategory={selectedCategory}
              search={search}
              onNodeSelect={(node) => setSelectedNode(node)}
              zoomLevel={zoomLevel}
              zoomContext={zoomContext}
            />
          )}
        </div>
      </div>

      {/* Right Detail Panel */}
      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          findings={report.findings}
          onClose={() => setSelectedNode(null)}
          onNavigate={(node) => setSelectedNode(node)}
        />
      )}
    </div>
  );
}
