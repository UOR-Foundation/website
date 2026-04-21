

# Widen Article Body and Tighten Editorial Rhythm (TechCrunch-style)

Update the shared `ArticleLayout` so every blog post and project page reads with a wider, more confident measure — closer to TechCrunch's actual article width — while keeping the crisp editorial feel.

## Changes

**`src/modules/core/components/ArticleLayout.tsx`**
- Widen body column from `max-w-[720px]` → `max-w-[820px]` (header, body, afterBody, and footer all updated together so they stay aligned).
- Widen hero image from `max-w-[880px]` → `max-w-[960px]` so it remains slightly wider than the text column.
- Reduce horizontal container padding on large screens: `px-6 md:px-8 lg:px-10` (replaces the `5–7%` percentage padding that was eating side space at 1200–1400px viewports).
- Tighten top spacing: `pt-32 md:pt-36` (was `pt-32 md:pt-40`); hero margin `mt-8 md:mt-10` (was `mt-10 md:mt-14`); body margin `mt-10 md:mt-12` (was `mt-12 md:mt-16`).
- Bottom spacing trimmed to `pb-16 md:pb-24`.

**`src/index.css` — `.prose-article` utility**
- Body text: bump from 19px → 20px, line-height stays at 1.75.
- Paragraph spacing: 1.15em (slightly tighter for crisper rhythm).
- H2 sizing: keep 1.875rem desktop, but reduce top padding from `2.5rem` → `2rem` and top margin from `2.5rem` → `2.25rem` so sections feel more connected.
- Lists: 20px, line-height 1.7, list-item spacing 0.5em.
- Blockquote: 1.25rem italic, increased left padding, primary-tinted left border.
- Inline `code` and `<pre>`: increase contrast and padding for a cleaner, more deliberate look.

## Result

- Reading column expands from 720px → 820px — visibly wider, less wasted side space at 1200px+ viewports the user is on.
- 20px body text with 1.75 line-height matches the comfortable, generous TechCrunch feel.
- Tighter vertical rhythm (less top padding, closer section dividers) makes the page feel more crisp and intentional.
- All blog posts (`BlogPost1/2/3`, `BlogCanonicalRustCrate`) and all project pages inherit this automatically — no per-page edits needed.

## Out of scope

- No data, routing, image, or homepage changes.
- No new components; one shared layout continues to drive both surfaces.

