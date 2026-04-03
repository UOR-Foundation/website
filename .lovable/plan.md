

# Docs Page Redesign — Clean, CNCF-Style Developer Entry Point

## Goal
Replace the current dense, diagram-heavy docs page with a clean, scannable page that feels familiar to open-source developers (CNCF, Linux Foundation style). All content links canonically to the UOR Framework GitHub repo. No jargon. Clear developer onboarding.

## Current State
The `/docs` page (StandardPage.tsx) has four heavy sections: a UOR diagram with interactive capabilities, three "anatomy of an address" cards, six expandable framework layers, six application cards, and a CTA. It's information-dense and unfamiliar in structure.

## New Structure

**Section 1 — Hero (simplified)**
- Title: "Documentation"
- Subtitle: One sentence — "Everything you need to understand, evaluate, and build with the UOR Framework."
- Two buttons: "Read the Docs" (links to GitHub Pages docs) and "View on GitHub" (links to repo)

**Section 2 — Getting Started (3-card grid)**
Three clean cards, each with an icon, title, one-line description, and a link to the relevant GitHub docs page:
1. **Overview** — "What UOR is, what problem it solves, and how addressing works." → links to docs overview
2. **Architecture** — "Six layers from mathematical foundation to data transformation." → links to docs architecture
3. **Quick Start** — "Verify the core identity proof and explore the API." → links to repo README or quick start

**Section 3 — Key Concepts (simple list/grid)**
A clean 2-column or 3-column grid of the six framework layers, but radically simplified — no accordions, no expandable panels. Each is just a card with: layer number, title, one-line summary, and a link out to the canonical GitHub docs page for that namespace. Looks like a typical docs index (Kubernetes docs, CNCF project pages).

**Section 4 — Where It Applies**
Keep the existing six application cards but simplify styling slightly. This section stays as-is since it's already clean.

**Section 5 — CTA (simplified)**
- "Explore the Full Specification" with two buttons: "Read the Specification" and "View on GitHub"
- Remove the "Try Prism" button to reduce noise (Prism is on the Projects page)

## Technical Changes

| File | Change |
|---|---|
| `src/modules/framework/pages/StandardPage.tsx` | Rewrite page with simplified sections described above. Remove UORDiagram and FrameworkLayers component imports. |
| `src/data/framework-layers.ts` | Keep data file but only use `number`, `title`, `summary`, and first namespace link per layer for the simplified cards. |
| No new files needed | The page becomes simpler, not more complex. |

## Copy Style
- Plain English. No "substrate," "involution," or "algebraic identity" on the docs page.
- Every section header is a verb or question developers would ask: "Getting Started," "Key Concepts," "Where It Applies."
- All links go to `https://github.com/UOR-Foundation/UOR-Framework` or `https://uor-foundation.github.io/UOR-Framework/` — canonical sources only.

