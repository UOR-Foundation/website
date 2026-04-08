

## Redesign UOR Messenger — Unique Style + Real Backend Wiring

### What Changes

The messenger currently looks like a WhatsApp clone (green tint, identical layout, tail nubs on bubbles) and uses hardcoded mock data. We'll give it a distinctive visual identity that matches the rest of the UOR/Oracle experience, and wire all messaging to the existing `conduit_sessions` + `encrypted_messages` tables via the UMP protocol layer.

### Part 1: Visual Redesign

**Goal**: Replace the WhatsApp aesthetic with a design coherent with the Oracle/Immersive UI — dark glass panels, subtle gradients, no message tail nubs, rounded-pill bubbles, and the UOR teal/indigo accent palette.

| Component | Current (WhatsApp) | New (UOR) |
|---|---|---|
| **Color palette** | `#005c4b` sent, `#202c33` received | Sent: indigo-500/20 glass, Received: white/5 glass |
| **Bubble shape** | Rounded-lg with triangle tail nub | Rounded-2xl, no tail, subtle border |
| **Sidebar** | Green nav rail, `#111b21` panel | `backdrop-blur-xl bg-white/5` glass panel, no nav rail icons |
| **Header** | Green-tinged bar with WhatsApp icons | Minimal glass bar, UOR shield badge |
| **Input bar** | WhatsApp mic/emoji layout | Clean pill input with subtle glow on focus |
| **Background** | SVG dot pattern on dark green | Subtle radial gradient (dark indigo/slate) |
| **Chat list** | Green unread badges, WhatsApp spacing | Teal accent, glass hover states |
| **Empty state** | 💬 emoji | UOR shield/lock iconography |

**Files**: `MessageBubble.tsx`, `ChatSidebar.tsx`, `ChatList.tsx`, `ContactHeader.tsx`, `MessageInput.tsx`, `ConversationView.tsx`, `MessengerPage.tsx`, `SessionBadge.tsx`

### Part 2: Remove Mock Data, Wire to Backend

**Goal**: Replace `mock-data.ts` with real data from `conduit_sessions` and `encrypted_messages` tables, using the existing UMP protocol functions for encryption/decryption.

#### New files

| File | Purpose |
|---|---|
| `src/modules/messenger/lib/use-conversations.ts` | React hook: fetches user's `conduit_sessions`, joins with `profiles` for display names/avatars, subscribes to realtime changes |
| `src/modules/messenger/lib/use-messages.ts` | React hook: fetches `encrypted_messages` for a session, decrypts via UMP `openMessage()`, subscribes to realtime inserts |
| `src/modules/messenger/lib/use-send-message.ts` | Hook: encrypts plaintext via `sealMessage()`, inserts into `encrypted_messages`, updates DAG heads |
| `src/modules/messenger/components/NewConversationDialog.tsx` | Modal to search users by handle (`search_profiles_by_handle`), create a new `conduit_session` via `createDirectSession()` |

#### Modified files

| File | Change |
|---|---|
| `mock-data.ts` | Keep type definitions (`Contact`, `Message`, `Chat`), remove all hardcoded data arrays |
| `ConversationView.tsx` | Use `useMessages(sessionId)` + `useSendMessage(session)` instead of local state from mock arrays |
| `ChatSidebar.tsx` | Use `useConversations()` instead of imported `chats` array; add "New chat" button |
| `ChatList.tsx` | Accept real conversation data; show last decrypted message preview |
| `MessengerPage.tsx` | Gate on `useAuth()` — show sign-in prompt if not authenticated; pass session objects instead of contact IDs |
| `ContactHeader.tsx` | Show real profile data from the session's participant |
| `messaging-protocol.ts` | Add `initSession()` and `persistSession()` functions that read/write `conduit_sessions` table and manage the local key cache |

#### Data Flow

```text
User opens /messenger
  → useAuth() checks authentication
  → useConversations() queries conduit_sessions WHERE auth.uid() = ANY(participants)
  → For each session, fetch peer profile from profiles table
  → Display in ChatList

User selects a conversation
  → useMessages(sessionId) queries encrypted_messages ORDER BY created_at
  → Each message decrypted client-side via openMessage(session, msg)
  → Realtime subscription on encrypted_messages for live updates

User sends a message
  → sealMessage(session, plaintext) → ciphertext + message_hash + envelope_cid
  → INSERT INTO encrypted_messages
  → Realtime broadcasts to other participant

User starts new conversation
  → Search profiles by handle
  → createDirectSession(myIdentity, peerIdentity)
  → INSERT INTO conduit_sessions
  → Navigate to new conversation
```

### Part 3: Authentication Gate

The messenger requires authentication (RLS on both tables enforces this). If the user is not signed in, show a centered prompt with the UOR shield and a "Sign in to message" button that opens the existing `SovereignIdentityPanel`.

### Summary of All Files

| Action | File |
|---|---|
| **Restyle** | `MessageBubble.tsx`, `ChatSidebar.tsx`, `ChatList.tsx`, `ContactHeader.tsx`, `MessageInput.tsx`, `ConversationView.tsx`, `MessengerPage.tsx` |
| **New** | `use-conversations.ts`, `use-messages.ts`, `use-send-message.ts`, `NewConversationDialog.tsx` |
| **Modify** | `mock-data.ts` (keep types, remove data), `messaging-protocol.ts` (add persistence) |

No database changes needed — `conduit_sessions`, `encrypted_messages`, and `profiles` tables already exist with correct RLS policies and realtime enabled.

