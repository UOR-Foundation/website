

# Make the UOR Foundation Project-Centric — CNCF Alignment

## Insight from CNCF

CNCF's contribute page (`contribute.cncf.io`) is ruthlessly simple: one tagline ("Learn, connect, and contribute — the CNCF way"), three cards (Contributors, Projects, Community), done. Their projects page groups everything by maturity tier with logos. Everything funnels into projects.

Your site already has strong bones — maturity tiers, project cards, submission form. But the homepage still leads with "What is UOR" (mechanism) before projects, and the three pillars in the closing CTA (Docs / Community / Projects) are framed around the foundation's structure rather than the visitor's journey. The user's own framing — **Learn, Connect, Build** — is the perfect organizing principle.

---

## Changes

### 1. Restructure the Homepage Pillars Around "Learn · Connect · Build"

The current three pillars are "Docs / Community / Projects." Reframe these as the visitor's journey:

- **Learn** — "Understand how UOR addressing works. Read the specification, explore the architecture, see how it compares to existing standards." → Links to `/docs`
- **Connect** — "Join a global community of developers and researchers. Propose ideas, get peer review, collaborate in the open." → Links to `/community`  
- **Build** — "Start building with UOR. Pick a project to contribute to, or submit your own for review." → Links to `/projects`

Update `pillars.ts` and the `ClosingCTASection` heading from "Join the Mission" to "Learn · Connect · Build" (simple, mirroring CNCF's "Learn, connect, and contribute").

**Files:** `src/data/pillars.ts`, `src/modules/landing/components/ClosingCTASection.tsx`

### 2. Reorder the Homepage: Projects Before "What is UOR"

CNCF puts projects on the homepage before explanations. Currently the flow is: Hero → What is UOR → Ecosystem (Projects) → Pillars CTA.

**New flow:** Hero → Ecosystem (Projects + Stats) → What is UOR → Pillars CTA.

This means swapping `WhatIsUorSection` and `EcosystemSection` in `IndexPage.tsx`. Visitors see tangible projects immediately after the hero, then get the explanation if they want to understand the underlying framework.

**File:** `src/modules/landing/pages/IndexPage.tsx`

### 3. Simplify the Ecosystem Section Header

Currently says "UOR Ecosystem / Featured Projects." CNCF just says "Our Projects."

**Change to:** Section label "Our Projects", heading "Featured Projects", and keep the "View all projects →" link. Remove the "UOR Ecosystem" label — it's redundant when the whole site is the UOR ecosystem.

**File:** `src/modules/landing/components/EcosystemSection.tsx`

### 4. Projects Page — Add a "How to Contribute" Quick Guide

CNCF's contribute page shows clear paths for newcomers. The Projects page currently has: hero → catalog → maturity explanation → submit form. After the hero, add a compact 3-step contribution guide:

```
1. Find a project → Browse the catalog below
2. Start contributing → Check the project's GitHub for open issues  
3. Submit your own → Use the form at the bottom of this page
```

This is a small, inline section (not a new page) that immediately answers "how do I get involved?" — the #1 question from open-source newcomers.

**File:** `src/modules/projects/pages/ProjectsPage.tsx`

### 5. Community Page Hero — Mirror CNCF's "Learn, Connect, Contribute"

Current hero: "A global community of researchers and developers. Propose ideas, get peer review, and publish results — all in the open."

**Rewrite:** "Learn, connect, and build — the UOR way." as the hero tagline (mirrors CNCF exactly). Keep the subtitle but tighten: "Join researchers and developers working together across disciplines. Propose ideas, review each other's work, and ship projects in the open."

**File:** `src/modules/community/pages/ResearchPage.tsx`

### 6. Nav — Add "Contribute" as a Visible CTA Button

CNCF has "Join" as a highlighted button in the nav. Add a small "Contribute" or "Get Involved" link to the nav that links to the Projects page submission section (`/projects#submit`). This makes the contribution path visible from every page.

**Files:** `src/data/nav-items.ts`, `src/modules/core/components/NavBar.tsx` (render last nav item as a CTA-style button)

### 7. Hero Subtitle — Tighten Further

Current: "The UOR Foundation is a nonprofit home for open-source projects that need a universal way to identify, verify, and share data across systems."

**Rewrite:** "A nonprofit home for open-source projects building universal data identity. Learn the framework, connect with contributors, and build together."

This weaves in the "Learn, Connect, Build" language right from the first screen.

**File:** `src/modules/landing/components/HeroSection.tsx`

---

## Summary

| # | Change | CNCF Pattern |
|---|--------|-------------|
| 1 | Pillars → "Learn · Connect · Build" | CNCF's "Learn, connect, contribute" |
| 2 | Projects section before "What is UOR" | CNCF shows projects first |
| 3 | Simpler ecosystem header | CNCF says "Our Projects" |
| 4 | Contribution quick guide on Projects page | CNCF contribute.cncf.io 3-card pattern |
| 5 | Community hero mirrors CNCF tagline | Direct alignment |
| 6 | Nav CTA for contributing | CNCF "Join" button |
| 7 | Hero subtitle weaves in Learn/Connect/Build | Consistent messaging |

**7 changes across ~8 files. No new pages. No structural rewrites. Pure messaging and ordering refinements to make the whole site feel project-centric and instantly familiar to any CNCF/Linux contributor.**

