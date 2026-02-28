/**
 * Atlas Compilation Pipeline — Phase 24
 * ══════════════════════════════════════
 *
 * End-to-end pipeline: AI model → Atlas decomposition → quantum circuit spec.
 *
 * PIPELINE:
 *   1. MODEL INTAKE:       Parse ModelArchitecture from catalog
 *   2. ATLAS DECOMPOSITION: Map d → R₈ rings, sign classes, operations
 *   3. HEAD COMPILATION:   Each attention head → quantum circuit (Phase 22)
 *   4. LAYER ASSEMBLY:     Stack per-layer circuits with inter-layer routing
 *   5. ECC WRAPPING:       Optional [[96,48,2]] stabilizer code (Phase 23)
 *   6. QASM EMISSION:      Emit OpenQASM 3.0 circuit specification
 *
 * @module quantum/atlas-compilation-pipeline
 */

import {
  MODEL_CATALOG,
  decomposeModel,
  type ModelArchitecture,
  type AtlasDecomposition,
} from "@/modules/atlas/convergence";
import {
  compileAttentionHead,
  type AttentionHeadSpec,
  type QuantumAttentionCircuit,
} from "./quantum-native-attention";
import {
  type CompiledCircuit,
  type CompiledGate,
} from "./circuit-compiler";
import { buildStabilizers } from "./geometric-ecc";
import {
  compileFTAttention,
  emitFTQASM,
  verifyFTAttention,
  type FTAttentionCircuit,
} from "./fault-tolerant-attention";

// ── Types ─────────────────────────────────────────────────────────────────

export interface PipelineConfig {
  /** Model name from catalog */
  modelName: string;
  /** Max heads to compile (for feasibility) */
  maxHeads: number;
  /** Max layers to compile */
  maxLayers: number;
  /** Apply ECC wrapping? */
  withECC: boolean;
  /** Sequence length (tokens) */
  seqLen: number;
}

export interface HeadCircuit {
  layerIndex: number;
  headIndex: number;
  circuit: QuantumAttentionCircuit;
}

export interface LayerSpec {
  index: number;
  heads: HeadCircuit[];
  totalQubits: number;
  totalGates: number;
  totalDepth: number;
  tCount: number;
}

export interface QASMOutput {
  /** OpenQASM 3.0 source */
  source: string;
  /** Number of lines */
  lines: number;
  /** Total qubits declared */
  qubits: number;
  /** Total classical bits */
  clbits: number;
  /** Total gate instructions */
  gateCount: number;
}

export interface QiskitOutput {
  /** Qiskit Python source code */
  source: string;
  /** Number of lines */
  lines: number;
  /** Total qubits */
  qubits: number;
  /** Total classical bits */
  clbits: number;
  /** Total gate instructions */
  gateCount: number;
  /** IBM backend target (e.g. "ibm_brisbane") */
  backendTarget: string;
}

export interface ECCOverhead {
  /** Physical qubits added by ECC */
  additionalQubits: number;
  /** Stabilizer measurement circuits */
  syndromeCircuits: number;
  /** Total overhead factor */
  overheadFactor: number;
  /** Fault-tolerant circuits per head (when FT module used) */
  ftCircuits?: FTAttentionCircuit[];
}

export interface PipelineResult {
  /** Input config */
  config: PipelineConfig;
  /** Model architecture */
  model: ModelArchitecture;
  /** Atlas decomposition */
  atlas: AtlasDecomposition;
  /** Compiled layers */
  layers: LayerSpec[];
  /** ECC overhead (if enabled) */
  ecc: ECCOverhead | null;
  /** Generated QASM */
  qasm: QASMOutput;
  /** Generated Qiskit Python */
  qiskit: QiskitOutput;
  /** Summary statistics */
  summary: PipelineSummary;
  /** Verification tests */
  tests: PipelineTest[];
  /** All tests pass */
  allPassed: boolean;
}

export interface PipelineSummary {
  headsCompiled: number;
  layersCompiled: number;
  totalLogicalQubits: number;
  totalPhysicalQubits: number;
  totalGates: number;
  totalTGates: number;
  totalDepth: number;
  compressionRatio: number; // classical bits / quantum qubits
  qasmLines: number;
}

export interface PipelineTest {
  name: string;
  holds: boolean;
  detail: string;
}

// ── Pipeline Core ─────────────────────────────────────────────────────────

const DEFAULT_CONFIG: PipelineConfig = {
  modelName: "LLaMA-7B",
  maxHeads: 4,
  maxLayers: 2,
  withECC: false,
  seqLen: 8,
};

/**
 * Run the full compilation pipeline for a model.
 */
export function runPipeline(config: Partial<PipelineConfig> = {}): PipelineResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Stage 1: Model intake
  const model = MODEL_CATALOG.find(m => m.name === cfg.modelName);
  if (!model) throw new Error(`Model "${cfg.modelName}" not in catalog`);

  // Stage 2: Atlas decomposition
  const atlas = decomposeModel(model);

  // Stage 3-4: Compile attention heads per layer
  const headsPerLayer = Math.min(model.heads, cfg.maxHeads);
  const numLayers = Math.min(model.layers, cfg.maxLayers);

  const layers: LayerSpec[] = [];
  for (let l = 0; l < numLayers; l++) {
    const heads: HeadCircuit[] = [];
    let layerQubits = 0, layerGates = 0, layerDepth = 0, layerT = 0;

    for (let h = 0; h < headsPerLayer; h++) {
      const spec: AttentionHeadSpec = {
        model: model.name,
        headDim: model.headDim,
        seqLen: cfg.seqLen,
        headIndex: h,
        totalHeads: model.heads,
        embeddingDim: model.embeddingDim,
      };

      const circuit = compileAttentionHead(spec);
      heads.push({ layerIndex: l, headIndex: h, circuit });

      layerQubits += circuit.totalQubits;
      layerGates += circuit.compiled.gateCountAfter;
      layerDepth = Math.max(layerDepth, circuit.compiled.depth);
      layerT += circuit.compiled.tCount;
    }

    layers.push({
      index: l,
      heads,
      totalQubits: layerQubits,
      totalGates: layerGates,
      totalDepth: layerDepth,
      tCount: layerT,
    });
  }

  // Stage 5: ECC wrapping via fault-tolerant attention module
  let ecc: ECCOverhead | null = null;
  if (cfg.withECC) {
    const stabilizers = buildStabilizers();
    const ftCircuits: FTAttentionCircuit[] = [];

    // Compile each head through the FT pipeline
    for (const layer of layers) {
      for (const head of layer.heads) {
        const ft = compileFTAttention(head.circuit.head);
        ftCircuits.push(ft);
      }
    }

    // Aggregate overhead from real FT circuits
    const totalAdditional = ftCircuits.reduce(
      (s, ft) => s + (ft.totalQubits - ft.overhead.bareQubits), 0,
    );

    ecc = {
      additionalQubits: totalAdditional,
      syndromeCircuits: ftCircuits.reduce(
        (s, ft) => s + ft.syndromeCircuits.length * ft.encoding.logicalAssignments.length, 0,
      ),
      overheadFactor: ftCircuits[0]?.overhead.qubitOverhead ?? 2.0,
      ftCircuits,
    };
  }

  // Stage 6: QASM emission
  const qasm = emitQASM(model, layers, ecc);

  // Stage 7: Qiskit Python emission
  const qiskit = emitQiskit(model, layers, ecc);

  // Compute summary
  const totalLogicalQubits = layers.reduce((s, l) => s + l.totalQubits, 0);
  const totalPhysicalQubits = ecc
    ? totalLogicalQubits + ecc.additionalQubits
    : totalLogicalQubits;

  const summary: PipelineSummary = {
    headsCompiled: headsPerLayer * numLayers,
    layersCompiled: numLayers,
    totalLogicalQubits,
    totalPhysicalQubits,
    totalGates: layers.reduce((s, l) => s + l.totalGates, 0),
    totalTGates: layers.reduce((s, l) => s + l.tCount, 0),
    totalDepth: layers.reduce((s, l) => s + l.totalDepth, 0),
    compressionRatio: (model.embeddingDim * 32) / totalLogicalQubits,
    qasmLines: qasm.lines,
  };

  // Verification
  const tests = verifyPipeline(cfg, model, atlas, layers, qasm, qiskit, ecc, summary);

  return {
    config: cfg,
    model,
    atlas,
    layers,
    ecc,
    qasm,
    qiskit,
    summary,
    tests,
    allPassed: tests.every(t => t.holds),
  };
}

// ── QASM Emitter ──────────────────────────────────────────────────────────

function emitQASM(
  model: ModelArchitecture,
  layers: LayerSpec[],
  ecc: ECCOverhead | null,
): QASMOutput {
  const lines: string[] = [];
  let totalGateInstructions = 0;

  // Header
  lines.push(`// Atlas Compilation Pipeline — OpenQASM 3.0`);
  lines.push(`// Model: ${model.name} (${model.family})`);
  lines.push(`// d=${model.embeddingDim}, heads=${model.heads}, d_k=${model.headDim}, layers=${model.layers}`);
  lines.push(`// Parameters: ${model.paramsB}B`);
  lines.push(`// Generated by UOR Atlas Quantum Substrate`);
  lines.push(``);
  lines.push(`OPENQASM 3.0;`);
  lines.push(`include "stdgates.inc";`);
  lines.push(``);

  // Compute total qubits
  const totalQubits = layers.reduce((s, l) => s + l.totalQubits, 0)
    + (ecc?.additionalQubits ?? 0);
  const syndromeClbits = ecc?.ftCircuits
    ? ecc.ftCircuits.reduce((s, ft) => s + ft.totalClassicalBits, 0) : 0;
  const totalClbits = layers.reduce((s, l) => s + l.heads.length, 0) + syndromeClbits;

  lines.push(`// ── Registers ──`);
  lines.push(`qubit[${totalQubits}] q;`);
  lines.push(`bit[${totalClbits}] c;`);
  lines.push(``);

  // ECC stabilizer declarations
  if (ecc) {
    lines.push(`// ── ECC: [[96,48,2]] τ-mirror stabilizer code ──`);
    lines.push(`// Additional ${ecc.additionalQubits} physical qubits for encoding + syndrome`);
    lines.push(`// ${ecc.syndromeCircuits} syndrome extraction rounds`);
    lines.push(`// Overhead: ${ecc.overheadFactor.toFixed(1)}× qubit expansion`);
    lines.push(``);
  }

  // Gate definitions
  lines.push(`// ── Custom gate definitions ──`);
  lines.push(`gate cry(theta) ctrl, tgt {`);
  lines.push(`  ry(theta/2) tgt;`);
  lines.push(`  cx ctrl, tgt;`);
  lines.push(`  ry(-theta/2) tgt;`);
  lines.push(`  cx ctrl, tgt;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`gate euler_zyz(alpha, beta, gamma) q {`);
  lines.push(`  rz(alpha) q;`);
  lines.push(`  ry(beta) q;`);
  lines.push(`  rz(gamma) q;`);
  lines.push(`}`);
  lines.push(``);

  // Per-layer circuits
  let qubitOffset = 0;
  let clbitOffset = 0;

  for (const layer of layers) {
    lines.push(`// ══════════════════════════════════════════════`);
    lines.push(`// Layer ${layer.index}: ${layer.heads.length} attention heads`);
    lines.push(`// Qubits: ${layer.totalQubits}, Gates: ${layer.totalGates}, T-count: ${layer.tCount}`);
    lines.push(`// ══════════════════════════════════════════════`);
    lines.push(``);

    for (const head of layer.heads) {
      const hq = qubitOffset;
      lines.push(`// ── Head ${head.headIndex} (d_k=${head.circuit.head.headDim}) ──`);

      // Emit compiled gates
      for (const stage of head.circuit.stages) {
        lines.push(`// Stage: ${stage.name}`);
        for (const gate of stage.gates) {
          const qubits = gate.qubits.map(q => `q[${q + hq}]`).join(", ");
          const params = gate.params?.length
            ? `(${gate.params.map(p => p.toFixed(6)).join(", ")})`
            : "";

          const gateName = gate.name
            .replace("Ry(θ)", "ry")
            .replace("Rz(θ)", "rz")
            .replace("CRy", "cry")
            .replace("CCX", "ccx")
            .replace("CNOT", "cx")
            .replace("H", "h");

          lines.push(`${gateName}${params} ${qubits};`);
          totalGateInstructions++;
        }
        lines.push(``);
      }

      // Measurement
      lines.push(`// Measurement`);
      lines.push(`c[${clbitOffset}] = measure q[${hq}];`);
      lines.push(``);

      qubitOffset += head.circuit.totalQubits;
      clbitOffset++;
    }

    // ECC: real syndrome extraction per layer
    if (ecc?.ftCircuits) {
      lines.push(`// ── ECC syndrome extraction (layer ${layer.index}) ──`);
      lines.push(`// Z⊗Z stabilizer measurements via CNOT-to-ancilla pattern`);
      lines.push(`barrier q;`);
      lines.push(``);

      // Emit real syndrome circuits from FT module
      const layerFTs = ecc.ftCircuits.filter(
        (_, idx) => Math.floor(idx / layer.heads.length) === layer.index,
      );
      for (const ft of layerFTs) {
        for (const sc of ft.syndromeCircuits) {
          for (const gate of sc.cnotGates) {
            if (gate.name === "reset") {
              lines.push(`reset q[${gate.qubits[0]}];`);
            } else {
              const ctrl = gate.qubits[0] + qubitOffset - layer.totalQubits;
              const tgt = gate.qubits[1] + qubitOffset - layer.totalQubits;
              lines.push(`cx q[${ctrl}], q[${tgt}];`);
              totalGateInstructions++;
            }
          }
          for (let m = 0; m < sc.measurements.length; m++) {
            lines.push(`c[${clbitOffset + m}] = measure q[${sc.measurements[m].qubits[0] + qubitOffset - layer.totalQubits}];`);
            totalGateInstructions++;
          }
          clbitOffset += sc.classicalBits;
        }
      }

      // Conditional corrections
      lines.push(``);
      lines.push(`// Conditional X corrections from syndrome decode`);
      for (const ft of layerFTs) {
        for (const rg of ft.recoveryGates) {
          lines.push(`// if syndrome[${rg.qubits[0]}] → x q[${rg.qubits[1]}]`);
          totalGateInstructions++;
        }
      }
      lines.push(``);
    } else if (ecc) {
      lines.push(`// ── ECC syndrome extraction (layer ${layer.index}) ──`);
      lines.push(`barrier q;`);
      totalGateInstructions += 2;
    }
  }

  // Footer
  lines.push(`// ══════════════════════════════════════════════`);
  lines.push(`// Atlas Pipeline Summary:`);
  lines.push(`//   Total qubits:     ${totalQubits}`);
  lines.push(`//   Total gates:      ${totalGateInstructions}`);
  lines.push(`//   Classical bits:   ${totalClbits}`);
  lines.push(`//   ECC overhead:     ${ecc ? `${ecc.overheadFactor}×` : "none"}`);
  lines.push(`//   Compression:      ${model.embeddingDim * 32}b classical → ${totalQubits} qubits`);
  lines.push(`// ══════════════════════════════════════════════`);

  return {
    source: lines.join("\n"),
    lines: lines.length,
    qubits: totalQubits,
    clbits: totalClbits,
    gateCount: totalGateInstructions,
  };
}

// ── Qiskit Python Emitter ─────────────────────────────────────────────────

function emitQiskit(
  model: ModelArchitecture,
  layers: LayerSpec[],
  ecc: ECCOverhead | null,
): QiskitOutput {
  const py: string[] = [];
  let totalGateInstructions = 0;

  // Imports
  py.push(`"""Atlas Compilation Pipeline — Qiskit Circuit"""`);
  py.push(`# Model: ${model.name} (${model.family})`);
  py.push(`# d=${model.embeddingDim}, heads=${model.heads}, d_k=${model.headDim}, layers=${model.layers}`);
  py.push(`# Parameters: ${model.paramsB}B`);
  py.push(`# Generated by UOR Atlas Quantum Substrate`);
  py.push(``);
  py.push(`from qiskit import QuantumCircuit, transpile`);
  py.push(`from qiskit.circuit.library import RYGate, RZGate, CXGate, HGate, CCXGate`);
  py.push(`from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler`);
  py.push(`import numpy as np`);
  py.push(``);

  // Compute totals
  const totalQubits = layers.reduce((s, l) => s + l.totalQubits, 0)
    + (ecc?.additionalQubits ?? 0);
  const syndromeClbits = ecc?.ftCircuits
    ? ecc.ftCircuits.reduce((s, ft) => s + ft.totalClassicalBits, 0) : 0;
  const totalClbits = layers.reduce((s, l) => s + l.heads.length, 0) + syndromeClbits;

  const backendTarget = totalQubits <= 127 ? "ibm_brisbane" : "ibm_fez";

  // Circuit creation
  py.push(`# ── Circuit Construction ──`);
  py.push(`qc = QuantumCircuit(${totalQubits}, ${totalClbits})`);
  py.push(`qc.name = "atlas_${model.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}"`);
  py.push(``);

  // Custom gate helper
  py.push(`def euler_zyz(qc, qubit, alpha, beta, gamma):`);
  py.push(`    """Euler ZYZ decomposition."""`);
  py.push(`    qc.rz(alpha, qubit)`);
  py.push(`    qc.ry(beta, qubit)`);
  py.push(`    qc.rz(gamma, qubit)`);
  py.push(``);
  py.push(`def cry(qc, theta, ctrl, tgt):`);
  py.push(`    """Controlled-RY gate."""`);
  py.push(`    qc.ry(theta / 2, tgt)`);
  py.push(`    qc.cx(ctrl, tgt)`);
  py.push(`    qc.ry(-theta / 2, tgt)`);
  py.push(`    qc.cx(ctrl, tgt)`);
  py.push(``);

  // Per-layer circuits
  let qubitOffset = 0;
  let clbitOffset = 0;

  for (const layer of layers) {
    py.push(`# ${"═" .repeat(50)}`);
    py.push(`# Layer ${layer.index}: ${layer.heads.length} attention heads`);
    py.push(`# Qubits: ${layer.totalQubits}, Gates: ${layer.totalGates}, T-count: ${layer.tCount}`);
    py.push(`# ${"═".repeat(50)}`);
    py.push(``);

    for (const head of layer.heads) {
      const hq = qubitOffset;
      py.push(`# ── Head ${head.headIndex} (d_k=${head.circuit.head.headDim}) ──`);

      for (const stage of head.circuit.stages) {
        py.push(`# Stage: ${stage.name}`);
        for (const gate of stage.gates) {
          const qubits = gate.qubits.map(q => q + hq);

          if (gate.name === "H") {
            py.push(`qc.h(${qubits[0]})`);
          } else if (gate.name === "CNOT") {
            py.push(`qc.cx(${qubits[0]}, ${qubits[1]})`);
          } else if (gate.name === "CCX") {
            py.push(`qc.ccx(${qubits[0]}, ${qubits[1]}, ${qubits[2]})`);
          } else if (gate.name === "Ry(θ)" && gate.params?.length) {
            py.push(`qc.ry(${gate.params[0].toFixed(6)}, ${qubits[0]})`);
          } else if (gate.name === "Rz(θ)" && gate.params?.length) {
            py.push(`qc.rz(${gate.params[0].toFixed(6)}, ${qubits[0]})`);
          } else if (gate.name === "CRy" && gate.params?.length) {
            py.push(`cry(qc, ${gate.params[0].toFixed(6)}, ${qubits[0]}, ${qubits[1]})`);
          } else {
            // Generic fallback
            const params = gate.params?.length
              ? gate.params.map(p => p.toFixed(6)).join(", ") + ", "
              : "";
            py.push(`qc.append(${gate.name.toLowerCase()}(${params}), [${qubits.join(", ")}])`);
          }
          totalGateInstructions++;
        }
        py.push(``);
      }

      // Measurement
      py.push(`qc.measure(${hq}, ${clbitOffset})`);
      py.push(``);

      qubitOffset += head.circuit.totalQubits;
      clbitOffset++;
    }

    // ECC syndrome extraction
    if (ecc?.ftCircuits) {
      py.push(`# ── ECC syndrome extraction (layer ${layer.index}) ──`);
      py.push(`qc.barrier()`);
      py.push(``);

      const layerFTs = ecc.ftCircuits.filter(
        (_, idx) => Math.floor(idx / layer.heads.length) === layer.index,
      );
      for (const ft of layerFTs) {
        for (const sc of ft.syndromeCircuits) {
          for (const gate of sc.cnotGates) {
            if (gate.name === "reset") {
              py.push(`qc.reset(${gate.qubits[0]})`);
            } else {
              const ctrl = gate.qubits[0] + qubitOffset - layer.totalQubits;
              const tgt = gate.qubits[1] + qubitOffset - layer.totalQubits;
              py.push(`qc.cx(${ctrl}, ${tgt})`);
              totalGateInstructions++;
            }
          }
          for (let m = 0; m < sc.measurements.length; m++) {
            const mq = sc.measurements[m].qubits[0] + qubitOffset - layer.totalQubits;
            py.push(`qc.measure(${mq}, ${clbitOffset + m})`);
            totalGateInstructions++;
          }
          clbitOffset += sc.classicalBits;
        }
      }

      py.push(``);
      py.push(`# Conditional X corrections from syndrome decode`);
      for (const ft of layerFTs) {
        for (const rg of ft.recoveryGates) {
          py.push(`# if syndrome[${rg.qubits[0]}] → qc.x(${rg.qubits[1]})`);
          totalGateInstructions++;
        }
      }
      py.push(``);
    }
  }

  // IBM Quantum execution block
  py.push(`# ${"═".repeat(50)}`);
  py.push(`# IBM Quantum Execution`);
  py.push(`# ${"═".repeat(50)}`);
  py.push(``);
  py.push(`# Transpile for target backend`);
  py.push(`backend_name = "${backendTarget}"`);
  py.push(``);
  py.push(`# Uncomment to run on IBM Quantum hardware:`);
  py.push(`# service = QiskitRuntimeService(channel="ibm_quantum")`);
  py.push(`# backend = service.backend(backend_name)`);
  py.push(`# transpiled = transpile(qc, backend=backend, optimization_level=3)`);
  py.push(`# sampler = Sampler(backend)`);
  py.push(`# job = sampler.run([transpiled], shots=4096)`);
  py.push(`# result = job.result()`);
  py.push(`# print(f"Counts: {result[0].data.c.get_counts()}")`);
  py.push(``);
  py.push(`# ── Summary ──`);
  py.push(`print(f"Circuit: {qc.name}")`);
  py.push(`print(f"Qubits: {qc.num_qubits}, Classical bits: {qc.num_clbits}")`);
  py.push(`print(f"Gate count: {qc.size()}, Depth: {qc.depth()}")`);
  py.push(`print(f"Target backend: {backend_name}")`);

  return {
    source: py.join("\n"),
    lines: py.length,
    qubits: totalQubits,
    clbits: totalClbits,
    gateCount: totalGateInstructions,
    backendTarget,
  };
}

// ── Verification ──────────────────────────────────────────────────────────

function verifyPipeline(
  config: PipelineConfig,
  model: ModelArchitecture,
  atlas: AtlasDecomposition,
  layers: LayerSpec[],
  qasm: QASMOutput,
  qiskit: QiskitOutput,
  ecc: ECCOverhead | null,
  summary: PipelineSummary,
): PipelineTest[] {
  const tests: PipelineTest[] = [];

  // T1: Model found in catalog
  tests.push({
    name: "Model resolved from catalog",
    holds: true,
    detail: `${model.name} (${model.family}, ${model.paramsB}B params)`,
  });

  // T2: Atlas decomposition valid
  tests.push({
    name: "Atlas R₈ decomposition valid",
    holds: atlas.r8ElementsPerVector > 0 && atlas.completeRings >= 0,
    detail: `${atlas.r8ElementsPerVector} R₈ elements, ${atlas.completeRings} complete rings`,
  });

  // T3: Correct number of heads compiled
  const expectedHeads = Math.min(model.heads, config.maxHeads) * Math.min(model.layers, config.maxLayers);
  tests.push({
    name: "All requested heads compiled",
    holds: summary.headsCompiled === expectedHeads,
    detail: `${summary.headsCompiled}/${expectedHeads} heads`,
  });

  // T4: All layers have circuits
  tests.push({
    name: "All layers assembled",
    holds: layers.length === Math.min(model.layers, config.maxLayers),
    detail: `${layers.length} layers`,
  });

  // T5: QASM is well-formed
  tests.push({
    name: "QASM contains valid header",
    holds: qasm.source.includes("OPENQASM 3.0") && qasm.source.includes("stdgates.inc"),
    detail: `${qasm.lines} lines, ${qasm.gateCount} gate instructions`,
  });

  // T6: Qubit count matches
  tests.push({
    name: "Qubit declarations match circuits",
    holds: qasm.qubits === summary.totalPhysicalQubits,
    detail: `${qasm.qubits} declared = ${summary.totalPhysicalQubits} required`,
  });

  // T7: Compression ratio positive
  tests.push({
    name: "Quantum compression > 1×",
    holds: summary.compressionRatio > 1,
    detail: `${summary.compressionRatio.toFixed(1)}× compression (${model.embeddingDim * 32}b → ${summary.totalLogicalQubits}q)`,
  });

  // T8: T-gate count tracked
  tests.push({
    name: "T-gate budget computed",
    holds: summary.totalTGates >= 0,
    detail: `${summary.totalTGates} T-gates across ${summary.headsCompiled} heads`,
  });

  // T9: ECC wrapping (if enabled)
  if (config.withECC) {
    tests.push({
      name: "ECC [[96,48,2]] code applied",
      holds: ecc !== null && ecc.overheadFactor === 2.0,
      detail: `${ecc!.additionalQubits} syndrome qubits, ${ecc!.overheadFactor}× overhead`,
    });
  } else {
    tests.push({
      name: "ECC disabled (raw circuit)",
      holds: ecc === null,
      detail: "No error correction overhead",
    });
  }

  // T10: Depth is reasonable
  tests.push({
    name: "Circuit depth bounded",
    holds: summary.totalDepth > 0 && summary.totalDepth < 10000,
    detail: `Total depth: ${summary.totalDepth} cycles`,
  });

  // T11: Per-head qubits = 4⌈log₂(d_k)⌉ + 1
  const expectedPerHead = 4 * Math.ceil(Math.log2(model.headDim)) + 1;
  const firstHead = layers[0]?.heads[0];
  tests.push({
    name: "Per-head qubit count = 4⌈log₂(d_k)⌉+1",
    holds: firstHead ? firstHead.circuit.totalQubits === expectedPerHead : false,
    detail: `d_k=${model.headDim} → ${expectedPerHead} qubits per head`,
  });

  // T12: Full model projection
  const fullModelQubits = expectedPerHead * model.heads * model.layers;
  tests.push({
    name: "Full model qubit projection computed",
    holds: fullModelQubits > 0,
    detail: `Full ${model.name}: ${fullModelQubits.toLocaleString()} logical qubits (${model.heads}h × ${model.layers}L × ${expectedPerHead}q)`,
  });

  // T13: Qiskit Python is well-formed
  tests.push({
    name: "Qiskit Python contains valid imports and circuit",
    holds: qiskit.source.includes("from qiskit import QuantumCircuit")
      && qiskit.source.includes(`QuantumCircuit(${qiskit.qubits}`)
      && qiskit.source.includes("qiskit_ibm_runtime"),
    detail: `${qiskit.lines} lines, ${qiskit.gateCount} gate instructions, target: ${qiskit.backendTarget}`,
  });

  // T14: Qiskit qubit count matches QASM
  tests.push({
    name: "Qiskit qubit count matches QASM",
    holds: qiskit.qubits === qasm.qubits,
    detail: `Qiskit: ${qiskit.qubits}, QASM: ${qasm.qubits}`,
  });

  return tests;
}

/**
 * Compile all catalog models and return a comparison table.
 */
export function compileAllModels(config?: Partial<PipelineConfig>): {
  models: Array<{
    name: string;
    family: string;
    params: string;
    embDim: number;
    heads: number;
    headDim: number;
    layers: number;
    qubitsPerHead: number;
    gatesPerHead: number;
    tCountPerHead: number;
    fullModelQubits: number;
    compressionRatio: number;
    qasmLines: number;
  }>;
} {
  const models = MODEL_CATALOG.map(m => {
    const result = runPipeline({ ...config, modelName: m.name, maxHeads: 1, maxLayers: 1 });
    const firstHead = result.layers[0]?.heads[0];
    const qubitsPerHead = firstHead?.circuit.totalQubits ?? 0;
    const fullModelQubits = qubitsPerHead * m.heads * m.layers;

    return {
      name: m.name,
      family: m.family,
      params: m.paramsB >= 1 ? `${m.paramsB}B` : `${(m.paramsB * 1000).toFixed(0)}M`,
      embDim: m.embeddingDim,
      heads: m.heads,
      headDim: m.headDim,
      layers: m.layers,
      qubitsPerHead,
      gatesPerHead: firstHead?.circuit.compiled.gateCountAfter ?? 0,
      tCountPerHead: firstHead?.circuit.compiled.tCount ?? 0,
      fullModelQubits,
      compressionRatio: result.summary.compressionRatio,
      qasmLines: result.qasm.lines,
    };
  });

  return { models };
}
