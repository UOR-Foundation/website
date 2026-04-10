import { useMemo } from "react";
import { motion } from "framer-motion";
import { ALL_ATOMS, type AtomCategory, type UorAtom } from "../atoms";
import { type AuditReport } from "../audit";
import { exportMarkdown, exportJsonLd, exportNQuads } from "../export";

const CATEGORY_COLORS: Record<AtomCategory, string> = {
  PrimitiveOp: "hsl(0 0% 65%)",
  Space: "hsl(210 15% 60%)",
  CoreType: "hsl(160 30% 50%)",
  IdentityPipeline: "hsl(35 60% 55%)",
  Morphism: "hsl(270 25% 60%)",
  Algebraic: "hsl(340 30% 55%)",
};

interface AtomSidebarProps {
  report: AuditReport;
  rasVersion: string;
  onRasVersionChange: (v: string) => void;
  componentCount: number;
  onComponentCountChange: (n: number) => void;
  selectedCategory: AtomCategory | null;
  onCategorySelect: (c: AtomCategory | null) => void;
  onAtomSelect: (atom: UorAtom) => void;
}

function ScoreRing({ score }: { score: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 90 ? "hsl(142 71% 45%)" : score >= 70 ? "hsl(38 92% 50%)" : "hsl(0 84% 60%)";

  return (
    <svg width={100} height={100} className="mx-auto">
      <circle cx={50} cy={50} r={r} fill="none" stroke="hsl(0 0% 20%)" strokeWidth={4} />
      <motion.circle
        cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={c} strokeDashoffset={c} strokeLinecap="round"
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        transform="rotate(-90 50 50)"
      />
      <text x={50} y={46} textAnchor="middle" fill="hsl(0 0% 90%)" fontSize={22} fontWeight="bold">{score}</text>
      <text x={50} y={62} textAnchor="middle" fill="hsl(0 0% 50%)" fontSize={9}>/ 100</text>
    </svg>
  );
}

export default function AtomSidebar({
  report, rasVersion, onRasVersionChange, componentCount, onComponentCountChange,
  selectedCategory, onCategorySelect, onAtomSelect,
}: AtomSidebarProps) {
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

  return (
    <div className="w-[260px] min-w-[260px] h-full flex flex-col border-r border-white/[0.06] bg-[hsl(220_15%_7%)] overflow-y-auto">
      {/* RAS Crate Header */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-2">RAS Crate</div>
        <input
          value={rasVersion}
          onChange={(e) => onRasVersionChange(e.target.value)}
          className="w-full px-2 py-1.5 text-sm font-mono bg-white/[0.04] border border-white/[0.08] rounded text-zinc-200 focus:outline-none focus:border-white/20"
          placeholder="v1.0.0"
        />
        <div className="mt-3">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-1">Key Components</div>
          <input
            type="number"
            value={componentCount}
            onChange={(e) => onComponentCountChange(parseInt(e.target.value) || 0)}
            className="w-full px-2 py-1.5 text-sm font-mono bg-white/[0.04] border border-white/[0.08] rounded text-zinc-200 focus:outline-none focus:border-white/20"
          />
        </div>
      </div>

      {/* Score */}
      <div className="p-4 border-b border-white/[0.06]">
        <ScoreRing score={report.groundingScore} />
        <div className="mt-2 grid grid-cols-3 gap-1 text-center">
          <div>
            <div className="text-sm font-bold text-emerald-400">{report.groundedCount}</div>
            <div className="text-[9px] text-zinc-500 uppercase">Grnd</div>
          </div>
          <div>
            <div className="text-sm font-bold text-amber-400">{report.partialCount}</div>
            <div className="text-[9px] text-zinc-500 uppercase">Part</div>
          </div>
          <div>
            <div className="text-sm font-bold text-red-400">{report.ungroundedCount}</div>
            <div className="text-[9px] text-zinc-500 uppercase">Ungr</div>
          </div>
        </div>
      </div>

      {/* Atom Categories */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">Atom Index</div>
        <div className="space-y-1">
          <button
            onClick={() => onCategorySelect(null)}
            className={`w-full text-left px-2 py-1.5 rounded text-xs font-mono transition-colors ${
              !selectedCategory ? "bg-white/[0.08] text-zinc-200" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
            }`}
          >
            All ({ALL_ATOMS.length})
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => onCategorySelect(selectedCategory === cat ? null : cat)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs font-mono flex items-center gap-2 transition-colors ${
                selectedCategory === cat ? "bg-white/[0.08] text-zinc-200" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
              }`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[cat] }} />
              <span className="flex-1">{cat}</span>
              <span className="text-zinc-600">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Most Referenced */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">Most Referenced</div>
        <div className="space-y-1">
          {topAtoms.map((ac) => (
            <button
              key={ac.atom.id}
              onClick={() => onAtomSelect(ac.atom)}
              className="w-full text-left px-2 py-1 rounded text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] flex items-center gap-2 transition-colors"
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
              className="flex-1 px-2 py-1.5 text-[10px] font-mono bg-white/[0.04] border border-white/[0.06] rounded text-zinc-500 hover:text-zinc-300 hover:border-white/10 transition-colors"
            >
              .{f === "nquads" ? "nq" : f}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
