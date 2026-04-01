

# Site-Wide Typography & Layout Expansion

## Problem

The entire site uses `container max-w-6xl` (1152px) which on a 2588px viewport wastes ~55% of the screen width. Body text is `text-base` (16px) and section descriptions use `max-w-3xl` (768px) — creating a narrow text column that feels cramped on large screens. The user's screenshot confirms: sections like "What is UOR" and "Where It Applies" look small and lost in the dark background.

## Solution: Two-Pronged Approach

### 1. Global Container Width Upgrade

Replace `max-w-6xl` (1152px) with `max-w-7xl` (1280px) across all pages, and use proportional horizontal padding (`px-6 md:px-10 lg:px-[5%] xl:px-[6%]`) so content breathes at every viewport size.

Inner text blocks currently capped at `max-w-3xl` (768px) will be widened to `max-w-4xl` (896px) so paragraphs fill more of the available space.

### 2. Fluid Typography Scale

Replace static `text-base` / `text-lg` / `text-xl` with `clamp()` values so text grows proportionally with the viewport:

| Element | Current | New |
|---------|---------|-----|
| Section labels | `text-xs` (12px) | `clamp(12px, 0.8vw, 14px)` |
| Body paragraphs | `text-base` (16px) | `clamp(16px, 1.1vw, 20px)` |
| Lead paragraphs | `text-lg/xl` (18-20px) | `clamp(18px, 1.3vw, 24px)` |
| Section headings (h2) | `text-3xl/4xl` | `clamp(1.875rem, 2.5vw, 3rem)` |
| Card titles (h3) | `text-lg` | `clamp(1.125rem, 1.2vw, 1.5rem)` |
| Card body text | `text-[0.938rem]` | `clamp(15px, 1vw, 18px)` |

## Files to Modify

**Homepage sections (6 files):**
- `IntroSection.tsx` — container → `max-w-7xl`, text blocks → `max-w-4xl`, fluid body text
- `ApplicationsSection.tsx` — container → `max-w-7xl`, fluid text sizes, card padding increase
- `ProjectsShowcase.tsx` — container → `max-w-7xl`, fluid heading/body sizes
- `CommunitySection.tsx` — container → `max-w-7xl`
- `HighlightsSection.tsx` — container → `max-w-7xl`, fluid card titles
- `PillarsSection.tsx` — container → `max-w-7xl`, fluid text
- `CTASection.tsx` — container → `max-w-7xl`, fluid heading/body
- `CodeExampleSection.tsx` — container → `max-w-7xl`

**Core layout (2 files):**
- `Footer.tsx` — container → `max-w-7xl`
- `PageShell.tsx` — `max-w-6xl` → `max-w-7xl`

**Other pages (4 files):**
- `AboutPage.tsx` — container → `max-w-7xl`, fluid text
- `StandardPage.tsx` (Framework) — container → `max-w-7xl`, text blocks → `max-w-4xl`, fluid text
- `ProjectsPage.tsx` — container → `max-w-7xl`
- `InteroperabilityPage.tsx` — container → `max-w-7xl`

**Navbar** — increase logo wordmark clamp max to `15px`, increase padding on links

## Approach

Each file gets the same mechanical changes:
1. `max-w-6xl` → `max-w-7xl`
2. `max-w-3xl` on text blocks → `max-w-4xl`
3. `max-w-2xl` on text blocks → `max-w-3xl`
4. Static text sizes → fluid `clamp()` equivalents using inline `style` where Tailwind classes don't support clamp, or using arbitrary values like `text-[clamp(16px,1.1vw,20px)]`
5. Increase section padding where needed for better breathing room

