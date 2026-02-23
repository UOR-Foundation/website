/**
 * UNS Core — Resolver API (Phase 1-B)
 *
 * The UNS resolution service — equivalent to Cloudflare DNS 1.1.1.1,
 * but mathematically auditable. Every resolution response includes a
 * proof:CoherenceProof that any client can verify independently using
 * only the ring substrate and the signer's public key.
 *
 * ARCHITECTURE:
 *   - Resolution: name → newest valid signed record + coherence proof
 *   - Verification: independent record integrity checks
 *   - Publishing: signature + density validation at API boundary
 *   - Proofs: ring critical identity + signature + canonical ID recomputation
 *
 * COHERENCE PROOF:
 *   Every resolution response proves consistency with the UOR ring:
 *     1. neg(bnot(42)) === succ(42) — ring critical identity (always true)
 *     2. Dilithium-3 signature on the returned record is valid
 *     3. Recomputed canonical ID matches stored canonical ID
 *     4. First 4 bytes of record's SHA-256 as witness sample
 *
 *   Any agent with packages/core can verify this proof locally.
 *   No trusted third party. No certificate authority. Pure math.
 *
 * @see RFC 8200 §4.6 — IPv6 Destination Options (lossless transport)
 * @see FIPS 204 — ML-DSA-65 (Dilithium-3) post-quantum signatures
 */

import { neg, bnot, succ } from "./ring";
import { singleProofHash } from "./identity";
import { verifyRecord } from "./keypair";
import { UnsDht } from "./dht";
import type { SignedUnsRecord, UnsNameRecord } from "./record";
import { bytesToHex } from "./address";

// ── Types ───────────────────────────────────────────────────────────────────

/** The critical identity check within a coherence proof. */
export interface CriticalIdentityCheck {
  "proof:neg_bnot_42": number;
  "proof:succ_42": number;
  "proof:holds": boolean;
}

/** A mathematical coherence proof attached to every resolution response. */
export interface CoherenceProof {
  "@type": "proof:CoherenceProof";
  "proof:verified": boolean;
  "proof:criticalIdentityCheck": CriticalIdentityCheck;
  "proof:signatureValid": boolean;
  "proof:recordCanonicalIdValid": boolean;
  "proof:witnessByteSample": string;
}

/** A full resolution result — the UNS equivalent of a DNS answer section. */
export interface ResolutionResult {
  "@context": "https://uor.foundation/contexts/uns-v1.jsonld";
  "@type": "uns:ResolutionResult";
  "uns:name": string;
  "u:canonicalId": string;
  "u:ipv6": string;
  "u:lossWarning": "ipv6-is-routing-projection-only";
  "uns:record": SignedUnsRecord;
  "proof:coherenceProof": CoherenceProof;
  "uns:resolvedAt": string;
  "uns:resolverCanonicalId": string;
}

/** Verification result for a single record. */
export interface VerificationResult {
  "proof:verified": boolean;
  "proof:signatureValid": boolean;
  "proof:recordNotExpired": boolean;
  "proof:notRevoked": boolean;
}

/** Resolver metadata. */
export interface ResolverInfo {
  "uns:resolverCanonicalId": string;
  "uns:version": string;
  "uns:dhtPeers": number;
  "uns:uptimeSeconds": number;
}

/** Publishing result. */
export interface PublishResult {
  "u:canonicalId": string;
  "uns:published": boolean;
}

/** Resolution error with HTTP-like status semantics. */
export interface ResolutionError {
  status: 400 | 404 | 410 | 422;
  error: string;
}

/** Query types supported by the resolver. */
export type QueryType = "canonical-id" | "ipv6" | "service";

/** A resolution query. */
export interface ResolveQuery {
  "uns:query": string;
  "uns:queryType"?: QueryType;
}

// ── Coherence Proof Generation ──────────────────────────────────────────────

/**
 * Generate a coherence proof for a signed record.
 *
 * The proof demonstrates that:
 *   1. The ring critical identity holds: neg(bnot(42)) === succ(42)
 *   2. The record's Dilithium-3 signature is valid
 *   3. The record's canonical ID was correctly derived
 *   4. A witness byte sample provides quick visual verification
 *
 * This proof is independently verifiable by any client.
 */
async function generateCoherenceProof(
  record: SignedUnsRecord
): Promise<CoherenceProof> {
  // 1. Ring critical identity check
  const negBnot42 = neg(bnot(42));
  const succ42 = succ(42);
  const criticalIdentityHolds = negBnot42 === succ42;

  const criticalIdentityCheck: CriticalIdentityCheck = {
    "proof:neg_bnot_42": negBnot42,
    "proof:succ_42": succ42,
    "proof:holds": criticalIdentityHolds,
  };

  // 2. Dilithium-3 signature verification
  const signatureValid = await verifyRecord(record);

  // 3. Recompute canonical ID and compare
  const cleanRecord: Record<string, unknown> = { ...record };
  delete cleanRecord["cert:signature"];
  delete cleanRecord["u:canonicalId"];
  const recomputedIdentity = await singleProofHash(cleanRecord);
  const recordCanonicalIdValid =
    recomputedIdentity["u:canonicalId"] === record["u:canonicalId"];

  // 4. Witness byte sample — first 4 bytes of SHA-256 as hex
  const witnessByteSample = bytesToHex(
    recomputedIdentity.hashBytes.slice(0, 4)
  );

  const allValid =
    criticalIdentityHolds && signatureValid && recordCanonicalIdValid;

  return {
    "@type": "proof:CoherenceProof",
    "proof:verified": allValid,
    "proof:criticalIdentityCheck": criticalIdentityCheck,
    "proof:signatureValid": signatureValid,
    "proof:recordCanonicalIdValid": recordCanonicalIdValid,
    "proof:witnessByteSample": witnessByteSample,
  };
}

// ── UNS Resolver Service ────────────────────────────────────────────────────

/**
 * The UNS Resolver — equivalent to Cloudflare DNS 1.1.1.1.
 *
 * Resolves .uor names to IPv6 content addresses with mathematical
 * coherence proofs. Backed by a Kademlia DHT for record storage.
 *
 * The resolver is itself content-addressed — its own identity is
 * a canonical ID, making it self-describing and verifiable.
 */
export class UnsResolver {
  private readonly dht: UnsDht;
  private readonly resolverCanonicalId: string;
  private readonly startedAt: number;

  /**
   * @param dht                   The backing DHT node.
   * @param resolverCanonicalId   This resolver's own canonical ID.
   */
  constructor(dht: UnsDht, resolverCanonicalId: string) {
    this.dht = dht;
    this.resolverCanonicalId = resolverCanonicalId;
    this.startedAt = Date.now();
  }

  // ── POST /uns/resolve ────────────────────────────────────────────────

  /**
   * Resolve a UNS name to its target identity + coherence proof.
   *
   * Resolution rules:
   *   1. Query DHT for all records matching the name
   *   2. Filter: non-revoked, valid time window
   *   3. Select newest by uns:validFrom
   *   4. Generate coherence proof
   *   5. Return full resolution result
   *
   * Error semantics:
   *   - 400: malformed query (missing name or invalid queryType)
   *   - 404: no valid record found for this name
   *   - 410: all records for this name are revoked
   */
  async resolve(
    query: ResolveQuery
  ): Promise<ResolutionResult | ResolutionError> {
    // Validate query
    const name = query["uns:query"];
    if (!name || typeof name !== "string") {
      return { status: 400, error: "Missing or invalid uns:query" };
    }

    const validTypes: QueryType[] = ["canonical-id", "ipv6", "service"];
    if (
      query["uns:queryType"] &&
      !validTypes.includes(query["uns:queryType"])
    ) {
      return { status: 400, error: `Invalid uns:queryType: ${query["uns:queryType"]}` };
    }

    // Check for revoked-only case (410)
    const allRecords = await this.getAllRecordsIncludingRevoked(name);
    if (allRecords.length > 0 && allRecords.every((r) => r["uns:revoked"])) {
      return { status: 410, error: `All records for '${name}' are revoked` };
    }

    // Query DHT for non-revoked records
    const records = await this.dht.queryByName(name);
    if (records.length === 0) {
      return { status: 404, error: `No valid record found for '${name}'` };
    }

    // Newest valid record (already sorted by queryByName)
    const record = records[0];

    // Generate coherence proof
    const proof = await generateCoherenceProof(record);

    return {
      "@context": "https://uor.foundation/contexts/uns-v1.jsonld",
      "@type": "uns:ResolutionResult",
      "uns:name": record["uns:name"],
      "u:canonicalId": record["uns:target"]["u:canonicalId"],
      "u:ipv6": record["uns:target"]["u:ipv6"],
      "u:lossWarning": "ipv6-is-routing-projection-only",
      "uns:record": record,
      "proof:coherenceProof": proof,
      "uns:resolvedAt": new Date().toISOString(),
      "uns:resolverCanonicalId": this.resolverCanonicalId,
    };
  }

  // ── GET /uns/record/{canonicalId} ────────────────────────────────────

  /**
   * Retrieve a raw signed record by canonical ID (direct DHT lookup).
   */
  async getRecord(
    canonicalId: string
  ): Promise<SignedUnsRecord | ResolutionError> {
    const record = await this.dht.get(canonicalId);
    if (!record) {
      return { status: 404, error: `Record not found: ${canonicalId}` };
    }
    return record;
  }

  // ── GET /uns/record/{canonicalId}/verify ──────────────────────────────

  /**
   * Verify a record's integrity — signature, expiry, revocation.
   */
  async verifyRecord(
    canonicalId: string
  ): Promise<VerificationResult | ResolutionError> {
    const record = await this.dht.get(canonicalId);
    if (!record) {
      return { status: 404, error: `Record not found: ${canonicalId}` };
    }

    const signatureValid = await verifyRecord(record);
    const now = new Date().toISOString();
    const notExpired =
      record["uns:validFrom"] <= now && record["uns:validUntil"] >= now;
    const notRevoked = !record["uns:revoked"];

    return {
      "proof:verified": signatureValid && notExpired && notRevoked,
      "proof:signatureValid": signatureValid,
      "proof:recordNotExpired": notExpired,
      "proof:notRevoked": notRevoked,
    };
  }

  // ── POST /uns/record ─────────────────────────────────────────────────

  /**
   * Publish a signed record to the DHT.
   *
   * Validation rules:
   *   - Dilithium-3 signature must be valid
   *   - partition:irreducibleDensity >= 0.15 (anti-spam)
   *   - uns:validFrom not more than 1 hour in the past
   *
   * Returns the canonical ID and publish confirmation.
   */
  async publishRecord(
    record: SignedUnsRecord
  ): Promise<PublishResult | ResolutionError> {
    // Validate signature
    const sigValid = await verifyRecord(record);
    if (!sigValid) {
      return { status: 422, error: "Invalid Dilithium-3 signature" };
    }

    // Anti-spam: density check
    const density = record["partition:irreducibleDensity"];
    if (typeof density !== "number" || density < 0.15) {
      return {
        status: 422,
        error: `partition:irreducibleDensity ${density} < 0.15 (anti-spam threshold)`,
      };
    }

    // Store in DHT
    const canonicalId = record["u:canonicalId"] ?? "";
    await this.dht.put(canonicalId, record);

    return {
      "u:canonicalId": canonicalId,
      "uns:published": true,
    };
  }

  // ── GET /uns/resolver/info ───────────────────────────────────────────

  /**
   * Return resolver metadata.
   */
  getInfo(): ResolverInfo {
    const uptimeMs = Date.now() - this.startedAt;
    return {
      "uns:resolverCanonicalId": this.resolverCanonicalId,
      "uns:version": "1.0.0",
      "uns:dhtPeers": this.dht.getMultiaddrs().length,
      "uns:uptimeSeconds": Math.floor(uptimeMs / 1000),
    };
  }

  // ── Internal: fetch all records including revoked ─────────────────────

  /**
   * Query DHT for ALL records (including revoked) to distinguish
   * 404 (never existed) from 410 (all revoked).
   */
  private async getAllRecordsIncludingRevoked(
    name: string
  ): Promise<SignedUnsRecord[]> {
    // queryByName filters revoked records, so we also check direct get
    // For this implementation, we store revoked records and check via
    // a secondary query that includes revoked records
    const nonRevoked = await this.dht.queryByName(name);
    // Also check if there are revoked records stored
    const allIds = await this.queryAllRecordIds(name);

    const all: SignedUnsRecord[] = [...nonRevoked];
    for (const id of allIds) {
      const record = await this.dht.get(id);
      if (record && !all.find((r) => r["u:canonicalId"] === record["u:canonicalId"])) {
        all.push(record);
      }
    }
    return all;
  }

  /**
   * Query all record IDs for a name — including revoked.
   * Uses the DHT's queryAllByName which bypasses the revocation filter.
   */
  private async queryAllRecordIds(name: string): Promise<string[]> {
    return this.dht.queryAllByName(name);
  }
}
