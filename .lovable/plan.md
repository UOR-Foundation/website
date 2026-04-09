

# Sovereign Messenger — Keybase Feature Parity & Beyond

## Gap Analysis: Keybase Features vs Current State

| Keybase Feature | Current State | Priority |
|----------------|---------------|----------|
| **Group/Team conversations** | Schema supports `session_type: "group"` but UI is 100% direct-only. No group creation, no member management, no group avatars. | Critical |
| **Channels within teams** | No concept exists | High |
| **Disappearing messages UI** | `ephemeral.ts` + `ConversationInfo.tsx` show the TTL label but there is NO UI to change it. The `expires_after_seconds` column exists but is never written to. | Critical |
| **Exploding messages (per-message timer)** | Only session-level TTL exists. No per-message ephemeral timers. | High |
| **Encrypted filesystem (KBFS)** | `file-transfer.ts` exists for message attachments but there is no standalone file vault / shared folder concept. | High |
| **Cryptographic identity proofs** | `TrustGraph` + `ceremony_cid` exist in `trusted_connections` but are not surfaced in the messenger. No social proof linking (Twitter, GitHub, domain). | Medium |
| **Message pinning** | `Conversation.pinned` exists in types but pinning individual messages within a conversation does not. | Medium |
| **Message editing & deletion** | No support. Once sent, messages are immutable with no edit or delete-for-everyone. | High |
| **Reactions persisted** | `ReactionPicker` exists but `onReact` just `console.log`s. No database storage, no realtime sync. | High |
| **Conversation muting** | `Conversation.muted` type exists but no UI or storage. | Medium |
| **@mentions in groups** | No implementation. | Medium |
| **Message forwarding** | Not implemented. | Low |
| **Device key management** | No multi-device key sync. Session keys are in-memory only. | High |
| **Notifications** | No push notifications, no desktop notifications. | High |

## Implementation Plan

### Phase 1: Group Conversations (The Core Keybase Feature)

**Database migration:**
- Create `group_metadata` table: `session_id` (FK), `name`, `description`, `avatar_url`, `created_by`, `is_public`
- Create `group_members` table: `session_id`, `user_id`, `role` (admin/member), `joined_at`, `invited_by`, `muted_until`
- Add RLS: members can read their groups; admins can update metadata and manage members

**New files:**
- `src/modules/messenger/components/NewGroupDialog.tsx` — Multi-select peer picker, group name/avatar, creates a `session_type: "group"` session + `group_metadata` + `group_members` rows
- `src/modules/messenger/components/GroupInfoPanel.tsx` — Right panel for groups: member list, add/remove members, admin controls, shared media, group settings
- `src/modules/messenger/components/GroupAvatar.tsx` — Stacked avatar composite or custom group icon

**Modify:**
- `ChatList.tsx` — Render group conversations with group name/avatar instead of single peer
- `ConversationView.tsx` — Show sender name above each bubble in group chats
- `ContactHeader.tsx` — Show group name, member count, group typing indicators ("Alice is typing…")
- `use-conversations.ts` — Fetch `group_metadata` for group sessions, resolve all member profiles
- `use-presence.ts` — Track multiple peers in group channels
- `MessageBubble.tsx` — Show sender name + mini avatar in group context
- `types.ts` — Add `groupMeta` to `Conversation` type, add `GroupMember` interface

### Phase 2: Disappearing Messages (Fully Functional)

**Modify:**
- `ConversationInfo.tsx` — Add interactive TTL selector using `EPHEMERAL_PRESETS`. On selection, UPDATE `conduit_sessions.expires_after_seconds` via Supabase
- `ConversationView.tsx` — Show ephemeral timer badge on each message when TTL is active, using `getTimeRemaining()`
- `MessageBubble.tsx` — Show countdown indicator for messages nearing expiry

**New: Per-message ephemeral (Keybase "exploding messages")**
- Add `self_destruct_seconds` column to `encrypted_messages` (nullable)
- `MessageInput.tsx` — Add bomb/timer icon that lets sender set per-message TTL before sending
- `ephemeral.ts` — Extend `filterExpiredMessages` to check both session TTL and per-message TTL

**Edge function:**
- `supabase/functions/purge-expired-messages/index.ts` — Cron job (runs every 60s) that DELETEs rows where `created_at + self_destruct_seconds < now()` OR session-level TTL expired. Ensures server-side cleanup even if client doesn't.

### Phase 3: Reactions (Persisted + Realtime)

**Database migration:**
- Create `message_reactions` table: `message_id` (FK), `user_id`, `emoji`, `created_at`, UNIQUE(`message_id`, `user_id`, `emoji`)
- RLS: session participants can CRUD reactions on messages in their sessions
- Add to realtime publication

**Modify:**
- `ReactionPicker.tsx` — On react, INSERT/DELETE into `message_reactions`
- `use-messages.ts` — Join reactions when fetching messages, subscribe to reaction changes
- `MessageBubble.tsx` — Show real reaction counts with user attribution

### Phase 4: Message Edit & Delete

**Database migration:**
- Add `edited_at` timestamp column to `encrypted_messages`
- Add `deleted_at` timestamp column (soft delete — shows "This message was deleted")
- Add `edit_history` JSONB column (array of previous ciphertexts for auditability)

**New component:**
- `src/modules/messenger/components/MessageContextMenu.tsx` — Long-press / right-click menu with: Reply, React, Copy, Edit (own messages only, within 15min), Delete for me, Delete for everyone (own messages, within 15min), Forward, Pin

**Modify:**
- `MessageBubble.tsx` — Show "(edited)" label when `edited_at` is set, show "This message was deleted" tombstone when `deleted_at` is set
- `use-send-message.ts` — Add `editMessage()` and `deleteMessage()` functions
- `use-messages.ts` — Filter soft-deleted messages, handle UPDATE realtime events

### Phase 5: Encrypted Shared Folders (KBFS-inspired)

**Database migration:**
- Create `shared_folders` table: `id`, `session_id` (FK), `name`, `created_by`, `encrypted_key` (per-folder AES key, encrypted with session key)
- Create `folder_entries` table: `id`, `folder_id` (FK), `filename`, `file_cid`, `encrypted_manifest` (JSONB), `uploaded_by`, `created_at`, `size_bytes`
- RLS: session participants only

**New files:**
- `src/modules/messenger/components/SharedFiles.tsx` — File browser panel showing all files shared in a conversation, organized by folder. Upload, download, preview.
- `src/modules/messenger/components/FolderView.tsx` — Keybase-style folder tree with drag-and-drop upload

**Modify:**
- `ConversationInfo.tsx` — Add "Shared Files" section linking to the folder view
- `file-transfer.ts` — Add `uploadToFolder()` variant that associates chunks with a folder entry

### Phase 6: Desktop Notifications

**New file:**
- `src/modules/messenger/lib/notifications.ts` — Request `Notification` permission, show desktop notifications for new messages when the conversation isn't active. Respects `muted_until` from group_members.

**Modify:**
- `use-messages.ts` — Trigger notification on new message from peer
- `MessengerPage.tsx` — Request notification permission on mount

### Phase 7: Conversation Management (Pin, Mute, Archive)

**Database migration:**
- Create `conversation_settings` table: `user_id`, `session_id`, `pinned`, `muted_until`, `archived`, UNIQUE(`user_id`, `session_id`)

**Modify:**
- `ChatList.tsx` — Add swipe actions: pin (moves to top), mute (shows bell-off icon), archive (hides from main list)
- `use-conversations.ts` — Join `conversation_settings`, sort pinned first, filter archived
- `ChatSidebar.tsx` — Add filter tabs: All / Unread / Archived

### Phase 8: @Mentions in Groups

**New file:**
- `src/modules/messenger/components/MentionAutocomplete.tsx` — Triggered by `@` in MessageInput, shows member list, inserts `@handle` with user ID reference

**Modify:**
- `MessageInput.tsx` — Detect `@` trigger, show autocomplete popover
- `MessageBubble.tsx` — Render `@mentions` as highlighted, tappable links
- `notifications.ts` — Always notify on @mention even if conversation is muted

## Database Migration Summary

```sql
-- 1. Group metadata
CREATE TABLE public.group_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES conduit_sessions(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  avatar_url text,
  created_by uuid NOT NULL,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 2. Group members
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES conduit_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  invited_by uuid,
  muted_until timestamptz,
  UNIQUE(session_id, user_id)
);

-- 3. Message reactions
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES encrypted_messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- 4. Conversation settings
CREATE TABLE public.conversation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid REFERENCES conduit_sessions(id) ON DELETE CASCADE NOT NULL,
  pinned boolean DEFAULT false,
  muted_until timestamptz,
  archived boolean DEFAULT false,
  UNIQUE(user_id, session_id)
);

-- 5. Shared folders
CREATE TABLE public.shared_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES conduit_sessions(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'Shared Files',
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.folder_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES shared_folders(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  file_cid text NOT NULL,
  encrypted_manifest jsonb,
  uploaded_by uuid NOT NULL,
  size_bytes bigint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 6. Columns on existing tables
ALTER TABLE public.encrypted_messages
  ADD COLUMN IF NOT EXISTS self_destruct_seconds integer,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS edit_history jsonb;

-- 7. RLS on all new tables
-- (group_members, message_reactions, conversation_settings, shared_folders, folder_entries)
-- All scoped to session participants via is_session_participant()

-- 8. Realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
```

## New Files Summary

| File | Purpose |
|------|---------|
| `NewGroupDialog.tsx` | Group creation with multi-select |
| `GroupInfoPanel.tsx` | Group settings, members, shared media |
| `GroupAvatar.tsx` | Composite avatar for groups |
| `MessageContextMenu.tsx` | Edit, delete, forward, pin context menu |
| `SharedFiles.tsx` | KBFS-style file browser |
| `FolderView.tsx` | Folder tree with upload |
| `MentionAutocomplete.tsx` | @mention picker in groups |
| `notifications.ts` | Desktop notification system |
| `purge-expired-messages/index.ts` | Cron for server-side message expiry |

## Modified Files Summary

| File | Changes |
|------|---------|
| `types.ts` | GroupMember, GroupMeta, expanded Conversation |
| `ChatList.tsx` | Group rendering, swipe actions |
| `ChatSidebar.tsx` | Filter tabs, archive view |
| `ConversationView.tsx` | Group sender names, ephemeral badges |
| `ConversationInfo.tsx` | Interactive TTL picker, shared files |
| `ContactHeader.tsx` | Group name/count, group typing |
| `MessageBubble.tsx` | Sender in groups, edit/delete states, real reactions |
| `MessageInput.tsx` | Per-message timer, @mention trigger |
| `ReactionPicker.tsx` | Persist to database |
| `use-conversations.ts` | Group metadata, conversation settings |
| `use-messages.ts` | Reactions join, soft-delete filter, notifications |
| `use-send-message.ts` | Edit/delete functions |
| `MessengerPage.tsx` | Notification permission request |

