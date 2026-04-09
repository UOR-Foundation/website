

## Plan: Tab Drag-Reorder, Pin/Unpin, Merge, and Snap Grid Presets

### Overview
Add four capabilities to the desktop OS: (1) drag-to-reorder tabs, (2) pin/unpin tabs, (3) merge multiple tabs into one grouped tab, and (4) a snap layout picker for arranging windows in preset grids (2-up, 4-up, 6-up).

### Changes

**1. Drag-to-reorder tabs** — `TabBar.tsx`, `useWindowManager.ts`

- Add `onReorderWindows(fromIndex, toIndex)` to the window manager that reorders the `windows` array and persists it
- In `TabBar.tsx`, add pointer-based drag handling on each tab:
  - `onPointerDown` starts tracking; after 4px movement threshold, enter drag mode
  - During drag, show a translucent ghost tab following the cursor and a drop indicator line between tabs
  - On drop, call `onReorderWindows` to move the tab to the new position
- No external drag library needed — pure pointer events with `setPointerCapture`

**2. Pin/unpin tabs** — `TabBar.tsx`, `useWindowManager.ts`

- Add `pinned: boolean` field to `WindowState` (default `false`)
- Add `togglePin(id)` to the window manager
- Pinned tabs render first (left side), are narrower (icon-only, ~38px wide, no close button), and cannot be reordered past other pinned tabs
- Right-click context menu on each tab with "Pin Tab" / "Unpin Tab" option (using existing `DropdownMenu` components)
- Pinned tabs show a subtle dot indicator instead of the close X

**3. Merge tabs** — `TabBar.tsx`, `useWindowManager.ts`

- Add a "Merge Tabs" option to the tab right-click context menu (only when 2+ tabs are open)
- Merging creates a new "split" window state: `merged: string[]` field holding child window IDs
- The merged window renders a tabbed sub-navigation inside the window content area, letting users switch between the merged apps without separate OS-level tabs
- Add "Unmerge" option to split them back into individual tabs
- Visually, merged tabs show a stacked-pages icon badge

**4. Snap layout picker** — New `SnapLayoutPicker.tsx`, `useWindowManager.ts`, `DesktopShell.tsx`

- Add a small grid icon button in the TabBar (next to the `+` button) that opens a popover with visual snap layout presets:
  - **Full**: 1 window maximized
  - **Side by side**: 2 windows, 50/50 horizontal split
  - **3-column**: 1 large + 2 stacked right
  - **2×2 grid**: 4 equal quadrants
  - **3×2 grid**: 6 equal cells
- Each preset is a clickable mini-diagram (tiny rectangles showing the layout)
- Clicking a preset auto-snaps the first N visible windows into those positions; remaining windows are minimized
- Add `snapMultiple(assignments: { id: string; zone: SnapZone }[])` to the window manager for batch snapping
- The popover uses existing `DropdownMenu` styling for theme consistency

### Files Modified

- `src/modules/desktop/hooks/useWindowManager.ts` — add `reorderWindows`, `togglePin`, `snapMultiple`, `pinned` field
- `src/modules/desktop/TabBar.tsx` — drag-reorder logic, pin rendering, right-click context menu, snap layout button
- `src/modules/desktop/SnapLayoutPicker.tsx` — new popover with visual layout presets
- `src/modules/desktop/DesktopShell.tsx` — wire new props through to TabBar

### Technical Details

- Drag reorder uses `onPointerDown/Move/Up` with `setPointerCapture` — same pattern already used in `DesktopWindow.tsx` for window dragging
- Tab context menu uses the existing `DropdownMenu` primitives from `@/modules/core/ui/dropdown-menu`
- Snap presets are defined as arrays of `SnapZone` objects, reusing the existing `snapZoneToRect` conversion
- The `pinned` field is persisted to localStorage alongside other window state
- Merged tabs store child IDs and render a lightweight internal tab switcher — the child windows are hidden from the main tab bar

