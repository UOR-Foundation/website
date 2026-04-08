

# Desktop OS Shell — Browser-Based Operating System Experience

## Vision

Transform the existing immersive search view into a full macOS-inspired desktop operating system delivered entirely in the browser. The solar-aware wallpaper, clock, and search bar become the desktop foundation. Existing pages (Oracle, Search, Library, Messenger, etc.) render inside draggable, resizable windows instead of full-page routes. A dock at the bottom and a top menu bar complete the OS metaphor.

## Architecture

```text
┌──────────────────────────────────────────────┐
│  DesktopMenuBar (top)                        │
│  ── Logo · App Name · Clock · Wi-Fi · User ──│
├──────────────────────────────────────────────┤
│                                              │
│         Solar Wallpaper (full viewport)       │
│                                              │
│    ┌─────────────┐   ┌─────────────┐         │
│    │  Window:     │   │  Window:    │         │
│    │  Oracle      │   │  Library    │         │
│    │  (draggable) │   │  (draggable)│         │
│    └─────────────┘   └─────────────┘         │
│                                              │
│    Desktop Widgets (clock, quote, weather)    │
│                                              │
├──────────────────────────────────────────────┤
│  DesktopDock (bottom, centered)              │
│  ── Search · Oracle · Library · Messenger ── │
└──────────────────────────────────────────────┘
```

## Implementation Steps

### 1. Create the Desktop Shell (`src/modules/desktop/`)

**`DesktopShell.tsx`** — The root layout component that replaces the current `Layout.tsx` for the `/desktop` route (or becomes the new default for `/search`).

- Full-viewport container with the existing solar wallpaper (`ImmersiveBackground`)
- Renders three layers: MenuBar (top), Windows (middle), Dock (bottom)
- Manages window state: which apps are open, positions, z-order, minimized/maximized

**`useWindowManager.ts`** — Hook to manage window state:
- `openWindows: Array<{ id, appId, title, position, size, zIndex, minimized, maximized }>`
- `openApp(appId)`, `closeApp(id)`, `focusWindow(id)`, `minimizeWindow(id)`, `maximizeWindow(id)`
- `moveWindow(id, pos)`, `resizeWindow(id, size)`
- Persists layout to localStorage

### 2. Create the Menu Bar (`DesktopMenuBar.tsx`)

Inspired by macOS top bar:
- Left: UOR logo + active app name
- Center: (empty, clean)
- Right: SoundCloud status icon, Wi-Fi icon, clock (HH:MM Day Month Date), user avatar/identity button

Frosted glass aesthetic: `bg-black/40 backdrop-blur-2xl border-b border-white/10`

### 3. Create the Dock (`DesktopDock.tsx`)

macOS-style bottom dock with magnification on hover:
- Icons for: Search, Oracle, Library, Messenger, Vault, Settings
- Each icon is a 48px rounded square with app icon and label on hover
- Clicking opens the app in a new window (or focuses existing)
- Minimized apps show a dot indicator below
- CSS magnification effect: icons scale up when hovered (neighbors also grow slightly)
- Frosted glass pill: `rounded-2xl bg-black/30 backdrop-blur-xl border border-white/15`

### 4. Create the Window Component (`DesktopWindow.tsx`)

Draggable, resizable window inspired by macOS:
- Title bar with traffic-light buttons (close=red, minimize=yellow, maximize=green)
- Draggable via title bar (using pointer events, not a library)
- Resizable via corner/edge handles
- Content area renders the app component
- Double-click title bar to maximize/restore
- Smooth open/close animations (scale + opacity via framer-motion)
- Frosted glass chrome: `bg-black/60 backdrop-blur-2xl rounded-xl border border-white/12`
- Active window has brighter border, inactive dims slightly

### 5. Register Desktop Apps

Each existing feature becomes a "desktop app" with an icon and component:

| App ID | Label | Icon | Component |
|--------|-------|------|-----------|
| search | Search | Search icon | Existing search input + results (extracted from ResolvePage) |
| oracle | Oracle | Sparkles | OraclePage content (chat interface) |
| library | Library | BookOpen | LibraryPage content |
| messenger | Messenger | MessageCircle | MessengerPage content |
| vault | Vault | Shield | VaultContextPicker (full view) |
| settings | Settings | Settings | Preferences panel (theme, wallpaper, sound) |
| music | Music | Music | SoundCloud player (expanded) |

### 6. Desktop Widgets Layer

Floating widgets on the desktop (when no window is focused/maximized):
- **Clock widget**: Large time display (already exists in ImmersiveSearchView)
- **Quote widget**: Rotating quotes (already exists as ImmersiveQuote)
- **Search spotlight**: Centered search bar that opens the Search app on submit
- Widgets fade when a maximized window is active

### 7. Route Integration

- Add `/desktop` route in `App.tsx` that renders `DesktopShell`
- The existing immersive search view on `/search` gains a "Desktop mode" button
- Desktop mode persists via localStorage preference
- Each app window uses the existing page component but without Layout wrapper (no navbar/footer)

### 8. Spotlight Search (Cmd+K / Click search in dock)

- Overlay search bar (like macOS Spotlight) that appears centered
- Searches across all app content
- Results open in the appropriate app window
- Reuses the existing search infrastructure

## Technical Details

- **Drag**: Pure pointer-event-based dragging (no external library) — `onPointerDown` captures offset, `onPointerMove` updates position, `onPointerUp` releases
- **Resize**: Corner handles with `cursor: nwse-resize`, min-size constraints (400x300)
- **Z-order**: Global counter incremented on focus; highest z-index = active window
- **Dock magnification**: CSS `transform: scale()` with neighbor scaling via sibling selectors or computed in React
- **Animations**: framer-motion for window open/close, dock hover effects via CSS transitions for performance
- **Mobile**: On mobile viewports, the dock becomes a bottom tab bar and windows become full-screen sheets (no drag/resize)
- **Wallpaper**: Reuses existing `ImmersiveBackground` with solar-phase photos

## Files to Create

1. `src/modules/desktop/DesktopShell.tsx`
2. `src/modules/desktop/DesktopMenuBar.tsx`
3. `src/modules/desktop/DesktopDock.tsx`
4. `src/modules/desktop/DesktopWindow.tsx`
5. `src/modules/desktop/DesktopWidgets.tsx`
6. `src/modules/desktop/hooks/useWindowManager.ts`
7. `src/modules/desktop/lib/desktop-apps.ts` (app registry)
8. `src/modules/desktop/desktop.css` (dock magnification, window chrome)

## Files to Modify

1. `src/App.tsx` — add `/desktop` route
2. `src/modules/oracle/pages/ResolvePage.tsx` — add "Desktop mode" toggle that redirects to `/desktop`

