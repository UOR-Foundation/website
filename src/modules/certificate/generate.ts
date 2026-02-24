/**
 * Certificate Generation
 * ══════════════════════
 *
 * Generates UOR certificates for any JSON-LD-describable object.
 *
 * The generation pipeline:
 *   1. Canonicalize the object using URDNA2015 (W3C standard)
 *   2. Hash the canonical bytes with SHA-256
 *   3. Derive all four identity forms from the single hash
 *   4. Package everything into a self-verifying certificate
 *
 * The certificate includes the canonical payload, so anyone can
 * independently re-derive the hash and verify authenticity.
 */

import { singleProofHash } from "@/lib/uor-canonical";
import type { UorCertificate } from "./types";

/**
 * Generate a UOR certificate for a single object.
 *
 * @param subject — Human-readable label (e.g., "project:hologram")
 * @param attributes — The object to certify (any JSON-LD or plain object)
 * @returns A complete, self-verifying UOR certificate
 *
 * @example
 * ```ts
 * const cert = await generateCertificate("project:hologram", {
 *   "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
 *   "@type": "uor:ProjectCertificate",
 *   "uor:name": "Hologram",
 *   "uor:category": "Frontier Technology",
 * });
 * ```
 */
export async function generateCertificate(
  subject: string,
  attributes: Record<string, unknown>
): Promise<UorCertificate> {
  const proof = await singleProofHash(attributes);

  return {
    "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
    "@type": "cert:ModuleCertificate",
    "cert:subject": subject,
    "cert:cid": proof.cid,
    "cert:canonicalPayload": proof.nquads,
    "store:uorAddress": proof.uorAddress,
    "store:ipv6Address": proof.ipv6Address,
    "cert:computedAt": new Date().toISOString(),
    "cert:specification": "1.0.0",
  };
}

/**
 * Generate certificates for a batch of named objects.
 *
 * @param items — Array of { subject, attributes } pairs
 * @returns Array of UOR certificates, one per item
 */
export async function generateCertificates(
  items: Array<{ subject: string; attributes: Record<string, unknown> }>
): Promise<UorCertificate[]> {
  return Promise.all(
    items.map((item) => generateCertificate(item.subject, item.attributes))
  );
}
