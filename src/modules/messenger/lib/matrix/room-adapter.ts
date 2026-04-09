/**
 * Room Adapter — Maps Matrix rooms ↔ UOR Conversations.
 * ══════════════════════════════════════════════════════
 *
 * Translates Matrix room state into our Conversation type and vice versa,
 * enabling the UI to render Matrix rooms identically to native UMP sessions.
 */

import type { Room, RoomMember } from "matrix-js-sdk";
import type { Conversation, GroupMeta, GroupMember, BridgePlatform } from "../types";
import { parseBridgeUserId } from "./client";

/**
 * Convert a Matrix Room to our Conversation model.
 */
export function matrixRoomToConversation(
  room: Room,
  currentUserId: string,
): Conversation {
  const members = room.getJoinedMembers();
  const isDirect = room.getDMInviter() !== undefined || members.length === 2;
  const isGroup = !isDirect;

  // Find the peer (for direct chats)
  const peerMember = members.find((m) => m.userId !== currentUserId) ?? members[0];
  const bridgeInfo = parseBridgeUserId(peerMember?.userId ?? "");

  // Build peer info
  const peer = {
    userId: peerMember?.userId ?? "",
    displayName: peerMember?.name ?? "Unknown",
    handle: bridgeInfo ? `${bridgeInfo.platform}:${bridgeInfo.externalId}` : peerMember?.userId ?? null,
    avatarUrl: peerMember?.getAvatarUrl(room.client.baseUrl, 48, 48, "crop", false, false) ?? null,
    uorGlyph: null,
  };

  // Group metadata
  let groupMeta: GroupMeta | undefined;
  let groupMembers: GroupMember[] | undefined;

  if (isGroup) {
    groupMeta = {
      name: room.name ?? "Unnamed Group",
      description: room.currentState.getStateEvents("m.room.topic", "")?.[0]?.getContent()?.topic ?? null,
      avatarUrl: room.getAvatarUrl(room.client.baseUrl, 48, 48, "crop") ?? null,
      createdBy: room.getCreator() ?? "",
      isPublic: room.getJoinRule() === "public",
    };

    groupMembers = members.map((m) => matrixMemberToGroupMember(m, currentUserId));
  }

  // Last message from timeline
  const timeline = room.getLiveTimeline().getEvents();
  const lastMsgEvent = [...timeline].reverse().find(
    (e) => e.getType() === "m.room.message" && !e.isRedacted(),
  );

  const lastMessage = lastMsgEvent
    ? {
        plaintext: extractMessagePreview(lastMsgEvent.getContent()),
        sentByMe: lastMsgEvent.getSender() === currentUserId,
        createdAt: new Date(lastMsgEvent.getTs()).toISOString(),
        messageType: mapMatrixMsgType(lastMsgEvent.getContent()?.msgtype as string),
      }
    : undefined;

  // Unread count from notification counts
  const unread = (room as any).getUnreadNotificationCount?.("total") ?? 0;

  // Determine source platform from room or peer
  const sourcePlatform = bridgeInfo?.platform ?? "matrix";

  return {
    id: room.roomId,
    sessionHash: room.roomId, // Matrix room ID as session hash
    sessionType: isGroup ? "group" : "direct",
    createdAt: new Date().toISOString(),
    peer: {
      ...peer,
      displayName: isGroup && groupMeta ? groupMeta.name : peer.displayName,
    },
    groupMeta,
    members: groupMembers,
    lastMessage,
    unread,
    pinned: false,
    muted: false,
    archived: false,
  };
}

/**
 * Convert a Matrix RoomMember to our GroupMember type.
 */
function matrixMemberToGroupMember(member: RoomMember, currentUserId: string): GroupMember {
  const isMe = member.userId === currentUserId;
  const powerLevel = member.powerLevel ?? 0;

  return {
    userId: member.userId,
    role: powerLevel >= 50 ? "admin" : "member",
    joinedAt: new Date().toISOString(),
    displayName: isMe ? "You" : (member.name ?? "User"),
    handle: member.userId,
    avatarUrl: null,
    uorGlyph: null,
  };
}

/**
 * Extract a message preview string from Matrix event content.
 */
function extractMessagePreview(content: Record<string, unknown>): string {
  const msgtype = content?.msgtype as string;
  switch (msgtype) {
    case "m.text":
      return (content.body as string) ?? "Message";
    case "m.image":
      return "📷 Image";
    case "m.file":
      return "📎 File";
    case "m.audio":
      return "🎤 Voice";
    case "m.video":
      return "🎬 Video";
    case "m.notice":
      return (content.body as string) ?? "Notice";
    default:
      return "Message";
  }
}

/**
 * Map Matrix message type to our MessageType.
 */
function mapMatrixMsgType(msgtype: string | undefined): "text" | "image" | "file" | "voice" | "video" {
  switch (msgtype) {
    case "m.image": return "image";
    case "m.file": return "file";
    case "m.audio": return "voice";
    case "m.video": return "video";
    default: return "text";
  }
}

/**
 * Get the dominant bridge platform for a room (if bridged).
 * Returns null for native Matrix rooms.
 */
export function getRoomBridgePlatform(room: Room, currentUserId: string): BridgePlatform | null {
  const members = room.getJoinedMembers();
  for (const member of members) {
    if (member.userId === currentUserId) continue;
    const bridge = parseBridgeUserId(member.userId);
    if (bridge && bridge.platform !== "matrix") {
      return bridge.platform as BridgePlatform;
    }
  }
  return null;
}
