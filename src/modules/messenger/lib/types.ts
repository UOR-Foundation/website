/**
 * Messenger domain types.
 * Replaces the old mock-data type exports with backend-aligned interfaces.
 */

export interface Conversation {
  id: string;               // conduit_sessions.id
  sessionHash: string;
  sessionType: "direct" | "group";
  createdAt: string;
  peer: {
    userId: string;
    displayName: string;
    handle: string | null;
    avatarUrl: string | null;
    uorGlyph: string | null;
  };
  lastMessage?: {
    plaintext: string;
    sentByMe: boolean;
    createdAt: string;
  };
  unread: number;
}

export interface DecryptedMessage {
  id: string;
  sessionId: string;
  senderId: string;
  plaintext: string;
  createdAt: string;
  messageHash: string;
  envelopeCid: string;
  sentByMe: boolean;
}
