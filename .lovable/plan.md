

## Plan: Quick Look — Inline File Preview

### Overview
Add a macOS-style Quick Look experience: clicking a file in the explorer opens a modal overlay that previews the file's content. Press `Escape` or click outside to dismiss. Supports text, code, markdown, images, HTML, paste clips, and URLs with appropriate renderers.

### Changes

**1. New component: `QuickLookModal.tsx`**
- File: `src/modules/explorer/components/QuickLookModal.tsx`
- A centered modal overlay with backdrop blur, rounded corners, and a header showing the file icon, name, type badge, and a close button
- Content area renders based on `item.source` and `mimeType`:
  - **Text/Code/JSON/CSV/Markdown**: Syntax-highlighted or monospace `<pre>` block with the `item.text` content, scrollable
  - **Paste clips**: Same as text, with a "Paste" label
  - **URLs**: Show the URL as a clickable link, plus the scraped markdown content below
  - **Images** (`item.text` starts with `[Image:`): Show a placeholder message (no raw file blob stored)
  - **Folders/Workspaces**: Simple icon + name display
- Keyboard: `Escape` closes the modal
- Animated entry with scale + fade (CSS transition)
- Max size: 70vw × 70vh, scrollable content area

**2. Update `FileCard.tsx`**
- Add an `onSelect` callback prop alongside `onRemove`
- Wire the card's click handler (on the main container) to call `onSelect(item.id)`
- Keep `onRemove` on the delete button with `stopPropagation` (already done)

**3. Update `FileExplorerPage.tsx`**
- Add `selectedItem` state tracking the currently previewed item
- Pass `onSelect` to each `FileCard` that sets `selectedItem`
- Render `<QuickLookModal>` when `selectedItem` is set, with `onClose` to clear it

### Files Modified
- `src/modules/explorer/components/QuickLookModal.tsx` — new file
- `src/modules/explorer/components/FileCard.tsx` — add `onSelect` click handler
- `src/modules/explorer/pages/FileExplorerPage.tsx` — wire selected state + render modal

