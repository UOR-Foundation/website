

# Unified Social Graph — Research Findings & Implementation Plan

## Research Summary: Battle-Tested Approaches

### The Clear Winner: Matrix Protocol + mautrix Bridge Ecosystem

The **Matrix protocol** (matrix.org) with **mautrix bridges** (by Tulir/Beeper) is the most mature, battle-tested, open-source approach to unifying messaging across platforms. This is not theoretical — **Beeper** (acquired by Automattic in 2024, merged with Texts.com) runs this in production for millions of users.

**What mautrix provides:**

| Bridge | Platform | Status | Method |
|--------|----------|--------|--------|
| mautrix-whatsapp | WhatsApp | Stable | Multi-device Web API |
| mautrix-telegram | Telegram | Stable | MTProto client |
| mautrix-signal | Signal | Stable | libsignal |
| mautrix-discord | Discord | Stable | User token / QR |
| mautrix-slack | Slack | Stable | User token / OAuth |
| mautrix-meta | Facebook/Instagram | Stable | Messenger API |
| mautrix-twitter | X/Twitter | Stable | DM API |
| beeper-linkedin | LinkedIn | Beta | Reverse-engineered |
| mautrix-googlechat | Google Chat | Stable | Workspace API |
| mautrix-gmessages | Google Messages | Stable | RCS/SMS pairing |

All bridges are **open-source** (AGPL-3.0), support **E2EE**, and use the unified **bridgev2 framework** — a single connector interface for all platforms.

### Other Notable Approaches

| Project | Approach | Limitation for UOR |
|---------|----------|-------------------|
| **Matterbridge** (Go, AGPL) | Chat relay across IRC/Matrix/Discord/Telegram/Slack/etc. | Relay-only, no identity graph, no E2EE |
| **Ferdium** (Electron) | Embeds web views of each service | No unified data layer, just UI aggregation |
| **PingCRM** (Python, AGPL) | Syncs Gmail, Telegram, Twitter, LinkedIn into a personal CRM with entity resolution | Great for contact graph, not messaging |
| **SERF** (Python, Apache) | Semantic entity resolution framework for deduplicating identities | Useful for identity merge layer |
| **Bridgy Fed** (by snarfed) | Bridges AT Protocol ↔ ActivityPub ↔ Nostr | Covers social posts, not DMs |

### Key Architectural Insight: Beeper's On-Device Connection Model

Beeper solved the sovereignty problem by running bridges **on the user's device** rather than in the cloud. The user's credentials never leave their machine. This is directly compatible with UOR's sovereignty-first approach.

```text
┌─────────────────────────────────────────────┐
│              USER'S DEVICE                  │
│                                             │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  │
│  │WhatsApp │  │Telegram  │  │ Signal    │  │
│  │Bridge   │  │Bridge    │  │ Bridge    │  │
│  └────┬────┘  └────┬─────┘  └─────┬─────┘  │
│       │            │              │         │
│       └────────────┼──────────────┘         │
│                    │                        │
│           ┌────────▼────────┐               │
│           │  UOR Sovereign  │               │
│           │  Message Bus    │               │
│           │  (normalize →   │               │
│           │   encrypt →     │               │
│           │   anchor to KG) │               │
│           └────────┬────────┘               │
│                    │                        │
│           ┌────────▼────────┐               │
│           │  Knowledge      │               │
│           │  Graph (GrafeoDB)│               │
│           │  Social Graph   │               │
│           └─────────────────┘               │
└─────────────────────────────────────────────┘
```

## What This Means for Our Implementation

Rather than rewriting bridge logic from scratch (which would take years), we should:

1. **Adopt the mautrix bridge protocol as our interop layer** — these are production-grade, battle-tested Go bridges that handle every edge case (media, reactions, read receipts, typing, presence, group management) for 12+ platforms.

2. **Build a "Bridge Gateway" edge function** that orchestrates bridge instances and normalizes all inbound/outbound messages into UMP envelopes before they touch our system.

3. **Extend the Social Graph in the Knowledge Graph** — every external contact becomes a UOR entity with cross-platform identity links (Alice's WhatsApp number, Telegram handle, email, and LinkedIn profile all resolve to one `urn:uor:contact:{hash}`).

4. **Build the Unified Inbox UI** — a single view showing all conversations from all platforms, with platform badges, threaded into the same conversation when contacts are merged.

## Implementation Plan

### Phase 1: Social Identity Graph (Database + KG)

**Database migration:**
- Create `social_identities` table: maps external platform identities to UOR canonical contacts
  - `id`, `user_id` (owner), `contact_id` (FK to a new `contacts` table), `platform`, `platform_user_id`, `platform_handle`, `display_name`, `avatar_url`, `verified`, `last_synced_at`
- Create `contacts` table: deduplicated contact entities
  - `id`, `user_id` (owner), `canonical_hash` (UOR CID), `display_name`, `merged_from` (JSONB array of social_identity IDs)
- RLS: user can only see their own contacts and identities

**KG anchoring:**
- Extend `kg-anchoring.ts` to emit contact-graph triples:
  ```
  <urn:uor:contact:{hash}> <uor:hasIdentity> <urn:uor:whatsapp:{phone}> .
  <urn:uor:contact:{hash}> <uor:hasIdentity> <urn:uor:telegram:{username}> .
  <urn:uor:contact:{hash}> <uor:hasIdentity> <urn:uor:email:{addr}> .
  ```

### Phase 2: Expand Bridge Platform Types & Protocol

**Modify `types.ts`:**
- Expand `BridgePlatform` to include all target platforms:
  ```typescript
  type BridgePlatform = 
    | "whatsapp" | "telegram" | "signal" | "email"
    | "discord" | "slack" | "linkedin" | "twitter"
    | "instagram" | "matrix" | "sms";
  ```

**Extend `BridgeMessage`:**
- Add rich fields: `messageType`, `replyTo`, `reactions`, `fileManifest`, `threadId`, `isRead`, `platform metadata`

**Extend `bridge-protocol.ts`:**
- Add `syncContacts()` method to `MessageBridge` interface — pulls the user's contact list from each platform
- Add `getConversations()` — lists all conversations from the platform
- Add `markRead(externalId)` — bidirectional read status

### Phase 3: Bridge Gateway Edge Function

**New edge function: `supabase/functions/bridge-gateway/index.ts`**

A central gateway that:
1. Receives normalized bridge events (message received, typing, presence, read receipt)
2. Wraps inbound messages in UMP envelopes (encrypted with session key)
3. Stores in `encrypted_messages` with `source_platform` metadata
4. Emits to Supabase Realtime for live delivery
5. Anchors to KG via `anchorMessage()`

For outbound:
1. Receives UMP-sealed message from client
2. Routes to correct bridge based on conversation's platform
3. Translates UMP → platform-native format

### Phase 4: Platform Bridge Implementations

Create scaffold bridges for each platform (following the existing `WhatsAppBridge` and `EmailBridge` pattern):

| File | Platform | Transport |
|------|----------|-----------|
| `telegram-bridge.ts` | Telegram | Bot API / MTProto via edge function |
| `signal-bridge.ts` | Signal | Signal CLI / libsignal via edge function |
| `discord-bridge.ts` | Discord | Discord Bot API |
| `slack-bridge.ts` | Slack | Slack connector (already available) |
| `linkedin-bridge.ts` | LinkedIn | LinkedIn API |
| `twitter-bridge.ts` | X/Twitter | X API v2 |
| `sms-bridge.ts` | SMS | Twilio connector (available) |
| `matrix-bridge.ts` | Matrix | Native Matrix CS API |

Each bridge implements `MessageBridge` with `connect()`, `sendMessage()`, `onMessage()`, `syncContacts()`, `mapIdentity()`.

### Phase 5: Unified Inbox UI

**New components:**
- `src/modules/messenger/components/UnifiedInbox.tsx` — All-platform conversation list with platform badges (WhatsApp green, Telegram blue, etc.)
- `src/modules/messenger/components/PlatformBadge.tsx` — Icon + color for each platform
- `src/modules/messenger/components/ContactMergeDialog.tsx` — UI to merge duplicate contacts across platforms ("This WhatsApp contact looks like your Telegram contact — merge?")
- `src/modules/messenger/components/BridgeStatusPanel.tsx` — Shows which bridges are connected, last sync time, errors

**Modify:**
- `ChatSidebar.tsx` — Add platform filter tabs (All / WhatsApp / Telegram / Email / etc.)
- `ConversationView.tsx` — Show platform badge on messages from bridged conversations
- `MessageInput.tsx` — Platform-aware send (knows which bridge to route through)
- `MessengerPage.tsx` — Add bridge connection flow to settings

### Phase 6: Contact Identity Resolution

**New file: `src/modules/messenger/lib/identity-resolver.ts`**

Automatic and manual contact merging:
1. **Auto-merge by phone number** — WhatsApp and Signal both use phone numbers, auto-link
2. **Auto-merge by email** — Email bridge + LinkedIn often share email
3. **Suggested merges** — Fuzzy match on display name + mutual connections
4. **Manual merge UI** — User confirms or rejects suggested merges
5. **Split** — Undo a merge if wrong

Each merged contact gets a single `urn:uor:contact:{hash}` with all platform identities as `uor:hasIdentity` predicates in the KG.

## Files Summary

| File | Action |
|------|--------|
| `src/modules/messenger/lib/types.ts` | Modify — expand BridgePlatform, enrich BridgeMessage |
| `src/modules/messenger/lib/bridges/bridge-protocol.ts` | Modify — add syncContacts, getConversations, markRead |
| `src/modules/messenger/lib/bridges/telegram-bridge.ts` | Create — Telegram bridge scaffold |
| `src/modules/messenger/lib/bridges/signal-bridge.ts` | Create — Signal bridge scaffold |
| `src/modules/messenger/lib/bridges/discord-bridge.ts` | Create — Discord bridge scaffold |
| `src/modules/messenger/lib/bridges/slack-bridge.ts` | Create — Slack bridge scaffold |
| `src/modules/messenger/lib/bridges/linkedin-bridge.ts` | Create — LinkedIn bridge scaffold |
| `src/modules/messenger/lib/bridges/twitter-bridge.ts` | Create — Twitter/X bridge scaffold |
| `src/modules/messenger/lib/bridges/sms-bridge.ts` | Create — SMS/Twilio bridge scaffold |
| `src/modules/messenger/lib/bridges/matrix-bridge.ts` | Create — Matrix native bridge |
| `src/modules/messenger/lib/identity-resolver.ts` | Create — cross-platform contact merge engine |
| `src/modules/messenger/lib/kg-anchoring.ts` | Modify — add social graph triples |
| `src/modules/messenger/components/UnifiedInbox.tsx` | Create — all-platform conversation list |
| `src/modules/messenger/components/PlatformBadge.tsx` | Create — platform icon badges |
| `src/modules/messenger/components/ContactMergeDialog.tsx` | Create — contact dedup UI |
| `src/modules/messenger/components/BridgeStatusPanel.tsx` | Create — bridge health dashboard |
| `src/modules/messenger/components/ChatSidebar.tsx` | Modify — platform filter tabs |
| `src/modules/messenger/components/ConversationView.tsx` | Modify — platform badges on messages |
| `src/modules/messenger/components/MessageInput.tsx` | Modify — platform-aware routing |
| `src/modules/messenger/pages/MessengerPage.tsx` | Modify — bridge settings panel |
| `supabase/functions/bridge-gateway/index.ts` | Create — central bridge orchestrator |

**Database migrations:**
1. `contacts` table with UOR canonical hash
2. `social_identities` table linking platforms to contacts
3. `source_platform` column on `encrypted_messages`
4. RLS policies scoped to user ownership

