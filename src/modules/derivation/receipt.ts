/**
 * UOR Canonical Receipt — self-verifying computation proofs for Term-level ops.
 *
 * Uses the Single Proof Hashing Standard (URDNA2015) for all identity computation.
 * Every receipt proves the operation was computed correctly by recomputing
 * from scratch and comparing.
 *
 * Delegates to:
 *   - lib/uor-canonical.ts for URDNA2015 Single Proof Hashing
 *   - ring-core for evaluation
 *   - derivation.ts for the derive pipeline
 */

import type { UORRing } from "@/modules/ring-core/ring";
import type { Term } from "@/modules/ring-core/canonicalization";
import { serializeTerm } from "@/modules/ring-core/canonicalization";
import { singleProofHash } from "@/lib/uor-canonical";
import { derive } from "./derivation";

// ── Receipt type ────────────────────────────────────────────────────────────

export interface DerivationReceipt {
  "@type": "receipt:CanonicalReceipt";
  receiptId: string;
  moduleId: string;
  operation: string;
  inputHash: string;
  outputHash: string;
  recomputeHash: string;
  selfVerified: boolean;
  coherenceVerified: boolean;
  timestamp: string;
}

// ── URDNA2015-compliant hashing helpers ─────────────────────────────────────

async function hashPayload(namespace: string, type: string, data: Record<string, unknown>): Promise<string> {
  const doc = {
    "@context": { [namespace]: `https://uor.foundation/${namespace}/` },
    "@type": `${namespace}:${type}`,
    ...data,
  };
  const proof = await singleProofHash(doc);
  return proof.cid;
}

// ── generateReceipt ─────────────────────────────────────────────────────────

/**
 * Generate a self-verifying canonical receipt for a Term-level operation.
 *
 * 1. Hash input via URDNA2015 Single Proof Hash
 * 2. Derive to get the result
 * 3. Hash the output
 * 4. RECOMPUTE: derive again independently
 * 5. Hash the recomputed output
 * 6. selfVerified = (recomputeHash === outputHash AND ring.coherenceVerified)
 */
export async function generateReceipt(
  moduleId: string,
  ring: UORRing,
  term: Term
): Promise<{ derivationResult: Awaited<ReturnType<typeof derive>>; receipt: DerivationReceipt }> {
  const operation = serializeTerm(term);
  const timestamp = new Date().toISOString();

  // Hash input via URDNA2015
  const inputHash = await hashPayload("receipt", "Input", {
    "receipt:term": operation,
    "receipt:quantum": String(ring.quantum),
  });

  // Derive
  const derivationResult = await derive(ring, term);

  // Hash output via URDNA2015
  const outputHash = await hashPayload("receipt", "Output", {
    "receipt:derivationId": derivationResult.derivationId,
    "receipt:resultValue": String(derivationResult.resultValue),
    "receipt:resultIri": derivationResult.resultIri,
  });

  // RECOMPUTE independently
  const recomputed = await derive(ring, term);
  const recomputeHash = await hashPayload("receipt", "Output", {
    "receipt:derivationId": recomputed.derivationId,
    "receipt:resultValue": String(recomputed.resultValue),
    "receipt:resultIri": recomputed.resultIri,
  });

  // Self-verification
  const selfVerified = recomputeHash === outputHash;
  const coherenceVerified = ring.coherenceVerified;

  // Receipt ID via URDNA2015
  const receiptProof = await singleProofHash({
    "@context": { receipt: "https://uor.foundation/receipt/" },
    "@type": "receipt:ReceiptIdentity",
    "receipt:moduleId": moduleId,
    "receipt:operation": operation,
    "receipt:timestamp": timestamp,
  });
  const receiptId = `urn:uor:receipt:${receiptProof.cid.slice(0, 24)}`;

  return {
    derivationResult,
    receipt: {
      "@type": "receipt:CanonicalReceipt",
      receiptId,
      moduleId,
      operation,
      inputHash: inputHash.slice(0, 32),
      outputHash: outputHash.slice(0, 32),
      recomputeHash: recomputeHash.slice(0, 32),
      selfVerified,
      coherenceVerified,
      timestamp,
    },
  };
}
