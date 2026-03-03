/**
 * Qiskit SDK 2.2 — Hologram Projection
 * ═════════════════════════════════════
 *
 * A browser-native TypeScript projection of Qiskit's public API,
 * backed by the Q-Simulator statevector engine.
 *
 * Architecture: Qiskit is a "viewing angle" of the same canonical
 * quantum substrate. All computation routes through Q-Linux.
 *
 * Mirrors:
 *   from qiskit import QuantumCircuit, transpile
 *   from qiskit_aer import AerSimulator
 *   from qiskit.quantum_info import Statevector
 *
 * @version 2.2.0 (projection)
 * @see https://www.ibm.com/quantum/blog/qiskit-2-2-release-summary
 */

export { QuantumCircuit } from "./quantum-circuit";
export type { CircuitInstruction, CircuitMetadata, DrawStyle } from "./quantum-circuit";

export { AerSimulator, SamplerV2, Statevector } from "./aer";
export type { SimulationResult, AerConfig } from "./aer";

export { transpile, Target, ibm_eagle_target, ibm_heron_target } from "./transpiler";
export type { TranspileOptions, TranspileResult, TargetEntry } from "./transpiler";

/** SDK version string */
export const __version__ = "2.2.0-hologram";
