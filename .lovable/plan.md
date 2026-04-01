

# SpaceX-Inspired Design Overhaul for UOR Foundation

## What SpaceX Does Differently

SpaceX's design language is defined by:
- **Full-bleed dark backgrounds** with dramatic imagery filling entire viewport sections
- **Sans-serif, all-uppercase headlines** in a clean geometric typeface (not serif)
- **Minimal chrome** — no rounded cards, no borders, no pill buttons; content floats on dark space
- **Full-viewport snap sections** — each section is 100vh, scroll-snapped
- **Stark white text on dark** with very high contrast
- **Minimal UI density** — enormous whitespace, one message per screen
- **Transparent navbar** with uppercase letter-spaced links, no pill borders
- **CTAs as bordered rectangles** (not rounded pills) with uppercase text and arrow icons
- **Cinematic scroll transitions** — content fades/slides in as you scroll

## Design Direction

Transform the UOR Foundation site from its current editorial/academic aesthetic into a bold, cinematic, cutting-edge feel while preserving the existing content and galaxy animation as the centerpiece.

## Plan

### 1. Global Color System — Dark-First Identity
**Files:** `src/index.css`

- Change the default (light mode) palette to a dark palette: near-black backgrounds (`~hsl(220, 20%, 4%)`), white foreground text
- Remove the light/dark mode distinction — the site becomes permanently dark, like SpaceX
- Update `--section-dark` tokens to be even darker for contrast sections
- Change `--primary` to a cooler, more technical tone (keep current blue or shift slightly)
- Remove the `hero-gradient` light gradient — hero background becomes transparent/black

### 2. Typography — Sans-Serif Headlines, Uppercase Labels
**Files:** `src/index.css`, `tailwind.config.ts`

- Switch heading font from Playfair Display (serif) to DM Sans or Inter (geometric sans-serif) for a more technical, SpaceX-like feel
- Apply uppercase + wide letter-spacing to all section headings (not just labels)
- Increase headline sizes for more dramatic impact

### 3. Navbar — Transparent, Minimal, Uppercase
**Files:** `src/modules/core/components/Navbar.tsx`, `src/index.css`

- Remove pill borders from nav items — plain uppercase text links with letter-spacing
- Keep transparent background, use white text always (dark site)
- Simplify the scrolled state — subtle backdrop blur only, no visible border
- Make donate button a bordered rectangle instead of rounded pill

### 4. Hero Section — Full-Bleed Cinematic
**Files:** `src/modules/landing/components/HeroSection.tsx`

- Remove the light gradient background — pure dark/transparent
- Left-align the headline text (SpaceX style) instead of center
- Make headline uppercase with wider letter-spacing
- Change CTA buttons to rectangular bordered style with uppercase text + arrow
- Keep the galaxy animation centered but let the text overlay sit left-aligned beneath/beside it

### 5. Landing Page Sections — Full-Width Dark Panels
**Files:** All landing section components

- **IntroSection:** Remove card-like container — text floats on dark background with generous vertical padding (py-24 md:py-32)
- **ApplicationsSection:** Remove rounded bordered cards — use minimal dividers or no borders; icons and text on dark background
- **ProjectsShowcase:** Remove card borders — content separated by subtle horizontal rules or pure spacing
- **CommunitySection:** Keep photos, increase spacing, remove borders from photo circles
- **HighlightsSection:** Make images full-width or larger aspect ratio with overlay text (cinematic)
- **PillarsSection:** Remove rounded cards — clean text blocks with horizontal dividers
- **CTASection:** Full-viewport dark section with large centered text and bordered rectangular CTA

### 6. Buttons — Rectangular, Bordered, Uppercase
**Files:** `src/index.css`

- `.btn-primary`: Remove `rounded-full` → use `rounded-none` or subtle `rounded-sm`; uppercase text, letter-spacing, border style
- `.btn-outline`: Same rectangular treatment with 1px white border on dark
- Add arrow icon integration as standard

### 7. Footer — Darker, Cleaner
**Files:** `src/modules/core/components/Footer.tsx`

- Already dark — simplify further, remove circular icon borders, use plain icon links
- Minimal horizontal rule separator

### 8. Scroll Behavior — Section Snap (Optional Enhancement)
**Files:** `src/modules/landing/pages/IndexPage.tsx`, `src/index.css`

- Add CSS `scroll-snap-type: y mandatory` to the landing page container
- Each section gets `scroll-snap-align: start` and `min-h-screen`
- This creates the SpaceX full-viewport section experience

### 9. Page-Wide Consistency
**Files:** All page components (About, Projects, Standard, UNS, etc.)

- Since `Layout` wraps everything and we're changing the global tokens, all pages automatically inherit the dark background and new typography
- Update any remaining light-specific styles in individual pages
- Ensure the UNS page and other module pages use the same dark, minimal card treatment

### 10. Scroll Progress Indicator
**Files:** `src/modules/core/components/ScrollProgress.tsx`

- Update dot colors for dark background context (brighter active state)

## Summary of Affected Files

| Area | Files |
|------|-------|
| Global tokens & styles | `src/index.css`, `tailwind.config.ts` |
| Navbar | `Navbar.tsx` |
| Hero | `HeroSection.tsx` |
| Landing sections | `IntroSection.tsx`, `ApplicationsSection.tsx`, `ProjectsShowcase.tsx`, `CommunitySection.tsx`, `HighlightsSection.tsx`, `PillarsSection.tsx`, `CTASection.tsx` |
| Footer | `Footer.tsx` |
| Scroll | `ScrollProgress.tsx` |
| Layout | `Layout.tsx`, `IndexPage.tsx` |

## What Stays the Same
- Galaxy animation (already works beautifully on dark)
- All content/copy
- Site structure and routing
- Mobile responsiveness patterns
- Donate popup functionality

