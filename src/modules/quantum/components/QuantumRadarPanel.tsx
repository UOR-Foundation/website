/**
 * Quantum Radar Panel — Real-time Network Coherence Monitor
 * ══════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  generateSweep,
  runRadarVerification,
  type RadarSweep,
  type NodeSnapshot,
  type RadarAlert,
  type RadarVerification,
} from "../quantum-radar";

// ── Radar Canvas ──────────────────────────────────────────────────────────

function RadarDisplay({ sweep, sweepAngle }: { sweep: RadarSweep; sweepAngle: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(cx, cy) - 20;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "hsla(230, 15%, 6%, 1)";
    ctx.fillRect(0, 0, W, H);

    // Grid rings
    for (let i = 1; i <= 4; i++) {
      const r = (R / 4) * i;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(160, 40%, 30%, ${0.15 + i * 0.05})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Cross lines
    ctx.strokeStyle = "hsla(160, 40%, 30%, 0.15)";
    ctx.lineWidth = 0.5;
    for (let a = 0; a < 360; a += 45) {
      const rad = (a * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(rad) * R, cy + Math.sin(rad) * R);
      ctx.stroke();
    }

    // Sweep line
    const sweepRad = (sweepAngle * Math.PI) / 180;
    const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(sweepRad) * R, cy + Math.sin(sweepRad) * R);
    grad.addColorStop(0, "hsla(160, 80%, 50%, 0.6)");
    grad.addColorStop(1, "hsla(160, 80%, 50%, 0.05)");
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepRad) * R, cy + Math.sin(sweepRad) * R);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Sweep cone (trailing glow)
    const coneAngle = 30;
    const coneGrad = ctx.createConicGradient(sweepRad - (coneAngle * Math.PI) / 180, cx, cy);
    coneGrad.addColorStop(0, "hsla(160, 80%, 50%, 0)");
    coneGrad.addColorStop(coneAngle / 360, "hsla(160, 80%, 50%, 0.08)");
    coneGrad.addColorStop((coneAngle + 1) / 360, "hsla(160, 80%, 50%, 0)");
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = coneGrad;
    ctx.fill();

    // Entanglement links
    for (const link of sweep.links) {
      const src = sweep.nodes.find(n => n.nodeId === link.sourceNode);
      const tgt = sweep.nodes.find(n => n.nodeId === link.targetNode);
      if (!src || !tgt) continue;

      const srcRad = (src.angle - 90) * Math.PI / 180;
      const tgtRad = (tgt.angle - 90) * Math.PI / 180;
      const dist = R * 0.7;

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(srcRad) * dist, cy + Math.sin(srcRad) * dist);
      ctx.lineTo(cx + Math.cos(tgtRad) * dist, cy + Math.sin(tgtRad) * dist);
      ctx.strokeStyle = link.active
        ? `hsla(200, 60%, 50%, ${link.bellFidelity * 0.4})`
        : "hsla(0, 60%, 40%, 0.2)";
      ctx.lineWidth = link.active ? 1.5 : 0.5;
      ctx.setLineDash(link.active ? [] : [4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Nodes
    for (const node of sweep.nodes) {
      const rad = (node.angle - 90) * Math.PI / 180;
      const dist = R * 0.7;
      const nx = cx + Math.cos(rad) * dist;
      const ny = cy + Math.sin(rad) * dist;

      // Node glow
      const nodeColor = node.health === "nominal" ? "160, 60%, 50%"
        : node.health === "degraded" ? "40, 80%, 50%"
        : "0, 70%, 50%";

      const glow = ctx.createRadialGradient(nx, ny, 0, nx, ny, 20);
      glow.addColorStop(0, `hsla(${nodeColor}, 0.4)`);
      glow.addColorStop(1, `hsla(${nodeColor}, 0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(nx - 20, ny - 20, 40, 40);

      // Node dot
      ctx.beginPath();
      ctx.arc(nx, ny, 6, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${nodeColor}, 0.9)`;
      ctx.fill();

      // Node outline
      ctx.beginPath();
      ctx.arc(nx, ny, 8, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${nodeColor}, 0.5)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Utilization ring
      const utilAngle = (node.qubitsUsed / node.qubitCapacity) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(nx, ny, 12, -Math.PI / 2, -Math.PI / 2 + utilAngle);
      ctx.strokeStyle = `hsla(${nodeColor}, 0.7)`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = "hsla(210, 10%, 70%, 0.9)";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(node.label, nx, ny + 24);
      ctx.fillStyle = `hsla(${nodeColor}, 0.8)`;
      ctx.font = "8px monospace";
      ctx.fillText(`${(node.coherencePercent * 100).toFixed(0)}%`, nx, ny + 34);
    }

    // Center label
    ctx.fillStyle = "hsla(160, 40%, 60%, 0.7)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`SWEEP #${sweep.sweepId}`, cx, cy - 4);
    ctx.fillStyle = "hsla(160, 40%, 60%, 0.5)";
    ctx.font = "8px monospace";
    ctx.fillText(`${(sweep.globalCoherence * 100).toFixed(1)}% coherence`, cx, cy + 8);

  }, [sweep, sweepAngle]);

  return (
    <canvas
      ref={canvasRef}
      width={360}
      height={360}
      className="rounded-lg border border-[hsla(160,30%,25%,0.3)]"
    />
  );
}

// ── Node Detail Card ──────────────────────────────────────────────────────

function NodeCard({ node }: { node: NodeSnapshot }) {
  const healthColors: Record<string, string> = {
    nominal: "hsl(160,60%,50%)",
    degraded: "hsl(40,80%,50%)",
    critical: "hsl(0,70%,50%)",
    offline: "hsl(210,10%,30%)",
  };
  const color = healthColors[node.health];

  return (
    <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[11px] font-mono text-[hsl(210,10%,75%)]">{node.label}</span>
        </div>
        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded"
          style={{ color, backgroundColor: `${color}20` }}>
          {node.health}
        </span>
      </div>

      {/* Bars */}
      <div className="space-y-1.5">
        <MetricBar label="Coherence" value={node.coherencePercent} unit="%" format={v => (v * 100).toFixed(1)} color="hsl(160,60%,50%)" />
        <MetricBar label="Fidelity" value={node.qubitFidelity} unit="%" format={v => (v * 100).toFixed(2)} color="hsl(200,60%,55%)" />
        <MetricBar label="Qubits" value={node.qubitsUsed / node.qubitCapacity} unit="" format={() => `${node.qubitsUsed}/${node.qubitCapacity}`} color="hsl(280,50%,60%)" />
        <MetricBar label="Temp" value={Math.min(node.temperature / 80, 1)} unit="mK" format={() => node.temperature.toFixed(1)} color={node.temperature > 25 ? "hsl(40,80%,50%)" : "hsl(200,50%,50%)"} />
      </div>

      {/* Error rates */}
      <div className="grid grid-cols-5 gap-1 pt-1 border-t border-[hsla(210,10%,25%,0.2)]">
        {[
          { label: "BF", value: node.errorRates.bitFlip },
          { label: "PF", value: node.errorRates.phaseFlip },
          { label: "DP", value: node.errorRates.depolarizing },
          { label: "MS", value: node.errorRates.measurement },
          { label: "LK", value: node.errorRates.leakage },
        ].map(e => (
          <div key={e.label} className="text-center">
            <div className="text-[7px] font-mono text-[hsl(210,10%,40%)] uppercase">{e.label}</div>
            <div className={`text-[9px] font-mono ${e.value > 0.005 ? "text-[hsl(40,80%,55%)]" : "text-[hsl(160,50%,50%)]"}`}>
              {(e.value * 1000).toFixed(1)}‰
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricBar({ label, value, unit, format, color }: {
  label: string; value: number; unit: string; format: (v: number) => string; color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono text-[hsl(210,10%,40%)] w-14 uppercase">{label}</span>
      <div className="flex-1 h-1.5 bg-[hsla(210,10%,15%,0.5)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-[9px] font-mono w-12 text-right" style={{ color }}>{format(value)}{unit && ` ${unit}`}</span>
    </div>
  );
}

// ── Alerts Feed ───────────────────────────────────────────────────────────

function AlertsFeed({ alerts }: { alerts: RadarAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="text-[10px] font-mono text-[hsl(160,50%,40%)] text-center py-3">
        All systems nominal — no alerts
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[200px] overflow-y-auto">
      {alerts.map((a, i) => (
        <div key={i} className={`flex items-center gap-2 text-[10px] font-mono p-1.5 rounded ${
          a.level === "critical"
            ? "bg-[hsla(0,50%,15%,0.3)] text-[hsl(0,70%,60%)]"
            : a.level === "warn"
            ? "bg-[hsla(40,50%,15%,0.3)] text-[hsl(40,80%,55%)]"
            : "bg-[hsla(200,30%,15%,0.3)] text-[hsl(200,50%,55%)]"
        }`}>
          <span>{a.level === "critical" ? "⚠" : a.level === "warn" ? "△" : "ℹ"}</span>
          <span className="text-[hsl(210,10%,50%)]">{a.nodeId.split(":")[1]}</span>
          <span className="flex-1">{a.message}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────

export default function QuantumRadarPanel() {
  const [sweep, setSweep] = useState<RadarSweep>(() => generateSweep());
  const [sweepAngle, setSweepAngle] = useState(0);
  const [history, setHistory] = useState<{ coherence: number; fidelity: number; errors: number }[]>([]);
  const [showVerification, setShowVerification] = useState(false);
  const [verification, setVerification] = useState<RadarVerification | null>(null);
  const animRef = useRef<number>();

  // Animate sweep
  useEffect(() => {
    let angle = 0;
    let lastSweepTime = Date.now();

    const tick = () => {
      angle = (angle + 1.5) % 360;
      setSweepAngle(angle);

      // New data sweep every ~3 seconds
      if (Date.now() - lastSweepTime > 3000) {
        lastSweepTime = Date.now();
        const newSweep = generateSweep();
        setSweep(newSweep);
        setHistory(prev => [
          ...prev.slice(-59),
          { coherence: newSweep.globalCoherence, fidelity: newSweep.globalFidelity, errors: newSweep.totalErrors },
        ]);
      }

      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const runVerify = useCallback(() => {
    setVerification(runRadarVerification());
    setShowVerification(true);
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-mono tracking-wide text-[hsl(160,60%,55%)]">
            Quantum Radar
          </h2>
          <p className="text-[11px] font-mono text-[hsl(210,10%,50%)] mt-0.5">
            Real-time network coherence monitor — 4-node mesh topology
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={runVerify}
            className="text-[10px] font-mono text-[hsl(160,50%,50%)] hover:text-[hsl(160,50%,70%)] px-2.5 py-1 rounded bg-[hsla(160,30%,15%,0.3)] border border-[hsla(160,30%,25%,0.3)] transition-colors"
          >
            Run Verification
          </button>
          <div className={`text-[11px] font-mono px-2.5 py-1 rounded-md border ${
            sweep.alertCount === 0
              ? "bg-[hsla(160,30%,15%,0.3)] border-[hsla(160,30%,25%,0.3)] text-[hsl(160,60%,55%)]"
              : "bg-[hsla(40,30%,15%,0.3)] border-[hsla(40,30%,25%,0.3)] text-[hsl(40,80%,55%)]"
          }`}>
            {sweep.alertCount === 0 ? "NOMINAL" : `${sweep.alertCount} ALERT${sweep.alertCount > 1 ? "S" : ""}`}
          </div>
        </div>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: "Coherence", value: `${(sweep.globalCoherence * 100).toFixed(1)}%`, color: "hsl(160,60%,50%)" },
          { label: "Fidelity", value: `${(sweep.globalFidelity * 100).toFixed(2)}%`, color: "hsl(200,60%,55%)" },
          { label: "Qubits", value: `${sweep.usedQubits}/${sweep.totalQubits}`, color: "hsl(280,50%,60%)" },
          { label: "Error Σ", value: `${(sweep.totalErrors * 1000).toFixed(1)}‰`, color: "hsl(50,80%,55%)" },
          { label: "Links", value: `${sweep.links.filter(l => l.active).length}/${sweep.links.length}`, color: "hsl(190,60%,55%)" },
          { label: "Sweep", value: `#${sweep.sweepId}`, color: "hsl(160,40%,50%)" },
        ].map(s => (
          <div key={s.label} className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-2.5">
            <div className="text-[8px] font-mono text-[hsl(210,10%,40%)] uppercase">{s.label}</div>
            <div className="text-[14px] font-mono mt-0.5" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Radar + Node cards */}
      <div className="grid grid-cols-[360px_1fr] gap-5">
        <RadarDisplay sweep={sweep} sweepAngle={sweepAngle} />

        <div className="grid grid-cols-2 gap-3">
          {sweep.nodes.map(node => (
            <NodeCard key={node.nodeId} node={node} />
          ))}
        </div>
      </div>

      {/* History sparkline */}
      {history.length > 1 && (
        <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-3">
          <div className="text-[9px] font-mono text-[hsl(210,10%,40%)] uppercase mb-2">Coherence History (last {history.length} sweeps)</div>
          <div className="h-12 flex items-end gap-[2px]">
            {history.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-sm transition-all duration-300"
                style={{
                  height: `${h.coherence * 100}%`,
                  backgroundColor: h.coherence > 0.6 ? "hsla(160,60%,50%,0.6)" : h.coherence > 0.3 ? "hsla(40,70%,50%,0.6)" : "hsla(0,60%,50%,0.6)",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-3">
        <div className="text-[9px] font-mono text-[hsl(210,10%,40%)] uppercase mb-2">Active Alerts</div>
        <AlertsFeed alerts={sweep.alerts} />
      </div>

      {/* Verification */}
      {showVerification && verification && (
        <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] font-mono text-[hsl(160,50%,55%)] uppercase">
              Verification Suite — {verification.tests.filter(t => t.holds).length}/{verification.tests.length}
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
              verification.allPassed
                ? "bg-[hsla(140,40%,15%,0.3)] text-[hsl(140,60%,55%)]"
                : "bg-[hsla(0,40%,15%,0.3)] text-[hsl(0,60%,55%)]"
            }`}>
              {verification.allPassed ? "ALL PASSED ✓" : "FAILURES"}
            </span>
          </div>
          <div className="space-y-1">
            {verification.tests.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                <span className={t.holds ? "text-[hsl(140,60%,55%)]" : "text-[hsl(0,60%,55%)]"}>
                  {t.holds ? "✓" : "✗"}
                </span>
                <span className="flex-1 text-[hsl(210,10%,60%)]">{t.name}</span>
                <span className="text-[hsl(210,10%,40%)]">{t.actual}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
