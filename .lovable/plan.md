

# Telegram-Grade Messenger UX Overhaul

## What This Does

Transforms the current messenger into a Telegram-caliber experience: snappy animations, a proper hamburger menu with profile/contacts/settings, polished message bubbles with inline timestamps, pinned messages bar, sticker/emoji panel, saved messages, and crisp interaction patterns — all anchored to Sovereign Identity.

## Reference Analysis (from Telegram screenshot)

Key Telegram UX patterns to replicate:

1. **Hamburger sidebar menu** — Profile, Wallet, New Group, New Channel, Contacts, Calls, Saved Messages, Settings, Night Mode toggle
2. **Chat list** — Avatar, name, last message preview, time, unread badge (green), pinned icon, double-check delivery marks inline with time
3. **Message bubbles** — Sender name in color (group), text body, emoji reactions inline below text, timestamp + double-check right-aligned at bottom-right of bubble, reply quotes with colored left bar
4. **Pinned message bar** — Dismissable bar at top of conversation showing pinned content
5. **Emoji panel** — Full emoji picker with tabs (Emoji, Stickers, GIFs), search, categories
6. **Conversation header** — Group name, member count, search, layout toggle, kebab menu
7. **Message input** — Clean input with emoji button, attachment, and send; voice note when empty

## Implementation Plan

### 1. Hamburger Menu Sidebar (Telegram's signature navigation)

**New file: `SidebarMenu.tsx`**
- Slide-out drawer from left (or overlay on mobile)
- User avatar + name + handle at top (linked to Sovereign Identity)
- Menu items: My Profile, Saved Messages, New Group, New Channel, Contacts, Calls, Settings, Night Mode toggle
- "My Profile" opens identity panel; "Saved Messages" opens a self-conversation
- Animated backdrop + slide transition

**Modify: `UnifiedInbox.tsx`**
- Replace the static "Messages" header with hamburger icon (☰) on left + search icon on right
- Tapping hamburger opens `SidebarMenu`
- Search becomes an expandable bar (Telegram-style: tapping search expands it to full-width input)

### 2. Enhanced Chat List Items (Telegram crispness)

**Modify: `ChatList.tsx`**
- Delivery status checkmarks inline with timestamp (✓ or ✓✓ in color)
- Show message type icons in preview (📷 Photo, 🎤 Voice, 📎 File)
- Pinned conversations get subtle pin icon; muted get bell-off
- Last message shows sender name in groups ("Alice: hey...")
- Swipe gestures: swipe right → pin/unpin, swipe left → archive/mute
- Active conversation gets a subtle teal left-border accent (not just bg change)

### 3. Polished Message Bubbles (matching Telegram precision)

**Modify: `MessageBubble.tsx`**
- Bubble tail/pointer on the first message in a sequence from a sender
- Compact grouping: consecutive messages from same sender within 1 minute collapse (no gap, no repeated avatar)
- Timestamp + delivery status tucked into bottom-right corner of the text area (floated, not on a separate line)
- Sender name in group chats gets a deterministic color (hash userId → hue)
- Link previews: detect URLs and show a preview card (title, description, thumbnail)
- Smooth hover reveal for action buttons (reply arrow) — currently works, make it snappier

### 4. Full Emoji/Sticker Panel (Telegram's emoji panel)

**New file: `EmojiPanel.tsx`**
- Full panel (not just 6 reactions) — tabs for Emoji, Stickers, GIFs
- Emoji tab: categorized grid (Smileys, People, Animals, Food, Travel, Activities, Objects, Symbols, Flags)
- Search bar at top
- Recent/frequently used section
- Triggered by the smiley button in MessageInput
- Slides up from bottom of input area (not a tiny popover)

**Modify: `MessageInput.tsx`**
- Smiley button toggles EmojiPanel open/closed
- Selected emoji inserts at cursor position in textarea
- Panel is a fixed-height overlay above the input bar

### 5. Pinned Message Bar

**New file: `PinnedMessageBar.tsx`**
- Shows at top of conversation (below header) when a message is pinned
- Shows pinned message preview text, click to scroll to it
- X button to dismiss (not unpin, just hide the bar)
- Subtle animation on enter/exit

**Modify: `ConversationView.tsx`**
- Query for pinned messages in the session
- Render `PinnedMessageBar` between header and message area

**Modify: `MessageContextMenu.tsx`**
- Add "Pin" action — inserts/updates a `pinned_messages` record or uses a `pinned_message_hash` column on the session

### 6. Saved Messages

**Modify: `SidebarMenu.tsx` + `use-conversations.ts`**
- "Saved Messages" creates/opens a self-conversation (user talks to themselves)
- Bookmark icon in chat list; shows as special conversation with bookmark avatar
- Forwarding messages to Saved Messages = bookmarking

### 7. Contact List & Calls Placeholder

**New file: `ContactsPanel.tsx`**
- Lists all users the current user has conversations with
- Alphabetically sorted with letter headers
- Shows online status dots
- Click to open existing conversation or create new one

**New file: `CallsPanel.tsx`**
- Placeholder showing call history UI (future feature)
- Voice/video call entries with duration, time, missed indicator

### 8. Settings Panel

**New file: `SettingsPanel.tsx`**
- Account section: profile photo, name, handle, bio
- Privacy: who can see last seen, profile photo
- Notifications: sound, desktop notifications toggle
- Chat settings: chat background, font size
- Bridge connections (existing BridgeConnectionPanel integrated here)
- About: version, encryption info

### 9. Responsive & Animation Polish

**Modify across all components:**
- All transitions use `transition-all duration-150` for snappiness (Telegram feels instant)
- Message send: brief scale animation on the sent bubble
- Sidebar menu: 200ms slide with backdrop fade
- Scroll-to-bottom FAB: show unread count badge on it when new messages arrive
- Typing indicator: animated three-dot bounce in the conversation
- Mobile: proper back-navigation with slide transitions

### 10. Sovereign Identity Integration

**Modify: `SidebarMenu.tsx` + `ContactHeader.tsx`**
- User's avatar area in sidebar menu shows their UOR glyph / Sovereign Identity badge
- Tapping profile opens the Identity Hub (existing route)
- Contact info panel shows the peer's Sovereign Identity verification status
- "Wallet" menu item links to identity/wallet route (placeholder for now)

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `SidebarMenu.tsx` | Create | Telegram-style hamburger drawer |
| `EmojiPanel.tsx` | Create | Full emoji picker with categories |
| `PinnedMessageBar.tsx` | Create | Pinned message banner |
| `ContactsPanel.tsx` | Create | Contact directory |
| `CallsPanel.tsx` | Create | Call history placeholder |
| `SettingsPanel.tsx` | Create | User settings screen |
| `UnifiedInbox.tsx` | Modify | Hamburger + search bar redesign |
| `ChatList.tsx` | Modify | Checkmarks, swipe, accent styling |
| `MessageBubble.tsx` | Modify | Bubble tails, grouping, colored names |
| `MessageInput.tsx` | Modify | Emoji panel integration |
| `MessageContextMenu.tsx` | Modify | Pin action |
| `ConversationView.tsx` | Modify | Pinned bar, typing dots, animation |
| `ContactHeader.tsx` | Modify | Identity badge integration |
| `MessengerPage.tsx` | Modify | Menu state, panel routing |
| `ReactionPicker.tsx` | Modify | Expand to use EmojiPanel |

No database migrations needed — this is purely a UI/UX overhaul using existing data structures.

