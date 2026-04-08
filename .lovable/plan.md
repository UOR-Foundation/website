
# Desktop Theme Switcher — Three Dots

## Overview

Add three small dots at the bottom of the desktop (between dock and screen edge) that toggle between three themes: Immersive (photo background), Dark (solid dark), and Light (solid white). All shell components adapt their colors accordingly.

## Implementation

### 1. Theme Context — `src/modules/desktop/hooks/useDesktopTheme.ts`

Create a React context + hook that stores the current theme in localStorage and provides it to all desktop components.

- Three themes: `"immersive"` | `"dark"` | `"light"`
- Persisted in `localStorage("uor:desktop-theme")`
- Provides `{ theme, setTheme }` via context
- Default: `"immersive"`

### 2. Theme Dots Component — `src/modules/desktop/DesktopThemeDots.tsx`

Three small dots rendered just above the dock. The active dot is slightly larger/brighter. Clicking a dot switches theme. Each dot has a subtle visual identity:
- Dot 1 (immersive): gradient fill suggesting a photo
- Dot 2 (dark): solid dark fill
- Dot 3 (light): solid white fill with dark border

Positioned fixed at the bottom, centered, just above the dock (~`bottom-[72px]`). Minimal and elegant.

### 3. Shell Integration — Modify `DesktopShell.tsx`

- Wrap the shell in the theme provider
- Conditionally render `ImmersiveBackground` only when theme is `"immersive"`
- For `"dark"`: shell background becomes `bg-black` (already is)
- For `"light"`: shell background becomes `bg-white`
- Pass `theme` down to components that need color adaptation
- Render `DesktopThemeDots` above the dock

### 4. Component Adaptations

Each component reads the theme and adjusts colors:

**DesktopMenuBar** — 
- Immersive/dark: current dark glass style
- Light: `rgba(245,245,245,0.85)` background, dark text, dark icons

**DesktopDock** —
- Immersive/dark: current dark glass
- Light: `rgba(255,255,255,0.7)` background, dark icon colors, dark indicator dots

**DesktopWidgets** (clock + search) —
- Immersive/dark: white text, dark glass search bar
- Light: dark text (`text-black/75`), light glass search bar (`rgba(0,0,0,0.04)`)

**DesktopWindow** —
- Immersive/dark: current dark chrome
- Light: `rgba(245,245,245,0.92)` chrome, dark title text, light content bg (`#f5f5f5`)

**SpotlightSearch** —
- Immersive/dark: current dark glass
- Light: white glass panel, dark text

**DesktopContextMenu** —
- Same pattern as Spotlight

**SnapOverlay** —
- Light: `rgba(0,0,0,0.06)` instead of `rgba(255,255,255,0.06)`

## Files to Create
1. `src/modules/desktop/hooks/useDesktopTheme.ts` — context + hook
2. `src/modules/desktop/DesktopThemeDots.tsx` — the three dots UI

## Files to Modify
1. `src/modules/desktop/DesktopShell.tsx` — provider, conditional background, pass theme
2. `src/modules/desktop/DesktopMenuBar.tsx` — theme-aware colors
3. `src/modules/desktop/DesktopDock.tsx` — theme-aware colors
4. `src/modules/desktop/DesktopWidgets.tsx` — theme-aware colors
5. `src/modules/desktop/DesktopWindow.tsx` — theme-aware colors
6. `src/modules/desktop/SpotlightSearch.tsx` — theme-aware colors
7. `src/modules/desktop/DesktopContextMenu.tsx` — theme-aware colors
8. `src/modules/desktop/SnapOverlay.tsx` — theme-aware colors
