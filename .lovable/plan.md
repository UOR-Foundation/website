

## Mobile Hero & Navigation Refinement

### Problems Identified

1. **Navbar logo too small on mobile** (28px / w-7). Feels cramped against the text. Should be 36px minimum for visual authority.
2. **Navbar height too short on mobile** (4.5rem = 72px). With a small logo + small text, it feels thin and unfinished.
3. **Mobile menu is a dropdown, not a full-screen overlay.** It uses `max-h` animation and sits below the navbar with a translucent background. This feels like an afterthought, not an intentional experience. Best-in-class mobile menus (Linear, Stripe, Vercel) take over the entire screen with large, generous touch targets and clear visual hierarchy.
4. **Galaxy animation container on mobile** (`min(32svh, 70vw)`) creates excessive whitespace above and below on tall phones (the screenshot shows a big gap between navbar and galaxy, and between galaxy and headline). The vertical spacing is not balanced.
5. **CTA buttons on mobile** are full-width (good), but the gap between headline and buttons feels too large on some devices, while bottom padding is inconsistent.

### Plan

#### 1. Navbar — Larger Logo & Bolder Presence (Navbar.tsx)
- Increase mobile logo from `w-7 h-7` to `w-9 h-9` (36px)
- Increase mobile logo text from `text-[0.875rem]` to `text-[0.9375rem]` (15px)
- Increase hamburger icon from 22px to 24px
- Keep navbar height at 4.5rem (72px) — the larger logo fills it better

#### 2. Full-Screen Mobile Menu (Navbar.tsx)
- Replace the dropdown `max-h` approach with a true full-screen overlay (`fixed inset-0`)
- Menu covers entire viewport below the navbar
- Nav links get larger text (`text-lg`), generous padding (`py-4`), and left-aligned layout
- Active link gets a subtle left border accent instead of background color
- Social icons and Donate button anchored at the bottom with proper spacing
- Smooth fade-in/slide-down animation using opacity + translateY
- Body scroll locked when menu is open (add overflow-hidden to body)

#### 3. Hero Section — Tighter Mobile Spacing (HeroSection.tsx)
- Reduce mobile galaxy vertical padding from `clamp(1.5rem, 4vh, 4rem)` to `clamp(0.5rem, 2vh, 2rem)` 
- Increase galaxy size on mobile from `min(32svh, 70vw)` to `min(38svh, 75vw)` — fills the space better
- Reduce gap between headline and CTAs from `clamp(2rem, 4.5vh, 4rem)` to `clamp(1.25rem, 3vh, 3rem)` on mobile
- Adjust bottom padding to `clamp(2rem, 5vh, 4rem)` — golden ratio proportion relative to top

#### 4. Golden Ratio Proportions
The three rows of the hero grid on mobile should approximate:
- Row 1 (navbar spacer): 72px
- Row 2 (galaxy): ~38% of remaining height
- Row 3 (copy + CTA): ~62% of remaining height (φ ratio: 62/38 ≈ 1.618)

This is achieved naturally by the `1fr` middle row shrinking while the copy section gets more comfortable bottom padding.

### Files Modified
- `src/modules/core/components/Navbar.tsx` — larger logo, full-screen mobile menu
- `src/modules/landing/components/HeroSection.tsx` — tighter mobile spacing, larger galaxy

