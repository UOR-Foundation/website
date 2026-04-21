

## Hero Section — Confident Scale on Large Screens (SpaceX-inspired)

At 1901px the current hero feels timid: title caps at ~7rem but the orb dominates the right half, the stats row sits cramped at the bottom, and the navigation feels small relative to the canvas. SpaceX's approach: **oversized confident type, generous negative space, edge-to-edge composition, large nav, and breathing room between every element.**

We'll lift the entire composition without changing structure.

### Changes

**1. Navigation — `Navigation.tsx`** (presence on large screens)
- Logo wordmark: scale to `text-[clamp(13px, 0.9vw, 17px)]` (currently fixed small).
- Nav links: scale to `text-[clamp(11px, 0.78vw, 14px)]`, increase gap to `gap-10 lg:gap-14 xl:gap-16`.
- Header padding: `py-6 lg:py-7 xl:py-8` for more vertical presence.
- Social icons: `size={18} lg:size={20}`.

**2. Hero typography — `HeroSection.tsx`** (the headline must dominate)
- **"Make Data Identity"**: `clamp(2.25rem, 4.6vw, 8rem)` (was 4vw / 7rem max). At 1901px this lands ~87px — confident but not shouty.
- **"UNIVERSAL"**: `clamp(2.75rem, 6.2vw, 11rem)` (was 5.4vw / 9.5rem). At 1901px ~118px — true SpaceX-grade scale.
- Description: `clamp(1.05rem, 1.35vw, 1.75rem)`, `max-w-[min(720px, 90%)]` — slightly tighter measure for readability at large sizes.
- Title column: `xl:max-w-[58%] 2xl:max-w-[55%]` — let title breathe wider on ultrawide (was 56%/52%).

**3. Vertical rhythm — golden-ratio breathing**
- Top spacer: `basis-[32%]` (was 34%) — hero anchors slightly higher, opens room below.
- Title→description gap: `mt-[clamp(1.5rem, 2.6vw, 3.25rem)]` (was 2.2vw / 2.75rem max).
- Description→CTA gap: `mt-[clamp(1.5rem, 2.8vw, 3.5rem)]`.
- CTA button: padding `px-[clamp(1.75rem, 2vw, 2.75rem)] py-[clamp(0.85rem, 1.05vw, 1.35rem)]`, text `clamp(13px, 1.05vw, 18px)`.

**4. Galaxy orb — keep proportional, slight lift**
- Width/height: `clamp(420px, 54vw, 1180px)` (was 380/52vw/1100px) — scales more on ultrawide to match enlarged title.
- Right margin unchanged.

**5. Stats bar — confident finish**
- Divider width: `w-2/3` (was 3/5), more presence.
- Bottom padding: `pb-[clamp(2.5rem, 4vh, 5rem)]` (was 3vh/3.5rem) — generous floor.
- Stat numbers: `clamp(2rem, 2.9vw, 3.75rem)` (was 2.5vw / 3rem max).
- Stat labels: `text-[clamp(11px, 0.78vw, 14px)]`, `tracking-[0.18em]`, `mt-2.5`.
- Gap between stats: `gap-12 lg:gap-20 xl:gap-28` (was 10/14) — SpaceX-style wide spacing.

### Result at 1901px viewport

```text
   ┌────────────────────────────────────────────────────────┐
   │  THE UOR FOUNDATION    FRAMEWORK  COMMUNITY  ...   ◯◯◯ │  ← larger nav, more gap
   │                                                         │
   │                                                         │
   │   MAKE DATA IDENTITY                  ╭──────────╮     │
   │                                       │          │     │
   │   U N I V E R S A L                   │   ORB    │     │  ← title ~118px
   │                                       │          │     │
   │   UOR is an open-source standard…     ╰──────────╯     │
   │                                                         │
   │   [ EXPLORE PROJECTS → ]                                │
   │                                                         │
   │                                                         │
   │              ─────────────────────                     │  ← wider divider
   │                                                         │
   │       1          11        150+      Open              │  ← larger stats, wider gaps
   │   STANDARD   PROJECTS  CONTRIBUTORS  GOVERNANCE        │
   └────────────────────────────────────────────────────────┘
```

### Files to modify

- `src/modules/landing/components/HeroSection.tsx` — typography scales, spacing, stats, orb size.
- `src/components/Navigation.tsx` (or equivalent) — link scale, gap, padding, social icon size.

### Out of scope

- No changes to galaxy internals, mobile layout, or sections below the hero.
- No content / copy changes.

