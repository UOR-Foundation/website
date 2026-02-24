/**
 * Certificate Generation
 * ══════════════════════
 *
 * Generates UOR certificates for any JSON-LD-describable object.
 *
 * The generation pipeline:
 *   1. HASH SOURCE    — SHA-256 of the raw source (pre-boundary)
 *   2. ENFORCE BOUNDARY — Define the exact scope of the object
 *   3. CANONICALIZE   — URDNA2015 (W3C standard)
 *   4. SINGLE PROOF   — SHA-256 → four identity forms
 *   5. COHERENCE GATE — Verify neg(bnot(x)) ≡ succ(x) on witness
 *   6. PACKAGE        — Self-verifying certificate with compact boundary
 */

import { singleProofHash } from "@/lib/uor-canonical";
import { enforceBoundary } from "./boundary";
import { deriveCoherenceWitness } from "./coherence";
import type { UorCertificate, CompactBoundary } from "./types";

/**
 * SHA-256 hex of an arbitrary object (pre-boundary snapshot).
 */
async function sourceObjectHash(obj: Record<string, unknown>): Promise<string> {
  const json = JSON.stringify(obj, Object.keys(obj).sort());
  const bytes = new TextEncoder().encode(json);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate a UOR certificate for a single object.
 *
 * @param subject — Human-readable label (e.g., "project:hologram")
 * @param attributes — The object to certify
 * @returns A complete, self-verifying UOR certificate
 */
export async function generateCertificate(
  subject: string,
  attributes: Record<string, unknown>
): Promise<UorCertificate> {
  // Step 1: Hash the raw source object (before boundary enforcement)
  const srcHash = await sourceObjectHash(attributes);

  // Step 2: Enforce strict object boundaries
  const boundary = await enforceBoundary(attributes);
  if (!boundary.valid) {
    throw new Error(`Boundary enforcement failed: ${boundary.error}`);
  }

  // Step 3: Canonicalize the BOUNDED object
  const proof = await singleProofHash(boundary.boundedObject);

  // Step 4: Derive algebraic coherence witness from the content hash
  const coherence = deriveCoherenceWitness(proof.hashBytes);
  if (!coherence.holds) {
    throw new Error("Algebraic coherence gate failed — system integrity error");
  }

  // Step 5: Build compact boundary (shape identity only)
  const compactBoundary: CompactBoundary = {
    boundaryHash: boundary.manifest.boundaryHash,
    keys: boundary.manifest.boundaryKeys,
    declaredType: boundary.manifest.declaredType,
    fieldCount: boundary.manifest.totalFields,
  };

  // Step 6: Snapshot creation moment
  const now = new Date().toISOString();

  return {
    "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
    "@type": "cert:ModuleCertificate",
    "cert:subject": subject,
    "cert:cid": proof.cid,
    "cert:canonicalPayload": proof.nquads,
    "cert:boundary": compactBoundary,
    "cert:sourceHash": srcHash,
    "cert:coherence": coherence,
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
