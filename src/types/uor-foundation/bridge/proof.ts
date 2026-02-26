/**
 * UOR Foundation v2.0.0 — bridge::proof
 *
 * Kernel-produced verification proofs with typed witness data.
 *
 * @see foundation/src/bridge/proof.rs
 * @namespace proof/
 */

/**
 * WitnessData — evidence supporting a proof.
 * Now strongly typed with witness_type and witness_content
 * per v2.0.0 spec.
 */
export interface WitnessData {
  /** Witness identifier. */
  witnessId(): string;
  /** Witness type discriminator (e.g., "coherence", "identity", "involution"). */
  witnessType(): string;
  /** Serialized witness content (canonical form). */
  witnessContent(): string;
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
  /** The algebraic identity this proof establishes (null if not an identity proof). */
  provesIdentity(): string | null;
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
  /** Always references the critical identity. */
  provesIdentity(): "neg(bnot(x)) = succ(x)";
  /** Number of ring elements tested. */
  testedCount(): number;
  /** Number that passed. */
  passedCount(): number;
  /** Number that failed (should be 0). */
  failedCount(): number;
  /** Whether the identity holds for all tested elements. */
  holds(): boolean;
}
