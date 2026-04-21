

# Alchemy-Style Project Cards + Project Detail Header

Make every place a project appears use the same crisp, developer-friendly format inspired by Alchemy's Dapp Store: a square logo tile on the left, name/description/tags on the right.

## What changes

### 1. Shared `ProjectCard` component (new)

Create `src/modules/projects/components/ProjectCard.tsx` — one canonical card used everywhere a project is listed:

- Layout: **horizontal**, square logo tile (96px on mobile, 112–128px on desktop) on the left, content on the right.
- Logo tile: `aspect-square`, rounded-2xl, soft border, neutral background, `object-cover` of the project image. Falls back to a tasteful gradient + monogram when no image.
- Right side, top to bottom: project name (display, semibold), one-line tagline (muted, clamped to 2 lines), then a chip row showing `category` and `maturity` (small pill badges, same colors as today).
- Hover: border lifts to `primary/30`, subtle shadow, name shifts to primary. Whole card is a `<Link to={/projects/:slug}>`.
- Optional external-link icon top-right when `url` is set, stops propagation.
- Variants: `compact` (used on homepage / 3-up grid) and `default` (used on /projects and /sandbox 2-up grid).

### 2. Homepage — `EcosystemSection`

Replace the current 3-column text-only featured strip with three `ProjectCard` (compact variant) in a `grid-cols-1 md:grid-cols-3` layout, separated by hairlines, on the same dark section. `featuredProjects` data gains an `imageKey` so the same `imageMap` used elsewhere is reused.

### 3. Catalog — `ProjectsPage` ("Browse the Catalog")

Replace the current text-only 3-up grid with `ProjectCard` (default variant) in a `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` layout. Add a small toolbar on top of the grid:

- Search input (filters by `name`, `description`, `category`).
- Category filter chips (derived from the catalog).
- Result count text on the right.

Filtering is purely client-side over `projectsData`. No data changes required beyond this page's local state.

### 4. Sandbox / explore — `SandboxPage`

Same `ProjectCard` (default variant), grouped by category as today. Cards become uniform horizontal logo + text instead of the current "image on top, text below" stack — matches the Alchemy directory feel exactly.

### 5. Project detail header — `ProjectDetailLayout`

Currently the detail page (via `ArticleLayout`) shows a wide 16:9 hero image below the headline. Change the project-detail header to match Alchemy's Spearbit-style layout:

- Two-column header band: **left** = square logo tile (same component as the card's tile, larger — 200px on desktop, 144px on mobile, rounded-2xl); **right** = kicker (category), `h1` name, deck (tagline), and a CTA row (`Visit website` if `url`, `View Repository`, optional X/social).
- Below the header band, keep the existing meta line (date · read time) and the single-column editorial body unchanged.
- The wide 16:9 hero image is removed for project pages (it competes with the logo tile and creates two large visuals). Blog posts keep the wide hero image — only the project surface changes.
- This is achieved by adding a `headerOverride` slot to `ArticleLayout` and rendering the logo + title block from `ProjectDetailLayout`. Blog posts pass nothing and keep current behavior.

### 6. Visual tokens (consistent across all surfaces)

- Logo tile: `rounded-2xl border border-border bg-muted/30`, `aspect-square`, `object-cover`.
- Card: `rounded-2xl border border-border bg-card`, `p-5 md:p-6`, hover `border-primary/30 shadow-md`.
- Pill chips (category, maturity): `text-[11px] font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full`. Maturity colors stay as today.
- Name: `font-display text-lg md:text-xl font-semibold`.
- Tagline: `text-foreground/65 text-sm md:text-base leading-snug line-clamp-2`.

## Files

- New: `src/modules/projects/components/ProjectCard.tsx`
- Edit: `src/data/featured-projects.ts` (add `imageKey` per entry).
- Edit: `src/modules/landing/components/EcosystemSection.tsx` (use `ProjectCard`).
- Edit: `src/modules/projects/pages/ProjectsPage.tsx` (search + filter chips + `ProjectCard`).
- Edit: `src/modules/projects/pages/SandboxPage.tsx` (use `ProjectCard`).
- Edit: `src/modules/projects/components/ProjectDetailLayout.tsx` (logo + text header band, drop wide hero).
- Edit: `src/modules/core/components/ArticleLayout.tsx` (optional `headerOverride` slot; default behavior unchanged).

## Out of scope

- No changes to blog post rendering or the article body for projects.
- No new images, no routing changes, no backend changes.
- No changes to the "Submit a Project" form.

## Result

Every project — on the homepage, the catalog, the sandbox grid, and individual detail pages — uses the same square-logo-plus-text pattern. The catalog gains search and category filters. Detail pages open with a clean Alchemy-style header (logo · title · description · actions) followed by the existing editorial body.

