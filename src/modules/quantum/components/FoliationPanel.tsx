/**
 * Transverse Symplectic Foliation Panel
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  runFoliationAnalysis,
  type FoliationReport,
  type SymplecticLeaf,
  type TransverseFlow,
} from "@/modules/atlas/symplectic-foliation";

// ── Leaf strip visualization ──────────────────────────────────────────────

const OP_COLORS: Record<string, string> = {
  product:      "hsl(38,70%,55%)",
  quotient:     "hsl(200,60%,55%)",
  filtration:   "hsl(140,55%,50%)",
  augmentation: "hsl(280,50%,60%)",
  embedding:    "hsl(0,55%,55%)",
};

function LeafMap({
  leaves,
  flows,
  selected,
  onSelect,
}: {
  leaves: SymplecticLeaf[];
  flows: TransverseFlow[];
  selected: number | null;
  onSelect: (i: number | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const W = 700, H = 280;

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    // Group by operation
    const groups = new Map<string, { leaves: { leaf: SymplecticLeaf; idx: number }[]; color: string }>();
    leaves.forEach((l, i) => {
      if (!groups.has(l.operation)) groups.set(l.operation, { leaves: [], color: OP_COLORS[l.operation] });
      groups.get(l.operation)!.leaves.push({ leaf: l, idx: i });
    });

    const ops = ["product", "quotient", "filtration", "augmentation", "embedding"];
    const colW = (W - 40) / ops.length;
    const positions = new Map<number, { x: number; y: number }>();

    // Draw columns
    ops.forEach((op, colIdx) => {
      const x0 = 20 + colIdx * colW;
      const group = groups.get(op);
      if (!group) return;

      // Column header
      ctx.fillStyle = group.color;
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(op.toUpperCase(), x0 + colW / 2, 18);

      const opInfo = { product: "G₂", quotient: "F₄", filtration: "E₆", augmentation: "E₇", embedding: "E₈" };
      ctx.font = "8px monospace";
      ctx.fillStyle = "hsl(210,10%,45%)";
      ctx.fillText(opInfo[op as keyof typeof opInfo] || "", x0 + colW / 2, 30);

      // Leaves
      const leafH = Math.min(40, (H - 60) / group.leaves.length);
      group.leaves.forEach((item, li) => {
        const y = 45 + li * (leafH + 8);
        const lx = x0 + 8;
        const lw = colW - 16;

        positions.set(item.idx, { x: lx + lw / 2, y: y + leafH / 2 });

        // Leaf rectangle
        const isSel = selected === item.idx;
        ctx.fillStyle = isSel
          ? group.color.replace(")", ",0.3)").replace("hsl", "hsla")
          : "hsla(210,10%,12%,0.6)";
        ctx.strokeStyle = isSel ? group.color : "hsla(210,10%,25%,0.4)";
        ctx.lineWidth = isSel ? 2 : 1;
        ctx.beginPath();
        ctx.roundRect(lx, y, lw, leafH, 4);
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.fillStyle = isSel ? group.color : "hsl(210,10%,60%)";
        ctx.font = "8px monospace";
        ctx.textAlign = "left";
        const label = item.leaf.label.length > 16 ? item.leaf.label.slice(0, 15) + "…" : item.leaf.label;
        ctx.fillText(label, lx + 4, y + 12);

        // Casimir & entropy
        ctx.fillStyle = "hsl(210,10%,42%)";
        ctx.font = "7px monospace";
        ctx.fillText(`C=${item.leaf.casimirValue.toFixed(2)} S=${item.leaf.entropy.toFixed(2)}`, lx + 4, y + 22);

        if (leafH > 30) {
          ctx.fillText(`rank=${item.leaf.symplecticRank} dim=${item.leaf.dimension}`, lx + 4, y + 32);
        }
      });
    });

    // Draw transverse flows
    flows.forEach(f => {
      const src = positions.get(f.sourceLeaf);
      const tgt = positions.get(f.targetLeaf);
      if (!src || !tgt) return;

      ctx.strokeStyle = `hsla(180,50%,50%,${0.2 + f.dissipationRate * 0.6})`;
      ctx.lineWidth = 1 + f.dissipationRate * 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow
      const angle = Math.atan2(tgt.y - src.y, tgt.x - src.x);
      const ax = tgt.x - 10 * Math.cos(angle);
      const ay = tgt.y - 10 * Math.sin(angle);
      ctx.fillStyle = "hsl(180,50%,55%)";
      ctx.beginPath();
      ctx.moveTo(tgt.x, tgt.y);
      ctx.lineTo(ax - 4 * Math.sin(angle), ay + 4 * Math.cos(angle));
      ctx.lineTo(ax + 4 * Math.sin(angle), ay - 4 * Math.cos(angle));
      ctx.fill();
    });

    ctx.textAlign = "start";
  }, [leaves, flows, selected]);

  // Click detection
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const ops = ["product", "quotient", "filtration", "augmentation", "embedding"];
    const colW = (W - 40) / ops.length;
    const groups = new Map<string, number[]>();
    leaves.forEach((l, i) => {
      if (!groups.has(l.operation)) groups.set(l.operation, []);
      groups.get(l.operation)!.push(i);
    });

    for (const [colIdx, op] of ops.entries()) {
      const x0 = 20 + colIdx * colW;
      const indices = groups.get(op) || [];
      const leafH = Math.min(40, (H - 60) / indices.length);
      for (const [li, idx] of indices.entries()) {
        const y = 45 + li * (leafH + 8);
        if (mx >= x0 + 8 && mx <= x0 + colW - 8 && my >= y && my <= y + leafH) {
          onSelect(selected === idx ? null : idx);
          return;
        }
      }
    }
    onSelect(null);
  }, [leaves, selected, onSelect]);

  return <canvas ref={canvasRef} width={W} height={H} className="block cursor-pointer" onClick={handleClick} />;
}

// ── Main Panel ────────────────────────────────────────────────────────────

export default function FoliationPanel() {
  const [report, setReport] = useState<FoliationReport | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedLeaf, setSelectedLeaf] = useState<number | null>(null);
  const [tab, setTab] = useState<"leaves" | "generic" | "casimirs" | "invariants">("leaves");

  const handleRun = useCallback(() => {
    setRunning(true);
    requestAnimationFrame(() => {
      setReport(runFoliationAnalysis());
      setRunning(false);
    });
  }, []);

  const ok = (v: boolean) => v ? "hsl(140,60%,55%)" : "hsl(0,60%,55%)";

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[15px] font-mono font-semibold text-foreground tracking-wide">
            Transverse Symplectic Foliation
          </h2>
          <p className="text-[10px] font-mono text-muted-foreground mt-1 max-w-2xl">
            12 projection domains as symplectic leaves (constant Casimir) connected by 5 transverse dissipative flows.
            GENERIC bracket: dF/dt = &#123;F,H&#125;<sub>Poisson</sub> + (F,S)<sub>metric</sub> with Öttinger-Grmela degeneracy conditions.
          </p>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="px-4 py-1.5 rounded text-[10px] font-mono font-semibold bg-[hsla(140,50%,40%,0.2)] text-[hsl(140,60%,60%)] hover:bg-[hsla(140,50%,40%,0.3)] transition-colors disabled:opacity-40"
        >
          {running ? "Computing…" : report ? "▸ Re-run" : "▸ Run Foliation Analysis"}
        </button>
      </div>

      {!report && !running && (
        <div className="text-center py-12 text-[10px] font-mono text-muted-foreground">
          Click "Run Foliation Analysis" to construct the symplectic leaf structure and verify GENERIC brackets
        </div>
      )}

      {running && (
        <div className="text-center py-12 text-[10px] font-mono text-[hsl(140,60%,55%)] animate-pulse">
          Constructing symplectic foliation and verifying Casimir invariants…
        </div>
      )}

      {report && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: "Leaves", value: report.summary.leafCount.toString(), c: "hsl(140,60%,55%)" },
              { label: "Flows", value: report.summary.flowCount.toString(), c: "hsl(180,60%,55%)" },
              { label: "Total ΔS", value: report.summary.totalEntropyProduction.toFixed(3), c: "hsl(200,60%,55%)" },
              { label: "Casimir Drift", value: report.summary.meanCasimirDrift.toExponential(1), c: report.summary.meanCasimirDrift < 1e-6 ? "hsl(140,60%,55%)" : "hsl(0,60%,55%)" },
              { label: "Degeneracy", value: `${(report.summary.degeneracySatisfaction * 100).toFixed(0)}%`, c: "hsl(280,50%,60%)" },
            ].map((c, i) => (
              <div key={i} className="bg-[hsla(210,10%,8%,0.5)] rounded p-2 text-center">
                <div className="text-[7px] font-mono text-muted-foreground uppercase">{c.label}</div>
                <div className="text-[14px] font-mono mt-1" style={{ color: c.c }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Leaf map visualization */}
          <div className="bg-[hsla(210,10%,8%,0.5)] border border-[hsla(210,15%,20%,0.3)] rounded-lg p-3">
            <div className="text-[8px] font-mono text-muted-foreground uppercase mb-2">
              Symplectic Leaf Map — 12 domains × 5 operations (dashed = transverse dissipative flows)
            </div>
            <LeafMap leaves={report.leaves} flows={report.flows} selected={selectedLeaf} onSelect={setSelectedLeaf} />
          </div>

          {/* Selected leaf detail */}
          {selectedLeaf !== null && (
            <div className="bg-[hsla(210,10%,8%,0.5)] border border-[hsla(210,15%,25%,0.4)] rounded-lg p-3">
              <div className="text-[10px] font-mono mb-2" style={{ color: OP_COLORS[report.leaves[selectedLeaf].operation] }}>
                Σ_{selectedLeaf}: {report.leaves[selectedLeaf].label}
              </div>
              <div className="grid grid-cols-4 gap-3 text-[8px] font-mono">
                {[
                  { k: "Operation", v: report.leaves[selectedLeaf].operation },
                  { k: "Group", v: report.leaves[selectedLeaf].group },
                  { k: "Roots", v: report.leaves[selectedLeaf].rootCount },
                  { k: "Projections", v: report.leaves[selectedLeaf].projectionCount },
                  { k: "Casimir C", v: report.leaves[selectedLeaf].casimirValue.toFixed(4) },
                  { k: "Entropy S", v: report.leaves[selectedLeaf].entropy.toFixed(4) },
                  { k: "Symplectic Rank", v: report.leaves[selectedLeaf].symplecticRank },
                  { k: "Dimension", v: report.leaves[selectedLeaf].dimension },
                ].map((item, i) => (
                  <div key={i}>
                    <span className="text-muted-foreground">{item.k}: </span>
                    <span className="text-foreground">{item.v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-[hsla(210,10%,10%,0.5)] rounded p-0.5">
            {(["leaves", "generic", "casimirs", "invariants"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded text-[10px] font-mono transition-colors ${
                  tab === t
                    ? "bg-[hsla(140,50%,40%,0.2)] text-[hsl(140,60%,60%)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "leaves" ? "Leaves & Flows" : t === "generic" ? "GENERIC Brackets" : t === "casimirs" ? "Casimir Invariants" : "Structural Proofs"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === "leaves" && (
            <div className="space-y-1">
              {report.flows.map((f, i) => (
                <div key={i} className="flex items-center gap-3 bg-[hsla(210,10%,8%,0.4)] rounded p-2 text-[9px] font-mono">
                  <span className="text-muted-foreground w-28 truncate">{report.leaves[f.sourceLeaf].label}</span>
                  <span className="text-[hsl(180,50%,55%)]">→</span>
                  <span className="text-muted-foreground w-28 truncate">{report.leaves[f.targetLeaf].label}</span>
                  <span style={{ color: OP_COLORS[f.operation] }} className="w-20">{f.operation}</span>
                  <span className="text-[hsl(180,60%,55%)]">ΔS={f.entropyProduction.toFixed(4)}</span>
                  <span className="text-muted-foreground">γ={f.dissipationRate.toFixed(3)}</span>
                  <span style={{ color: ok(f.irreversible) }}>{f.irreversible ? "irreversible" : "reversible"}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "generic" && (
            <div className="space-y-2">
              {report.generic.map((g, i) => (
                <div key={i} className="bg-[hsla(210,10%,8%,0.4)] rounded p-3 text-[9px] font-mono">
                  <div className="text-foreground mb-1.5">{g.observable}</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <span className="text-muted-foreground">&#123;F,H&#125; = </span>
                      <span className="text-[hsl(38,70%,55%)]">{g.poissonBracket.toExponential(3)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">(F,S) = </span>
                      <span className="text-[hsl(180,60%,55%)]">{g.metricBracket.toExponential(3)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">dF/dt = </span>
                      <span className="text-[hsl(280,50%,60%)]">{g.totalRate.toExponential(3)}</span>
                    </div>
                  </div>
                  <div className="mt-1.5 flex gap-4">
                    <span>
                      <span className="text-muted-foreground">&#123;S,H&#125; = </span>
                      <span style={{ color: ok(Math.abs(g.degeneracySH) < 1e-4) }}>{g.degeneracySH.toExponential(2)}</span>
                    </span>
                    <span>
                      <span className="text-muted-foreground">(E,S) = </span>
                      <span style={{ color: ok(Math.abs(g.degeneracyES) < 1e-4) }}>{g.degeneracyES.toExponential(2)}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "casimirs" && (
            <div className="space-y-2">
              {report.casimirs.map((c, i) => (
                <div key={i} className="bg-[hsla(210,10%,8%,0.4)] rounded p-3 text-[9px] font-mono flex items-center gap-4">
                  <span style={{ color: ok(c.leafInvariant) }} className="text-[11px]">{c.leafInvariant ? "✓" : "✗"}</span>
                  <span className="text-foreground w-10">C_{c.order}</span>
                  <span className="text-muted-foreground">value = <span className="text-[hsl(38,70%,55%)]">{c.value.toFixed(4)}</span></span>
                  <span className="text-muted-foreground">leaf drift = <span style={{ color: ok(c.leafInvariant) }}>{c.leafDrift.toExponential(2)}</span></span>
                  <span className="text-muted-foreground">transverse = <span className="text-[hsl(180,60%,55%)]">{c.transverseDrift.toExponential(2)}</span></span>
                </div>
              ))}
              <div className="text-[8px] font-mono text-muted-foreground mt-2 italic">
                Casimir invariants C_k = Tr(ad*(ξ)^k) for k ∈ &#123;2,4,6,8&#125; (E₈ independent Casimirs).
                Leaf drift = 0 confirms symplectic leaf structure. Transverse drift ≠ 0 confirms dissipation.
              </div>
            </div>
          )}

          {tab === "invariants" && (
            <div className="space-y-1.5">
              {report.invariants.map((inv, i) => (
                <div key={i} className="flex items-start gap-2 text-[9px] font-mono">
                  <span style={{ color: ok(inv.holds) }}>{inv.holds ? "✓" : "✗"}</span>
                  <div className="flex-1">
                    <span className="text-foreground">{inv.name}</span>
                    <span className="text-muted-foreground ml-2">— {inv.evidence}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formula reference */}
          <div className="bg-[hsla(210,10%,6%,0.4)] border border-[hsla(210,10%,15%,0.3)] rounded-lg p-3 text-[8px] font-mono text-muted-foreground leading-relaxed space-y-0.5">
            <div><span className="text-[hsl(38,70%,55%)]">GENERIC:</span> dF/dt = &#123;F, H&#125;<sub>Poisson</sub> + (F, S)<sub>metric</sub></div>
            <div><span className="text-[hsl(140,60%,55%)]">Degeneracy:</span> &#123;S, H&#125; = 0 (S is Casimir of Poisson) · (E, S) = 0 (E is null of metric)</div>
            <div><span className="text-[hsl(180,60%,55%)]">Symplectic leaf:</span> Σ_C = &#123;x : C(x) = const&#125; — constant Casimir surfaces</div>
            <div><span className="text-[hsl(280,50%,60%)]">Transverse flow:</span> dissipative metric flow ⊥ to leaves — Onsager reciprocal relations</div>
            <div><span className="text-muted-foreground">Öttinger & Grmela (1997), Barbaresco (2025), Morrison (1986)</span></div>
          </div>
        </>
      )}
    </div>
  );
}
