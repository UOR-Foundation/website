

# Isolating the UOR OS Into a Self-Contained Folder

## The Reality

The OS is **not** contained in one folder. It's distributed across ~35 modules, shared libraries, types, hooks, and the Tauri backend. A naive folder copy would break immediately due to hundreds of cross-references using `@/` path aliases.

The cleanest approach: create a `uor-os/` folder at the repo root that mirrors a complete, standalone Vite+React+Tauri project — with its own `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, and a `src/` subtree containing only OS-relevant code. The website-only modules stay behind in the original repo.

## What Goes Into `uor-os/` (OS-Required)

### Core OS Modules (~30 modules)
```text
src/modules/
├── desktop/          ← Shell, windows, dock, spotlight, themes
├── boot/             ← Init system, sovereign boot, seal
├── engine/           ← Ring R₈, WASM adapter, kernel declaration
├── bus/              ← Service mesh, registry, dispatch
├── compose/          ← Orchestrator, blueprints, reconciler
├── oracle/           ← AI assistant, voice, search, library, daily notes
├── knowledge-graph/  ← GrafeoDB, SPARQL, graph explorer
├── sovereign-vault/  ← Encrypted storage, context manager
├── sovereign-spaces/ ← Multi-space, sync, deep-link, clipboard
├── uns/              ← Universal Name System, DHT, resolver
├── identity/         ← Identity pages (vault UI)
├── messenger/        ← Encrypted messaging
├── certificate/      ← UOR certificates
├── time-machine/     ← Checkpoints, auto-save
├── takeout/          ← Data export/import
├── app-store/        ← App catalog
├── app-builder/      ← Docker-style build pipeline
├── canonical-compliance/ ← Conformance dashboard
├── media/            ← Media player
├── ontology/         ← SKOS vocabulary
├── shacl/            ← Conformance tests
├── ring-core/        ← Ring operations
├── verify/           ← Verification engine
├── morphism/         ← Morphism system
├── observable/       ← Health/metrics
├── resolver/         ← Resolution engine
├── state/            ← State management
├── mcp/              ← Model Context Protocol
├── uor-sdk/          ← WASM runtime, WebGPU
├── core/ui/          ← Shared UI primitives (dialog, toast, command, etc.)
└── core/components/  ← StatBlock and shared components used by OS
```

### Shared Libraries
```text
src/lib/
├── runtime.ts        ← Tauri/browser detection
├── crypto.ts         ← SHA-256
├── uor-canonical.ts  ← Single proof hash
├── uor-address.ts    ← Content addressing
├── uor-triword.ts    ← Triword encoding
├── uor-ring.ts       ← Ring engine
├── uor-codec.ts      ← Codec
├── uor-certificate.ts
├── uor-registry.ts
├── uor-content-registry.ts
├── uor-receipt.ts
├── ring-engine.ts
├── local-llm-engine.ts
├── utils.ts
└── wasm/             ← WASM artifacts
```

### Other Required Pieces
- `src/types/` — UOR Foundation type declarations
- `src/hooks/use-auth.tsx`, `use-mobile.tsx` — shared hooks
- `src/integrations/supabase/` — backend client
- `src-tauri/` — entire Tauri backend
- `src/custom-sw.ts` — service worker
- `public/` — static assets (icons, manifest)

## What Stays Behind (Website-Only)

```text
src/modules/landing/      ← Homepage, hero, features
src/modules/community/    ← Blog posts, research papers
src/modules/projects/     ← Project detail pages
src/modules/donate/       ← Donation page
src/modules/core/pages/   ← About, Standard, SemanticWeb pages
src/pages/                ← UnsExplainer
```

## Implementation Approach

Rather than physically moving files (which would break the existing repo), the implementation will:

1. **Create `uor-os/`** at repo root with its own project scaffolding:
   - `package.json` (same dependencies, OS-only scripts)
   - `vite.config.ts` (with `@/` alias pointing to `uor-os/src`)
   - `tsconfig.json`
   - `tailwind.config.ts`
   - `index.html`

2. **Create `uor-os/src/`** with a new `App.tsx` containing only OS routes:
   - `/` → DesktopShell (the OS is the homepage)
   - `/download` → DownloadPage
   - `/oracle` → OraclePage
   - `/resolve` → ResolvePage
   - `/messenger` → MessengerPage
   - `/library` → LibraryPage
   - `/compliance` → ComplianceDashboardPage
   - `/app-store` → AppStorePage

3. **Copy all OS-required modules** into `uor-os/src/modules/`

4. **Copy shared deps** (`lib/`, `types/`, `hooks/`, `integrations/`, `components/`, `assets/`)

5. **Copy `src-tauri/`** into `uor-os/src-tauri/`

6. **Create a `uor-os/README.md`** with build/deploy instructions

The result: `uor-os/` is a complete, self-contained project. You can `cp -r uor-os/ ../new-repo/` and run `npm install && npm run dev` immediately.

## File Count Estimate

~300+ files will be copied/created. The `uor-os/` folder will be approximately 80-90% of the current `src/` — the OS **is** the bulk of this project. Only the landing/community/projects/donate pages are website-specific.

## Key Decisions

- The `uor-os/` App.tsx will make the desktop shell (`/os`) the root route (`/`)
- Supabase integration files are copied as-is (same backend)
- The `@/` alias in the new project points to `uor-os/src/`
- No import paths need to change inside any module — they all use `@/` which will resolve correctly in the new project

## Steps

| # | Action |
|---|--------|
| 1 | Create `uor-os/` scaffolding (package.json, vite.config.ts, tsconfig, tailwind, index.html) |
| 2 | Create `uor-os/src/App.tsx` with OS-only routes |
| 3 | Create `uor-os/src/main.tsx` and `uor-os/src/index.css` |
| 4 | Copy all OS-required modules into `uor-os/src/modules/` |
| 5 | Copy `src/lib/`, `src/types/`, `src/hooks/`, `src/integrations/`, `src/components/`, `src/assets/` |
| 6 | Copy `src-tauri/` → `uor-os/src-tauri/` |
| 7 | Create `uor-os/README.md` |

This is a large operation (~300 files). The implementation will use parallel file creation where possible.

