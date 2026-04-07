

# Cognitively Optimized Oracle Typography

## Research Foundations Applied

Drawing from established findings in reading science and cognitive load theory:

1. **Optimal line length**: 50-75 characters per line (Dyson & Haselgrove, 2001). Current 68ch is good, but body text size needs increase for comfortable reading at screen distance.

2. **Line spacing (leading)**: 1.5-1.8x font size reduces saccade errors (Kolers et al., 1981). Bump to 1.8 for body, 1.5 for lists.

3. **Paragraph spacing**: Full line-height gap between paragraphs (not half) creates clear "chunking" boundaries that align with working memory capacity (Miller, 1956). Current 1.1em is too tight.

4. **F-pattern scanning**: Users scan in an F-shape (Nielsen, 2006). Bold key terms and use left-aligned headings to anchor scan paths. First sentence of each paragraph carries the most weight.

5. **Semantic grouping (Gestalt proximity)**: Related content needs tighter spacing; unrelated content needs clear separation. Headings should be closer to their content than to preceding content (2:1 ratio).

6. **Contrast and luminance**: Body text at 85-90% opacity (not 100%) reduces glare fatigue on dark backgrounds. Strong/bold at 100% creates natural emphasis anchors.

7. **Font size hierarchy**: Minimum 16px body on screens (Legge & Bigelow, 2011). Current clamp tops at 16.5px which is borderline. Bump to 15.5-17.5px range.

8. **Word spacing**: Slight increase (0.01em) aids word boundary detection in sans-serif faces.

9. **Hanging punctuation and optical margin alignment**: Bullet points and quotation marks should "hang" outside the text block for cleaner visual edges.

10. **First-line emphasis**: The opening sentence of an AI response is the "topic sentence." Slightly larger or bolder first line aids comprehension anchoring.

## Changes

### `src/index.css` — Rewrite `.oracle-prose`

- Increase base font size: `clamp(15.5px, 1.05vw, 17.5px)`
- Line height to `1.82` (cognitive sweet spot)
- Word spacing `0.01em`
- Paragraph margin to `1.4em` (full visual separation between chunks)
- Heading proximity: `margin-top: 2em`, `margin-bottom: 0.5em` (Gestalt: heading belongs to what follows)
- First paragraph after heading: slightly reduced top margin for cohesion
- List item spacing: `0.45em` between items, `1.5` line-height within items
- Nested list indentation reduced slightly for cognitive nesting depth limit
- Blockquote: 3px left border, slightly larger padding, warmer muted color
- Code blocks: slightly more padding, softer background
- `::first-line` pseudo-element on first paragraph: `font-weight: 500` for topic-sentence anchoring
- `::selection` styling for pleasant highlight color
- Smooth `font-feature-settings` for ligatures and proportional numerals
- Add `text-wrap: pretty` for better line-break decisions (supported in modern browsers)
- Horizontal rules: more breathing room (2.5em margin)
- Table cells: more generous padding

### `src/modules/oracle/pages/OraclePage.tsx` — Minor prose container tweaks

- No structural changes needed. The `.oracle-prose` class handles everything.
- Potentially add `selection:bg-primary/20` to the prose container for branded text selection.

### Summary of cognitive principles mapped to CSS properties

| Principle | Property | Value |
|-----------|----------|-------|
| Optimal reading speed | `font-size` | 15.5-17.5px |
| Reduced saccade errors | `line-height` | 1.82 |
| Working memory chunking | `p margin-bottom` | 1.4em |
| Gestalt proximity (headings) | `h* margin-top/bottom` | 2em / 0.5em |
| F-pattern scan anchoring | `strong color` | 100% foreground |
| Topic sentence emphasis | `::first-line` | weight 500 |
| Word boundary detection | `word-spacing` | 0.01em |
| Line-break quality | `text-wrap` | pretty |
| Cognitive nesting limit | List indent | 1.3em max |
| Glare reduction | Body opacity | 0.88 |

