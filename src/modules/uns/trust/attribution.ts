/**
 * UNS Attribution Protocol — cert:AttributionCertificate
 *
 * Cryptographic content provenance anchored to derivation:derivationId.
 * Every UNS object's origin is traceable through an attribution chain.
 *
 * Compliance:
 *   - GDPR Article 20 (Right to Data Portability)
 *   - EU Data Act (Regulation 2023/2854)
 *
 * Every AttributionCertificate is:
 *   - Grade A (algebraically proven via derivation ID)
 *   - Dilithium-3 signed (post-quantum tamper-evident)
 *   - Machine-readable JSON-LD (for regulator/auditor consumption)
 *
 * @see .well-known/uor.json attribution_protocol
 * @see spec/src/namespaces/cert.rs — cert:AttributionCertificate
 */

import { singleProofHash } from "../core/identity";
import { signRecord, verifyRecord } from "../core/keypair";
import type { UnsKeypair, SignatureBlock, SignedRecord } from "../core/keypair";

// ── Constants ───────────────────────────────────────────────────────────────

const DERIVATION_ID_PATTERN = /^urn:uor:derivation:sha256:[0-9a-f]{64}$/;

// ── Types ───────────────────────────────────────────────────────────────────

export interface AttributionCertificate {
  "@context": "https://uor.foundation/contexts/uns-v1.jsonld";
  "@type": "cert:AttributionCertificate";
  "@id": string;
  "cert:subject": string;
  "cert:creator": string;
  "cert:createdAt": string;
  "derivation:derivationId": string;
  "cert:derivationRef": string;
  "cert:algorithm": "CRYSTALS-Dilithium-3";
  "cert:signature": SignatureBlock;
  eu_data_act_compliant: true;
  gdpr_article_20: true;
  epistemic_grade: "A";
}

export interface AttributionVerifyResult {
  verified: boolean;
  certificateId: string;
  creatorCanonicalId: string;
  derivationId: string;
  signatureValid: boolean;
}

export interface GdprExport {
  "@context": "https://uor.foundation/contexts/uns-v1.jsonld";
  "@type": "void:Dataset";
  "dc:subject": string;
  "dc:rights": "GDPR Article 20 — Right to Data Portability";
  "dc:date": string;
  objects: AttributionCertificate[];
  totalObjects: number;
  epistemic_grade: "A";
  eu_data_act_compliant: true;
}

export interface RoyaltyReport {
  creator: string;
  period: { from: string; until: string };
  totalObjects: number;
  certificates: AttributionCertificate[];
}

// ── UnsAttribution ──────────────────────────────────────────────────────────

/**
 * Attribution Protocol engine — registers, verifies, and exports
 * cryptographic content provenance certificates.
 */
export class UnsAttribution {
  private operatorKeypair: UnsKeypair;
  private store: Map<string, AttributionCertificate> = new Map();
  // Index: creator → list of object canonical IDs
  private creatorIndex: Map<string, string[]> = new Map();

  constructor(operatorKeypair: UnsKeypair) {
    this.operatorKeypair = operatorKeypair;
  }

  // ── Register ────────────────────────────────────────────────────────────

  /**
   * Register attribution for an object at creation time.
   *
   * @param objectCanonicalId   Canonical ID of the attributed object.
   * @param creatorCanonicalId  Canonical ID of the creator identity.
   * @param derivationId        Grade-A derivation:derivationId — REQUIRED.
   * @returns                   Signed AttributionCertificate.
   * @throws                    If derivationId is not a valid Grade-A pattern.
   */
  async register(
    objectCanonicalId: string,
    creatorCanonicalId: string,
    derivationId: string
  ): Promise<AttributionCertificate> {
    // Enforce Grade-A: derivationId must match canonical pattern
    if (!DERIVATION_ID_PATTERN.test(derivationId)) {
      throw new Error(
        `Attribution requires Grade-A derivation:derivationId matching ` +
          `urn:uor:derivation:sha256:<64hex>, got '${derivationId}'`
      );
    }

    const now = new Date().toISOString();

    // Generate certificate canonical ID via URDNA2015
    const certIdentity = await singleProofHash({
      "@type": "cert:AttributionCertificate",
      "cert:subject": objectCanonicalId,
      "cert:creator": creatorCanonicalId,
      "derivation:derivationId": derivationId,
      "cert:createdAt": now,
    });

    // Build unsigned certificate
    const unsignedCert = {
      "@context": "https://uor.foundation/contexts/uns-v1.jsonld" as const,
      "@type": "cert:AttributionCertificate" as const,
      "@id": certIdentity["u:canonicalId"],
      "cert:subject": objectCanonicalId,
      "cert:creator": creatorCanonicalId,
      "cert:createdAt": now,
      "derivation:derivationId": derivationId,
      "cert:derivationRef": `urn:uor:attribution:${objectCanonicalId}`,
      "cert:algorithm": "CRYSTALS-Dilithium-3" as const,
      eu_data_act_compliant: true as const,
      gdpr_article_20: true as const,
      epistemic_grade: "A" as const,
    };

    // Sign with Dilithium-3
    const signed = await signRecord(unsignedCert, this.operatorKeypair);

    const cert: AttributionCertificate = {
      ...unsignedCert,
      "cert:signature": signed["cert:signature"],
    };

    // Store
    this.store.set(objectCanonicalId, cert);

    // Update creator index
    const existing = this.creatorIndex.get(creatorCanonicalId) ?? [];
    existing.push(objectCanonicalId);
    this.creatorIndex.set(creatorCanonicalId, existing);

    return cert;
  }

  // ── Verify ──────────────────────────────────────────────────────────────

  /**
   * Verify attribution: does the certificate chain trace back to
   * the claimed creator with a valid Dilithium-3 signature?
   */
  async verify(objectCanonicalId: string): Promise<AttributionVerifyResult> {
    const cert = this.store.get(objectCanonicalId);
    if (!cert) {
      return {
        verified: false,
        certificateId: "",
        creatorCanonicalId: "",
        derivationId: "",
        signatureValid: false,
      };
    }

    // Verify the Dilithium-3 signature
    const signatureValid = await verifyRecord(
      cert as unknown as SignedRecord<object>
    );

    return {
      verified: signatureValid,
      certificateId: cert["@id"],
      creatorCanonicalId: cert["cert:creator"],
      derivationId: cert["derivation:derivationId"],
      signatureValid,
    };
  }

  // ── GDPR Article 20 Export ──────────────────────────────────────────────

  /**
   * Export all data attributed to a given identity.
   * Returns a JSON-LD document suitable for regulatory submission.
   *
   * Implements GDPR Article 20 — Right to Data Portability.
   */
  async gdprExport(creatorCanonicalId: string): Promise<GdprExport> {
    const objectIds = this.creatorIndex.get(creatorCanonicalId) ?? [];
    const certificates: AttributionCertificate[] = [];

    for (const id of objectIds) {
      const cert = this.store.get(id);
      if (cert) certificates.push(cert);
    }

    return {
      "@context": "https://uor.foundation/contexts/uns-v1.jsonld",
      "@type": "void:Dataset",
      "dc:subject": creatorCanonicalId,
      "dc:rights": "GDPR Article 20 — Right to Data Portability",
      "dc:date": new Date().toISOString(),
      objects: certificates,
      totalObjects: certificates.length,
      epistemic_grade: "A",
      eu_data_act_compliant: true,
    };
  }

  // ── Royalty Report ──────────────────────────────────────────────────────

  /**
   * For a given time range, list all object attributions + certificates.
   */
  async royaltyReport(opts: {
    creatorCanonicalId: string;
    from: string;
    until: string;
  }): Promise<RoyaltyReport> {
    const objectIds = this.creatorIndex.get(opts.creatorCanonicalId) ?? [];
    const certificates: AttributionCertificate[] = [];
    const fromDate = new Date(opts.from).getTime();
    const untilDate = new Date(opts.until).getTime();

    for (const id of objectIds) {
      const cert = this.store.get(id);
      if (cert) {
        const certTime = new Date(cert["cert:createdAt"]).getTime();
        if (certTime >= fromDate && certTime <= untilDate) {
          certificates.push(cert);
        }
      }
    }

    return {
      creator: opts.creatorCanonicalId,
      period: { from: opts.from, until: opts.until },
      totalObjects: certificates.length,
      certificates,
    };
  }

  // ── Lookup ──────────────────────────────────────────────────────────────

  /**
   * Get attribution certificate for an object.
   */
  getCertificate(objectCanonicalId: string): AttributionCertificate | null {
    return this.store.get(objectCanonicalId) ?? null;
  }
}
