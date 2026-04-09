/**
 * Event Mapper — Bidirectional translation between Matrix events and UOR messages.
 * ═════════════════════════════════════════════════════════════════════════════════
 *
 * Converts Matrix room events (m.room.message, m.reaction, m.room.redaction)
 * into our DecryptedMessage type, and vice versa. Every mapped event is also
 * anchored to the Knowledge Graph via kg-anchoring.
 */

import { sha256 } from "@noble/hashes/sha2.js";
import type {
  DecryptedMessage,
  MessageType,
  DeliveryStatus,
  Reaction,
  FileManifest,
  BridgePlatform,
} from "../types";
import type { MatrixTimelineEvent } from "./client";
import { parseBridgeUserId } from "./client";

// ── Matrix → UOR ────────────────────────────────────────────────────────────

/**
 * Convert a Matrix timeline event into our DecryptedMessage model.
 */
export function matrixEventToDecryptedMessage(
  event: MatrixTimelineEvent,
  currentUserId: string,
  senderDisplayName?: string,
): DecryptedMessage | null {
  // Only handle message events
  if (event.type !== "m.room.message") return null;

  const content = event.content;
  const msgtype = content.msgtype as string;
  const sentByMe = event.sender === currentUserId;

  // Generate a deterministic message hash from event ID
  const encoder = new TextEncoder();
  const hashBytes = sha256(encoder.encode(event.eventId));
  const messageHash = Array.from(hashBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Determine message type
  const messageType = mapMsgType(msgtype);

  // Extract file manifest if applicable
  let fileManifest: FileManifest | null = null;
  if (msgtype === "m.file" || msgtype === "m.image" || msgtype === "m.audio" || msgtype === "m.video") {
    const info = content.info as Record<string, unknown> | undefined;
    fileManifest = {
      filename: (content.body as string) ?? "file",
      mimeType: (info?.mimetype as string) ?? "application/octet-stream",
      sizeBytes: (info?.size as number) ?? 0,
      chunkCount: 1,
      chunkCids: [],
      fileCid: (content.url as string) ?? "",
      thumbnailUrl: (info?.thumbnail_url as string) ?? undefined,
      storagePaths: [],
    };
  }

  // Determine delivery status
  let deliveryStatus: DeliveryStatus = "sent";
  if (sentByMe) {
    deliveryStatus = "delivered"; // Matrix guarantees delivery on sync
  }

  // Resolve sender name
  const bridgeInfo = parseBridgeUserId(event.sender);
  const resolvedSenderName = sentByMe
    ? "You"
    : senderDisplayName ?? bridgeInfo?.externalId ?? event.sender;

  // Source platform
  const sourcePlatform: BridgePlatform | "matrix" | "native" = bridgeInfo?.platform ?? "matrix";

  return {
    id: event.eventId,
    sessionId: event.roomId,
    senderId: event.sender,
    senderName: resolvedSenderName,
    plaintext: (content.body as string) ?? "",
    createdAt: new Date(event.timestamp).toISOString(),
    messageHash,
    envelopeCid: `urn:matrix:event:${event.eventId}`,
    sentByMe,
    messageType,
    deliveryStatus,
    replyToHash: extractReplyToHash(content),
    fileManifest,
    reactions: [],
    selfDestructSeconds: null,
    editedAt: event.unsigned?.["m.relations"]
      ? new Date(event.timestamp).toISOString()
      : null,
    deletedAt: null,
    sourcePlatform: sourcePlatform as DecryptedMessage["sourcePlatform"],
  };
}

/**
 * Convert a Matrix reaction event into our Reaction model.
 */
export function matrixReactionToReaction(
  event: MatrixTimelineEvent,
): { targetEventId: string; reaction: Reaction } | null {
  if (event.type !== "m.reaction") return null;

  const relatesTo = event.content["m.relates_to"] as Record<string, unknown> | undefined;
  if (!relatesTo) return null;

  return {
    targetEventId: relatesTo.event_id as string,
    reaction: {
      emoji: relatesTo.key as string,
      userId: event.sender,
      createdAt: new Date(event.timestamp).toISOString(),
    },
  };
}

// ── UOR → Matrix ────────────────────────────────────────────────────────────

/**
 * Convert our message content to Matrix event content.
 */
export function decryptedMessageToMatrixContent(
  plaintext: string,
  messageType: MessageType,
  fileManifest?: FileManifest | null,
  replyToEventId?: string,
): Record<string, unknown> {
  const content: Record<string, unknown> = {};

  // Reply reference
  if (replyToEventId) {
    content["m.relates_to"] = {
      "m.in_reply_to": { event_id: replyToEventId },
    };
  }

  switch (messageType) {
    case "image":
      content.msgtype = "m.image";
      content.body = fileManifest?.filename ?? "image";
      content.url = fileManifest?.fileCid ?? "";
      content.info = {
        mimetype: fileManifest?.mimeType ?? "image/jpeg",
        size: fileManifest?.sizeBytes ?? 0,
      };
      break;

    case "file":
      content.msgtype = "m.file";
      content.body = fileManifest?.filename ?? "file";
      content.url = fileManifest?.fileCid ?? "";
      content.info = {
        mimetype: fileManifest?.mimeType ?? "application/octet-stream",
        size: fileManifest?.sizeBytes ?? 0,
      };
      break;

    case "voice":
      content.msgtype = "m.audio";
      content.body = "Voice message";
      content.url = fileManifest?.fileCid ?? "";
      content.info = {
        mimetype: "audio/ogg",
        size: fileManifest?.sizeBytes ?? 0,
      };
      break;

    case "video":
      content.msgtype = "m.video";
      content.body = fileManifest?.filename ?? "video";
      content.url = fileManifest?.fileCid ?? "";
      content.info = {
        mimetype: fileManifest?.mimeType ?? "video/mp4",
        size: fileManifest?.sizeBytes ?? 0,
      };
      break;

    default:
      content.msgtype = "m.text";
      content.body = plaintext;
      break;
  }

  return content;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function mapMsgType(msgtype: string): MessageType {
  switch (msgtype) {
    case "m.image": return "image";
    case "m.file": return "file";
    case "m.audio": return "voice";
    case "m.video": return "video";
    case "m.notice": return "system";
    default: return "text";
  }
}

function extractReplyToHash(content: Record<string, unknown>): string | null {
  const relatesTo = content["m.relates_to"] as Record<string, unknown> | undefined;
  const inReplyTo = relatesTo?.["m.in_reply_to"] as Record<string, unknown> | undefined;
  if (!inReplyTo?.event_id) return null;

  // Hash the event ID to get our reply hash format
  const encoder = new TextEncoder();
  const hashBytes = sha256(encoder.encode(inReplyTo.event_id as string));
  return Array.from(hashBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Build KG triples for a bridged message.
 * Returns triple data ready for insertion into messenger_context_graph.
 */
export function buildBridgedMessageTriples(
  message: DecryptedMessage,
  userId: string,
  sourcePlatform: string,
): Array<{
  subject: string;
  predicate: string;
  object: string;
  sourceId: string;
  sourceType: string;
  confidence: number;
}> {
  const msgIri = `urn:ump:msg:${message.messageHash}`;

  const triples = [
    {
      subject: msgIri,
      predicate: "uor:sourcePlatform",
      object: sourcePlatform,
      sourceId: message.id,
      sourceType: "bridged_message",
      confidence: 1.0,
    },
    {
      subject: msgIri,
      predicate: "uor:bridgedFrom",
      object: `urn:matrix:event:${message.id}`,
      sourceId: message.id,
      sourceType: "bridged_message",
      confidence: 1.0,
    },
    {
      subject: msgIri,
      predicate: "uor:sentBy",
      object: `urn:uor:user:${message.senderId}`,
      sourceId: message.id,
      sourceType: "bridged_message",
      confidence: 1.0,
    },
    {
      subject: msgIri,
      predicate: "uor:createdAt",
      object: message.createdAt,
      sourceId: message.id,
      sourceType: "bridged_message",
      confidence: 1.0,
    },
  ];

  // Content triple for searchability
  if (message.plaintext.length > 10) {
    triples.push({
      subject: msgIri,
      predicate: "uor:hasContent",
      object: message.plaintext.slice(0, 500),
      sourceId: message.id,
      sourceType: "bridged_message",
      confidence: 0.8,
    });
  }

  return triples;
}
