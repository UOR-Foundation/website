

# Add Color Depth and Visual Richness to the Dark Theme

## Problem
The site is currently almost entirely monochrome: white text on flat black. While this is clean, it feels bleak compared to sites like Super Protocol that use strategic color accents, subtle background gradients, and glowing elements to create depth and energy against dark backgrounds.

## What Super Protocol Does Well
- **Teal/cyan accent color** on CTAs, glowing horizon lines, and interactive elements
- **Subtle background variation** between sections (not the same flat black everywhere)
- **Colored gradients and glows** that add warmth and depth
- **Accent-colored section dividers** instead of plain gray lines

## Changes

### 1. Introduce an Accent Color System
**File:** `src/index.css`

- Define a teal/cyan accent (`--primary: ~180 70% 50%`) as the accent color, replacing the current blue which is barely visible anywhere
- Add a secondary warm accent (the galaxy's existing purple/magenta) for variety
- Use these colors on: section labels, divider lines, icon colors, CTA buttons, maturity dots

### 2. Color the Section Icons and Labels
**File:** `src/modules/landing/components/ApplicationsSection.tsx`

- Change icons from `text-foreground/40` to use the accent color (teal/cyan), making them pop
- Give section labels (`"Where It Applies"`) the accent color instead of `text-foreground/40`

**File:** `src/modules/landing/components/PillarsSection.tsx`

- Same treatment: colored icons and section label

**File:** `src/modules/landing/components/IntroSection.tsx`, `ProjectsShowcase.tsx`, `HighlightsSection.tsx`, `CommunitySection.tsx`

- Section labels get accent color treatment

### 3. Accent Divider Lines
**File:** `src/index.css`

- Update `rule-accent` gradient to use the new teal/cyan
- Replace flat `bg-foreground/8` dividers with subtle gradient dividers in key sections (intro, applications) for visual interest

### 4. Subtle Background Variation
**File:** `src/index.css`

- Keep `--background` as the base near-black
- Make `--section-dark` slightly different (a touch of blue/purple tint rather than pure darker black) to create subtle depth between alternating sections
- Add a very subtle radial gradient glow on the CTA section background (like Super Protocol's horizon glow)

### 5. CTA Section Glow
**File:** `src/modules/landing/components/CTASection.tsx`

- Add a subtle radial gradient behind the heading (teal/cyan glow fading to transparent) for a focal point effect similar to Super Protocol's earth horizon

### 6. Primary Button Accent Color
**File:** `src/index.css`

- Update `.btn-primary` hover state to use the accent teal instead of inverting to pure white, giving it the "Try now for free" teal button feel from Super Protocol
- Keep `.btn-outline` as the white border variant

### 7. Maturity Dots and Status Colors
**File:** `src/modules/landing/components/ProjectsShowcase.tsx`

- The `Graduated` dot already uses `bg-primary`; this will automatically pick up the new accent color
- Ensure the colored dots are visible and vibrant

### 8. Footer Accent Touch
**File:** `src/modules/core/components/Footer.tsx`

- Change the copyright divider to use the accent gradient line

## Files Modified
| File | Change |
|------|--------|
| `src/index.css` | Accent color tokens, btn-primary hover, rule-accent update, CTA glow utility |
| `ApplicationsSection.tsx` | Colored icons and section label |
| `PillarsSection.tsx` | Colored icons and section label |
| `IntroSection.tsx` | Accent section label |
| `ProjectsShowcase.tsx` | Accent section label |
| `HighlightsSection.tsx` | Accent section label |
| `CommunitySection.tsx` | Accent section label |
| `CTASection.tsx` | Radial glow background behind heading |
| `Footer.tsx` | Gradient divider line |

## What Stays the Same
- Galaxy animation colors (already vibrant purple/blue/magenta)
- Overall dark-first identity and SpaceX layout
- Typography system
- All content/copy

