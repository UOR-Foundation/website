

## Native Messenger — WhatsApp Desktop Clone

### Summary
Create a full-screen messenger experience at `/messenger` that precisely emulates WhatsApp Desktop's three-panel layout: sidebar (chat list), conversation view, and optional contact/call panel. Pure UI/UX first — no backend wiring yet.

### Layout (matches WhatsApp Desktop exactly)

```text
┌──────┬──────────────────────┬──────────────────────┐
│ Nav  │   Chat List (30%)    │  Conversation (70%)  │
│ Rail │   ─────────────────  │  ─────────────────── │
│      │  Search bar          │  Contact header bar  │
│ 💬   │  Chat item           │  Message bubbles     │
│ 📞   │  Chat item (active)  │  (green = sent,      │
│ 🔄   │  Chat item           │   white = received)  │
│ ⚙️   │  ...                 │  ─────────────────── │
│      │                      │  Input bar + attach  │
└──────┴──────────────────────┴──────────────────────┘
```

### Architecture

**New module**: `src/modules/messenger/`

| File | Purpose |
|------|---------|
| `pages/MessengerPage.tsx` | Full-screen shell, no Navbar/Footer |
| `components/ChatSidebar.tsx` | Left panel: nav rail + chat list with search |
| `components/ChatList.tsx` | Scrollable contact list with avatars, timestamps, badges |
| `components/ConversationView.tsx` | Right panel: header + messages + input |
| `components/MessageBubble.tsx` | Individual message (sent/received, text/image/voice) |
| `components/MessageInput.tsx` | Bottom input bar with emoji, attach, voice, send |
| `components/ContactHeader.tsx` | Top bar showing contact name, status, call/video/search icons |
| `lib/mock-data.ts` | Seed conversations and messages for demo |

### Visual Spec (matching WhatsApp Desktop)

- **Nav rail**: ~64px wide, dark (#111b21), vertical icon buttons — chat, calls, status, settings, profile avatar at bottom
- **Chat list**: ~30% width, dark (#111b21) bg, search bar at top, each chat row: avatar (48px circle), name (bold white), last message (gray), timestamp (green for unread), unread badge (green circle)
- **Conversation**: ~70% width, darker bg (#0b141a) with subtle wallpaper pattern, green bubbles for sent (WhatsApp green #005c4b), dark bubbles for received (#202c33)
- **Message input**: bottom bar with emoji button, attachment clip, text input, and mic/send toggle
- **Contact header**: avatar, name + "online" status, video/call/search icons right-aligned
- **Typography**: system font stack, 14-15px body, timestamps in 11px
- **Colors**: WhatsApp dark theme palette exactly

### Routing

Add `/messenger` route in `App.tsx` — renders `MessengerPage` directly (no Layout wrapper, full-screen).

### Mock Data

- 8-10 contacts with avatars (generated initials), varied last messages, timestamps, unread counts
- Active conversation: ~15 messages mixing text, emoji, image placeholders, voice note indicator, timestamps, read receipts (double blue check)

### Mobile Responsive

- On mobile: single-panel — show chat list OR conversation (not both)
- Swipe/tap to navigate between panels
- Bottom nav bar moves to top on mobile conversation view

### Files Changed

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/messenger` route |
| `src/modules/messenger/pages/MessengerPage.tsx` | **New** — Full-screen shell |
| `src/modules/messenger/components/ChatSidebar.tsx` | **New** — Nav rail + chat list |
| `src/modules/messenger/components/ChatList.tsx` | **New** — Contact rows |
| `src/modules/messenger/components/ConversationView.tsx` | **New** — Messages + input |
| `src/modules/messenger/components/MessageBubble.tsx` | **New** — Sent/received bubble |
| `src/modules/messenger/components/MessageInput.tsx` | **New** — Input bar |
| `src/modules/messenger/components/ContactHeader.tsx` | **New** — Conversation top bar |
| `src/modules/messenger/lib/mock-data.ts` | **New** — Seed contacts + messages |

