/**
 * UNS TypeScript SDK — Module Barrel Export (Phase 5-D)
 *
 * Published as @uns/sdk — the official TypeScript SDK for the
 * UOR Name Service. Provides typed access to all UNS services
 * through a single UnsClient class.
 *
 * @example
 * ```typescript
 * import { UnsClient, generateKeypair, singleProofHash } from "@uns/sdk";
 *
 * const keypair = await generateKeypair();
 * const client = new UnsClient({
 *   nodeUrl: "http://localhost:8080",
 *   identity: keypair,
 * });
 *
 * const id = await client.computeCanonicalId({ hello: "world" });
 * ```
 */

// ── SDK Client ──────────────────────────────────────────────────────────────
export { UnsClient } from "./client";
export type { UnsClientConfig } from "./client";

// ── Core Identity (re-exported for convenience) ─────────────────────────────
export { singleProofHash, verifyCanonical } from "../core/identity";
export { generateKeypair } from "../core/keypair";
export type { UorCanonicalIdentity } from "../core/address";
export type { UnsKeypair, PublicKeyObject, SignatureBlock, SignedRecord } from "../core/keypair";

// ── Name Records ────────────────────────────────────────────────────────────
export type {
  UnsNameRecord, SignedUnsRecord, UnsTarget, UnsService,
} from "../core/record";

// ── Compute ─────────────────────────────────────────────────────────────────
export type { ComputeFunction } from "../compute/registry";
export type { ExecutionResult, ComputationTrace } from "../compute/executor";

// ── Agent Gateway ───────────────────────────────────────────────────────────
export type {
  AgentRegistration, AgentMessage, RouteResult, InjectionAlert, MorphismType,
} from "../compute/agent-gateway";

// ── Store ───────────────────────────────────────────────────────────────────
export type { StoredObject } from "../store/object-store";

// ── Ledger ──────────────────────────────────────────────────────────────────
export type { QueryResult, StateTransition, SchemaMigration } from "../ledger";

// ── Trust ───────────────────────────────────────────────────────────────────
export type { UnsChallenge, UnsSession } from "../trust/auth";
export type { UnsAccessPolicy, UnsAccessRule } from "../trust/policy";

// ── Shield ──────────────────────────────────────────────────────────────────
export type { PartitionResult, ShieldAction } from "../shield/partition";
