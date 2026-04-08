
# Golden Ratio & Science-Backed UX Overhaul

## Summary
Apply the golden ratio (φ = 1.618, φ⁻¹ = 0.618) as the governing proportion system across the entire OS — shell, windows, content renderers, and interactive elements — while integrating research-backed UX principles for flow, readability, and delight.

## Technical Approach

### 1. Create a shared φ constants module
**File**: `src/modules/desktop/lib/golden-ratio.ts`

A single source of truth for all φ-derived values used across the OS:
- `PHI = 1.618`, `PHI_INV = 0.618`
- Spacing scale: `4, 6, 10, 16, 26, 42, 68` (each step × φ)
- Typography scale: body 17px → h3 21px → h2 28px → h1 44px (× φ steps)
- Content measure: `bodyMaxWidth = 680px` (≈ 65-75 characters at 17px — the scientifically optimal line length for reading comprehension)
- Padding ratios: vertical/horizontal padding pairs always in φ ratio
- Border-radius scale: `4, 6, 10, 16` (φ progression)

### 2. Desktop Shell — φ-proportioned layout

**DesktopWidgets.tsx** (home screen):
- Clock vertical position: place at `38.2%` from top (φ⁻¹ of viewport) instead of fixed `22vh` — this is the "optical center" that feels naturally balanced
- Search bar width: `580px` → `min(618px, 61.8vw)` — φ-derived
- Spacing between clock → greeting → search: use φ scale (clock→greeting: `16px`, greeting→search: `26px`)

**TabBar.tsx**:
- Tab height: `32px` → `34px` (21 × φ)
- Tab max-width stays at 220px; inner padding uses φ-scale gaps
- Right-side clock/actions gap: `3` → φ-scale spacing

**DesktopWindow.tsx**:
- Window border-radius: `12px` → `10px` (φ-scale)
- Drag strip: `6px` → `6px` (already close to φ-scale)
- Default window spawn position: center of the φ-point of the screen (38.2% from top-left)

**SpotlightSearch.tsx**:
- Modal width: use `min(618px, 61.8vw)`
- Result item padding: φ-scale vertical rhythm

### 3. Content Renderers — Science-backed reading experience

These changes apply across all four lens renderers (Magazine, Simple, DeepDive, Story):

**Typography (based on readability research)**:
- Body text: `17px` with `1.75` line-height (research shows 1.5-1.8x optimal for extended reading)
- Paragraph spacing: `1.618em` margin-bottom (φ-proportioned)
- Heading margins: top `2.618em` (φ²), bottom `1em` — creates asymmetric "breathing" space that draws the eye forward
- Pull-quotes: font-size `22px` (body × φ⁰·⁵) with `1.5` line-height

**Content structure (based on F-pattern & Gutenberg diagram research)**:
- Section spacing: `42px` top margin on h2 (φ-scale), visual separator weight proportioned to φ
- Image placement: first image within top 38.2% of article (above fold, φ-point)
- Image-to-text ratio: inline images sized at `61.8%` of container width for float variants
- Blockquote indent: left-padding `26px` (φ-scale)

**AdaptiveContentContainer.tsx**:
- Padding tiers: `24px` (narrow) / `40px` (medium) / `64px` (wide) — closer to φ scale
- Body max-width: `680px` (scientifically optimal measure ≈ 66 characters)

### 4. ReaderToolbar — φ-refined chrome

**ReaderToolbar.tsx** (already partially uses PHI):
- Verify and tighten existing φ calculations
- Address bar height: enforce `Math.round(21 * PHI)` = `34px`
- Lens pill padding: `14px 22px` (φ ratio between horizontal/vertical)
- Icon button size: `34px` (21 × φ)

### 5. InlineMedia — φ-proportioned images

**InlineMedia.tsx**:
- `full-width` images: aspect ratio `φ:1` (1.618:1) — naturally cinematic
- `float-right` / `pull-left`: width `38.2%` of container (φ⁻¹)
- Image border-radius: `10px` (φ-scale)
- Caption spacing: `10px` below image (φ-scale)

### 6. Flow-State Optimizations (Cognitive Science)

**Progressive disclosure rhythm**:
- Content sections alternate text-heavy and media-rich blocks, creating a "breathing" rhythm that sustains attention (based on Csikszentmihalyi's flow research)
- Section dividers: subtle `◆` markers already exist in Magazine; ensure all lenses have rhythmic visual breaks

**Micro-interactions timing**:
- All transitions: `150ms` (already Revolut-style) — research shows 100-200ms feels "instant" to users
- Hover states: `120ms` ease-out — just below conscious perception threshold

**Color & contrast**:
- Text opacity levels follow φ hierarchy: primary `0.90`, secondary `0.56` (0.9 × 0.618), tertiary `0.34` (0.56 × 0.618)
- This maps to: headings, body text, meta/labels

### 7. desktop.css — φ-derived shadow scale

Update window shadows to use φ-proportioned blur/spread:
- Active: `0 20px 50px -12px` → `0 26px 42px -10px` (φ-scale values)
- Inactive: proportionally lighter at φ⁻¹

## Files Changed

| File | Change |
|------|--------|
| `src/modules/desktop/lib/golden-ratio.ts` | **New** — φ constants and spacing scale |
| `src/modules/desktop/DesktopWidgets.tsx` | φ positioning, spacing |
| `src/modules/desktop/DesktopWindow.tsx` | φ border-radius, spawn position |
| `src/modules/desktop/TabBar.tsx` | φ tab dimensions, spacing |
| `src/modules/desktop/SpotlightSearch.tsx` | φ modal width, result rhythm |
| `src/modules/desktop/desktop.css` | φ shadow scale |
| `src/modules/oracle/components/AdaptiveContentContainer.tsx` | φ padding tiers, 680px measure |
| `src/modules/oracle/components/ReaderToolbar.tsx` | Tighten φ calculations |
| `src/modules/oracle/components/InlineMedia.tsx` | φ image proportions |
| `src/modules/oracle/components/lenses/MagazineLensRenderer.tsx` | φ typography scale, spacing |
| `src/modules/oracle/components/lenses/SimpleLensRenderer.tsx` | φ typography scale, spacing |
| `src/modules/oracle/components/lenses/DeepDiveLensRenderer.tsx` | φ typography scale, spacing |
| `src/modules/oracle/components/lenses/StoryLensRenderer.tsx` | φ typography scale, spacing |

## Priority Order
1. Golden ratio constants module (foundation)
2. Content renderers (highest user-facing impact — the "personal internet")
3. AdaptiveContentContainer + InlineMedia (content proportions)
4. Desktop shell (DesktopWidgets, TabBar, Window)
5. ReaderToolbar + SpotlightSearch (chrome polish)
6. CSS shadows and micro-interactions
