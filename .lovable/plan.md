

# Unified Fluid Typography Across the Entire Site

## Problem

The site has inconsistent font sizes. Landing page sections use fluid `clamp()` values, but sub-pages (About, Framework/Standard, Projects, Research, Interoperability, etc.) still use static Tailwind classes (`text-base`, `text-sm`, `text-lg`). This creates a jarring size difference between pages and makes text hard to read on large screens.

## Solution

Define a strict typographic scale as CSS custom properties, then apply them consistently everywhere. Every piece of text on the site falls into one of these roles:

```text
Role                 CSS Variable              Value
─────────────────────────────────────────────────────────────────
Page title (h1)      --text-page-title          clamp(2.25rem, 4vw, 3.5rem)
Section heading (h2) --text-section-heading      clamp(1.875rem, 2.5vw, 3rem)
Card title (h3)      --text-card-title           clamp(1.125rem, 1.2vw, 1.5rem)
Lead paragraph       --text-lead                 clamp(18px, 1.3vw, 24px)
Body / description   --text-body                 clamp(16px, 1.1vw, 20px)
Small body (cards)   --text-body-sm              clamp(15px, 1vw, 18px)
Label / tag          --text-label                clamp(12px, 0.8vw, 14px)
Caption / meta       --text-caption              clamp(11px, 0.7vw, 13px)
```

## Approach

### Step 1: Add CSS custom properties to `src/index.css`

Add the scale above as `:root` variables. This is the single source of truth.

### Step 2: Add Tailwind utilities in `tailwind.config.ts`

Map each variable to a Tailwind class (e.g., `text-fluid-body`, `text-fluid-heading`) so we can use them in className instead of inline styles.

### Step 3: Update landing page sections (8 files)

Replace all inline `style={{ fontSize: 'clamp(...)' }}` with the new Tailwind classes. Files:
- `HeroSection.tsx` — subtitle → `text-fluid-body`, button → `text-fluid-caption`
- `IntroSection.tsx` — lead → `text-fluid-lead`, body → `text-fluid-body`
- `ApplicationsSection.tsx` — body → `text-fluid-body`, cards → `text-fluid-body-sm`, labels → `text-fluid-label`
- `CodeExampleSection.tsx` — body → `text-fluid-body`
- `ProjectsShowcase.tsx` — heading → `text-fluid-heading`, cards → `text-fluid-body-sm`
- `PillarsSection.tsx` — cards → `text-fluid-body-sm`, labels → `text-fluid-label`
- `HighlightsSection.tsx` — titles → `text-fluid-card-title`, labels → `text-fluid-label`
- `CTASection.tsx` — heading → `text-fluid-heading`, body → `text-fluid-body`
- `CommunitySection.tsx` — names → `text-fluid-body-sm`, roles → `text-fluid-label`

### Step 4: Update sub-pages (4 files)

These are the files still using static `text-base` / `text-sm` / `text-lg`:

- **`AboutPage.tsx`** — Hero description, card descriptions, governance bios, resource labels: all `text-base` → `text-fluid-body`; card titles `text-lg` → `text-fluid-card-title`; section headings `text-2xl md:text-3xl` → `text-fluid-heading`; sub-labels `text-sm` → `text-fluid-label`
- **`StandardPage.tsx`** (Framework) — Same pattern: all `text-base` body text → `text-fluid-body`; `text-sm` labels → `text-fluid-label`; `text-lg` card titles → `text-fluid-card-title`; section headings → `text-fluid-heading`
- **`ProjectsPage.tsx`** — Project descriptions, maturity criteria, form labels: `text-base` → `text-fluid-body`; `text-sm` → `text-fluid-label`
- **`ResearchPage.tsx`** — Body text → `text-fluid-body`

### Step 5: Update layout components (2 files)

- **`Footer.tsx`** — Already uses clamp; normalize to new classes
- **`Navbar.tsx`** — Link text → `text-fluid-label`

## Technical Detail

The CSS variables use `clamp(min, preferred, max)` where the preferred value is viewport-relative (`vw`). This means:
- On a 1440px screen, body text renders at ~16px
- On a 2560px screen, body text grows to 20px
- On a 375px phone, body text stays at 16px minimum

No JavaScript needed. Pure CSS. Works everywhere.

