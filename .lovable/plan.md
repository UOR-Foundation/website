

## Restore Hero Presence — Bigger Image, Bigger Title, Tighter Stack

On a 1837px-wide screen the current hero feels diminished: image caps at `52vh` height, the title sits small (`max ~64px` at 4rem), and there is `mt-10` of air between image and title — so they read as two separate, undersized elements with too much sky around them. The home page works because the hero composition **fills the screen** and the title is **large and confident**.

We'll restore that presence using golden-ratio proportions.

### Changes — `ArticleLayout.tsx` masthead only

**1. Image — let it dominate the fold (golden ratio, not letterbox)**
- Drop the `21:9` letterbox (too cinematic-thin for vertical screens). Use a **φ:1 aspect ratio** (`aspect-[1.618/1]`) — the same ratio we use across the OS.
- Raise the height cap: `max-h-[clamp(420px, 62vh, 760px)]` so it actually fills the viewport on large screens.
- Widen the image container to use full editorial width: `max-w-[clamp(1080px, 88vw, 1480px)]`.

**2. Title — confident scale, closer to image**
- Increase H1 size to `clamp(2.25rem, 5.2vw, 5.5rem)` (currently caps at 4rem). At 1837px viewport this lands ~85px — comparable to the home page's "Make Data Identity" scale.
- Widen title `max-width` to `clamp(720px, 68vw, 1180px)` so two-line headlines don't break awkwardly.
- Tighten gap between image and title: `mt-3 md:mt-5` (was `mt-6 md:mt-10`). Aman keeps title hugged to image — the breathing happens **above** the kicker and **below** the meta, not between linked elements.

**3. Vertical rhythm — golden-ratio top/bottom air**
- Header padding: `py-8 md:py-10 lg:py-12` (was `py-10/14/16`). Reduces top air so the hero anchors higher.
- Kicker→image gap: `mb-6 md:mb-8` (was `mb-8/10`). Tighter coupling.
- Body offset: `mt-10 md:mt-14 lg:mt-16` (was `mt-12/16/20`).

**4. Caption + meta — proportional bumps**
- Hero caption: 13px (was 12px), still italic centered.
- Meta line: 16px desktop already good, keep.

### Resulting proportion (at 1837px viewport)

```text
   ─── kicker ───                          ← 12px, 24px below nav

   [ image  φ:1, ~1480px wide × 915px ]    ← dominates fold

      Italic image credit                  ← 13px

   Title ~85px serif, 2 lines              ← hugs image (20px gap)

         Author · Date                     ← 16px

         [ share row ]
```

### Files to modify

- `src/modules/core/components/ArticleLayout.tsx` — masthead container widths, image aspect/cap, title scale, vertical spacing only.

### Out of scope

- Body column width stays at `clamp(680px, 72vw, 1180px)` (already approved last round).
- No changes to footer, share rail, or `index.css`.
- No content changes.

