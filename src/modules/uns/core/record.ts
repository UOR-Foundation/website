/**
 * UNS Core — Name Record
 *
 * The UNS Name Record replaces ALL DNS record types (A, AAAA, MX, TXT,
 * SRV, CNAME) with a single composable JSON-LD document that is itself
 * content-addressed. Tamper = different canonical ID = rejected.
 *
 * Records support:
 *   - Multiple service endpoints (like SRV records)
 *   - Validity windows (validFrom/validUntil)
 *   - Revocation (uns:revoked)
 *   - Key rotation (uns:successorKeyCanonicalId)
 *   - Quality scoring (partition:irreducibleDensity)
 *
 * The mutable pointer chain works by publishing successive records
 * for the same name. Resolution returns the newest valid, non-revoked
 * record signed by a trusted key.
 */

import { singleProofHash } from "./identity";
import { signRecord, type SignedRecord, type SignatureBlock } from "./keypair";
import type { UnsKeypair } from "./keypair";

// ── Types ───────────────────────────────────────────────────────────────────

/** Service endpoint within a name record. */
export interface UnsService {
  "uns:serviceType": string; // 'https' | 'smtp' | 'uns' | 'ssh' | ...
  "uns:port": number;
  "uns:priority": number;
  "uns:ipv6"?: string; // override target IPv6 for this service
}

/** Target identity — what the name currently points to. */
export interface UnsTarget {
  "u:canonicalId": string;
  "u:ipv6": string;
  "u:cid": string;
}

/** The UNS Name Record — the atomic unit of the name service. */
export interface UnsNameRecord {
  "@context": "https://uor.foundation/contexts/uns-v1.jsonld";
  "@type": "uns:NameRecord";
  "uns:name": string;
  "uns:target": UnsTarget;
  "uns:services": UnsService[];
  "uns:validFrom": string; // ISO 8601
  "uns:validUntil": string; // ISO 8601
  "uns:signerCanonicalId": string;
  "uns:revoked"?: true;
  "uns:successorKeyCanonicalId"?: string;
  "partition:irreducibleDensity": number; // 0..1 quality score
  "cert:signature"?: SignatureBlock;
  "u:canonicalId"?: string; // computed — not in signed bytes
}

/** A signed UNS Name Record. */
export type SignedUnsRecord = SignedRecord<UnsNameRecord>;

// ── Record Creation Options ─────────────────────────────────────────────────

export interface CreateRecordOpts {
  name: string;
  target: UnsTarget;
  services?: UnsService[];
  validFrom?: string; // defaults to now
  validUntil?: string; // defaults to now + 1 year
  signerCanonicalId: string;
  revoked?: true;
  successorKeyCanonicalId?: string;
}

// ── Quality Scoring ─────────────────────────────────────────────────────────

/**
 * Compute the irreducible density score for a record.
 *
 * This is a quality metric based on record completeness:
 *   - Has services? +0.3
 *   - Has valid time window? +0.3
 *   - Has all three target forms? +0.3
 *   - Has successor key? +0.1
 *
 * Range: [0, 1]. Higher = more complete/trustworthy.
 */
function computeIrreducibleDensity(opts: CreateRecordOpts): number {
  let score = 0;
  if (opts.services && opts.services.length > 0) score += 0.3;
  if (opts.validFrom && opts.validUntil) score += 0.3;
  if (
    opts.target["u:canonicalId"] &&
    opts.target["u:ipv6"] &&
    opts.target["u:cid"]
  )
    score += 0.3;
  if (opts.successorKeyCanonicalId) score += 0.1;
  return Math.min(1, Math.round(score * 1000) / 1000);
}

// ── Record Store (local Map — replaced by DHT/DB in production) ─────────────

const recordStore = new Map<string, SignedUnsRecord[]>();

/** Clear the local record store (for testing). */
export function clearRecordStore(): void {
  recordStore.clear();
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Create a UNS Name Record.
 *
 * Builds the record, computes quality score, and content-addresses it.
 * The record is NOT signed — call signRecord() separately.
 */
export async function createRecord(
  opts: CreateRecordOpts
): Promise<UnsNameRecord> {
  const now = new Date().toISOString();
  const oneYear = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000
  ).toISOString();

  const record: UnsNameRecord = {
    "@context": "https://uor.foundation/contexts/uns-v1.jsonld",
    "@type": "uns:NameRecord",
    "uns:name": opts.name,
    "uns:target": opts.target,
    "uns:services": opts.services ?? [],
    "uns:validFrom": opts.validFrom ?? now,
    "uns:validUntil": opts.validUntil ?? oneYear,
    "uns:signerCanonicalId": opts.signerCanonicalId,
    "partition:irreducibleDensity": computeIrreducibleDensity(opts),
  };

  if (opts.revoked) record["uns:revoked"] = true;
  if (opts.successorKeyCanonicalId)
    record["uns:successorKeyCanonicalId"] = opts.successorKeyCanonicalId;

  // Compute content address (canonical ID of the record itself)
  const identity = await singleProofHash(record);
  record["u:canonicalId"] = identity["u:canonicalId"];

  return record;
}

/**
 * Sign and publish a record to the local store.
 *
 * @returns The canonical ID of the published record.
 */
export async function publishRecord(
  record: UnsNameRecord,
  keypair: UnsKeypair
): Promise<string> {
  const signed = await signRecord(record, keypair);

  // Store by name for resolution
  const name = signed["uns:name"];
  const existing = recordStore.get(name) ?? [];
  existing.push(signed);
  recordStore.set(name, existing);

  return signed["u:canonicalId"] ?? "";
}

/**
 * Resolve the newest valid, non-revoked record for a name.
 *
 * Resolution rules:
 *   1. Filter out revoked records (uns:revoked === true)
 *   2. Filter to records where validFrom <= now <= validUntil
 *   3. Return the record with the newest validFrom
 *
 * Returns null if no valid record exists.
 */
export function resolveByName(name: string): SignedUnsRecord | null {
  const records = recordStore.get(name);
  if (!records || records.length === 0) return null;

  const now = new Date().toISOString();

  const valid = records
    .filter((r) => !r["uns:revoked"])
    .filter((r) => r["uns:validFrom"] <= now && r["uns:validUntil"] >= now)
    .sort((a, b) =>
      b["uns:validFrom"].localeCompare(a["uns:validFrom"])
    );

  return valid[0] ?? null;
}
