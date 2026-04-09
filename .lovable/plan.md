

## Assessment & Improvement Plan: File Explorer UX Overhaul

### Current State Analysis

The implementation is solid and follows Finder conventions well: sidebar categories, grid/list toggle, colored tags, Quick Look, drag-and-drop, breadcrumbs, status bar. The screenshot confirms it renders cleanly with appropriate visual hierarchy.

**Issues identified through cognitive science and UX heuristics:**

1. **No sorting** — Users cannot sort by name, date, type, or size. This violates the "recognition over recall" principle (Nielsen) and forces linear scanning.

2. **No temporal signal** — "Recents" filter exists but returns all items identically to "All Files." There are no timestamps on items, violating the brain's episodic memory system (Tulving, 1972) which anchors recall to time.

3. **Tags are ephemeral** — Tags vanish on refresh. This breaks the user's mental model — tagging feels like a commitment, losing it feels like betrayal. Tags should persist to localStorage at minimum.

4. **Paste/URL input uses `prompt()`** — Browser `prompt()` dialogs are jarring, unthemeable, and break the immersive OS illusion. These should be inline modals.

5. **No multi-select** — Users can't select multiple files to tag, delete, or move in bulk. Every file management system supports this.

6. **No drag reordering or drag-to-folder** — Folders exist but you can't drag items into them. They're decorative containers.

7. **Quick Look has no navigation** — In macOS, arrow keys move between files while Quick Look is open. Currently you must close and re-click.

8. **No file size or date metadata** — The `ContextItem` type lacks `createdAt` and `size` fields, which are fundamental for spatial-temporal orientation.

9. **UOR framework is completely absent** — No content-addressing, no canonical identity, no integrity verification. This is a missed opportunity for "magical" differentiation.

10. **Search is filename-only** — Doesn't search file contents, which is the primary way people find things (Lansdale, 1988 — "people remember *what* not *where*").

### Plan: Cognitive-Science-Informed File Explorer

#### Phase 1: Temporal Grounding & Sorting (core cognition fix)

**File: `src/modules/sovereign-vault/hooks/useContextManager.ts`**
- Add `createdAt: number` (Date.now()) and `size: number` (byte length) to `ContextItem`
- Populate on creation in `guestContext`

**File: `src/modules/sovereign-vault/lib/guest-context.ts`**
- Store `createdAt` and `size` on each guest item

**File: `src/modules/explorer/components/ExplorerToolbar.tsx`**
- Add a sort dropdown: Name, Date Added, Size, Type (default: Date Added descending — recency bias matches how episodic memory works)

**File: `src/modules/explorer/pages/FileExplorerPage.tsx`**
- Implement sort logic before rendering
- Make "Recents" filter actually sort by `createdAt` descending and limit to last 10

**File: `src/modules/explorer/components/FileCard.tsx`**
- Show relative timestamps ("2m ago", "yesterday") in list view — temporal anchoring

#### Phase 2: Persistent Tags + Full-Text Search (retrieval cognition)

**File: `src/modules/explorer/lib/tags.ts`**
- Persist `tagMap` to `localStorage` under `uor:file-tags`
- Load on init, save on every mutation

**File: `src/modules/explorer/pages/FileExplorerPage.tsx`**
- Extend search to match against `item.text` content, not just filename
- This aligns with Lansdale's research: people remember content fragments, not filenames

#### Phase 3: Inline Paste & URL Modals (immersion preservation)

**File: `src/modules/explorer/components/PasteModal.tsx`** — new
- Clean modal with a `<textarea>` for pasting text, optional label field
- Replaces `prompt()` call

**File: `src/modules/explorer/components/ImportUrlModal.tsx`** — new
- Modal with URL input, shows loading state during import
- Replaces `prompt()` call

**File: `src/modules/explorer/pages/FileExplorerPage.tsx`**
- Wire modals with state instead of `prompt()`

#### Phase 4: Quick Look Navigation (spatial continuity)

**File: `src/modules/explorer/components/QuickLookModal.tsx`**
- Accept `items` array + `currentIndex` instead of single `item`
- Arrow key / swipe navigation between files
- Show "3 of 12" indicator in header
- Subtle left/right arrow buttons on hover

#### Phase 5: UOR-Powered Identity Layer (the "magic")

This is where UOR makes this explorer feel unlike anything else.

**File: `src/modules/explorer/lib/file-identity.ts`** — new
- On file add, compute `computeUorAddress(item.text)` from the UOR SDK
- Store the address alongside the item
- This gives every file a permanent, verifiable, content-based identity

**File: `src/modules/explorer/components/FileCard.tsx`**
- Show a tiny monospace UOR address fragment (first 8 chars) as a subtle badge on hover — like a fingerprint
- Tooltip: "This file's identity is derived from its content. Same content = same address, everywhere."

**File: `src/modules/explorer/components/QuickLookModal.tsx`**
- Add a small "Identity" section at bottom of preview showing:
  - UOR Address (truncated, copyable)
  - Coherence status (verified checkmark)
  - "This address is permanent — if the content changes, the address changes"
- This makes integrity verification *visible* and *tangible*

**File: `src/modules/explorer/pages/FileExplorerPage.tsx`**
- Duplicate detection: when adding a file, check if any existing item has the same UOR address → show "This file already exists" instead of creating a duplicate
- This is impossible without content-addressing — it's genuinely magical UOR behavior

#### Phase 6: Multi-Select (efficiency)

**File: `src/modules/explorer/pages/FileExplorerPage.tsx`**
- Add `selectedIds: Set<string>` state
- Click = Quick Look (single), Shift+Click = range select, Cmd+Click = toggle select
- When multiple selected, show a floating action bar: "3 selected — Tag / Delete / Clear"

**File: `src/modules/explorer/components/FileCard.tsx`**
- Add `selected` boolean prop, show a checkbox overlay when in multi-select mode

### Files Summary

| File | Action |
|------|--------|
| `guest-context.ts` | Add `createdAt`, `size` fields |
| `useContextManager.ts` | Pass through new fields |
| `ExplorerToolbar.tsx` | Add sort dropdown |
| `FileExplorerPage.tsx` | Sort logic, full-text search, multi-select, duplicate detection, modal wiring |
| `FileCard.tsx` | Timestamps, UOR badge, selection state |
| `QuickLookModal.tsx` | Arrow navigation, UOR identity section |
| `tags.ts` | localStorage persistence |
| `PasteModal.tsx` | New — inline paste dialog |
| `ImportUrlModal.tsx` | New — inline URL import dialog |
| `file-identity.ts` | New — UOR content-addressing for files |

### Cognitive Science Principles Applied

- **Episodic memory** (Tulving): Temporal anchoring via timestamps and recency sorting
- **Recognition over recall** (Nielsen): Sort controls, visual tags, content search
- **Semantic memory** (Tulving): Full-text search matches how people encode meaning
- **Spatial consistency** (Gestalt): Quick Look navigation preserves spatial context
- **Commitment consistency** (Cialdini): Persistent tags honor the user's organizational effort
- **Content-addressing** (UOR): Duplicate detection and identity verification create trust and delight

### Priority Order
Phases 1-2 fix fundamental usability gaps. Phase 3 fixes immersion breaks. Phase 4 adds polish. Phases 5-6 add differentiation and power-user capability.

