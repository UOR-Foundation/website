

# Align UOR Spec Surface with the Canonical `uor-foundation` Crate

Same OCI-style refactor as approved, with one anchor change: the three specifications and every code example are sourced **directly** from the canonical materials — the `uor-foundation` Rust crate on crates.io and the `UOR-Foundation/UOR-Framework` GitHub repository. No invented APIs, no paraphrased pseudocode.

## Anchor message (locked)

> **Make data identity universal.**
> We gave every digital object its own permanent, content-addressed, self-verifying identity.

## Canonical sourcing rule

Every public-facing claim, type name, function name, and code snippet on the marketing site must map back to:

- **Crate**: `uor-foundation` on crates.io (latest published version, pinned in copy).
- **Repo**: `github.com/UOR-Foundation/UOR-Framework` (specifically the `foundation/` Rust workspace and its published specs).
- **In-repo TS mirrors**: `src/types/uor-foundation/**` (e.g. `kernel/address.ts`) which already mirror the Rust modules via `@see foundation/src/...` annotations.

Wherever a spec name, type, or example appears in the UI, it is taken verbatim from these sources and links back to the exact file/line. No marketing-only terminology.

## The three specifications (canonical names from the crate)

Mapped to existing modules in `foundation/src/`:

| Public spec | Canonical module | Source of truth |
|---|---|---|
| **identity-spec** | `kernel::address` | `foundation/src/kernel/address.rs` (mirrored at `src/types/uor-foundation/kernel/address.ts`) — Glyph, Address, byte↔Braille bijection. |
| **object-spec** | `kernel::object` (+ `kernel::manifest`) | Canonical UOR Object: content + JSON-LD manifest + signature, as defined in the crate's object module. |
| **resolution-spec** | `kernel::resolver` (+ UNS) | Address → object resolution across registries/peers, as defined in the crate's resolver module and UNS reference. |

Each spec card links to: (a) the crate's `docs.rs` page for that module, (b) the source file in `UOR-Framework`, and (c) the in-repo TS mirror under `src/types/uor-foundation/**`.

## Changes (delta from previously approved plan)

Everything in the previously approved plan still applies. The additions/refinements below make it canonical.

### 1. New canonical sources file

Add `src/data/canonical-sources.ts` exporting one record per spec with:

```ts
{
  id: "identity" | "object" | "resolution",
  name: "Identity Specification" | ...,
  module: "kernel::address" | "kernel::object" | "kernel::resolver",
  crate: { name: "uor-foundation", version: "<pinned>", docsUrl, cratesUrl },
  repo:  { url: "https://github.com/UOR-Foundation/UOR-Framework",
           path: "foundation/src/kernel/address.rs", permalink: "<commit-pinned>" },
  tsMirror: "src/types/uor-foundation/kernel/address.ts",
  oneLine: string,
  status: "Draft" | "Stable",
}
```

All spec UI reads from this file. Single source of truth, easy to bump the pinned version.

### 2. `WhatIsUorSection.tsx` — three spec cards

Each card pulls from `canonical-sources.ts` and shows: spec name · `module::path` · status · "Read source →" (repo permalink) · "docs.rs →" (crate docs).

### 3. `StandardPage.tsx` — spec hub uses canonical snippets only

"Getting Started" reduced to three steps, each a verbatim snippet from the crate's README/examples:

1. **Install** — exact `Cargo.toml` line for the pinned `uor-foundation` version, plus the npm install for the TS mirrors if applicable.
2. **Resolve an address** — exact example from the crate's `kernel::resolver` doc-test (cited inline with a "source" link to the file/line).
3. **Publish an object** — exact example from the crate's `kernel::object` doc-test (cited inline).

No paraphrased code. Every snippet has a small "from `foundation/src/.../...rs#Lxx-Lyy`" link beneath it.

### 4. `ProjectCard.tsx` spec badge maps to canonical modules

The optional `spec?: "identity" | "object" | "resolution"` field on `featured-projects.ts` / `projects.ts` is interpreted as the canonical module the project implements. Hovering the badge shows the underlying `kernel::*` module name.

### 5. About + global meta

- About page lists the canonical sources (crate + repo) directly under the governance paragraph.
- `index.html` `<meta>` keeps the anchor message; AI-agent beacon adds machine-readable links to the crate, the repo, and the three module paths.

### 6. Verification step (read-only checks before writing copy)

Before drafting snippets, fetch and read the canonical surfaces to capture exact APIs and the latest crate version:

- `https://crates.io/crates/uor-foundation` (version + description).
- `https://docs.rs/uor-foundation/latest/uor_foundation/` (module list, public types).
- `https://github.com/UOR-Foundation/UOR-Framework` (repo root README).
- `foundation/src/kernel/{address,object,resolver}.rs` in the repo (signatures + doc-tests).
- Local `src/types/uor-foundation/kernel/address.ts` and siblings (already mirrored types).

If any of the three modules (`object`, `resolver`) is not yet exposed in the published crate at that exact name, the card is labelled **Draft** and links to the open spec PR rather than a published doc page — never invented.

## Files (delta)

In addition to the previously approved file list:

- New: `src/data/canonical-sources.ts` — pinned crate version, repo permalinks, TS mirror paths, status per spec.
- `src/modules/landing/components/WhatIsUorSection.tsx` — spec cards read from `canonical-sources.ts`.
- `src/modules/core/pages/StandardPage.tsx` — Install / Resolve / Publish snippets pulled verbatim from the crate, each with a source-link footer.
- `src/modules/projects/components/ProjectCard.tsx` — spec badge tooltip shows `kernel::*` module name.
- `src/modules/core/pages/AboutPage.tsx` — canonical-sources block under governance paragraph.
- `index.html` — beacon links to crate + repo + module paths.

## Out of scope

- No changes to the Rust crate or the UOR-Framework repo.
- No new APIs, no marketing-only terminology, no paraphrased code.
- No routing, backend, or dependency changes.

## Result

The public site presents UOR with OCI-style clarity (one message, three specs, one path in) and every spec name, type, and code example is a direct, linked citation of the canonical `uor-foundation` crate and the `UOR-Framework` repository — as canonical as the source itself.

