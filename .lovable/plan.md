

# Plasma-Inspired Polish Pass: Focus, Clarity, Delight

A focused cleanup of the home page and global chrome to remove redundancy, sharpen language, and bring the site closer to the calm, high-signal feel of plasma.to — without losing the UOR identity.

## Principles applied

- **One job per section.** No section repeats what another already said.
- **Verdict headlines.** 2–4 word section titles that state the point.
- **Numbers over adjectives.** Stat strips replace soft "feature" copy.
- **One CTA per surface.** Every screen has a single primary action.
- **Quiet chrome.** Remove decorative chips, badges, and duplicate links.

## Changes

### 1. Navbar — single primary action
**File:** `src/modules/core/components/Navbar.tsx`
- Drop the trailing "Contribute" CTA from the desktop right cluster. Keep the three social icons (Discord, GitHub, LinkedIn) as the only right-side elements.
- Remove the "Contribute" item from `src/data/nav-items.ts` so it no longer appears in the mobile drawer's primary nav or the secondary "Contribute →" link.
- The single primary site-wide action becomes the hero's "Explore Projects" button. Contribute lives on the Projects page (`/projects#submit`) where it belongs.
- Mobile drawer: remove the secondary `Contribute →` row (now redundant).

### 2. Hero — tighter, fewer words
**File:** `src/modules/landing/components/HeroSection.tsx`
- Headline stays: `MAKE DATA IDENTITY UNIVERSAL`.
- Replace the deck with a single, sharper sentence: *"A permanent, verifiable address for every piece of data."* (down from two sentences).
- Keep one CTA: `Explore Projects →`. No secondary link.
- Stats strip stays but drops the "Research Areas" cell — keep the three with the strongest signal: **11 Projects · 150+ Contributors · Open Governance**. The grid becomes a clean 3-up on desktop, matching mobile.
- Remove the unused `Download` import.

### 3. Section headlines — verdicts
Rewrite the H2 of the next sections to short verdicts. No body copy changes, only the headline.

- `WhatIsUorSection` → **"One address. Everywhere."**
- `EcosystemSection` → **"Built in the open."**
- `HighlightsSection` → **"Proof, not promises."**
- `CommunitySection` → **"Built by many."**
- `ClosingCTASection` → **"Make it universal."**
- `ReadyToBuildCTA` → remove this section entirely (duplicates the closing CTA — see below).

### 4. Remove the duplicate closing CTA
**File:** `src/modules/landing/pages/IndexPage.tsx`
- Remove the `ReadyToBuildCTA` lazy section. The page already ends with `ClosingCTASection`; two back-to-back CTAs is the single biggest source of noise on the home page.
- Final home order: Hero → Community → WhatIsUor → Ecosystem → Highlights → ClosingCTA.

### 5. Standardize action arrows
- Every primary text link/button across the home sections uses a trailing `→` (lucide `ArrowRight`, `size={14}`). No mixed `>`, no `›`, no plain text. Sweep `HeroSection`, `WhatIsUorSection`, `EcosystemSection`, `HighlightsSection`, `CommunitySection`, `ClosingCTASection` for any inconsistencies.

### 6. Tighten section dividers
**File:** `src/index.css` (small addition) and the six landing sections
- Establish one shared vertical rhythm: each section uses `py-20 md:py-28` (replaces today's mix of paddings). This eliminates the visible "tall, short, tall" cadence between sections.

## What we are NOT changing

- No changes to the article/project layout we just shipped (split hero stays).
- No changes to data, routing, theme, fonts, colors, or the galaxy/prime visuals.
- No new dependencies.
- No copy changes inside section bodies — only headlines and the hero deck.

## Files touched

- `src/modules/core/components/Navbar.tsx`
- `src/data/nav-items.ts`
- `src/modules/landing/components/HeroSection.tsx`
- `src/modules/landing/pages/IndexPage.tsx`
- `src/modules/landing/components/WhatIsUorSection.tsx`
- `src/modules/landing/components/EcosystemSection.tsx`
- `src/modules/landing/components/HighlightsSection.tsx`
- `src/modules/landing/components/CommunitySection.tsx`
- `src/modules/landing/components/ClosingCTASection.tsx`
- `src/index.css` (shared section spacing utility, optional)

## Result

Less to read, fewer places to click, one clear path forward on every screen. The home page reads as a confident sequence of short verdicts backed by numbers and proof — the same calm, high-signal cadence that makes plasma.to feel like frontier work, expressed in the UOR Foundation's own voice.

