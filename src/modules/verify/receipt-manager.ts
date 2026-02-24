/**
 * UOR Self-Verification: Receipt Manager — generic receipt wrapper.
 *
 * Uses the Single Proof Hashing Standard (URDNA2015) for all identity computation.
 * Wraps ANY operation with canonical receipt generation.
 *
 * Delegates to:
 *   - lib/uor-canonical.ts for URDNA2015 Single Proof Hashing
 *   - kg-store/store for receipt persistence (ingestReceipt)
 */

import type { DerivationReceipt } from "@/modules/derivation/receipt";
import { singleProofHash } from "@/lib/uor-canonical";
import { ingestReceipt } from "@/modules/kg-store/store";

// ── URDNA2015-compliant hashing ─────────────────────────────────────────────

async function hashPayload(label: string, data: unknown): Promise<string> {
  const doc = {
    "@context": { receipt: "https://uor.foundation/receipt/" },
    "@type": `receipt:${label}`,
    "receipt:data": data,
  };
  const proof = await singleProofHash(doc);
  return proof.cid;
}

// ── Generic receipt wrapper ─────────────────────────────────────────────────

/**
 * Wrap any operation with self-verifying canonical receipt generation.
 *
 * 1. Hash canonical input via URDNA2015
 * 2. Execute the operation
 * 3. Hash the output
 * 4. RECOMPUTE: execute the operation again independently
 * 5. Hash the recomputed output
 * 6. selfVerified = recomputeHash === outputHash
 */
export async function withVerifiedReceipt<T>(
  moduleId: string,
  operation: string,
  fn: () => Promise<T> | T,
  getInput: () => unknown,
  coherenceVerified = true
): Promise<{ result: T; receipt: DerivationReceipt }> {
  const timestamp = new Date().toISOString();

  // Hash input via URDNA2015
  const inputHash = await hashPayload("Input", getInput());

  // Execute
  const result = await fn();

  // Hash output via URDNA2015
  const outputHash = await hashPayload("Output", result);

  // RECOMPUTE independently
  const recomputed = await fn();
  const recomputeHash = await hashPayload("Output", recomputed);

  // Self-verification
  const selfVerified = recomputeHash === outputHash;

  // Receipt ID via URDNA2015
  const receiptProof = await singleProofHash({
    "@context": { receipt: "https://uor.foundation/receipt/" },
    "@type": "receipt:ReceiptIdentity",
    "receipt:moduleId": moduleId,
    "receipt:operation": operation,
    "receipt:timestamp": timestamp,
  });
  const receiptId = `urn:uor:receipt:${receiptProof.cid.slice(0, 24)}`;

  const receipt: DerivationReceipt = {
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
  };

  // Persist receipt
  try {
    await ingestReceipt(receipt);
  } catch {
    // Non-fatal: receipt persistence failure should not block the operation
  }

  return { result, receipt };
}
