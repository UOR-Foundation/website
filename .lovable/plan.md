

# Messenger UX Polish — Crisp, Personal, Full-Screen

## Issues Identified (from screenshot + code)

1. **Header says "MESSAGES"** — impersonal, all-caps, feels like a system label
2. **Too many filter rows** — Spaces strip + filter tabs + platform chips = 3 rows of chrome before any content. Cluttered for an empty inbox
3. **Text too small / low contrast** — filter labels at `text-[11px]`/`text-[12px]` with `text-white/25`-`/30` opacity. Hard to read
4. **"0 verified" badge** — noise when there are zero conversations
5. **Empty state has verbose text** — "Kyber-1024 + AES-256-GCM · Dilithium-3" is engineer jargon, not user-facing
6. **Right panel empty state also verbose** — same crypto spec text repeated
7. **Scroll needed** — the filter rows push content down unnecessarily

## Changes

### 1. Rename header: "Messages" → "Inbox"
Short, personal, universally understood. The security is implied by the shield icon already present in the sidebar and conversation view.

### 2. Collapse filter chrome when inbox is empty
- Hide Spaces strip, platform chips, and "verified" badge when `conversations.length === 0`
- Keep only the All/Unread/Archived tabs (they serve as navigation)
- Increase filter tab text to `text-[14px]` with `text-white/50` (from `text-[13px]`/`text-white/35`)

### 3. Improve text sizes and contrast throughout
- Header title: `text-[18px]` (from `text-[17px]`)
- Space filter labels: `text-[13px]` with `text-white/40` active → `text-white/60`
- Filter tabs: `text-[14px]` with improved active/inactive contrast
- Chat list name: `text-[16px]` (from `text-[15px]`)
- Chat list preview: `text-[14px] text-white/40` (from `text-[13px] text-white/30`)
- Empty state text: `text-base text-white/50` (from `text-sm text-white/20`)

### 4. Clean up empty states
- **Sidebar empty**: "No conversations yet" (remove "— start one!")
- **Right panel empty**: Remove crypto spec line ("Kyber-1024 + AES-256-GCM..."). Keep just the icon + "Inbox" + one-liner "Select a conversation or start a new one"
- **Sign-in screen**: Simplify to "Private, encrypted conversations. Sign in to continue." Remove crypto spec.

### 5. Remove "0 verified" badge
Only show the verified count badge when `verifiedCount > 0`

### 6. Right panel empty state — simpler
Replace the current verbose empty state with just the icon and a short prompt. Remove the Lock + crypto spec footer.

### 7. Ensure full-screen fit (no scroll)
The messenger already uses `h-screen w-screen overflow-hidden`. The fix is reducing the filter chrome rows so the chat list has maximum vertical space.

## Testing with Two Users

To test the messenger with two different users on two devices:

1. **Open the published app** on Device A (e.g. your laptop): `https://univeral-coordinate-hub.lovable.app`
2. **Sign up** with Email A — this creates User A
3. **Open the same URL** on Device B (e.g. your phone or incognito browser)
4. **Sign up** with Email B — this creates User B
5. On Device A, tap the **+** FAB → search for User B's handle → start a conversation
6. Messages will appear in real-time on both devices via the existing Supabase realtime subscription

No code changes needed for testing — the messenger already supports real-time messaging between authenticated users.

## Files to Modify

| File | Changes |
|---|---|
| `src/modules/messenger/components/UnifiedInbox.tsx` | Rename header to "Inbox", increase text sizes/contrast, hide empty-state chrome, remove "0 verified" |
| `src/modules/messenger/pages/MessengerPage.tsx` | Simplify right-panel empty state and sign-in screen text |
| `src/modules/messenger/components/ChatList.tsx` | Increase text sizes, simplify empty message |

