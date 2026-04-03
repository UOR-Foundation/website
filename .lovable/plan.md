

# Spacing & Proportion Audit — Site-Wide Consistency Pass

## What This Fixes

Every page except Home currently has inconsistent hero padding, section spacing, typography sizing, and CTA layout. This pass standardizes all pages to a single set of golden-ratio-based spacing tokens and fluid typography, so the entire site feels like one coherent product.

## The Standard (derived from Framework + Community pages — the best current examples)

```text
HERO            pt-28 md:pt-36  pb-golden-lg (new)    hero-gradient
CONTENT A       py-section-sm   bg-background         border-b border-border/40
CONTENT B       py-section-sm   bg-background          border-b border-border/40
CTA             py-section-sm   section-dark
```

- All containers: `container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]`
- All page titles: `text-fluid-page-title`
- All section headings: `text-fluid-heading`
- All card titles: `text-fluid-card-title`
- All body text: `text-fluid-body` or `text-fluid-lead`
- All labels: `text-fluid-label`
- Hero subtitle gap: `mt-6`, CTA button gap: `mt-8`
- CTA sections centered, `max-w-6xl text-center`

## Changes Per Page

### 1. Home (`IndexPage`) — No changes
Already correct. Hero is full-viewport, subsequent sections use `py-section-md`.

### 2. Framework (`StandardPage`) — Minor
- Already well-standardized. No changes needed.

### 3. Community (`ResearchPage`) — Minor
- Already well-standardized. No changes needed.

### 4. About (`AboutPage`)
- Fix duplicate `px-6 md:px-[5%]...` on hero container (line 15)
- Add hero subtitle `mt-6` consistency (currently `mt-5`)
- Hero `pb` currently `pb-8 md:pb-12` — standardize to match others
- Content section already uses `py-section-sm` — good

### 5. Donate (`DonatePage`) — Major overhaul
- Hero: replace `text-4xl md:text-5xl` → `text-fluid-page-title`; fix `mt-8` → `mt-6` for subtitle; `mt-10` → `mt-8` for buttons
- Content A (`py-8 md:py-14`): replace with `py-section-sm`; heading `text-2xl md:text-3xl` → `text-fluid-heading`
- Content B (`py-8 md:py-14`): replace with `py-section-sm`; heading → `text-fluid-heading`
- CTA (`py-12 md:py-20`): replace with `py-section-sm section-dark`; heading → `text-fluid-heading`; body → `text-fluid-body`
- Replace all `text-base` → `text-fluid-body`, `text-lg` → `text-fluid-lead`
- Add `border-b border-border/40` between Content A and B for visual separation
- Standardize card internal text sizes to fluid tokens

### 6. Semantic Web (`SemanticWebPage`) — Major overhaul
- Hero: replace `text-4xl md:text-5xl` → `text-fluid-page-title`; subtitle `text-base md:text-lg` → `text-fluid-body`; blockquote text `text-lg md:text-xl` → `text-fluid-lead`
- Content A (`py-8 md:py-14`): replace with `py-section-sm`; headings `text-2xl md:text-3xl` → `text-fluid-heading`; sub-heading `text-xl md:text-2xl` → `text-fluid-card-title` or keep smaller
- Content B (`py-8 md:py-14`): replace with `py-section-sm`; heading → `text-fluid-heading`
- CTA (`py-16 md:py-24`): replace with `py-section-sm`; heading → `text-fluid-heading`
- Replace all hardcoded `text-sm`, `text-base`, `text-lg` with fluid equivalents
- Label text: `text-sm md:text-base` → `text-fluid-label`
- Layer card internal text: `text-xs` → `text-fluid-caption`, `text-base` → `text-fluid-body`
- Comparison table text: standardize to `text-fluid-body` / `text-fluid-caption`
- Add `section-dark` to CTA for visual consistency

### 7. Projects (`ProjectsPage`) — Minor
- Hero already standardized
- Content A uses `py-section-sm` — good
- Content B uses `section-dark py-section-sm` — good
- No changes needed

## Summary of Tokens Applied Everywhere

| Element | Token |
|---------|-------|
| Hero top padding | `pt-28 md:pt-36` |
| Hero bottom padding | `pb-8 md:pb-12` |
| Hero title → CTA gap | subtitle `mt-6`, buttons `mt-8` |
| Section vertical padding | `py-section-sm` |
| Page title | `text-fluid-page-title` |
| Section heading | `text-fluid-heading` |
| Card title | `text-fluid-card-title` |
| Body / descriptions | `text-fluid-body` |
| Lead paragraphs | `text-fluid-lead` |
| Labels / tags | `text-fluid-label` |
| Captions | `text-fluid-caption` |
| Container | `container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]` |
| CTA sections | `section-dark py-section-sm`, centered `max-w-6xl` |

## Files Modified
1. `src/modules/core/pages/AboutPage.tsx` — fix duplicate padding class, minor spacing tweaks
2. `src/modules/donate/pages/DonatePage.tsx` — full typography + spacing standardization
3. `src/modules/framework/pages/SemanticWebPage.tsx` — full typography + spacing standardization

Three files changed. No new files created. No content removed.

