/**
 * UOR Certificate Engine — attestations binding derivations to identities.
 *
 * Uses the Single Proof Hashing Standard (URDNA2015) for all identity computation.
 * A Certificate attests that a Derivation is valid by re-verifying it
 * and binding its identity to the UOR content-addressing system.
 *
 * Delegates to:
 *   - derivation.ts for re-verification
 *   - lib/uor-canonical.ts for URDNA2015 Single Proof Hashing
 */

import type { Derivation } from "./derivation";
import { verifyDerivation } from "./derivation";
import type { UORRing } from "@/modules/ring-core/ring";
import type { Term } from "@/modules/ring-core/canonicalization";
import { singleProofHash } from "@/lib/uor-canonical";

// ── Certificate type ────────────────────────────────────────────────────────

export interface Certificate {
  "@type": "cert:DerivationCertificate";
  certificateId: string;
  certifies: string;       // result IRI
  derivationId: string;
  valid: boolean;
  issuedAt: string;
  certChain: string[];     // chain of derivation IDs that led here
}

// ── issueCertificate ────────────────────────────────────────────────────────

/**
 * Issue a certificate for a derivation by re-verifying it.
 * The certificate attests that the derivation is algebraically valid.
 * Certificate ID is computed via URDNA2015 Single Proof Hash.
 */
export async function issueCertificate(
  derivation: Derivation,
  ring: UORRing,
  originalTerm: Term,
  parentChain: string[] = []
): Promise<Certificate> {
  // Re-verify the derivation
  const valid = await verifyDerivation(ring, derivation, originalTerm);

  // Certificate ID via URDNA2015 Single Proof Hash
  const proof = await singleProofHash({
    "@context": { cert: "https://uor.foundation/cert/" },
    "@type": "cert:DerivationCertificate",
    "cert:derivationId": derivation.derivationId,
    "cert:resultIri": derivation.resultIri,
    "cert:valid": String(valid),
  });
  const certificateId = `urn:uor:cert:${proof.cid.slice(0, 24)}`;

  return {
    "@type": "cert:DerivationCertificate",
    certificateId,
    certifies: derivation.resultIri,
    derivationId: derivation.derivationId,
    valid,
    issuedAt: new Date().toISOString(),
    certChain: [...parentChain, derivation.derivationId],
  };
}

// ── verifyCertificate ───────────────────────────────────────────────────────

/**
 * Verify a certificate by re-deriving and checking the derivation ID matches.
 */
export async function verifyCertificate(
  cert: Certificate,
  ring: UORRing,
  originalTerm: Term,
  derivation: Derivation
): Promise<boolean> {
  // Re-verify the underlying derivation
  const derivationValid = await verifyDerivation(ring, derivation, originalTerm);
  return derivationValid && cert.derivationId === derivation.derivationId && cert.valid;
}
