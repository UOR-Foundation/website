

# Mobile Optimization Plan

## Problem
The site needs a comprehensive mobile polish pass. Key issues:
- Hero section galaxy sizing may be too large on small screens, pushing copy below fold
- Hero heading `text-[clamp(1.75rem,3.6vw,3.75rem)]` uses `vw` which is tiny on mobile (3.6vw on 375px = 13.5px)
- `pt-24` on hero sections (96px) may cause overlap with the 72px navbar on some pages
- CTASection team grid `grid-cols-2` with 14px avatar images gets cramped
- Research page category pills overflow horizontally without scroll affordance
- ProjectsPage project cards with `p-7 md:p-9` padding may be heavy on mobile
- Footer grid collapses to single column but spacing could be tighter
- Various sections have inconsistent mobile vertical padding
- Donate page inner sections still use `max-w-4xl` instead of `max-w-6xl`

## Changes

### 1. HeroSection.tsx — Mobile-optimized hero
- Fix heading clamp: `text-[clamp(1.75rem,7vw,3.75rem)]` (7vw on 375px = 26.25px, good mobile size)
- Reduce galaxy container on mobile: `w-[min(32svh,70vw)] h-[min(32svh,70vw)] md:w-[min(40svh,58vw)] md:h-[min(40svh,58vw)]` — smaller galaxy, more room for copy
- Increase bottom padding on mobile for breathing room

### 2. index.css — Global mobile refinements
- Adjust container mobile padding from `1.25rem` to `1.5rem` (24px) for more breathing room on edges
- Ensure buttons on mobile have proper spacing

### 3. AboutPage.tsx — Mobile spacing
- Hero `pt-28` on mobile (prevent navbar overlap), keep `md:pt-36`
- Board member cards: reduce image size on mobile, ensure text doesn't overflow

### 4. StandardPage.tsx — Mobile spacing
- Hero `pt-28` on mobile
- MCP client tabs: ensure horizontal scroll on mobile with `overflow-x-auto`

### 5. ProjectsPage.tsx — Mobile polish
- Hero `pt-28` on mobile
- Project card padding: `p-5 md:p-9` (reduce mobile padding)
- Collapsible category padding: `px-4 py-4 md:px-8 md:py-6`

### 6. ResearchPage.tsx — Mobile polish  
- Hero `pt-28` on mobile
- Category pills: wrap with `overflow-x-auto` and scrollable container
- Event cards: stack date below content on mobile

### 7. DonatePage.tsx — Mobile polish
- Hero `pt-28` on mobile
- Fix inner sections `max-w-4xl` → `max-w-6xl` for alignment consistency

### 8. CTASection.tsx — Mobile team grid
- Team member avatars: slightly larger on mobile (`w-16 h-16` vs current `w-14 h-14`)
- Reduce description text overflow risk

### 9. InteroperabilityPage.tsx — Mobile hero
- Hero `pt-28` on mobile (already has `pt-28`, keep it)

### 10. Footer.tsx — Mobile tightening
- Reduce divider margin on mobile
- Tighten grid gap on mobile

### 11. Navbar.tsx — Mobile menu polish
- Ensure mobile menu backdrop is opaque enough for readability
- Ensure proper safe area for notched devices

## Technical Approach
- All changes use responsive Tailwind utilities (mobile-first)
- Golden ratio spacing: base 16px → 26px (×φ) → 42px (×φ) → 68px (×φ)
- Consistent `pt-28 md:pt-36` hero padding across all pages
- Consistent `container max-w-6xl` on all sections

