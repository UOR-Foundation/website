

# Sovereign Bus Hardening — Full Implementation Plan

## Summary

Wire the entire system through the Sovereign Bus with canonical API endpoints, rooted in the UOR engine (WASM + TypeScript), ensuring full portability across local, edge, and cloud environments.

## Current State

**What's solid:**
- UOR Foundation types: 33 namespaces across Kernel (19 files), Bridge (15 files), User (4 files), Enforcement (5 files) — comprehensive type coverage
- WASM layer: Compiled Rust crate (`uor_wasm_shim_bg.wasm`) with TypeScript fallback via `uor-bridge.ts` — 10 ring ops, critical identity, factorization, classification, expression evaluation
- Bus infrastructure: JSON-RPC 2.0 dispatcher with middleware, remote gateway, introspection, external client
- Gateway: 4 remote namespaces (oracle, store, scrape, wolfram) with proper dispatch

**What's missing:**
- `bus.init()` is never called — no modules actually register at runtime
- 8 bus registrations exist but ~20 modules with runtime code have none (uns, identity, resolver, audio, morphism, observable, trace, verify, sparql, vault, mcp, continuity, social, wolfram)
- No `kernel/project` endpoint to bridge engine → knowledge graph
- Gateway missing handlers for audio, social, continuity, mcp
- No shared manifest between client bus and gateway
- No React hooks for Layer 3 consumption
- WASM shim lacks higher-level operations (canonicalization, CID computation, graph projection)

## Implementation

### Phase 1 — Root: Add `kernel/project` to Bridge Engine → Graph

Modify `src/modules/bus/modules/kernel.ts`:
- Add `project` operation that calls `singleProofHash()` then `graph/put` to atomically encode content AND project it into the knowledge graph
- Add `ring` operation exposing WASM-accelerated ring arithmetic via `uor-bridge.ts`
- Add `manifest` operation returning the full bus manifest for self-description

### Phase 2 — Register All Missing Modules

Create 14 new files in `src/modules/bus/modules/`:

| File | ns | Layer | Remote? | Operations |
|---|---|---|---|---|
| `uns.ts` | uns | 1 | no | resolve, publish, computeId |
| `identity.ts` | identity | 0 | no | derive, verify, buildFull |
| `resolver.ts` | resolver | 1 | no | resolve, reverse |
| `audio.ts` | audio | 2 | yes | tts, transcribe, stream |
| `wolfram.ts` | wolfram | 2 | yes | compute |
| `social.ts` | social | 2 | yes | send, webhook |
| `continuity.ts` | continuity | 1 | yes | save, restore, chain |
| `morphism.ts` | morphism | 0 | no | apply, compose, verify |
| `observable.ts` | observable | 1 | no | emit, subscribe, snapshot |
| `trace.ts` | trace | 1 | no | record, verify, replay |
| `verify.ts` | verify | 0 | no | proof, check, receipt |
| `sparql.ts` | sparql | 1 | yes | query, update |
| `vault.ts` | vault | 1 | no | encrypt, decrypt, store |
| `mcp.ts` | mcp | 2 | yes | connect, call, discover |

Each uses lazy `await import()` to the actual module, following the existing `kernel.ts` pattern.

### Phase 3 — Shared Manifest

Create `src/modules/bus/manifest.ts`:
- Single typed constant `BUS_MANIFEST` listing every `ns/op`, its layer, local/remote flag, and description
- Both client registrations and the gateway reference this manifest
- Includes WASM-declared namespaces from `list_namespaces()` for canonical linkage to the foundation

### Phase 4 — React Hooks for Layer 3

Create `src/modules/bus/hooks.ts`:
- `useBusCall<T>(method, params)` — loading/error/data state wrapping `bus.call()`
- `useBusReachable(method)` — checks availability in current environment

### Phase 5 — Bootstrap Wiring

Modify `src/modules/bus/modules/index.ts` to import all 14 new modules.

Modify `src/App.tsx`:
- Add `import "@/modules/bus/modules"` (triggers all registrations)
- Call `bus.init()` once at startup
- Initialize WASM via `loadWasm()` from `uor-bridge.ts`

### Phase 6 — Gateway Alignment

Modify `supabase/functions/gateway/index.ts`:
- Add handler entries for `audio/tts`, `audio/transcribe`, `social/send`, `continuity/save`, `continuity/restore`, `mcp/call`, `mcp/discover`, `sparql/query`
- Add `rpc/manifest` handler returning the full method registry
- Each forwards to its existing edge function using the same pattern as oracle/store/scrape

### Phase 7 — Update Bus Barrel

Modify `src/modules/bus/index.ts`:
- Re-export `useBusCall`, `useBusReachable` from hooks
- Re-export `BUS_MANIFEST` from manifest
- Add `loadEngine` convenience that triggers WASM + bus init together

## Files Summary

| Action | File |
|---|---|
| Modify | `src/modules/bus/modules/kernel.ts` — add project, ring, manifest ops |
| Create | `src/modules/bus/modules/uns.ts` |
| Create | `src/modules/bus/modules/identity.ts` |
| Create | `src/modules/bus/modules/resolver.ts` |
| Create | `src/modules/bus/modules/audio.ts` |
| Create | `src/modules/bus/modules/wolfram.ts` |
| Create | `src/modules/bus/modules/social.ts` |
| Create | `src/modules/bus/modules/continuity.ts` |
| Create | `src/modules/bus/modules/morphism.ts` |
| Create | `src/modules/bus/modules/observable.ts` |
| Create | `src/modules/bus/modules/trace.ts` |
| Create | `src/modules/bus/modules/verify.ts` |
| Create | `src/modules/bus/modules/sparql.ts` |
| Create | `src/modules/bus/modules/vault.ts` |
| Create | `src/modules/bus/modules/mcp.ts` |
| Modify | `src/modules/bus/modules/index.ts` — import all new modules |
| Create | `src/modules/bus/manifest.ts` |
| Create | `src/modules/bus/hooks.ts` |
| Modify | `src/modules/bus/index.ts` — re-export hooks, manifest, loadEngine |
| Modify | `src/App.tsx` — wire bus.init() + WASM at startup |
| Modify | `supabase/functions/gateway/index.ts` — add missing remote handlers |

## Sovereignty Verification

After implementation, every operation resolves through exactly one pattern:

```typescript
const result = await bus.call("ns/op", params);
```

- **Local**: Layer 0–1 modules run in-browser (WASM or TS fallback), zero network
- **Edge/Cloud**: Remote modules hit the gateway, which forwards to edge functions
- **External**: `createSovereignClient({ gatewayUrl })` provides identical API over HTTP
- **Self-describing**: `bus.call("rpc/discover")` returns the full manifest
- **Engine-rooted**: `kernel/project` bridges engine → graph; `kernel/ring` exposes WASM-accelerated arithmetic; all identity flows through `singleProofHash()`

The gateway URL is the only environment-specific configuration.

