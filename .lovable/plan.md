

# Context Menu for + Button: Guest & Member Access

## Overview

Replace the current `VaultContextPicker` popover with a two-tier context menu inspired by the uploaded reference image. The menu provides clean actions for adding context — files, URLs, and paste — with guest access working entirely in-memory (no auth required) and member access persisting to the Sovereign Vault.

## Current State

- The `+` button opens `VaultContextPicker`, which shows existing vault documents and import actions
- The vault requires authentication (`vault.ready` checks for `userId`)
- `VaultImportDialog` handles file/URL imports but requires auth
- All storage goes through Supabase via `vault-store.ts`

## Plan

### 1. Create a guest context store (in-memory)

**New file: `src/modules/sovereign-vault/lib/guest-context.ts`**

- Simple in-memory store for guest users (no persistence)
- Holds an array of `GuestContextItem` objects: `{ id, filename, text, mimeType, addedAt }`
- Uses `extractText` from the existing extract module to process files
- Cleared on page refresh (intentionally ephemeral)
- Exposes: `addFile`, `addUrl`, `addPaste`, `remove`, `list`, `getAll`

### 2. Create the new context menu component

**New file: `src/modules/sovereign-vault/components/ContextMenu.tsx`**

A dropdown menu (similar to uploaded reference) that appears on `+` click with two sections:

**Guest actions (always visible):**
- **Add File** — opens file picker, extracts text, stores in guest context
- **Paste Text** — opens a small textarea modal for pasting content
- **Paste Link** — opens URL input, fetches and extracts content

**Member section (shown when authenticated):**
- Divider line
- **Sovereign Vault** — opens the existing `VaultContextPicker` for persistent documents
- Subtle label: "Saved to your sovereign space"

**Guest info banner** (shown when not authenticated):
- Small note at bottom: "Context is session-only. Create a Sovereign ID to save permanently."

### 3. Update `useVault` hook or create `useContextManager`

**New file: `src/modules/sovereign-vault/hooks/useContextManager.ts`**

- Wraps both guest context store and vault hook
- Returns unified `contextItems` array (guest items + selected vault docs)
- Tracks `isGuest` boolean
- Provides `addFile`, `addUrl`, `addPaste`, `remove` that route to the correct store
- Guest items get passed as inline text context to the search/query pipeline

### 4. Update ImmersiveSearchView

- Replace `VaultContextPicker` with the new `ContextMenu`
- Use `useContextManager` instead of directly using `useVault`
- Context pills show both guest and vault items (guest items with a "session" badge)
- The `+` button behavior stays the same (click to toggle menu)

### 5. Update MobileSearchBar

- Same changes as ImmersiveSearchView for consistency

### 6. Update ContextPills component

- Add visual distinction for guest items (e.g., dashed border or "temporary" label)
- Vault items keep their current appearance

## Technical Notes

- Guest context is purely client-side — no database, no auth required
- File extraction reuses existing `extractText` from `sovereign-vault/lib/extract.ts`
- The menu uses `framer-motion` for animation consistency with the rest of the UI
- Guest context items are passed as `contextDocIds` or as inline text to the search handler

