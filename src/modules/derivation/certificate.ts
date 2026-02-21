/**
 * UOR Certificate Engine — attestations binding derivations to identities.
 *
 * A Certificate attests that a Derivation is valid by re-verifying it
 * and binding its identity to the UOR content-addressing system.
 *
 * Delegates to:
 *   - derivation.ts for re-verification
 *   - lib/uor-address.ts for CID computation
 *   - lib/uor-certificate.ts for the underlying certificate generation pattern
 *
 * Zero duplication of crypto or addressing logic.
 */

import type { Derivation } from "./derivation";
import { verifyDerivation } from "./derivation";
import type { UORRing } from "@/modules/ring-core/ring";
import type { Term } from "@/modules/ring-core/canonicalization";
import { canonicalJsonLd, computeCid } from "@/lib/uor-address";

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
 */
export async function issueCertificate(
  derivation: Derivation,
  ring: UORRing,
  originalTerm: Term,
  parentChain: string[] = []
): Promise<Certificate> {
  // Re-verify the derivation
  const valid = await verifyDerivation(ring, derivation, originalTerm);

  // Certificate ID: CID of the derivation record
  const canonical = canonicalJsonLd({
    derivationId: derivation.derivationId,
    resultIri: derivation.resultIri,
    valid,
  });
  const bytes = new TextEncoder().encode(canonical);
  const cid = await computeCid(bytes);
  const certificateId = `urn:uor:cert:${cid.slice(0, 24)}`;

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
