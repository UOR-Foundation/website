/**
 * UOR Foundation v2.0.0 — bridge::cert
 *
 * Typed certificate hierarchy for kernel-produced attestations.
 * v0.2.0 additions: GeodesicCertificate, LiftChainCertificate,
 * DeformationCertificate, CompositionCertificate, EmbeddingCertificate,
 * ActionCertificate, SessionCertificate, CertificateChain.
 *
 * @see spec/src/namespaces/cert.rs
 * @namespace cert/
 */

// ── Core Certificate Types ─────────────────────────────────────────────────

/**
 * Certificate — abstract base for all certificates.
 *
 * @disjoint TransformCertificate, IsometryCertificate, InvolutionCertificate
 */
export interface Certificate {
  certificateId(): string;
  certifiesIri(): string;
  valid(): boolean;
  issuedAt(): string;
  derivationId(): string | null;
}

/** TransformCertificate — certifies a morphism:Transform. */
export interface TransformCertificate extends Certificate {
  sourceIri(): string;
  targetIri(): string;
  fidelityPreserved(): boolean;
}

/** IsometryCertificate — certifies a morphism:Isometry (lossless). */
export interface IsometryCertificate extends Certificate {
  sourceQuantum(): number;
  targetQuantum(): number;
  roundTripVerified(): boolean;
}

/** InvolutionCertificate — certifies f∘f = id for an involution. */
export interface InvolutionCertificate extends Certificate {
  operationName(): string;
  testedCount(): number;
  holdsForAll(): boolean;
}

// ══════════════════════════════════════════════════════════════════════════
// v0.2.0 ADDITIONS
// ══════════════════════════════════════════════════════════════════════════

/**
 * GeodesicCertificate — certifies that a path between two ring elements
 * is a geodesic (shortest path) in the ring's metric geometry.
 *
 * @see spec/src/namespaces/cert.rs — GeodesicCertificate
 */
export interface GeodesicCertificate extends Certificate {
  /** Source ring element. */
  sourceValue(): number;
  /** Target ring element. */
  targetValue(): number;
  /** Geodesic distance. */
  distance(): number;
  /** Whether the path is unique. */
  isUnique(): boolean;
}

/**
 * LiftChainCertificate — certifies that a lift chain Q_i → Q_j
 * preserves fidelity at every step.
 *
 * @see spec/src/namespaces/cert.rs — LiftChainCertificate
 */
export interface LiftChainCertificate extends Certificate {
  /** Source quantum level. */
  sourceQuantum(): number;
  /** Target quantum level. */
  targetQuantum(): number;
  /** Number of lift steps verified. */
  stepsVerified(): number;
  /** Whether all steps are faithful. */
  allFaithful(): boolean;
}

/**
 * DeformationCertificate — certifies that a continuous type deformation
 * preserves the required algebraic invariants.
 *
 * @see spec/src/namespaces/cert.rs — DeformationCertificate
 */
export interface DeformationCertificate extends Certificate {
  /** Deformation family identifier. */
  familyId(): string;
  /** Invariants verified. */
  invariantsChecked(): string[];
  /** Whether all invariants hold. */
  allPreserved(): boolean;
}

/**
 * CompositionCertificate — certifies that a morphism composition
 * satisfies associativity and the interchange law.
 *
 * @see spec/src/namespaces/cert.rs — CompositionCertificate
 */
export interface CompositionCertificate extends Certificate {
  /** Components in the composition. */
  componentCount(): number;
  /** Whether associativity was verified. */
  associativityVerified(): boolean;
  /** Whether the interchange law holds. */
  interchangeVerified(): boolean;
}

/**
 * EmbeddingCertificate — certifies an embedding is injective
 * and preserves the specified structure.
 *
 * @see spec/src/namespaces/cert.rs — EmbeddingCertificate
 */
export interface EmbeddingCertificate extends Certificate {
  /** Source ring cardinality. */
  sourceDimension(): number;
  /** Target ring cardinality. */
  targetDimension(): number;
  /** Whether injectivity was verified for all elements. */
  injectivityVerified(): boolean;
}

/**
 * ActionCertificate — certifies that a group action satisfies
 * the group action axioms (identity and compatibility).
 *
 * @see spec/src/namespaces/cert.rs — ActionCertificate
 */
export interface ActionCertificate extends Certificate {
  /** Group order. */
  groupOrder(): number;
  /** Number of elements the action was tested on. */
  testedElements(): number;
  /** Whether identity action was verified (e · x = x). */
  identityVerified(): boolean;
  /** Whether compatibility was verified ((gh) · x = g · (h · x)). */
  compatibilityVerified(): boolean;
}

/**
 * SessionCertificate — certifies the integrity of a session chain.
 * Validates that session CIDs form a valid hash chain and that
 * state transitions are consistent.
 *
 * @see spec/src/namespaces/cert.rs — SessionCertificate
 */
export interface SessionCertificate extends Certificate {
  /** Session CID being certified. */
  sessionCid(): string;
  /** Number of transitions verified. */
  transitionsVerified(): number;
  /** Whether the hash chain is intact. */
  chainIntact(): boolean;
  /** Whether state hashes are consistent. */
  stateConsistent(): boolean;
}

/**
 * CertificateChain — an ordered chain of certificates where each
 * certificate's validity depends on the previous one (trust chain).
 *
 * @see spec/src/namespaces/cert.rs — CertificateChain
 */
export interface CertificateChain {
  /** Chain identifier. */
  chainId(): string;
  /** Ordered certificates in the chain. */
  certificates(): Certificate[];
  /** Root (trust anchor) certificate. */
  root(): Certificate;
  /** Leaf (end-entity) certificate. */
  leaf(): Certificate;
  /** Chain length. */
  length(): number;
  /** Whether the entire chain validates. */
  isValid(): boolean;
}
