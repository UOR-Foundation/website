/**
 * Certificate Generation
 * ══════════════════════
 *
 * Pipeline:
 *   1. SOURCE HASH    — SHA-256 of raw source (pre-boundary)
 *   2. BOUNDARY GATE  — Define exact object scope
 *   3. SINGLE PROOF   — URDNA2015 → SHA-256 → four identity forms
 *   4. COHERENCE GATE — Verify neg(bnot(x)) ≡ succ(x) on witness
 *   5. PACKAGE        — Self-verifying certificate
 */

import { singleProofHash } from "@/lib/uor-canonical";
import { enforceBoundary } from "./boundary";
import { deriveCoherenceWitness } from "./coherence";
import { sourceObjectHash, toCompactBoundary } from "./utils";
import type { UorCertificate } from "./types";

export async function generateCertificate(
  subject: string,
  attributes: Record<string, unknown>
): Promise<UorCertificate> {
  const srcHash = await sourceObjectHash(attributes);

  const boundary = await enforceBoundary(attributes);
  if (!boundary.valid) {
    throw new Error(`Boundary enforcement failed: ${boundary.error}`);
  }

  const proof = await singleProofHash(boundary.boundedObject);

  const coherence = deriveCoherenceWitness(proof.hashBytes);
  if (!coherence.holds) {
    throw new Error("Algebraic coherence gate failed — system integrity error");
  }

  const now = new Date().toISOString();

  return {
    "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
    "@type": "cert:ModuleCertificate",
    "cert:subject": subject,
    "cert:cid": proof.cid,
    "cert:canonicalPayload": proof.nquads,
    "cert:boundary": toCompactBoundary(boundary.manifest),
    "cert:sourceHash": srcHash,
    "cert:coherence": coherence,
    "store:uorAddress": proof.uorAddress,
    "store:ipv6Address": proof.ipv6Address,
    "cert:computedAt": now,
    "cert:issuedAt": now,
    "cert:specification": "1.0.0",
  };
}

export async function generateCertificates(
  items: Array<{ subject: string; attributes: Record<string, unknown> }>
): Promise<UorCertificate[]> {
  return Promise.all(
    items.map((item) => generateCertificate(item.subject, item.attributes))
  );
}
