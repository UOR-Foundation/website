

# Apply a TechCrunch-Style Editorial Format to Projects and Articles

Goal: make every project page and every blog post look and read like a polished TechCrunch article — crisp typography, a strong editorial hero, a single comfortable reading column, clear section rhythm, and confident visual hierarchy.

## What "TechCrunch style" means here

- A tight top meta line: category/tag · date · short read time.
- A large, serious headline (display serif-feeling weight, tight tracking).
- A single deck/standfirst paragraph under the headline (slightly larger, muted).
- A full-width hero image directly under the headline with a small caption line below it.
- One narrow reading column (~680–720px) for the entire body — never two columns of prose.
- Generous body type (~19px / 1.75 line-height), strong section subheads, clear pull-style emphasis on key sentences, and subtle horizontal rules between major sections.
- A clean footer block: author/source line, share row, and a "Related" strip.

## Changes

### 1. Project pages — `ProjectDetailLayout.tsx`

Replace the current side-by-side hero + multi-section layout with an editorial article layout:

- **Top meta row**: `Category · Updated <date> · <X> min read`.
- **Headline**: project name as an `<h1>`, large display weight, tight tracking, single column.
- **Deck**: the existing tagline rendered as a larger muted standfirst paragraph directly under the headline.
- **Hero image**: full-width (within the article max-width), 16:9, rounded, with a small italic caption underneath ("<Project name> — <category>").
- **Body column**: a single `max-w-[720px]` column, centered, used for ALL sections.
- **Section headings**: `h2` in display weight, with a thin top divider for clear rhythm.
- **Body copy**: `text-[19px] leading-[1.75]`, comfortable paragraph spacing, larger lists, links underlined on hover.
- **"For AI agents" block**: styled as an editorial sidebar card at the end of the article (subtle border, muted background, same column width).
- **Footer**: source/repo line ("Source: <repoUrl>"), a simple share row, then a "Related projects" strip pulling 2–3 entries from `featured-projects.ts` (excluding current slug).

All existing project pages keep their current data — no per-page edits required.

### 2. Blog posts — shared article layout

Apply the same editorial template to blog post pages so projects and articles feel like one publication:

- Same meta row (Tag · Date · read time).
- Same headline + deck treatment.
- Same hero image + caption.
- Same single 720px reading column, same type scale, same section dividers.
- Same footer (share row + "Related reading" pulled from `blog-posts.ts`).

Approach: introduce a single `ArticleLayout` component used by both project pages (via `ProjectDetailLayout`) and blog post pages, so the two surfaces stay visually identical going forward.

### 3. Type and rhythm tokens

- Body: 19px / 1.75, paragraph spacing 1.25em.
- H1: clamp(2.5rem, 5vw, 3.75rem), tracking-tight, weight 700.
- H2: 1.875rem, tracking-tight, weight 700, with a 1px top border in `border-border/60` and 2.5rem top padding.
- Deck: 1.375rem, muted-foreground, leading 1.55.
- Caption: 0.875rem, muted-foreground, italic.
- Max article width: 720px. Hero image width: 880px (slightly wider than text, classic editorial feel).

### 4. Read time

Compute a simple read time from the rendered section text length (≈ 200 wpm), shown in the meta row. Falls back to "3 min read" if content is minimal.

## Files to change

- `src/modules/projects/components/ProjectDetailLayout.tsx` — rebuild as editorial article layout.
- New: `src/modules/core/components/ArticleLayout.tsx` — shared editorial shell (meta, headline, deck, hero, body slot, footer).
- Blog post page(s) under `src/modules/core/pages/` (e.g. `BlogPost*.tsx`) — adopt `ArticleLayout`.
- `src/index.css` — add `.prose-article` utility for the 19px/1.75 body rhythm and section divider styling.

## Out of scope

- No changes to project data, blog data, routing, or images.
- No changes to navbar, footer, or homepage.
- No new dependencies.

## Result

Every project page and every blog post will read like a TechCrunch article: a confident headline, a clear deck, a strong hero image, and a single, generous reading column with crisp section rhythm — consistent across the entire site.

