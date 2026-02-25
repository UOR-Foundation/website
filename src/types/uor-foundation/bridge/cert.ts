/**
 * UOR Foundation v2.0.0 — bridge::cert
 *
 * Typed certificate hierarchy for kernel-produced attestations.
 *
 * @see spec/src/namespaces/cert.rs
 * @namespace cert/
 */

/**
 * Certificate — abstract base for all certificates.
 *
 * @disjoint TransformCertificate, IsometryCertificate, InvolutionCertificate
 */
export interface Certificate {
  /** Certificate identifier. */
  certificateId(): string;
  /** IRI of the object being certified. */
  certifiesIri(): string;
  /** Whether the certificate is valid. */
  valid(): boolean;
  /** Issuance timestamp. */
  issuedAt(): string;
  /** Derivation ID linking to the proof. */
  derivationId(): string | null;
}

/**
 * TransformCertificate — certifies a morphism:Transform.
 *
 * @disjoint IsometryCertificate, InvolutionCertificate
 */
export interface TransformCertificate extends Certificate {
  /** The transform's source IRI. */
  sourceIri(): string;
  /** The transform's target IRI. */
  targetIri(): string;
  /** Whether fidelity was preserved. */
  fidelityPreserved(): boolean;
}

/**
 * IsometryCertificate — certifies a morphism:Isometry (lossless).
 * Guarantees round-trip fidelity: project(embed(x)) = x.
 *
 * @disjoint TransformCertificate, InvolutionCertificate
 */
export interface IsometryCertificate extends Certificate {
  /** Source quantum level. */
  sourceQuantum(): number;
  /** Target quantum level. */
  targetQuantum(): number;
  /** Whether round-trip fidelity was verified. */
  roundTripVerified(): boolean;
}

/**
 * InvolutionCertificate — certifies f∘f = id for an involution.
 *
 * @disjoint TransformCertificate, IsometryCertificate
 */
export interface InvolutionCertificate extends Certificate {
  /** The involution operation name. */
  operationName(): string;
  /** Number of elements tested. */
  testedCount(): number;
  /** Whether f(f(x)) = x for all tested elements. */
  holdsForAll(): boolean;
}
