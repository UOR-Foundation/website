import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ChevronRight } from "lucide-react";
import { ATOM_INDEX, type UorAtom, type AtomCategory, FIRMWARE_VERSION } from "../atoms";
import { PROVENANCE_REGISTRY } from "../provenance-map";
import { type AuditFinding } from "../audit";

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

export type SelectedNode =
  | { type: "atom"; atom: UorAtom }
  | { type: "module"; module: string; description: string }
  | { type: "export"; module: string; exportName: string; finding?: AuditFinding };

interface NodeDetailPanelProps {
  node: SelectedNode | null;
  findings: AuditFinding[];
  onClose: () => void;
  onNavigate: (node: SelectedNode) => void;
}

function StatusDot({ status }: { status: string }) {
  const color = status === "grounded" ? "bg-emerald-400" : status === "partial" ? "bg-amber-400" : "bg-red-400";
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500 mb-2">{children}</div>
  );
}

export default function NodeDetailPanel({ node, findings, onClose, onNavigate }: NodeDetailPanelProps) {
  if (!node) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="detail-panel"
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-[320px] min-w-[320px] h-full border-l border-white/[0.06] bg-[hsl(220_15%_5%)] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
              {node.type === "atom" ? "Atom" : node.type === "module" ? "Module" : "Export"}
            </span>
            {node.type === "atom" && (
              <span className="text-[9px] font-mono text-zinc-600">v{FIRMWARE_VERSION}</span>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={14} />
          </button>
        </div>

        {node.type === "atom" && <AtomDetail atom={node.atom} findings={findings} onNavigate={onNavigate} />}
        {node.type === "module" && <ModuleDetail module={node.module} description={node.description} findings={findings} onNavigate={onNavigate} />}
        {node.type === "export" && <ExportDetail module={node.module} exportName={node.exportName} finding={node.finding} onNavigate={onNavigate} />}
      </motion.div>
    </AnimatePresence>
  );
}

function AtomDetail({ atom, findings, onNavigate }: { atom: UorAtom; findings: AuditFinding[]; onNavigate: (n: SelectedNode) => void }) {
  const downstream = findings.filter((f) => f.validAtoms.includes(atom.id));
  const modules = [...new Set(downstream.map((f) => f.module))];

  return (
    <div className="p-4 space-y-5">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full" style={{ background: CATEGORY_COLORS[atom.category] }} />
          <h2 className="text-lg font-bold text-zinc-100">{atom.label}</h2>
        </div>
        <div className="text-[10px] font-mono text-zinc-500">{atom.id}</div>
      </div>

      {/* Human Description */}
      <div>
        <SectionLabel>What it does</SectionLabel>
        <p className="text-sm text-zinc-300 leading-relaxed">{atom.humanDescription}</p>
      </div>

      {/* Technical Description */}
      <div>
        <SectionLabel>Technical</SectionLabel>
        <p className="text-xs text-zinc-400">{atom.description}</p>
      </div>

      {/* Crate Mapping */}
      <div className="space-y-2">
        <SectionLabel>Crate Mapping</SectionLabel>
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-mono text-zinc-600 w-12 flex-shrink-0 pt-0.5">Rust</span>
            <code className="text-[11px] font-mono text-amber-400/80 bg-white/[0.03] px-2 py-0.5 rounded break-all">
              {atom.crateNamespace}::{atom.rustType}
            </code>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-mono text-zinc-600 w-12 flex-shrink-0 pt-0.5">TS</span>
            <code className="text-[11px] font-mono text-blue-400/80 bg-white/[0.03] px-2 py-0.5 rounded break-all">
              @/types/uor-foundation/{atom.tsProjection}
            </code>
          </div>
        </div>
      </div>

      {/* Category */}
      <div>
        <SectionLabel>Category</SectionLabel>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono text-zinc-300 bg-white/[0.04] border border-white/[0.06]">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: CATEGORY_COLORS[atom.category] }} />
          {atom.category}
        </span>
      </div>

      {/* Downstream Modules */}
      <div>
        <SectionLabel>Downstream Modules ({modules.length})</SectionLabel>
        <div className="space-y-0.5">
          {modules.map((m) => {
            const mod = PROVENANCE_REGISTRY.find((p) => p.module === m);
            return (
              <button
                key={m}
                onClick={() => onNavigate({ type: "module", module: m, description: mod?.description || "" })}
                className="w-full text-left px-2 py-1.5 rounded text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] transition-colors flex items-center gap-2"
              >
                <ChevronRight size={10} className="text-zinc-600" />
                <span className="truncate">{m}</span>
              </button>
            );
          })}
          {modules.length === 0 && (
            <div className="text-xs font-mono text-zinc-600 px-2">No downstream modules</div>
          )}
        </div>
      </div>

      {/* Used by Exports */}
      <div>
        <SectionLabel>Used by Exports ({downstream.length})</SectionLabel>
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {downstream.map((f) => (
            <button
              key={`${f.module}/${f.export}`}
              onClick={() => onNavigate({ type: "export", module: f.module, exportName: f.export, finding: f })}
              className="w-full text-left px-2 py-1.5 rounded text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] flex items-center gap-2 transition-colors"
            >
              <StatusDot status={f.status} />
              <span className="truncate">{f.module}/{f.export}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModuleDetail({ module, description, findings, onNavigate }: { module: string; description: string; findings: AuditFinding[]; onNavigate: (n: SelectedNode) => void }) {
  const modFindings = findings.filter((f) => f.module === module);
  const allAtomIds = [...new Set(modFindings.flatMap((f) => f.validAtoms))];
  const allGrounded = modFindings.every((f) => f.status === "grounded");

  return (
    <div className="p-4 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-zinc-100">{module}</h2>
        <p className="text-sm text-zinc-400 mt-1">{description}</p>
      </div>

      <div>
        <SectionLabel>Health</SectionLabel>
        <div className="flex items-center gap-2">
          <StatusDot status={allGrounded ? "grounded" : "partial"} />
          <span className={`text-xs font-mono ${allGrounded ? "text-emerald-400" : "text-amber-400"}`}>
            {allGrounded ? "Fully Compliant" : "Partial Compliance"}
          </span>
        </div>
      </div>

      <div>
        <SectionLabel>Exports ({modFindings.length})</SectionLabel>
        <div className="space-y-0.5">
          {modFindings.map((f) => (
            <button
              key={f.export}
              onClick={() => onNavigate({ type: "export", module: f.module, exportName: f.export, finding: f })}
              className="w-full text-left px-2 py-1.5 rounded text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] flex items-center gap-2 transition-colors"
            >
              <StatusDot status={f.status} />
              <span className="truncate">{f.export}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Atom Chain Visualization */}
      <div>
        <SectionLabel>Foundation Atoms ({allAtomIds.length})</SectionLabel>
        <div className="flex flex-wrap gap-1">
          {allAtomIds.map((id) => {
            const atom = ATOM_INDEX.get(id);
            if (!atom) return null;
            return (
              <button
                key={id}
                onClick={() => onNavigate({ type: "atom", atom })}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:border-white/10 transition-colors flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: CATEGORY_COLORS[atom.category] }} />
                {atom.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ExportDetail({ module, exportName, finding, onNavigate }: { module: string; exportName: string; finding?: AuditFinding; onNavigate: (n: SelectedNode) => void }) {
  const mod = PROVENANCE_REGISTRY.find((p) => p.module === module);
  const exp = mod?.exports.find((e) => e.export === exportName);

  return (
    <div className="p-4 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-zinc-100">{exportName}</h2>
        <button
          onClick={() => {
            if (mod) onNavigate({ type: "module", module, description: mod.description });
          }}
          className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors mt-0.5 flex items-center gap-1"
        >
          {module} <ChevronRight size={10} />
        </button>
      </div>

      {finding && (
        <div>
          <SectionLabel>Status</SectionLabel>
          <div className="flex items-center gap-2">
            <StatusDot status={finding.status} />
            <span className={`text-xs font-mono ${
              finding.status === "grounded" ? "text-emerald-400" : finding.status === "partial" ? "text-amber-400" : "text-red-400"
            }`}>
              {finding.status === "grounded" ? "Fully Grounded" : finding.status === "partial" ? "Partially Grounded" : "Ungrounded"}
            </span>
          </div>
        </div>
      )}

      {exp && (
        <div>
          <SectionLabel>Pipeline</SectionLabel>
          <div className="text-xs font-mono text-zinc-300 bg-white/[0.03] border border-white/[0.06] rounded p-3 leading-relaxed">
            {exp.pipeline.split(" → ").map((step, i, arr) => (
              <span key={i} className="inline-flex items-center">
                <span className="text-zinc-200">{step}</span>
                {i < arr.length - 1 && <ArrowRight size={10} className="mx-1 text-zinc-600" />}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionLabel>Atom Chain ({finding?.validAtoms.length || 0})</SectionLabel>
        <div className="space-y-0.5">
          {finding?.validAtoms.map((id, i) => {
            const atom = ATOM_INDEX.get(id);
            if (!atom) return null;
            return (
              <button
                key={id}
                onClick={() => onNavigate({ type: "atom", atom })}
                className="w-full text-left px-2 py-1.5 rounded text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] flex items-center gap-2 transition-colors"
              >
                <span className="text-[9px] text-zinc-600 w-4">{i + 1}</span>
                <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[atom.category] }} />
                <span className="flex-1">{atom.label}</span>
                <span className="text-zinc-600 text-[10px]">{atom.crateNamespace.split("::").pop()}</span>
              </button>
            );
          })}
        </div>
        {finding?.invalidAtoms && finding.invalidAtoms.length > 0 && (
          <div className="mt-2">
            <div className="text-[10px] font-mono text-red-400 mb-1">Invalid References</div>
            {finding.invalidAtoms.map((id) => (
              <div key={id} className="px-2 py-1 text-xs font-mono text-red-400/70">{id}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
