

## Plan: Polish File Explorer — Sovereign Space Experience

### What Changes

**1. Increase all text sizes across the explorer**

- **Sidebar** (`ExplorerSidebar.tsx`): Section labels from `10px` → `11px`, nav items from `13px` → `14px`, counts from `10px` → `11px`, storage text from `11px`/`10px` → `12px`/`11px`, sidebar width from `180px` → `200px`
- **Toolbar** (`ExplorerToolbar.tsx`): Breadcrumb from `xs`/`sm` → `sm`/`base`, search input from `xs` → `sm` with `h-8`, button text from `xs` → `sm` with `h-8`, icon sizes from `3.5` → `4`
- **FileCard** (`FileCard.tsx`): Grid filename from `xs` → `sm`, badge from `9px` → `10px`, grid icon from `w-14 h-14` → `w-16 h-16`; List filename from `sm` → `base`, badge from `10px` → `11px`
- **Status bar** (`FileExplorerPage.tsx`): From `11px` → `12px`, list header from `10px` → `11px`
- **Empty state**: Title from `sm` → `base`, subtitle from `xs` → `sm`

**2. Add sovereign space identity and trust signals**

- **Sidebar header**: Add a "My Space" or "Your Vault" header at the top of the sidebar with a shield/lock icon, reinforcing private sovereign ownership
- **Storage section**: Replace generic "Session storage" / "Cloud vault" with more intentional labels: "Local · Session Only" vs "Sovereign Vault · Encrypted" with a shield icon for vault, and a subtle privacy reassurance line ("Your files. Your control.")
- **Status bar**: Replace "Session · files cleared on refresh" with "Local session · not synced" and "Synced to vault" with "Sovereign Vault · encrypted & synced" using a small lock icon

**3. Improve empty state to feel welcoming and purposeful**

- Larger drop zone with a warmer message: "This is your private space" as the headline, "Drop files or click to upload — everything here stays yours" as subtitle
- Add quick-action chips below the drop zone: "Upload Files", "Paste Text", "Import URL" as distinct entry points so users immediately see all their options
- Larger icon (w-20 h-20) with a subtle animated pulse on hover

**4. Enhance the "New Folder" prompt**

- Replace `window.prompt()` with an inline editable field or a small dialog — more polished than a browser prompt. Use a simple inline text input that appears in the toolbar area when clicked.

**5. Visual refinements for sovereignty feel**

- Add a subtle top-border accent on the sidebar header using `border-primary/20`
- Ensure the grid cards have slightly more padding and breathing room (minmax from `110px` → `130px`)
- Drop overlay: increase icon size, add "Your files stay private" reassurance text

### Files Modified

- `src/modules/explorer/components/ExplorerSidebar.tsx` — larger text, sovereign header, trust labels
- `src/modules/explorer/components/ExplorerToolbar.tsx` — larger controls, inline folder name input
- `src/modules/explorer/components/FileCard.tsx` — larger text and icons
- `src/modules/explorer/pages/FileExplorerPage.tsx` — larger status bar, improved empty state with quick actions, inline new-folder state

