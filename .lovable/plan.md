

## Plan: Redesign Context Upload as a Full Window Experience

### Problem
The current "Add Context" button opens a small inline overlay dropdown (ContextMenu). It feels cramped and doesn't give users a clear overview of their uploaded files. The user wants a proper, standalone upload interface that opens as a window/dialog.

### Changes

**1. Change trigger icon to Upload (`Plus` → `Upload` or keep `Plus`)**
- Files: `ImmersiveSearchView.tsx`, `MobileSearchBar.tsx`
- The trigger buttons already use `Plus` — we'll keep `Plus` as it's intuitive for "add content". Alternatively switch to `Upload` if preferred. Based on the user's request ("plus or even an upload icon"), we'll use `Plus` with an upload-style tooltip.

**2. Replace inline ContextMenu with a full Dialog/Window**
- **New component**: `VaultUploadWindow.tsx` — a full-screen dialog (using the existing `Dialog` from `@/modules/core/ui/dialog`) that serves as the standalone upload interface.
- Layout inside the dialog:
  - **Header**: "Context Library" title with file count
  - **Upload area**: Large drag-and-drop zone for files (PDF, TXT, MD, CSV, JSON, etc.)
  - **Action row**: Buttons for "Paste Text", "Import URL", "New Workspace", "New Folder"
  - **File list**: Bird's-eye grid/list of all current context items showing filename, source type (file/paste/url), and a remove button
  - **Vault section** (if authenticated): Access to Sovereign Vault documents
  - **Guest notice** (if not authenticated): Session-only warning

**3. Update trigger points**
- `ImmersiveSearchView.tsx`: Replace `ContextMenu` with the new `VaultUploadWindow` dialog
- `MobileSearchBar.tsx`: Same replacement
- The `ContextMenu.tsx` component stays in the codebase but is no longer used by these two entry points

**4. Theme awareness**
- Use semantic Tailwind tokens (`bg-background`, `text-foreground`, `border-border`) throughout so the dialog works in both light and dark modes with full contrast.

### Technical Details

- The new dialog will reuse the existing `useContextManager` hook (same `ctx` prop) for all operations: `addFile`, `addPaste`, `addUrl`, `addWorkspace`, `addFolder`, `remove`
- Drag-and-drop handling reuses the same pattern from `ContextMenu.tsx`
- Sub-views (paste text, URL input, workspace/folder name) will be inline sections within the dialog rather than separate navigation states — keeping everything visible at a glance
- The file list will show `ctx.contextItems` with type badges and delete buttons
- Dialog size: `sm:max-w-2xl` for comfortable browsing on desktop, full-width on mobile

