

# Align UOR Mobile Experience with 47G (Velo) Style

## Reference Analysis

The 47G mobile site has these distinctive traits:
- **Navbar**: Minimal — logo left, "MENU" text (not hamburger icon) right. Clean, no clutter.
- **Mobile menu**: Full-screen black overlay. Large serif/display nav links stacked left-aligned, very large type (~32-40px). Secondary links in smaller mono/caps below. Social links as text (not icons). "Close" text button top-right. Footer info at bottom of menu.
- **Content sections**: Full-width, generous whitespace, monospaced labels, editorial feel. Very clean vertical rhythm.
- **Hero**: Full-bleed video/image, centered headline at bottom third, minimal CTA.

## Changes

### 1. Mobile Navbar — Simplify to match 47G
**File**: `src/modules/core/components/Navbar.tsx`
- Replace the hamburger `Menu` icon with the text "MENU" in uppercase mono/tracked style (matching 47G's approach)
- Replace the `X` close icon with "CLOSE" text
- Hide "THE UOR FOUNDATION" wordmark on mobile — show only the logo icon to reduce clutter (47G shows just their compact mark)
- Reduce mobile header height slightly for a tighter, more editorial top bar

### 2. Mobile Menu — Large editorial nav links
**File**: `src/modules/core/components/Navbar.tsx`
- Redesign the full-screen mobile menu to match 47G's style:
  - Left-align nav links instead of center
  - Use much larger display font (~28-36px) for primary nav items
  - Remove the § markers and staggered phi-delay animations — use simpler fade-in
  - Add "Contribute" as a secondary link (smaller, caps, tracked) below main nav
  - Show social links as text labels ("Discord", "GitHub", "LinkedIn") instead of icons, matching 47G
  - Add a subtle horizontal rule separating primary nav from secondary content
  - Place copyright/branding at bottom of menu overlay

### 3. Mobile Hero — Cleaner, more cinematic
**File**: `src/modules/landing/components/HeroSection.tsx`
- Tighten spacing: reduce gap between galaxy orb and headline
- Make the CTA button slightly more minimal (thinner border, less padding)
- Clean up stats bar: ensure crisp, well-spaced labels with tighter tracking

### 4. Mobile Sections — Better vertical rhythm
**Files**: `CommunitySection.tsx`, `ClosingCTASection.tsx`, `EcosystemSection.tsx`, `HighlightsSection.tsx`
- Add more generous vertical padding on mobile sections (matching 47G's spacious feel)
- Ensure section headers use consistent left-alignment on mobile (not centered)

### 5. Mobile Footer — Editorial style
**File**: `src/modules/core/components/Footer.tsx`
- On mobile, stack elements vertically with more breathing room
- Show social links as text labels to match the menu pattern

## Technical Details

All changes are mobile-only (`md:hidden` / responsive classes). Desktop layout remains completely untouched. Changes are purely CSS/layout — no new dependencies or data changes needed.

Key Tailwind patterns:
- `md:hidden` for mobile-only elements, `hidden md:flex/block` for desktop-only
- Large display type: `text-[28px]` or `text-[32px]` with `font-display font-bold`
- Mono labels: `font-mono text-xs uppercase tracking-[0.2em]`
- Left-aligned nav: `items-start text-left` replacing `items-center text-center`

