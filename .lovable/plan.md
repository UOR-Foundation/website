

## Lens-Specific Rendering: Distinct Visual Experiences per Lens

### Concept

Each lens transforms the entire visual experience, not just the text. Switching lenses should feel like opening the same article in a completely different publication.

### Lens → Template Mapping

| Lens | Template Inspiration | Visual Identity |
|------|---------------------|-----------------|
| Encyclopedia | Wikipedia | Serif body (Georgia), right-floated infobox, ToC, section dividers, neutral white/cream. Current `WikiArticleView` unchanged. |
| Magazine | The Atlantic / National Geographic | Sans-serif body (system sans), massive hero pull-quote, drop cap on first paragraph, two-column feel on wide screens, accent-colored section dividers, generous whitespace. |
| Simple | Children's textbook / Kurzgesagt | Rounded, warm aesthetic. Larger font (19px), playful section emoji markers, pastel accent cards for "Wow!" facts, generous line-height (2.0), no ToC. |
| Deep Dive | Nature / arXiv / scientific journal | Monospaced section numbers (§1, §2), compact sans-serif body (15px), dense two-column layout on wide screens, footnote-style metadata, abstract block at top, equation-friendly styling. |
| Story | Longreads / Medium longform | Large serif title, author byline, full-bleed opening paragraph, no ToC, generous paragraph spacing, pull-quotes styled as large italic blocks with left accent, immersive single-column reading. |

### Implementation

#### 1. Create five lens renderer components

**New files** in `src/modules/oracle/components/lenses/`:

- `WikiLensRenderer.tsx` — Re-export of existing `WikiArticleView` (no change needed, just aliased)
- `MagazineLensRenderer.tsx` — Atlantic/NatGeo style: drop cap, pull-quote hero, wide section dividers, sans-serif
- `SimpleLensRenderer.tsx` — Warm, playful: large type, emoji section markers, "Did you know?" callout cards
- `DeepDiveLensRenderer.tsx` — Journal style: abstract block, numbered sections (§1), dense layout, compact type
- `StoryLensRenderer.tsx` — Longreads/Medium: large title, byline, full-bleed paragraphs, pull-quote blocks

Each component receives the same props: `{ title, contentMarkdown, wikidata?, sources, synthesizing? }` and applies its own markdown component overrides and layout.

#### 2. Update `ContextualArticleView.tsx`

Replace the static `<WikiArticleView>` call with a lens router:

```
const LensRenderer = LENS_RENDERERS[activeLens] ?? WikiArticleView;
return <LensRenderer title={...} contentMarkdown={...} ... />;
```

This is the single switching point. When the user clicks a lens pill, the entire article re-renders with the new visual identity instantly.

#### 3. Lens-specific markdown component factories

Each renderer creates its own `createMarkdownComponents()` with distinct:
- **Font families**: Serif (encyclopedia, story), Sans-serif (magazine, deep-dive), Rounded sans (simple)
- **Font sizes**: 16px (encyclopedia), 17px (magazine), 19px (simple), 15px (deep-dive), 18px (story)
- **Heading styles**: Underlined (encyclopedia), accent-bar (magazine), emoji-prefixed (simple), numbered §N (deep-dive), no-border italic (story)
- **Paragraph rhythm**: Standard (encyclopedia), alternating short/long (magazine), spacious (simple), dense (deep-dive), generous (story)
- **Special blocks**: Infobox (encyclopedia), pull-quotes (magazine, story), callout cards (simple), abstract (deep-dive)

#### 4. Visual identity details

**Magazine** (`MagazineLensRenderer`):
- First letter of first paragraph gets CSS `::first-letter` drop cap treatment (3-line, bold, primary color)
- Section dividers: thin horizontal rule with centered diamond ornament
- Pull-quote: extract first blockquote or strong sentence, render large (24px) italic with left accent bar
- Background: very subtle warm tint
- Max-width: 680px centered

**Simple** (`SimpleLensRenderer`):
- Section headings get emoji prefixes mapped from content keywords
- "Wow!" facts (lines starting with "!" or containing "Did you know") rendered in pastel accent cards with rounded corners
- Larger body text (19px), 2.0 line-height
- No ToC, no infobox
- Warm, rounded UI feel

**Deep Dive** (`DeepDiveLensRenderer`):
- Abstract block at top: gray background, smaller text, summarizing first paragraph
- Sections numbered §1, §2, §3 with compact sans-serif headings
- Body at 15px, line-height 1.65, tighter spacing
- Monospaced inline code styling for technical terms
- Two-column layout on screens > 1024px (CSS columns)
- Footnote-style metadata at bottom

**Story** (`StoryLensRenderer`):
- Large display title (2.5rem serif)
- Subtitle/byline: "A UOR Knowledge Story"
- No ToC, no infobox
- First paragraph full-width, slightly larger (18px)
- Blockquotes rendered as large pull-quotes (22px italic, left accent)
- Extra paragraph spacing (2em between paragraphs)
- Single column, max-width 640px

### Files Changed

| File | Change |
|------|--------|
| `src/modules/oracle/components/lenses/MagazineLensRenderer.tsx` | **New** |
| `src/modules/oracle/components/lenses/SimpleLensRenderer.tsx` | **New** |
| `src/modules/oracle/components/lenses/DeepDiveLensRenderer.tsx` | **New** |
| `src/modules/oracle/components/lenses/StoryLensRenderer.tsx` | **New** |
| `src/modules/oracle/components/ContextualArticleView.tsx` | Route to lens-specific renderer instead of always WikiArticleView |

### No edge function changes needed

The current system prompts already produce lens-appropriate markdown (magazine headers, story arcs, expert sections, etc.). The renderers simply style the same markdown differently. The content adapts via the AI prompt; the visual identity adapts via the renderer.

### User Experience

1. Search a topic. Article renders in Encyclopedia (Wikipedia) style by default.
2. Click "Magazine" pill. Instantly: drop cap appears, pull-quote emerges, typography shifts to sans-serif, section dividers change to ornamental rules. Same content, completely different publication.
3. Click "Deep Dive". Layout compresses, abstract block appears, sections get §N numbering, font shrinks, density increases. Feels like reading a journal paper.
4. Click "Story". Title grows large, byline appears, paragraphs breathe, pull-quotes float. Feels like Longreads.
5. Click "Simple". Font grows, emoji markers appear, callout cards highlight fun facts. Feels like a children's science book.

Each transition is instant and visceral. The framework routes the same canonical content through different visual projections, a direct embodiment of the holographic lens principle.

