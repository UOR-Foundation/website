## Goal

Turn `/framework` (the "Learn" tab) into the shortest, clearest path for a developer who has never heard of UOR to: **understand it → see it → install it → build with it**. Cut jargon, cut redundancy, surface the newly published Rust crate as a first-class entry point.

## What's there today

The page has a hero, a 3-card "Start here" (Overview / Architecture / Quick Start, all linking to GitHub Pages docs), a 6-card "Use Cases" grid, and a CTA repeating the same three buttons from the hero. The Rust crate is a tertiary button. Nothing on the page actually *shows* UOR — every link kicks the user out to GitHub.

Issues:
- Hero, Start-here, and CTA all repeat the same 3 destinations.
- "Use Cases" sits between learning steps and breaks momentum.
- The crate (the most concrete, runnable thing we have) is buried.
- No "show" — the user never sees what a UOR identity looks like.
- "Architecture" / "specification" language assumes prior context.

## Proposed structure (top to bottom)

```text
1. Hero — one sentence + two buttons
2. What is UOR? — 3 plain-English tiles (show + tell)
3. See it work — live, inline UOR identity demo
4. Pick your path — Rust crate · Read the spec · Browse on GitHub
5. Where it applies — condensed use cases (kept, trimmed)
6. Next step — single CTA into /projects (Build)
```

### 1. Hero
- H1: **Learn UOR**
- Sub: "A universal way to give every piece of data a verifiable identity. Read it, run it, build on it — in that order."
- Two buttons only: **See how it works** (anchor to §3) · **Install the crate** (crates.io).

### 2. What is UOR? (replaces "Start here")
Three tiles, each ~25 words, **no doc links** — the page itself answers the question:
- **The idea** — Same data, same identity. Anywhere. Forever.
- **How it works** — Canonicalize → hash → address. One deterministic path.
- **Why it matters** — Verifiable AI, reproducible science, interoperable data.

Each tile has a small "Read more" link to the matching docs page (Overview, Architecture, Use Cases).

### 3. See it work (new — the "show")
A small interactive panel rendered inline:
- Left: editable JSON-LD textarea (prefilled with a 4-line example).
- Right: the resulting **UOR identity** (`uor:…`) updating live, plus the canonical N-Quads it was hashed from.
- Caption: "This is exactly what the Rust crate produces. Same input → same identity, on any machine."

Reuse the existing `singleProofHash` / canonicalization pipeline already in the codebase — no new logic. If a synchronous in-browser path isn't available on this page, fall back to a static before/after snapshot with a "Run in playground" link.

### 4. Pick your path (replaces the redundant bottom CTA)
Three equally-weighted cards, each one concrete next action:
- **Use the Rust crate** — `cargo add uor-foundation` shown in a copyable code block · links to crates.io + docs.rs.  ← *new prominence*
- **Read the spec** — Links to GitHub Pages docs (Overview → Architecture → API).
- **Read the source** — Links to the GitHub repo.

### 5. Where it applies
Keep the existing 6 application cards but:
- Move below "Pick your path" so it doesn't interrupt the learn flow.
- Tighten heading to **Where it applies** (drop the duplicate "Use Cases" eyebrow).

### 6. Next step
One line + one button: **"Ready to build? See projects using UOR →"** linking to `/projects`. Replaces the current 3-button repeat-CTA.

## Link audit

Verify and keep:
- `GITHUB_FRAMEWORK_URL` → repo
- `GITHUB_FRAMEWORK_DOCS_URL` + `/docs/overview.html`, `/docs/architecture.html`
- `CRATE_URL` (crates.io), `CRATE_DOCS_URL` (docs.rs)

Add:
- A constant for the docs API/quick-start page if one exists under `GITHUB_FRAMEWORK_DOCS_URL` (confirm during implementation; otherwise link to repo README).

Remove duplicate references — every external link should appear at most once on the page.

## Copy principles applied

- No "specification", "canonicalization", "URDNA2015", "manifold" in body copy. Those terms stay in linked docs.
- Every sentence answers either *what* or *what next*.
- Max 2 buttons per section.

## Technical notes

- File: `src/modules/core/pages/StandardPage.tsx` — rewrite sections, keep Layout, tokens, and `highlight-card` patterns.
- Reuse `applications` data as-is.
- For the live demo (§3): try importing the existing canonical-hash util used elsewhere in the app; if it's WASM-gated and async, render with a `useEffect` and a loading skeleton. Fallback: static side-by-side example + link to an existing playground route if one exists.
- Add a copy-to-clipboard affordance on the `cargo add` snippet (use existing pattern if present, else a tiny inline handler).
- All styling via existing semantic tokens and `highlight-card` utility — no new colors.

## Out of scope

- No changes to nav labels, routes, or other pages.
- No new docs content — only restructuring and surfacing existing resources.
