

# Matrix Protocol Integration — Sovereign Unified Messaging

## Overview

Integrate Matrix as the **federation and bridge backbone** for the Sovereign Messenger, while preserving UOR-native encryption for local conversations. Matrix provides two critical capabilities our system currently lacks: (1) a battle-tested federation protocol with DAG-based event graphs that maps directly to UOR's content-addressed message DAG, and (2) the mautrix bridge ecosystem that gives instant interop with WhatsApp, Telegram, Signal, Discord, Slack, LinkedIn, and email.

The architecture is **not** "replace everything with Matrix." It is: use Matrix as a **transport and bridge layer** underneath the existing UMP protocol, while keeping UOR content-addressing, Kyber-1024 encryption, and KG anchoring as the sovereign layer on top.

```text
┌──────────────────────────────────────────────────────┐
│                    Messenger UI                       │
│  (ChatSidebar, ConversationView, MessageBubble, etc) │
└──────────────────┬───────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────┐
│              UOR Sovereign Layer                      │
│  UMP encryption · KG anchoring · Content addressing   │
│  Identity resolution · TrustGraph verification        │
└──────────────────┬───────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────┐
│           Matrix Transport Layer                      │
│  matrix-js-sdk · Sync · Rooms · E2EE (Megolm)        │
│  Sliding Sync for performance · DAG event graph       │
└──────────────────┬───────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────┐
│           Bridge Gateway (Edge Function)              │
│  Routes to mautrix bridges for external platforms     │
│  WhatsApp · Telegram · Signal · Discord · Slack       │
│  LinkedIn · Email · SMS                               │
└──────────────────────────────────────────────────────┘
```

## Why Matrix is the Right Choice

1. **DAG-based event graph** — Matrix rooms store history as a directed acyclic graph, which maps 1:1 to UOR's content-addressed message DAG. Every Matrix event has parent references, just like our `parent_hashes` field.
2. **Federated by design** — Any user can run their own homeserver. Our Supabase backend can act as a lightweight homeserver proxy.
3. **E2EE built-in** — Megolm/Olm encryption is production-grade. We layer UOR's Kyber-1024 on top for post-quantum security.
4. **12+ platform bridges** — mautrix bridges are battle-tested (Beeper/Texts.com production). No need to reverse-engineer each platform.
5. **3PID identity** — Matrix natively maps email, phone, social accounts to user IDs, which we extend with UOR canonical identities.

## Implementation Phases

### Phase 1: Matrix Client Core

Install `matrix-js-sdk` and create a Matrix client adapter that wraps all Matrix operations behind a UOR-compatible interface.

**New files:**
- `src/modules/messenger/lib/matrix/client.ts` — Singleton Matrix client manager
  - `initMatrixClient(userId, accessToken, homeserverUrl)` — creates client with Rust crypto (E2EE)
  - `startSync(initialSyncLimit)` — begins the `/sync` loop with Sliding Sync for performance
  - `stopSync()` — clean shutdown
  - Uses IndexedDB crypto store for persistent E2EE keys across sessions
  - Auto-maps Matrix rooms to our `conduit_sessions` table

- `src/modules/messenger/lib/matrix/room-adapter.ts` — Maps Matrix rooms ↔ UOR sessions
  - `matrixRoomToConversation(room)` → `Conversation` type
  - `createMatrixRoom(participants, options)` → creates room + conduit_session
  - `syncRoomState(roomId)` — pulls room state into our local model
  - Maps Matrix `m.room.message` events to our `DecryptedMessage` type
  - Maps Matrix `m.room.member` events to our `GroupMember` type

- `src/modules/messenger/lib/matrix/event-mapper.ts` — Bidirectional event translation
  - Matrix `m.room.message` ↔ UMP `DecryptedMessage`
  - Matrix `m.room.encrypted` → decrypt via Megolm → wrap in UOR envelope
  - Matrix `m.reaction` ↔ our `Reaction` type
  - Matrix `m.room.redaction` ↔ our soft-delete
  - Anchors every mapped event to KG via `anchorMessage()`

- `src/modules/messenger/lib/matrix/identity-mapper.ts` — UOR ↔ Matrix identity
  - `resolveMatrixId(matrixUserId)` → `UorIdentityMapping`
  - `resolve3PID(email | phone)` → Matrix user ID → UOR canonical ID
  - Maps `@user:homeserver` to `urn:uor:matrix:{userId}`
  - Cross-references with existing `social_identities` table

### Phase 2: Bridge Gateway via Matrix Application Service

Instead of building individual bridges, deploy a single **Matrix Application Service** (appservice) as an edge function that manages all mautrix bridges.

**New edge function:**
- `supabase/functions/matrix-bridge-gateway/index.ts`
  - Registers as a Matrix Application Service
  - Routes inbound bridge events (WhatsApp message → Matrix room → our UI)
  - Routes outbound messages (our UI → Matrix room → WhatsApp via bridge)
  - Manages bridge bot users (`@whatsappbot:our.server`, `@telegrambot:our.server`)
  - Handles bridge login flows (QR code for WhatsApp, phone number for Signal, etc.)

**Database migration:**
- `bridge_connections` table: tracks which platforms a user has connected
  - `id`, `user_id`, `platform` (BridgePlatform), `matrix_bridge_room_id`, `external_user_id`, `status` (connected/disconnected/error), `connected_at`, `last_synced_at`
- `social_identities` table: maps external platform identities to UOR contacts
  - `id`, `user_id`, `contact_id` (FK), `platform`, `platform_user_id`, `platform_handle`, `display_name`, `avatar_url`, `verified`, `last_synced_at`
- `contacts` table: deduplicated contact entities
  - `id`, `user_id`, `canonical_hash` (UOR CID), `display_name`, `merged_identities` (JSONB)
- Add `source_platform` column to `encrypted_messages`
- RLS: user can only see their own bridge connections, contacts, and identities

### Phase 3: Unified Conversation Model

Modify the existing conversation system to seamlessly blend native UMP conversations, Matrix rooms, and bridged platform conversations into one unified view.

**Modify:**
- `types.ts` — Expand `BridgePlatform` to full set, add `sourcePlatform` to `DecryptedMessage`, add `MatrixRoomState` interface
- `use-conversations.ts` — Fetch from both `conduit_sessions` AND Matrix sync state, merge into unified conversation list, deduplicate by contact identity
- `use-messages.ts` — Listen to both Supabase realtime AND Matrix room timeline events
- `use-send-message.ts` — Route messages based on conversation source:
  - Native UMP → existing Supabase path
  - Matrix room → `client.sendEvent()`
  - Bridged platform → Matrix room (bridge handles translation)

### Phase 4: Platform Bridge UI

**New components:**
- `src/modules/messenger/components/BridgeConnectionPanel.tsx` — Settings panel showing:
  - Connected platforms with status indicators
  - "Connect WhatsApp" → initiates QR code flow via bridge gateway
  - "Connect Telegram" → phone number + code flow
  - "Connect Signal" → Signal linking flow
  - "Connect Discord/Slack" → OAuth flow
  - "Connect Email" → IMAP/SMTP credentials
  - Each connection shows sync status, last synced, message count

- `src/modules/messenger/components/PlatformBadge.tsx` — Small icon+color badge showing message source
  - WhatsApp (green), Telegram (blue), Signal (blue-dark), Discord (indigo), Slack (purple), Email (gray), Matrix (green-teal), Native (teal)

- `src/modules/messenger/components/UnifiedInbox.tsx` — Enhanced ChatSidebar with:
  - Platform filter tabs (All / WhatsApp / Telegram / Signal / Email / etc.)
  - Platform badge on each conversation
  - Cross-platform search
  - Contact merge suggestions

- `src/modules/messenger/components/ContactMergeDialog.tsx` — Identity resolution UI:
  - "Alice on WhatsApp appears to be the same person as alice@email.com — merge?"
  - Shows all known identities for a contact
  - Manual merge/split controls

### Phase 5: Performance — Sliding Sync

Matrix's classic `/sync` endpoint loads all room state on initial connect, which is slow. We use **Sliding Sync** (MSC3575) for instant startup.

**In `matrix/client.ts`:**
- Configure Sliding Sync with windowed room lists
- Only sync rooms currently visible in the sidebar
- Lazy-load room members and history on demand
- Cache sync state in IndexedDB for instant resumption
- Background sync for new messages across all rooms

### Phase 6: KG Anchoring for Bridged Messages

Every message from every platform gets anchored into the knowledge graph:

**Modify `kg-anchoring.ts`:**
- Add `anchorBridgedMessage()` — creates triples for cross-platform messages:
  ```
  <urn:ump:msg:{hash}> <uor:sourcePlatform> "whatsapp" .
  <urn:ump:msg:{hash}> <uor:bridgedFrom> <urn:matrix:event:{eventId}> .
  <urn:uor:contact:{hash}> <uor:hasIdentity> <urn:uor:whatsapp:{phone}> .
  <urn:uor:contact:{hash}> <uor:hasIdentity> <urn:uor:telegram:{handle}> .
  ```
- This enables Oracle queries like: "What did Alice send me across all platforms about the project?"

### Phase 7: Identity Resolution Engine

**New file:**
- `src/modules/messenger/lib/identity-resolver.ts`
  - Auto-merge by phone number (WhatsApp + Signal share phone)
  - Auto-merge by email (Email + LinkedIn often share email)
  - Fuzzy name matching for suggested merges
  - Each merged contact gets a single `urn:uor:contact:{hash}` with all platform identities as KG predicates
  - Manual merge/split via `ContactMergeDialog`

## Database Migration

```sql
-- Bridge connections
CREATE TABLE public.bridge_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL,
  matrix_bridge_room_id text,
  external_user_id text,
  status text NOT NULL DEFAULT 'disconnected',
  config jsonb DEFAULT '{}',
  connected_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Contacts (deduplicated)
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  canonical_hash text NOT NULL,
  display_name text NOT NULL,
  merged_identities jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Social identities (platform-specific)
CREATE TABLE public.social_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  platform text NOT NULL,
  platform_user_id text NOT NULL,
  platform_handle text,
  display_name text,
  avatar_url text,
  verified boolean DEFAULT false,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform, platform_user_id)
);

-- Source platform on messages
ALTER TABLE public.encrypted_messages
  ADD COLUMN IF NOT EXISTS source_platform text DEFAULT 'native';

-- RLS on all new tables (user owns their data)
ALTER TABLE public.bridge_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bridge connections"
ON public.bridge_connections FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own contacts"
ON public.contacts FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own identities"
ON public.social_identities FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

## New Files Summary

| File | Purpose |
|------|---------|
| `lib/matrix/client.ts` | Matrix client singleton with Sliding Sync + E2EE |
| `lib/matrix/room-adapter.ts` | Matrix rooms ↔ UOR conversations mapping |
| `lib/matrix/event-mapper.ts` | Bidirectional event translation + KG anchoring |
| `lib/matrix/identity-mapper.ts` | Matrix ↔ UOR identity resolution |
| `lib/identity-resolver.ts` | Cross-platform contact merge engine |
| `components/BridgeConnectionPanel.tsx` | Platform connection settings UI |
| `components/PlatformBadge.tsx` | Platform icon badges |
| `components/UnifiedInbox.tsx` | Multi-platform conversation list |
| `components/ContactMergeDialog.tsx` | Identity dedup UI |
| `edge: matrix-bridge-gateway/index.ts` | Matrix Application Service gateway |

## Modified Files

| File | Changes |
|------|---------|
| `types.ts` | Expanded BridgePlatform, source_platform on messages |
| `bridge-protocol.ts` | Add syncContacts, getConversations, markRead |
| `kg-anchoring.ts` | Social graph triples for bridged messages |
| `use-conversations.ts` | Merge Matrix + native conversations |
| `use-messages.ts` | Dual source (Supabase + Matrix timeline) |
| `use-send-message.ts` | Route by conversation source |
| `ChatSidebar.tsx` | Platform filter tabs |
| `MessageBubble.tsx` | Platform badge on bridged messages |
| `MessengerPage.tsx` | Bridge settings access |

## npm Dependencies

- `matrix-js-sdk` — Matrix Client-Server SDK (browser-compatible, Vite-ready, includes Rust crypto WASM for E2EE)

