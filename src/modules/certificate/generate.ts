/**
 * Certificate Generation
 * ══════════════════════
 *
 * Generates UOR certificates for any JSON-LD-describable object.
 *
 * The generation pipeline:
 *   1. ENFORCE BOUNDARY — Define the exact scope of the object
 *   2. Canonicalize the bounded object using URDNA2015 (W3C standard)
 *   3. Hash the canonical bytes with SHA-256
 *   4. Derive all four identity forms from the single hash
 *   5. Package everything into a self-verifying certificate
 *
 * The certificate includes the boundary manifest AND the canonical
 * payload, so anyone can independently verify both the scope and
 * the content of the certified object.
 */

import { singleProofHash } from "@/lib/uor-canonical";
import { enforceBoundary } from "./boundary";
import type { UorCertificate } from "./types";

/**
 * Generate a UOR certificate for a single object.
 *
 * The object passes through boundary enforcement BEFORE
 * canonicalization, ensuring the certified scope is explicit.
 *
 * @param subject — Human-readable label (e.g., "project:hologram")
 * @param attributes — The object to certify (any JSON-LD or plain object)
 * @returns A complete, self-verifying UOR certificate with boundary manifest
 *
 * @throws If the object fails boundary enforcement (null, non-object)
 */
export async function generateCertificate(
  subject: string,
  attributes: Record<string, unknown>
): Promise<UorCertificate> {
  // Step 1: Enforce strict object boundaries
  const boundary = await enforceBoundary(attributes);
  if (!boundary.valid) {
    throw new Error(`Boundary enforcement failed: ${boundary.error}`);
  }

  // Step 2: Canonicalize the BOUNDED object (not the raw input)
  const proof = await singleProofHash(boundary.boundedObject);

  // Step 3: Snapshot the creation moment — immutable issuance timestamp
  const now = new Date().toISOString();

  return {
    "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
    "@type": "cert:ModuleCertificate",
    "cert:subject": subject,
    "cert:cid": proof.cid,
    "cert:canonicalPayload": proof.nquads,
    "cert:boundary": boundary.manifest,
    "store:uorAddress": proof.uorAddress,
    "store:ipv6Address": proof.ipv6Address,
    "cert:computedAt": now,
    "cert:issuedAt": now,
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
