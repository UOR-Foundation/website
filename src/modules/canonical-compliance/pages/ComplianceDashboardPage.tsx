import { useMemo, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ExternalLink, LayoutGrid, Share2, ChevronRight, Download } from "lucide-react";
import { runAudit, type AuditFinding, type AuditReport } from "../audit";
import { ALL_ATOMS, ATOM_INDEX, type AtomCategory, type UorAtom, FIRMWARE_VERSION } from "../atoms";
import { PROVENANCE_REGISTRY } from "../provenance-map";
import { exportMarkdown } from "../export";
import AtomSidebar from "../components/AtomSidebar";
import NodeDetailPanel, { type SelectedNode } from "../components/NodeDetailPanel";
import ProvenanceGraph from "../components/ProvenanceGraph";
import KnowledgeSidebar, { pushTrail, type BacklinkEntry } from "@/modules/knowledge-graph/components/KnowledgeSidebar";
import ConceptMap, { type ConceptNode, type ConceptEdge } from "@/modules/knowledge-graph/components/ConceptMap";
import StatBlock from "@/modules/core/components/StatBlock";
import Breadcrumbs from "@/modules/core/components/Breadcrumbs";

// ── Status Badge ────────────────────────────────────────────────

function StatusBadge({ status }: { status: AuditFinding["status"] }) {
  const styles = {
    grounded: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    partial: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    ungrounded: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${styles[status]}`}>
      {status}
    </span>
  );
}

const CATEGORY_COLORS: Record<AtomCategory, string> = {
  PrimitiveOp: "hsl(0 0% 65%)",
  Space: "hsl(210 15% 60%)",
  CoreType: "hsl(160 30% 50%)",
  IdentityPipeline: "hsl(35 60% 55%)",
  Morphism: "hsl(270 25% 60%)",
  Algebraic: "hsl(340 30% 55%)",
  Enforcement: "hsl(200 50% 55%)",
  Certificate: "hsl(45 70% 55%)",
  Observable: "hsl(180 40% 50%)",
};

// ── (Breadcrumbs now imported from core) ────────────────────────

// ── Main Page ───────────────────────────────────────────────────

export default function ComplianceDashboardPage() {
  const report = useMemo<AuditReport>(() => runAudit(), []);
  const [filter, setFilter] = useState<"all" | "grounded" | "partial" | "ungrounded">("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "graph">("table");
  const [browseMode, setBrowseMode] = useState<"top-down" | "bottom-up">("top-down");
  const [selectedCategory, setSelectedCategory] = useState<AtomCategory | null>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

  const filtered = useMemo(() => {
    let f = report.findings;
    if (filter !== "all") f = f.filter((x) => x.status === filter);
    if (selectedCategory) {
      f = f.filter((x) => x.validAtoms.some((a) => {
        const atom = ATOM_INDEX.get(a);
        return atom?.category === selectedCategory;
      }));
    }
    if (search) {
      const q = search.toLowerCase();
      f = f.filter((x) => x.module.toLowerCase().includes(q) || x.export.toLowerCase().includes(q));
    }
    return f;
  }, [report, filter, search, selectedCategory]);

  const filteredAtoms = useMemo(() => {
    if (!selectedCategory) return ALL_ATOMS;
    return ALL_ATOMS.filter((a) => a.category === selectedCategory);
  }, [selectedCategory]);

  const longestChain = useMemo(() => {
    let max = 0;
    for (const f of report.findings) {
      if (f.validAtoms.length > max) max = f.validAtoms.length;
    }
    return max;
  }, [report]);

  const handleAtomSelect = useCallback((atom: UorAtom) => {
    setSelectedNode({ type: "atom", atom });
  }, []);

  const handleNodeNavigate = useCallback((node: SelectedNode) => {
    setSelectedNode(node);
  }, []);

  const breadcrumbPath = useMemo(() => {
    const base: { label: string; action?: () => void }[] = [{ label: "Compliance", action: () => setSelectedNode(null) }];
    if (selectedCategory) {
      base.push({ label: selectedCategory });
    }
    if (selectedNode) {
      if (selectedNode.type === "atom") base.push({ label: selectedNode.atom.label });
      else if (selectedNode.type === "module") base.push({ label: selectedNode.module });
      else base.push({ label: selectedNode.exportName });
    }
    return base;
  }, [selectedCategory, selectedNode]);

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
        onAtomSelect={handleAtomSelect}
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
              placeholder="Search modules, exports..."
              className="w-52 px-3 py-1.5 text-xs font-mono bg-white/[0.03] border border-white/[0.06] rounded text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-white/15"
            />

            {/* Browse Mode Toggle */}
            <div className="flex bg-white/[0.03] border border-white/[0.06] rounded overflow-hidden">
              <button
                onClick={() => setBrowseMode("top-down")}
                className={`px-2.5 py-1.5 text-[10px] font-mono transition-colors ${
                  browseMode === "top-down" ? "bg-white/[0.08] text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Top↓
              </button>
              <button
                onClick={() => setBrowseMode("bottom-up")}
                className={`px-2.5 py-1.5 text-[10px] font-mono transition-colors ${
                  browseMode === "bottom-up" ? "bg-white/[0.08] text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Bottom↑
              </button>
            </div>

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

        {/* HUD Stats Bar */}
        <div className="flex items-center gap-6 px-5 py-2 border-b border-white/[0.04]">
          {[
            { label: "Atoms", value: ALL_ATOMS.length },
            { label: "Modules", value: PROVENANCE_REGISTRY.length },
            { label: "Exports", value: report.totalExports },
            { label: "Relations", value: report.findings.reduce((s, f) => s + f.validAtoms.length, 0) },
            { label: "Longest Chain", value: longestChain },
            { label: "Firmware", value: `v${FIRMWARE_VERSION}` },
          ].map((s) => (
            <div key={s.label} className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-zinc-200 tabular-nums">{s.value}</span>
              <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-600">{s.label}</span>
            </div>
          ))}

          {/* Filter pills */}
          <div className="ml-auto flex gap-0.5">
            {(["all", "grounded", "partial", "ungrounded"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 text-[10px] font-mono uppercase rounded transition-colors ${
                  filter === f
                    ? "bg-white/[0.08] text-zinc-200"
                    : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {view === "table" ? (
            <div className="h-full overflow-y-auto p-5 space-y-6">
              {browseMode === "top-down" ? (
                <>
                  {/* Atom Periodic Grid */}
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">
                      UOR Atom Registry — {filteredAtoms.length} atoms
                    </div>
                    <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-14 xl:grid-cols-16 gap-1">
                      {filteredAtoms.map((atom) => {
                        const coverage = report.atomCoverage.find((ac) => ac.atom.id === atom.id);
                        return (
                          <button
                            key={atom.id}
                            onClick={() => handleAtomSelect(atom)}
                            className="group flex flex-col items-center p-1.5 rounded border border-white/[0.04] hover:border-white/[0.12] bg-white/[0.015] hover:bg-white/[0.04] transition-all"
                            title={`${atom.label}\n${atom.humanDescription}`}
                          >
                            <span
                              className="w-2 h-2 rounded-full mb-1"
                              style={{ background: CATEGORY_COLORS[atom.category] }}
                            />
                            <span className="text-[9px] font-mono text-zinc-400 group-hover:text-zinc-100 truncate w-full text-center">
                              {atom.label}
                            </span>
                            <span className="text-[7px] text-zinc-700">{coverage?.referencedBy || 0}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Findings Table */}
                  <div className="border border-white/[0.06] rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[1fr_1fr_80px_2fr] gap-2 px-4 py-2 text-[9px] font-mono uppercase tracking-widest text-zinc-600 border-b border-white/[0.04] bg-white/[0.015]">
                      <span>Module</span>
                      <span>Export</span>
                      <span>Status</span>
                      <span>Atom Chain</span>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {filtered.map((f, i) => (
                        <motion.div
                          key={`${f.module}-${f.export}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.008 }}
                          onClick={() => setSelectedNode({ type: "export", module: f.module, exportName: f.export, finding: f })}
                          className="grid grid-cols-[1fr_1fr_80px_2fr] gap-2 px-4 py-2 text-xs border-b border-white/[0.03] hover:bg-white/[0.025] cursor-pointer transition-colors"
                        >
                          <span className="font-mono text-zinc-500 truncate">{f.module}</span>
                          <span className="font-mono text-zinc-300 truncate">{f.export}</span>
                          <StatusBadge status={f.status} />
                          <div className="font-mono text-zinc-500 truncate flex items-center gap-1">
                            {f.validAtoms.map((a, j) => {
                              const atom = ATOM_INDEX.get(a);
                              return (
                                <span key={a} className="flex items-center gap-0.5">
                                  {j > 0 && <span className="text-zinc-700">→</span>}
                                  <span
                                    className="inline-block w-1.5 h-1.5 rounded-full"
                                    style={{ background: atom ? CATEGORY_COLORS[atom.category] : "hsl(0 0% 30%)" }}
                                  />
                                  <span className="text-zinc-400">{atom?.label || a}</span>
                                </span>
                              );
                            })}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Bottom-Up: Atoms → Modules */
                <div className="space-y-4">
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
                    Bottom-Up: Atoms → Modules — trace from foundation to application
                  </div>
                  {filteredAtoms.map((atom) => {
                    const downstream = report.findings.filter((f) => f.validAtoms.includes(atom.id));
                    if (downstream.length === 0 && search) return null;
                    return (
                      <div key={atom.id} className="border border-white/[0.06] rounded-lg overflow-hidden">
                        <button
                          onClick={() => handleAtomSelect(atom)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 bg-white/[0.015] hover:bg-white/[0.03] transition-colors"
                        >
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[atom.category] }} />
                          <span className="text-sm font-bold text-zinc-200">{atom.label}</span>
                          <span className="text-[10px] font-mono text-zinc-600">{atom.id}</span>
                          <span className="ml-auto text-[10px] font-mono text-zinc-500">{downstream.length} references</span>
                        </button>
                        {downstream.length > 0 && (
                          <div className="px-4 py-1 border-t border-white/[0.04]">
                            {downstream.slice(0, 5).map((f) => (
                              <button
                                key={`${f.module}/${f.export}`}
                                onClick={() => setSelectedNode({ type: "export", module: f.module, exportName: f.export, finding: f })}
                                className="w-full text-left py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-2 transition-colors"
                              >
                                <StatusDot status={f.status} />
                                <span className="text-zinc-500">{f.module}/</span>
                                <span>{f.export}</span>
                              </button>
                            ))}
                            {downstream.length > 5 && (
                              <div className="text-[10px] font-mono text-zinc-600 py-1">+ {downstream.length - 5} more</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <ProvenanceGraph
              findings={report.findings}
              selectedCategory={selectedCategory}
              search={search}
              onNodeSelect={handleNodeNavigate}
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
          onNavigate={handleNodeNavigate}
        />
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "grounded" ? "bg-emerald-400" : status === "partial" ? "bg-amber-400" : "bg-red-400";
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />;
}
