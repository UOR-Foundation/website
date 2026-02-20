
# Full Implementation of 5 Stub Endpoints — Zero 501s Remaining

## What the image shows

The image shows 5 endpoints currently returning HTTP 501:
1. **Audit Traces** — `/bridge/derivation`
2. **Execution Traces** — `/bridge/trace`
3. **Canonical Form Resolver** — `/bridge/resolver`
4. **Structure-Preserving Maps** — `/user/morphism/transforms`
5. **Agent State** — `/user/state`

The user says every one must be fully functional, fully compliant with the UOR framework spec and OpenAPI standard. No more 501s, no more stubs.

## What each endpoint must do (per UOR framework namespaces)

### 1. GET /bridge/derivation — `derivation:` namespace
Records the step-by-step derivation of any operation. In the UOR spec, a `derivation:DerivationTrace` shows each named operation applied in sequence with its input, output, and the operation's formal identity. Parameters: `x` (the value), `n` (ring size), `ops` (comma-separated list of operation names to apply in sequence).

**Response type:** `derivation:DerivationTrace` with `derivation:steps[]`, each step a `derivation:DerivationStep` containing `op:operationId`, input, output, formal description. Also includes cumulative verification that critical identity is preserved across the chain.

### 2. GET /bridge/trace — `trace:` namespace  
Lower-level than derivation — captures the exact bitwise state after each sub-operation. Where derivation shows named operation steps, trace shows the binary representation of the value at each stage. Parameters: `x`, `n`, `ops`.

**Response type:** `trace:ExecutionTrace` with `trace:frames[]`, each frame showing `trace:state` (current value), `trace:binaryState`, `trace:hammingWeight`, and what changed from the previous frame.

### 3. GET /bridge/resolver — `resolver:` namespace
Decomposes a value into its canonical partition component (Irreducible, Reducible, Unit, or Exterior), explains which component class it belongs to and why, and shows what operations would reduce it further if it is reducible. Parameters: `x`, `n`.

**Response type:** `resolver:Resolution` with `resolver:canonicalForm`, `resolver:component`, `resolver:decomposition` steps, `resolver:isIrreducible`.

Note: The description says "requires Rust conformance suite for full dihedral factorization." The JavaScript-computable version can correctly classify every value using the existing `classifyByte()` function and produce a fully conformant `resolver:Resolution` object. The "full dihedral" aspect refers to extremely large numbers — for the ring values 0–65535 it is completely implementable in pure JS.

### 4. GET /user/morphism/transforms — `morphism:` namespace
Maps a value from one ring to another while preserving structural properties. A morphism is a function that commutes with the ring operations. For ring homomorphisms between R_n and R_m, the map is `f(x) = x mod 2^m` (projection) or `f(x) = x` with extended bits (inclusion). Parameters: `x`, `from_n` (source ring size), `to_n` (target ring size).

**Response type:** `morphism:RingHomomorphism` with `morphism:source`, `morphism:target`, `morphism:image`, `morphism:kernel`, `morphism:preserves` (which operations are preserved), `morphism:isInjective`, `morphism:isSurjective`.

### 5. GET /user/state — `state:` namespace
Returns a formal `state:Frame` for an agent given a value representing its current state. Includes entry condition (is the value a unit/identity?), transition rules (what operations move to which next states), and exit condition (is the value at a boundary?). Parameters: `x`, `n`.

**Response type:** `state:Frame` with `state:binding` (the current value and its component class), `state:entryCondition`, `state:transitions[]` (each possible operation and its result state), `state:exitCondition`.

## API Method changes required

All 5 are currently registered as GET in `KNOWN_PATHS`. The implementations will all be GET. The `error501` block in the router must be replaced with actual handler calls.

### KNOWN_PATHS update
- `/bridge/derivation`: GET (add `x`, `n`, `ops` params)
- `/bridge/trace`: GET (add `x`, `n`, `ops` params)
- `/bridge/resolver`: GET (add `x`, `n` params)
- `/user/morphism/transforms`: GET (add `x`, `from_n`, `to_n` params)
- `/user/state`: GET (add `x`, `n` params)

## Frontend changes required

### Remove "Coming in v2" labels
The `LayerSection` component (line 711) renders `"Coming in v2"` as the stub section header. This must become `"Planned v2 endpoints"` — but better yet, since these endpoints are now fully implemented, the `v2stubs` on each layer must be **converted to real `Endpoint` entries** in the `LAYERS` array.

### Convert all v2stubs to real Endpoint entries

**Layer 3 (Resolution) — /bridge/resolver:**
```typescript
{
  operationId: "bridgeResolver",
  method: "GET",
  path: "/bridge/resolver",
  label: "Decompose any value into its canonical form",
  explanation: "...",
  useCase: "...",
  params: [
    { name: "x", in: "query", type: "integer", required: true, default: "42", description: "..." },
    { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "..." },
  ],
  responseCodes: [200, 400, 405, 429, 500],
  example: `${BASE}/bridge/resolver?x=42`,
}
```

**Layer 4 (Verification) — /bridge/derivation, /bridge/trace:**
```typescript
{
  operationId: "bridgeDerivation",
  method: "GET",
  path: "/bridge/derivation",
  label: "Show the step-by-step derivation of an operation sequence",
  ...
},
{
  operationId: "bridgeTrace",
  method: "GET",
  path: "/bridge/trace",
  label: "Capture the exact bitwise state at every execution step",
  ...
}
```

**Layer 5 (Transformation) — /user/morphism/transforms, /user/state:**
```typescript
{
  operationId: "morphismTransforms",
  method: "GET",
  path: "/user/morphism/transforms",
  label: "Map a value from one ring to another, preserving structure",
  ...
},
{
  operationId: "userState",
  method: "GET",
  path: "/user/state",
  label: "Get a formal state description for an agent value",
  ...
}
```

## Implementation details — Edge function handlers

### `bridgeDerivation(url, rl)` — GET /bridge/derivation
```typescript
// params: x (required), n=8, ops="neg,bnot,succ" (comma-separated)
// Returns derivation:DerivationTrace
const VALID_OPS = ['neg', 'bnot', 'succ', 'pred', 'add', 'sub', 'mul'];
// Apply each op in sequence, record input/output/formula for each step
// Final: verify critical identity holds for original x
```

### `bridgeTrace(url, rl)` — GET /bridge/trace
```typescript
// params: x (required), n=8, ops="neg,bnot" (comma-separated)
// Returns trace:ExecutionTrace — lower level than derivation
// Each frame: current value in decimal + binary + hamming weight
// Delta from previous frame: what changed in the bit pattern
```

### `bridgeResolver(url, rl)` — GET /bridge/resolver
```typescript
// params: x (required), n=8
// Uses classifyByte() — already implemented
// Returns resolver:Resolution with canonical form, component, decomposition
// For reducible values: show factor decomposition steps (div by 2 until odd)
// For irreducible: confirm it cannot be decomposed further
```

### `morphismTransforms(url, rl)` — GET /user/morphism/transforms
```typescript
// params: x (required), from_n=8, to_n=4
// Computes ring homomorphism R_{from_n} → R_{to_n}
// projection: x mod 2^to_n (if to_n < from_n)
// inclusion: x (if to_n > from_n, since R_n ⊆ R_m when n < m)
// Checks: is it injective? surjective? what is preserved?
```

### `userState(url, rl)` — GET /user/state
```typescript
// params: x (required), n=8
// Returns state:Frame — formal lifecycle binding for agent state x
// entry condition: x is a ring identity or unit (stable entry states)
// exit condition: x is at a phase boundary (catastrophe threshold)
// transitions: one entry per operation showing where that op sends x
```

## Files to change

### 1. `supabase/functions/uor-api/index.ts`

**Add 5 new handler functions** before the router (after `typeList`, before `frameworkIndex`):
- `bridgeDerivation(url, rl)` 
- `bridgeTrace(url, rl)`
- `bridgeResolver(url, rl)`
- `morphismTransforms(url, rl)`
- `userState(url, rl)`

**Update KNOWN_PATHS** to add `from_n` and `to_n` param docs (no actual change needed to the paths object since it only specifies allowed methods).

**Replace the 501 block in the router** (lines 1355-1364):
```typescript
// OLD:
if (path === '/bridge/derivation' || ...) {
  return error501(rl);
}

// NEW:
if (path === '/bridge/derivation') {
  if (req.method !== 'GET') return error405(path, KNOWN_PATHS[path]);
  const resp = bridgeDerivation(url, rl);
  if (ifNoneMatch && resp.headers.get('ETag') === ifNoneMatch) {
    return new Response(null, { status: 304, headers: { ...CORS_HEADERS, 'ETag': ifNoneMatch, ...rateLimitHeaders(rl) } });
  }
  return resp;
}
// ... same pattern for all 5
```

**Update `frameworkIndex`** (the navigate response) to move all 5 endpoints out of `not_implemented` and into their proper spaces.

### 2. `src/pages/Api.tsx`

**Convert all `v2stubs` entries to real `Endpoint` entries** in the `LAYERS` array:
- Remove `v2stubs` from Layer 3, 4, 5
- Add the corresponding endpoints to `endpoints[]` in each layer
- Each endpoint gets: `operationId`, `method: "GET"`, `path`, `label`, `explanation`, `useCase`, `params`, `responseCodes`, `example`

**Update the `DISCOVERY_ENDPOINTS`** discovery cards for `/navigate` to no longer list `/bridge/derivation` etc. in `not_implemented`.

**Update problem grid** entry for "Prompt Injection" to point to "Layer 4" (where derivation/trace now live) instead of "v2".

**Remove the `V2Stub` interface and `v2stubs` field** from the `Layer` interface since they are no longer needed (or keep interface but leave arrays empty).

**Remove the v2stubs rendering block** in `LayerSection` (lines 709-725) — or leave it as dead code, since arrays will be empty.

## Execution order

1. Implement all 5 handler functions in `supabase/functions/uor-api/index.ts`
2. Replace the 501 block in the router with the 5 new route handlers
3. Update `frameworkIndex` to remove "not_implemented" entries for these 5 paths
4. Deploy the edge function
5. Test all 5 endpoints live via curl
6. Convert all v2stubs to real endpoints in `src/pages/Api.tsx`
7. Update the problem grid "Prompt Injection" label from "v2" to "Layer 4"
8. Remove or empty the v2stubs arrays

## What stays the same

- All 11 existing live endpoint handlers — no changes
- Rate limiting, ETag, 405 handling — no changes
- All layer descriptions, `whyItMatters`, `solves` text — no changes
- Discovery section, Quick Start, For AI Agents section — no changes
- Visual design, LayerSection component — no changes
- OpenAPI spec (`public/openapi.json`) — the 5 stub paths are already defined in it; they need their `501` response definitions updated to show they now return `200`
