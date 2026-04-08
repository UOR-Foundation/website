

# Make `/search` the Desktop — Perplexity-Crisp Home Experience

## Vision

The `/search` route becomes the primary desktop experience. Instead of a separate `/desktop` route, the search page **is** the OS home screen. The existing `ImmersiveSearchView` transforms into a Perplexity-inspired clean home with the solar wallpaper behind it, the dock at the bottom, and the menu bar at top. Searching opens results in a desktop window. The `/desktop` route redirects to `/search`.

## What Changes

### 1. Merge Desktop Shell into Search (`ResolvePage.tsx`)

When the user is on the **home state** (no query active), render the desktop shell directly:
- Solar wallpaper background (already there via `ImmersiveBackground`)
- Top menu bar (`DesktopMenuBar`)
- Centered Perplexity-style search area (clock + greeting + clean search bar)
- Bottom dock (`DesktopDock`)
- Windows layer for any open apps

When a search is submitted, it opens in a **desktop window** (Search app) rather than replacing the whole page. The home view stays underneath.

### 2. Redesign Home Search to Perplexity Style (`DesktopWidgets.tsx`)

Replace the current clock+quote widget with a Perplexity-inspired home:
- **Clock**: Keep the large elegant clock, slightly smaller
- **Greeting**: Clean, crisp `"Good afternoon"` text
- **Search bar**: Ultra-clean, Perplexity-style — thin `border-white/[0.08]`, `bg-white/[0.04]`, rounded-2xl (not pill), generous padding, placeholder "Ask anything..."
- **Context `+` button** inline in the search bar (reuse existing `ContextMenu`)
- **Quick actions row** below search: subtle chips for "New Thread", "Library", "Oracle"
- **Quote**: Smaller, more subdued below everything
- On submit → calls `wm.openApp("search", query)` to open Search in a window

### 3. Refine Dock Styling (`DesktopDock.tsx`)

Make it Perplexity-crisp:
- Monochrome icons on subtle `bg-white/[0.06]` tiles (remove colored gradients)
- Hover: `bg-white/[0.12]` fill, no color
- Thinner dock border: `border-white/[0.06]`
- More subtle background: `bg-black/40 backdrop-blur-3xl`

### 4. Refine Window Chrome (`DesktopWindow.tsx` + `desktop.css`)

- Darker frosted glass: `bg-[#1a1a1a]/85`
- Thinner borders: `border-white/[0.06]`
- Content area: solid `bg-[#191919]` for crisp Perplexity-dark inside
- Slightly brighter title text for active windows

### 5. Refine Menu Bar (`DesktopMenuBar.tsx`)

- Slimmer, crisper
- Thinner border: `border-white/[0.06]`

### 6. Route Changes (`App.tsx`)

- `/search` renders `DesktopShell` (which includes the home search + windows + dock)
- `/desktop` redirects to `/search`
- The old `ResolvePage` search logic gets loaded **inside** a desktop window when search is triggered

### 7. Wire Search Submission to Window

Update `DesktopShell.tsx`:
- Add a `handleHomeSearch(query)` callback
- Pass it to `DesktopWidgets`
- On submit, call `wm.openApp("search", query)` — this opens ResolvePage in a window with the query pre-filled
- Add query passing to `useWindowManager` (optional initial data per window)

## Files to Modify

1. **`src/modules/desktop/DesktopShell.tsx`** — add home search handler, become the `/search` page
2. **`src/modules/desktop/DesktopWidgets.tsx`** — redesign as Perplexity-style home with search bar, greeting, quick actions
3. **`src/modules/desktop/DesktopDock.tsx`** — monochrome, crisper styling
4. **`src/modules/desktop/DesktopWindow.tsx`** — darker, crisper chrome
5. **`src/modules/desktop/DesktopMenuBar.tsx`** — slimmer, refined
6. **`src/modules/desktop/desktop.css`** — updated window/dock styles
7. **`src/App.tsx`** — `/search` → DesktopShell, `/desktop` → redirect

## Technical Notes

- The existing `ImmersiveSearchView` remains available but is superseded by the desktop home for the `/search` route
- `useWindowManager.openApp` gains an optional `initialData` parameter so search queries can be passed into the Search window
- Mobile detection (`useIsMobile`) will keep the current mobile search experience unchanged — desktop shell is desktop-only

