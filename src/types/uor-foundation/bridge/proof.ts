/**
 * UOR Foundation v2.0.0 — bridge::proof
 *
 * Kernel-produced verification proofs.
 *
 * @see spec/src/namespaces/proof.rs
 * @namespace proof/
 */

/**
 * WitnessData — evidence supporting a proof.
 */
export interface WitnessData {
  /** Witness identifier. */
  witnessId(): string;
  /** The data being witnessed (serialized). */
  data(): string;
  /** Timestamp of witness creation. */
  timestamp(): string;
}

/**
 * Proof — abstract base for all proofs.
 *
 * @disjoint CoherenceProof, CriticalIdentityProof
 */
export interface Proof {
  /** Whether the proof verified successfully. */
  verified(): boolean;
  /** Quantum level at which the proof was performed. */
  quantum(): number;
  /** Supporting witness data. */
  witness(): WitnessData;
}

/**
 * CoherenceProof — proves system-wide coherence across all modules.
 *
 * @disjoint CriticalIdentityProof
 */
export interface CoherenceProof extends Proof {
  /** Number of modules verified. */
  moduleCount(): number;
  /** Number of modules that passed. */
  passedCount(): number;
  /** Whether all modules are coherent. */
  allCoherent(): boolean;
}

/**
 * CriticalIdentityProof — proves neg(bnot(x)) = succ(x) for all x.
 *
 * @disjoint CoherenceProof
 */
export interface CriticalIdentityProof extends Proof {
  /** Number of ring elements tested. */
  testedCount(): number;
  /** Number that passed. */
  passedCount(): number;
  /** Number that failed (should be 0). */
  failedCount(): number;
  /** Whether the identity holds for all tested elements. */
  holds(): boolean;
}
