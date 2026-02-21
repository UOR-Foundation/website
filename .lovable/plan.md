

# Modular Architecture Plan for UOR Foundation Website

## Vision

Restructure the entire codebase into self-contained, independently extractable modules, each anchored to the UOR Framework specification. Every module will be self-describing (via a `module.json` manifest) and interoperable with every other module through a shared contract layer rooted in UOR namespaces.

## Current State

The codebase is currently a monolithic single-repo application:
- **Frontend**: 12 page components, 7 section components, 3 animation components, 6 layout components -- all tightly coupled via direct imports
- **Backend**: One 3,953-line monolithic edge function (`uor-api/index.ts`) containing kernel math, content addressing, storage, rate limiting, and routing all in a single file
- **Shared logic**: Only one extracted library (`lib/store.ts`); all other logic is inline
- **No module contracts**: Components import each other freely with no defined boundaries or interfaces

## Target Architecture

Seven self-contained modules, each mappable to a standalone repository:

```text
src/
  modules/
    core/           -- Design system, layout shell, shared types
    framework/      -- UOR Framework page + FrameworkLayers component
    community/      -- Research, blog, events (Our Community page)
    projects/       -- Project maturity framework + submission
    api-explorer/   -- Interactive API documentation page
    donate/         -- Donation page + DonatePopup
    landing/        -- Homepage sections (Hero, Intro, Pillars, Highlights, CTA)

supabase/functions/
    uor-api/
      handlers/
        kernel.ts     -- Layer 0-2: math, addressing, operations
        bridge.ts     -- Layer 3-4: resolution, verification, proofs
        user.ts       -- Layer 5: morphisms, state, types
        store.ts      -- Storage: IPFS, Pinata, Storacha
      lib/
        store.ts      -- Pure functions (existing)
        ring.ts       -- Ring arithmetic
        addressing.ts -- Braille bijection, CID computation
        http.ts       -- CORS, error responses, rate limiting
      index.ts        -- Thin router only (under 200 lines)
    project-submit/
      index.ts        -- Unchanged (already self-contained)
```

## Module Design Principles

Each module follows these rules:

1. **Self-describing manifest** (`module.json`): declares name, version, UOR namespace anchors, exported components, required dependencies on other modules, and the UOR specification version it complies with.

2. **Single entry point** (`index.ts`): re-exports everything the module offers. No reaching into internal files from outside.

3. **Explicit contract layer**: Each module defines its TypeScript interfaces in a `types.ts` file. Cross-module communication happens only through these interfaces.

4. **UOR namespace anchoring**: Every module declares which UOR namespaces it implements or consumes (e.g., `store:`, `proof:`, `op:`), creating a formal link to the specification.

5. **Zero circular dependencies**: The dependency graph is a strict DAG (directed acyclic graph) with `core` at the root.

## Module Dependency Graph

```text
core (design system, Layout, shared types)
  |
  +-- landing (homepage sections)
  +-- framework (UOR Framework page)
  +-- community (research, blog, events)
  +-- projects (maturity framework, submission form)
  +-- api-explorer (interactive API docs)
  +-- donate (donation pages)
```

All modules depend on `core`. No module depends on another peer module.

## Detailed Module Breakdown

### 1. `core` -- Design System and Shell

**Contents:**
- `Layout.tsx`, `Navbar.tsx`, `Footer.tsx`, `ScrollProgress.tsx`, `NavLink.tsx`
- All `ui/` components (dialog, toast, tooltip, sonner)
- `index.css` (design tokens, theme variables)
- Shared hooks (`use-toast.ts`)
- `lib/utils.ts`
- `types.ts`: `ModuleManifest`, `NavItem`, `LayoutProps` interfaces

**UOR anchors:** None (infrastructure only)

**Exports:** `Layout`, `Navbar`, `Footer`, all UI primitives, design tokens, utility functions

### 2. `framework` -- UOR Framework Page

**Contents:**
- `Standard.tsx` (page)
- `FrameworkLayers.tsx` (interactive layer accordion)
- `UORDiagram.tsx` (visual diagram)
- Layer data definitions (currently inline in components)

**UOR anchors:** All 14 namespaces (this module IS the framework presentation)

**Exports:** `FrameworkPage`, `FrameworkLayers`, `UORDiagram`, layer data constants

### 3. `community` -- Research, Blog, Events

**Contents:**
- `Research.tsx` (page)
- `BlogPost1.tsx`, `BlogPost2.tsx`, `BlogPost3.tsx` (pages)
- `ResearchPaperAtlasEmbeddings.tsx` (page)
- Research category data, blog post data, event data
- Related image assets

**UOR anchors:** `proof:`, `derivation:` (research outputs reference these)

**Exports:** `CommunityPage`, `BlogPostPage`, blog/research data constants

### 4. `projects` -- Project Maturity Framework

**Contents:**
- `Projects.tsx` (page)
- `CollapsibleCategory` component (currently inline)
- Project data, maturity level definitions
- Submission form logic
- Related image assets

**UOR anchors:** `cert:` (project certification/maturity)

**Exports:** `ProjectsPage`, project data, maturity level types

### 5. `api-explorer` -- Interactive API Documentation

**Contents:**
- `Api.tsx` (page -- currently 1,224 lines)
- Endpoint data definitions
- Interactive "Try it" panel components
- Layer/endpoint types

**UOR anchors:** All 14 namespaces (documents the full API surface)

**Exports:** `ApiExplorerPage`, endpoint data, layer definitions

### 6. `donate` -- Donation

**Contents:**
- `Donate.tsx` (page)
- `DonatePopup.tsx` (modal component)
- Donation project data

**UOR anchors:** None (operational)

**Exports:** `DonatePage`, `DonatePopup`

### 7. `landing` -- Homepage

**Contents:**
- `HeroSection.tsx`, `IntroSection.tsx`, `PillarsSection.tsx`
- `HighlightsSection.tsx`, `ProjectsShowcase.tsx`, `CTASection.tsx`
- `GalaxyAnimation.tsx` + `galaxy.css`
- Related image assets

**UOR anchors:** `u:` (hero references content addressing)

**Exports:** `HomePage`, all section components

## Module Manifest Format

Each module will contain a `module.json`:

```json
{
  "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
  "@type": "uor:Module",
  "name": "framework",
  "version": "1.0.0",
  "description": "UOR Framework presentation and interactive documentation",
  "uor:specification": "1.0.0",
  "uor:namespaces": ["u:", "schema:", "op:", "partition:", "proof:", "cert:"],
  "exports": ["FrameworkPage", "FrameworkLayers", "UORDiagram"],
  "dependencies": {
    "core": "^1.0.0"
  },
  "routes": ["/standard"],
  "assets": ["uor-diagram-data.ts"]
}
```

This manifest is machine-readable, JSON-LD compatible, and anchored to the UOR context. When a module is extracted to its own repo, this manifest tells any consumer exactly what it provides and what it needs.

## Backend Decomposition (Edge Function)

The 3,953-line `uor-api/index.ts` will be split into focused handler files:

### `handlers/kernel.ts` (~400 lines)
- Ring arithmetic (`neg`, `bnot`, `succ`, `pred`, `add`, `sub`, `mul`, `xor`, `and`, `or`)
- Content addressing (Braille bijection)
- Datum construction
- Routes: `/kernel/op/verify`, `/kernel/op/verify/all`, `/kernel/op/compute`, `/kernel/op/operations`, `/kernel/address/encode`, `/kernel/schema/datum`

### `handlers/bridge.ts` (~500 lines)
- Partition classification
- Proof generation (critical identity, coherence)
- Certificate generation (involution)
- Derivation traces, execution traces
- Resolver logic
- Routes: `/bridge/*`

### `handlers/user.ts` (~300 lines)
- Type primitives
- Morphism transforms
- State/frame management
- Observable metrics
- Routes: `/user/*`

### `handlers/store.ts` (~600 lines)
- Pinata integration
- Storacha integration
- Store write/read/verify/resolve/gateways
- Routes: `/store/*`

### `lib/http.ts` (~100 lines)
- CORS headers
- Error response factories (`error400`, `error405`, `error415`, etc.)
- Rate limiting
- ETag computation
- Rate limit header builder

### `lib/ring.ts` (~50 lines)
- Pure ring arithmetic functions extracted from inline definitions

### `lib/addressing.ts` (~30 lines)
- `encodeGlyph`, `addressSimplified`, `makeDatum`

### `index.ts` (~150 lines)
- Import all handlers
- Route dispatch table
- OpenAPI/navigate endpoint
- CORS preflight handling

## Implementation Steps

### Phase 1: Create module directory structure
- Create `src/modules/` with seven subdirectories
- Add `module.json`, `index.ts`, and `types.ts` to each module
- Move existing components into their respective modules
- Update all import paths

### Phase 2: Extract shared contracts
- Define `ModuleManifest` TypeScript interface in `core/types.ts`
- Define cross-module interfaces (e.g., `NavItem`, `RouteConfig`)
- Create barrel exports (`index.ts`) for each module

### Phase 3: Refactor App.tsx routing
- Replace direct page imports with module-level imports
- Each module exports its route configuration
- `App.tsx` composes routes from all modules dynamically

### Phase 4: Decompose the edge function
- Extract `lib/http.ts`, `lib/ring.ts`, `lib/addressing.ts`
- Extract `handlers/kernel.ts`, `handlers/bridge.ts`, `handlers/user.ts`, `handlers/store.ts`
- Reduce `index.ts` to a thin router importing handlers
- Run existing tests to verify no regressions

### Phase 5: Asset co-location
- Move images from `src/assets/` and `public/images/` into their owning modules
- Each module owns its assets, making extraction to a separate repo self-contained

### Phase 6: Clean up Storacha debug logging
- Remove the try/catch debug wrapper added during integration debugging
- Restore clean error propagation

## Technical Notes

- All module imports will use the `@/modules/<name>` path alias pattern
- The existing `@/components/ui` path will be redirected to `@/modules/core/ui`
- No new dependencies are required; this is purely a structural refactor
- The `public/` directory files (llms.md, openapi.json, contexts/, .well-known/) remain at the project root as they are protocol-level assets, not module assets
- The Lovable Cloud integration files (`src/integrations/supabase/`) remain untouched

