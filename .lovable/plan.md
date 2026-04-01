

# Foundation × Prime Numbers — Unified Design Integration

## Vision
Infuse the website with the mathematical determinism of Asimov's Foundation and the structural purity of prime numbers. The galaxy animation already evokes the "living mural" from the Foundation title sequence. This plan embeds primes as the hidden structural backbone of spacing, timing, and layout, while deepening the Foundation aesthetic through gold-on-midnight-navy styling and psychohistorical visual language.

## Changes

### 1. Prime-Based Spacing System
**File:** `src/index.css`

Replace the current holo spacing scale (4, 8, 12, 16, 20, 24, 32) with a prime-based scale:

| Token | Current | New (prime) |
|-------|---------|-------------|
| `--holo-space-1` | 4px | 2px |
| `--holo-space-2` | 8px | 3px |
| `--holo-space-3` | 12px | 5px |
| `--holo-space-4` | 16px | 7px |
| `--holo-space-5` | 20px | 11px |
| `--holo-space-6` | 24px | 13px |
| `--holo-space-8` | 32px | 17px |

Add new tokens: `--holo-space-11: 19px`, `--holo-space-13: 23px`, `--holo-space-17: 29px`, `--holo-space-19: 31px`, `--holo-space-23: 37px`, `--holo-space-29: 41px`, `--holo-space-31: 43px`

These are still multiplied by `--holo-scale` for responsiveness.

### 2. Prime Animation Timing
**File:** `tailwind.config.ts`

Update animation durations to prime-based milliseconds:
- `fade-in-up`: 0.8s → **0.7s** (700ms)
- `fade-in`: 0.6s → **0.5s** (500ms)
- Add new keyframes: `fade-in-slow` at **1.1s** (1100ms, prime)

All staggered animation delays across components will use prime intervals: 0.07s, 0.11s, 0.13s instead of 0.1s, 0.12s.

### 3. Prime Grid Columns
**File:** `src/modules/landing/components/ApplicationsSection.tsx`

Currently uses `sm:grid-cols-2`. Keep as-is (2 is prime). No change needed.

**File:** `src/modules/landing/components/PillarsSection.tsx`

Currently uses `md:grid-cols-3`. Keep as-is (3 is prime). No change needed.

**File:** `src/modules/landing/components/HighlightsSection.tsx`

Currently uses `md:grid-cols-3`. Keep as-is (3 is prime). No change needed.

**File:** `src/modules/landing/components/ProjectsShowcase.tsx`

Currently uses `md:grid-cols-3`. Keep as-is (3 is prime). No change needed.

### 4. Faint Prime Sequence Background Layer
**File:** `src/modules/landing/components/HeroSection.tsx`

Add a faint decorative layer behind the hero text showing the prime sequence `2 3 5 7 11 13 17 19 23 29 31 37 41 43...` rendered in ultra-low-opacity (`text-foreground/[0.03]`) monospaced font, creating a "psychohistorical console" texture. This is purely decorative and adds the "mathematical instrument" feel without being gimmicky.

### 5. Prime-Indexed Section Numbering
**Files:** `IntroSection.tsx`, `ApplicationsSection.tsx`, `ProjectsShowcase.tsx`, `CommunitySection.tsx`, `HighlightsSection.tsx`, `PillarsSection.tsx`, `CTASection.tsx`

Add a subtle prime-based section index displayed as a faint monospaced label alongside each section label. Sections are numbered using primes:

| Section | Index |
|---------|-------|
| What is UOR | `§2` |
| Where It Applies | `§3` |
| Featured Projects | `§5` |
| UOR Community | `§7` |
| Highlights | `§11` |
| Get Involved | `§13` |
| Ready to Build | `§17` |

These appear as `text-foreground/[0.12] font-mono text-xs` next to the section label, reinforcing the "system console" aesthetic.

### 6. Gold-Only for Prime Accents
**File:** `src/index.css`

Already using Foundation gold (`--primary: 38 65% 55%`). Add a new utility class:
```css
.prime-gold { color: hsl(var(--primary)); }
.non-prime-neutral { color: hsl(var(--muted-foreground)); }
```

This is for any future data display where prime vs non-prime distinction is needed (e.g., the UNS page record numbering).

### 7. Animation Delay Stagger — Prime Intervals
**Files:** All landing section components

Update all `animationDelay` values to use prime-based increments:
- `0.1s` intervals → `0.07s` or `0.11s` or `0.13s`
- `0.12s` intervals → `0.11s` or `0.13s`
- Starting delays: use `0.17s`, `0.19s`, `0.23s` instead of round numbers

### 8. CTA Section — "Timeline of Inevitability" Divider
**File:** `src/modules/landing/components/CTASection.tsx`

Add a subtle horizontal "timeline" element above the CTA heading: a thin line with gold dots placed at prime-spaced positions (at 2%, 3%, 5%, 7%, 11%, 13% of width), suggesting the "events at prime intervals" concept from the prompt. Very minimal, purely decorative.

### 9. Copy Tone Refinement
**File:** `src/modules/landing/components/HeroSection.tsx`

Update the subtitle from the current description to a more Foundation-declarative tone:
- Current: "A universal mathematical framework for representing and transforming information across all domains."
- New: "Deterministic identity. Content-addressed structure. Indexed by prime decomposition."

This matches the `"Deterministic inference. Indexed by structure."` tone from the prompt.

## Files Modified Summary
| File | Change |
|------|--------|
| `src/index.css` | Prime spacing tokens, utility classes |
| `tailwind.config.ts` | Prime animation durations |
| `HeroSection.tsx` | Prime sequence background layer, copy update |
| `IntroSection.tsx` | Prime section index `§2`, prime animation delays |
| `ApplicationsSection.tsx` | Prime section index `§3`, prime animation delays |
| `ProjectsShowcase.tsx` | Prime section index `§5`, prime animation delays |
| `CommunitySection.tsx` | Prime section index `§7`, prime animation delays |
| `HighlightsSection.tsx` | Prime section index `§11`, prime animation delays |
| `PillarsSection.tsx` | Prime section index `§13`, prime animation delays |
| `CTASection.tsx` | Prime section index `§17`, prime timeline divider, prime animation delays |

## What Stays the Same
- SpaceX font (DM Sans) and uppercase tracking
- Foundation gold/midnight navy color palette (already implemented)
- Galaxy animation colors (already gold-to-purple)
- Hero layout and golden ratio positioning
- All structural component architecture

