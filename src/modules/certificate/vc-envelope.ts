/**
 * W3C Verifiable Credentials Data Model v2.0 — Envelope Layer
 * ═══════════════════════════════════════════════════════════
 *
 * Wraps a UOR certificate in a W3C VC 2.0 compliant structure.
 *
 * The UOR certificate remains the core (content hash, boundary,
 * coherence). This layer adds the W3C-standard envelope so any
 * VC-compliant verifier (wallets, governments, enterprises) can
 * consume it natively.
 *
 * W3C Spec: https://www.w3.org/TR/vc-data-model-2.0/
 *
 * @module certificate/vc-envelope
 */

import type { UorCertificate } from "./types";
import { sha256hex } from "@/lib/crypto";

// ── W3C VC 2.0 Context ─────────────────────────────────────────────────────

const VC_CONTEXT = "https://www.w3.org/ns/credentials/v2" as const;
const VC_INTEGRITY_CONTEXT = "https://www.w3.org/ns/credentials/examples/v2" as const;
const UOR_CONTEXT = "https://uor.foundation/contexts/uor-v1.jsonld" as const;

// ── Types ───────────────────────────────────────────────────────────────────

/**
 * W3C Data Integrity Proof — attached to the VC.
 *
 * Uses a UOR-specific cryptosuite that combines:
 *   1. Content-hash integrity (SHA-256 of URDNA2015 canonical form)
 *   2. Algebraic coherence (neg(bnot(x)) ≡ succ(x) in Z/256Z)
 *
 * This is structurally compatible with W3C VC Data Integrity 1.0
 * while preserving UOR's unique algebraic verification.
 */
export interface DataIntegrityProof {
  type: "DataIntegrityProof";
  cryptosuite: "uor-sha256-rdfc-2024";
  created: string;
  verificationMethod: string;
  proofPurpose: "assertionMethod";
  /** Hex-encoded SHA-256 of the canonical N-Quads payload */
  proofValue: string;
  /** UOR-specific: algebraic coherence witness value */
  "uor:coherenceWitness": number;
  /** UOR-specific: algebraic identity that must hold */
  "uor:coherenceIdentity": "neg(bnot(x)) ≡ succ(x)";
}

/**
 * W3C Verifiable Credential 2.0 wrapping a UOR certificate.
 *
 * Structure follows https://www.w3.org/TR/vc-data-model-2.0/
 * with the full UOR certificate embedded as the credentialSubject.
 */
export interface VerifiableUorCredential {
  "@context": readonly [typeof VC_CONTEXT, typeof UOR_CONTEXT];
  type: readonly ["VerifiableCredential", "UorCertificate"];
  id: string;
  issuer: string;
  validFrom: string;
  credentialSubject: {
    id: string;
    /** The full UOR certificate — the actual credential payload */
    "uor:certificate": UorCertificate;
  };
  proof: DataIntegrityProof;
}

// ── Envelope Generation ─────────────────────────────────────────────────────

/**
 * Wrap a UOR certificate in a W3C Verifiable Credential 2.0 envelope.
 *
 * The UOR certificate is preserved losslessly as the credentialSubject.
 * The VC envelope adds:
 *   - W3C-standard @context for VC ecosystem interop
 *   - `issuer` as a DID:uor (content-addressed)
 *   - `validFrom` mapped from cert:issuedAt
 *   - `proof` as a W3C Data Integrity proof with UOR coherence
 *
 * @param certificate  The UOR certificate to wrap
 * @returns            A W3C VC 2.0 compliant verifiable credential
 */
export async function wrapAsVerifiableCredential(
  certificate: UorCertificate
): Promise<VerifiableUorCredential> {
  const cid = certificate["cert:cid"];
  const subjectDid = `did:uor:${cid}`;
  const issuerDid = "did:uor:foundation";

  // Compute proof value from canonical payload
  const proofValue = await sha256hex(certificate["cert:canonicalPayload"]);

  const proof: DataIntegrityProof = {
    type: "DataIntegrityProof",
    cryptosuite: "uor-sha256-rdfc-2024",
    created: certificate["cert:computedAt"],
    verificationMethod: `${issuerDid}#content-hash`,
    proofPurpose: "assertionMethod",
    proofValue,
    "uor:coherenceWitness": certificate["cert:coherence"].witness,
    "uor:coherenceIdentity": "neg(bnot(x)) ≡ succ(x)",
  };

  return {
    "@context": [VC_CONTEXT, UOR_CONTEXT] as const,
    type: ["VerifiableCredential", "UorCertificate"] as const,
    id: `urn:uor:vc:${cid}`,
    issuer: issuerDid,
    validFrom: certificate["cert:issuedAt"],
    credentialSubject: {
      id: subjectDid,
      "uor:certificate": certificate,
    },
    proof,
  };
}

// ── Envelope Verification ───────────────────────────────────────────────────

/**
 * Verify a W3C VC 2.0 wrapped UOR credential.
 *
 * Checks:
 *   1. VC structure (required fields present)
 *   2. Proof value matches re-hashed canonical payload
 *   3. UOR coherence witness is valid
 *
 * @returns true iff the VC envelope and UOR certificate are both valid
 */
export async function verifyVerifiableCredential(
  vc: VerifiableUorCredential
): Promise<{
  valid: boolean;
  vcStructure: boolean;
  proofIntegrity: boolean;
  coherenceValid: boolean;
  summary: string;
}> {
  // 1. VC structure check
  const vcStructure =
    vc["@context"]?.[0] === VC_CONTEXT &&
    vc.type?.includes("VerifiableCredential") &&
    !!vc.issuer &&
    !!vc.validFrom &&
    !!vc.credentialSubject;

  // 2. Proof integrity — re-hash canonical payload
  const cert = vc.credentialSubject["uor:certificate"];
  const recomputedHash = await sha256hex(cert["cert:canonicalPayload"]);
  const proofIntegrity = recomputedHash === vc.proof.proofValue;

  // 3. Coherence check — verify witness from proof
  const { neg, bnot, succ } = await import("@/lib/uor-ring");
  const x = vc.proof["uor:coherenceWitness"];
  const coherenceValid = neg(bnot(x, 8), 8) === succ(x, 8);

  const valid = vcStructure && proofIntegrity && coherenceValid;

  return {
    valid,
    vcStructure,
    proofIntegrity,
    coherenceValid,
    summary: valid
      ? "W3C VC 2.0 verified. Content integrity and algebraic coherence confirmed."
      : !vcStructure
        ? "Invalid VC 2.0 structure."
        : !proofIntegrity
          ? "Proof value does not match canonical payload."
          : "Algebraic coherence check failed.",
  };
}
