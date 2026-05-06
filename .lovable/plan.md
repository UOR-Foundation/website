## Goal

Strip `/framework` down to essentials. Three movements, no labels: a clear **why**, a live **how**, a single **what next**. Remove anything that repeats, decorates, or links elsewhere without earning it.

## What goes away

- The 3-tile "What is UOR?" grid (Idea / How / Why) — replaced by one sentence and the demo itself.
- The 3-card "Pick your path" grid — collapsed into one row with the crate as the headline action.
- The 6-card "Where it applies" use-cases grid — moved off-page (Learn shouldn't sell, it should teach).
- The dark "Ready to build?" closing section — redundant with the global footer/nav.
- Section eyebrows ("WHAT IS UOR?", "SEE IT WORK", etc.) — labels add noise, not meaning.
- Repeated `Read the docs` / `View on GitHub` buttons.

## New structure

```text
1. Hero (the why — one line)
2. Live identity demo (the how — by doing)
3. One row: install + read source (the what next)
```

### 1. Hero — the why, unstated

- H1: **Every piece of data, one universal identity.**
- Sub (one sentence): "Type something below and watch it get an address that anyone, anywhere, can verify."
- No buttons. The demo is right under it.

### 2. Live demo — the how, shown not told

Keep the existing two-pane component but tighten it:
- Left: editable JSON.
- Right: only the **UOR identity** (`urn:uor:derivation:sha256:…`) and the **glyph address**. Drop the duplicate hex hash row.
- Caption underneath, single line: "Same input → same identity. On any machine. Forever."

### 3. One row — the what next

A single horizontal strip, three plain links separated by dots, no cards, no icons except the action verb:

```text
[ cargo add uor-foundation ]   crates.io · docs.rs · source on GitHub
```

- The `cargo add …` is a copyable monospace pill (existing CopyableCommand).
- The three links are small text links to `CRATE_URL`, `CRATE_DOCS_URL`, `GITHUB_FRAMEWORK_URL`.
- One additional muted link below: "Read the full spec →" pointing to `GITHUB_FRAMEWORK_DOCS_URL`.

That's the entire page.

## Copy principles

- No "framework", "specification", "canonicalization", "URDNA2015", "manifold", "deterministic", "content-addressed".
- No section headings shouting WHY/HOW/WHAT — the layout *is* the narrative.
- Every word earns its place. If it can be cut without losing meaning, cut it.

## Technical notes

- File: `src/modules/core/pages/StandardPage.tsx` — keep `LiveDemo`, `CopyableCommand`, and the `singleProofHash` import. Delete `conceptCards`, `pathCards`, `applications` import, `appIconMap`, the use-cases section, and the dark CTA section.
- Drop unused icon imports (`Globe`, `ShieldCheck`, `Bot`, `Microscope`, `Layers`, `Rocket`, `BookOpen`, `Github`, `Package`, `ArrowRight` — keep only what survives).
- Keep all styling on existing semantic tokens; no new CSS.
- Page should fit roughly one viewport on desktop, no scroll required to reach the install line.

## Out of scope

- Nav, routes, other pages, doc content. Use-cases/applications data stays in `src/data/applications.ts` for use elsewhere; just unhooked from this page.
