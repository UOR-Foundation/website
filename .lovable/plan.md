

# Messenger — Fix Build, Ensure One-Click Launch, Align with Matrix UX

## Build Fix

The build error `Could not resolve "./container" from "src/modules/uns/build/index.ts"` is a stale module resolution issue. The file `container.ts` exists and has all required exports. The fix is to re-save `index.ts` with no changes (or a trivial whitespace change) to bust the Vite cache.

## One-Click Launch Verification

The launch path is:
1. Dock/Spotlight/Widget → `handleOpenApp("messenger")` → `getApp("messenger")` → blueprint lookup → lazy-loads `MessengerPage`
2. MessengerPage checks auth → shows sign-in gate or conversation list

This chain is correctly wired. The blueprint exists in `static-blueprints.ts`, the component map in `desktop-apps.ts` has the lazy import, and the dock includes it. No code changes needed for launch — just verify it opens after the build fix.

## Matrix Alignment — UX Improvements

The Matrix/Element paradigm centers on: **Rooms, Spaces, Direct Messages, Threads, E2EE verification, Federation indicators, and device trust.** Our Messenger has most primitives but the UX doesn't surface them coherently. Here's what to improve:

### 1. Fix Build (`src/modules/uns/build/index.ts`)
- Re-export with a trivial touch to clear the module resolution cache

### 2. Conversation List UX — Align with Element's "Rooms" Pattern
**File: `src/modules/messenger/components/UnifiedInbox.tsx`**
- Replace emoji-based platform filters with proper icon pills (Element uses labeled filter chips)
- Add a "Spaces" concept at the top — group conversations by context (Work, Personal, Bridges) like Element's Space sidebar
- Show encryption verification badges per conversation (green shield = verified, orange = unverified)
- Add last message preview with proper sender name for groups (Element shows "Alice: Hey...")
- Show typing indicators in the conversation list (not just inside chat)

### 3. Conversation View — Align with Element's Chat UX
**File: `src/modules/messenger/components/ConversationView.tsx`**
- Add thread support: long-press/right-click a message to "Reply in Thread" (Element's signature feature)
- Show device verification status in the encryption banner (currently just says "End-to-end encrypted")
- Add message read receipts as small avatars at the bottom-right of messages (Element pattern)
- Show "decrypting..." skeleton states instead of "🔒 Encrypted" placeholder while async decrypt runs

### 4. Contact Header — Federation & Bridge Awareness
**File: `src/modules/messenger/components/ContactHeader.tsx`**
- Show the source platform badge prominently (WhatsApp, Telegram, native Matrix, etc.)
- Display homeserver/federation info for Matrix contacts
- Add call buttons with proper disabled states and tooltips

### 5. Settings — Matrix-Aligned Security Panel
**File: `src/modules/messenger/components/SettingsPanel.tsx`**
- Add "Security & Verification" section showing:
  - Device list with verification status
  - Cross-signing status
  - Session key backup status
- Add "Spaces" management section
- Rename "Bridge Connections" to "Connected Platforms" (more intuitive)

### 6. New Conversation — Room Creation Alignment
**File: `src/modules/messenger/components/NewConversationDialog.tsx`**
- Add room visibility option (Private/Public) like Element
- Add encryption toggle (on by default, matches Element)
- Add "Invite via link" option

### 7. Message Bubbles — Verification & Platform Indicators
**File: `src/modules/messenger/components/MessageBubble.tsx`**
- Show a small platform icon for bridged messages
- Show verification shield on messages from verified devices
- Improve reaction display (Element shows reactions as pills below the message)

## Files Summary

| File | Action | Purpose |
|---|---|---|
| `src/modules/uns/build/index.ts` | Touch/re-save | Fix module resolution cache |
| `src/modules/messenger/components/UnifiedInbox.tsx` | Update | Space-based filtering, verification badges, typing in list |
| `src/modules/messenger/components/ConversationView.tsx` | Update | Thread support, decrypt skeleton, read receipt avatars |
| `src/modules/messenger/components/ContactHeader.tsx` | Update | Federation/bridge awareness, platform badge |
| `src/modules/messenger/components/SettingsPanel.tsx` | Update | Security panel, spaces management |
| `src/modules/messenger/components/NewConversationDialog.tsx` | Update | Room visibility, encryption toggle |
| `src/modules/messenger/components/MessageBubble.tsx` | Update | Platform icons, verification shields |

## Priority Order
1. **Build fix** (unblocks everything)
2. **UnifiedInbox + ConversationView** (highest UX impact)
3. **ContactHeader + MessageBubble** (polish)
4. **Settings + NewConversation** (secondary flows)

