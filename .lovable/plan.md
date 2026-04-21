

# TechCrunch-style Article Header

Reshape the shared `ArticleLayout` so every blog post and project page reads with the same crisp, editorial cadence as TechCrunch — without changing colors or content. One file change cascades to all four blog posts and all project detail pages.

## What changes (visually)

**Before:** Centered split hero, both columns inside an 1180px container, rounded image with shadow, deck below headline, back link below.

**After:** A true two-panel masthead that runs edge-to-edge.

```text
┌────────────────────────────┬───────────────────────────┐
│                            │                           │
│                            │  KICKER         [share]   │
│      FULL-BLEED IMAGE      │                           │
│      (left half, no        │  Big bold headline,       │
│       rounding, no         │  three lines, tight       │
│       shadow, flush         │  leading                  │
│       to viewport edge)    │                           │
│                            │  Author · time · date     │
│                            │                           │
│  IMAGE CREDITS: …          │                           │
└────────────────────────────┴───────────────────────────┘
                ── thin rule ──
            820-px reading column below
```

Specifics:
- **Image:** square corners, no shadow, no border, `object-cover`. Aspect roughly 4:5 on desktop, 16:10 on mobile. Bleeds to the left edge of the viewport (no container padding on the left at `lg+`).
- **Right panel:** solid `bg-card` block (TC uses brand green; we keep our existing card color so it stays on-brand). Square corners, flush to image, runs to the right viewport edge. Generous padding (`p-10 lg:p-14`).
- **Kicker:** small caps, with a short underline rule above it (TC's signature small bracket line).
- **Headline:** display font, bold, `clamp(2.5rem, 5vw, 4rem)`, tight `1.05` leading, balanced wrap.
- **Share row:** top-right of the right panel — Facebook, X, LinkedIn, Reddit, Email, Copy-link icons (lucide). Copy-link writes `window.location.href` to clipboard with a toast.
- **Byline row:** lower in the right panel — `Author — time · date` in muted text. Add an optional `author` prop (defaults to "UOR Foundation").
- **Image credit:** small uppercase mono caption sitting under the image, left-aligned (`IMAGE CREDITS: …`).
- **Mobile (`<lg`):** image stacks on top full-width, then the colored panel below it — same content, same order.
- **Back link:** moves out of the masthead. Renders as a small `← Back to Research` link directly above the body column, so the masthead stays clean like TC's.
- **Deck:** TC doesn't use a deck. We promote the deck to the **first paragraph of the body** (rendered automatically by `ArticleLayout`, slightly larger lead style). This keeps it readable without crowding the headline panel.
- **Hairline divider:** removed — the masthead block itself is the divider.

## Body styling refinements (`prose-article` in `index.css`)

Small TC-aligned tweaks only:
- Lead paragraph (`.prose-article > p:first-child`): 22px, foreground color, `1.6` leading.
- Body paragraphs: stay 20px, but tighten leading from `1.75` → `1.7` and switch color to `foreground` at 90% (TC reads as near-black, not muted gray).
- Section `h2`: remove the top border rule; keep generous top margin only. TC sections breathe with whitespace, not lines.
- Links: solid underline at 2px offset, `currentColor` underline, primary color on hover (already close).

## Footer (related + source)

Keep current behavior. Tighten the related-cards heading to `Read next` (TC-style) and reduce to max 3 cards in a 3-up grid on desktop.

## Files touched

- `src/modules/core/components/ArticleLayout.tsx` — rewrite the `<header>` block; add `author` prop; add share row component inline; move back-link below masthead.
- `src/index.css` — adjust `.prose-article` lead/paragraph/h2 rules as above.

No changes needed to:
- `BlogPost1/2/3.tsx`, `BlogCanonicalRustCrate.tsx`, `ResearchPaperAtlasEmbeddings.tsx`, or `ProjectDetailLayout.tsx` — they all consume `ArticleLayout` and inherit the new look automatically.

## Result

Every blog post and project page opens with the same confident TechCrunch-style masthead: a single hero image bleeding off the left edge, a bold solid panel on the right carrying the category, headline, share controls, and byline, then a clean 820-px reading column below. Familiar, crisp, precise — in the UOR Foundation's own palette.

