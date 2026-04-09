/**
 * Messenger domain types.
 * Sovereign Messenger — Keet + Keybase grade messaging types.
 */

// ── Message Types ───────────────────────────────────────────────────────────

export type MessageType = "text" | "image" | "file" | "voice" | "video" | "system" | "reply";

export type DeliveryStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export interface FileManifest {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  chunkCount: number;
  chunkCids: string[];
  fileCid: string;
  thumbnailUrl?: string;
  storagePaths: string[];
}

export interface FileChunk {
  index: number;
  cid: string;
  encryptedData: Uint8Array;
  storagePath: string;
}

export interface Reaction {
  emoji: string;
  userId: string;
  createdAt: string;
}

// ── Group ───────────────────────────────────────────────────────────────────

export interface GroupMeta {
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  createdBy: string;
  isPublic: boolean;
}

export interface GroupMember {
  userId: string;
  role: "admin" | "member";
  joinedAt: string;
  invitedBy?: string | null;
  mutedUntil?: string | null;
  displayName?: string;
  handle?: string | null;
  avatarUrl?: string | null;
  uorGlyph?: string | null;
}

// ── Conversation Settings ───────────────────────────────────────────────────

export interface ConversationSettings {
  pinned: boolean;
  mutedUntil?: string | null;
  archived: boolean;
}

// ── Conversation ────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  sessionHash: string;
  sessionType: "direct" | "group";
  createdAt: string;
  expiresAfterSeconds?: number | null;
  peer: {
    userId: string;
    displayName: string;
    handle: string | null;
    avatarUrl: string | null;
    uorGlyph: string | null;
  };
  /** Group metadata — only present for group conversations */
  groupMeta?: GroupMeta;
  /** Group members — only present for group conversations */
  members?: GroupMember[];
  lastMessage?: {
    plaintext: string;
    sentByMe: boolean;
    createdAt: string;
    messageType?: MessageType;
  };
  unread: number;
  pinned?: boolean;
  muted?: boolean;
  archived?: boolean;
  settings?: ConversationSettings;
}

// ── Decrypted Message ───────────────────────────────────────────────────────

export interface DecryptedMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderName?: string;
  plaintext: string;
  createdAt: string;
  messageHash: string;
  envelopeCid: string;
  sentByMe: boolean;
  messageType: MessageType;
  deliveryStatus: DeliveryStatus;
  deliveredAt?: string | null;
  readAt?: string | null;
  replyToHash?: string | null;
  fileManifest?: FileManifest | null;
  reactions?: Reaction[];
  selfDestructSeconds?: number | null;
  editedAt?: string | null;
  deletedAt?: string | null;
}

// ── Presence ────────────────────────────────────────────────────────────────

export interface PresenceState {
  userId: string;
  online: boolean;
  lastSeen?: string;
  typing?: boolean;
}

// ── P2P ─────────────────────────────────────────────────────────────────────

export interface P2PChannel {
  peerId: string;
  sessionId: string;
  state: "connecting" | "open" | "closed";
  send: (data: ArrayBuffer | string) => void;
}

// ── Bridge Protocol ─────────────────────────────────────────────────────────

export type BridgePlatform = "whatsapp" | "telegram" | "signal" | "email";

export interface BridgeMessage {
  platform: BridgePlatform;
  externalId: string;
  content: string;
  timestamp: string;
  direction: "inbound" | "outbound";
}
