
# Deep Canonical Crate Anchoring — Phase 2

## Current State
Phase 1 added crate links to metadata files (llms.md, openapi.json, .well-known/uor.json), agent beacons, and the Framework page CTA. But the **structural data** driving the site — namespace registry, framework layers, pillars, and featured projects — still points only to GitHub Pages docs, not to the authoritative Rust crate modules on docs.rs.

## Insight
The crate's module structure (`kernel`, `bridge`, `user`, `enforcement`) maps 1:1 to the website's namespace registry and framework layers. By linking each namespace and layer directly to its corresponding docs.rs module page, every "View docs" click on the website takes the user straight to the canonical Rust trait definitions. This makes the crate the functional backbone of navigation, not just a metadata declaration.

## Changes

### 1. Add `crateModule` field to namespace registry (`src/modules/namespace-registry.ts`)
Add a `crateModule` property to each `NamespaceDescriptor` that maps to the docs.rs module path:
- `u:` → `kernel/u/`
- `schema:` → `kernel/schema/`
- `op:` → `kernel/op/`
- `query:` → `bridge/query/`
- `resolver:` → `bridge/resolver/`
- `partition:` → `bridge/partition/`
- `observable:` → `bridge/observable/`
- `proof:` → `bridge/proof/`
- `derivation:` → `bridge/derivation/`
- `trace:` → `bridge/trace/`
- `cert:` → `bridge/cert/`
- `type:` → `user/type_/`
- `morphism:` → `user/morphism/`
- `state:` → `user/state/`

Also add a `crateUrl` getter that builds the full docs.rs URL.

### 2. Update framework layers (`src/data/framework-layers.ts`)
Add `crateModules` array to each layer linking to docs.rs module pages. Update the namespace links to include docs.rs URLs alongside (or replacing) the GitHub Pages URLs. Each namespace entry gets a second link: `{ label: "Rust Traits", url: "https://docs.rs/uor-foundation/latest/uor_foundation/..." }`.

### 3. Update "Build" pillar (`src/data/pillars.ts`)
Change the "Build" pillar CTA to link to the crate as the primary build action:
- Description: mention `cargo add uor-foundation` as the way to start building
- Keep `/projects` as href but add a subtitle referencing the crate

### 4. Add crate badge to featured projects data (`src/data/featured-projects.ts`)
Add the `uor-foundation` crate itself as a featured project (it IS the canonical implementation):
```ts
{
  name: "UOR Foundation Crate",
  slug: "uor-foundation",
  category: "Core",
  description: "The canonical Rust implementation of the UOR Framework. Every ontology class as a trait, every property as a method, every named individual as a constant.",
  maturity: "Graduated",
  license: "Apache-2.0",
  url: "https://crates.io/crates/uor-foundation",
}
```

### 5. Update StandardPage framework layer cards (`src/modules/framework/pages/StandardPage.tsx`)
Each layer card currently links to GitHub Pages docs. Add a secondary "Rust Traits →" link under each card that points to the docs.rs module for that layer. This creates a direct path from every framework concept on the website to its canonical Rust definition.

### 6. Add `uor!` macro showcase to highlights or about (`src/data/highlights.ts`)
The crate's `uor!` macro is its most distinctive feature — compile-time verified algebraic expressions. This deserves visibility. Add a highlight entry pointing to the macro docs.

### 7. Update "Specification" card in about-cards (`src/data/about-cards.ts`)
Update the description to mention the Rust crate as the reference implementation:
"We maintain the formal specification as a Rust crate (`uor-foundation`), publish updates, and ship reference implementations that anyone can audit."

---

## Files Modified (7)
1. `src/modules/namespace-registry.ts` — add `crateModule` field to each namespace
2. `src/data/framework-layers.ts` — add docs.rs links to each layer's namespaces  
3. `src/data/pillars.ts` — reference crate in "Build" pillar
4. `src/data/featured-projects.ts` — add crate as featured project
5. `src/modules/framework/pages/StandardPage.tsx` — add docs.rs links to layer cards
6. `src/data/highlights.ts` — add crate/macro highlight
7. `src/data/about-cards.ts` — update Specification card copy

## No new dependencies. No visual design changes. Pure content anchoring.
