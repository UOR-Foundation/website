/**
 * UNS Core — Distributed Hash Table (Kademlia)
 *
 * The UNS DHT replaces traditional authoritative DNS nameservers.
 * Any node can store and serve records — authority is mathematical,
 * not institutional. Records are keyed by their canonical SHA-256 ID
 * and always Dilithium-3 verified before being returned.
 *
 * ARCHITECTURE:
 *   - Kademlia XOR-distance routing (k=20 replication factor)
 *   - Records keyed by canonical SHA-256 bytes (IPFS-compatible keyspace)
 *   - In-memory peer transport (production: libp2p TCP/QUIC)
 *   - Name index for queryByName() without full keyspace scan
 *   - Signature verification at the DHT layer (not application layer)
 *
 * CONFLICT RESOLUTION:
 *   - Same name, multiple records → prefer latest uns:validFrom
 *   - uns:revoked: true → stored but filtered from positive resolution
 *   - Invalid signature → rejected on put() and get()
 *
 * IPFS COMPATIBILITY:
 *   - DHT key = SHA-256 multihash = identical to IPFS CIDv1 sha2-256
 *   - IPFS nodes are natural peers in the same keyspace
 *
 * @see Maymounkov & Mazières, "Kademlia: A Peer-to-peer Information System
 *      Based on the XOR Metric" (2002)
 */

import { verifyRecord } from "./keypair";
import { NameIndex } from "./name-index";
import type { SignedUnsRecord } from "./record";

// ── Types ───────────────────────────────────────────────────────────────────

/** Configuration for a DHT node. */
export interface DhtNodeConfig {
  /** Unique node identifier (used for multiaddr generation). */
  nodeId: string;
  /** Port number (used for multiaddr display — no actual binding in-process). */
  port: number;
  /** Kademlia replication factor. Default: 20. */
  k?: number;
}

/** Internal peer reference for the in-process transport. */
interface PeerRef {
  nodeId: string;
  multiaddr: string;
  dht: UnsDht;
}

// ── Global Peer Registry (in-process transport) ─────────────────────────────

/**
 * In-process peer registry — replaces libp2p's network transport.
 *
 * In production this would be replaced by libp2p TCP/QUIC connections.
 * Here, nodes register themselves and communicate via direct method calls.
 */
const peerRegistry = new Map<string, PeerRef>();

/** Clear the global peer registry (for test isolation). */
export function clearPeerRegistry(): void {
  peerRegistry.clear();
}

// ── Kademlia Helpers ────────────────────────────────────────────────────────

/**
 * Parse canonical ID to raw 32-byte key.
 *
 * Input: "urn:uor:derivation:sha256:{hex64}"
 * Output: 32-byte Uint8Array
 */
function canonicalIdToKey(canonicalId: string): Uint8Array {
  const hex = canonicalId.replace("urn:uor:derivation:sha256:", "");
  if (hex.length !== 64) {
    throw new Error(`Invalid canonical ID hex length: ${hex.length}`);
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * XOR distance between two 32-byte keys (Kademlia metric).
 *
 * Returns a BigInt for precise comparison.
 */
function xorDistance(a: Uint8Array, b: Uint8Array): bigint {
  let distance = 0n;
  for (let i = 0; i < 32; i++) {
    distance = (distance << 8n) | BigInt(a[i] ^ b[i]);
  }
  return distance;
}

/**
 * Derive a stable 32-byte node key from the nodeId string.
 * Uses a simple hash-like derivation (deterministic, not cryptographic).
 */
function nodeIdToKey(nodeId: string): Uint8Array {
  const bytes = new Uint8Array(32);
  const encoded = new TextEncoder().encode(nodeId);
  for (let i = 0; i < encoded.length; i++) {
    bytes[i % 32] ^= encoded[i];
  }
  return bytes;
}

// ── UnsDht Class ────────────────────────────────────────────────────────────

/**
 * A Kademlia DHT node for UNS record storage.
 *
 * Equivalent to a Cloudflare authoritative DNS server — but authority
 * is mathematical (content-addressed, signature-verified), not institutional.
 */
export class UnsDht {
  private readonly config: Required<DhtNodeConfig>;
  private readonly store = new Map<string, string>(); // canonicalId → JSON
  private readonly nameIndex = new NameIndex();
  private readonly peers: PeerRef[] = [];
  private readonly nodeKey: Uint8Array;
  private running = false;

  constructor(config: DhtNodeConfig) {
    this.config = { k: 20, ...config };
    this.nodeKey = nodeIdToKey(config.nodeId);
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  /**
   * Start the DHT node.
   *
   * Registers in the global peer registry and bootstraps to known peers.
   * In production: binds to /ip6/::0/tcp/{port} and /ip6/::0/udp/{port}/quic-v1.
   *
   * @param port            Port number for multiaddr generation.
   * @param bootstrapPeers  Multiaddrs of peers to connect to on startup.
   */
  async start(
    port?: number,
    bootstrapPeers?: string[]
  ): Promise<void> {
    if (this.running) return;

    const effectivePort = port ?? this.config.port;
    this.running = true;

    // Register self in global peer registry
    const selfRef: PeerRef = {
      nodeId: this.config.nodeId,
      multiaddr: `/ip6/::1/tcp/${effectivePort}/p2p/${this.config.nodeId}`,
      dht: this,
    };
    peerRegistry.set(this.config.nodeId, selfRef);

    // Bootstrap: connect to known peers
    if (bootstrapPeers) {
      for (const addr of bootstrapPeers) {
        // Extract nodeId from multiaddr: /ip6/.../p2p/{nodeId}
        const parts = addr.split("/p2p/");
        const peerId = parts[parts.length - 1];
        const peerRef = peerRegistry.get(peerId);
        if (peerRef && peerRef.nodeId !== this.config.nodeId) {
          this.peers.push(peerRef);
          // Mutual peering
          peerRef.dht.addPeer(selfRef);
        }
      }
    }
  }

  /** Add a peer reference (called during mutual peering). */
  private addPeer(ref: PeerRef): void {
    if (!this.peers.find((p) => p.nodeId === ref.nodeId)) {
      this.peers.push(ref);
    }
  }

  /**
   * Return this node's multiaddrs for peering.
   *
   * Format: /ip6/::1/tcp/{port}/p2p/{nodeId}
   */
  getMultiaddrs(): string[] {
    if (!this.running) return [];
    return [`/ip6/::1/tcp/${this.config.port}/p2p/${this.config.nodeId}`];
  }

  /** Cleanly shut down the node. */
  async stop(): Promise<void> {
    this.running = false;
    peerRegistry.delete(this.config.nodeId);
    this.peers.length = 0;
  }

  // ── Storage ─────────────────────────────────────────────────────────────

  /**
   * Store a signed UNS record in the DHT.
   *
   * Key = canonical SHA-256 bytes (IPFS-compatible multihash keyspace).
   * Value = JSON-serialized signed record.
   *
   * The record is signature-verified BEFORE storage. Invalid signatures
   * are rejected at the DHT layer — they never enter the store.
   *
   * Replication: the record is forwarded to the k nearest peers
   * by XOR distance to the record's key.
   *
   * @param canonicalId  The canonical ID of the record.
   * @param record       The signed UNS record to store.
   * @throws             If the record's signature is invalid.
   */
  async put(
    canonicalId: string,
    record: SignedUnsRecord
  ): Promise<void> {
    // Verify signature before storage — no unverified data enters the DHT
    const valid = await verifyRecord(record);
    if (!valid) {
      throw new Error(
        `DHT put rejected: invalid Dilithium-3 signature for ${canonicalId}`
      );
    }

    // Store locally
    const json = JSON.stringify(record);
    this.store.set(canonicalId, json);

    // Update name index
    const name = record["uns:name"];
    if (name) {
      this.nameIndex.add(name, canonicalId);
    }

    // Replicate to k nearest peers (Kademlia)
    await this.replicate(canonicalId, json, record);
  }

  /**
   * Retrieve a record by canonical ID.
   *
   * ALWAYS verifies the Dilithium-3 signature before returning.
   * Returns null if not found or if the signature is invalid.
   *
   * If not found locally, queries peers by XOR distance.
   *
   * @param canonicalId  The canonical ID to look up.
   * @returns            The verified signed record, or null.
   */
  async get(canonicalId: string): Promise<SignedUnsRecord | null> {
    // Try local store first
    let json = this.store.get(canonicalId);

    // If not local, query nearest peers
    if (!json) {
      json = await this.queryPeers(canonicalId);
    }

    if (!json) return null;

    // Parse and verify
    try {
      const record = JSON.parse(json) as SignedUnsRecord;
      const valid = await verifyRecord(record);
      if (!valid) return null; // Tampered record — reject
      return record;
    } catch {
      return null;
    }
  }

  /**
   * Query all records for a given UNS name.
   *
   * Returns records sorted by uns:validFrom descending (newest first).
   * Revoked records (uns:revoked: true) are excluded from results.
   * All returned records are signature-verified.
   *
   * @param name  The UNS name to query (e.g., "example.uor").
   * @returns     Array of verified, non-revoked signed records.
   */
  async queryByName(name: string): Promise<SignedUnsRecord[]> {
    // Collect canonical IDs from local index + peer indexes
    const localIds = this.nameIndex.lookup(name);
    const peerIds = await this.queryPeerIndexes(name);
    const allIds = [...new Set([...localIds, ...peerIds])];

    // Retrieve and verify each record
    const records: SignedUnsRecord[] = [];
    for (const id of allIds) {
      const record = await this.get(id);
      if (record && !record["uns:revoked"]) {
        records.push(record);
      }
    }

    // Sort by validFrom descending (newest first)
    records.sort((a, b) =>
      b["uns:validFrom"].localeCompare(a["uns:validFrom"])
    );

    return records;
  }

  // ── Internal: Replication ─────────────────────────────────────────────

  /**
   * Replicate a record to the k nearest peers by XOR distance.
   */
  private async replicate(
    canonicalId: string,
    json: string,
    record: SignedUnsRecord
  ): Promise<void> {
    if (this.peers.length === 0) return;

    const key = canonicalIdToKey(canonicalId);

    // Sort peers by XOR distance to the record key
    const sorted = [...this.peers].sort((a, b) => {
      const da = xorDistance(key, nodeIdToKey(a.nodeId));
      const db = xorDistance(key, nodeIdToKey(b.nodeId));
      return da < db ? -1 : da > db ? 1 : 0;
    });

    // Replicate to k nearest
    const targets = sorted.slice(0, this.config.k);
    for (const peer of targets) {
      peer.dht.storeReplica(canonicalId, json, record);
    }
  }

  /**
   * Accept a replica from a peer (no re-verification — already verified on put).
   * Updates local store and name index.
   */
  private storeReplica(
    canonicalId: string,
    json: string,
    record: SignedUnsRecord
  ): void {
    if (!this.store.has(canonicalId)) {
      this.store.set(canonicalId, json);
      const name = record["uns:name"];
      if (name) {
        this.nameIndex.add(name, canonicalId);
      }
    }
  }

  // ── Internal: Peer Queries ────────────────────────────────────────────

  /**
   * Query peers for a record by canonical ID (iterative lookup).
   */
  private async queryPeers(canonicalId: string): Promise<string | null> {
    for (const peer of this.peers) {
      const json = peer.dht.localGet(canonicalId);
      if (json) return json;
    }
    return null;
  }

  /**
   * Query peer name indexes for canonical IDs matching a name.
   */
  private async queryPeerIndexes(name: string): Promise<string[]> {
    const allIds: string[] = [];
    for (const peer of this.peers) {
      const ids = peer.dht.localNameLookup(name);
      allIds.push(...ids);
    }
    return allIds;
  }

  /** Local store access (called by peers during queries). */
  private localGet(canonicalId: string): string | null {
    return this.store.get(canonicalId) ?? null;
  }

  /** Local name index access (called by peers during name queries). */
  private localNameLookup(name: string): string[] {
    return this.nameIndex.lookup(name);
  }
}
