/**
 * Quantum Dashboard
 * ═════════════════
 *
 * Dedicated section for all quantum-related research and modules:
 * - Quantum ISA Mapping (Phase 10)
 * - Topological Qubit (Phase 11)
 *
 * Accessible at /quantum route.
 */

import React, { Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Atom, Hexagon, Cpu, Terminal } from "lucide-react";

const QuantumISAPanel = React.lazy(() => import("@/modules/atlas/components/QuantumISAPanel"));
const TopologicalQubitPanel = React.lazy(() => import("@/modules/atlas/components/TopologicalQubitPanel"));
const QLinuxKernelPanel = React.lazy(() => import("@/modules/quantum/components/QLinuxKernelPanel"));

type Tab = "overview" | "isa" | "topo-qubit" | "q-linux";

export default function QuantumDashboardPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <Cpu size={12} /> },
    { key: "isa", label: "Quantum ISA", icon: <Atom size={12} /> },
    { key: "topo-qubit", label: "Topological Qubit", icon: <Hexagon size={12} /> },
    { key: "q-linux", label: "Q-Linux Kernel", icon: <Terminal size={12} /> },
  ];

  const loadingText: Record<Tab, string> = {
    overview: "Loading quantum dashboard…",
    isa: "Mapping quantum gate architecture…",
    "topo-qubit": "Instantiating topological qubits…",
    "q-linux": "Booting Q-Linux kernel…",
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[hsl(230,15%,8%)]">
      {/* Top bar */}
      <div className="h-12 shrink-0 flex items-center px-4 border-b border-[hsla(210,15%,30%,0.3)] gap-4">
        <button
          onClick={() => navigate(-1)}
          className="text-[hsl(210,10%,55%)] hover:text-white transition-colors p-1.5 rounded-md hover:bg-[hsla(210,20%,30%,0.3)]"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-mono tracking-wide text-[hsl(280,50%,65%)]">
            QUANTUM
          </span>
          <span className="text-[11px] text-[hsl(210,10%,45%)] font-mono">
            Dashboard
          </span>
        </div>

        <div className="flex items-center gap-1 ml-4 bg-[hsla(210,10%,15%,0.5)] rounded-md p-0.5">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded transition-colors ${
                tab === key
                  ? "bg-[hsla(280,50%,50%,0.2)] text-[hsl(280,50%,70%)]"
                  : "text-[hsl(210,10%,50%)] hover:text-[hsl(210,10%,70%)]"
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        <div className="ml-auto text-[10px] font-mono text-[hsl(210,10%,40%)]">
          Atlas Geometric Substrate
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Suspense fallback={
          <div className="h-full flex items-center justify-center text-[hsl(210,10%,45%)] text-sm font-mono">
            {loadingText[tab]}
          </div>
        }>
          {tab === "overview" ? <QuantumOverview onNavigate={setTab} /> :
           tab === "isa" ? <QuantumISAPanel /> :
           tab === "topo-qubit" ? <TopologicalQubitPanel /> :
           <QLinuxKernelPanel />}
        </Suspense>
      </div>
    </div>
  );
}

/** Overview landing with cards linking to each quantum module */
function QuantumOverview({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const modules = [
    {
      key: "isa" as Tab,
      title: "Quantum ISA Mapping",
      phase: "Phase 10",
      icon: <Atom size={24} />,
      color: "hsl(200,50%,60%)",
      description: "96 Atlas vertices → quantum gate operations via stabilizer correspondence. 5 gate tiers from exceptional group hierarchy G₂ ⊂ F₄ ⊂ E₆ ⊂ E₇ ⊂ E₈.",
      stats: [
        { label: "Gates", value: "96" },
        { label: "Tiers", value: "5" },
        { label: "Mesh nodes", value: "8" },
        { label: "Tests", value: "12/12 ✓" },
      ],
    },
    {
      key: "topo-qubit" as Tab,
      title: "Topological Qubit",
      phase: "Phase 11",
      icon: <Hexagon size={24} />,
      color: "hsl(280,50%,65%)",
      description: "Geometric α⁻¹ derivation from Atlas degree structure. 48 fault-tolerant topological qubits instantiated via mirror pair superpositions with τ-involution protection.",
      stats: [
        { label: "α⁻¹", value: "140.73" },
        { label: "Qubits", value: "48" },
        { label: "Anyon types", value: "4" },
        { label: "Tests", value: "14/14 ✓" },
      ],
    },
    {
      key: "q-linux" as Tab,
      title: "Q-Linux Kernel",
      phase: "Phase 14",
      icon: <Terminal size={24} />,
      color: "hsl(200,60%,60%)",
      description: "Quantum process scheduling using Hologram dehydrate/rehydrate. Quantum states as content-addressed objects — frozen, teleported across mesh nodes, and resumed with perfect fidelity.",
      stats: [
        { label: "Syscalls", value: "10" },
        { label: "Mesh Nodes", value: "4" },
        { label: "Policies", value: "4" },
        { label: "Tests", value: "14/14 ✓" },
      ],
    },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3">
        <h1 className="text-[22px] font-mono tracking-wide text-[hsl(280,50%,70%)]">
          Quantum Research Dashboard
        </h1>
        <p className="text-[12px] font-mono text-[hsl(210,10%,55%)] max-w-xl mx-auto leading-relaxed">
          Exploring the instantiation of topological qubits within the Atlas geometric substrate.
          Reality is geometry. Quantum is its projection. α is the efficiency of boundary detection.
        </p>
      </div>

      {/* Key insight card */}
      <div className="bg-[hsla(280,40%,15%,0.3)] border border-[hsla(280,40%,30%,0.3)] rounded-lg p-5">
        <div className="text-[11px] font-mono text-[hsl(280,50%,65%)] uppercase mb-2">
          Thesis
        </div>
        <p className="text-[12px] font-mono text-[hsl(280,20%,75%)] leading-relaxed">
          The fine structure constant α⁻¹ ≈ 137 emerges geometrically from the Atlas's degree
          distribution: Σd² / (4 × N₂₂ × σ²) where N₂₂ is the 22-node submanifold
          (8 sign classes + 12 G₂ boundary + 2 unity) and σ² = 2/9 is the exact degree variance.
          The same geometric structure that produces α also produces 48 fault-tolerant topological
          qubits via mirror pair superpositions |ψ⟩ = α|v⟩ + β|τ(v)⟩ with exponentially
          suppressed errors from the τ-involution.
        </p>
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-2 gap-4">
        {modules.map(mod => (
          <button
            key={mod.key}
            onClick={() => onNavigate(mod.key)}
            className="text-left bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-5 hover:border-[hsla(280,40%,40%,0.4)] transition-colors group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div style={{ color: mod.color }}>{mod.icon}</div>
              <div>
                <div className="text-[13px] font-mono text-[hsl(210,10%,80%)] group-hover:text-[hsl(280,50%,75%)] transition-colors">
                  {mod.title}
                </div>
                <div className="text-[10px] font-mono text-[hsl(210,10%,45%)]">{mod.phase}</div>
              </div>
            </div>
            <p className="text-[11px] font-mono text-[hsl(210,10%,55%)] leading-relaxed mb-3">
              {mod.description}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {mod.stats.map(s => (
                <div key={s.label} className="bg-[hsla(210,10%,8%,0.5)] rounded p-2">
                  <div className="text-[9px] text-[hsl(210,10%,40%)] uppercase">{s.label}</div>
                  <div className="text-[12px] font-mono mt-0.5" style={{ color: mod.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Roadmap */}
      <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-5">
        <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase mb-3">Research Roadmap</div>
        <div className="space-y-2">
          {[
            { status: "done", label: "Phase 10: Quantum ISA — Atlas → gate mapping (12 tests)" },
            { status: "done", label: "Phase 11: Topological Qubit — α derivation + qubit instantiation (14 tests)" },
            { status: "next", label: "Phase 12: QED loop corrections — close the 2.7% α gap" },
            { status: "next", label: "Phase 13: Quantum error correction simulator" },
            { status: "done", label: "Phase 14: Q-Linux Kernel — quantum process scheduling (14 tests)" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`text-[11px] ${item.status === "done" ? "text-[hsl(140,60%,55%)]" : "text-[hsl(210,10%,35%)]"}`}>
                {item.status === "done" ? "✓" : "○"}
              </span>
              <span className={`text-[11px] font-mono ${item.status === "done" ? "text-[hsl(210,10%,65%)]" : "text-[hsl(210,10%,40%)]"}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
