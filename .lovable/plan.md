

# Tidy Up uor-os/ — Clean Structure, Clear Labels, Polished README

## Current State

The `uor-os/` folder has **50 modules** dumped flat under `src/modules/`, mixing foundational kernel logic with UI shells, cloud functions, compliance tools, and experimental research modules. Several modules are "absorbed" (consolidated into others but still present as separate directories): `triad`, `jsonld`, `shacl`, `data-bank`, `qr-cartridge`, `messenger`. The README is functional but generic.

## Proposed Directory Structure

Reorganize `src/modules/` into **6 labeled subsystem directories**, each with a short `README.md` explaining its purpose. No import paths change — only the physical folder layout shifts, and every `@/modules/...` alias is updated to `@/modules/<subsystem>/...`.

```text
uor-os/
├── README.md                    ← Complete rewrite (see below)
├── LICENSE                      ← Apache 2.0 (already present)
├── ARCHITECTURE.md              ← Technical deep-dive for contributors
├── docs/
│   └── EDGE-FUNCTIONS.md        ← Index of all 47 cloud functions
│
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── custom-sw.ts
│   │
│   ├── modules/
│   │   ├── kernel/              ← "Layer 0 — Computation & Algebra"
│   │   │   ├── README.md
│   │   │   ├── engine/          ← Ring R₈ computation engine + WASM
│   │   │   ├── ring-core/       ← Algebraic ring, proofs, reasoning
│   │   │   ├── axioms/          ← Axiom registry & verification
│   │   │   ├── derivation/      ← Auditable derivation chains
│   │   │   ├── resolver/        ← Entity resolution & partition
│   │   │   ├── morphism/        ← Structure-preserving transforms
│   │   │   ├── state/           ← State machine & type system
│   │   │   └── observable/      ← Observer pattern & event streams
│   │   │
│   │   ├── identity/            ← "Layer 1 — Naming & Addressing"
│   │   │   ├── README.md
│   │   │   ├── uns/             ← Universal Name System (DNS-equivalent)
│   │   │   ├── addressing/      ← (current identity/ module)
│   │   │   ├── certificate/     ← X.509 / DID / Verifiable Credentials
│   │   │   └── qr-cartridge/    ← QR encoding of UOR addresses
│   │   │
│   │   ├── platform/            ← "Layer 2 — OS Shell & Services"
│   │   │   ├── README.md
│   │   │   ├── desktop/         ← Desktop shell, dock, windows, themes
│   │   │   ├── boot/            ← Sovereign boot sequence
│   │   │   ├── bus/             ← Service mesh / RPC bus
│   │   │   ├── compose/         ← App orchestrator (Docker-equivalent)
│   │   │   ├── app-store/       ← Application marketplace
│   │   │   ├── app-builder/     ← Docker-style build pipeline
│   │   │   ├── auth/            ← Authentication providers
│   │   │   ├── core/            ← Design system & UI primitives
│   │   │   ├── landing/         ← Download / landing page
│   │   │   └── ontology/        ← SKOS vocabulary registry
│   │   │
│   │   ├── data/                ← "Layer 3 — Storage & Knowledge"
│   │   │   ├── README.md
│   │   │   ├── knowledge-graph/ ← Local SQLite + GrafeoDB
│   │   │   ├── sovereign-vault/ ← AES-256-GCM encrypted storage
│   │   │   ├── sovereign-spaces/← P2P sync & collaboration
│   │   │   ├── sparql/          ← SPARQL query engine
│   │   │   ├── jsonld/          ← JSON-LD emission & validation
│   │   │   ├── code-kg/         ← Code knowledge graph
│   │   │   ├── takeout/         ← Data export / portability
│   │   │   └── time-machine/    ← Checkpoint & restore
│   │   │
│   │   ├── intelligence/        ← "Layer 4 — AI, Agents & Comms"
│   │   │   ├── README.md
│   │   │   ├── oracle/          ← AI assistant + search + library
│   │   │   ├── agent-tools/     ← 5 canonical MCP agent tools
│   │   │   ├── mcp/             ← Model Context Protocol gateway
│   │   │   ├── messenger/       ← Post-quantum encrypted messaging
│   │   │   ├── epistemic/       ← Knowledge grading engine
│   │   │   ├── media/           ← Audio/video streaming
│   │   │   └── audio/           ← Audio engine & voice
│   │   │
│   │   ├── research/            ← "Layer 5 — Experimental & Advanced"
│   │   │   ├── README.md
│   │   │   ├── quantum/         ← Quantum circuit simulation
│   │   │   ├── atlas/           ← Mathematical atlas & topology
│   │   │   ├── qsvg/            ← Quantum SVG / proof-of-thought
│   │   │   ├── shacl/           ← SHACL conformance testing
│   │   │   └── canonical-compliance/ ← Compliance dashboard
│   │   │
│   │   ├── interoperability/    ← Stays (CNCF compat, API explorer)
│   │   │   ├── cncf-compat/
│   │   │   ├── api-explorer/
│   │   │   └── README.md
│   │   │
│   │   ├── uor-sdk/             ← Stays at top level (developer SDK)
│   │   ├── verify/              ← Stays at top level (audit & verification)
│   │   └── namespace-registry.ts
│   │
│   ├── lib/                     ← Shared utilities (no change)
│   ├── types/                   ← UOR Foundation types (no change)
│   ├── hooks/                   ← App-level React hooks (no change)
│   ├── components/              ← Shared components (no change)
│   ├── integrations/            ← Backend client (no change)
│   ├── assets/                  ← Images & icons (no change)
│   └── test/                    ← Test setup (no change)
│
├── supabase/                    ← Cloud functions & migrations (no change)
├── src-tauri/                   ← Rust desktop backend (no change)
└── public/                      ← Static assets (no change)
```

## What Gets Removed

The following "absorbed" modules become re-export stubs (1-2 lines pointing to their new home) to avoid breaking any lingering imports:
- `triad/` → already consolidated into `ring-core/`
- `data-bank/` → already consolidated into `sovereign-vault/`
- `ceremony/` → single file, move into `boot/`

## README.md — Complete Rewrite

The new README follows the Why → How → What narrative structure, targeting experienced open-source developers. Sections:

1. **One-liner** — What UOR OS is in a single sentence
2. **Why** — The problem it solves (2 paragraphs)
3. **How It Works** — Architecture overview with the layered diagram above
4. **Quick Start** — Web and Desktop in 4 lines each
5. **Module Index** — Table of all subsystems with one-line descriptions
6. **Cloud Functions** — Reference to `docs/EDGE-FUNCTIONS.md`
7. **Configuration** — Environment variables, Tauri config
8. **Contributing** — Where to start, how modules are structured
9. **License** — Apache 2.0

## ARCHITECTURE.md — New File

A technical companion document covering:
- The Tri-Space ontology (Kernel / Bridge / User)
- Ring R₈ and why it matters
- Content addressing model (CID → IPv6 → Braille → Glyph)
- Module lifecycle (boot → bus registration → lazy load)
- WASM integration strategy

## docs/EDGE-FUNCTIONS.md — New File

A table of all 47 edge functions with name, purpose, and auth requirements.

## Implementation Steps

| Step | Description |
|------|-------------|
| 1 | Create subsystem directories (`kernel/`, `identity/`, `platform/`, `data/`, `intelligence/`, `research/`) with README.md files |
| 2 | Move each module into its subsystem directory |
| 3 | Update every `@/modules/...` import across all source files to reflect new paths |
| 4 | Convert absorbed modules (`triad`, `data-bank`, `ceremony`) to re-export stubs |
| 5 | Write the new `README.md` |
| 6 | Write `ARCHITECTURE.md` |
| 7 | Write `docs/EDGE-FUNCTIONS.md` |
| 8 | Update `App.tsx`, `main.tsx`, `namespace-registry.ts`, and `bus/modules/` to use new paths |
| 9 | Verify build passes |

## Risk

This is a large-scale path refactor (~200+ files with import changes). The mechanical work is straightforward but volume is high. Every `@/modules/X` import becomes `@/modules/<subsystem>/X`. The `@/` alias resolution in Vite means only the path segment after `modules/` changes.

## What Does NOT Change

- No logic changes to any module
- No dependency changes
- No Vite/Tailwind/TypeScript config changes
- `src/lib/`, `src/types/`, `src/hooks/`, `src/integrations/` stay exactly where they are
- `supabase/`, `src-tauri/`, `public/` untouched

