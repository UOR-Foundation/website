## Goal

Treat the golden ratio (φ ≈ 1.618) as the **only** allowed rhythm for sizing, spacing, type, and aspect ratios across the entire site. The result should feel calm, confident, and visually unified — without a "redesign" that breaks the current personality.

The project already has the seed of this system (`--phi`, `--content-gap-{sm,md,lg,xl}`, `--section-py-{sm,md,lg}`, and `golden-*` Tailwind utilities). The plan extends that seed into a complete scale and applies it everywhere.

---

## Phase 1 — Finalize the φ design tokens (foundation)

**`src/index.css` → `:root`**

Extend the existing scale so every element on the site can pick a φ-correct value without inventing magic numbers.

- **Spacing scale** (additive, keeps existing tokens): `--phi-1` … `--phi-9` based on `0.382rem · φⁿ` so the ladder is `0.382 → 0.618 → 1 → 1.618 → 2.618 → 4.236 → 6.854 → 11.09 → 17.94 rem`.
- **Type scale**: `--type-1` … `--type-7` derived from a 1rem base × φ steps (down for caption, up for display). Replaces the ad-hoc `clamp()` pairs in `--text-*` with a single φ ladder, still wrapped in `clamp()` for fluidity.
- **Aspect ratios** (named utilities): `--ratio-phi: 1.618 / 1`, `--ratio-phi-portrait: 1 / 1.618`, `--ratio-phi-square: 1 / 1` (kept as the only non-φ exception for icon tiles), `--ratio-phi-wide: 2.618 / 1`.
- **Radii**: `--radius-sm/md/lg/xl` regenerated as `4px · φⁿ` (≈ 4 / 6 / 10 / 17 / 28).
- **Line lengths**: `--measure-sm/md/lg` at `38ch / 62ch / 100ch` (Fibonacci-ish, very close to φ progression and well-known reading widths).
- **Container widths**: `--container-sm/md/lg/xl` on a φ progression anchored at the existing max width, so column splits remain φ.

**`tailwind.config.ts`** — expose the new tokens as utilities:

- `spacing.phi-1 … phi-9`
- `fontSize.phi-1 … phi-7`
- `aspectRatio.phi`, `phi-portrait`, `phi-wide`
- `borderRadius.phi-sm/md/lg/xl`
- `maxWidth.measure-sm/md/lg`

Existing `golden-*` and `holo-*` tokens stay (back-compat); the plan re-points them to the new ladder values where they diverge.

---

## Phase 2 — Layout primitives

Introduce three small utilities so callers stop hand-rolling layouts:

- `.phi-stack` → vertical stack with `gap: var(--phi-4)` (override via `style`).
- `.phi-row` → flex row with `gap: var(--phi-3)` and balanced wrapping.
- `.phi-grid-2` / `.phi-grid-3` → CSS grid where columns split on φ (`1fr 1.618fr` and `1fr 1.618fr 2.618fr`) for hero/feature blocks; falls back to even columns under `md`.

These slot into `index.css` once and are reusable everywhere without touching component logic.

---

## Phase 3 — Apply across surfaces (waves)

Run in order so visual regressions are caught surface-by-surface. Each wave is one small commit.

1. **Landing page** (`src/modules/landing/**`)
   - Hero, HighlightsSection (already φ), WhatIsUorSection silo cells, all section paddings → `section-md/lg`, all internal gaps → `golden-*`.
   - Hero text/eyebrow ratio shifts to use the new `phi-{n}` type tokens.

2. **Connect / Research / Blog** (`src/modules/community/**`)
   - Card grids: `gap-x-golden-lg gap-y-golden-xl` (already done for highlights — extend to news, blog index, research papers).
   - Article body: cap `max-width: var(--measure-md)`; H1/H2/H3 sizes from `phi-{n}` tokens.
   - Cover images: `aspect-phi` everywhere (replace remaining `aspect-[16/10]` and `aspect-video`).

3. **Projects** (`src/modules/projects/**`)
   - Grid + list views (covers already φ); pad rows by `phi-3`, separate sections by `section-sm`.
   - Project detail layout: hero image `aspect-phi-wide`, side rail width = `1 / φ` of content column.

4. **Core / About / Standard / Donate** (`src/modules/core/**`, `src/modules/donate/**`)
   - Replace section paddings and content gaps with the new tokens. Buttons keep their existing radius but switch to `phi-md`.

5. **Oracle / Search / Library** (`src/modules/oracle/**`)
   - BookCard already `aspect-[2/3]` → keep (book convention) but swap surrounding gaps and paddings to φ.
   - Result list density uses `phi-2` row gap, `phi-4` group gap.

6. **Desktop / App Store / Messenger** (`src/modules/desktop/**`, `app-store`, `messenger`)
   - Window chrome paddings, dock spacing, message bubble radii to `phi-md`. Inbox list density to `phi-2`/`phi-3`.

7. **Auth, Donate forms, modals** (`src/modules/auth/**`, dialogs, sheets)
   - Form rows `gap: phi-3`, modal padding `phi-5`, modal max-width `measure-sm`.

8. **Layout shell** (`src/modules/core/components/Layout.tsx`, navbar, footer)
   - Navbar height = `phi-6`, footer top padding = `section-sm`, container padding ladder uses `phi-4`/`phi-5`/`phi-6` instead of the current `5%/6%/7%` percentages.

---

## Phase 4 — Enforcement & cleanup

- **Lint sweep**: search for raw `gap-[0-9]`, `p-[0-9]`, `aspect-[…]`, and arbitrary `clamp(...)` font sizes and replace with the new tokens. The 300+ raw `gap-N` hits found will be batched per surface.
- **Codify the rule** in a short comment block at the top of `src/index.css` and add a one-paragraph "φ is the only rhythm" note to `mem://design/aesthetics/golden-ratio-constraints` so future edits stay aligned.
- **No new colors, no new fonts** in this initiative — purely geometry.

---

## Out of scope

- Re-skinning components, changing colors, or modifying iconography.
- Replacing third-party widgets (shadcn primitives, Lexical) — they keep their internals; only their wrappers adopt φ.
- Mobile-vs-desktop breakpoint structure (kept as-is; tokens already use `clamp()` for fluidity).

---

## Verification

After each wave: visual scan of the affected pages at 1920, 1366, 834, and 390 px viewports, plus a quick build-error check. Final pass: a single page-by-page sweep to confirm every visible gap, padding, font size, and image ratio resolves to a φ token.

---

## Technical details

- **φ ladder reference (rem)**: 0.236, 0.382, 0.618, 1.000, 1.618, 2.618, 4.236, 6.854, 11.09.
- **Type ladder (rem, before clamp)**: 0.618 (caption), 0.764, 0.944, 1.000, 1.235 (lead), 1.618 (card title), 2.618 (heading), 4.236 (page title).
- **Aspect ratio policy**: covers/heroes = `phi`, portraits/avatars = `phi-portrait`, banners = `phi-wide`, icon tiles = `1/1` (only allowed exception, justified by symmetry).
- **Container split policy**: any two-column block uses `1fr 1.618fr`; any three-column uses `1fr 1.618fr 2.618fr` or even thirds when the content is symmetric (galleries, project cards).
