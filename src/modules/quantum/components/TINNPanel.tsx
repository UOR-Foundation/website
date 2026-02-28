/**
 * TINN Panel — Thermodynamics-Informed Neural Network Visualization
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  createTINNLayer,
  forwardPass,
  defaultInitialState,
  type TINNLayer,
  type TINNTrajectory,
  type TINNConfig,
} from "@/modules/atlas/tinn";

// ── Chart: Energy & Entropy time-series ───────────────────────────────────

function DualChart({
  trajectory,
  width = 600,
  height = 180,
}: {
  trajectory: TINNTrajectory;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !trajectory) return;

    const { states } = trajectory;
    const pad = { top: 20, right: 60, bottom: 24, left: 48 };
    const w = width - pad.left - pad.right;
    const h = height - pad.top - pad.bottom;

    ctx.clearRect(0, 0, width, height);

    // Ranges
    const energies = states.map(s => s.energy);
    const entropies = states.map(s => s.entropy);
    const eMin = Math.min(...energies);
    const eMax = Math.max(...energies);
    const sMin = Math.min(...entropies);
    const sMax = Math.max(...entropies);
    const eRange = eMax - eMin || 1;
    const sRange = sMax - sMin || 1;

    // Grid
    ctx.strokeStyle = "hsla(210,10%,30%,0.3)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (h * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + w, y);
      ctx.stroke();
    }

    // Energy line (golden)
    ctx.strokeStyle = "hsl(38,70%,55%)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    states.forEach((s, i) => {
      const x = pad.left + (i / (states.length - 1)) * w;
      const y = pad.top + h - ((s.energy - eMin) / eRange) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Entropy line (cyan)
    ctx.strokeStyle = "hsl(180,60%,55%)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    states.forEach((s, i) => {
      const x = pad.left + (i / (states.length - 1)) * w;
      const y = pad.top + h - ((s.entropy - sMin) / sRange) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Labels
    ctx.font = "9px monospace";
    ctx.fillStyle = "hsl(38,70%,55%)";
    ctx.fillText(`E: ${eMin.toFixed(3)}`, pad.left + w + 4, pad.top + h);
    ctx.fillText(`E: ${eMax.toFixed(3)}`, pad.left + w + 4, pad.top + 10);
    ctx.fillStyle = "hsl(180,60%,55%)";
    ctx.fillText(`S: ${sMin.toFixed(3)}`, pad.left + w + 4, pad.top + h - 14);
    ctx.fillText(`S: ${sMax.toFixed(3)}`, pad.left + w + 4, pad.top + 24);

    // Axis labels
    ctx.fillStyle = "hsl(210,10%,45%)";
    ctx.fillText("t", pad.left + w / 2, height - 4);
    ctx.fillText("0", pad.left - 4, height - 8);

    // Legend
    ctx.fillStyle = "hsl(38,70%,55%)";
    ctx.fillRect(pad.left, 4, 8, 2);
    ctx.fillText("Energy E(t)", pad.left + 12, 9);
    ctx.fillStyle = "hsl(180,60%,55%)";
    ctx.fillRect(pad.left + 90, 4, 8, 2);
    ctx.fillText("Entropy S(t)", pad.left + 102, 9);
  }, [trajectory, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} className="block" />;
}

// ── Chart: dE/dt and dS/dt rates ──────────────────────────────────────────

function RatesChart({
  trajectory,
  width = 600,
  height = 140,
}: {
  trajectory: TINNTrajectory;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !trajectory) return;

    const { decompositions: decomps } = trajectory;
    const pad = { top: 18, right: 60, bottom: 20, left: 48 };
    const w = width - pad.left - pad.right;
    const h = height - pad.top - pad.bottom;

    ctx.clearRect(0, 0, width, height);

    const dEdts = decomps.map(d => d.dEdt);
    const dSdts = decomps.map(d => d.dSdt);
    const allVals = [...dEdts, ...dSdts];
    const yMin = Math.min(...allVals, 0);
    const yMax = Math.max(...allVals, 0.01);
    const yRange = yMax - yMin || 1;

    // Zero line
    const zeroY = pad.top + h - ((0 - yMin) / yRange) * h;
    ctx.strokeStyle = "hsla(210,10%,40%,0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pad.left, zeroY);
    ctx.lineTo(pad.left + w, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // dE/dt bars (should be ≈ 0)
    const barW = w / decomps.length;
    decomps.forEach((d, i) => {
      const x = pad.left + i * barW;
      const barH = (Math.abs(d.dEdt) / yRange) * h;
      ctx.fillStyle = Math.abs(d.dEdt) < 0.001
        ? "hsla(140,60%,50%,0.4)"
        : "hsla(0,60%,50%,0.5)";
      ctx.fillRect(x, zeroY - (d.dEdt > 0 ? barH : 0), barW * 0.4, barH);
    });

    // dS/dt line (should be ≥ 0)
    ctx.strokeStyle = "hsl(180,60%,55%)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    decomps.forEach((d, i) => {
      const x = pad.left + (i + 0.5) * barW;
      const y = pad.top + h - ((d.dSdt - yMin) / yRange) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Labels
    ctx.font = "9px monospace";
    ctx.fillStyle = "hsl(140,50%,50%)";
    ctx.fillRect(pad.left, 4, 8, 2);
    ctx.fillText("dE/dt (bars)", pad.left + 12, 9);
    ctx.fillStyle = "hsl(180,60%,55%)";
    ctx.fillRect(pad.left + 100, 4, 8, 2);
    ctx.fillText("dS/dt (line)", pad.left + 112, 9);

    ctx.fillStyle = "hsl(210,10%,45%)";
    ctx.fillText("0", pad.left - 10, zeroY + 3);
  }, [trajectory, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} className="block" />;
}

// ── Phase portrait (z1 vs z2) ─────────────────────────────────────────────

function PhasePortrait({
  trajectory,
  size = 180,
}: {
  trajectory: TINNTrajectory;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !trajectory) return;

    const states = trajectory.states;
    const pad = 20;
    const w = size - 2 * pad;

    ctx.clearRect(0, 0, size, size);

    const x = states.map(s => s.z[0]);
    const y = states.map(s => s.z[1]);
    const xMin = Math.min(...x), xMax = Math.max(...x);
    const yMin = Math.min(...y), yMax = Math.max(...y);
    const xR = xMax - xMin || 1, yR = yMax - yMin || 1;

    // Trajectory
    ctx.strokeStyle = "hsl(280,50%,60%)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    states.forEach((s, i) => {
      const px = pad + ((s.z[0] - xMin) / xR) * w;
      const py = pad + w - ((s.z[1] - yMin) / yR) * w;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Start dot
    ctx.fillStyle = "hsl(140,60%,55%)";
    const sx = pad + ((states[0].z[0] - xMin) / xR) * w;
    const sy = pad + w - ((states[0].z[1] - yMin) / yR) * w;
    ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();

    // End dot
    ctx.fillStyle = "hsl(0,60%,55%)";
    const ex = pad + ((states[states.length - 1].z[0] - xMin) / xR) * w;
    const ey = pad + w - ((states[states.length - 1].z[1] - yMin) / yR) * w;
    ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2); ctx.fill();

    // Labels
    ctx.font = "8px monospace";
    ctx.fillStyle = "hsl(210,10%,45%)";
    ctx.fillText("z₁", size / 2, size - 4);
    ctx.save();
    ctx.translate(8, size / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("z₂", 0, 0);
    ctx.restore();
  }, [trajectory, size]);

  return <canvas ref={canvasRef} width={size} height={size} className="block" />;
}

// ── Main Panel ────────────────────────────────────────────────────────────

export default function TINNPanel() {
  const [gamma, setGamma] = useState(0.3);
  const [steps, setSteps] = useState(50);
  const [dt, setDt] = useState(0.02);
  const [trajectory, setTrajectory] = useState<TINNTrajectory | null>(null);
  const [running, setRunning] = useState(false);
  const [showInvariants, setShowInvariants] = useState(true);

  const handleRun = useCallback(() => {
    setRunning(true);
    requestAnimationFrame(() => {
      const layer = createTINNLayer({ gamma, steps, dt });
      const z0 = defaultInitialState(8);
      const traj = forwardPass(layer, z0);
      setTrajectory(traj);
      setRunning(false);
    });
  }, [gamma, steps, dt]);

  const statusColor = (v: boolean) =>
    v ? "hsl(140,60%,55%)" : "hsl(0,60%,55%)";

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[15px] font-mono font-semibold text-foreground tracking-wide">
            TINN — Thermodynamics-Informed Neural Network
          </h2>
          <p className="text-[10px] font-mono text-muted-foreground mt-1 max-w-2xl">
            Metriplectic bracket layer from Barbaresco's framework: ẋ = &#123;x,E&#125;<sub>Poisson</sub> + (x,S)<sub>metric</sub>.
            Energy conservation dE/dt=0 and entropy production dS/dt≥0 enforced structurally via J=L−Lᵀ (skew) and M=GᵀG (PSD).
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-end gap-4 bg-[hsla(210,10%,8%,0.5)] border border-[hsla(210,15%,20%,0.3)] rounded-lg p-3">
        <div>
          <label className="text-[8px] font-mono text-muted-foreground uppercase block mb-1">
            Dissipation γ
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={gamma}
            onChange={e => setGamma(parseFloat(e.target.value))}
            className="w-24 h-1.5 accent-[hsl(180,60%,55%)]"
          />
          <span className="text-[9px] font-mono text-muted-foreground ml-2">{gamma.toFixed(2)}</span>
        </div>
        <div>
          <label className="text-[8px] font-mono text-muted-foreground uppercase block mb-1">
            Steps
          </label>
          <input
            type="number"
            min={10}
            max={200}
            value={steps}
            onChange={e => setSteps(parseInt(e.target.value) || 50)}
            className="w-16 bg-[hsla(210,10%,15%,0.5)] border border-[hsla(210,15%,25%,0.3)] rounded px-1.5 py-0.5 text-[10px] font-mono text-foreground"
          />
        </div>
        <div>
          <label className="text-[8px] font-mono text-muted-foreground uppercase block mb-1">
            dt
          </label>
          <input
            type="number"
            min={0.001}
            max={0.1}
            step={0.005}
            value={dt}
            onChange={e => setDt(parseFloat(e.target.value) || 0.02)}
            className="w-16 bg-[hsla(210,10%,15%,0.5)] border border-[hsla(210,15%,25%,0.3)] rounded px-1.5 py-0.5 text-[10px] font-mono text-foreground"
          />
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="px-4 py-1.5 rounded text-[10px] font-mono font-semibold bg-[hsla(180,50%,40%,0.2)] text-[hsl(180,60%,60%)] hover:bg-[hsla(180,50%,40%,0.3)] transition-colors disabled:opacity-40"
        >
          {running ? "Integrating…" : trajectory ? "▸ Re-run" : "▸ Run TINN Forward Pass"}
        </button>
      </div>

      {!trajectory && !running && (
        <div className="text-center py-12 text-[10px] font-mono text-muted-foreground">
          Configure parameters and click "Run TINN Forward Pass" to integrate the metriplectic system
        </div>
      )}

      {running && (
        <div className="text-center py-12 text-[10px] font-mono text-[hsl(180,60%,55%)] animate-pulse">
          Integrating metriplectic dynamics ({steps} steps, dt={dt})…
        </div>
      )}

      {trajectory && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: "Energy Drift |ΔE|", value: trajectory.summary.energyDrift.toExponential(2), ok: trajectory.summary.energyDrift < 0.01 },
              { label: "Entropy Prod ΔS", value: trajectory.summary.entropyProduction.toFixed(4), ok: trajectory.summary.entropyProduction >= -1e-10 },
              { label: "max|dE/dt|", value: trajectory.summary.maxEnergyViolation.toExponential(2), ok: trajectory.summary.maxEnergyViolation < 0.01 },
              { label: "min dS/dt", value: trajectory.summary.minEntropyRate.toExponential(2), ok: trajectory.summary.minEntropyRate >= -1e-10 },
              { label: "Tr(g_FR)", value: trajectory.summary.fisherRaoTrace.toFixed(3), ok: true },
            ].map((c, i) => (
              <div key={i} className="bg-[hsla(210,10%,8%,0.5)] rounded p-2 text-center">
                <div className="text-[7px] font-mono text-muted-foreground uppercase">{c.label}</div>
                <div className="text-[14px] font-mono mt-1" style={{ color: c.ok ? "hsl(140,60%,55%)" : "hsl(0,60%,55%)" }}>
                  {c.value}
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-[1fr_180px] gap-3">
            <div className="space-y-3">
              <div className="bg-[hsla(210,10%,8%,0.5)] border border-[hsla(210,15%,20%,0.3)] rounded-lg p-3">
                <div className="text-[8px] font-mono text-muted-foreground uppercase mb-2">
                  Energy & Entropy Trajectories
                </div>
                <DualChart trajectory={trajectory} />
              </div>
              <div className="bg-[hsla(210,10%,8%,0.5)] border border-[hsla(210,15%,20%,0.3)] rounded-lg p-3">
                <div className="text-[8px] font-mono text-muted-foreground uppercase mb-2">
                  Rate Verification: dE/dt ≈ 0 (bars) · dS/dt ≥ 0 (line)
                </div>
                <RatesChart trajectory={trajectory} />
              </div>
            </div>

            <div className="bg-[hsla(280,10%,8%,0.5)] border border-[hsla(280,15%,20%,0.3)] rounded-lg p-3">
              <div className="text-[8px] font-mono text-muted-foreground uppercase mb-2">
                Phase Portrait (z₁, z₂)
              </div>
              <PhasePortrait trajectory={trajectory} />
              <div className="mt-2 text-[7px] font-mono text-muted-foreground space-y-0.5">
                <div><span className="inline-block w-2 h-2 rounded-full bg-[hsl(140,60%,55%)] mr-1" /> Start</div>
                <div><span className="inline-block w-2 h-2 rounded-full bg-[hsl(0,60%,55%)] mr-1" /> End</div>
              </div>
            </div>
          </div>

          {/* Structural Invariants */}
          <div className="bg-[hsla(210,10%,8%,0.5)] border border-[hsla(210,15%,20%,0.3)] rounded-lg p-3">
            <button
              onClick={() => setShowInvariants(v => !v)}
              className="text-[10px] font-mono text-[hsl(180,60%,55%)] hover:text-[hsl(180,60%,70%)] mb-2"
            >
              {showInvariants ? "▾" : "▸"} Structural Invariants ({trajectory.invariants.filter(i => i.holds).length}/{trajectory.invariants.length})
            </button>

            {showInvariants && (
              <div className="space-y-1.5">
                {trajectory.invariants.map((inv, i) => (
                  <div key={i} className="flex items-start gap-2 text-[9px] font-mono">
                    <span style={{ color: statusColor(inv.holds) }}>
                      {inv.holds ? "✓" : "✗"}
                    </span>
                    <div className="flex-1">
                      <span className="text-foreground">{inv.name}</span>
                      <span className="text-muted-foreground ml-2">— {inv.evidence}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formula reference */}
          <div className="bg-[hsla(210,10%,6%,0.4)] border border-[hsla(210,10%,15%,0.3)] rounded-lg p-3 text-[8px] font-mono text-muted-foreground leading-relaxed space-y-0.5">
            <div><span className="text-[hsl(38,70%,55%)]">Metriplectic:</span> dF/dt = &#123;F, E&#125;<sub>J</sub> + (F, S)<sub>M</sub></div>
            <div><span className="text-[hsl(140,60%,55%)]">Conservative:</span> J = L − Lᵀ (skew-symmetric) → ∇E·J∇E = 0 → dE/dt = 0</div>
            <div><span className="text-[hsl(180,60%,55%)]">Dissipative:</span> M = GᵀG (Cholesky PSD) → ∇S·M∇S ≥ 0 → dS/dt ≥ 0</div>
            <div><span className="text-[hsl(280,50%,60%)]">Souriau:</span> g<sub>ij</sub> = ∂²log Z/∂β<sub>i</sub>∂β<sub>j</sub> (Fisher-Rao informs the Onsager metric M)</div>
            <div><span className="text-muted-foreground">Barbaresco (2025), Morrison (1986), Hernández et al. (2023)</span></div>
          </div>
        </>
      )}
    </div>
  );
}
