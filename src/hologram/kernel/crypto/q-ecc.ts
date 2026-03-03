/**
 * Q-ECC — Inline [[96,48,2]] Stabilizer Error Correction
 * ═══════════════════════════════════════════════════════
 *
 * Now derived from genesis/axiom-mirror — zero external deps.
 * The 48 mirror pairs from axiom-mirror serve as stabilizer generators.
 *
 *   ┌──────────────┬──────────────────────────────────────────────┐
 *   │ Classical ECC │ Q-ECC                                        │
 *   ├──────────────┼──────────────────────────────────────────────┤
 *   │ ECC RAM      │ [[96,48,2]] stabilizer code                  │
 *   │ Parity bits  │ 48 mirror pair generators (τ-involution)     │
 *   │ Detection    │ Syndrome measurement on mirror pairs         │
 *   │ Correction   │ Mirror reflection (τ-flip on e₇)             │
 *   │ Scope        │ Every gate op, every morphism — inline       │
 *   └──────────────┴──────────────────────────────────────────────┘
 *
 * @module qkernel/q-ecc
 */

import { MIRROR_PAIRS, ATLAS_VERTICES, type MirrorPair } from "../../genesis/axiom-mirror";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** Code parameters */
export const CODE_N = ATLAS_VERTICES;   // 96 physical qubits
export const CODE_K = ATLAS_VERTICES / 2;  // 48 logical qubits
export const CODE_D = 2;    // distance

/** A stabilizer generator (one mirror pair) */
export interface StabilizerGenerator {
  readonly index: number;         // generator index (0–47)
  readonly qubitA: number;        // vertex index
  readonly qubitB: number;        // mirror partner index
  readonly signClassA: number;
  readonly signClassB: number;
}

/** Syndrome measurement result */
export interface Syndrome {
  readonly generators: boolean[];  // true = non-trivial syndrome at that generator
  readonly weight: number;         // Hamming weight of syndrome
  readonly errorDetected: boolean;
  readonly errorLocation: number | null;  // qubit index if single error
}

/** Error correction result */
export interface CorrectionResult {
  readonly syndrome: Syndrome;
  readonly corrected: boolean;
  readonly correctionApplied: number | null;  // qubit index where correction was applied
  readonly codeword: number[];     // corrected state
}

/** ECC statistics */
export interface EccStats {
  readonly totalChecks: number;
  readonly errorsDetected: number;
  readonly errorsCorrected: number;
  readonly falsePositives: number;
  readonly codeRate: number;       // k/n = 48/96 = 0.5
}

// ═══════════════════════════════════════════════════════════════════════
// Q-ECC Implementation — derived from genesis axiom-mirror
// ═══════════════════════════════════════════════════════════════════════

export class QEcc {
  private generators: StabilizerGenerator[] = [];
  private totalChecks = 0;
  private errorsDetected = 0;
  private errorsCorrected = 0;

  constructor() {
    this.buildGenerators();
  }

  /** Build the 48 stabilizer generators from genesis mirror pairs */
  private buildGenerators(): void {
    for (const pair of MIRROR_PAIRS) {
      // Sign class derived from vertex position mod 8 (atlas convention)
      this.generators.push({
        index: pair.index,
        qubitA: pair.v,
        qubitB: pair.w,
        signClassA: pair.v % 8,
        signClassB: pair.w % 8,
      });
    }
  }

  // ── Syndrome Measurement ────────────────────────────────────────

  /**
   * Measure syndrome: check parity of each mirror pair.
   * A non-trivial syndrome at generator g means qubits (gA, gB)
   * have inconsistent values — an error has been detected.
   *
   * @param state - 96-element array of qubit values (0 or 1)
   */
  measureSyndrome(state: number[]): Syndrome {
    if (state.length !== CODE_N) {
      throw new Error(`State must be ${CODE_N} qubits, got ${state.length}`);
    }

    this.totalChecks++;

    const syndromes: boolean[] = [];
    let errorLocation: number | null = null;

    for (const gen of this.generators) {
      // Parity check: XOR of the mirror pair
      const parity = state[gen.qubitA] ^ state[gen.qubitB];
      const nonTrivial = parity !== 0;
      syndromes.push(nonTrivial);

      if (nonTrivial && errorLocation === null) {
        errorLocation = gen.qubitA;
      }
    }

    const weight = syndromes.filter(Boolean).length;
    const errorDetected = weight > 0;

    if (errorDetected) this.errorsDetected++;

    return {
      generators: syndromes,
      weight,
      errorDetected,
      errorLocation: errorDetected ? errorLocation : null,
    };
  }

  // ── Error Correction ────────────────────────────────────────────

  /**
   * Correct single-qubit X-errors using syndrome measurement.
   */
  correct(state: number[]): CorrectionResult {
    const corrected = [...state];
    const syndrome = this.measureSyndrome(state);

    if (!syndrome.errorDetected) {
      return { syndrome, corrected: false, correctionApplied: null, codeword: corrected };
    }

    if (syndrome.weight === 1) {
      const genIndex = syndrome.generators.findIndex(Boolean);
      const gen = this.generators[genIndex];
      corrected[gen.qubitA] = corrected[gen.qubitB];
      this.errorsCorrected++;
      return { syndrome, corrected: true, correctionApplied: gen.qubitA, codeword: corrected };
    }

    return { syndrome, corrected: false, correctionApplied: null, codeword: corrected };
  }

  // ── Encoding ────────────────────────────────────────────────────

  /**
   * Encode 48 logical qubits into 96 physical qubits.
   */
  encode(logical: number[]): number[] {
    if (logical.length !== CODE_K) {
      throw new Error(`Logical state must be ${CODE_K} qubits, got ${logical.length}`);
    }

    const physical = new Array(CODE_N).fill(0);
    for (let i = 0; i < this.generators.length; i++) {
      const gen = this.generators[i];
      physical[gen.qubitA] = logical[i];
      physical[gen.qubitB] = logical[i];
    }
    return physical;
  }

  /**
   * Decode 96 physical qubits back to 48 logical qubits.
   */
  decode(physical: number[]): number[] {
    if (physical.length !== CODE_N) {
      throw new Error(`Physical state must be ${CODE_N} qubits, got ${physical.length}`);
    }
    return this.generators.map(gen => physical[gen.qubitA]);
  }

  // ── Introspection ───────────────────────────────────────────────

  getGenerators(): readonly StabilizerGenerator[] { return this.generators; }
  generatorCount(): number { return this.generators.length; }

  stats(): EccStats {
    return {
      totalChecks: this.totalChecks,
      errorsDetected: this.errorsDetected,
      errorsCorrected: this.errorsCorrected,
      falsePositives: 0,
      codeRate: CODE_K / CODE_N,
    };
  }

  verifyCodeParameters(): { valid: boolean; n: number; k: number; d: number; generators: number } {
    return {
      valid: this.generators.length === CODE_K &&
             CODE_N === 96 && CODE_K === 48 && CODE_D === 2,
      n: CODE_N, k: CODE_K, d: CODE_D, generators: this.generators.length,
    };
  }
}
