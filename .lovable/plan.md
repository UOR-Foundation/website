

# Streamline Every Page to 4 Sections

## The Problem
Pages range from 3 to 8 sections, creating an inconsistent, busy experience. Users scroll too much and lose context.

## The Rule
Every page gets exactly **4 sections**: Hero → Content A → Content B → CTA/Footer-close. This creates a rhythm users learn once and never think about again.

```text
┌──────────────────────┐
│       HERO           │  Identity: title + subtitle + action
├──────────────────────┤
│     CONTENT A        │  Primary substance (the "what")
├──────────────────────┤
│     CONTENT B        │  Supporting detail (the "how" or "proof")
├──────────────────────┤
│       CTA            │  Single call-to-action closure
└──────────────────────┘
```

---

## Page-by-Page Changes

### 1. Home (8 → 4)
- **Hero** — keep as-is
- **Content A: "What is UOR"** — merge the current Intro diagram + Applications cards into one section (diagram left, 4 app cards right, or stacked)
- **Content B: "Ecosystem"** — merge Projects showcase + Community members into one section (projects row on top, community avatars below, with a Highlights stat bar between them)
- **CTA** — merge Pillars + CTA into one closing section: three pillar cards above the final call-to-action buttons

**Removed/merged**: Intro, Applications, ProjectsShowcase, Community, Highlights, Pillars, CTA → condensed into 3 body sections + hero

### 2. Framework `/standard` (7 → 4)
- **Hero** — keep, fold "The Problem" text into the hero subtitle (it's just two paragraphs)
- **Content A: "How It Works"** — merge the UOR Diagram + Anatomy of an Address into one section
- **Content B: "Architecture & Applications"** — merge Framework Architecture layers + Applications grid into one section
- **CTA** — keep as-is

**Removed/merged**: Problem section absorbed into hero; Diagram + Anatomy merged; Architecture + Applications merged

### 3. Community `/research` (5 → 4)
- **Hero** — keep as-is
- **Content A: "Research"** — keep the research categories + papers section as-is (it's the core content)
- **Content B: "Blog & Events"** — merge Blog cards and Events list into one combined section (blog cards row, then events list below)
- **CTA: "Join"** — keep as-is

**Removed/merged**: Blog and Events become one section

### 4. Projects `/projects` (5 → 4)
- **Hero** — keep as-is
- **Content A: "Project Catalog"** — keep the collapsible maturity-tier project listing as-is
- **Content B: "Submit a Project"** — merge Maturity Levels explanation + Submission Process steps + Submit Form into one section (maturity cards as a compact reference row, then the form below)
- **CTA** — the submit form itself serves as the closing action (dark section with form = natural page closer)

**Removed/merged**: Maturity Levels, Submission Process, and Submit Form collapse into one section

### 5. About `/about` (4 → 4)
- Already at 4 logical sections (Hero, What We Do, Governance, Resources). **No changes needed** — it's already the model.

### 6. Donate `/donate` (3 → 4)
- **Hero** — keep as-is
- **Content A: "Projects to Support"** — keep as-is
- **Content B: "Ways to Donate"** — keep as-is
- **CTA** — add a brief closing section with a final "Donate Now" button and a thank-you message

**Change**: Add a small closing CTA section for consistency

### 7. Semantic Web `/semantic-web` (6 → 4)
- **Hero** — keep, fold the Definition blockquote into the hero (it's a single quote + one paragraph)
- **Content A: "The Tower"** — merge the Tower diagram + Layer Detail cards into one section (diagram at top, expandable/accordion layer cards below)
- **Content B: "Comparison"** — keep the comparison table as-is
- **CTA** — keep as-is

**Removed/merged**: Definition absorbed into hero; Tower + Layer Details merged

---

## Technical Details

### Files Modified
1. `src/modules/landing/pages/IndexPage.tsx` — reduce from 8 to 4 component imports
2. `src/modules/landing/components/` — create 2 new merged components (e.g., `WhatIsUorSection.tsx`, `EcosystemSection.tsx`), retire individual ones
3. `src/modules/framework/pages/StandardPage.tsx` — restructure sections
4. `src/modules/community/pages/ResearchPage.tsx` — merge Blog + Events
5. `src/modules/projects/pages/ProjectsPage.tsx` — merge submission sections
6. `src/modules/donate/pages/DonatePage.tsx` — add closing CTA
7. `src/modules/framework/pages/SemanticWebPage.tsx` — merge sections

### What Gets Preserved
- All existing content and data — nothing is deleted, only reorganized
- All animations and styling patterns
- All external links and CTAs
- The design system (cards, typography, spacing tokens)

### What Changes
- Section count becomes uniform (4 per page)
- Less whitespace between conceptually related blocks
- Fewer full-width dividers and section headers
- Faster time-to-bottom on every page

