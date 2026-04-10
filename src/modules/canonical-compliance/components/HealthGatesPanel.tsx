/**
 * Health Gates Panel — Visual gate runner dashboard
 * ══════════════════════════════════════════════════
 */

import { useState, useEffect } from "react";
import { Download, ChevronDown, ChevronRight } from "lucide-react";
import { runAllGatesAsync, exportGatesMarkdown, type GateResult, type GateFinding, type GateReport } from "../gates";

// ── Status dot ────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: GateResult["status"] }) {
  const color =
    status === "pass"
      ? "bg-emerald-400"
      : status === "warn"
        ? "bg-amber-400"
        : "bg-red-400";
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

// ── Severity icon ─────────────────────────────────────────────────────────

function SeverityIcon({ severity }: { severity: GateFinding["severity"] }) {
  if (severity === "error") return <span className="text-red-400 text-[10px] font-bold">●</span>;
  if (severity === "warning") return <span className="text-amber-400 text-[10px] font-bold">●</span>;
  return <span className="text-zinc-500 text-[10px] font-bold">●</span>;
}

// ── Score bar ─────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 90
      ? "bg-emerald-400/70"
      : score >= 60
        ? "bg-amber-400/70"
        : "bg-red-400/70";
  return (
    <div className="w-20 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
    </div>
  );
}

// ── Gate Card ─────────────────────────────────────────────────────────────

function GateCard({ gate }: { gate: GateResult }) {
  const [open, setOpen] = useState(false);

  const errors = gate.findings.filter((f) => f.severity === "error").length;
  const warnings = gate.findings.filter((f) => f.severity === "warning").length;

  return (
    <div className="border border-white/[0.06] rounded-lg bg-white/[0.02]">
      {/* Header row */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <StatusDot status={gate.status} />

        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono text-zinc-200 truncate">{gate.name}</div>
          <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
            {errors > 0 && <span className="text-red-400">{errors} error{errors > 1 ? "s" : ""}</span>}
            {errors > 0 && warnings > 0 && " · "}
            {warnings > 0 && <span className="text-amber-400">{warnings} warning{warnings > 1 ? "s" : ""}</span>}
            {errors === 0 && warnings === 0 && <span className="text-emerald-400/70">clean</span>}
          </div>
        </div>

        <ScoreBar score={gate.score} />
        <span className="text-xs font-mono text-zinc-400 w-8 text-right">{gate.score}</span>

        {open ? (
          <ChevronDown size={12} className="text-zinc-500" />
        ) : (
          <ChevronRight size={12} className="text-zinc-500" />
        )}
      </button>

      {/* Expanded findings */}
      {open && gate.findings.length > 0 && (
        <div className="border-t border-white/[0.04] px-4 py-2 space-y-1.5 max-h-64 overflow-y-auto">
          {gate.findings.map((f, i) => (
            <div key={i} className="flex gap-2 py-1">
              <SeverityIcon severity={f.severity} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-mono text-zinc-300">{f.title}</p>
                <p className="text-[10px] font-mono text-zinc-500 mt-0.5">{f.detail}</p>
                {f.file && (
                  <p className="text-[10px] font-mono text-zinc-600 mt-0.5">
                    📁 {f.file}
                  </p>
                )}
                {f.recommendation && (
                  <p className="text-[10px] font-mono text-emerald-400/60 mt-0.5">
                    → {f.recommendation}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────

export default function HealthGatesPanel() {
  const [report, setReport] = useState<GateReport | null>(null);

  useEffect(() => {
    runAllGatesAsync().then(setReport);
  }, []);

  if (!report) return <div className="p-4 text-sm text-muted-foreground">Running gates…</div>;

  const handleExport = () => {
    const md = exportGatesMarkdown(report);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `health-gates-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const compositeColor =
    report.compositeScore >= 90
      ? "text-emerald-400"
      : report.compositeScore >= 60
        ? "text-amber-400"
        : "text-red-400";

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono text-zinc-300">Health Gates</h2>
          <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
            {report.gates.length} gates · composite{" "}
            <span className={compositeColor}>{report.compositeScore}/100</span>
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono text-zinc-400 border border-white/[0.06] rounded hover:bg-white/[0.04] transition-colors"
        >
          <Download size={11} />
          Export Markdown
        </button>
      </div>

      {/* Composite score bar */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Composite</span>
        <div className="flex-1">
          <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                report.compositeScore >= 90
                  ? "bg-emerald-400/70"
                  : report.compositeScore >= 60
                    ? "bg-amber-400/70"
                    : "bg-red-400/70"
              }`}
              style={{ width: `${report.compositeScore}%` }}
            />
          </div>
        </div>
        <span className={`text-sm font-mono font-bold ${compositeColor}`}>
          {report.compositeScore}
        </span>
      </div>

      {/* Gate cards */}
      <div className="space-y-2">
        {report.gates.map((gate) => (
          <GateCard key={gate.id} gate={gate} />
        ))}
      </div>

      {/* Timestamp */}
      <p className="text-[9px] font-mono text-zinc-600 text-center pt-2">
        Report generated {report.timestamp}
      </p>
    </div>
  );
}
