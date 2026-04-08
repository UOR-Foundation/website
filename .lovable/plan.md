

## Add Immersive Mode Toggle on Mobile

### Current State
The immersive mode toggle ("Immersive" button + `ImmersiveSearchView`) only appears in the desktop branch of the search view (line 1484+). The mobile branch (lines ~1420-1482) skips straight to the mobile layout with no way to enter immersive mode.

### Changes

#### 1. `ResolvePage.tsx` — Enable immersive mode for mobile

Restructure the mobile search branch so that when `immersiveMode` is true, it renders `ImmersiveSearchView` (same as desktop) instead of the mobile layout. The immersive view is already fully responsive and works well on mobile.

Add a small immersive toggle button to the mobile top bar (next to the identity shield button). Use the `Maximize2` icon — compact, no label, just the icon to save space.

```
Mobile top bar: [☰ Menu]   [UOR logo]   [⛶ Immersive] [🛡 Identity]
```

The toggle calls the same `setImmersiveMode(true)` + `requestFullscreen()` logic already used on desktop.

#### 2. `ImmersiveSearchView.tsx` — Mobile-friendly adjustments

The component already uses responsive `clamp()` values for typography and `env(safe-area-inset)` isn't needed since it's fullscreen. No changes needed — it works on mobile as-is.

#### 3. Fullscreen on mobile

Note: `requestFullscreen()` works on Android Chrome but is not supported on iOS Safari. The call already has `.catch(() => {})` so it gracefully degrades — on iOS the immersive view still renders fullscreen via `fixed inset-0` CSS, just without hiding the browser chrome.

### Files Changed

| File | Change |
|------|--------|
| `ResolvePage.tsx` | Add immersive toggle icon to mobile top bar; render `ImmersiveSearchView` when `immersiveMode && isMobile` |

