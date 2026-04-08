

# Pretext-Powered Adaptive Content Windows — Deep Analysis & Recommendation

## Current State

Your project already uses `@chenglou/pretext` in three ways:

1. **BalancedHeading** — Binary-searches the tightest container width that preserves line count, eliminating orphan lines. Used in all 5 lens renderers (Magazine, Simple, DeepDive, Story, Wiki). Re-balances on resize via `ResizeObserver`.
2. **WaterfallSection** — Predicts section height during streaming to reserve space and prevent layout shift.
3. **pretext-layout.ts** — Caching wrapper exposing `predictHeight`, `balanceWidth`, `getLines`, `predictSectionHeight`.

However, only **titles** get the Pretext treatment. Body text, pull-quotes, blockquotes, and section headings all use raw CSS with hardcoded `maxWidth: 720` and `clamp()` values — they don't adapt to actual window width.

## What Pretext Unlocks (That You're Not Using Yet)

From the repo analysis, three powerful APIs are underutilized:

| API | What it does | Current use | Opportunity |
|-----|-------------|-------------|-------------|
| `balanceWidth` via `walkLineRanges` | Shrinkwrap text to tightest balanced container | Titles only | **Every heading, pull-quote, blockquote** |
| `predictHeight` | Zero-DOM height prediction | Streaming sections only | **Dynamic column layout, masonry-like flow** |
| `prepareRichInline` | Rich inline flow with mixed fonts, chips, atomic items | Not used | **Inline citations, tags, metadata pills that reflow correctly** |
| `measureLineStats` / `measureNaturalWidth` | Line count + widest line without allocations | Not used | **Responsive font scaling — shrink font if content doesn't fit window** |
| `layoutNextLineRange` (variable-width) | Per-line width changes for text wrapping around images | Not used | **Text flowing around hero images and inline figures** |

## Recommended Implementation: "Fluid Typography Engine"

The most delightful approach is a **container-aware typography system** where every text element in the window measures itself against the actual available width and adapts — not with CSS clamp hacks, but with precise canvas measurement.

### Architecture

```text
┌─ Desktop Window (resizable, movable) ─────────────────┐
│  ┌─ AdaptiveContentContainer ───────────────────────┐  │
│  │  ResizeObserver → containerWidth                  │  │
│  │                                                   │  │
│  │  ┌─ BalancedHeading (already works) ─────────┐   │  │
│  │  │  Title re-balances on resize              │   │  │
│  │  └───────────────────────────────────────────┘   │  │
│  │                                                   │  │
│  │  ┌─ NEW: BalancedBlockquote ─────────────────┐   │  │
│  │  │  Pull-quotes balanced like titles         │   │  │
│  │  └───────────────────────────────────────────┘   │  │
│  │                                                   │  │
│  │  ┌─ NEW: FluidBodyText ──────────────────────┐   │  │
│  │  │  maxWidth = min(720, containerWidth-pad)  │   │  │
│  │  │  Predicts height for smooth streaming     │   │  │
│  │  └───────────────────────────────────────────┘   │  │
│  │                                                   │  │
│  │  ┌─ NEW: AdaptiveFontScale ──────────────────┐   │  │
│  │  │  Uses measureLineStats to check if title  │   │  │
│  │  │  fits at preferred size; steps down if not │   │  │
│  │  └───────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Changes

#### 1. Create `AdaptiveContentContainer` wrapper
A new component that wraps the entire lens renderer content area. It:
- Uses a `ResizeObserver` to track `containerWidth` in state
- Passes `containerWidth` down via React context
- All child components read this instead of using `vw` units or hardcoded widths
- Replaces every `maxWidth: 720`, `max-width: 95vw`, and `clamp()` call with container-relative values

**File**: `src/modules/oracle/components/AdaptiveContentContainer.tsx`

#### 2. Extend `BalancedHeading` into `BalancedBlock`
Generalize the balancing logic to work for any block element — pull-quotes, blockquotes, section subheadings. Same binary-search approach, different font configs.

**File**: `src/modules/oracle/components/BalancedBlock.tsx`

#### 3. Add adaptive font scaling to titles
Use `measureLineStats` to check if a title at the preferred font size produces too many lines for the window width. If it does, step down the font size. This means narrow windows get smaller but still balanced titles automatically — no CSS clamp needed.

**File**: Update `BalancedHeading.tsx` to accept a `fontSizes` array and pick the largest that keeps line count reasonable.

#### 4. Update all 5 lens renderers to be container-aware
Replace hardcoded `maxWidth: 720`, `fontSize: "clamp(...)"`, and `95vw` references with values derived from `AdaptiveContentContainer` context.

**Files**: 
- `MagazineLensRenderer.tsx` — body `maxWidth`, drop-cap sizing, pull-quote width
- `SimpleLensRenderer.tsx` — body maxWidth
- `DeepDiveLensRenderer.tsx` — body maxWidth, code block width
- `StoryLensRenderer.tsx` — body maxWidth, opening italic
- `WikiArticleView.tsx` — body maxWidth

#### 5. Integrate `prepareRichInline` for source citations
Source pills and inline citations currently use CSS flexbox wrapping. Replace with pretext's `prepareRichInline` to predict exactly how citation pills will flow, enabling pre-reserved space during streaming and pixel-perfect reflow on resize.

**File**: `src/modules/oracle/components/SourcesPills.tsx`

#### 6. Update `WaterfallSection` to use container width
Currently falls back to `720` if no element ref. With the context, it reads the actual container width for accurate height prediction during streaming.

**File**: `src/modules/oracle/components/WaterfallSection.tsx`

#### 7. Ensure `ResolvePage` reader container uses `w-full h-full`
Confirm viewport units are fully purged when inside a window context. Content should fill the window, not the browser viewport.

**File**: `src/modules/oracle/pages/ResolvePage.tsx`

### Priority Order
1. `AdaptiveContentContainer` + context (foundation — everything depends on this)
2. Update lens renderers to use container width (biggest visual impact)
3. Adaptive font scaling for titles (delight factor)
4. `BalancedBlock` for pull-quotes and blockquotes (polish)
5. Rich inline citations (advanced)

### Result
Every piece of text in the window — titles, body, quotes, citations, metadata — will dynamically adapt to the window's actual size. Resize the window and watch headings re-balance, body text reflow to the optimal measure, and font sizes step gracefully. No CSS hacks, no viewport units — pure canvas-measured typography.

