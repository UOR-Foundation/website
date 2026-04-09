

## Plan: Mobile PWA Lock Screen Redesign

### What We Are Building

A clean, minimal mobile home screen matching the reference image: just the DayRingClock centered in the upper third, a solid/immersive background, and two small corner icons at the bottom (menu left, search right). No dock, no app grid, no greeting text, no search bar on the home screen. Apps and search open via bottom-sheet drawers triggered by these two icons. Three theme modes (immersive wallpaper, dark, light) carry over from desktop.

### Architecture

```text
┌──────────────────────────┐
│                          │
│       DayRingClock       │  ← centered upper area
│       19:41 / Apr 9      │
│                          │
│                          │
│                          │
│                          │
│                          │
│                          │
│  ☰ (menu)    🔍 (search) │  ← two subtle icons, bottom corners
│         ···              │  ← theme dots (centered, just above safe area)
└──────────────────────────┘
```

### Changes

**1. Rewrite `src/modules/desktop/MobileShell.tsx`**

- Remove the full dock with all app icons
- Render the immersive wallpaper (`DesktopImmersiveWallpaper`) when theme is `"immersive"`, solid black for dark, solid white for light
- Render `DayRingClock` centered in the upper third (matching the reference — roughly 15-20% from top)
- Bottom-left icon: a minimal menu icon (lucide `Menu` or custom hamburger). Tapping opens a bottom-sheet drawer listing all apps in a clean grid
- Bottom-right icon: a search icon (lucide `Search`). Tapping opens a bottom-sheet drawer with the search input, voice input, and suggestions (reusing logic from `DesktopWidgets`)
- Keep `DesktopThemeDots` centered at the bottom, between the two icons
- Keep the existing `Drawer` pattern for opening apps
- Add a second drawer state for the menu, showing apps in a 3-column grid with icons and labels
- Style both corner icons as very subtle, low-opacity (matching the reference — thin white strokes on dark, thin black on light)
- Home indicator bar hint at very bottom (thin rounded bar, like iOS)

**2. No changes to `DesktopWidgets.tsx`**

The search logic (suggestions, voice, context) will be extracted into the search drawer within MobileShell directly, keeping DesktopWidgets as the desktop-only home screen.

**3. Keep existing components unchanged**

- `DayRingClock` — reused as-is
- `DesktopImmersiveWallpaper` — reused for immersive mode
- `DesktopThemeDots` — reused, already handles mobile positioning
- `DesktopShell` — no changes (already delegates to MobileShell on mobile)

### Technical Details

- The menu drawer shows non-hidden `DESKTOP_APPS` in a clean grid (3 columns, icon + label)
- The search drawer contains an auto-focused input, voice button, submit button, and suggestion dropdown — all styled with the same frosted-glass treatment from desktop but adapted for mobile
- Immersive mode renders `DesktopImmersiveWallpaper` behind the clock with the existing overlay gradients
- Touch targets for corner icons are at least 44x44px for accessibility
- No PWA service worker changes needed (COI shim already handles that); this is purely a UI redesign
- The home indicator bar is a 134px wide, 5px tall rounded pill at the very bottom, matching the reference

### Files Modified
- `src/modules/desktop/MobileShell.tsx` — complete rewrite

