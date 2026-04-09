

## Plan: File Explorer — A Standalone Desktop App

### Overview
Create a macOS Finder-inspired File Explorer app that opens as a full desktop window (like Oracle, Library, Messenger). It replaces the cramped context dropdown with a familiar, spatial file management experience. Users can drag-and-drop files, create folders/workspaces, and browse their context library — all within the OS metaphor.

### Design Reference
Inspired by macOS Finder: left sidebar with categories (Recents, Favorites, Tags), main content area with icon/list view, toolbar with view toggles and actions. Clean, spacious, native-feeling.

### Changes

**1. Register "Files" as a desktop app**
- File: `src/modules/desktop/lib/desktop-apps.ts`
- Add a new app entry with `id: "files"`, `label: "Files"`, icon: `FolderOpen` from lucide, category: `"STRUCTURE"`, lazy-loading a new `FileExplorerPage` component.
- Update `os-taxonomy.ts` to add `"files"` to the `STRUCTURE` category's `appIds` and set `userFacing: true`.

**2. Create the File Explorer page**
- File: `src/modules/explorer/pages/FileExplorerPage.tsx`
- Full-window layout with three regions:
  - **Sidebar** (~180px): Sections for "Favorites" (All Files, Recents, Uploads), "Organize" (Workspaces, Folders), and a guest/vault status indicator at the bottom.
  - **Toolbar**: Current location breadcrumb, view toggle (grid/list icons), "Upload" button, "New Folder" button, search filter input.
  - **Content area**: Displays context items as a grid of file cards (icon + filename + type badge + date) or a list view. Supports drag-and-drop onto the content area. Empty state shows a large drop zone with instructions.
- Wired to `useContextManager` for all data operations.
- Theme-aware using semantic tokens (`bg-background`, `text-foreground`, `border-border`).

**3. File item cards**
- File: `src/modules/explorer/components/FileCard.tsx`
- Grid mode: icon thumbnail (file type icon), filename below, subtle type/source badge. Hover shows delete action.
- List mode: single row with icon, name, source type, date added, size indicator, delete button.
- Right-click context menu with "Get Info", "Remove", "Rename" options.

**4. Update the search view trigger**
- File: `src/modules/oracle/components/ImmersiveSearchView.tsx`
- Change the `+` button behavior: instead of opening the inline `ContextMenu` dropdown, it opens the Files app as a desktop window via `wm.openApp("files", ...)`.
- Keep drag-and-drop on the search view as a quick-add shortcut.
- Keep ContextPills below the search bar to show what's selected.

**5. File type icons and utilities**
- File: `src/modules/explorer/lib/file-icons.ts`
- Map MIME types / extensions to appropriate lucide icons and colors (e.g., PDF → red FileText, JSON → amber Braces, Folder → blue FolderOpen, URL → green Globe).

### Technical Details

- The File Explorer reuses `useContextManager` and `guestContext` — no new data layer needed.
- Sidebar navigation uses local state to filter the view (all / files only / pastes only / URLs / workspaces / folders).
- View mode (grid/list) persisted in localStorage.
- File upload reuses the same `ctx.addFile()` flow with a hidden `<input type="file">`.
- Drag-and-drop: the content area acts as a drop zone, calling `ctx.addFile()` for each dropped file.
- Sidebar "Workspaces" and "Folders" entries are derived from `ctx.contextItems.filter(i => i.source === "workspace" | "folder")`.
- The old `ContextMenu.tsx` component remains in the codebase but is no longer triggered from the search view.

### File Structure
```text
src/modules/explorer/
  pages/
    FileExplorerPage.tsx      ← Main app (sidebar + toolbar + content)
  components/
    FileCard.tsx               ← Grid/list item rendering
    ExplorerSidebar.tsx        ← Left sidebar with categories
    ExplorerToolbar.tsx        ← Top bar with view toggles + actions
  lib/
    file-icons.ts              ← MIME → icon mapping
```

