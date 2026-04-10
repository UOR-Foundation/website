/**
 * Compliance Dashboard — Algebrica-style provenance audit UI
 */

import { useMemo, useState } from "react";
import Layout from "@/modules/core/components/Layout";
import { runAudit, type AuditFinding, type AuditReport } from "../audit";
import { ALL_ATOMS } from "../atoms";
import { exportMarkdown, exportJsonLd, exportNQuads } from "../export";
import { motion } from "framer-motion";

// ── Stat Block ──────────────────────────────────────────────────

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-lg border border-border/30 bg-card/40 min-w-[110px]">
      <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold text-foreground tabular-nums">{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ── Status Badge ────────────────────────────────────────────────

function StatusBadge({ status }: { status: AuditFinding["status"] }) {
  const colors = {
    grounded: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    partial: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    ungrounded: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${colors[status]}`}>
      {status}
    </span>
  );
}

// ── Score Ring ───────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 90 ? "hsl(142,71%,45%)" : score >= 70 ? "hsl(38,92%,50%)" : "hsl(0,84%,60%)";

  return (
    <svg width={140} height={140} className="mx-auto">
      <circle cx={70} cy={70} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={6} opacity={0.2} />
      <motion.circle
        cx={70} cy={70} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={c} strokeDashoffset={c} strokeLinecap="round"
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        transform="rotate(-90 70 70)"
      />
      <text x={70} y={66} textAnchor="middle" fill="currentColor" className="text-foreground text-3xl font-bold" fontSize={32}>{score}</text>
      <text x={70} y={86} textAnchor="middle" fill="currentColor" className="text-muted-foreground" fontSize={11}>/ 100</text>
    </svg>
  );
}

// ── Main Page ───────────────────────────────────────────────────

export default function ComplianceDashboardPage() {
  const report = useMemo<AuditReport>(() => runAudit(), []);
  const [filter, setFilter] = useState<"all" | "grounded" | "partial" | "ungrounded">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let f = report.findings;
    if (filter !== "all") f = f.filter((x) => x.status === filter);
    if (search) {
      const q = search.toLowerCase();
      f = f.filter((x) => x.module.toLowerCase().includes(q) || x.export.toLowerCase().includes(q));
    }
    return f;
  }, [report, filter, search]);

  const handleExport = (format: "md" | "jsonld" | "nquads") => {
    let content: string;
    let mime: string;
    let ext: string;
    if (format === "md") { content = exportMarkdown(report); mime = "text/markdown"; ext = "md"; }
    else if (format === "jsonld") { content = exportJsonLd(report); mime = "application/ld+json"; ext = "jsonld"; }
    else { content = exportNQuads(); mime = "application/n-quads"; ext = "nq"; }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uor-compliance-audit.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Canonical Compliance</h1>
          <p className="text-sm text-muted-foreground font-mono">
            Provenance audit · UOR atoms → every module
          </p>
        </div>

        {/* Score + Stats */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 items-center">
          <div className="flex flex-wrap justify-center gap-3">
            <Stat label="Exports" value={report.totalExports} />
            <Stat label="Atoms" value={ALL_ATOMS.length} />
          </div>
          <ScoreRing score={report.groundingScore} />
          <div className="flex flex-wrap justify-center gap-3">
            <Stat label="Grounded" value={report.groundedCount} sub="complete" />
            <Stat label="Partial" value={report.partialCount} sub="incomplete" />
            <Stat label="Ungrounded" value={report.ungroundedCount} sub="missing" />
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search modules or exports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 text-sm bg-card/60 border border-border/40 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          {(["all", "grounded", "partial", "ungrounded"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-mono uppercase rounded-md border transition-colors ${
                filter === f
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "bg-card/40 border-border/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
          <div className="flex gap-2 ml-auto">
            <button onClick={() => handleExport("md")} className="px-3 py-1.5 text-xs font-mono bg-card/60 border border-border/40 rounded-md text-muted-foreground hover:text-foreground transition-colors">
              .md
            </button>
            <button onClick={() => handleExport("jsonld")} className="px-3 py-1.5 text-xs font-mono bg-card/60 border border-border/40 rounded-md text-muted-foreground hover:text-foreground transition-colors">
              .jsonld
            </button>
            <button onClick={() => handleExport("nquads")} className="px-3 py-1.5 text-xs font-mono bg-card/60 border border-border/40 rounded-md text-muted-foreground hover:text-foreground transition-colors">
              .nq
            </button>
          </div>
        </div>

        {/* Findings Table */}
        <div className="border border-border/30 rounded-xl overflow-hidden bg-card/20">
          <div className="grid grid-cols-[1fr_1fr_auto_2fr] gap-2 px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground border-b border-border/20">
            <span>Module</span>
            <span>Export</span>
            <span>Status</span>
            <span>Atom Chain</span>
          </div>
          <div className="max-h-[480px] overflow-y-auto">
            {filtered.map((f, i) => (
              <motion.div
                key={`${f.module}-${f.export}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="grid grid-cols-[1fr_1fr_auto_2fr] gap-2 px-4 py-2.5 text-xs border-b border-border/10 hover:bg-card/40 transition-colors"
              >
                <span className="font-mono text-muted-foreground truncate">{f.module}</span>
                <span className="font-mono text-foreground truncate">{f.export}</span>
                <StatusBadge status={f.status} />
                <span className="font-mono text-muted-foreground truncate">
                  {f.validAtoms.join(" → ")}
                  {f.invalidAtoms.length > 0 && (
                    <span className="text-red-400 ml-1">[!{f.invalidAtoms.join(",")}]</span>
                  )}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Atom Coverage */}
        <div className="space-y-3">
          <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Atom Coverage</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {report.atomCoverage.map((ac) => (
              <div
                key={ac.atom.id}
                className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border/20 bg-card/30"
              >
                <span className="text-[10px] font-mono text-muted-foreground">{ac.atom.category}</span>
                <span className="text-sm font-bold text-foreground">{ac.atom.label}</span>
                <div className="w-full bg-muted/20 rounded-full h-1 mt-1">
                  <div
                    className="h-1 rounded-full bg-primary/60"
                    style={{ width: `${Math.min(100, (ac.referencedBy / 10) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{ac.referencedBy} refs</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-muted-foreground font-mono pt-4 border-t border-border/10">
          UOR Canonical Compliance Engine v1.0.0 · {report.timestamp}
        </div>
      </div>
    </Layout>
  );
}
