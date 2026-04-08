

# Polished Content Rendering Across All Lenses

## Problem

The Encyclopedia lens (and other lenses) waste screen space with excessive margins, disconnected elements, and undersized media. The Table of Contents and Infobox float independently with large gaps between them, the lead paragraph sits far from the title, and images are small and underemphasized. The overall impression is loose and unfinished rather than crisp, deliberate, and delightful.

## Design Principles

- **Fill the viewport deliberately**: Tighten vertical gaps between title, tagline, sources, ToC, and body. No wasted vertical whitespace.
- **Side-by-side ToC + Infobox**: On wide screens, place the ToC and Infobox in a shared right column (Wikipedia-style), eliminating the large gap between them.
- **Promote media**: Images should be larger, crisper, with refined captions. Hero images fill the column width. Gallery images use golden-ratio aspect ratios.
- **Consistent lens rhythm**: Apply the same spacing and media treatment rules across all five lenses via shared constants.

## Changes

### 1. WikiArticleView.tsx — Encyclopedia Lens (primary fix)

**Layout tightening:**
- Reduce title `paddingBottom` from 4→2, tagline margin from `6px 0 12px` → `4px 0 8px`
- Reduce SourcesPills bottom spacing
- ToC: increase `maxWidth` from 340→420, reduce `marginBottom` from 20→12
- Body text margin-bottom from `0.7em` → `0.6em`

**Two-column on wide non-immersive screens:**
- When `!isNarrow && wikidata`, use a CSS grid with `1fr 300px` (content + sidebar) instead of float-based infobox
- ToC goes inside main column, Infobox goes in sticky sidebar
- This eliminates the float-related dead space visible in the screenshot

**Infobox refinements:**
- Increase thumbnail `maxHeight` from 220→280 for crisper hero display
- Tighten internal padding

**EncyclopediaMedia section:**
- Gallery images: increase grid item height from 160→200px
- Use `aspect-ratio: 1.618/1` on hero image for cinematic proportions

### 2. InlineMedia.tsx — Shared media components

**InlineFigure improvements:**
- Float variant `maxHeight` from 220→260px for more visual impact
- Full-width variant `maxHeight` from 420→480px
- Add subtle `box-shadow` on hover for depth
- Caption font-size from 12→13px, spacing tightened

**InlineVideo:**
- Compact variant: slightly larger play button

### 3. MagazineLensRenderer.tsx

- Tighten pull-quote margins
- Hero image: remove negative margins on larger screens, use full container width
- Section spacing: reduce `sectionSpacingTop` gap slightly
- Inline images: increase `max-height` for float variants

### 4. DeepDiveLensRenderer.tsx

- Abstract block: reduce bottom margin by ~20%
- Column gap from 32→26px (tighter two-column)
- Figure images: increase `maxHeight` from 180→220px

### 5. StoryLensRenderer.tsx

- Hero image bottom margin from `mb-10` → `mb-8`
- Tighten title-to-subtitle gap
- Inline full-width images: larger maxHeight

### 6. SimpleLensRenderer.tsx

- Hero image: increase `maxHeight` from 240→300px
- Inline images: increase from 200→240px
- Reduce excessive vertical spacing between emoji sections

### 7. MediaGallery.tsx — EncyclopediaMedia

- Grid images height from 160→200px
- Hero image maxHeight from 400→480px
- Figure images: increase from 150×150 to responsive width

## Files Changed

| File | Change |
|------|--------|
| `WikiArticleView.tsx` | Grid-based two-column layout, tighter spacing, larger infobox thumbnail |
| `InlineMedia.tsx` | Larger image dimensions, refined shadows and captions |
| `MagazineLensRenderer.tsx` | Tighter spacing, larger inline media |
| `DeepDiveLensRenderer.tsx` | Tighter columns, larger figures |
| `StoryLensRenderer.tsx` | Tighter hero-to-content gap, larger inline images |
| `SimpleLensRenderer.tsx` | Larger hero/inline images, tighter section gaps |
| `MediaGallery.tsx` | Larger gallery images across all layout modes |

