

## Immersive Mobile: Full-Screen Streamed Web Experience

### Problem

Looking at the screenshot, the mobile immersive reader has:
1. **Persistent toolbar** with triword + badge eating vertical space
2. **Constrained content container** (`max-w-[1100px] mx-auto px-4 sm:px-6`) inside another wrapper with `maxWidth: clamp(640px, 65vw, 860px)` and `clamp(1.5rem, 4vw, 4rem)` side padding
3. **Visible container chrome** — `bg-white/[0.04]` border-x, border-b, rounded corners — making it feel "boxed"
4. **Mobile result header** (hamburger + search bar + identity icon) always showing even in immersive mode
5. Content doesn't breathe or fill the viewport

### Changes

#### 1. Auto-Hiding Toolbar on Mobile Immersive
**File: `ReaderToolbar.tsx`**
- On mobile + immersive: toolbar starts visible, fades out after 2s of no interaction
- Tap anywhere to show it again (3s auto-hide)
- When hidden, show only a subtle top-edge swipe-down indicator (thin 40px semi-transparent pill)
- Reduce toolbar height: remove the KNOWLEDGECARD badge on mobile, show only back arrow + truncated triword

#### 2. Full-Bleed Mobile Content Container
**File: `ResolvePage.tsx`** (reader mode section, lines ~2030-2080)
- When `isMobile && immersiveMode`:
  - Remove the outer `profile-container max-w-[1100px] mx-auto px-4` wrapper constraints
  - Set content wrapper to `maxWidth: 100vw` with `px-5` (20px) side padding instead of `clamp(1.5rem, 4vw, 4rem)`
  - Remove `bg-white/[0.04]`, `border-x`, `border-b`, `rounded-b-2xl` container chrome — content floats directly on the immersive background
  - Remove `paddingTop: calc(1rem * 1.618 * 1.618)` — use `pt-3` for tighter top
- Hide the mobile result header bar (hamburger + search + identity) when in immersive mode — the reader toolbar handles navigation

#### 3. Edge-to-Edge Immersive Background
**File: `ResolvePage.tsx`**
- On mobile immersive, bypass the `profile-container` wrapper entirely for reader mode
- The reader content sits directly inside the full-screen flex container with the immersive background behind it
- Use `safe-area-inset-*` padding for notched devices

#### 4. Mobile-Optimized Article Typography
**File: `WikiArticleView.tsx` + lens renderers**
- On mobile immersive: reduce infobox width, make images full-bleed (negative margin trick)
- TOC section: collapsible by default on mobile (already `[hide]` in screenshot, make it start collapsed)
- Increase body text size slightly on mobile immersive (18px base) for better readability against photo backgrounds

#### 5. Floating Bottom Search on Mobile Immersive Reader
**File: `ResolvePage.tsx`**
- In immersive reader mode on mobile, add a small floating pill at the bottom: a compact search bar that expands on tap
- This replaces the hidden header search bar
- Uses the same `MobileSearchBar` component but with `position: fixed; bottom` and a collapsed state (just a search icon + "Search..." text)

#### 6. Scroll-Aware Immersive Effects
**File: `ResolvePage.tsx`**
- As user scrolls content, the immersive background parallax-shifts slightly (CSS `transform: translateY(calc(var(--scroll) * -0.1))`)
- The background blur increases from 24px to 32px as you scroll deeper into the article, making text more legible
- Thin ambient progress bar at top (already exists) — keep it

### Files Changed

| File | Change |
|------|--------|
| `ResolvePage.tsx` | Mobile immersive: full-bleed content, hide header bar, floating bottom search, scroll parallax |
| `ReaderToolbar.tsx` | Auto-hide on mobile immersive, compact mobile layout, swipe indicator |
| `WikiArticleView.tsx` | Mobile immersive typography tweaks, full-bleed images, collapsed TOC |
| `ImmersiveBackground.tsx` | Accept scroll offset prop for parallax, dynamic blur |
| `MobileSearchBar.tsx` | Add collapsible variant for immersive reader overlay |

