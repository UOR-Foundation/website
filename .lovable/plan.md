

# Remove Redundancy and Sharpen Copy Across the Website

## Problem Summary

After a full audit, the same core message — "every piece of data gets a permanent address based on what it contains" — appears in nearly identical wording in **six different places** (Hero, IntroSection, About hero, Donate hero, Framework "The Problem," and pillar descriptions). Several section headers repeat ("What We Do" appears on both the landing page and About page), and some paragraphs add words without adding meaning.

## Changes

### 1. Landing Page — Eliminate the Echo Between Hero and IntroSection

**HeroSection.tsx**: The subtitle already nails the mission. Keep as-is.

**IntroSection.tsx**: The bold opening sentence is a near-verbatim copy of the hero subtitle. Rewrite the intro to advance the narrative instead of restating it:
- Bold line → Explain *why* this matters (the consequence, not the mechanism)
- Second paragraph → Keep, it's additive ("No broken links, no middlemen, no gatekeepers")
- Third paragraph → Currently restates the hero again. Cut or replace with a forward-looking line about who benefits.

### 2. Landing Page — PillarsSection Label

**PillarsSection.tsx**: The eyebrow says "What We Do" — same label as the About page section. Change to "How We Work" or "Three Pillars" to differentiate.

**pillars.ts**: Tighten descriptions:
- "UOR Framework" → Remove "Every piece of digital content deserves a permanent, verifiable address" (said in hero). Start with what the spec actually delivers.
- "Research Community" → Remove "Good standards come from open collaboration" (generic). Lead with the specific activity.
- "Project Launchpad" → Remove "Real adoption starts with real projects" (truism). Lead with what the launchpad provides.

### 3. Landing Page — CTASection

**CTASection.tsx**: The subtitle "Engineers, researchers, and builders working on the open data framework" is vague. Replace with a clear call: "Pick a path and get started."

### 4. About Page Hero

**AboutPage.tsx**: The hero paragraph repeats the mission statement verbatim. Replace with a short, distinct sentence about the organization (when founded, what kind of org, where it operates) rather than re-explaining UOR.

### 5. About Page — "What We Do" Cards

**about-cards.ts**: These three cards (Framework, Community, Project Launchpad) duplicate the pillars on the landing page. Rewrite the descriptions to focus on *organizational activities* rather than *what UOR is* — e.g., "We maintain the specification and publish updates" rather than "We research and publish open data frameworks and protocols that anyone can build on."

### 6. Framework Page — "The Problem" Section

**StandardPage.tsx**: The second paragraph restates the hero. Cut "Every object gets a single, permanent address derived from what it contains. Same content, same address, across every system." — the hero already said this. Keep only the contrast ("Today's data lives in silos") and the solution concept ("identity based on content").

### 7. Donate Page Hero

**DonatePage.tsx**: "Your donation funds an open standard that gives every piece of data one permanent, verifiable address. No lock-in, no gatekeepers." — Remove the first sentence (said everywhere). Lead with impact: what donations actually fund (development, infrastructure, community).

### 8. Research Page — Redundant Headers

**ResearchPage.tsx**:
- The page title is "Our Community," and the first section heading inside is also "Community." Remove the redundant inner h2 or change it to something specific like "Research Areas."
- The Join CTA section ("Whether you are a researcher, developer, or supporter...") repeats the same audience segmentation as the landing page CTA. Shorten to one direct sentence.

### 9. Projects Page — Double Explanation of Review Timeline

**ProjectsPage.tsx**: Both the "How to Submit" cards and the "Submit for Sandbox Review" form intro mention the 3-week review window. Remove it from one place (keep it in the form intro since that's where users act).

### 10. Data Files — Tighten Descriptions

**featured-projects.ts**: Atlas Embeddings description is wordy. Tighten: "Research showing five complex mathematical structures share a single origin, revealing deeper order."

## Files to Modify

| File | Change |
|------|--------|
| `src/modules/landing/components/IntroSection.tsx` | Rewrite opening to advance narrative, not restate hero |
| `src/modules/landing/components/PillarsSection.tsx` | Change "What We Do" eyebrow |
| `src/modules/landing/components/CTASection.tsx` | Sharpen subtitle |
| `src/data/pillars.ts` | Tighten descriptions, remove repeated phrases |
| `src/data/about-cards.ts` | Rewrite to focus on org activities |
| `src/data/featured-projects.ts` | Tighten Atlas description |
| `src/modules/core/pages/AboutPage.tsx` | Replace hero paragraph |
| `src/modules/framework/pages/StandardPage.tsx` | Trim redundant sentence in "The Problem" |
| `src/modules/donate/pages/DonatePage.tsx` | Rewrite hero paragraph for impact |
| `src/modules/community/pages/ResearchPage.tsx` | Fix redundant headers, trim Join CTA |
| `src/modules/projects/pages/ProjectsPage.tsx` | Remove duplicate 3-week mention |

## Guiding Principle

Every section should move the reader forward. If a sentence says the same thing as another page (or another section on the same page), it gets rewritten or removed. The mission statement appears once in the hero. Everything else builds on it.

