import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ExternalLink, LayoutGrid, Share2 } from "lucide-react";
import { runAudit, type AuditFinding, type AuditReport } from "../audit";
import { ALL_ATOMS, ATOM_INDEX, type AtomCategory, type UorAtom } from "../atoms";
import { PROVENANCE_REGISTRY } from "../provenance-map";
import AtomSidebar from "../components/AtomSidebar";
import NodeDetailPanel, { type SelectedNode } from "../components/NodeDetailPanel";
import ProvenanceGraph from "../components/ProvenanceGraph";

// ── Status Badge ────────────────────────────────────────────────

function StatusBadge({ status }: { status: AuditFinding["status"] }) {
  const styles = {
    grounded: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    partial: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    ungrounded: "bg-red-500/15 text-red-400 border-red-500/20",
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
};

// ── Main Page ───────────────────────────────────────────────────

export default function ComplianceDashboardPage() {
  const report = useMemo<AuditReport>(() => runAudit(), []);
  const [filter, setFilter] = useState<"all" | "grounded" | "partial" | "ungrounded">("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "graph">("table");
  const [rasVersion, setRasVersion] = useState("v1.0.0");
  const [componentCount, setComponentCount] = useState(ALL_ATOMS.length);
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

  const openNewWindow = () => {
    window.open("/compliance", "_blank", "width=1400,height=900");
  };

  return (
    <div className="fixed inset-0 flex bg-[hsl(220_15%_6%)] text-zinc-200 overflow-hidden">
      {/* Left Sidebar */}
      <AtomSidebar
        report={report}
        rasVersion={rasVersion}
        onRasVersionChange={setRasVersion}
        componentCount={componentCount}
        onComponentCountChange={setComponentCount}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
        onAtomSelect={handleAtomSelect}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.06]">
          <h1 className="text-sm font-bold tracking-tight text-zinc-100">Compliance</h1>
          <span className="text-[10px] font-mono text-zinc-500">UOR Canonical Provenance Audit</span>

          <div className="ml-auto flex items-center gap-3">
            {/* Search */}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-48 px-3 py-1.5 text-xs font-mono bg-white/[0.04] border border-white/[0.06] rounded text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-white/15"
            />

            {/* View Toggle */}
            <div className="flex bg-white/[0.04] border border-white/[0.06] rounded overflow-hidden">
              <button
                onClick={() => setView("table")}
                className={`px-3 py-1.5 text-xs font-mono flex items-center gap-1.5 transition-colors ${
                  view === "table" ? "bg-white/[0.08] text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <LayoutGrid size={12} />
                Table
              </button>
              <button
                onClick={() => setView("graph")}
                className={`px-3 py-1.5 text-xs font-mono flex items-center gap-1.5 transition-colors ${
                  view === "graph" ? "bg-white/[0.08] text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Share2 size={12} />
                Graph
              </button>
            </div>

            <button
              onClick={openNewWindow}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Open in new window"
            >
              <ExternalLink size={14} />
            </button>
          </div>
        </div>

        {/* HUD Stats Bar */}
        <div className="flex items-center gap-6 px-5 py-2 border-b border-white/[0.04]">
          {[
            { label: "Nodes", value: ALL_ATOMS.length + PROVENANCE_REGISTRY.length + report.totalExports },
            { label: "Relations", value: report.findings.reduce((s, f) => s + f.validAtoms.length, 0) + report.totalExports },
            { label: "Longest Chain", value: longestChain },
            { label: "RAS", value: rasVersion },
          ].map((s) => (
            <div key={s.label} className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-zinc-200 tabular-nums">{s.value}</span>
              <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">{s.label}</span>
            </div>
          ))}

          {/* Filter pills */}
          <div className="ml-auto flex gap-1">
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
              {/* Atom Periodic Grid */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">
                  UOR Atom Registry — {filteredAtoms.length} atoms
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1">
                  {filteredAtoms.map((atom) => {
                    const coverage = report.atomCoverage.find((ac) => ac.atom.id === atom.id);
                    return (
                      <button
                        key={atom.id}
                        onClick={() => handleAtomSelect(atom)}
                        className="group flex flex-col items-center p-1.5 rounded border border-white/[0.04] hover:border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.05] transition-all"
                        title={`${atom.id}\n${atom.description}`}
                      >
                        <span
                          className="w-2 h-2 rounded-full mb-1"
                          style={{ background: CATEGORY_COLORS[atom.category] }}
                        />
                        <span className="text-[10px] font-mono text-zinc-300 group-hover:text-zinc-100 truncate w-full text-center">
                          {atom.label}
                        </span>
                        <span className="text-[8px] text-zinc-600">{coverage?.referencedBy || 0}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Findings Table */}
              <div className="border border-white/[0.06] rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_80px_2fr] gap-2 px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-zinc-600 border-b border-white/[0.04] bg-white/[0.02]">
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
                      transition={{ delay: i * 0.01 }}
                      onClick={() => setSelectedNode({ type: "export", module: f.module, exportName: f.export, finding: f })}
                      className="grid grid-cols-[1fr_1fr_80px_2fr] gap-2 px-4 py-2 text-xs border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-colors"
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
                        {f.invalidAtoms.length > 0 && (
                          <span className="text-red-400/70 ml-1">[!{f.invalidAtoms.join(",")}]</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
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
