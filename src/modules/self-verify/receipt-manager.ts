/**
 * UOR Self-Verification: Receipt Manager — generic receipt wrapper.
 *
 * Wraps ANY operation with canonical receipt generation using the same
 * SHA-256 hashing pattern established in derivation/receipt.ts.
 *
 * This is the GENERIC version — derivation/receipt.ts handles Term-level
 * derivations specifically; this module handles arbitrary operations.
 *
 * Delegates to:
 *   - lib/uor-address.ts for canonical hashing (computeCid)
 *   - kg-store/store for receipt persistence (ingestReceipt)
 *
 * Zero duplication — reuses existing DerivationReceipt type and persistence.
 */

import type { DerivationReceipt } from "@/modules/derivation/receipt";
import { canonicalJsonLd, computeCid } from "@/lib/uor-address";
import { ingestReceipt } from "@/modules/kg-store/store";

// ── Generic receipt wrapper ─────────────────────────────────────────────────

/**
 * Wrap any operation with self-verifying canonical receipt generation.
 *
 * 1. Hash canonical input via SHA-256
 * 2. Execute the operation
 * 3. Hash the output
 * 4. RECOMPUTE: execute the operation again independently
 * 5. Hash the recomputed output
 * 6. selfVerified = recomputeHash === outputHash
 *
 * @param moduleId   - Module that produced this receipt
 * @param operation  - Human-readable operation name
 * @param fn         - The operation to execute (called twice for self-verification)
 * @param getInput   - Returns a serializable representation of the input
 * @param coherenceVerified - Whether the ring coherence check passed
 */
export async function withVerifiedReceipt<T>(
  moduleId: string,
  operation: string,
  fn: () => Promise<T> | T,
  getInput: () => unknown,
  coherenceVerified = true
): Promise<{ result: T; receipt: DerivationReceipt }> {
  const timestamp = new Date().toISOString();

  // Hash input
  const inputPayload = canonicalJsonLd(getInput());
  const inputHash = await computeCid(new TextEncoder().encode(inputPayload));

  // Execute
  const result = await fn();

  // Hash output
  const outputPayload = canonicalJsonLd(result);
  const outputHash = await computeCid(new TextEncoder().encode(outputPayload));

  // RECOMPUTE independently
  const recomputed = await fn();
  const recomputePayload = canonicalJsonLd(recomputed);
  const recomputeHash = await computeCid(new TextEncoder().encode(recomputePayload));

  // Self-verification
  const selfVerified = recomputeHash === outputHash;

  // Receipt ID
  const receiptIdPayload = `${moduleId}:${operation}:${timestamp}`;
  const receiptId = `urn:uor:receipt:${(await computeCid(new TextEncoder().encode(receiptIdPayload))).slice(0, 24)}`;

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
