

# UOR OS — From Chat Interface to Living Operating System

## Philosophy

The current state has the bones of an OS (windows, dock, menu bar) but still *feels* like a web page. A real OS is defined by how it responds to you — keyboard shortcuts that just work, contextual menus that appear where you need them, a universal search that finds anything instantly, and transitions that feel physical. The goal is to make every interaction feel like the system already knows what you want.

Less is more. We remove the quote widget and the three quick-action buttons from the home view. The home screen becomes just the clock and the search bar — nothing else. Everything else is discoverable through the dock, Spotlight, or right-click. This is the "trust" part: the system doesn't overwhelm you with options. It waits.

## Changes

### 1. Spotlight Search (Cmd+K)

**New file: `src/modules/desktop/SpotlightSearch.tsx`**

A floating overlay triggered by Cmd+K (or clicking the search icon in the menu bar). Frosted glass panel centered on screen, ~480px wide. As you type, it shows:
- App matches (Search, Oracle, Library, Messenger, Vault) with icons
- Recent searches (from localStorage)
- Selecting an app opens it; selecting a search query opens the Search app with that query

This is the universal entry point. It replaces the quick-action chips entirely — those apps are now discoverable through Spotlight and the dock only.

### 2. Minimal Home View

**Modify: `DesktopWidgets.tsx`**

Strip to essentials:
- Clock (as-is, beautiful)
- Greeting text (as-is)
- Search bar (as-is, but with a subtle "⌘K" hint badge on the right instead of the `+` button)
- Remove the three quick-action buttons
- Remove the quote widget entirely

The home screen becomes a calm, empty canvas. Just time, a greeting, and a place to ask.

### 3. Desktop Context Menu (Right-Click)

**New file: `src/modules/desktop/DesktopContextMenu.tsx`**

Right-clicking the desktop wallpaper (not on a window or dock) shows a minimal context menu:
- "New Search" → focuses the home search bar
- "Spotlight" → opens Spotlight (Cmd+K)
- A divider
- "About UOR OS" → opens a small info window

Frosted glass, 3-4 items max, positioned at cursor. Clicking away dismisses.

### 4. Keyboard Shortcuts

**New file: `src/modules/desktop/hooks/useDesktopShortcuts.ts`**

Global keyboard handler integrated into `DesktopShell`:
- `Cmd+K` → Spotlight
- `Cmd+W` → Close active window
- `Cmd+M` → Minimize active window
- `Cmd+H` → Hide all windows (show desktop)
- `Escape` → Close Spotlight if open

These make the OS feel real. Every shortcut a user tries from muscle memory just works.

### 5. Menu Bar Enhancements

**Modify: `DesktopMenuBar.tsx`**

- Add a subtle search icon (magnifying glass) on the right side that opens Spotlight on click
- Show "⌘K" tooltip on hover
- The menu bar label changes from "Finder" to "Desktop" when no app is focused — this is UOR OS, not macOS

### 6. Window Improvements

**Modify: `DesktopWindow.tsx`**

- Add a subtle entrance animation that zooms from the dock icon position (approximated as bottom-center) rather than just scaling in from center — this creates spatial continuity
- Title bar: on double-click, maximize (already works). Add a subtle title fade when dragging.

### 7. Dock Polish

**Modify: `DesktopDock.tsx`**

- Add a subtle separator line before the last item (Vault) to visually group "apps" vs "system" — like macOS separates apps from Finder/Trash
- The dock bounce animation when an app finishes loading (a single subtle bounce on the icon)

## Files to Create
1. `src/modules/desktop/SpotlightSearch.tsx`
2. `src/modules/desktop/DesktopContextMenu.tsx`
3. `src/modules/desktop/hooks/useDesktopShortcuts.ts`

## Files to Modify
1. `src/modules/desktop/DesktopShell.tsx` — integrate Spotlight, context menu, shortcuts
2. `src/modules/desktop/DesktopWidgets.tsx` — strip to minimal (clock + search only)
3. `src/modules/desktop/DesktopMenuBar.tsx` — add search icon, rename "Finder" to "Desktop"
4. `src/modules/desktop/DesktopWindow.tsx` — bottom-center entrance animation
5. `src/modules/desktop/DesktopDock.tsx` — separator, bounce animation
6. `src/modules/desktop/desktop.css` — spotlight styles, context menu styles

## What This Achieves

The OS becomes discoverable through three natural patterns users already know:
1. **See it** → Dock (always visible, familiar)
2. **Search for it** → Spotlight (Cmd+K, universal)
3. **Ask for it** → Right-click (contextual)

The home screen becomes a place of calm — just time and a question. No buttons competing for attention. The system trusts the user to know what they want, and makes it effortless to get there.

