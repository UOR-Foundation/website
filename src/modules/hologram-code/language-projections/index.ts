/**
 * Language Projections — Master Index
 * ═══════════════════════════════════════════════════
 *
 * Registers ALL language projections into the registry.
 * Import this once during Monaco initialization.
 *
 * Total coverage:
 *   70+ Monaco built-in languages
 *   + 24 custom Monarch grammar projections
 *   = 94+ languages supported
 *
 * Categories:
 *   Quantum    — QASM, Q#, Cirq, Silq, Quipper
 *   Systems    — Zig, Nim, Verilog, VHDL, RISC-V ASM
 *   Web3       — Solidity, Move, Cairo, Vyper
 *   Functional — Elixir, OCaml, Julia, Prolog, Clojure
 *   Legacy     — COBOL, Fortran, Ada
 *   Data       — HCL/Terraform, Protocol Buffers
 *
 * @module hologram-code/language-projections
 */

export { registerAllInMonaco, resolveLanguage, getAllProjections, getProjection, getRegistrySummary } from "./registry";
export type { LanguageProjection, LanguageCategory } from "./registry";

import { registerQuantumProjections } from "./quantum";
import { registerSystemsProjections } from "./systems";
import { registerWeb3Projections } from "./web3";
import { registerFunctionalProjections } from "./functional";
import { registerLegacyDataProjections } from "./legacy-data";

let _initialized = false;

/**
 * Register all language projections.
 * Safe to call multiple times — idempotent.
 */
export function initializeAllProjections(): void {
  if (_initialized) return;
  _initialized = true;

  registerQuantumProjections();
  registerSystemsProjections();
  registerWeb3Projections();
  registerFunctionalProjections();
  registerLegacyDataProjections();
}
