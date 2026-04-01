

# Mobile Experience Refinement — Crisp, Golden, Magical

## Issues Found

From the mobile screenshots (390×844):

1. **Hero section**: The galaxy animation overlaps heavily with headline text — readability is compromised. The text runs to 6 lines ("YOUR / UNIVERSAL / COORDINATE / SYSTEM / FOR / INFORMATION") when it should be 3. The `max-w-[55%]` constraint forces the text too narrow on mobile. The "Explore Projects" CTA is barely visible, cut off at the bottom.

2. **Hero vertical balance**: Too much empty space above the galaxy (the `basis-[38%]` spacer). The galaxy and text compete for the same left-aligned area.

3. **Mobile menu**: Functional but lacks the "magical" quality — no prime/Foundation theming. The nav links are small (15px) and feel sparse. Could use a subtle prime constellation or golden ratio breathing animation.

4. **Footer**: The nav links overflow horizontally ("ABOUT" is cut off). Social icons are cramped.

5. **Section spacing**: The golden ratio spacing system exists but some sections feel tight on mobile — particularly the community grid (people overflow in pairs).

6. **Container padding**: Currently `2rem` from Tailwind config but the hero uses `px-6` (1.5rem). Some inconsistency.

## Plan

### 1. Hero Section Mobile Overhaul (`HeroSection.tsx`)
- On mobile: center the galaxy above the text instead of right-aligned overlap
- Use a stacked vertical layout: navbar → galaxy (centered, constrained) → headline → subtitle → CTA
- Headline: `text-[clamp(2.2rem,8vw,3rem)]` stays but remove `max-w-[55%]` on mobile (use full width)
- Move galaxy to a contained size on mobile: `w-[min(65vw,280px)]` centered
- Reduce the `basis-[38%]` spacer to something smaller on mobile
- Ensure CTA button is fully visible above the fold

### 2. Mobile Menu Enhancement (`Navbar.tsx`)
- Add a subtle, slow-rotating PrimeGrid canvas as background behind the mobile menu (very low opacity, gold dots)
- Increase nav link sizes on mobile: `text-[17px]` with more generous `py-4` padding
- Add a golden-ratio breathing animation to the menu transition — links stagger in with φ-based delays (current 50ms gaps → 80ms with φ scaling)
- Add a faint section number before each nav item (§2, §3, etc.) to echo the Foundation theme
- Improve the transition: add a subtle scale-up from 0.98 to 1.0 on the entire menu

### 3. Footer Mobile Fix (`Footer.tsx`)
- Wrap footer nav items to prevent horizontal overflow — use `flex-wrap` or stack vertically on mobile
- Increase social icon tap targets

### 4. Community Section Mobile (`CommunitySection.tsx`)
- Use `grid grid-cols-2` instead of `flex-wrap` on mobile for even 2-column layout
- Increase hexagon size slightly on mobile for better photo visibility

### 5. Global Mobile Polish (`index.css` + components)
- Ensure consistent `px-6` (24px) container padding on mobile across all sections
- Add a CSS media query to reduce `--section-py-md` slightly on small screens so content doesn't feel over-spaced

## Files Modified
- `src/modules/landing/components/HeroSection.tsx` — mobile-first hero layout
- `src/modules/core/components/Navbar.tsx` — enhanced mobile menu with prime theming
- `src/modules/core/components/Footer.tsx` — fix mobile overflow
- `src/modules/landing/components/CommunitySection.tsx` — mobile grid improvement
- `src/index.css` — mobile spacing tuning

