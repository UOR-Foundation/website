

# Formalize Layer 0: UOR Engine as Independent Foundation

## Architecture Change

```text
┌──────────────────────────────────────────────────────────┐
│  Layer 3: UX/UI                                          │
│  Imports ONLY from the Bus                               │
└───────────────────────┬──────────────────────────────────┘
                        │  bus.call("ns/op", payload)
┌───────────────────────▼──────────────────────────────────┐
│  Layer 2: Sovereign Bus (Single API surface)             │
│  POST /bus → JSON-RPC 2.0 envelope                       │
│  Local: kernel, graph, cert, data-engine, blueprint      │
│  Remote: oracle, store, scrape, audio, social            │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────┐
│  Layer 1: Knowledge Graph (Pluggable storage)            │
│  IndexedDB triple store, Supabase tables, sync-bridge    │
│  CONSUMES Layer 0 for addressing — never owns it         │
└───────────────────────┬──────────────────────────────────┘
                        │  kernel.derive() / kernel.verify()
┌───────────────────────▼──────────────────────────────────┐
│  Layer 0: UOR Engine (Pure computation, zero deps)       │
│  singleProofHash, verifySingleProof, computeCid          │
│  URDNA2015 → SHA-256 → derivation ID / CID / IPv6       │
│  uor-foundation Rust crate (WASM) as canonical impl     │
└──────────────────────────────────────────────────────────┘
```

## Why This Is Right

- **Layer 0 is pure math** — deterministic functions with zero storage dependency
- **KG becomes pluggable** — any storage backend that can call `kernel/derive` works
- **Single API endpoint unchanged** — `bus.call("kernel/derive", payload)` remains the one canonical entry point
- **Already decoupled in code** — `kg-store/store.ts` does not import from `uor-canonical.ts`; this formalizes what already exists

## Concrete Changes (4 steps)

### 1. Create `src/modules/engine/` — Layer 0 home

Move `src/lib/uor-canonical.ts`, `src/lib/uor-address.ts`, and `src/lib/crypto.ts` into `src/modules/engine/`. Add a barrel `index.ts` that exports the public API: `singleProofHash`, `verifySingleProof`, `computeCid`, `computeUorAddress`, `sha256hex`. Keep backward-compatible re-exports at the old paths so nothing breaks.

### 2. Update `kernel.ts` bus registration to import from `@/modules/engine`

Change the four dynamic imports from `@/lib/uor-canonical` to `@/modules/engine`. No API change — `kernel/encode`, `kernel/decode`, `kernel/verify`, `kernel/derive` remain identical.

### 3. Make KG graph module explicitly consume kernel via bus

Where `graph/*` operations need to derive a UOR address, they call `bus.call("kernel/derive", ...)` internally rather than importing engine code directly. This enforces the layering: Layer 1 accesses Layer 0 only through the bus, keeping the dependency direction clean and auditable.

### 4. Update documentation and namespace registry

- Update the architecture diagram in plan.md to show 4 layers (0-3)
- Update `namespace-registry.ts` to annotate `kernel` as Layer 0 and `graph` as Layer 1
- Add a `layer` field to `NamespaceDescriptor` type: `layer: 0 | 1 | 2 | 3`

## What Does NOT Change

- **Bus API surface** — zero breaking changes, `kernel/*` and `graph/*` methods stay identical
- **Gateway edge function** — untouched, still dispatches remote calls
- **UI components** — still call `bus.call()`, unaware of layer numbers
- **WASM bridge** — stays where it is, consumed by the engine module

## Result

The UOR Engine becomes a self-contained, zero-dependency computational kernel at Layer 0. Any future KG implementation (Neo4j, DGraph, a custom RDF store) plugs in at Layer 1 by consuming `kernel/derive` and `kernel/verify` — the engine doesn't know or care what stores its output.

