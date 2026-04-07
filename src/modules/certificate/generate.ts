/**
 * Certificate Generation
 * ══════════════════════
 *
 * Pipeline:
 *   1. SOURCE HASH   . SHA-256 of raw source (pre-boundary)
 *   2. BOUNDARY GATE . Define exact object scope
 *   3. SINGLE PROOF  . URDNA2015 → SHA-256 → four identity forms
 *   4. COHERENCE GATE. Verify neg(bnot(x)) ≡ succ(x) on witness
 *   5. PACKAGE       . Self-verifying certificate
 */

import { encode } from "@/lib/uor-codec";
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

  const enriched = await encode(boundary.boundedObject);

  // Extract hash bytes from the enriched receipt for coherence gate
  const hashBytes = new Uint8Array(
    enriched.hashHex.match(/.{2}/g)!.map((b) => parseInt(b, 16))
  );
  const coherence = deriveCoherenceWitness(hashBytes);
  if (!coherence.holds) {
    throw new Error("Algebraic coherence gate failed. system integrity error");
  }

  const now = new Date().toISOString();

  return {
    "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
    "@type": "cert:ModuleCertificate",
    "cert:subject": subject,
    "cert:cid": enriched.cid,
    "cert:canonicalPayload": enriched.nquads,
    "cert:boundary": toCompactBoundary(boundary.manifest),
    "cert:sourceHash": srcHash,
    "cert:coherence": coherence,
    "store:uorAddress": { "u:glyph": enriched.glyph, "u:length": enriched.glyph.length },
    "store:ipv6Address": {
      "u:ipv6": enriched.ipv6,
      "u:ipv6Prefix": "fd00:0075:6f72::/48",
      "u:ipv6PrefixLength": 48,
      "u:contentBits": 80,
    },
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
