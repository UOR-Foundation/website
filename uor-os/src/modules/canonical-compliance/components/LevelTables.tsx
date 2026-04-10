/**
 * LevelTables — Zoom-level-specific table renderers.
 * L3: SystemTable, L2: ModuleTable, L1: PipelineTable, L0: PrimitiveGrid
 */

import { motion } from "framer-motion";
import { type AuditReport, type AuditFinding } from "../audit";
import { ALL_ATOMS, ATOM_INDEX, type AtomCategory, type UorAtom } from "../atoms";
import { PROVENANCE_REGISTRY, SYSTEM_LAYERS, type SystemLayer } from "../provenance-map";

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

function StatusDot({ ratio }: { ratio: number }) {
  const color = ratio >= 1 ? "bg-emerald-400" : ratio >= 0.5 ? "bg-amber-400" : "bg-red-400";
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

function ScoreBar({ grounded, total }: { grounded: number; total: number }) {
  const pct = total > 0 ? (grounded / total) * 100 : 0;
  const color = pct >= 90 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-zinc-400">{grounded}/{total}</span>
    </div>
  );
}

// ── L3: System Table ────────────────────────────────────────────

interface SystemTableProps {
  report: AuditReport;
  onLayerClick: (layer: SystemLayer) => void;
}

export function SystemTable({ report, onLayerClick }: SystemTableProps) {
  const layerStats = SYSTEM_LAYERS.map((layer) => {
    const modEntries = PROVENANCE_REGISTRY.filter((m) => layer.modules.includes(m.module));
    const exports = modEntries.flatMap((m) => m.exports);
    const findings = report.findings.filter((f) => layer.modules.includes(f.module));
    const grounded = findings.filter((f) => f.status === "grounded").length;
    const uniqueAtoms = new Set(exports.flatMap((e) => e.atoms));
    return { layer, modules: modEntries.length, pipelines: exports.length, grounded, total: findings.length, atoms: uniqueAtoms.size };
  });

  return (
    <div className="border border-white/[0.06] rounded-lg overflow-hidden">
      <div className="grid grid-cols-[2fr_80px_80px_120px_80px] gap-2 px-4 py-2.5 text-[9px] font-mono uppercase tracking-widest text-zinc-600 border-b border-white/[0.04] bg-white/[0.015]">
        <span>Layer</span>
        <span className="text-center">Packages</span>
        <span className="text-center">Exports</span>
        <span>Grounding</span>
        <span className="text-center">Operations</span>
      </div>
      {layerStats.map((s, i) => (
        <motion.div
          key={s.layer.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onLayerClick(s.layer)}
          className="grid grid-cols-[2fr_80px_80px_120px_80px] gap-2 px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.025] cursor-pointer transition-colors"
        >
          <div>
            <div className="text-sm font-medium text-zinc-200">{s.layer.label}</div>
            <div className="text-[10px] text-zinc-600 mt-0.5">{s.layer.description}</div>
          </div>
          <div className="text-center text-xs font-mono text-zinc-300 self-center">{s.modules}</div>
          <div className="text-center text-xs font-mono text-zinc-300 self-center">{s.pipelines}</div>
          <div className="self-center"><ScoreBar grounded={s.grounded} total={s.total} /></div>
          <div className="text-center text-xs font-mono text-zinc-400 self-center">{s.atoms}</div>
        </motion.div>
      ))}
    </div>
  );
}

// ── L2: Module Table ────────────────────────────────────────────

interface ModuleTableProps {
  report: AuditReport;
  filterModules?: string[];
  onModuleClick: (module: string) => void;
}

export function ModuleTable({ report, filterModules, onModuleClick }: ModuleTableProps) {
  const modules = PROVENANCE_REGISTRY
    .filter((m) => !filterModules || filterModules.includes(m.module))
    .map((m) => {
      const findings = report.findings.filter((f) => f.module === m.module);
      const grounded = findings.filter((f) => f.status === "grounded").length;
      const uniqueAtoms = new Set(m.exports.flatMap((e) => e.atoms));
      return { module: m.module, description: m.description, pipelines: m.exports.length, grounded, total: findings.length, atoms: uniqueAtoms.size };
    });

  return (
    <div className="border border-white/[0.06] rounded-lg overflow-hidden">
      <div className="grid grid-cols-[2fr_80px_120px_80px] gap-2 px-4 py-2.5 text-[9px] font-mono uppercase tracking-widest text-zinc-600 border-b border-white/[0.04] bg-white/[0.015]">
        <span>Package</span>
        <span className="text-center">Exports</span>
        <span>Grounding</span>
        <span className="text-center">Operations</span>
      </div>
      {modules.map((m, i) => (
        <motion.div
          key={m.module}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          onClick={() => onModuleClick(m.module)}
          className="grid grid-cols-[2fr_80px_120px_80px] gap-2 px-4 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.025] cursor-pointer transition-colors"
        >
          <div>
            <div className="text-xs font-mono text-zinc-200">{m.module}</div>
            <div className="text-[10px] text-zinc-600">{m.description}</div>
          </div>
          <div className="text-center text-xs font-mono text-zinc-300 self-center">{m.pipelines}</div>
          <div className="self-center"><ScoreBar grounded={m.grounded} total={m.total} /></div>
          <div className="text-center text-xs font-mono text-zinc-400 self-center">{m.atoms}</div>
        </motion.div>
      ))}
    </div>
  );
}

// ── L1: Pipeline Table ──────────────────────────────────────────

interface PipelineTableProps {
  report: AuditReport;
  filterModule?: string;
  onPipelineClick: (finding: AuditFinding) => void;
}

export function PipelineTable({ report, filterModule, onPipelineClick }: PipelineTableProps) {
  const findings = filterModule
    ? report.findings.filter((f) => f.module === filterModule)
    : report.findings;

  return (
    <div className="border border-white/[0.06] rounded-lg overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr_80px_2fr] gap-2 px-4 py-2.5 text-[9px] font-mono uppercase tracking-widest text-zinc-600 border-b border-white/[0.04] bg-white/[0.015]">
        {!filterModule && <span>Package</span>}
        <span>Export</span>
        <span>Status</span>
        <span>Operation Chain</span>
        {filterModule && <span />}
      </div>
      <div className="max-h-[500px] overflow-y-auto">
        {findings.map((f, i) => (
          <motion.div
            key={`${f.module}-${f.export}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.008 }}
            onClick={() => onPipelineClick(f)}
            className={`grid ${filterModule ? "grid-cols-[1fr_80px_2fr_1fr]" : "grid-cols-[1fr_1fr_80px_2fr]"} gap-2 px-4 py-2 border-b border-white/[0.03] hover:bg-white/[0.025] cursor-pointer transition-colors`}
          >
            {!filterModule && <span className="text-xs font-mono text-zinc-500 truncate self-center">{f.module}</span>}
            <span className="text-xs font-mono text-zinc-300 truncate self-center">{f.export}</span>
            <div className="self-center">
              <StatusBadge status={f.status} />
            </div>
            <div className="font-mono text-zinc-500 truncate flex items-center gap-1 self-center text-xs">
              {f.validAtoms.map((a, j) => {
                const atom = ATOM_INDEX.get(a);
                return (
                  <span key={a} className="flex items-center gap-0.5">
                    {j > 0 && <span className="text-zinc-700">→</span>}
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: atom ? CATEGORY_COLORS[atom.category] : "hsl(0 0% 30%)" }}
                    />
                    <span className="text-zinc-400">{atom?.label || a}</span>
                  </span>
                );
              })}
            </div>
            {filterModule && <span />}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

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

// ── L0: Primitive Grid ──────────────────────────────────────────

interface PrimitiveGridProps {
  report: AuditReport;
  filterAtoms?: string[];
  onAtomClick: (atom: UorAtom) => void;
}

export function PrimitiveGrid({ report, filterAtoms, onAtomClick }: PrimitiveGridProps) {
  const atoms = filterAtoms
    ? ALL_ATOMS.filter((a) => filterAtoms.includes(a.id))
    : ALL_ATOMS;

  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">
        Operations — {atoms.length} {filterAtoms ? "in scope" : "total"}
      </div>
      <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-14 xl:grid-cols-16 gap-1">
        {atoms.map((atom) => {
          const coverage = report.atomCoverage.find((ac) => ac.atom.id === atom.id);
          return (
            <button
              key={atom.id}
              onClick={() => onAtomClick(atom)}
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
  );
}
