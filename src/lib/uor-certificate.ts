/**
 * UOR Certificate generation.
 * Produces verification receipts for any JSON-LD-describable component.
 */

import { singleProofHash } from "./uor-canonical";

export interface UorCertificate {
  "@context": "https://uor.foundation/contexts/uor-v1.jsonld";
  "@type": "cert:ModuleCertificate";
  "cert:subject": string;
  "cert:cid": string;
  "cert:canonicalPayload": string;
  "store:uorAddress": { "u:glyph": string; "u:length": number };
  "store:ipv6Address": { "u:ipv6": string; "u:ipv6Prefix": string; "u:ipv6PrefixLength": number; "u:contentBits": number };
  "cert:computedAt": string;
  "cert:specification": "1.0.0";
}

/**
 * Generate a UOR verification certificate for any describable object.
 * The object is canonicalized, hashed, and addressed with all four identity forms.
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
 */
export async function generateCertificates(
  items: Array<{ subject: string; attributes: Record<string, unknown> }>
): Promise<UorCertificate[]> {
  return Promise.all(
    items.map((item) => generateCertificate(item.subject, item.attributes))
  );
}
