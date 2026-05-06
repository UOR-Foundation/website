## Goal

Replace the current card grid in `Browse the Catalog` on `/projects` with a lean, awesome-list style. Each entry shows only: **project name**, **short description**, **category**, and a **GitHub link**.

## What changes

**`src/modules/projects/pages/ProjectsPage.tsx`** — replace the catalog `<section id="projects-list">` body:

- Remove the 3-column card grid, maturity badges, "Learn more" CTA, and per-card detail link.
- Render projects grouped by `category` (Core Infrastructure, Systems, Open Science). Headings act as anchors, like classic awesome lists.
- Under each category, render a tight list. One row per project:
  - **Name** (medium weight, foreground) — links to GitHub `url` in a new tab.
  - **— short description** (muted) on the same line on desktop, wrapped on mobile.
  - Subtle external-link icon at the end of the row.
- Rows are separated by a hairline divider, no card chrome, no shadows.
- Keep section header (`All Projects` / `Browse the Catalog`) and surrounding sections (Maturity Model, Submit) untouched.

**`src/data/projects.ts`** — no schema change. Projects without a `url` (UNS, UOR Certificate) get GitHub links added so every row resolves to a repo. Suggested URLs:
- UNS → `https://github.com/UOR-Foundation/uns`
- UOR Certificate → `https://github.com/UOR-Foundation/uor-certificate`
(If those repos don't exist yet, fall back to the org URL `https://github.com/UOR-Foundation` for those two.)

## Visual reference

```text
CORE INFRASTRUCTURE
  Prism                 — Reference implementation of the UOR Framework.       ↗
  UOR Name Service      — Network infrastructure where every resource is …     ↗
  UOR Certificate       — Self-verifying receipt for any digital object.       ↗

SYSTEMS
  Hologram              — Turns existing hardware into a high-performance …    ↗
  Atomic Language Model — Traceable language model under 50 KB.                ↗

OPEN SCIENCE
  Atlas Embeddings      — Five complex math structures share one origin.       ↗
```

## Out of scope

- Per-project detail pages (`/projects/:slug`) remain as-is and are still reachable via direct URL; just not from the catalog.
- Maturity model section, Submit a Project form, and the page hero stay unchanged.
