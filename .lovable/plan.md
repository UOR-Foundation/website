

# TechCrunch-Style Split Hero for Articles

Restructure the article hero so every blog post and project page opens with a two-column layout: **hero image on the left, headline block on the right**. Body content below stays in the wide single-column reading format we already have.

## The new hero (desktop ≥ lg)

```text
┌─────────────────────────────┬──────────────────────────────┐
│                             │  KICKER · DATE · READ TIME   │
│                             │                              │
│      [ HERO IMAGE 4:5 ]     │  Big editorial headline      │
│                             │  spanning two or three lines │
│                             │                              │
│                             │  Standfirst deck paragraph,  │
│                             │  muted, comfortable measure. │
│       caption italic        │                              │
│                             │  ← Back to Research          │
└─────────────────────────────┴──────────────────────────────┘
                  ───────── body column 820px ─────────
```

- Grid: `lg:grid-cols-12`, image `col-span-6`, text `col-span-6`, gap `lg:gap-14`, vertically centered.
- Image: `aspect-[4/5]` portrait on desktop, `aspect-[16/10]` on mobile. Rounded `rounded-2xl`, soft border, subtle shadow. Caption sits directly under the image in italic muted text.
- Text column: kicker meta row at top (tag · date · read time), then large headline (`clamp(2.25rem, 4.4vw, 3.5rem)`, tight tracking, weight 700), then deck paragraph (`1.25rem`, muted, leading 1.55), then a small "Back" link at the bottom of the column so the eye returns to navigation naturally.
- Mobile (<lg): stacks — image first (16:10), then meta, headline, deck. Same component, same data.

## Body, afterBody, and footer

Unchanged from current `ArticleLayout`:
- Body: centered `max-w-[820px]`, `.prose-article` (20px / 1.75).
- afterBody (used for project sidebars / certificate receipts): same 820px column.
- Footer: source line + "Related" cards, same 820px column.

This keeps the reading experience we just tuned and only changes the opening.

## Uniformity

All surfaces using `ArticleLayout` inherit the new hero automatically:
- All blog posts (`BlogPost1`, `BlogPost2`, `BlogPost3`, `BlogCanonicalRustCrate`).
- All project pages via `ProjectDetailLayout`.

No per-page edits needed — same template, same rhythm, every article.

## TechCrunch cues we borrow (subtly)

- Compact uppercase kicker meta row with a small tag dot.
- Headline takes priority over image weight — image is portrait, not banner, so the title leads.
- Italic caption directly under the image.
- Hairline divider under the hero before the body begins.
- Generous whitespace between hero and first paragraph (`mt-12 md:mt-16`).

We don't copy TechCrunch's exact serif, colors, or chrome — we keep the site's display font, tokens, and dark surface, so it reads as "ours, polished" rather than a clone.

## Files to change

- `src/modules/core/components/ArticleLayout.tsx` — replace the current header + hero blocks with the split-hero grid described above. The `heroOverride`, `hideHero`, `heroCaption`, `backHref`, `backLabel`, `kicker`, `date`, `readTime`, `title`, `deck` props all keep their current names and behavior.
- `src/index.css` — minor: ensure `.prose-article` first paragraph has no extra top margin so the body sits cleanly under the hero divider.

## Out of scope

- No data, routing, or image changes.
- No changes to navbar, footer, homepage, or body typography rules.
- No new dependencies.

## Result

Every blog post and project page opens with a confident split hero — portrait image on the left, headline and deck on the right — then flows into the same wide, crisp 820px reading column. Uniform across the site, distinctly editorial, and clearly TechCrunch-inspired without being a copy.

