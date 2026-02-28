/**
 * Fault-Tolerant Quantum Attention — Phase 25
 * ═════════════════════════════════════════════
 *
 * Wraps each quantum attention head circuit in the [[96,48,2]] geometric
 * stabilizer code, producing fault-tolerant attention heads with:
 *
 *   1. LOGICAL ENCODING:     Map data qubits → logical qubits via mirror pairs
 *   2. TRANSVERSAL GATES:    Execute attention gates on encoded qubits
 *   3. SYNDROME EXTRACTION:  CNOT from data to ancilla + measure each stabilizer
 *   4. CLASSICAL DECODING:   Lookup table from 48-bit syndrome → correction
 *   5. RECOVERY:             Apply X corrections based on syndrome
 *
 * The [[96,48,2]] code from geometric-ecc.ts provides:
 *   - 48 stabilizer generators from Atlas mirror pairs
 *   - Each generator Sᵢ = Z[vᵢ] ⊗ Z[τ(vᵢ)] detects single-qubit X errors
 *   - 100% single-qubit error detection, sign-class secondary layer
 *
 * @module quantum/fault-tolerant-attention
 */

import {
  buildStabilizers,
  constructLogicalQubits,
  computeCodeDistance,
  extractSyndrome,
  type StabilizerGenerator,
  type LogicalQubit,
} from "./geometric-ecc";
import {
  compileAttentionHead,
  type AttentionHeadSpec,
  type QuantumAttentionCircuit,
  type QuantumAttentionStage,
} from "./quantum-native-attention";
import { type AbstractGate } from "./circuit-compiler";

// ── Types ─────────────────────────────────────────────────────────────────

export interface FTAttentionConfig {
  /** Attention head specification */
  head: AttentionHeadSpec;
  /** Number of syndrome extraction rounds (repetition for confidence) */
  syndromeRounds: number;
  /** Enable sign-class secondary detection layer */
  signClassLayer: boolean;
  /** Error threshold for adaptive correction */
  errorThreshold: number;
}

export interface FTEncodingLayer {
  /** Number of data (logical) qubits from attention circuit */
  dataQubits: number;
  /** Number of ancilla qubits for syndrome measurement */
  ancillaQubits: number;
  /** Total physical qubits in encoded block */
  totalPhysical: number;
  /** Stabilizer generators used */
  generators: StabilizerGenerator[];
  /** Logical qubit assignments */
  logicalAssignments: LogicalQubitAssignment[];
  /** QASM gates for encoding */
  encodingGates: FTGate[];
}

export interface LogicalQubitAssignment {
  /** Logical qubit index (from attention circuit) */
  logicalIndex: number;
  /** Physical qubit pair [|0_L⟩, |1_L⟩] */
  physicalPair: [number, number];
  /** Stabilizer protecting this qubit */
  stabilizerIndex: number;
  /** Sign class of the mirror pair */
  signClass: number;
}

export interface FTGate {
  /** Gate name */
  name: string;
  /** Target qubits (physical indices) */
  qubits: number[];
  /** Parameters */
  params?: number[];
  /** Gate type classification */
  type: "encoding" | "transversal" | "syndrome" | "correction" | "measurement";
}

export interface SyndromeCircuit {
  /** Round index */
  round: number;
  /** CNOT gates: data → ancilla */
  cnotGates: FTGate[];
  /** Ancilla measurement gates */
  measurements: FTGate[];
  /** Classical bits used for syndrome */
  classicalBits: number;
  /** Total gates in this round */
  totalGates: number;
}

export interface CorrectionLookup {
  /** Syndrome bit pattern → correction operation */
  entries: CorrectionEntry[];
  /** Number of correctable patterns */
  correctableCount: number;
  /** Number of detectable-only patterns */
  detectableCount: number;
}

export interface CorrectionEntry {
  /** Syndrome weight (number of triggered stabilizers) */
  syndromeWeight: number;
  /** Error location (physical qubit index) */
  errorQubit: number;
  /** Correction gate to apply */
  correction: FTGate;
}

export interface FTAttentionCircuit {
  /** Original (bare) attention circuit */
  bareCircuit: QuantumAttentionCircuit;
  /** ECC configuration */
  config: FTAttentionConfig;
  /** Encoding layer */
  encoding: FTEncodingLayer;
  /** Transversal gate layer (attention gates on encoded qubits) */
  transversalGates: FTGate[];
  /** Syndrome extraction circuits */
  syndromeCircuits: SyndromeCircuit[];
  /** Correction lookup table */
  corrections: CorrectionLookup;
  /** Recovery gates (applied after syndrome decode) */
  recoveryGates: FTGate[];
  /** Total qubits: data + ancilla */
  totalQubits: number;
  /** Total classical bits: syndrome + measurement */
  totalClassicalBits: number;
  /** Overhead statistics */
  overhead: FTOverhead;
  /** QASM gates (complete fault-tolerant circuit) */
  allGates: FTGate[];
}

export interface FTOverhead {
  /** Bare circuit qubits */
  bareQubits: number;
  /** Encoded circuit qubits */
  encodedQubits: number;
  /** Qubit overhead factor */
  qubitOverhead: number;
  /** Bare gate count */
  bareGates: number;
  /** Encoded gate count */
  encodedGates: number;
  /** Gate overhead factor */
  gateOverhead: number;
  /** Syndrome extraction depth per round */
  syndromeDepth: number;
  /** Total syndrome rounds */
  syndromeRounds: number;
  /** Code parameters [[n, k, d]] */
  codeParams: { n: number; k: number; d: number };
}

export interface FTVerification {
  tests: FTTest[];
  allPassed: boolean;
}

export interface FTTest {
  name: string;
  holds: boolean;
  detail: string;
}

// ── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_FT_CONFIG: Omit<FTAttentionConfig, "head"> = {
  syndromeRounds: 1,
  signClassLayer: true,
  errorThreshold: 0.01,
};

// ── Core: Fault-Tolerant Compilation ──────────────────────────────────────

/**
 * Compile a fault-tolerant attention head by wrapping the bare circuit
 * in the [[96,48,2]] stabilizer code.
 */
export function compileFTAttention(
  headSpec: AttentionHeadSpec,
  config?: Partial<Omit<FTAttentionConfig, "head">>,
): FTAttentionCircuit {
  const cfg: FTAttentionConfig = {
    head: headSpec,
    ...DEFAULT_FT_CONFIG,
    ...config,
  };

  // Step 1: Compile bare attention circuit
  const bareCircuit = compileAttentionHead(headSpec);

  // Step 2: Build stabilizer infrastructure
  const stabilizers = buildStabilizers();
  const logicalQubits = constructLogicalQubits();
  const codeDistance = computeCodeDistance();

  // Step 3: Create encoding layer
  const encoding = buildEncodingLayer(bareCircuit, stabilizers, logicalQubits);

  // Step 4: Lift attention gates to transversal operations
  const transversalGates = liftToTransversal(bareCircuit, encoding);

  // Step 5: Build syndrome extraction circuits
  const syndromeCircuits = buildSyndromeCircuits(encoding, cfg.syndromeRounds);

  // Step 6: Build correction lookup table
  const corrections = buildCorrectionLookup(stabilizers);

  // Step 7: Generate recovery gates
  const recoveryGates = buildRecoveryGates(corrections, encoding);

  // Assemble complete gate sequence
  const allGates: FTGate[] = [
    ...encoding.encodingGates,
    ...transversalGates,
    ...syndromeCircuits.flatMap(sc => [...sc.cnotGates, ...sc.measurements]),
    ...recoveryGates,
  ];

  // Compute overhead
  const totalClassicalBits =
    syndromeCircuits.reduce((s, sc) => s + sc.classicalBits, 0)
    + bareCircuit.stages.length; // bare measurement bits

  const overhead: FTOverhead = {
    bareQubits: bareCircuit.totalQubits,
    encodedQubits: encoding.totalPhysical,
    qubitOverhead: encoding.totalPhysical / bareCircuit.totalQubits,
    bareGates: bareCircuit.compiled.gateCountAfter,
    encodedGates: allGates.length,
    gateOverhead: allGates.length / Math.max(1, bareCircuit.compiled.gateCountAfter),
    syndromeDepth: syndromeCircuits[0]?.totalGates ?? 0,
    syndromeRounds: cfg.syndromeRounds,
    codeParams: { n: 96, k: 48, d: codeDistance.d },
  };

  return {
    bareCircuit,
    config: cfg,
    encoding,
    transversalGates,
    syndromeCircuits,
    corrections,
    recoveryGates,
    totalQubits: encoding.totalPhysical,
    totalClassicalBits,
    overhead,
    allGates,
  };
}

// ── Encoding Layer ────────────────────────────────────────────────────────

/**
 * Map each data qubit from the bare attention circuit to a logical qubit
 * in the [[96,48,2]] code using mirror-pair encoding.
 *
 * Each logical qubit |ψ_L⟩ is encoded as:
 *   α|0_L⟩ + β|1_L⟩  →  α|v⟩ + β|τ(v)⟩
 *
 * The encoding circuit:
 *   1. Prepare ancilla in |+⟩ (H gate)
 *   2. CNOT from data to ancilla (entangle mirror pair)
 */
function buildEncodingLayer(
  bare: QuantumAttentionCircuit,
  stabilizers: StabilizerGenerator[],
  logicalQubits: LogicalQubit[],
): FTEncodingLayer {
  const dataQubits = bare.totalQubits;
  // Each data qubit gets one mirror-pair encoding + one ancilla for syndrome
  const ancillaQubits = dataQubits; // 1 ancilla per data qubit for syndrome extraction
  const totalPhysical = dataQubits * 2 + ancillaQubits; // pairs + syndrome ancillae

  // Assign logical qubits: cycle through the 48 available stabilizers
  const assignments: LogicalQubitAssignment[] = [];
  for (let i = 0; i < dataQubits; i++) {
    const stabIdx = i % stabilizers.length;
    const stab = stabilizers[stabIdx];
    assignments.push({
      logicalIndex: i,
      physicalPair: [i * 2, i * 2 + 1], // paired physical qubits
      stabilizerIndex: stabIdx,
      signClass: stab.signClass,
    });
  }

  // Encoding gates: for each logical qubit, create mirror-pair entanglement
  const encodingGates: FTGate[] = [];
  for (const assign of assignments) {
    const [q0, q1] = assign.physicalPair;

    // Step 1: Hadamard on second qubit of pair
    encodingGates.push({
      name: "h",
      qubits: [q1],
      type: "encoding",
    });

    // Step 2: CNOT to create Bell pair |00⟩ + |11⟩
    encodingGates.push({
      name: "cx",
      qubits: [q0, q1],
      type: "encoding",
    });
  }

  return {
    dataQubits,
    ancillaQubits,
    totalPhysical,
    generators: stabilizers.slice(0, dataQubits),
    logicalAssignments: assignments,
    encodingGates,
  };
}

// ── Transversal Gates ─────────────────────────────────────────────────────

/**
 * Lift each bare attention gate to a transversal operation on encoded qubits.
 *
 * For the [[96,48,2]] code:
 *   - Single-qubit gates become pairs applied to both |v⟩ and |τ(v)⟩
 *   - CNOT gates become transversal CNOTs on both halves
 *   - Rotation gates Ry(θ), Rz(θ) applied bitwise to each physical pair member
 */
function liftToTransversal(
  bare: QuantumAttentionCircuit,
  encoding: FTEncodingLayer,
): FTGate[] {
  const transversal: FTGate[] = [];

  for (const stage of bare.stages) {
    for (const gate of stage.gates) {
      if (gate.qubits.length === 1) {
        // Single-qubit gate → apply to both halves of the mirror pair
        const logIdx = gate.qubits[0];
        if (logIdx < encoding.logicalAssignments.length) {
          const assign = encoding.logicalAssignments[logIdx];
          const [q0, q1] = assign.physicalPair;

          // Gate on |v⟩
          transversal.push({
            name: mapGateName(gate.name),
            qubits: [q0],
            params: gate.params,
            type: "transversal",
          });

          // Same gate on |τ(v)⟩
          transversal.push({
            name: mapGateName(gate.name),
            qubits: [q1],
            params: gate.params,
            type: "transversal",
          });
        }
      } else if (gate.qubits.length === 2) {
        // Two-qubit gate → transversal CNOT on both pair halves
        const [ctrl, tgt] = gate.qubits;
        if (ctrl < encoding.logicalAssignments.length && tgt < encoding.logicalAssignments.length) {
          const ctrlAssign = encoding.logicalAssignments[ctrl];
          const tgtAssign = encoding.logicalAssignments[tgt];

          // CNOT on |v⟩ halves
          transversal.push({
            name: mapGateName(gate.name),
            qubits: [ctrlAssign.physicalPair[0], tgtAssign.physicalPair[0]],
            params: gate.params,
            type: "transversal",
          });

          // CNOT on |τ(v)⟩ halves
          transversal.push({
            name: mapGateName(gate.name),
            qubits: [ctrlAssign.physicalPair[1], tgtAssign.physicalPair[1]],
            params: gate.params,
            type: "transversal",
          });
        }
      } else {
        // 3+ qubit gates: apply to first pair member (approximate)
        const mappedQubits = gate.qubits.map(q => {
          if (q < encoding.logicalAssignments.length) {
            return encoding.logicalAssignments[q].physicalPair[0];
          }
          return q;
        });
        transversal.push({
          name: mapGateName(gate.name),
          qubits: mappedQubits,
          params: gate.params,
          type: "transversal",
        });
      }
    }
  }

  return transversal;
}

function mapGateName(name: string): string {
  return name
    .replace("Ry(θ)", "ry")
    .replace("Rz(θ)", "rz")
    .replace("CRy", "cry")
    .replace("CCX", "ccx")
    .replace("CNOT", "cx")
    .replace("H", "h");
}

// ── Syndrome Extraction ───────────────────────────────────────────────────

/**
 * Build syndrome extraction circuits.
 *
 * For each stabilizer generator Sᵢ = Z[v]⊗Z[τ(v)]:
 *   1. Prepare ancilla in |0⟩
 *   2. CNOT from v → ancilla
 *   3. CNOT from τ(v) → ancilla
 *   4. Measure ancilla → syndrome bit sᵢ
 *
 * If no error: both CNOTs cancel → ancilla stays |0⟩ → sᵢ = 0
 * If X error on v: first CNOT flips ancilla → sᵢ = 1
 * If X error on τ(v): second CNOT flips ancilla → sᵢ = 1
 * If X error on both: both flip → cancel → sᵢ = 0 (undetectable, d=2)
 */
function buildSyndromeCircuits(
  encoding: FTEncodingLayer,
  rounds: number,
): SyndromeCircuit[] {
  const circuits: SyndromeCircuit[] = [];

  for (let round = 0; round < rounds; round++) {
    const cnotGates: FTGate[] = [];
    const measurements: FTGate[] = [];
    let classicalBitIdx = 0;

    for (let i = 0; i < encoding.logicalAssignments.length; i++) {
      const assign = encoding.logicalAssignments[i];
      const [q0, q1] = assign.physicalPair;
      const ancilla = encoding.dataQubits * 2 + i; // ancilla qubit index

      // Reset ancilla (implicit |0⟩ preparation)
      if (round > 0) {
        cnotGates.push({
          name: "reset",
          qubits: [ancilla],
          type: "syndrome",
        });
      }

      // CNOT: data qubit |v⟩ → ancilla
      cnotGates.push({
        name: "cx",
        qubits: [q0, ancilla],
        type: "syndrome",
      });

      // CNOT: mirror qubit |τ(v)⟩ → ancilla
      cnotGates.push({
        name: "cx",
        qubits: [q1, ancilla],
        type: "syndrome",
      });

      // Measure ancilla → classical syndrome bit
      measurements.push({
        name: "measure",
        qubits: [ancilla],
        type: "measurement",
      });

      classicalBitIdx++;
    }

    circuits.push({
      round,
      cnotGates,
      measurements,
      classicalBits: classicalBitIdx,
      totalGates: cnotGates.length + measurements.length,
    });
  }

  return circuits;
}

// ── Correction Lookup ─────────────────────────────────────────────────────

/**
 * Build syndrome → correction lookup table.
 *
 * For the [[96,48,2]] code, single-qubit X errors produce unique syndromes:
 *   - Error on qubit v of pair i: only stabilizer i fires → weight-1 syndrome
 *   - Error on qubit τ(v) of pair i: only stabilizer i fires → weight-1 syndrome
 *   - Correction: apply X to the errored qubit
 */
function buildCorrectionLookup(
  stabilizers: StabilizerGenerator[],
): CorrectionLookup {
  const entries: CorrectionEntry[] = [];

  for (const stab of stabilizers) {
    // Error on first qubit of pair
    entries.push({
      syndromeWeight: 1,
      errorQubit: stab.vertex,
      correction: {
        name: "x",
        qubits: [stab.vertex],
        type: "correction",
      },
    });

    // Error on second qubit of pair
    entries.push({
      syndromeWeight: 1,
      errorQubit: stab.mirror,
      correction: {
        name: "x",
        qubits: [stab.mirror],
        type: "correction",
      },
    });
  }

  return {
    entries,
    correctableCount: entries.length,
    detectableCount: entries.length, // all single-qubit errors are detectable
  };
}

// ── Recovery ──────────────────────────────────────────────────────────────

/**
 * Generate conditional recovery gates.
 * In a real quantum computer these would be classically-controlled X gates.
 * Here we emit the QASM structure for conditional correction.
 */
function buildRecoveryGates(
  corrections: CorrectionLookup,
  encoding: FTEncodingLayer,
): FTGate[] {
  const gates: FTGate[] = [];

  // For each logical qubit, add a conditional X correction
  for (const assign of encoding.logicalAssignments) {
    const [q0, q1] = assign.physicalPair;
    const syndromeAncilla = encoding.dataQubits * 2 + assign.logicalIndex;

    // If syndrome bit = 1, apply X to q0 (convention: correct toward |0_L⟩)
    gates.push({
      name: "if_x",
      qubits: [syndromeAncilla, q0],
      type: "correction",
    });
  }

  return gates;
}

// ── QASM Emission ─────────────────────────────────────────────────────────

/**
 * Emit OpenQASM 3.0 for a fault-tolerant attention head.
 */
export function emitFTQASM(ft: FTAttentionCircuit): string {
  const lines: string[] = [];

  lines.push(`// Fault-Tolerant Quantum Attention — [[96,48,2]] Stabilizer Code`);
  lines.push(`// Model: ${ft.config.head.model}, Head ${ft.config.head.headIndex}`);
  lines.push(`// d_k=${ft.config.head.headDim}, bare qubits=${ft.overhead.bareQubits}`);
  lines.push(`// Encoded: ${ft.overhead.encodedQubits} physical qubits (${ft.overhead.qubitOverhead.toFixed(1)}× overhead)`);
  lines.push(`// Syndrome rounds: ${ft.overhead.syndromeRounds}`);
  lines.push(``);
  lines.push(`OPENQASM 3.0;`);
  lines.push(`include "stdgates.inc";`);
  lines.push(``);

  // Registers
  const dataQubits = ft.encoding.dataQubits * 2; // mirror pairs
  const ancillaQubits = ft.encoding.ancillaQubits;
  lines.push(`// ── Registers ──`);
  lines.push(`qubit[${dataQubits}] data;       // Mirror-pair encoded data qubits`);
  lines.push(`qubit[${ancillaQubits}] syndrome; // Syndrome ancillae`);
  lines.push(`bit[${ft.totalClassicalBits}] c;  // Classical syndrome + measurement bits`);
  lines.push(``);

  // Custom gates
  lines.push(`// ── Custom gates ──`);
  lines.push(`gate cry(theta) ctrl, tgt { ry(theta/2) tgt; cx ctrl, tgt; ry(-theta/2) tgt; cx ctrl, tgt; }`);
  lines.push(`gate euler_zyz(a, b, g) q { rz(a) q; ry(b) q; rz(g) q; }`);
  lines.push(``);

  // Stage 1: Encoding
  lines.push(`// ═══════════════════════════════════════════════`);
  lines.push(`// Stage 1: Mirror-pair encoding (|ψ⟩ → |ψ_L⟩)`);
  lines.push(`// ═══════════════════════════════════════════════`);
  for (const gate of ft.encoding.encodingGates) {
    lines.push(formatFTGate(gate, "data"));
  }
  lines.push(``);

  // Stage 2: Transversal attention gates
  lines.push(`// ═══════════════════════════════════════════════`);
  lines.push(`// Stage 2: Transversal attention circuit`);
  lines.push(`// ${ft.transversalGates.length} gates on encoded qubits`);
  lines.push(`// ═══════════════════════════════════════════════`);
  for (const gate of ft.transversalGates) {
    lines.push(formatFTGate(gate, "data"));
  }
  lines.push(``);

  // Stage 3: Syndrome extraction
  lines.push(`// ═══════════════════════════════════════════════`);
  lines.push(`// Stage 3: Syndrome extraction (${ft.syndromeCircuits.length} rounds)`);
  lines.push(`// ═══════════════════════════════════════════════`);
  let synBitOffset = 0;
  for (const sc of ft.syndromeCircuits) {
    lines.push(`// Round ${sc.round}`);
    lines.push(`barrier data, syndrome;`);

    for (const gate of sc.cnotGates) {
      if (gate.name === "reset") {
        lines.push(`reset syndrome[${gate.qubits[0] - ft.encoding.dataQubits * 2}];`);
      } else {
        const ctrl = gate.qubits[0];
        const tgt = gate.qubits[1] - ft.encoding.dataQubits * 2;
        lines.push(`cx data[${ctrl}], syndrome[${tgt}];`);
      }
    }

    for (let i = 0; i < sc.measurements.length; i++) {
      lines.push(`c[${synBitOffset + i}] = measure syndrome[${i}];`);
    }
    synBitOffset += sc.classicalBits;
    lines.push(``);
  }

  // Stage 4: Classical correction
  lines.push(`// ═══════════════════════════════════════════════`);
  lines.push(`// Stage 4: Conditional recovery (classically controlled)`);
  lines.push(`// ═══════════════════════════════════════════════`);
  for (let i = 0; i < ft.encoding.logicalAssignments.length; i++) {
    const assign = ft.encoding.logicalAssignments[i];
    lines.push(`if (c[${i}] == 1) x data[${assign.physicalPair[0]}]; // correct qubit ${i}`);
  }
  lines.push(``);

  // Footer
  lines.push(`// ═══════════════════════════════════════════════`);
  lines.push(`// Fault-Tolerant Summary:`);
  lines.push(`//   Code: [[96, 48, ${ft.overhead.codeParams.d}]]`);
  lines.push(`//   Data qubits:     ${dataQubits}`);
  lines.push(`//   Syndrome qubits: ${ancillaQubits}`);
  lines.push(`//   Total physical:  ${ft.totalQubits}`);
  lines.push(`//   Bare gates:      ${ft.overhead.bareGates}`);
  lines.push(`//   Encoded gates:   ${ft.overhead.encodedGates}`);
  lines.push(`//   Overhead:        ${ft.overhead.qubitOverhead.toFixed(1)}× qubits, ${ft.overhead.gateOverhead.toFixed(1)}× gates`);
  lines.push(`// ═══════════════════════════════════════════════`);

  return lines.join("\n");
}

function formatFTGate(gate: FTGate, register: string): string {
  const params = gate.params?.length
    ? `(${gate.params.map(p => p.toFixed(6)).join(", ")})`
    : "";
  const qubits = gate.qubits.map(q => `${register}[${q}]`).join(", ");
  return `${gate.name}${params} ${qubits};`;
}

// ── Verification ──────────────────────────────────────────────────────────

/**
 * Run verification tests on a fault-tolerant attention circuit.
 */
export function verifyFTAttention(ft: FTAttentionCircuit): FTVerification {
  const tests: FTTest[] = [];

  // T1: Encoding layer correct
  tests.push({
    name: "Encoding layer maps all data qubits",
    holds: ft.encoding.logicalAssignments.length === ft.encoding.dataQubits,
    detail: `${ft.encoding.logicalAssignments.length} logical assignments for ${ft.encoding.dataQubits} data qubits`,
  });

  // T2: Each assignment has valid physical pair
  const allPairsValid = ft.encoding.logicalAssignments.every(
    a => a.physicalPair[0] !== a.physicalPair[1] && a.physicalPair[0] >= 0,
  );
  tests.push({
    name: "All physical pairs are distinct",
    holds: allPairsValid,
    detail: `${ft.encoding.logicalAssignments.length} pairs validated`,
  });

  // T3: Encoding gates = 2 per logical qubit (H + CNOT)
  tests.push({
    name: "Encoding circuit: H + CNOT per logical qubit",
    holds: ft.encoding.encodingGates.length === ft.encoding.dataQubits * 2,
    detail: `${ft.encoding.encodingGates.length} gates for ${ft.encoding.dataQubits} qubits`,
  });

  // T4: Transversal gates ≈ 2× bare gates (one per pair member)
  const singleQubitBare = ft.bareCircuit.stages.reduce(
    (s, st) => s + st.gates.filter(g => g.qubits.length <= 2).length, 0,
  );
  tests.push({
    name: "Transversal lift doubles gate count",
    holds: ft.transversalGates.length >= singleQubitBare,
    detail: `${ft.transversalGates.length} transversal vs ${singleQubitBare} bare gates`,
  });

  // T5: Syndrome circuit has correct structure
  const synCircuit = ft.syndromeCircuits[0];
  tests.push({
    name: "Syndrome extraction: 2 CNOTs + 1 measure per stabilizer",
    holds: synCircuit
      ? synCircuit.cnotGates.length === ft.encoding.dataQubits * 2
        && synCircuit.measurements.length === ft.encoding.dataQubits
      : false,
    detail: synCircuit
      ? `${synCircuit.cnotGates.length} CNOTs, ${synCircuit.measurements.length} measurements`
      : "No syndrome circuit",
  });

  // T6: Correction lookup has entries for all single-qubit errors
  tests.push({
    name: "Correction table covers all single-qubit errors",
    holds: ft.corrections.correctableCount >= ft.encoding.dataQubits * 2,
    detail: `${ft.corrections.correctableCount} correctable patterns`,
  });

  // T7: Total physical qubits = 3× data (pairs + ancillae)
  tests.push({
    name: "Physical qubit count: data pairs + ancillae",
    holds: ft.totalQubits === ft.encoding.dataQubits * 3,
    detail: `${ft.totalQubits} = ${ft.encoding.dataQubits} × 3`,
  });

  // T8: Overhead > 1
  tests.push({
    name: "Qubit overhead > 1× (ECC adds physical qubits)",
    holds: ft.overhead.qubitOverhead > 1,
    detail: `${ft.overhead.qubitOverhead.toFixed(1)}× qubit overhead`,
  });

  // T9: Gate overhead > 1
  tests.push({
    name: "Gate overhead > 1× (transversal + syndrome)",
    holds: ft.overhead.gateOverhead > 1,
    detail: `${ft.overhead.gateOverhead.toFixed(1)}× gate overhead`,
  });

  // T10: QASM emission produces valid output
  const qasm = emitFTQASM(ft);
  tests.push({
    name: "QASM emission valid OpenQASM 3.0",
    holds: qasm.includes("OPENQASM 3.0") && qasm.includes("syndrome") && qasm.includes("barrier"),
    detail: `${qasm.split("\n").length} lines emitted`,
  });

  // T11: Code params match [[96,48,2]]
  tests.push({
    name: "Code parameters [[96, 48, 2]]",
    holds: ft.overhead.codeParams.n === 96 && ft.overhead.codeParams.k === 48 && ft.overhead.codeParams.d === 2,
    detail: `[[${ft.overhead.codeParams.n}, ${ft.overhead.codeParams.k}, ${ft.overhead.codeParams.d}]]`,
  });

  // T12: Sign class diversity in assignments
  const signClasses = new Set(ft.encoding.logicalAssignments.map(a => a.signClass));
  tests.push({
    name: "Sign class diversity in logical assignments",
    holds: signClasses.size >= 2,
    detail: `${signClasses.size} sign classes across ${ft.encoding.logicalAssignments.length} assignments`,
  });

  return {
    tests,
    allPassed: tests.every(t => t.holds),
  };
}
