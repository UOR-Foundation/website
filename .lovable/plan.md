

# Canonical Rust Crate Anchoring Plan

## Concept

Every discovery surface on uor.foundation — metadata, agent files, JSON-LD, UI, and OpenAPI — will declare `uor-foundation` (the Rust crate on crates.io) as the single canonical source of truth. The website, API, MCP, and future playground all become *instantiations* of what the crate defines. The crate is the root; everything else is a projection.

```text
                    ┌─────────────────────────┐
                    │   uor-foundation crate   │
                    │   (canonical authority)   │
                    └────────┬────────────────┘
           ┌─────────┬──────┴──────┬──────────┐
           ▼         ▼            ▼           ▼
        Website    REST API      MCP      Playground
       (this app)  (edge fns)  (future)   (future)
```

## Changes (11 files)

### 1. `src/data/external-links.ts` — Add crate URLs
Add three constants:
- `CRATE_URL` = `https://crates.io/crates/uor-foundation`
- `CRATE_DOCS_URL` = `https://docs.rs/uor-foundation`
- `CRATE_SOURCE_URL` = `https://docs.rs/crate/uor-foundation/latest/source/`

All other files import from here — single source of truth for these URLs.

### 2. `public/.well-known/uor.json` — Add `source_of_truth` root block
Insert a top-level block declaring the crate as canonical origin:
```json
"source_of_truth": {
  "type": "rust-crate",
  "name": "uor-foundation",
  "crate": "https://crates.io/crates/uor-foundation",
  "docs": "https://docs.rs/uor-foundation",
  "repository": "https://github.com/UOR-Foundation/UOR-Framework",
  "install": "cargo add uor-foundation",
  "no_std": true,
  "license": "Apache-2.0",
  "relationship": "All API endpoints, MCP tools, and TypeScript types are projections of this crate"
}
```

### 3. `public/openapi.json` — Add `x-source-crate` to info block
Add three extension fields to the existing `info` object:
```json
"x-source-crate": "https://crates.io/crates/uor-foundation",
"x-source-docs": "https://docs.rs/uor-foundation",
"x-source-install": "cargo add uor-foundation"
```
This tells any agent reading the OpenAPI spec where the canonical definitions live.

### 4. `public/llms.txt` — Add crate as primary resource
Add a new `## Source of Truth` section after the Documentation section:
```
## Source of Truth

The canonical implementation is the Rust crate `uor-foundation`.
All API endpoints, schemas, and type definitions are projections of this crate.

- Crate: https://crates.io/crates/uor-foundation
- API docs: https://docs.rs/uor-foundation
- Install: cargo add uor-foundation
```

### 5. `public/llms.md` — Add crate provenance
- Add `crate: https://crates.io/crates/uor-foundation` to the YAML frontmatter
- Add a "Source of Truth" section after "How To Use It" explaining the crate is the canonical authority
- Add crate rows to the Resources table at the bottom

### 6. `public/llms-full.md` — Add crate provenance
- Add `crate: https://crates.io/crates/uor-foundation` to the YAML frontmatter
- Update the "0. Start Here" section to mention the crate as the canonical Rust implementation
- Update the ontology stats line to reference the crate

### 7. `public/agent-discovery.md` — Add crate to resource tables
- Add `crate: https://crates.io/crates/uor-foundation` to the YAML frontmatter
- Add crate rows to both the Document Hierarchy and Machine-Readable Discovery tables
- Add crate to the footer reference block

### 8. `public/robots.txt` — Add crate reference
Add two comment lines in the AI Agent Discovery block:
```
# Source of Truth (Rust crate): https://crates.io/crates/uor-foundation
# Crate API Docs: https://docs.rs/uor-foundation
```

### 9. `src/modules/core/components/AgentBeacon.tsx`
- Add `"sourceOfTruth"` object to the JSON-LD schema pointing to crates.io and docs.rs
- Add a `<h3>Source of Truth</h3>` section in the semantic HTML explaining the crate is the canonical implementation
- Add crate links to the `<nav>` block

### 10. `src/modules/core/components/UorMetadata.tsx`
Add `"uor:sourceOfTruth"` field to the injected JSON-LD module graph:
```json
"uor:sourceOfTruth": {
  "type": "rust-crate",
  "name": "uor-foundation",
  "crate": "https://crates.io/crates/uor-foundation",
  "docs": "https://docs.rs/uor-foundation"
}
```

### 11. `src/modules/framework/pages/StandardPage.tsx` — Add Rust Crate CTA
- Add a third button in the hero alongside "Read the Docs" and "View on GitHub":
  - Label: **"Rust Crate"** with a 🦀 or external-link icon
  - Links to `https://crates.io/crates/uor-foundation`
- Add a docs.rs link as a secondary action
- In the bottom CTA section, add crate link alongside the existing spec/GitHub buttons

### 12. `src/types/uor-foundation/index.ts` — Update doc header
Update the module documentation comment to declare Rust crate provenance:
```ts
/**
 * UOR Foundation v2.0.0 — TypeScript Projection
 *
 * Canonical source of truth: https://crates.io/crates/uor-foundation (Rust)
 * API documentation: https://docs.rs/uor-foundation
 *
 * These TypeScript types are a projection of the authoritative Rust crate's
 * trait definitions. The crate is the single source of truth for all
 * namespaces, classes, properties, and named individuals in the UOR ontology.
 * ...existing doc content...
 */
```

## What stays untouched
- All visual design, animations, and performance optimizations
- All existing GitHub links (kept alongside crate links — GitHub is the repo, crate is the published authority)
- All routes, lazy loading, PWA config
- No new dependencies

## Summary
Every machine-readable and human-readable discovery surface will point to the Rust crate as the root authority. The website becomes the *canonical entry point* into the framework, but explicitly declares that it (and the API, and any future MCP/playground) are instantiations of what the crate defines. Agents, developers, and crawlers all encounter this provenance chain regardless of which surface they enter through.

