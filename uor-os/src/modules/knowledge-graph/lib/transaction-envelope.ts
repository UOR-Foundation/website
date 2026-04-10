/**
 * Transaction Envelopes — ACID-like Batched Mutations.
 * ═════════════════════════════════════════════════════
 *
 * Wraps critical graph mutations in content-addressed batches.
 * Each committed transaction gets a CID for audit trail.
 *
 * Atomicity: All mutations are concatenated into a single SPARQL UPDATE
 * and applied as one operation. CID is computed BEFORE application —
 * if apply fails, nothing is committed.
 *
 * Usage:
 *   const tx = beginTransaction("identity");
 *   tx.addMutation("INSERT DATA { ... }");
 *   tx.addMutation("INSERT DATA { ... }");
 *   await tx.commit();  // atomic apply + CID
 */

import { sparqlUpdate } from "../grafeo-store";
import { getProvider } from "../persistence";
import { singleProofHash } from "@/lib/uor-canonical";
import type { ChangeEntry } from "../persistence/types";

// ── Transaction ─────────────────────────────────────────────────────────────

export interface Transaction {
  /** Namespace this transaction belongs to */
  readonly namespace: string;
  /** Mutations queued in this transaction */
  readonly mutations: string[];
  /** Add a SPARQL UPDATE mutation to the buffer */
  addMutation(sparql: string): void;
  /** Atomically apply all mutations and persist the transaction CID */
  commit(): Promise<string>;
  /** Discard all buffered mutations */
  rollback(): void;
  /** Whether the transaction has been committed or rolled back */
  readonly settled: boolean;
}

/**
 * Begin a new transaction.
 */
export function beginTransaction(namespace: string = "default"): Transaction {
  const mutations: string[] = [];
  let settled = false;

  return {
    get namespace() { return namespace; },
    get mutations() { return [...mutations]; },
    get settled() { return settled; },

    addMutation(sparql: string): void {
      if (settled) throw new Error("Transaction already settled");
      mutations.push(sparql);
    },

    async commit(): Promise<string> {
      if (settled) throw new Error("Transaction already settled");
      if (mutations.length === 0) throw new Error("Empty transaction");
      settled = true;

      // 1. Content-address the batch BEFORE applying (deterministic CID)
      const batchPayload = {
        "@type": "uor:TransactionBatch",
        "uor:namespace": namespace,
        "uor:mutations": mutations,
        "uor:timestamp": new Date().toISOString(),
      };
      const identity = await singleProofHash(batchPayload);
      const cid = identity["u:canonicalId"] ?? identity.derivationId;

      // 2. Concatenate all mutations into a single SPARQL UPDATE for atomicity
      const atomicUpdate = mutations.join(" ;\n");

      // 3. Apply atomically — single call, all-or-nothing
      await sparqlUpdate(atomicUpdate);

      // 4. Persist the transaction CID to provider (best-effort)
      const change: ChangeEntry = {
        changeCid: cid,
        namespace,
        payload: JSON.stringify(batchPayload),
        timestamp: batchPayload["uor:timestamp"],
        deviceId: localStorage.getItem("uor:device-id") || "unknown",
        userId: "local",
      };

      try {
        const provider = getProvider();
        await provider.pushChanges([change]);
      } catch (err) {
        console.warn("[Transaction] Provider push failed (local commit succeeded):", err);
      }

      console.log(`[Transaction] ✓ Committed ${mutations.length} mutations atomically → CID: ${cid.slice(0, 16)}…`);
      return cid;
    },

    rollback(): void {
      if (settled) throw new Error("Transaction already settled");
      settled = true;
      mutations.length = 0;
      console.log("[Transaction] Rolled back");
    },
  };
}
