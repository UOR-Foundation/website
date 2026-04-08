

# Golden Ratio Search Page — Crisp, Confident Layout

## What changes

Restructure the homepage empty state to use the full viewport with true golden ratio positioning, placing elements with mathematical precision and pushing the tagline to the bottom of the screen.

## Layout — Golden Ratio Vertical Distribution

The viewport is split using φ (0.618). The title sits at the golden section point (~38% from top), the search bar follows with φ-proportioned gaps, buttons below that, and the tagline anchors to the bottom of the viewport.

```text
┌─────────────────────────────────┐
│                                 │
│          38.2% of vh            │
│                                 │
│   UOR SEMANTIC WEB SEARCH       │  ← at golden section point
│                                 │
│        [ search bar ]           │  ← gap = title size × φ
│                                 │
│    [UOR Search] [Surprise Me]   │  ← gap = bar height × φ
│                                 │
│                                 │
│                                 │
│  Searching a near-infinite      │  ← pinned near bottom
│       address space.            │
└─────────────────────────────────┘
```

## Changes — Single file: `src/modules/oracle/pages/ResolvePage.tsx`

### 1. Restructure empty state layout
- Switch from `flex justify-center` (vertically centered) to a `relative` container filling `100dvh`
- Position the content group (title + search + buttons) using `paddingTop: 38.2vh` (golden section from top)
- Position the tagline absolutely at `bottom: 6vh`, centered, so it floats near the page bottom

### 2. Increase title confidence
- Bump font size to `clamp(2.6rem, 5.5vw, 4rem)` — larger, bolder
- Change to `font-bold` (from `font-semibold`)
- Tighten letter-spacing to `0.025em` for a crisper feel

### 3. Refine search bar
- Increase max-width to `min(720px, 85vw)` for better screen fill
- Keep input height and padding as-is (already generous at `py-[18px]`)

### 4. Button spacing
- Gap between search bar and buttons: `calc(button-height × 0.618)` ≈ `1.85rem`

### 5. Tagline at bottom
- Remove inline `marginTop` from the tagline `<p>`
- Position it absolutely at `bottom: 6vh` with `left: 0; right: 0; text-align: center`
- Slightly reduce opacity for a whisper-quiet footer feel

| File | Change |
|------|--------|
| `src/modules/oracle/pages/ResolvePage.tsx` | Restructure empty state: golden-section vertical positioning, tagline pinned near bottom, bolder title, wider search bar |

