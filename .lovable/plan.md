## Goal

Every "highlight card" across the site (landing updates, blog index, research latest posts, projects grid, news featured/grid) currently uses different combinations of borders, corner radii, hover shadows, and no consistent focus state. Unify them under a single, reusable card chrome so the site feels confident and harmonious.

## Audit

| Surface | Border | Radius | Hover | Focus |
|---|---|---|---|---|
| Landing `HighlightsSection` | none | none on shell, `rounded-lg` on image | image scale only | none |
| `BlogIndexPage` | `border-border` | `rounded-xl` | `shadow-lg` + `border-primary/20` | none |
| `ResearchPage` latest posts | `border-border` | `rounded-xl` | `shadow-lg` + `border-primary/20` | none |
| `ProjectsPage` grid | `border-border/70` | `rounded-2xl` | primary glow + `border-primary/40` | none |
| `NewsCard` | `border-border/70` | `rounded-lg` | `-translate-y-0.5` + `shadow-md` + `border-primary/30` | none |
| `FeaturedNews` | `border-border/60` | `rounded-xl` | `shadow-lg` + `border-primary/40` | none |

## Decision: one canonical chrome

Add a single utility `.highlight-card` (composed in `src/index.css` with `@apply`) used by every card surface above:

- `relative isolate flex flex-col overflow-hidden bg-card`
- `border border-border/70`
- `rounded-phi-lg` (existing φ token; consistent with site rhythm)
- `transition-all duration-300 ease-out`
- `hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.25)]`
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:border-primary/40`
- Inner image wrapper standardised to `aspect-phi overflow-hidden` (no inner rounding — outer `overflow-hidden` clips to the shared radius).

Featured/hero variant `.highlight-card--feature` extends the base with stronger hover (`hover:border-primary/40` and a slightly larger shadow) but keeps identical radius, border weight, and focus ring.

## Changes

1. **`src/index.css`** — add `.highlight-card` and `.highlight-card--feature` in the `@layer components` block.
2. **`src/modules/landing/components/HighlightsSection.tsx`** — replace the bare `<a>` chrome with `highlight-card`; drop inner `rounded-lg` on the image wrapper; move padding to `p-golden-md`.
3. **`src/modules/community/pages/BlogIndexPage.tsx`** — replace `rounded-xl border border-border bg-card … hover:shadow-lg hover:border-primary/20` with `highlight-card`; remove `aspect-phi`'s redundant wrapper styling.
4. **`src/modules/community/pages/ResearchPage.tsx`** (Latest Posts grid) — same swap as BlogIndex; drop inner `rounded-lg`.
5. **`src/modules/projects/pages/ProjectsPage.tsx`** — replace `rounded-2xl border border-border/70 …` with `highlight-card`; drop inner `rounded-lg` on the cover.
6. **`src/modules/community/pages/NewsPage.tsx`** — `NewsCard` uses `highlight-card`; `FeaturedNews` uses `highlight-card highlight-card--feature` (radius + border now match the rest).

## Out of scope

- Article hero covers inside `ArticleLayout` and individual blog posts — those are hero media, not cards.
- Aspect ratios already converged on φ (`aspect-phi` / `aspect-[1.618/1]`) — no change.
- Colors, typography, and grid gaps stay as they are.

## Acceptance

- Every highlight card on Landing, Blog index, Research, Projects, and News shares identical border colour/weight, corner radius, hover lift+glow, and a visible keyboard focus ring.
- No raw `rounded-xl` / `rounded-2xl` / `rounded-lg` survives on these card shells.
- Tab-navigating the cards on each page shows the same focus ring.
