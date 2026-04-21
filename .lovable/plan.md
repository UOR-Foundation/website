

## Apply Aman-Inspired Editorial Refinement to Blog Posts

The current article layout is dense and busy — image and text fight for attention in a side-by-side hero, headlines are uppercase-bold-display, vertical rhythm is compressed. Aman's editorial pages succeed because of three disciplines: **one thing per row**, **whitespace as a material**, and **understated typography that whispers rather than shouts**.

### What we'll change in `ArticleLayout.tsx`

**1. Hero — single column, image breathes alone**
- Replace the 58/42 split with a **stacked composition** that mirrors Aman: kicker centered above, image full-width below it, title + meta below the image.
- Keep the existing 50% height reduction — image becomes a **cinematic letterbox** at `aspect-[21/9]` capped to `max-h-[52vh]`.
- Generous vertical air: `py-16 md:py-20` around the masthead block, never edge-to-edge against the next section.
- Kicker becomes a tiny centered uppercase label (11–12px, tracking `0.32em`), the way Aman labels "WELLNESS" above its hero.

**2. Title — quiet authority, not shouting**
- Drop `uppercase` and `font-bold` on the H1. Use `font-display` (serif) at `clamp(2rem, 3.6vw, 4rem)`, weight `400`, line-height `1.1`, letter-spacing `0.01em`.
- Center-aligned, max-width `clamp(680px, 60vw, 980px)` so it sits like a poem under the image.
- Author/date becomes a single hairline-separated line below: `Author · Date` in 13px muted, centered.

**3. Body rhythm — Aman-grade breathing room**
In `index.css` `.prose-article`:
- Increase `section + section` gap to `clamp(3.5rem, 6vw, 5.5rem)` (currently ~2.25em). Each section becomes a chapter, not a paragraph.
- Increase paragraph `line-height` to `1.75` (from 1.6) at desktop sizes.
- Tighten the reading column: `max-width: clamp(620px, 58vw, 760px)` — Aman's measure is narrow on purpose. Replace the current `clamp(680px, 78vw, 1600px)` which sprawls too wide on large screens.
- H2 stays large but loses the `uppercase` feel: regular weight serif, `clamp(1.6rem, 2vw, 2.2rem)`, with a small uppercase eyebrow `kicker` style above each H2 (a CSS pseudo-element won't work for arbitrary text — we'll just lighten the H2 itself).
- Add a thin `1px` divider with 4rem of whitespace before each `<section>` instead of relying on margin alone. Subtle separator = chapter break.

**4. Hero caption — Aman's italic credit line**
- Move the "Image credits:" caption to a single italic line **centered below the image**, font-size 12px, color `muted-foreground/60`. Italic serif, no uppercase.

**5. Floating share rail — quieter**
- Reduce ring opacity, soften background to `bg-background/60`, icons to 16px (currently 18px). Aman's chrome is whisper-quiet.

### Layout sketch

```text
       ─── OPEN RESEARCH ───              ← centered kicker, 11px

   ┌────────────────────────────────┐
   │                                │
   │      [ cinematic 21:9 image ]  │     ← single full-width image
   │                                │
   └────────────────────────────────┘
        Image credits: …            ← italic, centered

      What If Every Piece of Data
      Had One Permanent Address?           ← serif, regular weight, centered

         UOR Foundation · Feb 19, 2026     ← single muted line

   ─────────────── (5rem of air) ──────────

              [ deck paragraph ]
              [ TL;DR if present ]
              [ section 1 ]
                  …
              ─────────────── (chapter break)
              [ section 2 ]
```

### Files to modify

- `src/modules/core/components/ArticleLayout.tsx` — rebuild hero as stacked single-column; soften title typography; tighten share rail.
- `src/index.css` — widen `section + section` gap; tighten reading column max-width; raise body line-height; soften H2.

### Out of scope

- No content changes inside individual blog posts (all 4 posts inherit automatically through `ArticleLayout`).
- No color/palette changes — this is purely composition + rhythm.
- Footer/related strip stays as-is; it already has decent breathing room.

