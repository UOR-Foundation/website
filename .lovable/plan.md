

## Homepage Storyline Assessment

### Current Flow (8 sections)
1. **Hero** — "Your Universal Coordinate System for Information" + 2 CTAs
2. **Mission** (dark) — "We maintain the open spec for content-addressed data identity"
3. **How It Works** — Deterministic addressing explained in two paragraphs
4. **Where It Applies** — 6 application domain cards
5. **Featured Projects** (dark) — 3 ecosystem projects
6. **UOR Community** — Member avatar grid
7. **Get Involved** — 3 pillar cards (Framework, Research, Launchpad)
8. **Ready to Build?** — 3 action buttons

### Diagnosis

The structure is solid after the reorder. But there are specific copy and structural issues that dilute the story:

**1. Mission and How It Works overlap.** Mission says "content-addressed data identity." How It Works says "a permanent address derived from its content." These are the same idea stated twice, violating the narrative advancement rule. The reader stalls.

**Fix:** Merge Mission into How It Works as a single, tighter section. Open with the mission as the lead sentence, then explain the mechanism. One section, no repetition. This also removes an entire dark-light-dark visual break that currently chops the page rhythm.

**2. "Where It Applies" has 6 cards but no clear hierarchy.** A developer scanning this section sees a wall of equal-weight tiles. Some domains (Agentic AI, Proof-Based Computation) are immediately compelling to your target audience. Others (Cross-Domain Unification, Frontier Technologies) are vague and abstract.

**Fix:** Cut to 4 cards. Drop "Cross-Domain Unification" (it restates what UOR already does) and "Frontier Technologies" (too vague, no concrete hook). Four cards in a 2x2 grid reads faster and hits harder.

**3. The "How It Works" section has a dangling "About The Foundation" link and a footer tagline ("Open source, Vendor-neutral...").** Both break the forward momentum. The tagline belongs in the footer or hero, not mid-page. The "About" link is a side-quest that pulls the reader off the narrative track.

**Fix:** Remove the "About The Foundation" link. Move the "Open source / Vendor-neutral / 501(c)(3)" tagline into the Mission lead sentence or remove it entirely (it's already implied by the hero and footer). Keep this section laser-focused on mechanism.

**4. The Pillars section descriptions are internally focused.** They describe the Foundation's org chart, not the developer's journey. "A three-stage maturity pipeline" is bureaucratic language. "Working groups in mathematics, AI, cryptography" reads like a committee roster.

**Fix:** Rewrite pillar descriptions from the developer's perspective. What can *they* do? "Read the spec and start building" / "Propose research, get peer review, publish results" / "Ship a project, get community review, graduate to production."

**5. No HighlightsSection on the page.** There's a fully built `HighlightsSection` component (community blog posts / news) that's not in the IndexPage. This is a missed opportunity for social proof and freshness. It shows the community is active.

**Fix:** Add HighlightsSection between Community and Pillars. It bridges "here are the people" with "here's how to join" by showing "here's what they're doing right now."

### Proposed New Flow

```text
1. Hero                    — Hook: what is this?
2. How It Works            — Mechanism + mission (merged, single section)
3. Where It Applies        — 4 cards (trimmed from 6)
4. Featured Projects       — Proof: it works (dark)
5. UOR Community           — Proof: who's behind it
6. Community Highlights    — Proof: it's alive right now
7. Get Involved            — Your path in (rewritten descriptions)
8. Ready to Build?         — Single closing CTA
```

### Technical Changes

**Delete:** `src/modules/landing/components/MissionSection.tsx` — content merged into IntroSection

**Edit:** `src/modules/landing/components/IntroSection.tsx`
- Open with mission statement as a bold lead: "The UOR Foundation maintains the open specification for content-addressed data identity. We exist to support the open-source projects building on it."
- Follow with the mechanism explanation (current How It Works copy)
- Remove the "About The Foundation" link
- Remove the "Open source / Vendor-neutral..." tagline line
- Use dark section styling (inherits MissionSection's visual weight as the first section after hero)

**Edit:** `src/modules/landing/components/ApplicationsSection.tsx`
- Remove "Cross-Domain Unification" and "Frontier Technologies" cards
- Keep: Semantic Web, Proof-Based Computation, Agentic AI, Open Science
- Change grid to `lg:grid-cols-2` for a cleaner 2x2 layout on desktop

**Edit:** `src/data/pillars.ts`
- Rewrite descriptions from the developer's point of view:
  - UOR Framework: "Read the full specification. Six layers covering addressing, resolution, verification, and transformation. Everything you need to start building."
  - Research Community: "Propose ideas, get peer review, publish results. Active working groups across mathematics, AI, cryptography, and systems engineering."
  - Project Launchpad: "Ship your project through three stages: Sandbox, Incubation, Graduated. Community review, shared infrastructure, clear criteria."

**Edit:** `src/modules/landing/pages/IndexPage.tsx`
- Remove MissionSection import
- Add HighlightsSection import
- New order: Hero, IntroSection, ApplicationsSection, ProjectsShowcase, CommunitySection, HighlightsSection, PillarsSection, CTASection

