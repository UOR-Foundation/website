

## Full-Width, Golden-Ratio Article Layout Overhaul

### Problem
The article reader view wastes screen space with narrow hardcoded max-widths (640–740px) in every lens renderer, plus the outer container adds its own constraints. Headings are inconsistently styled across lenses. The result feels cramped with large margins on wider screens.

### Design Approach
Apply a responsive, Golden-Ratio-informed layout that uses the full viewport width intelligently — like The New York Times, Medium, or National Geographic online. Text columns stay at an optimal reading width (~680–720px for body text — research-backed for readability), but media, headings, and structural elements break out to fill the available space.

### Changes

**1. Outer content container (`ResolvePage.tsx`, ~line 2107–2127)**
- Widen the non-immersive reader container from `clamp(640px, 65vw, 860px)` → `clamp(720px, 75vw, 1100px)`
- Widen the immersive container from `min(1200px, 92vw)` → `min(1400px, 95vw)`
- Reduce horizontal padding to reclaim space on smaller screens

**2. Magazine lens (`MagazineLensRenderer.tsx`)**
- Remove `maxWidth: 680` on `<article>` — let it fill the parent
- Body text paragraphs: keep at optimal 720px via `max-width` on `<p>` and lists (reading-width constraint)
- Headings (`h2`): full-width, larger font size (1.75rem → 2rem), tighter letter-spacing
- Hero image: truly full-bleed with negative margins
- Pull-quotes: wider, centered with max-width ~900px
- Title: scale up to `clamp(2.2rem, 5vw, 3.2rem)` with display font

**3. Encyclopedia lens (`WikiArticleView.tsx`)**
- Two-column layout: widen grid from `1fr 300px` → `1fr 320px` with φ-based gap
- Single-column: remove implicit narrow constraint, let text flow to ~720px via paragraph-level max-width
- Title: use fluid `clamp(1.8rem, 4vw, 2.6rem)`
- Infobox: use `min(320px, 38.2%)` width (φ complement)

**4. Simple lens (`SimpleLensRenderer.tsx`)**
- Remove `maxWidth: 700` → full parent width
- Body text constrained at paragraph level to ~740px
- Title: larger, playful — `clamp(2rem, 5vw, 3rem)`

**5. Deep Dive lens (`DeepDiveLensRenderer.tsx`)**
- Remove `maxWidth: 740` → full width
- Paragraph-level text max-width: 720px
- Section headers: full-width

**6. Story lens (`StoryLensRenderer.tsx`)**
- Remove `maxWidth: 640` → full width
- Body paragraphs: max-width 680px (tighter for narrative immersion)
- Hero image: full-bleed
- Title: cinematic scale `clamp(2.4rem, 6vw, 3.6rem)`

**7. Consistent heading hierarchy (all lenses)**
Apply a unified typographic scale based on Golden Ratio:
- `h1` (title): `clamp(2rem, 5vw, 3rem)`, weight 700–800
- `h2` (section): `clamp(1.4rem, 3vw, 2rem)`, weight 700, with adequate top margin (`3rem`)
- `h3` (subsection): `clamp(1.1rem, 2vw, 1.4rem)`, weight 600
- All headings: consistent `letter-spacing: -0.02em`, line-height: 1.2

**8. Responsive breakpoints**
- Mobile (<768px): text fills to ~95vw with 16px padding, no side margins wasted
- Tablet (768–1024px): text at ~85vw
- Desktop (>1024px): text paragraphs at optimal 720px, structural elements at full container width
- Hero images and media: always full-bleed (negative margins to escape text column)

### Files Modified
1. `src/modules/oracle/pages/ResolvePage.tsx` — widen outer container
2. `src/modules/oracle/components/lenses/MagazineLensRenderer.tsx` — full-width article, paragraph-level text constraint
3. `src/modules/oracle/components/WikiArticleView.tsx` — wider layout, fluid headings
4. `src/modules/oracle/components/lenses/SimpleLensRenderer.tsx` — same pattern
5. `src/modules/oracle/components/lenses/DeepDiveLensRenderer.tsx` — same pattern
6. `src/modules/oracle/components/lenses/StoryLensRenderer.tsx` — same pattern

### Result
Content fills the screen naturally like a modern editorial website. Body text stays at the scientifically optimal reading width, while headings, images, and structural elements use the full available space. The experience is consistent across all screen sizes and all five lens renderers.

