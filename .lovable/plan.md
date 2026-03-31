

# Align Page Layout Across All Pages

## Problem
Hero sections use `container max-w-4xl` (56rem / 896px) while body content sections use `container max-w-6xl` (72rem / 1152px). This means the page heading and subtitle sit in a narrower container than the content below, creating a visible left-edge misalignment. Some pages (Interoperability) skip `container` entirely and use raw `max-w-6xl mx-auto px-4`.

## Solution
Standardize every page to use `container max-w-6xl` for both the hero and body sections. Headings and subtitles will naturally left-align with all content below. The subtitle paragraph keeps its existing `max-w-2xl` constraint for readable line length, but within the wider container.

## Files to Modify

**Hero `max-w-4xl` → `max-w-6xl`** (the core fix, ~10 files):

1. `src/modules/core/pages/AboutPage.tsx` — hero div
2. `src/modules/framework/pages/StandardPage.tsx` — hero div
3. `src/modules/projects/pages/ProjectsPage.tsx` — hero div + submit section
4. `src/modules/community/pages/ResearchPage.tsx` — hero div
5. `src/modules/donate/pages/DonatePage.tsx` — hero div
6. `src/modules/projects/components/ProjectDetailLayout.tsx` — hero, cover image, sections, agent instructions, CTA (all `max-w-4xl` → `max-w-6xl`)
7. `src/modules/projects/pages/SandboxPage.tsx` — hero + CTA
8. `src/modules/community/pages/BlogPost1.tsx` — article container
9. `src/modules/community/pages/BlogPost2.tsx` — article container (likely same pattern)
10. `src/modules/interoperability/pages/InteroperabilityPage.tsx` — already `max-w-6xl`, just ensure hero uses `container` class for consistent padding

**Other pages using `max-w-4xl`** (normalize to `max-w-6xl`):
11. `src/modules/agent-tools/pages/ToolRegistryPage.tsx`
12. `src/modules/bitcoin/pages/CoherenceGatePage.tsx`
13. `src/modules/derivation/pages/DerivationLabPage.tsx`

**Blog posts** are long-form reading and may benefit from staying narrower (`max-w-4xl`). I'll keep those at `max-w-4xl` since they are article layouts where narrower columns improve readability.

## What Changes
- Every page hero heading left-aligns perfectly with the body content grid below it
- Consistent `container max-w-6xl` wrapper on all pages
- Subtitle paragraphs remain constrained to `max-w-2xl` or `max-w-3xl` for line length
- Blog posts stay at `max-w-4xl` (reading-optimized)

