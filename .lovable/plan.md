

# Performance Streamlining Plan — Phase 2

## Current State
Phase 1 (already shipped) added lazy-loading for below-fold sections, 30fps cap on PrimeConstellationBg, RAF-gated scroll progress, and dead code removal. This phase targets the remaining bottlenecks.

## Findings

### 1. GalaxyAnimation renders 1,400 DOM nodes (mobile only)
The CSS-only galaxy orb creates **2 galaxies x 20 stars x 35 dots = 1,400 individual DOM elements**, each with CSS transforms and a continuous 18s rotation animation. On mobile, this is a significant compositor cost — every frame repaints 1,400 transform calculations.

### 2. PrimeGrid runs at unlimited FPS
The hero's Vogel spiral canvas animation (4,000 points per frame) has no frame cap. On 120Hz displays, this doubles the GPU work for a slow-rotating pattern that looks identical at 30fps.

### 3. No `prefers-reduced-motion` support anywhere
Users who enable "Reduce motion" in OS settings still get all three animation loops (PrimeGrid, PrimeConstellationBg, GalaxyAnimation). This is both an accessibility gap and a missed performance win.

### 4. Images total 11MB, no size optimization
The largest images (blog-knowledge-graph.png at 1.3MB, uor-logo.png at 1.1MB, project images at 700KB-1MB each) are served as full-resolution originals. These are only used in lazy-loaded sections, but they're still unnecessarily large when they do load.

### 5. GalaxyAnimation missing GPU promotion
The `.circle` elements animate `transform: rotate()` but have no `will-change` or `translateZ(0)` hint, forcing the browser to decide per-frame whether to promote layers.

---

## Plan

### A. Throttle PrimeGrid to 30fps
Add the same timestamp-based frame cap already used in PrimeConstellationBg. Also add `document.hidden` check to pause when the tab is backgrounded.

**File**: `src/modules/landing/components/PrimeGrid.tsx`

### B. Add `prefers-reduced-motion` support
- **PrimeGrid**: Skip animation loop entirely, render a single static frame
- **PrimeConstellationBg**: Same — render one frame, then stop
- **GalaxyAnimation CSS**: Add `@media (prefers-reduced-motion: reduce)` rule to pause the `.circle` animation
- This single change makes the site immediately lighter on any machine where the user has reduced motion enabled

**Files**: `PrimeGrid.tsx`, `PrimeConstellationBg.tsx`, `galaxy.css`

### C. GPU-promote galaxy animation elements
Add `will-change: transform` to `.circle` and `backface-visibility: hidden` to `.dot` in the galaxy CSS. This tells the browser to composite these layers on the GPU instead of recalculating on the CPU each frame.

**File**: `src/modules/landing/components/galaxy.css`

### D. Add `loading="lazy"` to all below-fold images
Ensure every `<img>` in lazy-loaded sections uses `loading="lazy"`. The HighlightsSection already does this — verify the others (EcosystemSection, CommunitySection, etc.) do too.

**Files**: Any section components with `<img>` tags missing `loading="lazy"`

### E. Pause PrimeConstellationBg canvas when not visible
The constellation canvas is `position: fixed` and runs its animation loop even when fully obscured by opaque sections below the fold. Add an IntersectionObserver on the canvas (or use the scroll fraction it already tracks) to skip drawing when `tStars < 0.001` — which it already does, but the rAF loop still runs. Enhance: when scroll fraction indicates the canvas is fully past view, cancel rAF entirely and restart on scroll-back.

**File**: `src/modules/landing/components/PrimeConstellationBg.tsx`

---

## What stays untouched
- All visual design, layout, routes, and features
- The lazy-loading infrastructure from Phase 1
- All page-level code splitting
- AgentBeacon, Navbar, Footer functionality

## Summary of impact
- **PrimeGrid 30fps cap**: ~50% CPU reduction on hero section for high-refresh displays
- **Reduced motion**: Eliminates all animation cost for users who prefer it
- **GPU promotion**: Smoother galaxy animation with less CPU paint work on mobile
- **Canvas pause**: Zero CPU cost from constellation when scrolled past it
- **Lazy images**: Faster initial paint, lower memory usage

