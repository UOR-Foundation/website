

# Replace Home Screen Clock with Circular Day-Progress Ring

## What Changes

Replace the current text-only clock (lines 264–302 in `DesktopWidgets.tsx`) with an SVG-based circular ring clock matching the uploaded design:

- **Time** centered in large font (HH:MM, 24h)
- **Date** below in smaller text (e.g. "Apr 9")
- **Circular arc** around the clock showing percentage of day elapsed (7:00 AM = 0%, 7:00 PM = 100%)
- Arc animates smoothly as time progresses
- Theme-aware (light/dark/immersive)

## Implementation

### 1. Create `src/modules/desktop/components/DayRingClock.tsx`

A self-contained component:

- SVG circle (stroke-dasharray/dashoffset technique) for the progress arc
- Computes day progress: `clamp((now - 7:00) / (19:00 - 7:00), 0, 1)`
  - Before 7 AM → 0%, after 7 PM → 100%
- Ring rendered as a ~280° arc (matching the screenshot's gap at bottom-left)
- Thin white/black stroke depending on theme
- Time and date rendered as centered text inside the SVG
- Updates every second via the `time` prop passed from parent
- Accepts `opacity` and theme props for consistency

### 2. Update `src/modules/desktop/DesktopWidgets.tsx`

- Import `DayRingClock`
- Replace lines 264–302 (the `<h1>` clock and greeting `<div>`) with `<DayRingClock time={time} theme={theme} isLight={isLight} opacity={clockOpacity} />`
- Keep the greeting text below the ring (repositioned with appropriate spacing)
- Remove unused `CLOCK_SIZES`, `clockStyle`, `clockShadow` variables and the `measureLineCount`/`FONTS` imports if no longer needed elsewhere

### Visual Spec (matching screenshot)

- Ring size: ~200px diameter
- Stroke width: ~2px, color white/70 (dark) or black/50 (light)
- Gap in ring: starts at ~210° (bottom-left), arc sweeps clockwise
- Time: ~40px font, extralight, centered
- Date: ~16px font, muted opacity, below time

