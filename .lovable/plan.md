

## TechCrunch-Style Editorial Layout — Adaptive at Every Width

The article currently caps at ~1040px wide and uses small body text (18-20px), leaving huge empty margins on a 1837px screen. I'll rebuild the layout so it scales beautifully across all viewports — from phone to ultra-wide — with proportional typography, a sidebar-style reading column on wide screens, and a much more balanced hero.

### What the user will see

**Hero (large screens)**
- Hero image grows: from 50/50 split today → 58/42 (image/text) on `xl`, with image min-height growing to ~720px on 1440px+, ~820px on 1920px+.
- Headline scales up: max font size from 4rem → 5.5rem on 1920px+, with tighter measure (16ch) for dramatic ragging.
- Right-panel padding grows proportionally (clamp 2rem → 5rem) so kicker, title, byline breathe.

**Body (large screens)**
- Reading column widens: from `min(1040px, 80ch)` → `clamp(680px, 62vw, 1280px)` on lg+, capped at ~75ch for comfortable measure but ~30% wider than today.
- Body text scales: 18px → 21px (1440px), 23px (1920px). Lead paragraph: 20px → 26px (1920px).
- Side padding shrinks proportionally on ultra-wide so the column sits naturally without feeling stranded; floating share rail stays in left gutter.
- Optional drop-cap on first paragraph for editorial feel.

**Mobile / tablet**
- Unchanged behavior (already tuned). Verified breakpoints stay 16px → 17px → 18px.

### Files to change

1. **`src/modules/core/components/ArticleLayout.tsx`**
   - Hero grid: `lg:grid-cols-[58%_42%]`, raise `min-h` tiers (520 → 640 → 720 → 820).
   - Title clamp: `clamp(2rem, 3.6vw, 5.5rem)`, max-width `16ch xl:18ch`.
   - Right panel padding: `clamp(2rem, 4vw, 5rem)`.
   - Body wrapper: `maxWidth: "clamp(680px, 62vw, 1280px)"`.
   - Outer padding tiers: `px-4 sm:px-6 md:px-10 lg:px-16 xl:px-24 2xl:px-32`.
   - Footer/related grid uses same fluid maxWidth.

2. **`src/index.css` — `.prose-article` block**
   - Add `@media (min-width: 1280px)` step (20px body, 22px first paragraph).
   - Bump 1440px tier: 21px body / 24px lead.
   - Bump 1920px tier: 23px body / 26px lead, line-height 1.6.
   - Add subtle drop-cap rule on `.prose-article > p:first-of-type::first-letter` (optional, 1440px+).
   - Increase H2 size scaling at large breakpoints (clamp).

### Coverage across the site

The website's main page archetypes already use one of two systems:
- **Article pages** (blog posts, project deep-dives) → all route through `ArticleLayout`. Fixing it covers every blog/project page in one shot.
- **Marketing/info pages** (UNS, Framework, About, Projects index) → already use the fluid `text-fluid-*` tokens defined in `:root` (`--text-page-title`, `--text-body`, etc.). I'll bump the upper bounds of those tokens so they also scale on 1440px+ and 1920px+ screens (e.g., `--text-body` max from 20px → 23px). One token edit lifts the entire site.

### Verification

After implementation, I'll snapshot the article at 1366×768, 1920×1080, and 390×844 to confirm layout balance and read each capture for clipping, alignment, and breathing room.

