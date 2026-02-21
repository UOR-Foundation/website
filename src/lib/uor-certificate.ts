/**
 * UOR Certificate generation.
 * Produces verification receipts for any JSON-LD-describable component.
 */

import { canonicalJsonLd, computeCid, computeUorAddress } from "./uor-address";

export interface UorCertificate {
  "@context": "https://uor.foundation/contexts/uor-v1.jsonld";
  "@type": "cert:ModuleCertificate";
  "cert:subject": string;
  "cert:cid": string;
  "cert:canonicalPayload": string;
  "store:uorAddress": { "u:glyph": string; "u:length": number };
  "cert:computedAt": string;
  "cert:specification": "1.0.0";
}

/**
 * Generate a UOR verification certificate for any describable object.
 * The object is canonicalized, hashed, and addressed.
 */
export async function generateCertificate(
  subject: string,
  attributes: Record<string, unknown>
): Promise<UorCertificate> {
  const canonical = canonicalJsonLd(attributes);
  const bytes = new TextEncoder().encode(canonical);
  const cid = await computeCid(bytes);
  const uorAddress = computeUorAddress(bytes);

  return {
    "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
    "@type": "cert:ModuleCertificate",
    "cert:subject": subject,
    "cert:cid": cid,
    "cert:canonicalPayload": canonical,
    "store:uorAddress": uorAddress,
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
