

## Plan: OS-Style Home Menu

### Vision
Replace the current minimal 3-item dropdown (About, Appearance, Hide All) with a full, visually rich OS application launcher — similar to macOS Launchpad or Windows Start Menu. It opens from the Home icon and presents all apps organized by OS taxonomy category, plus system utilities (Appearance, About, keyboard shortcuts).

### Design
A wide popover panel (~400px) with:
- **Header**: "UOR OS" branding with version label
- **App Grid**: Apps grouped by their `OsCategory` (Resolve, Identity, Exchange, Structure), each section showing a subtle category label. Each app is an icon + label button (like macOS Launchpad tiles)
- **System section** at the bottom separated by a divider:
  - Appearance submenu (Immersive / Dark / Light)
  - Hide All Windows
  - Keyboard Shortcuts reference
  - About UOR OS (disabled placeholder)
- Fully theme-aware (light/dark/immersive)

### Changes

**File: `src/modules/desktop/TabBar.tsx`**

Replace the current Home `DropdownMenuContent` (lines 181-203) with a richer panel:

1. Import `DESKTOP_APPS` and `OS_TAXONOMY`, `getUserFacingCategories` from taxonomy
2. Group visible (non-hidden) apps by their category using the taxonomy
3. Render each category group with a small label heading and a grid of app buttons (icon + name)
4. Each app button calls `onOpenApp(app.id)` and closes the menu
5. Below the app grid, add a separator and system items:
   - Appearance submenu (existing, keep as-is)
   - Hide All Windows
   - About UOR OS
6. Style: `min-w-[340px]`, frosted glass background matching theme, rounded-xl, app icons at 36x36 with their accent `color`

No new files needed — all changes are within `TabBar.tsx`, leveraging existing `DESKTOP_APPS`, `OS_TAXONOMY`, and the `onOpenApp` prop already wired through from `DesktopShell`.

### Technical Details
- `DESKTOP_APPS.filter(a => !a.hidden)` gives the visible apps
- `OS_TAXONOMY[category]` gives category labels
- App icon colors use the existing `app.color` field for a vibrant launcher feel
- Grid: `grid-cols-3` with each cell being a centered icon + label column
- Keyboard shortcut hints: `⌘K` for Search, `⌘W` for Close, `⌘H` for Hide

