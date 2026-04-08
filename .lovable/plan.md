

## Pretext-Powered Text Rendering — Integration Plan

### What Pretext Is

Pretext (`@chenglou/pretext`, already installed in the project) is a library that pre-computes text layout — line breaks, heights, widths — using canvas measurement instead of DOM reflow. This unlocks:

- **Zero-DOM text height prediction** — know exactly how tall text will be before rendering
- **Manual line-by-line layout** — route text around images, pull-quotes, and obstacles
- **Shrink-wrap / balanced text** — compute the tightest container width for multiline text
- **Smooth streaming** — during token streaming, predict layout without triggering reflows

### Where It Adds Magic in This App

The app streams AI-generated articles through `TokenBuffer` → ReactMarkdown → lens renderers. Currently, every token flush triggers a full React re-render + DOM reflow. Pretext can enhance three specific areas:

1. **Streaming height prediction** — eliminate layout shift during article synthesis
2. **Balanced, tight-fit headings** — shrink-wrap article titles to eliminate awkward orphan words
3. **Pull-quote & drop-cap precision** — position editorial elements with pixel-perfect awareness of surrounding text geometry

### Implementation

**1. New utility: `src/modules/oracle/lib/pretext-layout.ts`**
- Wrapper around Pretext's `prepare`, `layout`, `prepareWithSegments`, `layoutWithLines`, `measureLineStats`
- Font constants matching each lens's CSS fonts (`'17px DM Sans'`, `'18px Georgia'`, etc.)
- `predictSectionHeight(text, font, containerWidth, lineHeight)` — returns height in pixels
- `balanceText(text, font, maxWidth)` — binary-searches for the narrowest width that keeps the same line count, eliminating orphans
- `getLineBreaks(text, font, width, lineHeight)` — returns individual lines for manual rendering

**2. New component: `src/modules/oracle/components/BalancedHeading.tsx`**
- Uses Pretext to compute the tightest width that keeps the same line count as the full-width layout
- Renders the heading in a container set to that width → text looks "balanced" with no orphan words
- Uses `ResizeObserver` to recompute on container resize (only calls `layout()`, not `prepare()`)
- Applied to `h1` titles in all lens renderers — the most visible win

**3. Enhanced `WaterfallSection` with height prediction**
- Before a section streams in, use Pretext to predict its final height from the accumulated text
- Set `min-height` on the section container to the predicted value → prevents content below from jumping
- As streaming completes, the predicted height matches the actual height — zero layout shift
- This replaces the current `opacity: 0.85` partial indicator with a smoother spatial reservation

**4. Streaming layout stabilizer in `TokenBuffer`**
- Add an optional `onHeightHint` callback to TokenBuffer
- On each flush, run `layout()` (pure arithmetic, <0.05ms) on the accumulated text to predict total content height
- The parent component sets a CSS `min-height` on the article container, preventing scroll anchoring jank
- This is the "0.05ms vs 30ms" win Pretext advertises — height prediction without DOM reflow

**5. Drop-cap & pull-quote awareness (Magazine lens)**
- Use `layoutNextLineRange()` to compute how many lines the drop-cap displaces
- Set the drop-cap's `float` height precisely so body text wraps cleanly around it
- For pull-quotes: use `measureLineStats()` to verify the quote text fits within the allocated column width, adjusting font-size if needed

### Files Modified

| File | Change |
|---|---|
| `src/modules/oracle/lib/pretext-layout.ts` | New — Pretext wrapper utilities |
| `src/modules/oracle/components/BalancedHeading.tsx` | New — orphan-free balanced headings |
| `src/modules/oracle/components/WaterfallSection.tsx` | Add height prediction for layout-shift-free streaming |
| `src/modules/oracle/lib/token-buffer.ts` | Add optional `onHeightHint` callback |
| `src/modules/oracle/components/lenses/MagazineLensRenderer.tsx` | Use BalancedHeading for title, drop-cap precision |
| `src/modules/oracle/components/lenses/StoryLensRenderer.tsx` | Use BalancedHeading for title |
| `src/modules/oracle/components/lenses/DeepDiveLensRenderer.tsx` | Use BalancedHeading for title |
| `src/modules/oracle/components/lenses/SimpleLensRenderer.tsx` | Use BalancedHeading for title |
| `src/modules/oracle/components/WikiArticleView.tsx` | Use BalancedHeading for title |
| `src/modules/oracle/pages/ResolvePage.tsx` | Pass height-hint from TokenBuffer to container min-height |

### What Users Will Feel

- **No more layout jumps** while articles stream in — text appears and the page stays still
- **Beautiful, balanced titles** — no more awkward single-word orphan lines on headings
- **Snappier rendering** — fewer DOM reflows during streaming means smoother scrolling
- **Pixel-perfect editorial feel** — drop-caps and pull-quotes that interact naturally with body text

