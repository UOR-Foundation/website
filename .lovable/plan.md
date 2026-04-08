

# Chrome-Style Tab Bar for UOR OS

## Overview

Replace the current macOS-style menu bar with a Chrome-inspired tab bar. Each open window becomes a tab in the top bar, making the OS feel browser-native rather than an Apple clone. The menu bar's dropdowns (UOR, Window) move into a compact area, and the window title bars are removed since the tab bar serves that purpose.

## Visual Design

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ⬡  │ ◇ Search  │ ✧ Oracle  │ 📖 Library  │  +  │         🔍  📶  8:21 PM │
│     ╰──────────╯╰──────────╯╰────────────╯     │                        │
├──────────────────────────────────────────────────────────────────────────┤
│  ← → ⟳  │  search query or app context here...                    ⭐  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Row 1 — Tab strip:** UOR logo/menu on the left, then curved Chrome-style tabs for each open window (with app icon + title + close X), a "+" new tab button, and clock/status icons on the right.

**Row 2 — Address/context bar:** Shows context for the active tab (search query, page title, breadcrumb). Optional — adds to the browser feel.

## Key Behaviors

- **Clicking a tab** focuses that window and brings it to front
- **Clicking the X on a tab** closes that window
- **Active tab** is visually connected to the content area below (lighter background, no bottom border — like Chrome)
- **Dragging tabs** reorders them (future enhancement, not in v1)
- **"+" button** opens Spotlight/app picker to launch a new app
- **Minimized windows** show as dimmed/faded tabs
- **Double-clicking empty tab bar area** could open a new search tab

## Technical Changes

### 1. Create `src/modules/desktop/TabBar.tsx`
- New component replacing `DesktopMenuBar`
- Height: ~38px (tab strip) — slightly taller than current 28px menu bar
- Renders:
  - Left: UOR logo button (dropdown menu for Appearance, Hide All, About)
  - Center: Tabs for each `WindowState` in `windows` array — each tab shows the app icon + `win.title` + close button
  - Right: Search icon (Spotlight), Wi-Fi, clock
- Tab styling: Chrome-like curved/trapezoid shape using CSS border-radius or SVG clip paths, with the active tab blending into the content below
- Theme-aware (light/dark/immersive) using `useDesktopTheme`
- Props: same interface as current `DesktopMenuBar` plus `onFocusWindow(id)`

### 2. Modify `src/modules/desktop/DesktopWindow.tsx`
- Remove the title bar (the 40px header with traffic lights and title) since tabs now serve this purpose
- Window content starts from the top of the window frame
- Keep resize handles and drag behavior (drag from window edges or a thin top strip)
- When maximized, window fills below tab bar instead of below old menu bar

### 3. Modify `src/modules/desktop/DesktopShell.tsx`
- Replace `<DesktopMenuBar>` with `<TabBar>`
- Pass `onFocusWindow` handler to `TabBar`
- Update `MENU_BAR_H` constant references to new tab bar height (~38px)

### 4. Update `src/modules/desktop/hooks/useWindowManager.ts`
- Update `MENU_BAR_H` constant from 28 to 38
- Everything else stays the same

### 5. Update `src/modules/desktop/desktop.css`
- Add Chrome-style tab CSS: curved tab shapes, active tab highlight, hover effects, close button transitions
- Remove traffic light CSS (no longer needed in window chrome)

## What Stays the Same
- Dock at the bottom (unchanged)
- Window snapping, resizing, and dragging
- Spotlight search (triggered by "+" or ⌘K)
- Theme system
- Mobile shell (unchanged)

