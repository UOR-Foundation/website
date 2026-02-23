/**
 * UNS Build — Deployment Snapshot
 *
 * Unified versioning gate: binds code, dependencies, and data state
 * into a single content-addressed canonical ID. Everything goes through
 * the same singleProofHash gate.
 *
 * A DeploymentSnapshot is the atomic unit of "what was running at time T":
 *   - Code identity    (AppManifest canonical ID)
 *   - Image identity   (UorImage canonical ID — includes all build layers)
 *   - Dependency lock   (SHA-256 of deterministic lockfile bytes)
 *   - Data state        (database state canonical ID from UnsLedger)
 *   - Config state      (environment + secrets fingerprint)
 *
 * Snapshots form an immutable chain via previousSnapshotId, enabling
 * `uor rollback <snapshot-id>` and `uor diff <a> <b>`.
 *
 * @see derivation: namespace — canonical identity
 * @see state: namespace — state transitions
 */

import { singleProofHash } from "../core/identity";
import { UnsKv } from "../store/kv";

// ── Types ───────────────────────────────────────────────────────────────────

/** A single component contributing to the deployment snapshot. */
export interface SnapshotComponent {
  /** Component type. */
  type: "code" | "image" | "dependencies" | "data" | "config";
  /** Canonical ID of this component's current state. */
  canonicalId: string;
  /** Human label (e.g., "package-lock.json", "app-manifest v2.1"). */
  label: string;
  /** Byte size (optional, for display). */
  sizeBytes?: number;
}

/** The unified deployment snapshot — one canonical ID for everything. */
export interface DeploymentSnapshot {
  "@context": "https://uor.foundation/contexts/uor-v1.jsonld";
  "@type": "state:DeploymentSnapshot";
  /** Canonical ID of this snapshot (computed). */
  "u:canonicalId": string;
  /** CIDv1. */
  "u:cid": string;
  /** IPv6 content address. */
  "u:ipv6": string;
  /** All components that compose this snapshot. */
  components: SnapshotComponent[];
  /** Link to previous snapshot (version chain). */
  previousSnapshotId?: string;
  /** Deployment label (e.g., "v2.1.0", "staging-2025-02-23"). */
  label: string;
  /** When this snapshot was created. */
  createdAt: string;
  /** Who created this snapshot. */
  creatorCanonicalId: string;
  /** Semantic version (auto-incremented or explicit). */
  version: string;
}

/** Input for creating a snapshot (computed fields omitted). */
export interface SnapshotInput {
  /** Components to include. */
  components: SnapshotComponent[];
  /** Link to previous snapshot. */
  previousSnapshotId?: string;
  /** Deployment label. */
  label: string;
  /** Who is creating this snapshot. */
  creatorCanonicalId: string;
  /** Semantic version. */
  version: string;
}

/** Diff between two snapshots. */
export interface SnapshotDiff {
  /** Components added in the newer snapshot. */
  added: SnapshotComponent[];
  /** Components removed in the newer snapshot. */
  removed: SnapshotComponent[];
  /** Components whose canonical ID changed. */
  changed: Array<{
    type: string;
    label: string;
    fromCanonicalId: string;
    toCanonicalId: string;
  }>;
  /** Components that are identical. */
  unchanged: SnapshotComponent[];
}

// ── Snapshot Factory ────────────────────────────────────────────────────────

/**
 * Create a deployment snapshot from its components.
 *
 * All components pass through the same singleProofHash gate.
 * The snapshot's canonical ID is derived from the ordered list
 * of component canonical IDs — same components = same snapshot.
 */
export async function createSnapshot(
  input: SnapshotInput,
): Promise<DeploymentSnapshot> {
  // Sort components deterministically by type for canonical stability
  const sorted = [...input.components].sort((a, b) =>
    a.type.localeCompare(b.type),
  );

  // The hashable payload: ordered component IDs + metadata
  const hashPayload = {
    "@type": "state:DeploymentSnapshot",
    components: sorted.map((c) => ({
      type: c.type,
      canonicalId: c.canonicalId,
    })),
    previousSnapshotId: input.previousSnapshotId ?? null,
    label: input.label,
    version: input.version,
  };

  const proof = await singleProofHash(hashPayload);

  return {
    "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
    "@type": "state:DeploymentSnapshot",
    "u:canonicalId": proof["u:canonicalId"],
    "u:cid": proof["u:cid"],
    "u:ipv6": proof["u:ipv6"],
    components: sorted,
    previousSnapshotId: input.previousSnapshotId,
    label: input.label,
    createdAt: new Date().toISOString(),
    creatorCanonicalId: input.creatorCanonicalId,
    version: input.version,
  };
}

/**
 * Verify a snapshot's integrity: recompute canonical ID from components.
 */
export async function verifySnapshot(
  snapshot: DeploymentSnapshot,
): Promise<boolean> {
  const hashPayload = {
    "@type": "state:DeploymentSnapshot",
    components: snapshot.components.map((c) => ({
      type: c.type,
      canonicalId: c.canonicalId,
    })),
    previousSnapshotId: snapshot.previousSnapshotId ?? null,
    label: snapshot.label,
    version: snapshot.version,
  };

  const proof = await singleProofHash(hashPayload);
  return proof["u:canonicalId"] === snapshot["u:canonicalId"];
}

/**
 * Compute a diff between two snapshots.
 */
export function diffSnapshots(
  older: DeploymentSnapshot,
  newer: DeploymentSnapshot,
): SnapshotDiff {
  const olderMap = new Map(older.components.map((c) => [c.type, c]));
  const newerMap = new Map(newer.components.map((c) => [c.type, c]));

  const added: SnapshotComponent[] = [];
  const removed: SnapshotComponent[] = [];
  const changed: SnapshotDiff["changed"] = [];
  const unchanged: SnapshotComponent[] = [];

  // Check newer against older
  for (const [type, comp] of newerMap) {
    const old = olderMap.get(type);
    if (!old) {
      added.push(comp);
    } else if (old.canonicalId !== comp.canonicalId) {
      changed.push({
        type,
        label: comp.label,
        fromCanonicalId: old.canonicalId,
        toCanonicalId: comp.canonicalId,
      });
    } else {
      unchanged.push(comp);
    }
  }

  // Check older for removals
  for (const [type, comp] of olderMap) {
    if (!newerMap.has(type)) {
      removed.push(comp);
    }
  }

  return { added, removed, changed, unchanged };
}

// ── Snapshot Helpers ─────────────────────────────────────────────────────────

/**
 * Create a component from raw bytes (e.g., lockfile, config).
 * Hashes the bytes through singleProofHash for canonical identity.
 */
export async function hashComponentBytes(
  type: SnapshotComponent["type"],
  label: string,
  bytes: Uint8Array,
): Promise<SnapshotComponent> {
  // Wrap bytes in a semantic envelope for the gate
  const proof = await singleProofHash({
    "@type": `build:${type}`,
    label,
    byteLength: bytes.length,
    // Use base64 of first 64 bytes as fingerprint for determinism
    fingerprint: bytesToBase64(bytes.slice(0, 64)),
    fullHash: bytesToHex(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer),
      ),
    ),
  });

  return {
    type,
    canonicalId: proof["u:canonicalId"],
    label,
    sizeBytes: bytes.length,
  };
}

/**
 * Build a version chain from an array of snapshots (oldest first).
 */
export function buildSnapshotChain(
  snapshots: DeploymentSnapshot[],
): DeploymentSnapshot[] {
  if (snapshots.length === 0) return [];

  const root = snapshots.find((s) => !s.previousSnapshotId);
  if (!root) return [];

  const byPrev = new Map<string, DeploymentSnapshot>();
  for (const s of snapshots) {
    if (s.previousSnapshotId) {
      byPrev.set(s.previousSnapshotId, s);
    }
  }

  const chain: DeploymentSnapshot[] = [root];
  let current = root;

  while (chain.length < snapshots.length) {
    const next = byPrev.get(current["u:canonicalId"]);
    if (!next) break;
    chain.push(next);
    current = next;
  }

  return chain;
}

// ── Snapshot Registry (KV-backed) ───────────────────────────────────────────

/**
 * Persistent snapshot registry backed by UNS KV.
 *
 * Keys:
 *   snapshot:{canonicalId}    → serialized DeploymentSnapshot
 *   snapshot-label:{label}    → latest canonicalId for that label
 *   snapshot-latest:{creator} → most recent snapshot for creator
 */
export class SnapshotRegistry {
  constructor(private readonly kv: UnsKv) {}

  /** Store a snapshot. */
  async store(snapshot: DeploymentSnapshot): Promise<string> {
    const id = snapshot["u:canonicalId"];
    const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
    await this.kv.put(`snapshot:${id}`, bytes);
    await this.kv.put(
      `snapshot-label:${snapshot.label}`,
      new TextEncoder().encode(id),
    );
    await this.kv.put(
      `snapshot-latest:${snapshot.creatorCanonicalId}`,
      new TextEncoder().encode(id),
    );
    return id;
  }

  /** Get snapshot by canonical ID. */
  async get(canonicalId: string): Promise<DeploymentSnapshot | null> {
    const entry = await this.kv.get(`snapshot:${canonicalId}`);
    if (!entry) return null;
    return JSON.parse(new TextDecoder().decode(entry.value));
  }

  /** Get latest snapshot by label. */
  async getByLabel(label: string): Promise<DeploymentSnapshot | null> {
    const entry = await this.kv.get(`snapshot-label:${label}`);
    if (!entry) return null;
    const id = new TextDecoder().decode(entry.value);
    return this.get(id);
  }

  /** Get latest snapshot for a creator. */
  async getLatest(
    creatorCanonicalId: string,
  ): Promise<DeploymentSnapshot | null> {
    const entry = await this.kv.get(
      `snapshot-latest:${creatorCanonicalId}`,
    );
    if (!entry) return null;
    const id = new TextDecoder().decode(entry.value);
    return this.get(id);
  }

  /** List all snapshots. */
  async list(limit = 100): Promise<DeploymentSnapshot[]> {
    const keys = await this.kv.list("snapshot:", limit);
    const snapshots: DeploymentSnapshot[] = [];
    for (const { key } of keys) {
      // Skip label/latest index keys
      if (key.startsWith("snapshot-")) continue;
      const entry = await this.kv.get(key);
      if (entry) {
        snapshots.push(
          JSON.parse(new TextDecoder().decode(entry.value)),
        );
      }
    }
    return snapshots;
  }

  /** Get full version chain for a creator (oldest first). */
  async getChain(
    creatorCanonicalId: string,
  ): Promise<DeploymentSnapshot[]> {
    const all = await this.list();
    const forCreator = all.filter(
      (s) => s.creatorCanonicalId === creatorCanonicalId,
    );
    return buildSnapshotChain(forCreator);
  }
}

// ── Utilities ───────────────────────────────────────────────────────────────

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
