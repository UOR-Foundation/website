/**
 * AerSimulator — Qiskit Aer-compatible simulator projection
 * ══════════════════════════════════════════════════════════
 *
 * Provides shot-based measurement execution matching qiskit_aer.AerSimulator.
 * Delegates all computation to the Q-Simulator statevector engine.
 *
 * Usage mirrors Qiskit Python:
 *   const sim = new AerSimulator();
 *   const result = sim.run(qc, { shots: 4096 });
 *   const counts = result.get_counts();
 */

import { QuantumCircuit } from "./quantum-circuit";
import {
  simulateCircuit,
  measure as simMeasure,
  type SimulatorState,
} from "@/hologram/kernel/q-simulator";

// ── Result Types ───────────────────────────────────────────────────────────

export interface SimulationResult {
  /** Backend name */
  backend_name: string;
  /** Number of shots executed */
  shots: number;
  /** Whether the simulation succeeded */
  success: boolean;
  /** Measurement counts */
  get_counts(): Record<string, number>;
  /** Quasi-probability distribution (Qiskit 2.x Sampler style) */
  quasi_dists(): Record<string, number>;
  /** Execution metadata */
  metadata: {
    time_taken: number;
    num_qubits: number;
    num_clbits: number;
    method: string;
    device: string;
  };
}

export interface AerConfig {
  method?: "statevector" | "density_matrix" | "stabilizer";
  device?: "CPU" | "GPU";
}

// ── AerSimulator ───────────────────────────────────────────────────────────

export class AerSimulator {
  readonly method: string;
  readonly device: string;

  constructor(config?: AerConfig) {
    this.method = config?.method ?? "statevector";
    this.device = config?.device ?? "CPU";
  }

  /** Run a circuit and return measurement results */
  run(circuit: QuantumCircuit, options?: { shots?: number }): SimulationResult {
    const shots = options?.shots ?? 1024;
    const t0 = performance.now();

    const state = circuit._buildSimState();
    simulateCircuit(state);
    const counts = simMeasure(state, shots);

    const elapsed = performance.now() - t0;

    // Compute quasi-distributions
    const total = Object.values(counts).reduce((s, c) => s + c, 0);
    const quasi: Record<string, number> = {};
    for (const [k, v] of Object.entries(counts)) {
      quasi[k] = v / total;
    }

    return {
      backend_name: `aer_simulator_${this.method}`,
      shots,
      success: true,
      get_counts: () => counts,
      quasi_dists: () => quasi,
      metadata: {
        time_taken: elapsed / 1000,
        num_qubits: circuit.num_qubits,
        num_clbits: circuit.num_clbits,
        method: this.method,
        device: `Q-Linux ${this.device}`,
      },
    };
  }
}

// ── Sampler (Qiskit Runtime V2 compatible) ─────────────────────────────────

export class SamplerV2 {
  /** Run circuits with the Sampler primitive */
  run(circuits: QuantumCircuit | QuantumCircuit[], options?: { shots?: number }): {
    result: () => Array<{ data: { meas: { get_counts: () => Record<string, number> } } }>;
  } {
    const circs = Array.isArray(circuits) ? circuits : [circuits];
    const shots = options?.shots ?? 4096;

    return {
      result: () => circs.map(qc => {
        const state = qc._buildSimState();
        simulateCircuit(state);
        const counts = simMeasure(state, shots);
        return { data: { meas: { get_counts: () => counts } } };
      }),
    };
  }
}

// ── Statevector class (Qiskit quantum_info compatible) ─────────────────────

export class Statevector {
  readonly data: [number, number][];
  readonly num_qubits: number;

  constructor(circuit: QuantumCircuit) {
    const state = circuit._buildSimState();
    simulateCircuit(state);
    this.data = state.stateVector as [number, number][];
    this.num_qubits = circuit.num_qubits;
  }

  /** Get probabilities dictionary */
  probabilities_dict(): Record<string, number> {
    const result: Record<string, number> = {};
    for (let i = 0; i < this.data.length; i++) {
      const [r, im] = this.data[i];
      const prob = r * r + im * im;
      if (prob > 1e-12) {
        result[i.toString(2).padStart(this.num_qubits, "0")] = prob;
      }
    }
    return result;
  }

  /** Get probabilities array */
  probabilities(): number[] {
    return this.data.map(([r, i]) => r * r + i * i);
  }

  /** Trace out qubits (simplified partial trace) */
  trace(qubits: number[]): number {
    const probs = this.probabilities();
    return probs.reduce((s, p) => s + p * p, 0); // purity
  }

  /** Pretty print */
  draw(): string {
    const lines: string[] = [];
    for (let i = 0; i < this.data.length; i++) {
      const [r, im] = this.data[i];
      const mag = Math.sqrt(r * r + im * im);
      if (mag > 1e-10) {
        const label = i.toString(2).padStart(this.num_qubits, "0");
        const phase = Math.atan2(im, r);
        lines.push(`|${label}⟩: ${mag.toFixed(5)}∠${(phase * 180 / Math.PI).toFixed(1)}°`);
      }
    }
    return lines.join("\n");
  }
}
