

# Streamline the Website for Clarity & Project Focus

## The Problem Today

A newcomer landing on this site encounters: abstract terminology ("content-addressed object spaces," "algebraic identity," "canonicalization rules"), a fragmented navigation with overlapping content, and too many sections competing for attention before they understand what UOR actually is or why they should care. Someone from the CNCF or Linux world would bounce.

## Guiding Principle

**Every page should answer: "What does this do, and how do I get involved?"** — in language anyone from an open-source community would immediately understand.

---

## 1. Reorder Navigation — Projects First

Current: `Framework | Community | Projects | About`
New: `Projects | Docs | Community | About`

- "Projects" moves to position 1 — it's the most tangible entry point
- "Framework" becomes "Docs" — familiar to every open-source contributor (Linux, CNCF, Kubernetes all use "Docs")
- This signals: "we ship software" before "we have a spec"

**Files:** `src/data/nav-items.ts`

---

## 2. Homepage — Simplify the "What is UOR" Copy

Current copy uses phrases like "content-addressed data identity," "location-dependent identifiers," "derives identity from content structure." These are accurate but alienating.

**Rewrite to plain language:**
- "Every piece of data gets a permanent address based on what it is, not where it's stored. The same data always gets the same address, on any system."
- Replace "References that survive migration, replication, and federation" with "Move data anywhere — the address stays the same."
- Replace "No central registry, no coordination protocol" with "No central authority required."

The diagram label "Fragmentation → Unification" stays — it's clear. But update "Isolated Data Systems" → "Separate Systems" and keep "One Shared System."

**Files:** `src/modules/landing/components/WhatIsUorSection.tsx`

---

## 3. Homepage — Tighten the Ecosystem Section

Currently has three sub-sections stacked: Featured Projects, Community Highlights, Community Members. This is a lot of scrolling with diminishing engagement.

**Changes:**
- Keep Featured Projects (3 cards) — this is strong
- Keep Community Members grid — social proof matters
- **Remove Community Highlights** (blog cards) from the homepage. They're already on the Community page and add scroll length without driving action. The blog content is important but belongs on its dedicated page.

**Files:** `src/modules/landing/components/EcosystemSection.tsx`

---

## 4. Homepage — Simplify the Pillars CTA

The three pillars ("UOR Framework," "Research Community," "Project Launchpad") duplicate navigation. They're well-written but add another decision layer before the final CTA.

**Changes:**
- Shorten pillar descriptions by ~30% — one sentence each instead of two
- Update pillar titles and CTAs to match new nav labels ("Docs" instead of "UOR Framework")

**Files:** `src/data/pillars.ts`, `src/modules/landing/components/ClosingCTASection.tsx`

---

## 5. Framework Page → "Docs" — Remove Jargon from Hero

Current hero: "A formal specification for content-addressed object spaces. Existing systems use location-dependent identifiers: URLs break, UUIDs collide across boundaries..."

**Rewrite:**
- "The open specification for how UOR addressing works. If you're building on UOR or evaluating it for your project, start here."
- Keep the architecture section and layer cards — developers expect this depth on a docs page
- Simplify the "Anatomy of an Address" descriptions to avoid "raw data itself, stored as a sequence of bytes"

The CTA "14 namespaces, 82 classes, 124 properties" is impressive to spec authors but meaningless to most visitors. Replace with: "The full specification is open source. Read it, fork it, build on it."

**Files:** `src/modules/framework/pages/StandardPage.tsx`

---

## 6. Semantic Web Page — Reduce Jargon in Hero & Comparison Table

This page serves a specific audience (people who know the W3C Semantic Web stack). It's valuable but the hero copy and comparison table use dense terminology.

**Changes:**
- Hero subtitle: simplify "implements and extends every layer of the W3C Semantic Web architecture to power the era of trusted Agentic AI" → "How UOR implements each layer of the W3C Semantic Web stack."
- Comparison table "Original" column: keep as-is (it's describing the original spec accurately)
- Comparison table "UOR" column: simplify phrases like "neg(bnot(x)) = succ(x) verifiable by any machine" → "Built-in mathematical verification. Any machine can check it."
- Keep the tower diagram and layer cards — they're the core value of this page

**Files:** `src/modules/framework/pages/SemanticWebPage.tsx`

---

## 7. Community Page — Simplify Hero Copy

Current: "Researchers and builders working across disciplines to test ideas, validate results, and publish openly."

This is already decent. Minor tweaks:
- Make it clearer this is about participation: "A global community of researchers and developers. Propose ideas, get peer review, and publish results — all in the open."

**Files:** `src/modules/community/pages/ResearchPage.tsx`

---

## 8. Projects Page — Simplify Hero Copy

Current: "Open-source projects built on the UOR specification, organized by maturity level."

**Rewrite:** "Every project in the UOR ecosystem — from early experiments to production-ready tools. Find something to use, or submit your own."

This immediately tells the visitor what they can *do* here.

**Files:** `src/modules/projects/pages/ProjectsPage.tsx`

---

## 9. About Page — Minor Copy Polish

Current hero: "A 501(c)(3) nonprofit building open infrastructure for reliable, verifiable data."

**Rewrite:** "A 501(c)(3) nonprofit maintaining the UOR specification and supporting the projects built on it."

This is clearer about what the foundation actually does.

**Files:** `src/modules/core/pages/AboutPage.tsx`

---

## 10. Update Route Path for Framework → Docs

Change `/standard` to `/docs` to match the new nav label. Add a redirect from `/standard` → `/docs` for any existing links.

**Files:** `src/App.tsx`, `src/data/nav-items.ts`, internal links in `SemanticWebPage.tsx`, `ClosingCTASection.tsx`, `WhatIsUorSection.tsx`

---

## Summary

| Change | Impact |
|--------|--------|
| Nav reorder: Projects first, "Docs" label | Immediate clarity on what the org ships |
| Homepage copy simplification | Removes jargon barrier for newcomers |
| Remove blog highlights from homepage | Shorter scroll, fewer distractions |
| Shorter pillar descriptions | Faster path to action |
| Docs page hero rewrite | Welcoming instead of intimidating |
| Semantic Web jargon reduction | Accessible to broader audience |
| Projects hero rewrite | Action-oriented, inviting |
| Route `/standard` → `/docs` | Familiar convention |

**Files modified:** 10 files. No new files. No structural changes to components. Pure copy, routing, and ordering refinements.

