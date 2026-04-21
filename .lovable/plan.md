

# Adopt IBM Research Blog Format as the Single Canonical Post Layout

## What IBM Research Does Well

I read the IBM Research post you referenced. The format has five disciplined traits:

1. **Wider, denser column** — body text sits in a ~720–760px measure inside a ~1100px page frame, not the narrow ~640px we use today. Feels editorial, not cramped.
2. **Tight masthead** — small category eyebrow ("Research") → large serif-feeling headline → one-line standfirst → thin meta row (date · authors · read time). No hero chip jungle.
3. **Edge-to-edge hero image** that spans the full content column with a small italic caption underneath.
4. **Sectioned body with clear `<h2>`s**, generous paragraph spacing, and pull-quotes set in a larger weight on the left rule (not centered, not boxed).
5. **Inline figures and code** flush with the text column; no decorative cards.

Our current `BlogPost1` / `BlogPost2` / `BlogPost3` / new `BlogCanonicalRustCrate` each diverge slightly. None match IBM's discipline, and all of them sit in too narrow a column for the viewport.

## The Move

Build **one shared `ArticleLayout` component** that every foundation blog post uses, modeled on the IBM masthead → hero → body rhythm. Migrate all four existing posts to it so the foundation has a single canonical post format going forward.

## Concrete Changes

### 1. New shared component: `src/modules/community/components/ArticleLayout.tsx`

A single layout primitive every post composes. Props:
- `eyebrow` (e.g. "Release", "Open Research", "Vision")
- `title`
- `standfirst` (one-sentence dek under the title)
- `date`, `authors?`, `readTime?`
- `heroImage`, `heroCaption?`
- `backTo` (defaults to `/research#blog`)
- `children` (the article body)

Structure:
```
[ sticky thin top bar: ← Back to Community · UOR Foundation Research ]

[ container max-w-[1120px] px-6 lg:px-10 ]
  [ masthead — left-aligned ]
    eyebrow (uppercase, tracked, primary, 11px)
    h1 (clamp(2rem, 4vw, 3.25rem), tight leading, display font)
    standfirst (1.25rem, muted-foreground, max-w-[760px])
    meta row (date · authors · read time, 13px mono, divider dots)

  [ hero image — full column width, rounded-lg, aspect-[16/9] ]
  [ caption — italic, 13px, muted, mt-3 ]

  [ article body — max-w-[760px], prose-uor-wide ]
    {children}

  [ footer CTA — same Discord + back-to-community pair we already have ]
```

Key dimension changes from current posts:
- **Page frame**: `max-w-[1120px]` (was `max-w-3xl` ≈ 768px)
- **Body measure**: `max-w-[760px]` (was ~640px) — closer to IBM's ~66ch
- **Side padding**: `px-6 lg:px-10` (was `px-4 sm:px-6 lg:px-8`)
- **Hero**: spans the full 1120px column (was 768px)

### 2. Extend `prose-uor` → add `prose-uor-wide` variant in `src/index.css`

Adjusts only the typography for the wider measure:
- Body: 18px / 1.7 line-height (was 17px / 1.65)
- `<h2>`: 1.875rem, 64px top margin, 16px bottom (IBM-style breathing room above sections)
- `<h3>`: 1.375rem
- `<blockquote>`: not centered/boxed — left border 3px primary, padding-left 24px, font-size 1.25rem, font-weight 500, italic off
- `<pre>`: full-width within the measure, 14px, subtle bg (`bg-muted/40`), 1px border, no shadow
- `<figure>` + `<figcaption>`: italic 13px caption, 12px top margin
- `<a>`: underline always (IBM does this), `decoration-primary/40`, hover `decoration-primary`
- Lists: tighter `gap-2`, primary bullet dots already match

### 3. Migrate all four posts to `ArticleLayout`

Each becomes a thin file: import `ArticleLayout`, pass the masthead props, write the body as `<article className="prose-uor-wide">…</article>`.

| Post | Eyebrow | Standfirst (one-line) |
|---|---|---|
| `BlogPost1` (Knowledge Graph) | Vision | "How a single addressing system could turn the internet into a structured, navigable knowledge graph." |
| `BlogPost2` (Universal Mathematical Language) | Open Research | (existing excerpt) |
| `BlogPost3` (Framework Launch) | Open Research | (existing excerpt) |
| `BlogCanonicalRustCrate` | Release | "We gave every digital object its own permanent, content-addressed, self-verifying identity." |

Body content stays identical — only the wrapping layout changes. Hero images stay as-is.

### 4. Add author + read-time to the four posts

IBM always shows "8 minute read" and author names. We don't have authors yet. I'll default to `authors: ["UOR Foundation Research"]` and compute `readTime` from word count (≈ 220 wpm) — both rendered in the meta row as `Apr 2, 2026 · UOR Foundation Research · 6 min read`.

### 5. Tiny, post-only changes — nothing else touched

- `src/modules/community/pages/BlogPost1.tsx` — refactor to use ArticleLayout
- `src/modules/community/pages/BlogPost2.tsx` — same
- `src/modules/community/pages/BlogPost3.tsx` — same
- `src/modules/community/pages/BlogCanonicalRustCrate.tsx` — same
- **NEW** `src/modules/community/components/ArticleLayout.tsx`
- `src/index.css` — add `.prose-uor-wide` ruleset (additive; existing `prose-uor` untouched so anything else using it is safe)
- `src/modules/community/index.ts` — export ArticleLayout

## Build Errors I'm NOT Touching

The four `src/custom-sw.ts` errors are pre-existing missing-dependency issues (workbox packages). Unrelated to this layout work and would need a separate `bun add workbox-precaching workbox-routing workbox-strategies workbox-expiration` step plus a `__WB_MANIFEST` type augmentation. Flag if you want them fixed in the same pass and I'll add it.

## Result

Every foundation blog post — current and future — uses one canonical IBM-Research-style layout: wider editorial column, disciplined masthead with eyebrow/standfirst/meta, full-width hero with caption, sectioned body in a 760px measure with generous `<h2>` breathing room. The Canonical Rust Crate post you're looking at right now becomes the reference example.

