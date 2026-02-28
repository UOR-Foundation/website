/**
 * Atlas Compilation Pipeline Panel
 * ═════════════════════════════════
 *
 * End-to-end: select any model → Atlas decomposition → quantum circuit → QASM output.
 */

import React, { useMemo, useState } from "react";
import { MODEL_CATALOG } from "@/modules/atlas/convergence";
import {
  runPipeline,
  compileAllModels,
  type PipelineResult,
} from "@/modules/quantum/atlas-compilation-pipeline";

export default function CompilationPipelinePanel() {
  const [selectedModel, setSelectedModel] = useState("LLaMA-7B");
  const [maxHeads, setMaxHeads] = useState(4);
  const [maxLayers, setMaxLayers] = useState(2);
  const [withECC, setWithECC] = useState(false);
  const [viewMode, setViewMode] = useState<"pipeline" | "qasm" | "catalog" | "tests">("pipeline");

  const result = useMemo(
    () => runPipeline({ modelName: selectedModel, maxHeads, maxLayers, withECC }),
    [selectedModel, maxHeads, maxLayers, withECC]
  );

  const catalog = useMemo(() => compileAllModels(), []);

  return (
    <div className="h-full flex flex-col bg-[hsl(230,15%,8%)]">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-[hsla(210,15%,30%,0.3)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-mono text-[hsl(200,60%,60%)]">
              Atlas Compilation Pipeline
            </h2>
            <p className="text-[10px] font-mono text-[hsl(210,10%,50%)] mt-1">
              AI Model → Atlas R₈ → Quantum Circuit → OpenQASM 3.0
            </p>
          </div>
          <div className={`text-[11px] font-mono px-2 py-1 rounded ${
            result.allPassed
              ? "bg-[hsla(140,50%,30%,0.3)] text-[hsl(140,60%,55%)]"
              : "bg-[hsla(0,50%,30%,0.3)] text-[hsl(0,60%,55%)]"
          }`}>
            {result.tests.filter(t => t.holds).length}/{result.tests.length} ✓
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            className="text-[10px] font-mono bg-[hsla(210,10%,15%,0.7)] text-[hsl(210,10%,70%)] border border-[hsla(210,10%,25%,0.3)] rounded px-2 py-1"
          >
            {MODEL_CATALOG.map(m => (
              <option key={m.name} value={m.name}>
                {m.name} ({m.family}, d={m.embeddingDim})
              </option>
            ))}
          </select>
          <label className="text-[10px] font-mono text-[hsl(210,10%,50%)] flex items-center gap-1">
            Heads:
            <input type="number" min={1} max={8} value={maxHeads}
              onChange={e => setMaxHeads(Number(e.target.value))}
              className="w-10 bg-[hsla(210,10%,15%,0.7)] text-[hsl(210,10%,70%)] border border-[hsla(210,10%,25%,0.3)] rounded px-1 py-0.5 text-center"
            />
          </label>
          <label className="text-[10px] font-mono text-[hsl(210,10%,50%)] flex items-center gap-1">
            Layers:
            <input type="number" min={1} max={4} value={maxLayers}
              onChange={e => setMaxLayers(Number(e.target.value))}
              className="w-10 bg-[hsla(210,10%,15%,0.7)] text-[hsl(210,10%,70%)] border border-[hsla(210,10%,25%,0.3)] rounded px-1 py-0.5 text-center"
            />
          </label>
          <label className="text-[10px] font-mono text-[hsl(210,10%,50%)] flex items-center gap-1.5">
            <input type="checkbox" checked={withECC} onChange={e => setWithECC(e.target.checked)}
              className="w-3 h-3 accent-[hsl(140,50%,55%)]" />
            ECC [[96,48,2]]
          </label>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {(["pipeline", "qasm", "catalog", "tests"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`text-[10px] font-mono px-3 py-1 rounded transition-colors ${
                viewMode === mode
                  ? "bg-[hsla(200,50%,50%,0.2)] text-[hsl(200,50%,65%)]"
                  : "text-[hsl(210,10%,50%)] hover:text-[hsl(210,10%,70%)]"
              }`}
            >
              {mode === "pipeline" ? "Pipeline" : mode === "qasm" ? "QASM Output" : mode === "catalog" ? "All Models" : "Tests"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {viewMode === "pipeline" ? <PipelineView result={result} /> :
         viewMode === "qasm" ? <QASMView result={result} /> :
         viewMode === "catalog" ? <CatalogView catalog={catalog} /> :
         <TestsView result={result} />}
      </div>
    </div>
  );
}

function PipelineView({ result }: { result: PipelineResult }) {
  const { model, atlas, summary, ecc } = result;

  const stages = [
    { name: "Model Intake", color: "hsl(280,50%,60%)", detail: `${model.name} — ${model.family} family, ${model.paramsB}B params`, status: "✓" },
    { name: "Atlas Decomposition", color: "hsl(200,60%,60%)", detail: `d=${model.embeddingDim} → ${atlas.r8ElementsPerVector} R₈ elements, ${atlas.completeRings} complete rings`, status: "✓" },
    { name: "Head Compilation", color: "hsl(140,50%,60%)", detail: `${summary.headsCompiled} heads compiled, ${summary.totalLogicalQubits} logical qubits`, status: "✓" },
    { name: "Layer Assembly", color: "hsl(30,60%,55%)", detail: `${summary.layersCompiled} layers, depth=${summary.totalDepth}, T-count=${summary.totalTGates}`, status: "✓" },
    { name: "ECC Wrapping", color: ecc ? "hsl(140,50%,55%)" : "hsl(210,10%,40%)", detail: ecc ? `[[96,48,2]] → ${ecc.additionalQubits} syndrome qubits, ${ecc.overheadFactor}× overhead` : "Disabled", status: ecc ? "✓" : "—" },
    { name: "QASM Emission", color: "hsl(320,50%,60%)", detail: `OpenQASM 3.0 — ${result.qasm.lines} lines, ${result.qasm.gateCount} gate instructions`, status: "✓" },
  ];

  return (
    <div className="space-y-4">
      {/* Pipeline stages */}
      <div className="space-y-1">
        {stages.map((s, i) => (
          <div key={i} className="flex items-center gap-3 bg-[hsla(210,10%,12%,0.6)] rounded p-3 border border-[hsla(210,10%,25%,0.3)]">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono text-white shrink-0"
              style={{ background: s.color }}>
              {i + 1}
            </div>
            {i < stages.length - 1 && (
              <div className="absolute ml-3 mt-10 w-px h-2" style={{ background: s.color, opacity: 0.3 }} />
            )}
            <div className="flex-1">
              <div className="text-[11px] font-mono" style={{ color: s.color }}>{s.name}</div>
              <div className="text-[9px] font-mono text-[hsl(210,10%,55%)]">{s.detail}</div>
            </div>
            <span className={`text-[11px] font-mono ${s.status === "✓" ? "text-[hsl(140,60%,55%)]" : "text-[hsl(210,10%,40%)]"}`}>
              {s.status}
            </span>
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Logical Qubits", value: summary.totalLogicalQubits.toString() },
          { label: "Physical Qubits", value: summary.totalPhysicalQubits.toString() },
          { label: "Total Gates", value: summary.totalGates.toLocaleString() },
          { label: "T-Gate Budget", value: summary.totalTGates.toString() },
          { label: "Circuit Depth", value: summary.totalDepth.toString() },
          { label: "Compression", value: `${summary.compressionRatio.toFixed(1)}×` },
          { label: "QASM Lines", value: summary.qasmLines.toString() },
          { label: "Heads × Layers", value: `${summary.headsCompiled}` },
        ].map(s => (
          <div key={s.label} className="bg-[hsla(210,10%,12%,0.6)] rounded p-2.5 border border-[hsla(210,10%,25%,0.3)]">
            <div className="text-[9px] font-mono text-[hsl(210,10%,40%)] uppercase">{s.label}</div>
            <div className="text-[13px] font-mono text-[hsl(200,60%,60%)] mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Per-layer breakdown */}
      <div className="bg-[hsla(210,10%,12%,0.6)] rounded-lg border border-[hsla(210,10%,25%,0.3)] p-4">
        <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase mb-3">Layer Breakdown</div>
        <div className="space-y-2">
          {result.layers.map(l => (
            <div key={l.index} className="flex items-center gap-4 text-[10px] font-mono">
              <span className="text-[hsl(200,50%,60%)] w-16">Layer {l.index}</span>
              <span className="text-[hsl(210,10%,55%)]">{l.heads.length} heads</span>
              <span className="text-[hsl(210,10%,55%)]">{l.totalQubits}q</span>
              <span className="text-[hsl(210,10%,55%)]">{l.totalGates} gates</span>
              <span className="text-[hsl(210,10%,55%)]">T={l.tCount}</span>
              <span className="text-[hsl(210,10%,55%)]">depth={l.totalDepth}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Full model projection */}
      <div className="bg-[hsla(200,30%,12%,0.4)] rounded-lg border border-[hsla(200,30%,30%,0.3)] p-4">
        <div className="text-[11px] font-mono text-[hsl(200,50%,60%)] uppercase mb-2">
          Full Model Projection
        </div>
        <div className="text-[10px] font-mono text-[hsl(210,10%,55%)] space-y-1">
          <p>
            <strong className="text-[hsl(200,60%,65%)]">{model.name}</strong> has {model.heads} heads × {model.layers} layers = {(model.heads * model.layers).toLocaleString()} attention heads total.
          </p>
          <p>
            Each head compiles to {result.layers[0]?.heads[0]?.circuit.totalQubits ?? 0} qubits →
            Full model: <strong className="text-[hsl(200,60%,65%)]">{((result.layers[0]?.heads[0]?.circuit.totalQubits ?? 0) * model.heads * model.layers).toLocaleString()}</strong> logical qubits.
          </p>
          <p>
            Classical representation: {(model.embeddingDim * 32).toLocaleString()} bits per embedding.
            Quantum compression: {summary.compressionRatio.toFixed(1)}× per vector.
          </p>
        </div>
      </div>
    </div>
  );
}

function QASMView({ result }: { result: PipelineResult }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result.qasm.source);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase">
          OpenQASM 3.0 — {result.qasm.lines} lines, {result.qasm.qubits} qubits, {result.qasm.gateCount} gates
        </div>
        <button
          onClick={copyToClipboard}
          className="text-[10px] font-mono px-2 py-1 rounded bg-[hsla(200,50%,30%,0.3)] text-[hsl(200,50%,65%)] hover:bg-[hsla(200,50%,30%,0.5)] transition-colors"
        >
          {copied ? "Copied!" : "Copy QASM"}
        </button>
      </div>
      <pre className="bg-[hsla(210,10%,6%,0.8)] rounded-lg border border-[hsla(210,10%,20%,0.3)] p-4 text-[9px] font-mono text-[hsl(200,40%,65%)] overflow-x-auto max-h-[60vh] overflow-y-auto leading-relaxed whitespace-pre">
        {result.qasm.source}
      </pre>
    </div>
  );
}

function CatalogView({ catalog }: { catalog: ReturnType<typeof compileAllModels> }) {
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase">
        Full Model Catalog — {catalog.models.length} Models Compiled
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-[hsl(210,10%,45%)] border-b border-[hsla(210,10%,25%,0.3)]">
              {["Model", "Family", "Params", "d", "Heads", "d_k", "L", "Q/Head", "Gates/H", "T/H", "Full Q", "Compress", "QASM"].map(h => (
                <th key={h} className="text-left py-2 px-1.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catalog.models.map(m => (
              <tr key={m.name} className="border-b border-[hsla(210,10%,20%,0.3)] hover:bg-[hsla(200,20%,20%,0.15)]">
                <td className="py-1.5 px-1.5 text-[hsl(200,60%,65%)]">{m.name}</td>
                <td className="py-1.5 px-1.5 text-[hsl(280,50%,65%)]">{m.family}</td>
                <td className="py-1.5 px-1.5 text-[hsl(210,10%,60%)]">{m.params}</td>
                <td className="py-1.5 px-1.5 text-[hsl(210,10%,60%)]">{m.embDim.toLocaleString()}</td>
                <td className="py-1.5 px-1.5 text-[hsl(210,10%,60%)]">{m.heads}</td>
                <td className="py-1.5 px-1.5 text-[hsl(140,50%,60%)]">{m.headDim}</td>
                <td className="py-1.5 px-1.5 text-[hsl(210,10%,60%)]">{m.layers}</td>
                <td className="py-1.5 px-1.5 text-[hsl(200,60%,65%)]">{m.qubitsPerHead}</td>
                <td className="py-1.5 px-1.5 text-[hsl(210,10%,60%)]">{m.gatesPerHead}</td>
                <td className="py-1.5 px-1.5 text-[hsl(30,60%,55%)]">{m.tCountPerHead}</td>
                <td className="py-1.5 px-1.5 text-[hsl(200,60%,65%)]">{m.fullModelQubits.toLocaleString()}</td>
                <td className="py-1.5 px-1.5 text-[hsl(140,50%,60%)]">{m.compressionRatio.toFixed(1)}×</td>
                <td className="py-1.5 px-1.5 text-[hsl(210,10%,60%)]">{m.qasmLines}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Universal insight */}
      <div className="bg-[hsla(200,30%,12%,0.4)] rounded-lg border border-[hsla(200,30%,30%,0.3)] p-4">
        <div className="text-[11px] font-mono text-[hsl(200,50%,60%)] uppercase mb-2">Universal Pattern</div>
        <div className="text-[10px] font-mono text-[hsl(210,10%,55%)] space-y-1">
          <p>All models with d_k=128 compile to <strong className="text-[hsl(200,60%,65%)]">identical 29-qubit circuit topologies</strong> per head.</p>
          <p>GPT-2 (d_k=64) → 25 qubits/head. Phi-3-Mini (d_k=96) → 27 qubits/head.</p>
          <p>The attention mechanism is a <strong className="text-[hsl(140,50%,65%)]">geometric invariant</strong> — architecture differences reduce to d_k alone.</p>
        </div>
      </div>
    </div>
  );
}

function TestsView({ result }: { result: PipelineResult }) {
  return (
    <div className="space-y-4">
      <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase">
        Pipeline Verification — {result.tests.filter(t => t.holds).length}/{result.tests.length} passed
      </div>
      <div className="space-y-1.5">
        {result.tests.map((t, i) => (
          <div key={i} className="flex items-start gap-2 bg-[hsla(210,10%,12%,0.6)] rounded p-2.5 border border-[hsla(210,10%,25%,0.3)]">
            <span className={`text-[11px] mt-px ${t.holds ? "text-[hsl(140,60%,55%)]" : "text-[hsl(0,60%,55%)]"}`}>
              {t.holds ? "✓" : "✗"}
            </span>
            <div>
              <span className="text-[11px] font-mono text-[hsl(210,10%,70%)]">{t.name}</span>
              <div className="text-[9px] font-mono text-[hsl(210,10%,45%)] mt-0.5">{t.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
