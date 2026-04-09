

# Sovereign API: Three-Part Modular Architecture

## Evaluation of Current State

**41 edge functions**, each with independent CORS/auth. **28 client files** construct function URLs in 3+ inconsistent patterns. A 10,954-line `uor-api` monolith. A namespace registry that describes modules but does not dispatch to them. The UOR engine, KG, and UI are tangled — components directly import graph stores, call edge functions, and wire pipelines inline.

The system works, but it is not yet sovereign. A sovereign API means: one call surface, local-first resolution, uniform envelope, and zero coupling between the three layers.

---

## Target Architecture: Three Clean Layers

```text
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: UX/UI (Renderable on demand, fully swappable)     │
│  React components import ONLY from the Bus. Never from      │
│  KG stores, edge functions, or UOR libs directly.           │
└────────────────────────┬────────────────────────────────────┘
                         │  bus.call("ns/op", payload)
                         │
┌────────────────────────▼────────────────────────────────────┐
│  Layer 2: Sovereign Bus (Single API surface)                │
│                                                             │
│  POST /bus  { ns, op, payload }  →  BusEnvelope             │
│                                                             │
│  Local modules: kernel, graph, cert, data-engine, blueprint │
│  Remote gateway: oracle, store, scrape, audio, social       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│  Layer 1: UOR Engine + Knowledge Graph (Pure data layer)    │
│                                                             │
│  UOR Engine: singleProofHash, verifySingleProof             │
│  KG: IndexedDB triple store, graph-compute, sync-bridge     │
│  Canonical link: uor-foundation Rust crate (WASM fallback)  │
└─────────────────────────────────────────────────────────────┘
```

---

## Recommended API Standard: **JSON-RPC 2.0 over HTTP**

Why JSON-RPC 2.0 over REST or GraphQL:

| Criterion | JSON-RPC 2.0 | REST | GraphQL |
|---|---|---|---|
| Payload size | Minimal (no URL path routing, no query parsing) | Moderate | Heavy (schema introspection) |
| Latency | Single POST, no content negotiation | Multiple verbs/paths | Single POST but parser overhead |
| Batch calls | Native (`[{...}, {...}]` array) | N requests | Single query but complex resolver |
| Spec size | 1 page | Hundreds of pages (OpenAPI) | Large spec + tooling |
| Adoption | Ethereum, Bitcoin, LSP, MCP, IPFS, Solana | Ubiquitous | Meta ecosystem |
| Offline-local parity | Identical envelope local and remote | Path-based, awkward locally | Overkill for local dispatch |

JSON-RPC 2.0 is the lightest standard that supports batching, typed errors, and is already used by Ethereum, Bitcoin, IPFS, the Language Server Protocol, and MCP. One POST. One envelope. Works identically whether the bus resolves locally or remotely.

---

## Implementation Plan (10 changes)

### 1. Create `src/modules/bus/` — The Sovereign API surface

**Files**: `types.ts`, `registry.ts`, `bus.ts`, `index.ts`

The envelope follows JSON-RPC 2.0 exactly:

```typescript
// Request
{ jsonrpc: "2.0", id: 1, method: "graph/query", params: { query: "..." } }

// Response
{ jsonrpc: "2.0", id: 1, result: { nodes: [...], uorAddress: "fd00:..." } }

// Error
{ jsonrpc: "2.0", id: 1, error: { code: -32601, message: "Method not found" } }
```

`bus.call(method, params)` resolves locally first. If the module is registered as `remote`, it forwards to the gateway edge function. Batch support via `bus.batch([...])`.

The registry is a simple `Map<string, Handler>` populated by module registrations at import time.

### 2. Create `src/modules/bus/modules/` — Module registrations

One file per domain, each calling `register()`:

| File | Methods exposed | Local/Remote |
|---|---|---|
| `kernel.ts` | `kernel/encode`, `kernel/decode`, `kernel/verify`, `kernel/derive` | Local |
| `graph.ts` | `graph/put`, `graph/get`, `graph/query`, `graph/similar`, `graph/stats`, `graph/verify` | Local |
| `cert.ts` | `cert/issue`, `cert/verify`, `cert/chain` | Local |
| `data-engine.ts` | `data/ingest`, `data/profile`, `data/quality` | Local |
| `blueprint.ts` | `blueprint/decompose`, `blueprint/materialize`, `blueprint/export` | Local |
| `oracle.ts` | `oracle/ask`, `oracle/stream` | Remote |
| `store.ts` | `store/write`, `store/read`, `store/pin` | Remote |
| `scrape.ts` | `scrape/url`, `scrape/search` | Remote |

Each registration is ~20 lines — just a thin wrapper calling existing module functions.

### 3. Create unified gateway edge function

**File**: `supabase/functions/gateway/index.ts`

Single edge function. Accepts JSON-RPC 2.0 POST. Dispatches to remote-only handlers (oracle, store, scrape, audio, social, wolfram). Shared CORS, auth, rate limiting, input validation — implemented once.

Replaces the need for 28+ separate edge functions over time. Existing functions remain operational during migration.

### 4. Wire the namespace registry to the bus

Update `namespace-registry.ts` to add an `operations` field to each `NamespaceDescriptor`. The bus reads this at startup. The registry becomes the single source of truth for both documentation and dispatch.

### 5. Create `src/modules/bus/client.ts` — External sovereign API

For external consumers (CLI, agents, other apps), expose the bus as a standard HTTP endpoint:

```
POST /api/rpc
Content-Type: application/json

{ "jsonrpc": "2.0", "id": 1, "method": "graph/query", "params": { ... } }
```

This is the "sovereign API" — your personal data, queryable via a standard protocol, combinable with any LLM.

### 6. Refactor UI components to use bus only

Update the 28 files that currently construct function URLs to instead call `bus.call()`. The UI layer never imports from `local-store`, `uor-canonical`, or constructs edge function URLs. It only knows the bus.

This is the key to making the UI fully swappable — any frontend that can call `bus.call()` works.

### 7. Create `src/modules/bus/introspect.ts` — Self-describing API

`bus.call("rpc/discover")` returns all registered methods, their schemas, and whether they resolve locally or remotely. This enables auto-generated documentation, CLI completion, and agent discovery.

### 8. Create `src/modules/bus/middleware.ts` — Cross-cutting concerns

Pluggable middleware chain applied to every call: logging, timing, UOR address stamping, rate limiting. Middleware is registered like modules — `bus.use(logger)`, `bus.use(uorStamp)`.

### 9. Update KG sync-bridge to use bus

The sync bridge becomes another bus module (`sync/push`, `sync/pull`, `sync/status`) rather than a side-channel. Cloud persistence is just another bus call.

### 10. Type generation from registry

Add a build-time script that reads bus registrations and generates a typed client:

```typescript
// Auto-generated
const result = await bus.call<GraphQueryResult>("graph/query", { sparql: "..." });
//                           ^^^^^^^^^^^^^^^^^^ typed from registration schema
```

---

## Migration Path

**Phase 1** (this implementation): Create bus, register 8 core modules, create gateway, wire 5 highest-traffic UI components to bus.call().

**Phase 2** (next iteration): Migrate remaining 23 UI call sites. Deprecate individual edge functions as gateway absorbs them.

**Phase 3** (future): Expose bus as external HTTP endpoint. CLI and agent consumers call the same API. UOR engine upgrades (Rust WASM) slot in by updating the `kernel` module registration — zero changes to consumers.

---

## What This Achieves

- **One API**: `bus.call("ns/op", params)` — JSON-RPC 2.0, works identically local and remote
- **Sovereignty**: Most calls never leave the device. Your data, your API
- **Performance**: Local dispatch is a synchronous Map lookup + async handler. Sub-millisecond overhead. No HTTP for local ops
- **Modularity**: New capability = new `register()`. No monolith editing. UI is fully decoupled
- **Standards**: JSON-RPC 2.0 is the lightest widely-adopted RPC standard on the open internet
- **Auditability**: One gateway to audit. One middleware chain. One envelope format

