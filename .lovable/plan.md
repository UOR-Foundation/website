

# Further Sharpen the Project-Centric Experience

## Current State Assessment

The site has improved significantly — Projects in nav position 1, Learn/Connect/Build pillars, stats bar, contribution guide. But comparing against CNCF's ruthless simplicity, there are still friction points:

1. **The hero title** ("Your Universal Coordinate System for Information") is branded but abstract. CNCF says "Cloud Native Computing Foundation" — you know exactly what it is. A newcomer from CNCF still doesn't know what "Universal Coordinate System for Information" means.
2. **The "What is UOR" section** is still explanation-heavy — a two-column layout with a diagram, followed by four application cards. On a project-centric site, this should be a quick bridge between the hero and the projects, not a mini-lesson.
3. **The maturity pipeline** (Sandbox → Incubating → Graduated) is buried at the bottom of the Projects page. CNCF puts this front and center on their projects page — it's the organizing principle. It should also appear on the homepage as a visual pipeline.
4. **The Community page** leads with "Research Areas" — 12 category buttons, research papers. This is valuable but it buries the participation paths. A CNCF/Linux contributor lands here and asks "how do I get involved?" — the answer should be immediate.
5. **Featured projects on the homepage** don't link to their detail pages — they only have external links. Every card should route to the internal project page.

---

## Changes

### 1. Hero Title — Say What the Foundation Does

**Current:** "Your Universal Coordinate System for Information"
**New:** "The Open Foundation for Universal Data Identity"

This follows CNCF's pattern exactly: "The [adjective] [org type] for [domain]." A developer immediately understands: it's open, it's a foundation, it's about data identity. The subtitle already fills in the details.

Also tighten the subtitle from "A nonprofit home for open-source projects building universal data identity. Learn the framework, connect with contributors, and build together." to: "We support open-source projects that give data a permanent, verifiable address. Learn the framework, connect with contributors, and start building."

**File:** `src/modules/landing/components/HeroSection.tsx`

### 2. Condense "What is UOR" Into a Single-Row Explainer

The current two-column layout with diagram + four application cards takes significant scroll real estate. For a project-centric site, this should be a quick conceptual bridge.

**Replace the current section with:**
- One concise paragraph (the existing "Today, the same data gets different IDs..." text — already good)
- Remove the full diagram — it's useful on the Docs page, not the homepage
- Remove the four application cards — they're domain categories that add cognitive load without driving action
- Keep the "Read the Docs →" link
- This makes the section ~60% shorter, getting visitors to the closing CTA faster

**File:** `src/modules/landing/components/WhatIsUorSection.tsx`

### 3. Homepage Featured Projects — Link to Internal Pages

Currently the project cards on the homepage only have an ExternalLink icon going to GitHub. They should link to the internal project detail pages (e.g., `/projects/hologram`) so visitors stay on the site and learn more.

**Changes:**
- Wrap each project card in a `Link` to `/projects/{slug}`
- Add slug to `featured-projects.ts` data
- Keep the external link icon as a secondary action

**Files:** `src/data/featured-projects.ts`, `src/modules/landing/components/EcosystemSection.tsx`

### 4. Add Maturity Pipeline Visual to Homepage

CNCF's core narrative is Sandbox → Incubating → Graduated. This pipeline should be visible on the homepage, not just buried on the Projects page.

**Add a compact horizontal pipeline** below the Featured Projects in EcosystemSection: three connected steps showing Sandbox → Incubating → Graduated with one-line descriptions and project counts. This makes the maturity journey immediately visible and reinforces the project-centric identity.

```text
[ Sandbox ]  →  [ Incubating ]  →  [ Graduated ]
  11 projects      0 projects        0 projects
```

**File:** `src/modules/landing/components/EcosystemSection.tsx`

### 5. Community Page — Lead with Participation Paths, Not Research

Restructure the Community page so the first thing a visitor sees after the hero is "How to Participate" — three clear paths:

1. **Discuss** — Join Discord, ask questions, share ideas
2. **Contribute** — Pick a project on GitHub, open a PR
3. **Research** — Propose a paper, collaborate on validation

Then show Research Areas and Blog/Events below. This puts participation before content consumption.

**File:** `src/modules/community/pages/ResearchPage.tsx`

### 6. Projects Page — Promote the Maturity Pipeline as the Page's Core Narrative

Move the maturity level cards from the bottom (currently inside the "Submit" section) to directly after the "How to Contribute" guide, before the project catalog. This establishes the progression framework before showing the projects. Rename section header from "Project Maturity Levels" to "The Project Journey" — more active, more inviting.

**File:** `src/modules/projects/pages/ProjectsPage.tsx`

### 7. Tighten the Closing CTA Section

The current CTA section has: three pillar cards + "Learn · Connect · Build" heading + three buttons (Getting Started Guide, Join Discord, GitHub Organization).

The pillar cards already link to the right pages. The three buttons below duplicate what the pillars do. **Remove the three CTA buttons** and let the pillar cards do the work. Replace the "Learn · Connect · Build" heading + buttons with a simpler, single-line CTA: "Ready to build? Submit your project for review." with one button linking to `/projects#submit`.

This eliminates redundancy and creates a single clear action at the bottom of the homepage.

**File:** `src/modules/landing/components/ClosingCTASection.tsx`

---

## Summary

| # | Change | Why |
|---|--------|-----|
| 1 | Hero title: "The Open Foundation for Universal Data Identity" | Instantly tells what this org is, CNCF-style |
| 2 | Condense "What is UOR" to one paragraph + link | Reduce scroll, project-centric focus |
| 3 | Featured project cards link to internal pages | Keep visitors on-site, deepen engagement |
| 4 | Maturity pipeline visual on homepage | Makes Sandbox→Graduated progression visible |
| 5 | Community page leads with participation paths | "How to get involved" before "what we research" |
| 6 | Projects page: maturity pipeline before catalog | Establish the journey before showing projects |
| 7 | Simplify closing CTA to single action | Remove redundancy, one clear ask |

**7 changes across ~6 files. No new files. Pure focus, ordering, and copy refinements.**

