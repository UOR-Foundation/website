

## Align all blog posts to the Universal Data Fingerprint format

Make every blog post share the same editorial shell and rhythm as `/blog/universal-data-fingerprint`, so the four posts read as one publication.

### The reference format (Universal Data Fingerprint)

The target structure, top to bottom:

1. **Centered kicker** (e.g. `Standards`, `Vision`, `Open Research`) — small uppercase eyebrow.
2. **Hero image** — golden-ratio (φ:1) cover, no caption underneath.
3. **Large headline** — single confident H1, no subtitle/deck below it.
4. **Author + date hairline** — `UOR Foundation · <date>`.
5. **Inline share row.**
6. **TL;DR aside** — bordered card with a one-paragraph summary, opening the body.
7. **Sectioned body** — `<h2>` + `<p>` blocks, same prose typography across the site.
8. **Source link + Read next strip** at the foot, with cover thumbnails.

`ArticleLayout` already enforces 1, 3, 4, 5, 8. The drift is in 2, 6, and the use of `deck` / `heroCaption` on the older posts.

### What changes per post

**BlogPost1 — UOR: Building the Internet's Knowledge Graph**
- Keep existing hero image (`blog-knowledge-graph.png`).
- Remove `heroCaption` so no "Image credits:" line appears under the cover (matches Fingerprint).
- Move the YouTube embed from the very top of the body down to a later section (inside a "Watch" section near the end). The body should open with a TL;DR aside, not a video.
- Add a TL;DR aside at the top of the body with a one-paragraph summary distilled from the existing intro.
- No `deck` (already none).

**BlogPost2 — Unveiling a Universal Mathematical Language**
- Keep existing hero image (`blog-golden-seed-vector.png`).
- Remove the `deck` prop and the `heroCaption` prop so the masthead matches Fingerprint exactly.
- Add a TL;DR aside at the top of the body. Pull its one-paragraph text from the current `deck` so nothing is lost.

**BlogPost3 — What If Every Piece of Data Had One Permanent Address?**
- Keep existing hero image (`blog-uor-framework-launch.png`).
- Remove the `deck` prop and the `heroCaption` prop.
- Add a TL;DR aside at the top of the body, sourced from the current `deck` text.

**BlogCanonicalRustCrate (Universal Data Fingerprint)**
- No structural changes. It is the reference.

### Shared TL;DR aside pattern

Every post uses the exact same component markup (extracted inline, identical classes to the Fingerprint post) so spacing, border, padding, label, and typography are pixel-identical:

```text
┌───────────────────────────────────────────────┐
│  TL;DR ─────────────────────────────────────  │
│                                               │
│  One paragraph. 2–4 sentences. Same           │
│  font-size and leading as Fingerprint TL;DR.  │
└───────────────────────────────────────────────┘
```

Classes mirror BlogCanonicalRustCrate lines 43–66 exactly: `not-prose mb-12 md:mb-14 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm px-6 md:px-8 py-6 md:py-7`, with the same `TL;DR` eyebrow row and `font-body text-[15px] md:text-[16px] leading-[1.75] text-foreground/85` paragraph.

### Related-strip thumbnails

`BlogPost1`, `BlogPost2`, and `BlogPost3` currently build their `related` array without `image`, so the bottom "Read next" cards render without covers. They will be updated to map `coverKey` through the same `coverMap` used in BlogCanonicalRustCrate, so every post's related strip shows thumbnails — another consistency win.

### Files touched

- `src/modules/community/pages/BlogPost1.tsx`
- `src/modules/community/pages/BlogPost2.tsx`
- `src/modules/community/pages/BlogPost3.tsx`

No changes to `ArticleLayout`, `blog-posts.ts`, routing, or assets. No new images required — every post already has a cover.

### Acceptance check

After the edits, opening each of the four blog posts in sequence should show: same masthead rhythm (kicker → hero → title → byline → share), same TL;DR card immediately under the share row, same body prose scale, same related-strip with cover thumbnails.

