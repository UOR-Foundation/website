

# Make the REST API a 1:1 Canonical Surface for `uor-foundation` v0.3.0

## What I Found (Audit Summary)

| Check | Status |
|---|---|
| Path coverage vs OpenAPI 0.3.0 | ✅ 84/84 (`/conformance` reports `fully_conformant: true`) |
| First-party mirror `/api/v1/*` | ✅ Wired (`vite.config.ts` proxy + edge-function path normaliser) |
| Crate version pinning | ✅ `0.3.0` everywhere |
| **Principal data path** (`Datum → Validated → Grounded → Triad → Certified`) | ❌ Pieces exist, no single canonical endpoint |
| **Four named resolvers** (`inhabitance` / `tower_completeness` / `incremental_completeness` / `grounding_aware`) | ❌ Generic `/bridge/resolver` only |
| **Replayable Trace** (v0.3 `TRACE_REPLAY_FORMAT_VERSION`) | ❌ Only Hamming drift exposed |
| **HostTypes** discovery | ❌ No endpoint |
| SDK coverage | ❌ ~10 of 84 routes; still calls raw Supabase URL |
| Cold-start hygiene | ❌ Storacha imported eagerly even for kernel-only calls |
| Observability stream (SSE) | ❌ Not exposed |

## Plan

### 1. Principal pipeline endpoint — the headline v0.3 surface
**New `POST /api/v1/pipeline/run`** — accepts `{ host_bytes, target_type?, phase? }` and returns one envelope:
```json
{
  "@type": "schema:PipelineResult",
  "datum":      { ... },         // W4 kind-typed
  "validated":  { phase, ... },  // W2+W13
  "grounded":   { ... },         // W14
  "triad":      { ... },         // W8
  "certified":  { kind, ... },   // W11 Certified<C>
  "epistemic_grade": "A",
  "derivation:derivationId": "urn:uor:..."
}
```
This becomes **the** canonical entry point — what `llms.md` §3 should point at. Internally composes existing helpers (`makeDatum`, partition, cert/issue) — no new math.

### 2. Four named resolvers as first-class routes
**New** `GET /api/v1/resolver/inhabitance`, `/resolver/tower-completeness`, `/resolver/incremental-completeness`, `/resolver/grounding-aware` — each returns `{ verdict: "Certified" | "Witness", ... }` matching the `Result<Certified<Cert>, Witness>` Rust signature exactly. Old generic `/bridge/resolver` stays as a discovery index that lists them.

### 3. Trace replay surface
**New** `GET /api/v1/bridge/trace/replay?id={derivation_id}` returning a `Trace` with `events[]`, plus `TRACE_REPLAY_FORMAT_VERSION` constant in the response so external verifiers can pin it. Optional **`GET /api/v1/observability/stream`** (SSE) for the v0.3 `observability` feature — emits `TraceEvent` JSON lines.

### 4. HostTypes discovery
**New** `GET /api/v1/kernel/host-types` returning `{ Decimal: "f64", HostString: "str", WitnessBytes: "[u8]", source: "DefaultHostTypes" }` so agents can see the host slot bindings without reading the crate.

### 5. SDK rewrite — cover everything, point at first-party
- `RUNTIME_BASE` switches from raw Supabase URL to **`/api/v1`** (relative — works in dev via Vite proxy, production via the same first-party path)
- Add typed methods for: all 5 `tools/*`, the 4 resolvers, `pipeline/run`, `host-types`, `conformance`, `trace/replay`, `sparql`, `shacl/validate`
- Add `client.openapi()` to fetch and cache `/openapi.json` for runtime introspection
- Generate the public `UorClient` interface from a single `ROUTES` table so future routes auto-appear

### 6. Cold-start + dispatch performance
- **Lazy Storacha**: move `import * as StorachaClient` behind a dynamic `await import()` inside the `/store/*` handlers — kernel calls (the hot path) stop paying the bundle cost
- **Dispatch O(1)**: replace the 80-branch `if (path === ...)` ladder with a `Map<string, Handler>` lookup built once at module load — turns per-request dispatch from O(n) string compares to one Map.get
- Add `Vary: Accept-Encoding` and `X-UOR-Crate-Version: 0.3.0` to every response
- ETag on every cacheable kernel endpoint (currently only `/openapi.json`)

### 7. Documentation alignment
- **`public/openapi.json`**: add the 6 new paths (pipeline/run, 4 resolvers, host-types, trace/replay, observability/stream) and bump `info.version` patch to `0.3.1`
- **`public/llms.md` §3**: replace the "minimum viable agent loop" with a single `POST /api/v1/pipeline/run` call — matches what the crate actually advertises
- **`/conformance`**: re-run after additions — should still report `fully_conformant: true` (we're adding spec paths and implementations together)

## Files Touched

- `supabase/functions/uor-api/index.ts` — new handlers, lazy Storacha, Map-based dispatch, ETag, version header
- `public/openapi.json` — 6 new paths, version bump
- `src/modules/uor-sdk/client.ts` — first-party base URL, full method coverage
- `src/modules/uor-sdk/types.ts` — types for the 6 new responses
- `src/data/api-layers.ts` — list the 6 new endpoints in the explorer
- `public/llms.md` — point §3 at `/pipeline/run`
- `src/test/uor-sdk.test.ts` — coverage for the new methods

## Result

- **One canonical entry point** (`POST /api/v1/pipeline/run`) maps 1:1 to the crate's headline `Datum → Validated → Grounded → Triad → Certified` flow
- **All four named resolvers** match the Rust signatures exactly
- **Replayable traces + optional SSE stream** match v0.3's `observability` feature
- **SDK covers 100% of the surface** and uses the first-party `/api/v1` mirror
- **Cold-start drops** (no Storacha load for kernel calls) and **dispatch is O(1)**
- `/conformance` continues to report `fully_conformant: true` against the bumped spec

