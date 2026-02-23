/**
 * UOR SDK — App Identity Layer (P2)
 *
 * Every deployed application receives a permanent, unforgeable canonical
 * identity derived from its content bytes via the Single Proof Hashing
 * Standard. Same app = same address. Modified app = different address.
 *
 * This module implements:
 *   - AppManifest: JSON-LD object describing a deployed app
 *   - createManifest / updateManifest / verifyManifest: lifecycle ops
 *   - buildVersionChain: immutable version history ordering
 *   - AppRegistry: in-memory registry with KV persistence
 *
 * @see u: namespace — content addressing
 * @see derivation: namespace — version chain
 */

import { singleProofHash } from "@/lib/uor-canonical";
import { UnsKv } from "@/modules/uns/store/kv";

// ── Inline JSON-LD context (avoids remote fetch during canonicalization) ────

const APP_CONTEXT = {
  app: "https://uor.foundation/app/",
  partition: "https://uor.foundation/partition/",
  u: "https://uor.foundation/u/",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  "app:name": { "@id": "app:name", "@type": "xsd:string" },
  "app:version": { "@id": "app:version", "@type": "xsd:string" },
  "app:sourceUrl": { "@id": "app:sourceUrl", "@type": "@id" },
  "app:entrypoint": { "@id": "app:entrypoint", "@type": "xsd:string" },
  "app:tech": { "@id": "app:tech", "@container": "@set" },
  "app:deployedAt": { "@id": "app:deployedAt", "@type": "xsd:dateTime" },
  "app:developerCanonicalId": { "@id": "app:developerCanonicalId", "@type": "xsd:string" },
  "app:previousCanonicalId": { "@id": "app:previousCanonicalId", "@type": "xsd:string" },
  "partition:irreducibleDensity": { "@id": "partition:irreducibleDensity", "@type": "xsd:double" },
  "u:canonicalId": { "@id": "u:canonicalId", "@type": "xsd:string" },
  "u:ipv6": { "@id": "u:ipv6", "@type": "xsd:string" },
  "u:cid": { "@id": "u:cid", "@type": "xsd:string" },
} as const;

// ── AppManifest ─────────────────────────────────────────────────────────────

export interface AppManifest {
  "@context": typeof APP_CONTEXT;
  "@type": "app:Manifest";
  "app:name": string;
  "app:version": string;
  "app:sourceUrl": string;
  "app:entrypoint": string;
  "app:tech": string[];
  "app:deployedAt": string;
  "app:developerCanonicalId": string;
  "app:previousCanonicalId"?: string;
  "partition:irreducibleDensity": number;
  "u:canonicalId"?: string;
  "u:ipv6"?: string;
  "u:cid"?: string;
}

// ── Input type (computed fields omitted) ────────────────────────────────────

export type ManifestInput = Omit<
  AppManifest,
  "@context" | "u:canonicalId" | "u:ipv6" | "u:cid" | "partition:irreducibleDensity"
>;

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract the hashable portion of a manifest (everything except computed fields).
 */
function hashableManifest(
  m: AppManifest | ManifestInput
): Record<string, unknown> {
  const {
    "u:canonicalId": _a,
    "u:ipv6": _b,
    "u:cid": _c,
    ...rest
  } = m as AppManifest;
  return rest;
}

/**
 * Compute partition density from content bytes.
 * Uses byte-class distribution analysis (algebraic irreducibility).
 */
function computeDensity(input: string): number {
  const bytes = new TextEncoder().encode(input);
  if (bytes.length === 0) return 0;
  const counts = new Uint32Array(256);
  for (const b of bytes) counts[b]++;
  let nonZero = 0;
  for (let i = 0; i < 256; i++) if (counts[i] > 0) nonZero++;
  return nonZero / 256;
}

// ── Manifest Operations ─────────────────────────────────────────────────────

/**
 * Create a new AppManifest with all computed fields populated.
 *
 * 1. Computes partition density from serialized manifest bytes
 * 2. Derives canonical identity via URDNA2015 + SHA-256
 * 3. Returns complete manifest with u:canonicalId, u:ipv6, u:cid
 */
export async function createManifest(
  opts: ManifestInput
): Promise<AppManifest> {
  const serialized = JSON.stringify(opts);
  const density = computeDensity(serialized);

  const withDensity: Omit<AppManifest, "u:canonicalId" | "u:ipv6" | "u:cid"> =
    {
      "@context": APP_CONTEXT,
      ...opts,
      "partition:irreducibleDensity": density,
    };

  const proof = await singleProofHash(withDensity);

  return {
    ...withDensity,
    "u:canonicalId": proof.derivationId,
    "u:ipv6": proof.ipv6Address["u:ipv6"],
    "u:cid": proof.cid,
  };
}

/**
 * Create an updated manifest linked to a previous version.
 *
 * Sets app:previousCanonicalId to the previous version's canonical ID,
 * forming an immutable version chain.
 *
 * @throws Error if previous manifest has no u:canonicalId
 */
export async function updateManifest(
  previous: AppManifest,
  updates: Partial<ManifestInput>
): Promise<AppManifest> {
  if (!previous["u:canonicalId"]) {
    throw new Error(
      "Previous manifest must have u:canonicalId before creating an update"
    );
  }

  const merged: ManifestInput = {
    "@type": previous["@type"],
    "app:name": updates["app:name"] ?? previous["app:name"],
    "app:version": updates["app:version"] ?? previous["app:version"],
    "app:sourceUrl": updates["app:sourceUrl"] ?? previous["app:sourceUrl"],
    "app:entrypoint": updates["app:entrypoint"] ?? previous["app:entrypoint"],
    "app:tech": updates["app:tech"] ?? previous["app:tech"],
    "app:deployedAt": updates["app:deployedAt"] ?? new Date().toISOString(),
    "app:developerCanonicalId":
      updates["app:developerCanonicalId"] ??
      previous["app:developerCanonicalId"],
    "app:previousCanonicalId": previous["u:canonicalId"],
  };

  return createManifest(merged);
}

/**
 * Verify manifest integrity: recompute canonical ID from non-computed fields
 * and compare against the stored u:canonicalId.
 */
export async function verifyManifest(manifest: AppManifest): Promise<boolean> {
  if (!manifest["u:canonicalId"]) return false;

  const hashable = hashableManifest(manifest);
  const proof = await singleProofHash(hashable);
  return proof.derivationId === manifest["u:canonicalId"];
}

/**
 * Sort manifests into version chain order (oldest first).
 *
 * The chain starts with the manifest that has no app:previousCanonicalId
 * and follows forward links. Returns [] if any link is broken.
 */
export function buildVersionChain(manifests: AppManifest[]): AppManifest[] {
  if (manifests.length === 0) return [];

  // Find root (no previous)
  const root = manifests.find((m) => !m["app:previousCanonicalId"]);
  if (!root) return [];

  // Build lookup: previousCanonicalId → manifest
  const byPrev = new Map<string, AppManifest>();
  for (const m of manifests) {
    if (m["app:previousCanonicalId"]) {
      byPrev.set(m["app:previousCanonicalId"], m);
    }
  }

  const chain: AppManifest[] = [root];
  let current = root;

  while (chain.length < manifests.length) {
    const next = byPrev.get(current["u:canonicalId"]!);
    if (!next) return []; // broken chain
    chain.push(next);
    current = next;
  }

  return chain;
}

// ── App Registry ────────────────────────────────────────────────────────────

/**
 * In-memory app manifest registry backed by UNS KV for persistence.
 *
 * Keys:
 *   - `manifest:{canonicalId}` → serialized AppManifest
 *   - `app-name:{name}` → latest canonicalId for that name
 */
export class AppRegistry {
  private readonly kv: UnsKv;

  constructor(kv?: UnsKv) {
    this.kv = kv ?? new UnsKv();
  }

  /** Register a manifest. Returns its canonical ID. */
  async register(manifest: AppManifest): Promise<string> {
    const id = manifest["u:canonicalId"];
    if (!id) throw new Error("Manifest must have u:canonicalId");

    const bytes = new TextEncoder().encode(JSON.stringify(manifest));
    await this.kv.put(`manifest:${id}`, bytes);

    // Update name → latest mapping
    const name = manifest["app:name"];
    const nameBytes = new TextEncoder().encode(id);
    await this.kv.put(`app-name:${name}`, nameBytes);

    return id;
  }

  /** Get manifest by canonical ID. */
  async get(canonicalId: string): Promise<AppManifest | null> {
    const entry = await this.kv.get(`manifest:${canonicalId}`);
    if (!entry) return null;
    return JSON.parse(new TextDecoder().decode(entry.value));
  }

  /** Get latest version by app name. */
  async getByName(name: string): Promise<AppManifest | null> {
    const nameEntry = await this.kv.get(`app-name:${name}`);
    if (!nameEntry) return null;
    const latestId = new TextDecoder().decode(nameEntry.value);
    return this.get(latestId);
  }

  /** Get full version history for an app name (newest first). */
  async getHistory(name: string): Promise<AppManifest[]> {
    // Collect all manifests for this name by following the chain backwards
    const latest = await this.getByName(name);
    if (!latest) return [];

    const history: AppManifest[] = [latest];
    let current = latest;

    while (current["app:previousCanonicalId"]) {
      const prev = await this.get(current["app:previousCanonicalId"]);
      if (!prev) break;
      history.push(prev);
      current = prev;
    }

    return history; // already newest-first
  }

  /** List all registered manifests. */
  async list(limit = 100): Promise<AppManifest[]> {
    const keys = await this.kv.list("manifest:", limit);
    const manifests: AppManifest[] = [];

    for (const { key } of keys) {
      const entry = await this.kv.get(key);
      if (entry) {
        manifests.push(JSON.parse(new TextDecoder().decode(entry.value)));
      }
    }

    return manifests;
  }
}
