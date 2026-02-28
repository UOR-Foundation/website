/**
 * Quantum-Native Attention Panel
 * ═══════════════════════════════
 *
 * Interactive visualization of transformer attention → quantum circuit compilation.
 */

import React, { useState, useMemo } from "react";
import { MODEL_CATALOG } from "@/modules/atlas/convergence";
import {
  compileAttentionHead,
  headSpecFromModel,
  compileCatalogSummary,
  runQuantumAttentionAnalysis,
  type QuantumAttentionCircuit,
  type AttentionCatalogSummary,
  type UniversalAttentionInsight,
} from "@/modules/quantum/quantum-native-attention";

export default function QuantumAttentionPanel() {
  const [selectedModel, setSelectedModel] = useState(MODEL_CATALOG[0].name);
  const [viewMode, setViewMode] = useState<"circuit" | "catalog" | "insights">("circuit");

  const report = useMemo(() => runQuantumAttentionAnalysis(selectedModel), [selectedModel]);
  const circuit = report.detailedCircuit;

  return (
    <div className="h-full flex flex-col bg-[hsl(230,15%,8%)]">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-[hsla(210,15%,30%,0.3)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-mono text-[hsl(200,60%,65%)]">
              Quantum-Native Attention
            </h2>
            <p className="text-[10px] font-mono text-[hsl(210,10%,50%)] mt-1">
              Transformer attention head → quantum circuit via Atlas gate mapping + Euler ZYZ
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="bg-[hsla(210,10%,15%,0.8)] text-[11px] font-mono text-[hsl(210,10%,70%)] border border-[hsla(210,15%,30%,0.3)] rounded px-2 py-1"
            >
              {MODEL_CATALOG.map(m => (
                <option key={m.name} value={m.name}>{m.name} (d_k={m.headDim})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-1 mt-3">
          {(["circuit", "catalog", "insights"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`text-[10px] font-mono px-3 py-1 rounded transition-colors ${
                viewMode === mode
                  ? "bg-[hsla(200,50%,50%,0.2)] text-[hsl(200,60%,70%)]"
                  : "text-[hsl(210,10%,50%)] hover:text-[hsl(210,10%,70%)]"
              }`}
            >
              {mode === "circuit" ? "Circuit Detail" : mode === "catalog" ? "All Models" : "Universal Insights"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {viewMode === "circuit" ? (
          <CircuitDetailView circuit={circuit} />
        ) : viewMode === "catalog" ? (
          <CatalogView summary={report.catalogSummary} />
        ) : (
          <InsightsView insights={report.universalInsights} circuit={circuit} />
        )}
      </div>
    </div>
  );
}

/** Detailed single-circuit view */
function CircuitDetailView({ circuit }: { circuit: QuantumAttentionCircuit }) {
  const { head, stages, compiled, verification } = circuit;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-6 gap-2">
        {[
          { label: "Model", value: head.model },
          { label: "Head Dim", value: `d_k = ${head.headDim}` },
          { label: "Qubits", value: `${circuit.totalQubits}` },
          { label: "Gates", value: `${circuit.totalAbstractGates} → ${compiled.gateCountAfter}` },
          { label: "Depth", value: `${compiled.depth}` },
          { label: "T-count", value: `${compiled.tCount}` },
        ].map(s => (
          <div key={s.label} className="bg-[hsla(210,10%,12%,0.6)] rounded p-2.5 border border-[hsla(210,10%,25%,0.3)]">
            <div className="text-[9px] font-mono text-[hsl(210,10%,40%)] uppercase">{s.label}</div>
            <div className="text-[12px] font-mono text-[hsl(200,60%,65%)] mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Qubit layout diagram */}
      <div className="bg-[hsla(210,10%,12%,0.6)] rounded-lg border border-[hsla(210,10%,25%,0.3)] p-4">
        <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase mb-3">Qubit Layout</div>
        <div className="flex gap-1 items-center flex-wrap">
          {Array.from({ length: circuit.totalQubits }, (_, i) => {
            const n = circuit.encodingQubits;
            let color = "hsl(200,50%,50%)";
            let label = "Q";
            if (i >= n && i < 2 * n) { color = "hsl(30,70%,55%)"; label = "K"; }
            else if (i >= 2 * n && i < 3 * n) { color = "hsl(140,50%,50%)"; label = "V"; }
            else if (i === 3 * n) { color = "hsl(280,50%,60%)"; label = "A"; }
            else if (i > 3 * n) { color = "hsl(50,70%,55%)"; label = "O"; }
            return (
              <div
                key={i}
                className="flex flex-col items-center gap-0.5"
                title={`Qubit ${i}: ${label} register`}
              >
                <div
                  className="w-5 h-5 rounded-sm flex items-center justify-center text-[8px] font-mono text-white"
                  style={{ backgroundColor: color }}
                >
                  {label}
                </div>
                <span className="text-[8px] text-[hsl(210,10%,40%)]">{i}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-2 text-[9px] font-mono text-[hsl(210,10%,45%)]">
          <span>■ Q = Query</span>
          <span style={{ color: "hsl(30,70%,55%)" }}>■ K = Key</span>
          <span style={{ color: "hsl(140,50%,50%)" }}>■ V = Value</span>
          <span style={{ color: "hsl(280,50%,60%)" }}>■ A = Ancilla</span>
          <span style={{ color: "hsl(50,70%,55%)" }}>■ O = Output</span>
        </div>
      </div>

      {/* 4 Stages */}
      <div className="grid grid-cols-2 gap-3">
        {stages.map((stage, idx) => (
          <div
            key={idx}
            className="bg-[hsla(210,10%,12%,0.6)] rounded-lg border border-[hsla(210,10%,25%,0.3)] p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono text-[hsl(200,60%,65%)] bg-[hsla(200,50%,30%,0.3)] rounded px-1.5 py-0.5">
                Stage {idx + 1}
              </span>
              <span className="text-[11px] font-mono text-[hsl(210,10%,75%)]">{stage.name}</span>
            </div>
            <p className="text-[10px] font-mono text-[hsl(210,10%,50%)] mb-2">{stage.description}</p>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-[hsla(210,10%,8%,0.5)] rounded p-1.5">
                <div className="text-[8px] text-[hsl(210,10%,40%)]">Gates</div>
                <div className="text-[11px] font-mono text-[hsl(200,60%,65%)]">{stage.gates.length}</div>
              </div>
              <div className="bg-[hsla(210,10%,8%,0.5)] rounded p-1.5">
                <div className="text-[8px] text-[hsl(210,10%,40%)]">Qubits</div>
                <div className="text-[11px] font-mono text-[hsl(200,60%,65%)]">{stage.qubitsUsed}</div>
              </div>
              <div className="bg-[hsla(210,10%,8%,0.5)] rounded p-1.5">
                <div className="text-[8px] text-[hsl(210,10%,40%)]">Atlas</div>
                <div className="text-[10px] font-mono text-[hsl(280,50%,65%)]">{stage.atlasMapping}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline visualization */}
      <div className="bg-[hsla(200,30%,12%,0.4)] rounded-lg border border-[hsla(200,30%,30%,0.3)] p-4">
        <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase mb-3">
          Compilation Pipeline: softmax(Q·K^T/√d_k)·V → Atlas Quantum Circuit
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono overflow-x-auto pb-1">
          {[
            { label: "Q,K,V", sub: `ℝ^${head.headDim}`, color: "hsl(200,50%,50%)" },
            { label: "→", sub: "", color: "hsl(210,10%,40%)" },
            { label: "Amp. Encode", sub: `${circuit.encodingQubits}q × 3`, color: "hsl(200,60%,65%)" },
            { label: "→", sub: "", color: "hsl(210,10%,40%)" },
            { label: "Swap Test", sub: "|⟨Q|K⟩|²", color: "hsl(30,70%,55%)" },
            { label: "→", sub: "", color: "hsl(210,10%,40%)" },
            { label: "Scale", sub: `1/√${head.headDim}`, color: "hsl(280,50%,60%)" },
            { label: "→", sub: "", color: "hsl(210,10%,40%)" },
            { label: "V·Attn", sub: "CRy chain", color: "hsl(140,50%,50%)" },
            { label: "→", sub: "", color: "hsl(210,10%,40%)" },
            { label: "Atlas Gates", sub: `${compiled.gateCountAfter}`, color: "hsl(50,70%,55%)" },
          ].map((step, i) => (
            <span key={i} style={{ color: step.color }}>
              {step.label}{step.sub ? <span className="text-[8px] ml-0.5 opacity-70">({step.sub})</span> : null}
            </span>
          ))}
        </div>
      </div>

      {/* Verification */}
      <div className="bg-[hsla(210,10%,12%,0.6)] rounded-lg border border-[hsla(210,10%,25%,0.3)] p-4">
        <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase mb-3">
          Structural Verification ({verification.filter(v => v.holds).length}/{verification.length})
        </div>
        <div className="space-y-1.5">
          {verification.map((v, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`text-[11px] mt-px ${v.holds ? "text-[hsl(140,60%,55%)]" : "text-[hsl(0,60%,55%)]"}`}>
                {v.holds ? "✓" : "✗"}
              </span>
              <div>
                <span className="text-[11px] font-mono text-[hsl(210,10%,70%)]">{v.name}</span>
                <span className="text-[10px] font-mono text-[hsl(210,10%,45%)] ml-2">{v.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Cross-model catalog comparison */
function CatalogView({ summary }: { summary: AttentionCatalogSummary[] }) {
  return (
    <div className="space-y-4">
      <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase">
        Quantum Circuit Compilation — All {summary.length} Models
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] font-mono">
          <thead>
            <tr className="text-[hsl(210,10%,45%)] border-b border-[hsla(210,10%,25%,0.3)]">
              {["Model", "d_k", "Heads", "Enc Q", "Total Q", "Abstract", "Compiled", "Depth", "T-count", "Compress", "✓"].map(h => (
                <th key={h} className="text-left py-2 px-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.map(s => (
              <tr key={s.model} className="border-b border-[hsla(210,10%,20%,0.3)] hover:bg-[hsla(200,20%,20%,0.2)]">
                <td className="py-1.5 px-2 text-[hsl(200,60%,65%)]">{s.model}</td>
                <td className="py-1.5 px-2 text-[hsl(210,10%,70%)]">{s.headDim}</td>
                <td className="py-1.5 px-2 text-[hsl(210,10%,60%)]">{s.totalHeads}</td>
                <td className="py-1.5 px-2 text-[hsl(280,50%,65%)]">{s.encodingQubits}</td>
                <td className="py-1.5 px-2 text-[hsl(280,50%,65%)]">{s.totalCircuitQubits}</td>
                <td className="py-1.5 px-2 text-[hsl(210,10%,60%)]">{s.abstractGates}</td>
                <td className="py-1.5 px-2 text-[hsl(30,70%,55%)]">{s.compiledGates}</td>
                <td className="py-1.5 px-2 text-[hsl(210,10%,60%)]">{s.circuitDepth}</td>
                <td className="py-1.5 px-2 text-[hsl(210,10%,60%)]">{s.tCount}</td>
                <td className="py-1.5 px-2 text-[hsl(140,50%,55%)]">{s.compressionRatio.toFixed(0)}×</td>
                <td className="py-1.5 px-2">
                  <span className={s.allVerified ? "text-[hsl(140,60%,55%)]" : "text-[hsl(0,60%,55%)]"}>
                    {s.allVerified ? "✓" : "✗"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Key observation */}
      <div className="bg-[hsla(200,30%,12%,0.4)] rounded-lg border border-[hsla(200,30%,30%,0.3)] p-4">
        <div className="text-[11px] font-mono text-[hsl(200,60%,65%)] mb-2">Key Observation</div>
        <p className="text-[10px] font-mono text-[hsl(210,10%,55%)] leading-relaxed">
          All models with d_k = 128 (GPT-3, GPT-4, LLaMA, Gemini, Claude, Mistral, Qwen) compile to
          <strong className="text-[hsl(280,50%,65%)]"> identical quantum circuit topologies</strong> — same
          qubit count, same gate structure, same depth. The attention mechanism IS universal; only the
          classical weights differ. The quantum circuit is the invariant.
        </p>
      </div>
    </div>
  );
}

/** Universal insights view */
function InsightsView({ insights, circuit }: { insights: UniversalAttentionInsight[]; circuit: QuantumAttentionCircuit }) {
  return (
    <div className="space-y-4">
      <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase">
        Universal Structural Insights
      </div>

      {insights.map((insight, i) => (
        <div
          key={i}
          className="bg-[hsla(210,10%,12%,0.6)] rounded-lg border border-[hsla(210,10%,25%,0.3)] p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[11px] ${insight.holds ? "text-[hsl(140,60%,55%)]" : "text-[hsl(0,60%,55%)]"}`}>
              {insight.holds ? "✓" : "✗"}
            </span>
            <span className="text-[12px] font-mono text-[hsl(200,60%,65%)]">{insight.name}</span>
          </div>
          <p className="text-[10px] font-mono text-[hsl(210,10%,55%)] leading-relaxed mb-2">
            {insight.description}
          </p>
          <div className="text-[9px] font-mono text-[hsl(210,10%,40%)] bg-[hsla(210,10%,8%,0.5)] rounded p-2">
            {insight.evidence}
          </div>
        </div>
      ))}

      {/* The big picture */}
      <div className="bg-[hsla(280,30%,12%,0.4)] rounded-lg border border-[hsla(280,30%,30%,0.3)] p-4">
        <div className="text-[11px] font-mono text-[hsl(280,50%,65%)] uppercase mb-2">
          The Convergence
        </div>
        <p className="text-[10px] font-mono text-[hsl(280,20%,75%)] leading-relaxed">
          A single transformer attention head — the fundamental unit of modern AI — compiles into a
          quantum circuit of just <strong>{circuit.totalQubits} qubits</strong> through the Atlas
          substrate. The same geometric structure (96 vertices, 256 edges, 48 mirror pairs) that
          produces the exceptional Lie groups also produces the gate set for quantum attention.
          Geometry is the bridge: classical attention is a projection of quantum computation,
          and both are reflections of the Atlas.
        </p>
      </div>
    </div>
  );
}
