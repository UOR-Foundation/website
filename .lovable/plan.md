
# UOR API — Complete Function Implementation and Conformance Plan

## What Needs Fixing

After a thorough read of all three files — `supabase/functions/uor-api/index.ts` (1374 lines), `public/openapi.json` (1309 lines), and `src/pages/Api.tsx` (986 lines) — and cross-referencing against the framework architecture, I have identified the following gaps and issues that need to be resolved.

---

## Issue 1 — `/openapi.json` Endpoint Returns 302 Redirect, Not JSON

**Problem:** The `openapiSpec` function in the edge function returns `HTTP 302` redirecting to the static file. The UI "Run" button calls `${BASE}/openapi.json` and displays the result — but because `fetch()` follows redirects, it will return the static HTML/JSON page from `uor.foundation`, not an API response from the edge function. More critically, the OpenAPI spec itself lists `/openapi.json` as a path — AI agents that discover the spec via the `/navigate` endpoint and then call `/openapi.json` on the base URL expect to get JSON back with proper headers (ETag, X-RateLimit, etc.), not a redirect.

**Fix:** Replace the redirect with an inline response that returns the key spec metadata as a JSON-LD object pointing to the canonical spec URL. This keeps the endpoint RESTful, adds proper rate-limit and ETag headers, and gives agents the information they need.

---

## Issue 2 — Layer Numbering Misalignment with Framework Architecture

**Problem:** The API page uses "Layer 0" for Discovery/Navigation endpoints. But in the UOR Framework (which the About page and FrameworkLayers component define), Layer 0 is "The Foundation" — the mathematical axioms. The `op/verify` endpoints are the direct API expression of Layer 0 (they prove the foundational axiom). The navigation/discovery endpoints sit outside the framework layers — they are meta-level endpoints. This misalignment breaks the "full coherence" between the About and API sections.

**Correct mapping (strict conformance to framework):**

| Framework Layer | Framework Title | API Endpoints |
|---|---|---|
| Meta (no layer) | Discovery | `/navigate`, `/openapi.json` |
| Layer 0 | The Foundation | `/kernel/op/verify`, `/kernel/op/verify/all` |
| Layer 1 | Identity | `/kernel/address/encode`, `/kernel/schema/datum` |
| Layer 2 | Structure | `/kernel/op/compute`, `/kernel/op/operations` |
| Layer 3 | Resolution | `/user/type/primitives` |
| Layer 4 | Verification | `/bridge/proof/critical-identity`, `/bridge/proof/coherence`, `/bridge/cert/involution` |
| Layer 5 | Transformation | `/bridge/partition`, `/bridge/observable/metrics` |

**Fix:** Restructure `LAYERS` in `Api.tsx` to use these exact layer numbers and titles, matching the FrameworkLayers component in the About section precisely — same icons, same layer numbers (0–5), same titles ("The Foundation", "Identity", "Structure", "Resolution", "Verification", "Transformation"). Discovery endpoints move to a clearly labeled "API Discovery" section before the layered architecture, not numbered as a layer.

---

## Issue 3 — Layer 3 "Resolution" Has Only One Endpoint

**Problem:** `/user/type/primitives` is the sole endpoint assigned to Layer 3 (Resolution). In the framework, Resolution is about finding objects by what they are — type declarations, resolvers, and queries. The type catalogue is the correct Layer 3 endpoint in v1 (the resolver and query namespaces are v2). This is correct but thin — the endpoint description needs to more explicitly connect to the Resolution concept.

**Fix:** Keep the mapping correct, but improve the `whyItMatters` and `solves` text to make the Resolution connection clear and explicit.

---

## Issue 4 — `openapi.json` Spec: Missing `ErrorResponse` in Schema for `proofCoherence` POST

**Problem:** The `proofCoherence` handler validates `body.n` but the `CoherenceProofRequest` schema in `openapi.json` lists `n` as optional with no validation note about what happens if `type_definition` is also omitted (both are technically optional per the current schema but the endpoint will error if both are absent). The spec's `required: ["type_definition"]` fix from the previous plan was applied to the schema object but not actually visible in the current `openapi.json`.

**Verification needed:** Read lines 400-600 of `public/openapi.json` to confirm the `required` field was added.

---

## Issue 5 — `frameworkIndex` Layer 0 Entry Point Has Wrong `@type`

**Problem:** The `/navigate` response uses `"@type": "sdo:APIReference"`. The correct schema.org type is `"sdo:WebAPI"` for an API reference document. `APIReference` is not a valid schema.org type — it will fail JSON-LD validation.

**Fix:** Change to `"@type": "sdo:WebAPI"` in `frameworkIndex`.

---

## Issue 6 — V2 Stub Section Layout (Image Reference)

The image shows the V2 section exactly as coded — the grid with `501` badges, description text, and path codes. The existing `V2_STUBS` array and rendering match the image. **No changes needed here** — this is already conformant to the reference design.

---

## Issue 7 — UI: Discovery Endpoints Should Not Be "Layer 0"

The current UI shows navigation endpoints as "Layer 0 — Start Here". This confuses two things: the API's entry point (navigation) and the framework's Layer 0 (mathematical foundation/axioms). The fix restructures the UI so:

1. A compact "API Discovery" block appears at the top — outside the layered architecture — for `/navigate` and `/openapi.json`. Simple, no accordion.
2. The accordion layers start at "Layer 0 — The Foundation" with the `op/verify` endpoints, matching the framework exactly.

---

## Files to Change

### 1. `supabase/functions/uor-api/index.ts`

**Change 1 — Fix `openapiSpec` function:** Replace the 302 redirect with a proper JSON-LD response:

```typescript
function openapiSpec(rl: RateLimitResult): Response {
  const etag = makeETag('/openapi.json', {});
  return jsonResp({
    "@context": UOR_CONTEXT,
    "@type": "sdo:WebAPI",
    "@id": "https://uor.foundation/api/v1",
    "title": "UOR Framework Agent API — OpenAPI 3.1.0",
    "version": "1.0.0",
    "spec_url": "https://uor.foundation/openapi.json",
    "live_spec_url": "https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api/openapi.json",
    "note": "The canonical machine-readable OpenAPI 3.1.0 specification. Fetch spec_url for the full document.",
    "paths_count": 14,
    "schemas_count": 15,
    "agent_entry": "https://uor.foundation/llms.md"
  }, CACHE_HEADERS_KERNEL, etag, rl);
}
```

Update the router call to pass `rl`:
```typescript
if (path === '/openapi.json') return openapiSpec(rl);
```

**Change 2 — Fix `frameworkIndex` `@type`:** Change `"@type": "sdo:APIReference"` to `"@type": "sdo:WebAPI"`.

**Change 3 — Add ETag + 304 support to `/openapi.json`:** Add the `ifNoneMatch` check to the `/openapi.json` route, same pattern as all other GET endpoints.

### 2. `src/pages/Api.tsx`

**Change 1 — Restructure LAYERS array** to remove Layer 0 "Start Here" and replace with:
- Layer 0: "The Foundation" (icon: Diamond) — `op/verify`, `op/verify/all`
- Layer 1: "Identity" (icon: Hash) — `address/encode`, `schema/datum`
- Layer 2: "Structure" (icon: Layers) — `op/compute`, `op/operations`
- Layer 3: "Resolution" (icon: Search) — `user/type/primitives`
- Layer 4: "Verification" (icon: ShieldCheck) — `proof/critical-identity`, `proof/coherence`, `cert/involution`
- Layer 5: "Transformation" (icon: ArrowRightLeft) — `bridge/partition`, `observable/metrics`

**Change 2 — Add "API Discovery" pre-section** before the layered accordion. A compact, always-visible two-card block for:
- `GET /navigate` — Get a map of all endpoints
- `GET /openapi.json` — Download the full machine-readable specification

These two cards have a Run button but are not inside an accordion layer. They appear above "Architecture" with a clear label: "Start here. Read the index, then the spec."

**Change 3 — Update layer titles and `whyItMatters` text** to precisely mirror FrameworkLayers:
- Layer 0 "The Foundation": "The foundational axiom: negate(bitwise-invert(x)) always equals increment(x). These endpoints prove it — for one value, or for every value in the ring at once. If this holds, the entire framework holds."
- Layer 1 "Identity": Mirror the FrameworkLayers description but API-specific.
- Layer 2 "Structure": Mirror with API context.
- Layer 3 "Resolution": "Find the right type before computing. The type catalogue tells you what primitive types exist and what ring each one lives in. Choose a type, then use it with the proof and partition endpoints."
- Layer 4 "Verification": Mirror with proof/cert API context.
- Layer 5 "Transformation": Mirror with partition/metrics context.

**Change 4 — Update `solves` lines** for each layer to reference the exact problem grid cards shown above the architecture section (Identity Fraud, Auth Exploits, Prompt Injection, Content Spam, Opaque Coordination, No Coherence Model).

**Change 5 — Update the Quick Start section** step 1 to link to `/navigate` (not `/openapi.json`), and step 2 to the correct Layer 0 endpoint.

### 3. `public/openapi.json`

**Verify and fix (if not already applied) `CoherenceProofRequest.required`:** Should be `["type_definition"]`.

**Fix `frameworkIndex` response `@type`:** The openapi.json does not describe the navigate response schema in detail, but the `NavigationIndex` schema should use `sdo:WebAPI` type annotation in its description.

---

## Execution Order

1. Fix `supabase/functions/uor-api/index.ts` — `openapiSpec` inline response, `@type` fix, ETag for `/openapi.json`
2. Restructure `src/pages/Api.tsx` — move discovery endpoints out of Layer 0, fix all layer titles/descriptions to match framework exactly
3. Verify `public/openapi.json` — `CoherenceProofRequest.required` field
4. Deploy edge function

---

## What Stays the Same

- All 14 live endpoint handlers — fully functional, no logic changes
- V2 stubs section — already matches the reference image exactly
- Rate limiting, ETag, 405/501 error handling — all correct
- OpenAPI spec — schema conformance changes from previous plan already applied
- UI components (EndpointPanel, LayerSection, CopyButton, etc.) — no changes needed
- Quick start commands — preserved, step 1 updated to match new structure
- "For AI Agents" section — preserved

The total scope is: 1 edge function fix (openapiSpec + @type), 1 UI restructure (layer reordering + discovery pre-section), 1 spec verification. No new endpoints are needed — all 14 are functional and conformant.
