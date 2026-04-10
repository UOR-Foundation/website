

# Messenger UX Polish — Responsiveness, Snappiness & Full Wiring

## Critical Issues Found

### 1. Performance: N+1 Query Problem in `use-conversations.ts`
Lines 133-150 execute **two sequential database queries per conversation** (latest message + unread count) inside a `for` loop. With 20 conversations, that's 40 sequential network requests on every load AND on every realtime event (new message, session update). This is the single biggest performance killer.

### 2. Performance: Full Refetch on Every Realtime Event
Both `use-conversations.ts` and `use-messages.ts` call their full `fetch` function on every INSERT/UPDATE event. A single new message triggers a full re-fetch of all conversations (including the N+1 loop above), plus a full re-fetch of all messages + reactions + profiles.

### 3. Scroll Jank
`handleScroll` in `ConversationView.tsx` (line 76) calls `setShowScrollBottom` on every scroll event with no throttle — causes re-renders during scrolling.

### 4. Unwired Buttons & Dead Ends
- **Video/Audio call buttons** in `ContactHeader.tsx` (lines 74-85): `onCall` is never passed from `ConversationView.tsx` — buttons do nothing
- **"Forward" option** listed in `MessageContextMenu.tsx` import but not used
- **"New Channel"** in `SidebarMenu.tsx` (line 31): `action` just closes the menu, does nothing
- **Privacy & Security** and **Chat Settings** in `SettingsPanel.tsx`: no actions, just dead buttons
- **Bridge Connections** button in Settings: `onOpenBridges` is passed but the bridges panel can't open from Settings because the sidebar panel replaces the inbox view

### 5. Emoji Search is Broken
`EmojiPanel.tsx` line 61: search filter is `filter(() => true)` — it returns ALL emojis regardless of search query, just sliced to 100.

### 6. Missing Touch Feedback
No `active:` states on interactive elements — on mobile, taps feel unresponsive because there's no visual feedback.

### 7. Edit Uses `prompt()`, Delete Uses `confirm()`
`ConversationView.tsx` lines 99-106: uses browser `prompt()` and `confirm()` dialogs — breaks the premium feel completely.

## Implementation Plan

### Phase 1: Fix the N+1 Query (biggest performance win)

**Modify: `use-conversations.ts`**
- Replace the per-conversation loop with two batch queries:
  - One query using a window function or `DISTINCT ON` to get the latest message per session
  - One query using `GROUP BY` to get unread counts per session
- Result: 5-6 total queries instead of 2N+4

### Phase 2: Optimistic Realtime Updates

**Modify: `use-messages.ts`**
- On realtime INSERT: append the new message to local state immediately instead of refetching everything
- Only do a full refetch for UPDATE events (edits/deletes)
- On reaction changes: patch the specific message's reactions array locally

**Modify: `use-conversations.ts`**
- On new message INSERT: update only the affected conversation's `lastMessage` and `unread` count locally
- Debounce full refetch to max once per 5 seconds as a consistency check

### Phase 3: Scroll & Render Performance

**Modify: `ConversationView.tsx`**
- Throttle `handleScroll` with `requestAnimationFrame` 
- Use `will-change: transform` on the scroll container for GPU compositing
- Wrap the scroll-to-bottom FAB in a CSS transition instead of conditional render (avoids layout shift)

### Phase 4: Wire All Dead Buttons

**Modify: `ConversationView.tsx`**
- Call buttons → show a toast: "Sovereign voice/video calls — coming soon"
- Pass `onCall` to `ContactHeader`

**Modify: `SidebarMenu.tsx`**
- "New Channel" → show toast: "Channels — coming soon"

**Modify: `SettingsPanel.tsx`**
- Privacy & Security → show toast: "Coming soon"
- Chat Settings → show toast: "Coming soon"
- Make Bridge Connections navigate back to inbox first, then open bridges

### Phase 5: Fix Emoji Search

**Modify: `EmojiPanel.tsx`**
- Implement actual Unicode name-based search using a lightweight emoji name map
- Filter emojis whose names contain the search query

### Phase 6: Replace `prompt()`/`confirm()` with In-App Modals

**Create: `EditMessageModal.tsx`**
- Clean inline edit UI that appears in-place or as a minimal bottom sheet
- Pre-filled textarea, Cancel/Save buttons, matches messenger aesthetic

**Create: `ConfirmDialog.tsx`**
- Reusable confirmation dialog with the frosted-glass treatment
- Used for delete confirmation

**Modify: `ConversationView.tsx`**
- Replace `prompt()` call with `EditMessageModal`
- Replace `confirm()` call with `ConfirmDialog`

### Phase 7: Touch & Interaction Polish

**Modify across all interactive components:**
- Add `active:scale-[0.97]` to chat list items, buttons, and menu items for instant tap feedback
- Add `active:bg-white/[0.06]` to all tappable elements
- Ensure all `transition-` durations are `100ms` or `75ms` for snappiness
- Add `touch-action: manipulation` to prevent 300ms tap delay on mobile
- Add `select-none` to interactive elements to prevent text selection on long press

### Phase 8: Visual Micro-Polish

**Modify: `MessageBubble.tsx`**
- Add a subtle `animate-in` for new messages (fade + slight slide up, 100ms)

**Modify: `ConversationView.tsx`**
- Typing indicator: use a more refined dot animation (opacity pulse instead of bounce, which feels janky)

**Modify: `ChatList.tsx`**
- Add `will-change: transform` for smooth scroll
- Avatar: add a subtle ring for online contacts

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `lib/use-conversations.ts` | Modify | Batch queries, optimistic realtime |
| `lib/use-messages.ts` | Modify | Optimistic inserts, debounced refetch |
| `ConversationView.tsx` | Modify | Scroll throttle, wire calls, replace prompt/confirm, typing animation |
| `MessageBubble.tsx` | Modify | Entry animation, touch states |
| `ChatList.tsx` | Modify | Touch feedback, online ring, scroll perf |
| `ContactHeader.tsx` | Modify | Wire call buttons with toast |
| `SidebarMenu.tsx` | Modify | Wire New Channel toast |
| `SettingsPanel.tsx` | Modify | Wire dead buttons with toasts, fix bridges flow |
| `EmojiPanel.tsx` | Modify | Fix search to actually filter by emoji name |
| `EditMessageModal.tsx` | Create | In-app message edit UI |
| `ConfirmDialog.tsx` | Create | Reusable confirmation dialog |
| `UnifiedInbox.tsx` | Modify | Touch states on filter tabs |
| `MessageInput.tsx` | Modify | Touch manipulation, active states |
| `MessageContextMenu.tsx` | Modify | Active states on menu items |
| `MessengerPage.tsx` | Modify | Minor touch-action CSS |

No database migrations needed.

