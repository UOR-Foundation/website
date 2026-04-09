/**
 * UNS Mesh — Sync Protocol (Layer 3: Transport)
 * ═════════════════════════════════════════════════════════════════
 *
 * Defines the 5-message protocol spoken by all mesh transports.
 * Every message is content-addressed — identical messages on
 * different transports collapse to a single CID (dedup at the wire).
 *
 * Messages:
 *   HELLO — Exchange identity, supported spaces, current heads
 *   WANT  — Request changes since a set of known CIDs
 *   HAVE  — Respond with missing change envelopes
 *   HEAD  — Broadcast new head CID after local mutation
 *   ACK   — Confirm receipt of a batch
 *
 * @module uns/mesh/sync-protocol
 * @layer 3
 */

import { sha256hex } from "@/lib/crypto";
import type { ChangeEnvelope } from "@/modules/sovereign-spaces/types";

// ── Message Types ───────────────────────────────────────────────────────────

export type MeshMessageType = "HELLO" | "WANT" | "HAVE" | "HEAD" | "ACK";

export interface MeshMessageBase {
  /** Content-addressed ID of this message */
  messageCid: string;
  /** Message type discriminator */
  type: MeshMessageType;
  /** Sender device ID */
  senderId: string;
  /** Sender canonical node ID (from UnsNode identity) */
  senderNodeId: string;
  /** Target space for this message */
  spaceId: string;
  /** Monotonic Lamport timestamp for causal ordering */
  lamport: number;
  /** Wall clock (informational only — not used for ordering) */
  timestamp: number;
}

/** Exchange identity, spaces, and current heads */
export interface HelloMessage extends MeshMessageBase {
  type: "HELLO";
  /** Map of spaceId → current head CID */
  heads: Record<string, string>;
  /** Device class for topology-aware routing */
  deviceClass: DeviceClass;
  /** Supported transport types */
  transports: string[];
  /** Protocol version for forward compatibility */
  protocolVersion: number;
}

/** Request changes since a set of known CIDs */
export interface WantMessage extends MeshMessageBase {
  type: "WANT";
  /** CIDs we already have (for delta computation) */
  knownCids: string[];
  /** Maximum number of changes to return */
  limit: number;
}

/** Respond with missing change envelopes */
export interface HaveMessage extends MeshMessageBase {
  type: "HAVE";
  /** Change envelopes the requester is missing */
  changes: ChangeEnvelope[];
  /** Whether there are more changes beyond this batch */
  hasMore: boolean;
  /** Cursor for pagination (CID of last change in this batch) */
  cursor?: string;
}

/** Broadcast new head CID after local mutation */
export interface HeadMessage extends MeshMessageBase {
  type: "HEAD";
  /** New head CID */
  headCid: string;
  /** Number of changes since previous head */
  changeCount: number;
}

/** Confirm receipt of a batch */
export interface AckMessage extends MeshMessageBase {
  type: "ACK";
  /** CID of the message being acknowledged */
  ackOf: string;
  /** Number of changes successfully applied */
  applied: number;
}

export type MeshMessage = HelloMessage | WantMessage | HaveMessage | HeadMessage | AckMessage;

// ── Device Classification ───────────────────────────────────────────────────

export type DeviceClass = "desktop" | "mobile" | "cloud" | "edge";

// ── Protocol Constants ──────────────────────────────────────────────────────

export const MESH_PROTOCOL_VERSION = 1;
export const MAX_CHANGES_PER_HAVE = 100;
export const HELLO_INTERVAL_MS = 30_000;
export const PEER_TIMEOUT_MS = 90_000;
export const SYNC_DEBOUNCE_MS = 500;

// ── Lamport Clock ───────────────────────────────────────────────────────────

let lamportClock = 0;

/** Increment and return the next Lamport timestamp */
export function tickLamport(): number {
  return ++lamportClock;
}

/** Update Lamport clock on receiving a remote message */
export function receiveLamport(remote: number): number {
  lamportClock = Math.max(lamportClock, remote) + 1;
  return lamportClock;
}

/** Current Lamport value (read-only) */
export function currentLamport(): number {
  return lamportClock;
}

// ── Message Construction ────────────────────────────────────────────────────

async function computeMessageCid(body: Record<string, unknown>): Promise<string> {
  return sha256hex(JSON.stringify({
    "@type": "uor:MeshMessage",
    ...body,
  }));
}

export async function createHello(
  senderId: string,
  senderNodeId: string,
  heads: Record<string, string>,
  deviceClass: DeviceClass,
  transports: string[],
): Promise<HelloMessage> {
  const lamport = tickLamport();
  const messageCid = await computeMessageCid({
    type: "HELLO", senderId, heads, deviceClass, lamport,
  });
  return {
    messageCid, type: "HELLO", senderId, senderNodeId,
    spaceId: "*", lamport, timestamp: Date.now(),
    heads, deviceClass, transports, protocolVersion: MESH_PROTOCOL_VERSION,
  };
}

export async function createWant(
  senderId: string,
  senderNodeId: string,
  spaceId: string,
  knownCids: string[],
  limit: number = MAX_CHANGES_PER_HAVE,
): Promise<WantMessage> {
  const lamport = tickLamport();
  const messageCid = await computeMessageCid({
    type: "WANT", senderId, spaceId, knownCids, limit, lamport,
  });
  return {
    messageCid, type: "WANT", senderId, senderNodeId,
    spaceId, lamport, timestamp: Date.now(),
    knownCids, limit,
  };
}

export async function createHave(
  senderId: string,
  senderNodeId: string,
  spaceId: string,
  changes: ChangeEnvelope[],
  hasMore: boolean,
  cursor?: string,
): Promise<HaveMessage> {
  const lamport = tickLamport();
  const messageCid = await computeMessageCid({
    type: "HAVE", senderId, spaceId, changeCount: changes.length, lamport,
  });
  return {
    messageCid, type: "HAVE", senderId, senderNodeId,
    spaceId, lamport, timestamp: Date.now(),
    changes, hasMore, cursor,
  };
}

export async function createHead(
  senderId: string,
  senderNodeId: string,
  spaceId: string,
  headCid: string,
  changeCount: number,
): Promise<HeadMessage> {
  const lamport = tickLamport();
  const messageCid = await computeMessageCid({
    type: "HEAD", senderId, spaceId, headCid, lamport,
  });
  return {
    messageCid, type: "HEAD", senderId, senderNodeId,
    spaceId, lamport, timestamp: Date.now(),
    headCid, changeCount,
  };
}

export async function createAck(
  senderId: string,
  senderNodeId: string,
  spaceId: string,
  ackOf: string,
  applied: number,
): Promise<AckMessage> {
  const lamport = tickLamport();
  const messageCid = await computeMessageCid({
    type: "ACK", senderId, spaceId, ackOf, lamport,
  });
  return {
    messageCid, type: "ACK", senderId, senderNodeId,
    spaceId, lamport, timestamp: Date.now(),
    ackOf, applied,
  };
}

// ── Message Validation ──────────────────────────────────────────────────────

export function isValidMessage(msg: unknown): msg is MeshMessage {
  if (!msg || typeof msg !== "object") return false;
  const m = msg as Record<string, unknown>;
  return (
    typeof m.messageCid === "string" &&
    typeof m.type === "string" &&
    ["HELLO", "WANT", "HAVE", "HEAD", "ACK"].includes(m.type as string) &&
    typeof m.senderId === "string" &&
    typeof m.lamport === "number"
  );
}

// ── Seen Message Cache (dedup at receiver) ──────────────────────────────────

const seenMessages = new Set<string>();
const MAX_SEEN = 10_000;

/** Returns true if this message has already been processed */
export function markSeen(messageCid: string): boolean {
  if (seenMessages.has(messageCid)) return true;
  if (seenMessages.size >= MAX_SEEN) {
    // Evict oldest (approximate — Set iteration is insertion-order)
    const first = seenMessages.values().next().value;
    if (first) seenMessages.delete(first);
  }
  seenMessages.add(messageCid);
  return false;
}
