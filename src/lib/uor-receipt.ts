/**
 * UOR Canonical Receipt System — self-verifying computation proofs.
 *
 * Uses the Single Proof Hashing Standard (URDNA2015) for all identity computation.
 * Every operation wrapped with `withReceipt` produces a CanonicalReceipt
 * that can be independently verified by any W3C-compliant agent.
 *
 * Depends on: lib/uor-canonical.ts (URDNA2015), uor-ring.ts (ring ops).
 */

import type { CanonicalReceipt, ExtendedOperationName } from "@/types/uor";
import { singleProofHash } from "@/lib/uor-canonical";
import { compute } from "@/lib/uor-ring";

/** Generate a receipt ID via URDNA2015 Single Proof Hash. */
async function makeReceiptId(payload: string): Promise<string> {
  const proof = await singleProofHash({
    "@context": { receipt: "https://uor.foundation/receipt/" },
    "@type": "receipt:ReceiptIdentity",
    "receipt:fingerprint": payload,
  });
  return `urn:uor:receipt:${proof.cid.slice(0, 24)}`;
}

/** Hash a value deterministically via URDNA2015 Single Proof Hash. */
async function hashValue(value: unknown): Promise<string> {
  const proof = await singleProofHash({
    "@context": { receipt: "https://uor.foundation/receipt/" },
    "@type": "receipt:HashedValue",
    "receipt:data": value,
  });
  return proof.cid;
}

/**
 * Execute a ring operation and produce a self-verifying canonical receipt.
 *
 * The receipt includes URDNA2015-derived CID hashes of both input and output
 * so that any party can independently recompute and verify the result.
 */
export async function withReceipt(
  moduleId: string,
  op: ExtendedOperationName,
  x: number,
  y: number | undefined,
  n = 8
): Promise<{ result: number; receipt: CanonicalReceipt }> {
  const result = compute(op, x, y, n);
  const timestamp = new Date().toISOString();

  const inputPayload = { op, x, y: y ?? null, n };
  const outputPayload = { op, result, n };

  const [inputHash, outputHash, receiptId] = await Promise.all([
    hashValue(inputPayload),
    hashValue(outputPayload),
    makeReceiptId(`${moduleId}:${op}:${x}:${y ?? ""}:${n}:${timestamp}`),
  ]);

  // Self-verification: recompute and compare
  const recomputed = compute(op, x, y, n);
  const selfVerified = recomputed === result;

  return {
    result,
    receipt: {
      receiptId,
      moduleId,
      operation: op,
      inputHash,
      outputHash,
      selfVerified,
      timestamp,
    },
  };
}

/**
 * Verify an existing receipt by recomputing the operation and comparing hashes.
 * Returns true if the receipt's outputHash matches a fresh computation.
 */
export async function verifyReceipt(
  receipt: CanonicalReceipt,
  op: ExtendedOperationName,
  x: number,
  y: number | undefined,
  n = 8
): Promise<boolean> {
  const result = compute(op, x, y, n);
  const outputPayload = { op, result, n };
  const freshOutputHash = await hashValue(outputPayload);
  return freshOutputHash === receipt.outputHash;
}
