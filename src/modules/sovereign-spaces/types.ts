/**
 * Sovereign Spaces — Core Types
 * ═════════════════════════════════════════════════════════════════
 *
 * Anytype-inspired local-first spaces with UOR content-addressed
 * change-DAG synchronization and ACL-scoped graph partitions.
 */

// ── Space Types ────────────────────────────────────────────────────────────

export type SpaceType = "personal" | "shared" | "public";
export type SpaceRole = "owner" | "writer" | "reader";

export interface SovereignSpace {
  id: string;
  cid: string;
  name: string;
  ownerId: string;
  spaceType: SpaceType;
  graphIri: string;
  encryptedKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpaceMember {
  id: string;
  spaceId: string;
  userId: string;
  role: SpaceRole;
  invitedBy?: string;
  joinedAt: string;
}

// ── Change-DAG Types ───────────────────────────────────────────────────────

export type ChangeOperation = "insert" | "delete" | "update";

export interface ChangePayload {
  operation: ChangeOperation;
  /** For triple operations */
  subject?: string;
  predicate?: string;
  object?: string;
  /** For node operations */
  nodeAddress?: string;
  nodeData?: Record<string, unknown>;
  /** Timestamp of the original mutation */
  timestamp: number;
}

export interface ChangeEnvelope {
  /** Content-addressed ID: singleProofHash(envelope) */
  changeCid: string;
  /** CIDs of parent changes (forms the DAG) */
  parentCids: string[];
  /** The actual mutation */
  payload: ChangePayload;
  /** Originating device */
  authorDeviceId: string;
  /** Originating user */
  authorUserId: string;
  /** Optional Dilithium-3 signature */
  signature?: string;
  /** Space this change belongs to */
  spaceId: string;
  /** Wall clock time */
  createdAt: number;
}

// ── Sync Types ─────────────────────────────────────────────────────────────

export type SyncTransportType = "broadcast-channel" | "cloud-relay" | "tauri-mdns";

export interface PeerInfo {
  peerId: string;
  deviceId: string;
  transport: SyncTransportType;
  lastSeen: number;
}

export interface SpaceHead {
  spaceId: string;
  deviceId: string;
  userId: string;
  headCid: string;
  updatedAt: string;
}

export interface SyncTransport {
  readonly type: SyncTransportType;
  announce(spaceId: string, headCid: string): void;
  onHeadUpdate(cb: (peerId: string, spaceId: string, headCid: string) => void): () => void;
  requestChanges(peerId: string, sinceCids: string[]): Promise<ChangeEnvelope[]>;
  destroy(): void;
}

// ── Space Context ──────────────────────────────────────────────────────────

export interface SpaceContext {
  activeSpace: SovereignSpace | null;
  spaces: SovereignSpace[];
  switchSpace(spaceId: string): void;
  createSpace(name: string, type: SpaceType): Promise<SovereignSpace>;
  myRole: SpaceRole | null;
}
