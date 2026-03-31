

# Website Messaging Audit & Coherence Plan

## Audience
Linux/CNCF/Ethereum developers: people who read RFCs, review PRs, and are allergic to marketing language.

---

## Issues Found

### 1. Redundant Definitions (Violates Narrative Advancement Rule)
The core concept ("content-addressed identity, not location-based") is restated in at least five places:

| Location | Phrasing |
|---|---|
| **Hero** subtitle | "neutral steward of the open standard for universal information addressing" |
| **Intro** paragraph 1 | "permanent address derived from its content, not its location" |
| **Framework** hero | "One address per object, derived from its content...not where it lives" |
| **Framework** "The Problem" | "replaces location-based identity with identity based on content" |
| **Footer** | "One permanent address for every piece of data" |

Per the messaging hierarchy rule, the core definition belongs in the Hero only. Every other section should advance the narrative, not re-explain the premise.

### 2. Inconsistent Vocabulary
- "open standard" (Hero) vs "open specification" (Pillars) vs "UOR standard" (Projects page) — pick one term and use it everywhere.
- "Specification" appears in both the footer Resources column AND as the Framework link in the Foundation column — same destination, different labels.
- "Community Hub" (footer) vs "Our Community" (Research page title) vs "Research Community" (Pillars) — the nav item says "Community" but the route is `/research`.

### 3. Pillar Descriptions Are Generic
Current pillar copy could describe any open-source foundation. Compare:
- "The open specification and reference implementation. Fully documented, vendor-neutral, and ready to build on." — This says nothing specific about UOR.
- "Working groups, shared research, open proposals, and peer review across disciplines." — This is CNCF boilerplate.

### 4. CTA Section ("Ready to Build?") Repeats Pillar Content
The three cards (Contributors, Adopters, Researchers) overlap heavily with the three pillars (Framework, Research Community, Project Launchpad). Both exist on the homepage. This is structural redundancy.

### 5. Footer Tagline Is Stale
"One permanent address for every piece of data. Open source. Open standard." — restates the Hero definition AND uses both "open source" and "open standard" which are already in the ecosystem anchoring line of the Intro section.

### 6. About Page Duplicates Pillars
The "What We Do" cards (Framework, Community, Project Launchpad) are nearly identical to the homepage Pillars. Same titles, same icons, slightly different wording.

### 7. Framework Page "The Problem" Section
"Today's data lives in silos. Different formats, systems, and tools that cannot natively understand each other." — this is vague and could apply to any integration tool. Needs a concrete, technical framing that resonates with the target audience.

### 8. Minor Language Issues
- "Fund the future of open data" (Donate page) — "open data" is an existing term with a different meaning (government data transparency). Should be more precise.
- "Frontier Technology" as a project category — meaningless to a Linux kernel developer. Consider a more descriptive category.
- Team member descriptions use inconsistent patterns: some are noun phrases ("Framework architect"), some are gerund phrases ("Building systems that bridge..."), some are vague ("Exploring healthcare frontier technology innovations").

---

## Proposed Changes

### A. Fix Redundancies (5 files)

**Hero subtitle** — Keep as-is (this is the single definition).

**Intro section** (`IntroSection.tsx`) — Remove the re-definition. Instead, advance to *how it works mechanistically*:
> "Content goes in. A deterministic address comes out. The same content always produces the same address, regardless of which node computes it. Verification requires nothing beyond the data itself."
> 
> Second paragraph shifts to *what this enables*:
> "This gives you tamper-evident references that survive migration, replication, and federation. No coordination protocol, no certificate authority, no single point of failure."

**Framework page hero** (`StandardPage.tsx`) — Remove the re-explanation. Replace with what the specification covers:
> "A formal specification for content-addressed object spaces. Defines addressing, resolution, verification, and transformation across six layers."

**Framework "The Problem"** — Replace with a concrete, technical framing:
> "Existing systems use location-dependent identifiers: URLs break, UUIDs collide across boundaries, database keys don't survive export. Every integration layer adds translation code. UOR eliminates this by deriving identity from content structure."

**Footer** (`Footer.tsx`) — Replace tagline:
> "Content-addressed infrastructure for the open web."

### B. Unify Vocabulary (all files)

- Standardize on **"specification"** (not "standard" or "spec" interchangeably).
- Standardize on **"community"** for the people/research section. Rename the nav route label from "Community" and fix the `/research` URL mismatch, or keep the URL but make the label consistent.

### C. Sharpen Pillar Descriptions (`pillars.ts`)

**UOR Framework** →
> "The formal specification: addressing, resolution, verification, and transformation. Six layers, fully documented, ready for implementation."

**Research Community** →
> "Working groups in mathematics, AI, cryptography, and systems engineering. Open proposals, peer-reviewed results, published on GitHub."

**Project Launchpad** →
> "A three-stage maturity pipeline: Sandbox, Incubation, Graduated. Community review, shared infrastructure, and clear promotion criteria."

### D. Deduplicate CTA vs Pillars (homepage)

Remove the three audience-routing cards from `CTASection.tsx`. Keep only:
- The "Ready to Build?" heading
- The two community buttons (Discord, GitHub)
- The team members grid

The Pillars section already provides the three navigation paths. Repeating them as cards adds noise.

### E. Fix About Page (`AboutPage.tsx`)

Replace the "What We Do" cards with a single paragraph that advances beyond what the homepage already says:
> "We maintain the specification, fund research, and run the project maturity pipeline. All governance rules, meeting notes, and financial reports are published on GitHub."

### F. Fix Donate Page Headline

Replace "Fund the future of open data" with:
> "Fund Open Infrastructure"

### G. Normalize Team Descriptions (`team-members.ts`)

Adopt a consistent pattern: `[Domain]. [Specific contribution or expertise].` — all noun phrases, no gerunds, no vague language. Examples:
- "Full-stack development and system architecture." (already good)
- ~~"Building systems that bridge technology & humanity."~~ → "Distributed systems and protocol design."
- ~~"Exploring healthcare frontier technology innovations."~~ → "Healthcare technology and applied research."

### H. Fix Category Labels (`projects.ts`)

- ~~"Frontier Technology"~~ → "Systems" or "Infrastructure"
- Keep "Developer Tools", "Open Science" as-is — these are clear.

---

## Files to Modify

1. `src/modules/landing/components/IntroSection.tsx` — new copy
2. `src/modules/landing/components/CTASection.tsx` — remove audience cards
3. `src/modules/landing/components/HeroSection.tsx` — minor subtitle tweak
4. `src/modules/core/components/Footer.tsx` — new tagline
5. `src/modules/core/pages/AboutPage.tsx` — simplify "What We Do"
6. `src/modules/framework/pages/StandardPage.tsx` — hero + problem section copy
7. `src/modules/donate/pages/DonatePage.tsx` — headline fix
8. `src/data/pillars.ts` — sharper descriptions
9. `src/data/about-cards.ts` — align with pillars or remove
10. `src/data/team-members.ts` — normalize descriptions
11. `src/data/projects.ts` — fix category labels
12. `src/data/featured-projects.ts` — fix category labels

---

## What This Achieves

- **Zero redundancy**: The core definition appears exactly once (Hero). Every subsequent section advances the narrative.
- **Consistent vocabulary**: One term per concept across all pages.
- **Audience precision**: Copy reads like documentation, not a pitch deck.
- **Clear funnel**: Hero (what) → Intro (how) → Pillars (where to go) → Projects (what exists) → CTA (start now).

