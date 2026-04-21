

# SpaceX-Inspired Sharpening Pass

Strip the home page down to the essentials SpaceX uses so well: massive headline, one short sentence, one quiet `→` action — set in vast negative space. Same content, far less noise.

## What SpaceX does that we don't (yet)

1. **No eyebrow labels.** No "Community", "Ecosystem", "Highlights" tags above headlines. The headline carries itself.
2. **One sentence per section.** A single confident line, then a single `→` link. No paragraphs, no two-column intros.
3. **Massive uppercase headlines.** Set tighter, bigger, more confident.
4. **No decorative diagrams competing with copy.** The hero image *is* the diagram.
5. **Status chip in nav.** A tiny mono-spaced live signal (SpaceX uses `T-17:30:34` — we'll use a `LATEST` chip).
6. **Generous quiet between sections.** Let each statement land.

## Changes

### 1. Remove eyebrow labels site-wide (home)
**Files:** `WhatIsUorSection.tsx`, `EcosystemSection.tsx`, `HighlightsSection.tsx`, `CommunitySection.tsx`, `ClosingCTASection.tsx`

Delete the small uppercase tag above each H2 ("What is UOR", "Ecosystem", "Highlights", "Community", "Get Started"). These five eyebrows add no information once the headline is a verdict — they're pure decoration.

### 2. Sharpen headlines to a single editorial scale
Bring the home H2s closer to the SpaceX weight: bigger, tighter tracking, more confident. Replace `text-fluid-heading` on these five H2s with a sharper local clamp:

```
text-[clamp(2.25rem,4.6vw,4.5rem)] leading-[0.98] tracking-[-0.02em]
```

Same display font, just set with the confidence SpaceX uses for "MAKING LIFE MULTIPLANETARY".

### 3. Collapse `WhatIsUorSection` to one sentence + one link
**File:** `WhatIsUorSection.tsx`

Current section is the noisiest on the page: two long paragraphs, a 9-cell silos grid, an UOR badge, an animated node graph, and a CTA. SpaceX would never do this.

New layout:
- Headline: **"One address. Everywhere."** (sharper scale per #2).
- One sentence below: *"Every system invents its own identifiers. UOR derives a permanent, verifiable address from the data itself — the same data has the same address, anywhere."*
- One link: `Explore the Framework →`.
- **Remove the entire `UorDiagramCompact` component** (silos grid, UOR badge, node graph, all of it). The hero galaxy and the rest of the page already carry the visual weight.

Net effect: the section shrinks from ~470px tall to ~280px and reads like a verdict, not an explainer.

### 4. Trim the rest to "headline + one sentence + one →"

- **`EcosystemSection`** — keep the 3 project cards. Remove the eyebrow. Add a single sentence under the headline: *"Open standards, reference implementations, and tools — built in public."* Keep the existing `View all projects →` link in the header row.
- **`HighlightsSection`** — keep the 3 highlight cards. Remove the eyebrow. Add a single sentence: *"What we've shipped, written, and proven."* No other CTA — the cards are the action.
- **`CommunitySection`** — remove the eyebrow. Keep the honeycomb. Add a single sentence: *"Researchers, engineers, and builders advancing universal data identity."*
- **`ClosingCTASection`** — remove the eyebrow. Keep the three pillars (they are the final action). Headline stays "Make it universal."

### 5. Tiny status chip in the navbar (SpaceX cue)
**File:** `Navbar.tsx`

Add a small monospaced chip on the desktop right cluster, before the social icons:

```text
[ LATEST · v0.1.0 ]
```

- `font-mono text-[10px] tracking-[0.2em] uppercase`, hairline border `border-foreground/15`, padding `px-2.5 py-1`, links to `/research` (or `/highlights`).
- Hidden on mobile (the hamburger already handles that surface).
- This mirrors SpaceX's "UPCOMING LAUNCHES T-17:30:34" chip — a quiet signal that the site is alive, without being a CTA.

### 6. Slightly more breathing room
**Files:** the five home sections.

Bring section padding from `py-12 md:py-16` to `py-14 md:py-20`. Still tight, but each statement gets the quiet around it that makes SpaceX feel inevitable rather than busy. (Earlier we squeezed too far.)

### 7. Standardize the action arrow
Sweep all `ArrowRight` icons in the home sections to `size={14}` and `strokeWidth={2}`. SpaceX uses one arrow weight, period.

## What we are NOT changing

- Hero (already sharp — we just shipped it).
- Navbar nav items, logo, mobile drawer.
- Article/project page split-hero layout.
- Theme, fonts, colors, galaxy/prime visuals.
- Any data, routing, or images.
- No new dependencies.

## Files touched

- `src/modules/landing/components/WhatIsUorSection.tsx` (largest change — diagram removed)
- `src/modules/landing/components/EcosystemSection.tsx`
- `src/modules/landing/components/HighlightsSection.tsx`
- `src/modules/landing/components/CommunitySection.tsx`
- `src/modules/landing/components/ClosingCTASection.tsx`
- `src/modules/core/components/Navbar.tsx` (status chip only)

## Result

Five home sections, each one a verdict in one sentence with one quiet action. No eyebrows, no diagrams competing with copy, a tiny live signal in the nav. The page reads like SpaceX: confident, quiet, inevitable — without copying their look.

