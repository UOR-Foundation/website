

# UOR System Architecture — 4-Layer Model

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
│  src/modules/engine/                                     │
│  singleProofHash, verifySingleProof, computeCid          │
│  URDNA2015 → SHA-256 → derivation ID / CID / IPv6       │
└──────────────────────────────────────────────────────────┘
```

## Layer 0: UOR Engine (`src/modules/engine/`)

Pure computational kernel. Zero storage, zero network, zero side-effects.
One input → one hash → four derived identity forms.

Canonical entry point: `bus.call("kernel/derive", payload)`

## Layer 1: Knowledge Graph (`graph/*` bus namespace)

Pluggable storage layer. Any backend (IndexedDB, Supabase, Neo4j)
that can call `kernel/derive` works as a Layer 1 provider.

## Layer 2: Sovereign Bus (`src/modules/bus/`)

Single API surface. JSON-RPC 2.0 envelope. All system calls route here.

## Layer 3: UX/UI

React components. Import nothing from Layer 0/1 directly — only `bus.call()`.
