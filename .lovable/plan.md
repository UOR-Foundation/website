

# Wider Content + Golden Ratio Spacing

## What changes

### 1. Widen the content area site-wide

Currently all sections use `max-w-7xl` (80rem / 1280px). Upgrade to `max-w-[1400px]` to use more screen real estate while keeping comfortable margins. This applies to:

- **Landing sections** (8 files): IntroSection, ApplicationsSection, ProjectsShowcase, PillarsSection, HighlightsSection, CommunitySection, CTASection, HeroSection
- **Sub-pages** (5 files): AboutPage, StandardPage, ProjectsPage, ResearchPage, InteroperabilityPage
- **Layout components**: PageShell (header + main), Navbar, Footer
- **Other pages**: SemanticWebPage, UnsPage, SparqlEditorPage, etc.

Inner text blocks currently capped at `max-w-4xl` (896px) will move to `max-w-5xl` (1024px) for better use of the wider container.

### 2. Golden ratio spacing system

Define CSS custom properties for section spacing based on φ (1.618):

```text
Variable                    Value
──────────────────────────────────────
--section-gap-sm            clamp(3rem, 5vw, 4.854rem)     ← 3rem × φ
--section-gap-md            clamp(5rem, 8vw, 7.854rem)     ← ~5rem × φ  
--section-gap-lg            clamp(6rem, 10vw, 10rem)       ← hero/CTA
--content-gap-sm            1rem                            ← ~0.618rem × φ
--content-gap-md            1.618rem
--content-gap-lg            2.618rem                        ← φ²
```

Apply these to all section `py-*` values and internal spacing (`mb-*`, `mt-*`, `gap-*`) so vertical rhythm follows golden ratio proportions consistently.

### 3. Files to update (~20 files)

**CSS**: `src/index.css` — add golden ratio spacing variables

**Tailwind config**: `tailwind.config.ts` — map variables to utilities like `py-section`, `gap-golden`

**Landing sections** (8 files): Replace `py-24 md:py-32` with golden-ratio section padding; replace internal margins with golden-ratio gaps

**Sub-pages** (5+ files): Same treatment for AboutPage, StandardPage, ProjectsPage, ResearchPage, InteroperabilityPage

**Shared components**: PageShell, Navbar, Footer — widen containers

**Module pages**: UnsPage, SemanticWebPage, SparqlEditorPage, and any others using `max-w-7xl` or narrower

### Technical detail

Golden ratio values:
- φ = 1.618
- Section vertical padding: `py-[clamp(5rem,8vw,7.854rem)]` (≈ base × φ)
- Gap between heading and body: `1.618rem`
- Gap between body paragraphs: `1rem` (φ × 0.618)
- Gap between section label and rule: `0.618rem`
- CTA section gets largest padding: `py-[clamp(6rem,10vw,10rem)]`

Container change: `max-w-7xl` → `max-w-[1400px]` everywhere, inner text `max-w-4xl` → `max-w-5xl`.

