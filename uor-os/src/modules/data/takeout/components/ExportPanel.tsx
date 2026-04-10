import { useState } from "react";
import { TAKEOUT_CATEGORIES } from "../lib/types";
import { exportTakeout, downloadArchive } from "../lib/takeout-engine";
import { Check, Download, Loader2 } from "lucide-react";

export default function ExportPanel() {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(TAKEOUT_CATEGORIES.map((c) => c.id)),
  );
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ label: "", pct: 0 });
  const [done, setDone] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(TAKEOUT_CATEGORIES.map((c) => c.id)));
  const selectNone = () => setSelected(new Set());

  const handleExport = async () => {
    setExporting(true);
    setDone(false);
    try {
      const archive = await exportTakeout(
        Array.from(selected),
        (label, pct) => setProgress({ label, pct }),
      );
      downloadArchive(archive);
      setDone(true);
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header controls */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <button
            onClick={selectAll}
            className="text-[11px] text-white/50 hover:text-white/80 transition-colors"
          >
            Select all
          </button>
          <span className="text-white/20">·</span>
          <button
            onClick={selectNone}
            className="text-[11px] text-white/50 hover:text-white/80 transition-colors"
          >
            Select none
          </button>
        </div>
        <span className="text-xs text-white/40">
          {selected.size} of {TAKEOUT_CATEGORIES.length} selected
        </span>
      </div>

      {/* Category checklist */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
        {TAKEOUT_CATEGORIES.map((cat) => {
          const isSelected = selected.has(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => toggle(cat.id)}
              disabled={exporting}
              className={`
                flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all text-left
                ${isSelected
                  ? "bg-white/[0.05] border-white/[0.12]"
                  : "bg-white/[0.01] border-white/[0.04] opacity-50"
                }
                hover:bg-white/[0.06] disabled:pointer-events-none
              `}
            >
              <div
                className={`
                  w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0
                  ${isSelected ? "bg-emerald-500/80 border-emerald-400/60" : "border-white/20"}
                `}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-lg">{cat.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white/90">{cat.label}</div>
                <div className="text-xs text-white/40 truncate">{cat.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Export action */}
      <div className="px-5 py-4 border-t border-white/[0.06] bg-white/[0.02]">
        {exporting && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-white/50 mb-1.5">
              <span>{progress.label}</span>
              <span>{progress.pct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>
        )}
        <button
          onClick={handleExport}
          disabled={exporting || selected.size === 0}
          className={`
            w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all
            ${done
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "bg-white/[0.08] hover:bg-white/[0.12] text-white/90 border border-white/[0.08]"
            }
            disabled:opacity-40 disabled:pointer-events-none
          `}
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : done ? (
            <Check className="w-4 h-4" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {exporting ? "Exporting…" : done ? "Archive downloaded" : "Export & Download"}
        </button>
      </div>
    </div>
  );
}
