import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ALL_ATOMS, type AtomCategory, type UorAtom, FIRMWARE_VERSION } from "../atoms";
import { type AuditReport } from "../audit";
import { exportMarkdown, exportJsonLd, exportNQuads } from "../export";
import { CRATE_MANIFEST } from "@/modules/engine/crate-manifest";

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

interface AtomSidebarProps {
  report: AuditReport;
  selectedCategory: AtomCategory | null;
  onCategorySelect: (c: AtomCategory | null) => void;
  onAtomSelect: (atom: UorAtom) => void;
}

function ScoreRing({ score }: { score: number }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 90 ? "hsl(142 71% 45%)" : score >= 70 ? "hsl(38 92% 50%)" : "hsl(0 84% 60%)";

  return (
    <svg width={88} height={88} className="mx-auto">
      <circle cx={44} cy={44} r={r} fill="none" stroke="hsl(0 0% 15%)" strokeWidth={3} />
      <motion.circle
        cx={44} cy={44} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={c} strokeDashoffset={c} strokeLinecap="round"
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        transform="rotate(-90 44 44)"
      />
      <text x={44} y={41} textAnchor="middle" fill="hsl(0 0% 90%)" fontSize={20} fontWeight="bold">{score}</text>
      <text x={44} y={56} textAnchor="middle" fill="hsl(0 0% 45%)" fontSize={8}>/ 100</text>
    </svg>
  );
}

export default function AtomSidebar({
  report, selectedCategory, onCategorySelect, onAtomSelect,
}: AtomSidebarProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("firmware");

  const categories = useMemo(() => {
    const map = new Map<AtomCategory, number>();
    ALL_ATOMS.forEach((a) => map.set(a.category, (map.get(a.category) || 0) + 1));
    return Array.from(map.entries());
  }, []);

  const topAtoms = useMemo(() => {
    return report.atomCoverage.slice(0, 8);
  }, [report]);

  const handleExport = (format: "md" | "jsonld" | "nquads") => {
    let content: string, mime: string, ext: string;
    if (format === "md") { content = exportMarkdown(report); mime = "text/markdown"; ext = "md"; }
    else if (format === "jsonld") { content = exportJsonLd(report); mime = "application/ld+json"; ext = "jsonld"; }
    else { content = exportNQuads(); mime = "application/n-quads"; ext = "nq"; }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `uor-compliance.${ext}`; a.click();
    URL.revokeObjectURL(url);
  };

  const toggle = (s: string) => setExpandedSection(expandedSection === s ? null : s);

  return (
    <div className="w-[256px] min-w-[256px] h-full flex flex-col border-r border-white/[0.06] bg-[hsl(220_15%_5%)] overflow-y-auto">
      {/* Firmware Header */}
      <button
        onClick={() => toggle("firmware")}
        className="w-full text-left p-4 border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">Firmware</span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-lg font-bold text-zinc-100 font-mono">v{FIRMWARE_VERSION}</span>
          <span className="text-[10px] text-zinc-600 font-mono">uor-foundation</span>
        </div>
      </button>

      {expandedSection === "firmware" && (
        <div className="px-4 py-3 border-b border-white/[0.06] space-y-2 bg-white/[0.01]">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xs font-bold text-zinc-300 tabular-nums">{CRATE_MANIFEST.namespaceCount}</div>
              <div className="text-[8px] text-zinc-600 uppercase">Namespaces</div>
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-300 tabular-nums">{CRATE_MANIFEST.classCount}</div>
              <div className="text-[8px] text-zinc-600 uppercase">Classes</div>
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-300 tabular-nums">{CRATE_MANIFEST.propertyCount}</div>
              <div className="text-[8px] text-zinc-600 uppercase">Properties</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
            <span>Atoms synced:</span>
            <span className="text-zinc-300">{ALL_ATOMS.length}</span>
          </div>
        </div>
      )}

      {/* Score */}
      <div className="p-4 border-b border-white/[0.06]">
        <ScoreRing score={report.groundingScore} />
        <div className="mt-2 grid grid-cols-3 gap-1 text-center">
          <div>
            <div className="text-sm font-bold text-emerald-400">{report.groundedCount}</div>
            <div className="text-[8px] text-zinc-500 uppercase">Grounded</div>
          </div>
          <div>
            <div className="text-sm font-bold text-amber-400">{report.partialCount}</div>
            <div className="text-[8px] text-zinc-500 uppercase">Partial</div>
          </div>
          <div>
            <div className="text-sm font-bold text-red-400">{report.ungroundedCount}</div>
            <div className="text-[8px] text-zinc-500 uppercase">Ungrounded</div>
          </div>
        </div>
      </div>

      {/* Atom Index */}
      <div className="p-4 border-b border-white/[0.06]">
        <button onClick={() => toggle("atoms")} className="w-full text-left text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3 hover:text-zinc-300 transition-colors">
          Atom Index
        </button>
        <div className="space-y-0.5">
          <button
            onClick={() => onCategorySelect(null)}
            className={`w-full text-left px-2 py-1.5 rounded text-xs font-mono transition-colors ${
              !selectedCategory ? "bg-white/[0.08] text-zinc-200" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
            }`}
          >
            All ({ALL_ATOMS.length})
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => onCategorySelect(selectedCategory === cat ? null : cat)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs font-mono flex items-center gap-2 transition-colors ${
                selectedCategory === cat ? "bg-white/[0.08] text-zinc-200" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
              }`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[cat] }} />
              <span className="flex-1 truncate">{cat}</span>
              <span className="text-zinc-600 text-[10px]">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Most Referenced */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">Most Referenced</div>
        <div className="space-y-0.5">
          {topAtoms.map((ac) => (
            <button
              key={ac.atom.id}
              onClick={() => onAtomSelect(ac.atom)}
              className="w-full text-left px-2 py-1 rounded text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] flex items-center gap-2 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[ac.atom.category] }} />
              <span className="flex-1 truncate">{ac.atom.label}</span>
              <span className="text-zinc-600 text-[10px]">{ac.referencedBy}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Export */}
      <div className="p-4 mt-auto">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-2">Export</div>
        <div className="flex gap-1">
          {(["md", "jsonld", "nquads"] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleExport(f)}
              className="flex-1 px-2 py-1.5 text-[10px] font-mono bg-white/[0.03] border border-white/[0.06] rounded text-zinc-500 hover:text-zinc-300 hover:border-white/10 transition-colors"
            >
              .{f === "nquads" ? "nq" : f}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
