

# Streamline Website for CNCF/Linux Community Alignment

## What CNCF Does Right (and What We Should Learn)

CNCF's homepage follows a dead-simple pattern that every open-source contributor instantly recognizes:
1. **One-sentence mission** ("CNCF is the open source, vendor-neutral hub of cloud native computing")
2. **Stats bar** (221 Projects, 308K Contributors, 21M Contributions, 192 Countries)
3. **Projects front and center** — categorized by maturity (Graduated/Incubating/Sandbox) with logos
4. **Nav**: About | Projects | Training | Community | Blog & News

Your site is close but still has friction points: the hero subtitle uses "content-addressed data identity" language, the "What is UOR" section explains the mechanism before the value, the homepage has too many conceptual sections before showing real projects, and the "Where It Applies" cards on the homepage use domain labels (Semantic Web, Proof-Based Computation) that mean nothing to someone who hasn't already bought in.

---

## Changes

### 1. Hero Copy — Lead with What the Foundation Does, Not the Mechanism

Current subtitle: *"The UOR Foundation maintains the open specification for content-addressed data identity. We exist to support the open-source projects building on it."*

This still uses "content-addressed data identity." A CNCF/Linux person would read that and ask "what does that mean?"

**New subtitle:** *"The UOR Foundation is a nonprofit home for open-source projects that need a universal way to identify, verify, and share data across systems."*

This mirrors CNCF's pattern: org type + what it hosts + why it matters. No mechanism — just purpose.

**File:** `src/modules/landing/components/HeroSection.tsx` (line 92)

### 2. Homepage "What is UOR" — Flip the Order: Value Before Mechanism

The current section explains *how* UOR works (permanent address derived from content) before explaining *why anyone should care*. CNCF leads with outcomes.

**Changes:**
- Rewrite the lead paragraph to start with the problem: "Today, the same data gets different IDs in different systems. Move it, copy it, or federate it — the IDs break. UOR fixes this with one rule: the address comes from the content itself. Same data, same address, everywhere."
- "Where It Applies" cards: simplify titles to be outcome-oriented rather than domain-labeled. Change "Semantic Web" → "Interoperability", "Proof-Based Computation" → "Verifiable Computing", "Agentic AI" → "AI Infrastructure", "Open Science" → "Research Data"

**Files:** `src/modules/landing/components/WhatIsUorSection.tsx`, `src/modules/landing/components/WhatIsUorSection.tsx` (applications array inline)

### 3. Homepage Ecosystem Section — Add a Stats Row (CNCF Pattern)

CNCF shows "221 Projects / 308K Contributors / 192 Countries" right on the homepage. This is the single most effective social-proof pattern in open source.

**Add a compact stats row** above Featured Projects in EcosystemSection: "11 Projects · 150+ Contributors · 12 Research Areas · Open Governance"

This immediately signals activity and scale.

**File:** `src/modules/landing/components/EcosystemSection.tsx`

### 4. Hero CTA — Add a Secondary "Getting Started" Link

CNCF has "About CNCF" as a secondary link. Your hero only has "Explore Projects." Add a secondary ghost button: "What is UOR?" that scrolls to the intro section. This gives newcomers an explicit on-ramp without leaving the page.

**File:** `src/modules/landing/components/HeroSection.tsx`

### 5. Docs Page — Simplify the "Anatomy of an Address" Section

The three coordinate cards (Value/Weight/Components) use phrases like "active bits" and "positions: 0, 2, 4, 6" which are implementation details that lose non-specialists. 

**Rewrite card descriptions to be more conceptual:**
- Value: "The data itself — a document, a number, a record."
- Weight: "A measure of the data's complexity — how much information it contains."
- Components: "The building blocks that make up the data, enabling exact reconstruction."

Remove the binary/position code examples and replace with simpler illustrative labels.

**File:** `src/modules/framework/pages/StandardPage.tsx`

### 6. Docs Page — CTA Section Wording

"Browse the Ontology" is jargon. Change to "Read the Specification."

**File:** `src/modules/framework/pages/StandardPage.tsx` (line 155)

### 7. About Page — Add "Our Principles" Section

The `about-cards.ts` data file already has an `ourPrinciplesCards` array (Transparency, Interoperability, Trust) that isn't rendered on the About page. CNCF prominently shows its values. Add this section below "What We Do."

**File:** `src/modules/core/pages/AboutPage.tsx`

### 8. Community Page — Rename Route to `/community`

The Community page lives at `/research` which is confusing. CNCF uses `/community`. Rename the route and add a redirect from `/research`.

**Files:** `src/App.tsx`, `src/data/nav-items.ts`, `src/data/route-table.ts`, `src/data/pillars.ts`, links in `ClosingCTASection.tsx`, `ResearchPage.tsx`, `EcosystemSection.tsx` (if any internal links)

### 9. Footer — Deduplicate className

Minor: the Footer has `px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]` duplicated on the container div. Clean up.

**File:** `src/modules/core/components/Footer.tsx` (line 11)

---

## Summary

| Change | Why |
|--------|-----|
| Hero subtitle rewrite | Matches CNCF "what we host" pattern |
| What is UOR — value before mechanism | Mirrors how CNCF/Linux describes itself |
| Application cards — outcome labels | Removes domain jargon |
| Stats row on homepage | CNCF's most effective social proof |
| Secondary hero CTA | Gives newcomers an explicit path |
| Docs "Anatomy" simplification | Removes binary/bit-level jargon |
| "Browse the Ontology" → "Read the Specification" | Plain language |
| About page principles section | Uses existing data, mirrors CNCF values display |
| `/research` → `/community` route | Matches CNCF convention |
| Footer cleanup | Code quality |

**10 files modified. No new files. No structural component changes.**

