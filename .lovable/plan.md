

# Sovereign Messenger — Keet + Keybase Grade P2P Messaging & File Sharing

## Assessment of Current State

The existing messenger has strong cryptographic foundations but critical gaps that prevent it from functioning as a true Keet/Keybase-grade experience:

**What works:**
- UMP protocol: Kyber-1024 KEM + AES-256-GCM encryption pipeline (conduit.ts, messaging.ts)
- Database schema: conduit_sessions, encrypted_messages, group_rekeys with proper RLS
- Basic UI: ChatSidebar, ConversationView, MessageBubble, NewConversationDialog
- Realtime subscriptions for message delivery

**Critical gaps:**
1. **No file transfer at all** — MessageInput has a Paperclip icon that does nothing. No file encryption, no chunked upload, no Keybase-style KBFS
2. **No voice/video calls** — Keet's core feature (P2P WebRTC calls) is absent
3. **No message types beyond text** — mock-data references image/voice types but the real pipeline only handles text
4. **Peer profiles never resolve** — useConversations hardcodes `displayName: "User"` for all peers because RLS blocks cross-profile reads
5. **No offline message queue** — if the network drops, messages are lost
6. **No read receipts** — MessageBubble shows CheckCheck but it's purely decorative
7. **No typing indicators** — the mock Contact type has `status: "typing"` but nothing drives it
8. **No message search** — no way to find content across conversations
9. **No threads or replies** — flat message list only
10. **No disappearing messages** — no ephemeral mode like Signal
11. **No P2P transport** — all messages route through Supabase; no direct WebRTC/Hyperswarm path

## Design Philosophy

Merge the best of three worlds:

| Source | What we take |
|--------|-------------|
| **Keet** | True P2P (WebRTC data channels when direct), no-server fallback, streaming file transfers, audio/video calls |
| **Keybase** | Cryptographic identity proofs, encrypted filesystem (KBFS → UOR Vault), team-based key management, signed chat history |
| **UOR Framework** | Content-addressed message DAG, knowledge graph persistence, lattice-based PQ encryption, TrustGraph attestations for contact verification |

## Implementation Plan

### 1. Fix Peer Profile Resolution (database function)

Create a `get_peer_profiles` SECURITY DEFINER function that returns display_name, handle, avatar_url, uor_glyph for a list of user IDs. This unblocks the conversation list showing real names.

**Migration SQL:**
```sql
CREATE OR REPLACE FUNCTION public.get_peer_profiles(peer_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text, handle text, avatar_url text, uor_glyph text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT p.user_id, p.display_name, p.handle, p.avatar_url, p.uor_glyph
  FROM public.profiles p WHERE p.user_id = ANY(peer_ids);
$$;
```

**Modify:** `src/modules/messenger/lib/use-conversations.ts` — call `get_peer_profiles` RPC instead of hardcoding.

### 2. Encrypted File Transfer (Keybase KBFS-inspired)

Content-addressed, encrypted file sharing anchored to the knowledge graph.

**New files:**
- `src/modules/messenger/lib/file-transfer.ts` — Chunked file encryption pipeline:
  1. Hash file → UOR CID (content address)
  2. Split into 256KB chunks
  3. Encrypt each chunk with session AES-256-GCM key
  4. Upload chunks to `encrypted-files` storage bucket
  5. Send a `ump:FileManifest` message with chunk CIDs, filename, MIME type, size
  6. Receiver downloads chunks, decrypts, reassembles, verifies CID
- `src/modules/messenger/lib/types.ts` — Add `FileManifest`, `FileChunk`, `MessageType` union
- `src/modules/messenger/components/FileMessage.tsx` — Renders file messages (preview for images, download for others, progress bar during transfer)
- `src/modules/messenger/components/FilePickerButton.tsx` — Replaces the dead Paperclip button

**Storage bucket:** Create `encrypted-files` (private) for chunk storage.

**Migration:** Add `message_type` column to `encrypted_messages` (default `'text'`), add `file_manifest` JSONB column.

### 3. Rich Message Types

Extend the message pipeline to support multiple content types.

**New types in `types.ts`:**
```typescript
type MessageType = "text" | "image" | "file" | "voice" | "video" | "system" | "reply";

interface RichMessage extends DecryptedMessage {
  messageType: MessageType;
  replyTo?: string;          // messageHash of parent
  fileManifest?: FileManifest;
  voiceDuration?: number;
  reactions?: Reaction[];
}
```

**New components:**
- `src/modules/messenger/components/VoiceMessage.tsx` — Record + play voice notes (MediaRecorder API → encrypt → upload)
- `src/modules/messenger/components/ImageMessage.tsx` — Inline image preview with encrypted thumbnail
- `src/modules/messenger/components/ReplyBubble.tsx` — Quoted reply header in message bubbles

**Modify:**
- `MessageBubble.tsx` — Dispatch to the correct renderer based on `messageType`
- `MessageInput.tsx` — Add voice record button, image paste support, reply-to state
- `use-send-message.ts` — Handle file/voice/image payloads

### 4. Real-Time Presence & Typing Indicators

**New file:**
- `src/modules/messenger/lib/use-presence.ts` — Uses Supabase Realtime Presence to track:
  - Online/offline status per user
  - Typing indicators per session (debounced 3s timeout)
  - Last seen timestamps

**Modify:**
- `ContactHeader.tsx` — Show "online", "typing...", or "last seen" from presence
- `ChatSidebar.tsx` — Show online dot on conversation list items

### 5. Read Receipts & Delivery Status

**Migration:** Add `delivered_at` and `read_at` columns to `encrypted_messages`.

**New file:**
- `src/modules/messenger/lib/use-read-receipts.ts` — Marks messages as read when they scroll into view (IntersectionObserver). Sends read receipt as a lightweight UPDATE.

**Modify:**
- `MessageBubble.tsx` — Show single check (sent), double check (delivered), blue double check (read)

### 6. Offline Message Queue

**New file:**
- `src/modules/messenger/lib/offline-queue.ts` — IndexedDB-backed queue that:
  - Stores sealed messages when offline
  - Auto-flushes when connection resumes (navigator.onLine + Supabase realtime reconnect)
  - Deduplicates by messageHash (content-addressed = idempotent)

### 7. Message Search

**New file:**
- `src/modules/messenger/lib/use-message-search.ts` — Client-side search across decrypted message cache (since server only has ciphertext). Uses a lightweight in-memory index built from decrypted messages in the current session.

**New component:**
- `src/modules/messenger/components/SearchMessages.tsx` — Search bar in conversation header with highlight results

### 8. Disappearing Messages (Signal-style)

**Migration:** Add `expires_after_seconds` column to `conduit_sessions` (nullable).

**New file:**
- `src/modules/messenger/lib/ephemeral.ts` — Client-side timer that deletes messages from the local view after the configured TTL. Server-side: edge function cron job that purges expired encrypted_messages rows.

### 9. P2P WebRTC Data Channel (Keet-inspired)

When two peers are simultaneously online, establish a direct WebRTC data channel for zero-latency messaging, bypassing the cloud relay entirely.

**New files:**
- `src/modules/messenger/lib/p2p/webrtc-signaling.ts` — Uses Supabase Realtime as the signaling server for WebRTC offer/answer/ICE exchange
- `src/modules/messenger/lib/p2p/data-channel.ts` — Wraps RTCDataChannel with UMP encryption (messages still sealed with session AES key)
- `src/modules/messenger/lib/p2p/call-manager.ts` — Audio/video call setup via WebRTC with Kyber-encrypted SRTP key exchange

**Modify:**
- `use-send-message.ts` — Check if P2P channel is open; if yes, send directly; otherwise fall back to cloud relay
- `use-messages.ts` — Listen for messages from both Supabase realtime AND P2P data channel

### 10. Knowledge Graph Integration

Anchor conversations and shared files into the knowledge graph for searchability and cross-reference.

**New file:**
- `src/modules/messenger/lib/kg-anchoring.ts` — After decrypting a message/file, optionally insert a triple into the user's personal graph:
  ```
  <urn:ump:msg:{hash}> <uor:sentBy> <urn:uor:{senderVid}> .
  <urn:ump:msg:{hash}> <uor:inSession> <urn:ump:session:{sessionHash}> .
  <urn:ump:msg:{hash}> <uor:mentions> <urn:uor:{entity}> .
  ```
  This enables Oracle to answer "What did Alice send me about quantum computing?" by querying the graph.

### 11. Social Platform Bridge (Future-Ready Scaffolding)

**New file:**
- `src/modules/messenger/lib/bridges/bridge-protocol.ts` — Abstract interface for protocol bridges:
  ```typescript
  interface MessageBridge {
    platform: "whatsapp" | "telegram" | "signal" | "email";
    sendMessage(to: string, content: EncryptedPayload): Promise<void>;
    onMessage(handler: (msg: IncomingBridgeMessage) => void): void;
    mapIdentity(externalId: string): Promise<UorCanonicalIdentity>;
  }
  ```
- `src/modules/messenger/lib/bridges/whatsapp-bridge.ts` — Connects to existing WhatsApp Business API (already have credentials in secrets)
- `src/modules/messenger/lib/bridges/email-bridge.ts` — SMTP/IMAP bridge that wraps email in UMP envelopes, enabling encrypted email through the same messenger UI

### 12. UI Polish — WhatsApp-Grade Experience

**Modify existing components:**
- `ChatSidebar.tsx` — Add swipe-to-archive, pin conversations, mute notifications, unread count badges
- `ConversationView.tsx` — Add scroll-to-bottom FAB, date separators between message groups, "new messages" indicator
- `MessageInput.tsx` — Multi-line input (textarea), @mentions autocomplete, emoji picker integration
- `MessengerPage.tsx` — Three-panel layout on desktop (sidebar, chat, info panel)

**New components:**
- `src/modules/messenger/components/ConversationInfo.tsx` — Right panel showing: session security info, shared media grid, shared files list, TrustGraph attestation score for contact
- `src/modules/messenger/components/DateSeparator.tsx` — "Today", "Yesterday", date labels between message groups
- `src/modules/messenger/components/ReactionPicker.tsx` — Long-press/hover reaction menu

## Files Summary

| File | Action |
|------|--------|
| `src/modules/messenger/lib/file-transfer.ts` | Create — chunked encrypted file transfer |
| `src/modules/messenger/lib/use-presence.ts` | Create — realtime presence + typing |
| `src/modules/messenger/lib/use-read-receipts.ts` | Create — read receipt tracking |
| `src/modules/messenger/lib/offline-queue.ts` | Create — IndexedDB offline message queue |
| `src/modules/messenger/lib/use-message-search.ts` | Create — client-side message search |
| `src/modules/messenger/lib/ephemeral.ts` | Create — disappearing messages |
| `src/modules/messenger/lib/p2p/webrtc-signaling.ts` | Create — WebRTC signaling via Realtime |
| `src/modules/messenger/lib/p2p/data-channel.ts` | Create — encrypted P2P data channel |
| `src/modules/messenger/lib/p2p/call-manager.ts` | Create — audio/video call manager |
| `src/modules/messenger/lib/kg-anchoring.ts` | Create — knowledge graph message anchoring |
| `src/modules/messenger/lib/bridges/bridge-protocol.ts` | Create — platform bridge interface |
| `src/modules/messenger/lib/bridges/whatsapp-bridge.ts` | Create — WhatsApp bridge |
| `src/modules/messenger/lib/bridges/email-bridge.ts` | Create — email bridge |
| `src/modules/messenger/components/FileMessage.tsx` | Create — file message renderer |
| `src/modules/messenger/components/FilePickerButton.tsx` | Create — file picker |
| `src/modules/messenger/components/VoiceMessage.tsx` | Create — voice note recorder/player |
| `src/modules/messenger/components/ImageMessage.tsx` | Create — encrypted image preview |
| `src/modules/messenger/components/ReplyBubble.tsx` | Create — quoted reply |
| `src/modules/messenger/components/ConversationInfo.tsx` | Create — info panel |
| `src/modules/messenger/components/DateSeparator.tsx` | Create — date separators |
| `src/modules/messenger/components/ReactionPicker.tsx` | Create — emoji reactions |
| `src/modules/messenger/components/SearchMessages.tsx` | Create — message search |
| `src/modules/messenger/lib/use-conversations.ts` | Modify — real peer profiles |
| `src/modules/messenger/lib/use-send-message.ts` | Modify — multi-type + P2P path |
| `src/modules/messenger/lib/use-messages.ts` | Modify — P2P + rich types |
| `src/modules/messenger/lib/types.ts` | Modify — rich message types |
| `src/modules/messenger/components/MessageBubble.tsx` | Modify — type dispatch + read receipts |
| `src/modules/messenger/components/MessageInput.tsx` | Modify — voice, files, replies, multi-line |
| `src/modules/messenger/components/ContactHeader.tsx` | Modify — presence + typing |
| `src/modules/messenger/components/ChatSidebar.tsx` | Modify — presence dots, swipe actions |
| `src/modules/messenger/pages/MessengerPage.tsx` | Modify — 3-panel layout, info panel |

**Database migrations:**
1. `get_peer_profiles` function
2. `message_type` + `file_manifest` columns on `encrypted_messages`
3. `delivered_at` + `read_at` columns on `encrypted_messages`
4. `expires_after_seconds` column on `conduit_sessions`
5. `encrypted-files` storage bucket

