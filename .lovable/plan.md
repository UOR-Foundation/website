

# SpaceX-Aligned Navbar & Hero Refinements

## Current Issues (from screenshot vs SpaceX reference)

1. **Navbar layout is three-column** (logo | centered nav | right cluster) — SpaceX has logo + nav links **flowing together on the left**, with right-side items on the far right
2. **No top margin** — navbar sits flush against the top edge; SpaceX has ~12-16px of breathing room
3. **Hero headline breaks to 5 lines** on large screens — "YOUR UNIVERSAL / COORDINATE / SYSTEM / FOR / INFORMATION" should be 3 lines max like the current `<br>` tags intend, but the font size relative to `max-w-[680px]` is causing extra wraps
4. **Hero horizontal padding** could be more generous on large screens to match SpaceX's ~5% inset

## Plan

### 1. Navbar — Left-Aligned Nav Links + Top Breathing Room

**File:** `src/modules/core/components/Navbar.tsx`

- **Layout change**: Replace `justify-between` (3-column) with a left group (logo + nav) and right group (social + donate), using `justify-between` on just those two groups
- **Nav links sit directly after logo** with a gap of ~2-3rem, flowing naturally left-to-right like SpaceX
- **Add top padding**: `pt-3 md:pt-4` on the header inner container to create breathing room between the top of the viewport and the navbar content
- **Slightly increase nav link size**: bump the clamp max from 14px to 15px for better readability at this viewport

### 2. Hero Section — Tighter Text Block + Better Margins

**File:** `src/modules/landing/components/HeroSection.tsx`

- **Increase max-width on headline** from `680px` to `800px` so the 3 explicit `<br>` breaks are respected without extra wrapping at large sizes
- **Increase horizontal padding** on large screens: `lg:px-14` → `lg:px-[5%] xl:px-[6%]` for proportional edge spacing
- **Galaxy positioning**: add slightly more right margin clearance — `mr-[-4%]` → `mr-[-2%]` so it doesn't feel like it's falling off the edge

## Files Modified

| File | Change |
|------|--------|
| `Navbar.tsx` | Left-align nav links next to logo, add top breathing room, bump font size |
| `HeroSection.tsx` | Widen headline max-width, increase horizontal padding, adjust galaxy margin |

