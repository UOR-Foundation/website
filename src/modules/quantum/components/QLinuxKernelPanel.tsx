/**
 * Q-Linux Kernel Dashboard Panel
 * ═══════════════════════════════
 *
 * Interactive visualization of the Q-Linux quantum process scheduler.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  QLinuxKernel,
  createDemoKernel,
  verifyQLinuxKernel,
  applyHadamard,
  stateNorm,
  type QLinuxVerification,
  type QuantumProcess,
  type TeleportRecord,
  type QuantumStateVector,
  type QProcessStatus,
} from "../q-linux-kernel";

const STATUS_COLORS: Record<QProcessStatus, string> = {
  superposition: "hsl(200,70%,55%)",
  entangled: "hsl(280,60%,60%)",
  frozen: "hsl(190,80%,50%)",
  teleporting: "hsl(40,90%,55%)",
  measured: "hsl(140,60%,50%)",
  halted: "hsl(0,50%,50%)",
};

export default function QLinuxKernelPanel() {
  const [kernel] = useState(() => createDemoKernel());
  const [verifications, setVerifications] = useState<QLinuxVerification[]>([]);
  const [processes, setProcesses] = useState<QuantumProcess[]>([]);
  const [teleportLog, setTeleportLog] = useState<TeleportRecord[]>([]);
  const [summary, setSummary] = useState(kernel.getSummary());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const snap = kernel.getSummary();
    setSummary(snap);
  }, [kernel]);

  useEffect(() => {
    (async () => {
      // Run verification suite
      const v = await verifyQLinuxKernel();
      setVerifications(v);

      // Populate demo processes
      const p1 = kernel.qexec(2, "node:alpha");
      const p2 = kernel.qexec(1, "node:beta");
      const p3 = kernel.qexec(3, "node:gamma");
      kernel.qfork(p1.pid);
      kernel.qentangle(p2.pid, p3.pid);

      // Apply gate to p3
      const proc3 = kernel.getProcess(p3.pid)!;
      (proc3 as { state: QuantumStateVector }).state = applyHadamard(proc3.state);

      // Teleport p2
      const tele = await kernel.qteleport(p2.pid, "node:delta");
      if (tele) setTeleportLog([tele]);

      // Freeze one
      await kernel.qfreeze(p1.pid);

      // Collect live processes
      const snap = await kernel.snapshot();
      setProcesses(Array.from(snap.processes.values()));
      setSummary(kernel.getSummary());
      setLoading(false);
    })();
  }, [kernel]);

  const passed = verifications.filter(v => v.passed).length;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-[hsl(210,10%,45%)] text-sm font-mono">
        Booting Q-Linux kernel…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-mono tracking-wide text-[hsl(200,60%,65%)]">
            Q-Linux Kernel
          </h2>
          <p className="text-[11px] font-mono text-[hsl(210,10%,50%)] mt-1">
            Quantum process scheduling via Hologram dehydrate/rehydrate
          </p>
        </div>
        <div className="text-[10px] font-mono text-[hsl(210,10%,40%)]">
          Phase 14 • {summary.processCount} processes • {summary.nodeCount} mesh nodes
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: "Processes", value: summary.processCount, color: "hsl(200,60%,60%)" },
          { label: "Teleports", value: summary.totalTeleports, color: "hsl(40,90%,55%)" },
          { label: "Measurements", value: summary.totalMeasurements, color: "hsl(140,60%,50%)" },
          { label: "Utilization", value: `${(summary.utilization * 100).toFixed(1)}%`, color: "hsl(280,60%,60%)" },
          { label: "Mesh Nodes", value: summary.nodeCount, color: "hsl(190,80%,50%)" },
          { label: "Policy", value: summary.policy, color: "hsl(210,10%,60%)" },
        ].map(s => (
          <div key={s.label} className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-3">
            <div className="text-[9px] font-mono text-[hsl(210,10%,40%)] uppercase">{s.label}</div>
            <div className="text-[14px] font-mono mt-1" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Syscall table */}
        <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
          <div className="text-[11px] font-mono text-[hsl(200,60%,65%)] uppercase mb-3">
            Quantum Syscall Interface
          </div>
          <div className="space-y-1.5">
            {[
              ["qexec(n)", "Spawn n-qubit process on mesh"],
              ["qfork(pid)", "Clone + Bell-pair entangle"],
              ["qfreeze(pid)", "Dehydrate → CID (measure-free)"],
              ["qteleport(pid,node)", "Freeze → route → resume"],
              ["qresume(cid)", "Rehydrate from canonical bytes"],
              ["qmeasure(pid)", "Collapse to computational basis"],
              ["qentangle(a,b)", "Create Bell pair between PIDs"],
              ["qbarrier()", "Wait for all quantum lanes"],
              ["qsched(policy)", "Set scheduling strategy"],
              ["qkill(pid)", "Terminate quantum process"],
            ].map(([syscall, desc]) => (
              <div key={syscall} className="flex items-center gap-3">
                <code className="text-[10px] font-mono text-[hsl(200,70%,60%)] bg-[hsla(200,40%,20%,0.3)] px-1.5 py-0.5 rounded w-[160px] shrink-0">
                  {syscall}
                </code>
                <span className="text-[10px] font-mono text-[hsl(210,10%,50%)]">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Process table */}
        <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
          <div className="text-[11px] font-mono text-[hsl(200,60%,65%)] uppercase mb-3">
            Process Table
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-5 gap-2 text-[9px] font-mono text-[hsl(210,10%,40%)] uppercase pb-1 border-b border-[hsla(210,10%,25%,0.2)]">
              <span>PID</span><span>Qubits</span><span>Status</span><span>Node</span><span>‖ψ‖²</span>
            </div>
            {processes.slice(0, 8).map(p => (
              <div key={p.pid} className="grid grid-cols-5 gap-2 text-[10px] font-mono py-0.5">
                <span className="text-[hsl(210,10%,60%)] truncate">{p.pid.slice(5, 13)}</span>
                <span className="text-[hsl(200,60%,60%)]">{p.state.numQubits}</span>
                <span style={{ color: STATUS_COLORS[p.status] }}>{p.status}</span>
                <span className="text-[hsl(210,10%,50%)]">{p.meshNode.split(":")[1]}</span>
                <span className="text-[hsl(140,60%,50%)]">{stateNorm(p.state).toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Teleport log */}
      {teleportLog.length > 0 && (
        <div className="bg-[hsla(40,30%,12%,0.4)] border border-[hsla(40,40%,30%,0.3)] rounded-lg p-4">
          <div className="text-[11px] font-mono text-[hsl(40,80%,60%)] uppercase mb-2">
            Teleport Log
          </div>
          {teleportLog.map(t => (
            <div key={t.teleportId} className="flex items-center gap-3 text-[10px] font-mono">
              <span className="text-[hsl(40,80%,55%)]">{t.sourceNode.split(":")[1]}</span>
              <span className="text-[hsl(210,10%,40%)]">→</span>
              <span className="text-[hsl(40,80%,55%)]">{t.targetNode.split(":")[1]}</span>
              <span className="text-[hsl(210,10%,45%)]">|</span>
              <span className="text-[hsl(210,10%,50%)]">CID: {t.cid.slice(0, 16)}…</span>
              <span className="text-[hsl(210,10%,45%)]">|</span>
              <span className="text-[hsl(190,70%,55%)]">{t.latencyMs}ms</span>
              <span className="text-[hsl(210,10%,45%)]">|</span>
              <span className="text-[hsl(140,60%,50%)]">F={t.fidelityAfter.toFixed(4)}</span>
              <span className="text-[hsl(210,10%,45%)]">|</span>
              <span className="text-[hsl(280,50%,60%)]">Bell pair ✓</span>
            </div>
          ))}
        </div>
      )}

      {/* Verification tests */}
      <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-mono text-[hsl(200,60%,65%)] uppercase">
            Kernel Verification Suite
          </div>
          <div className={`text-[11px] font-mono ${passed === verifications.length ? "text-[hsl(140,60%,55%)]" : "text-[hsl(40,80%,55%)]"}`}>
            {passed}/{verifications.length} passed
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {verifications.map((v, i) => (
            <div key={i} className="flex items-start gap-2 py-0.5">
              <span className={`text-[10px] mt-0.5 ${v.passed ? "text-[hsl(140,60%,55%)]" : "text-[hsl(0,60%,55%)]"}`}>
                {v.passed ? "✓" : "✗"}
              </span>
              <div>
                <div className="text-[10px] font-mono text-[hsl(210,10%,65%)]">{v.name}</div>
                <div className="text-[9px] font-mono text-[hsl(210,10%,40%)]">{v.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture diagram */}
      <div className="bg-[hsla(200,20%,12%,0.4)] border border-[hsla(200,30%,25%,0.3)] rounded-lg p-4">
        <div className="text-[11px] font-mono text-[hsl(200,60%,65%)] uppercase mb-2">
          Dehydrate / Rehydrate Pattern
        </div>
        <pre className="text-[10px] font-mono text-[hsl(210,10%,55%)] leading-relaxed whitespace-pre">
{`  ┌─────────────┐    qfreeze     ┌──────────────┐    IPv6 mesh    ┌──────────────┐    qresume     ┌─────────────┐
  │  |ψ⟩ active  │ ─────────────→ │  CID: bafk…  │ ─────────────→ │  CID: bafk…  │ ─────────────→ │  |ψ⟩ active  │
  │  (evolving)  │   dehydrate    │  (canonical)  │   Bell pair    │  (canonical)  │   rehydrate    │  (evolving)  │
  └─────────────┘                 └──────────────┘   + classical   └──────────────┘                 └─────────────┘
       Node α                                                                                           Node γ
                                  ‖ψ‖² preserved · entanglement links intact · round-trip fidelity = 1.0`}
        </pre>
      </div>
    </div>
  );
}
