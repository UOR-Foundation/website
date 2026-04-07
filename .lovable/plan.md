

# Performance Streamlining Plan

## Problem
The main bundle is **375KB** (117KB gzip) — everything the browser must download, parse, and execute before the first paint. The landing page also runs **two canvas animation loops** (PrimeConstellationBg + PrimeGrid) and a scroll-tracking MutationObserver on every frame.

The lazy-loaded pages are already well code-split — the heaviest dependencies (Three.js, Hugging Face, Monaco Editor, Picovoice) only load on demand. The issue is the **initial landing page weight and runtime cost**.

## Proposed Optimizations (ordered by impact)

### 1. Lazy-load below-the-fold landing sections
Currently all 8 sections load eagerly. Only **HeroSection** and **PrimeConstellationBg** are above the fold. The rest (WhatIsUor, Ecosystem, Community, ClosingCTA, Highlights, ReadyToBuild) can use `React.lazy` + a simple IntersectionObserver wrapper so they only load when scrolled into view.

**Impact**: Reduces initial JS parse/execute by ~40-50% of the landing page code.

### 2. Throttle PrimeConstellationBg to 30fps
The 434-line canvas animation runs at full refresh rate (often 120fps on modern monitors). Capping to 30fps halves GPU/CPU usage with no perceptible visual difference for a slow-moving starfield.

### 3. Debounce ScrollProgress
The scroll listener fires on every pixel of scroll. Switching to `requestAnimationFrame`-gated updates (one calc per frame max) reduces layout thrashing.

### 4. Lazy-load PrimeConstellationBg itself
The starfield only becomes visible after scrolling past the hero. Defer its initialization with an IntersectionObserver so the canvas animation doesn't start until needed.

### 5. Remove unused PrimeSequenceCanvas
This component exists in the codebase but is never imported anywhere. Dead code removal.

### 6. Tree-shake lucide-react
Ensure all imports use named imports (they already do) — Vite handles this, but we can verify no barrel re-exports are pulling in the full icon set.

---

## What stays untouched
- All existing features, routes, and visual design
- The PWA configuration and service worker
- All lazy-loaded project/blog/framework pages (already well-split)
- AgentBeacon (lightweight, SEO-critical)
- Desktop/mobile responsive behavior

## Technical approach

**New utility component**: `LazySection` — a thin wrapper using IntersectionObserver + React.lazy that renders a placeholder div until the section scrolls into view (~20 lines).

**Files modified**:
- `src/modules/landing/pages/IndexPage.tsx` — wrap below-fold sections in LazySection
- `src/modules/landing/components/PrimeConstellationBg.tsx` — add 30fps frame cap + IntersectionObserver pause
- `src/modules/core/components/ScrollProgress.tsx` — RAF-gate the scroll handler
- Delete `src/modules/landing/components/PrimeSequenceCanvas.tsx`

**No dependency changes.** No new packages needed.

