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
 * W3C Compliance:
 *   - VC Data Model 2.0: https://www.w3.org/TR/vc-data-model-2.0/
 *   - Data Integrity 1.0: https://www.w3.org/TR/vc-data-integrity/
 *
 * Key design decisions:
 *   - proofValue uses multibase 'f' (base16 lowercase) per DI §2.1
 *   - Custom UOR properties on proof are namespaced under uor: context
 *   - The VC v2 context bundles Data Integrity terms natively
 *
 * @module certificate/vc-envelope
 */

import type { UorCertificate } from "./types";
import { sha256hex } from "@/lib/crypto";

// ── W3C VC 2.0 Context ─────────────────────────────────────────────────────
// Per VC DM 2.0 §4.3: The v2 context includes Data Integrity terms.
// No separate DI context needed when using https://www.w3.org/ns/credentials/v2.

const VC_CONTEXT = "https://www.w3.org/ns/credentials/v2" as const;
const UOR_CONTEXT = "https://uor.foundation/contexts/uor-v1.jsonld" as const;

// ── Types ───────────────────────────────────────────────────────────────────

/**
 * W3C Data Integrity Proof — attached to the VC.
 *
 * Per VC Data Integrity 1.0 §2.1:
 *   - type: MUST be "DataIntegrityProof"
 *   - cryptosuite: MUST be specified when type is DataIntegrityProof
 *   - proofPurpose: MUST be specified
 *   - verificationMethod: MUST be a URL
 *   - proofValue: MUST be a multibase-encoded value
 *   - created: SHOULD be an ISO 8601 datetime
 *
 * UOR extensions are namespaced to avoid collision with W3C terms.
 */
export interface DataIntegrityProof {
  /** W3C DI §2.1: MUST be "DataIntegrityProof" */
  type: "DataIntegrityProof";
  /** W3C DI §2.1: Cryptographic suite identifier */
  cryptosuite: "uor-sha256-rdfc-2024";
  /** W3C DI §2.1: ISO 8601 creation timestamp */
  created: string;
  /** W3C DI §2.1: URL identifying the verification method */
  verificationMethod: string;
  /** W3C DI §2.1: Purpose of this proof */
  proofPurpose: "assertionMethod";
  /**
   * W3C DI §2.1: Multibase-encoded proof value.
   * Uses 'f' prefix (base16 lowercase) per Multibase spec.
   * Value is SHA-256 of the URDNA2015 canonical N-Quads payload.
   */
  proofValue: string;
  /** UOR extension: algebraic coherence witness value (0–255) */
  "uor:coherenceWitness": number;
  /** UOR extension: the algebraic identity that must hold */
  "uor:coherenceIdentity": "neg(bnot(x)) ≡ succ(x)";
}

/**
 * W3C Verifiable Credential 2.0 wrapping a UOR certificate.
 *
 * Structure follows https://www.w3.org/TR/vc-data-model-2.0/ §4:
 *   - @context: MUST include VC v2 context as first entry
 *   - type: MUST include "VerifiableCredential"
 *   - issuer: MUST be a URL or object with id
 *   - validFrom: SHOULD be present
 *   - credentialSubject: MUST be present
 *   - proof: Added per Data Integrity 1.0
 */
export interface VerifiableUorCredential {
  "@context": readonly [typeof VC_CONTEXT, typeof UOR_CONTEXT];
  type: readonly ["VerifiableCredential", "UorCertificate"];
  id: string;
  issuer: {
    id: string;
    name: string;
  };
  validFrom: string;
  credentialSubject: {
    id: string;
    /** The full UOR certificate — the actual credential payload */
    "uor:certificate": UorCertificate;
  };
  proof: DataIntegrityProof;
}

// ── Multibase Encoding ──────────────────────────────────────────────────────

/**
 * Encode a hex string as multibase base16 lowercase.
 * Per Multibase spec: prefix 'f' = base16 (lowercase hex).
 */
function toMultibaseHex(hex: string): string {
  return `f${hex.toLowerCase()}`;
}

/**
 * Decode a multibase base16 string back to raw hex.
 * Strips the 'f' prefix and returns lowercase hex.
 */
function fromMultibaseHex(multibase: string): string {
  if (!multibase.startsWith("f")) {
    throw new Error(`Expected multibase 'f' prefix (base16), got '${multibase[0]}'`);
  }
  return multibase.slice(1).toLowerCase();
}

// ── Envelope Generation ─────────────────────────────────────────────────────

/**
 * Wrap a UOR certificate in a W3C Verifiable Credential 2.0 envelope.
 *
 * The UOR certificate is preserved losslessly as the credentialSubject.
 * The VC envelope adds:
 *   - W3C-standard @context for VC ecosystem interop
 *   - `issuer` as a DID:uor with name (VC DM 2.0 §4.4)
 *   - `validFrom` mapped from cert:issuedAt (VC DM 2.0 §4.8)
 *   - `proof` as a W3C Data Integrity proof with UOR coherence (DI §2.1)
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

  // Compute proof value from canonical payload, then multibase-encode
  const rawHex = await sha256hex(certificate["cert:canonicalPayload"]);
  const proofValue = toMultibaseHex(rawHex);

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
    issuer: {
      id: issuerDid,
      name: "UOR Foundation",
    },
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
 * Checks (aligned with VC DM 2.0 §7 and DI §4):
 *   1. VC structure — required fields per VC DM 2.0 §4
 *   2. Proof integrity — re-hash canonical payload, compare multibase proofValue
 *   3. UOR coherence — verify algebraic witness
 *
 * @returns Verification result with per-layer diagnostics
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
  // 1. VC structure check (VC DM 2.0 §4)
  const vcStructure =
    vc["@context"]?.[0] === VC_CONTEXT &&
    vc.type?.includes("VerifiableCredential") &&
    !!vc.issuer &&
    typeof vc.issuer === "object" && !!vc.issuer.id &&
    !!vc.validFrom &&
    !!vc.credentialSubject;

  // 2. Proof integrity — re-hash canonical payload, compare via multibase
  const cert = vc.credentialSubject["uor:certificate"];
  const recomputedHex = await sha256hex(cert["cert:canonicalPayload"]);
  const storedHex = fromMultibaseHex(vc.proof.proofValue);
  const proofIntegrity = recomputedHex === storedHex;

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
        ? "Invalid VC 2.0 structure — missing required fields per §4."
        : !proofIntegrity
          ? "Proof value does not match canonical payload (Data Integrity §4)."
          : "Algebraic coherence check failed (UOR ring identity).",
  };
}
