

# Hero Section — Mission-Led Headline

## The Pattern

Both SpaceX and CNCF lead with a **verb-driven mission** — not a description of what the org *is*, but what it's *doing*:

- SpaceX: **"MAKING LIFE MULTIPLANETARY"**
- CNCF: **"MAKE CLOUD NATIVE UBIQUITOUS"**

The subtitle then grounds it: who we are, what we host, why it matters.

Current UOR hero ("The Foundation for Universal Data Identity") describes the org. It doesn't declare a mission. It's a label, not a rallying cry.

## Proposed Hero

**Headline:**
```
MAKE DATA IDENTITY
UNIVERSAL
```

Three words of action ("Make data identity"), one word of vision ("universal"). Verb-led like SpaceX and CNCF. Says exactly what UOR exists to do. "Universal" on its own line gives it visual weight — mirrors CNCF's "UBIQUITOUS" treatment.

**Subtitle (desktop):**
"The UOR Foundation is the open-source home for projects that give every piece of data a permanent, verifiable address — so it can be found, proven, and trusted anywhere."

This follows the CNCF subtitle pattern: [Org name] is [what it is], [doing what], [to achieve what]. One sentence. Concrete. No jargon.

**Mobile:** Same headline. Subtitle condensed or omitted (current pattern already hides the `<p>` on mobile — we keep that).

## Changes

**File:** `src/modules/landing/components/HeroSection.tsx`

1. Replace the `<h1>` text (both mobile and desktop) from "The Foundation for Universal Data Identity" to "Make Data Identity Universal"
2. Replace the desktop subtitle `<p>` text with the new grounding sentence
3. No layout, styling, or structural changes — pure copy swap

