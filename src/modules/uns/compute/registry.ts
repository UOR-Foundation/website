/**
 * UNS Compute — Content-Addressed Function Registry
 *
 * Every deployed function has a canonical ID derived from its source bytes.
 * Two deployments of identical source → same canonical ID.
 * One-character difference → completely different canonical ID.
 *
 * Silent code injection is cryptographically impossible: changing the
 * source changes the hash, which changes the canonical ID.
 *
 * @see derivation: namespace — UOR content addressing
 */

import { singleProofHash } from "../core/identity";
import type { UnsKeypair } from "../core/keypair";

// ── Types ───────────────────────────────────────────────────────────────────

/** A content-addressed deployed function. */
export interface ComputeFunction {
  /** Canonical ID derived from source bytes. */
  canonicalId: string;
  /** Raw source bytes. */
  sourceBytes: Uint8Array;
  /** Source language. */
  language: "javascript" | "wasm";
  /** ISO 8601 deployment timestamp. */
  deployedAt: string;
  /** Canonical ID of the deploying identity. */
  deployerCanonicalId: string;
  /** Optional human-readable label. */
  name?: string;
}

// ── Registry Store ──────────────────────────────────────────────────────────

const registry = new Map<string, ComputeFunction>();

/**
 * Deploy a function to the registry.
 *
 * Pipeline:
 *   1. Convert source to Uint8Array if string
 *   2. Compute canonical ID via singleProofHash({ source: base64, language })
 *   3. Store in registry keyed by canonical ID
 *
 * Idempotent: deploying the same source twice returns the same canonical ID.
 */
export async function deployFunction(
  source: string | Uint8Array,
  language: "javascript" | "wasm",
  deployer: UnsKeypair,
  name?: string
): Promise<ComputeFunction> {
  // Step 1: Normalize to bytes
  const sourceBytes =
    typeof source === "string" ? new TextEncoder().encode(source) : source;

  // Step 2: Content-address via singleProofHash
  const sourceBase64 = uint8ToBase64(sourceBytes);
  const identity = await singleProofHash({ source: sourceBase64, language });
  const canonicalId = identity["u:canonicalId"];

  // Step 3: Store (idempotent — same source = same ID)
  if (!registry.has(canonicalId)) {
    const fn: ComputeFunction = {
      canonicalId,
      sourceBytes,
      language,
      deployedAt: new Date().toISOString(),
      deployerCanonicalId: deployer.canonicalId,
      name,
    };
    registry.set(canonicalId, fn);
  }

  return registry.get(canonicalId)!;
}

/** Retrieve a function by canonical ID. */
export function getFunction(canonicalId: string): ComputeFunction | null {
  return registry.get(canonicalId) ?? null;
}

/** List all deployed functions. */
export function listFunctions(): ComputeFunction[] {
  return Array.from(registry.values());
}

/** Clear registry (for testing). */
export function clearRegistry(): void {
  registry.clear();
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
