
# UOR API — Comprehensive OpenAPI Conformance & Functional Audit Implementation Plan

## What the AI Agent Found and What We Are Fixing

The agent's audit identified 47 specific gaps across 7 categories. After reading every relevant file — `supabase/functions/uor-api/index.ts` (1203 lines), `public/openapi.json` (767 lines), and `src/pages/Api.tsx` (1281 lines) — here is the full picture of what is broken, why it matters, and exactly how it will be fixed.

---

## Category 1 — Critical Server Configuration

**Problem:** The `openapi.json` declares two servers. The second (`https://uor.foundation/api/v1`) returns HTTP 404 for every route. Any OpenAPI tool (Swagger UI, agents using round-robin) that selects the second server gets HTML 404 responses, not API data.

**Fix in `public/openapi.json`:** Annotate both server entries with `x-server-status` so tooling and agents can distinguish active from planned:

```json
"servers": [
  {
    "url": "https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api",
    "description": "Live API — active endpoint (all requests go here)",
    "x-server-status": "active"
  },
  {
    "url": "https://uor.foundation/api/v1",
    "description": "Canonical domain proxy — planned (same backend, not yet routed)",
    "x-server-status": "planned"
  }
]
```

---

## Category 2 — Missing Security Scheme Definition

**Problem:** `info.description` declares `X-UOR-Agent-Key` for rate-limit elevation, but there is no `securitySchemes` block in `components`, and no `security` field on any operation. OAS 3.1 requires any authentication mechanism to be formally declared.

**Fix in `public/openapi.json` — add to `components`:**

```json
"securitySchemes": {
  "AgentKey": {
    "type": "apiKey",
    "in": "header",
    "name": "X-UOR-Agent-Key",
    "description": "Optional header for elevated rate limits. Unauthenticated: 120 req/min GET, 60 req/min POST. Obtain at https://uor.foundation."
  }
}
```

**Add `security` to every operation** using the optional pattern `[{}, {"AgentKey": []}]` — the empty object means auth is not required but provides a benefit when present.

---

## Category 3 — Missing Response Codes (All Endpoints)

**Problem:** Every endpoint is missing `500` responses. POST endpoints are missing `415`. Every path is missing `405` for wrong HTTP methods. The derivation and trace paths return `404` instead of `501`.

**Fix in `public/openapi.json` — add to `components.responses`:**

```json
"InternalServerError": { description: "Unexpected server error. Retry with exponential backoff." ... },
"NotImplemented": { description: "Requires Rust conformance suite. Available in v2." ... },
"MethodNotAllowed": { description: "Wrong HTTP method for this path.", headers: { Allow: ... } ... },
"UnsupportedMediaType": { description: "Content-Type must be application/json." ... }
```

**Add to every operation's `responses`:**
- `"500": { "$ref": "#/components/responses/InternalServerError" }` — all endpoints
- `"default": { "$ref": "#/components/responses/InternalServerError" }` — all endpoints
- `"405": { "$ref": "#/components/responses/MethodNotAllowed" }` — all endpoints
- `"415": { "$ref": "#/components/responses/UnsupportedMediaType" }` — POST endpoints only

**Fix in `public/openapi.json` — add stub paths for unimplemented namespaces** (currently return 404, should return 501 per spec):
```json
"/bridge/derivation": { "get": { "operationId": "derivationList", ... "responses": { "501": ... } } },
"/bridge/trace": { "get": { "operationId": "traceList", ... "responses": { "501": ... } } },
"/bridge/resolver": { "get": { "operationId": "resolverList", ... "responses": { "501": ... } } },
"/user/morphism/transforms": { "get": { "operationId": "morphismList", ... "responses": { "501": ... } } },
"/user/state": { "get": { "operationId": "stateList", ... "responses": { "501": ... } } }
```

**Fix in `supabase/functions/uor-api/index.ts` — router corrections:**

1. Return `405 Method Not Allowed` (with `Allow` header) instead of `404` for valid paths with wrong HTTP method. This requires checking known paths before returning 404.
2. Add explicit route matching for `/bridge/derivation`, `/bridge/trace`, `/bridge/resolver` to return `501` instead of `404`.
3. Add `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers to all responses.
4. Add `ETag` headers to deterministic GET endpoints (computed from path + params).
5. Add `"INTERNAL_ERROR"` to the `ErrorResponse.code` enum in the spec (it was missing — actual responses already use it).

---

## Category 4 — Schema Definition Issues

**Problem:** Schemas have loose `type: object` with no nested properties, missing `required` arrays on 10 of 13 schemas, missing `additionalProperties`, missing `format` annotations, and namespaced JSON-LD property names that break code generators.

**Fix in `public/openapi.json` — schema improvements:**

**Add `required` arrays** to all response schemas reflecting actual live response fields:
- `WitnessData`: `required: ["@type", "proof:x", "proof:bnot_x", "proof:neg_bnot_x", "proof:succ_x", "proof:holds"]`
- `CriticalIdentityProofResponse`: `required: ["@context", "@id", "@type", "proof:quantum", "proof:verified", "proof:timestamp", "proof:witness", "derivation", "ontology_ref", "conformance_ref"]`
- `CoherenceProofResponse`: `required: ["@type", "proof:quantum", "proof:verified", "proof:timestamp", "summary"]`
- `PartitionResponse`: `required: ["@type", "partition:quantum", "partition:density"]`
- `InvolutionCertificateResponse`: `required: ["@type", "cert:operation", "cert:verified", "cert:quantum", "cert:timestamp", "verification"]`
- `ObservableMetricsResponse`: `required: ["@type", "observable:quantum", "observable:datum"]`
- `TypeListResponse`: `required: ["@type", "primitive_types", "composite_types"]`
- `CoherenceProofRequest`: `required: ["type_definition"]` — the field is semantically mandatory

**Add `format` annotations:**
- `proof:timestamp`, `cert:timestamp` → `"format": "date-time"`
- `@id` fields → `"format": "uri"`
- `schema:spectrum` → `"pattern": "^[01]+$", "minLength": 1, "maxLength": 16`
- `u:glyph` → `"pattern": "^[⠀-⣿]+$"` (Braille Unicode block)
- `ontology_ref`, `conformance_ref` → `"format": "uri"`

**Expand loose `type: object` schemas into structured `properties` blocks.** Add two new component schemas: `UnaryOpResult` and `BinaryOpResult`, then reference them from `OpComputeResponse.unary_ops` and `OpComputeResponse.binary_ops`. Add `items` schemas to all `"type": "array"` properties in `OpListResponse`.

**Add `x-json-ld-term` extension to namespaced property names** to document the wire-format key while preserving compatibility with code generators:
```json
"schema:value": {
  "type": "integer",
  "x-json-ld-term": "schema:value",
  "description": "Integer value in [0, 2^n). Wire key: 'schema:value' — use string access in typed languages."
}
```

**Add missing fields** that appear in live responses but are absent from schemas:
- `ontology_ref` (URI) and `conformance_ref` (URI) on `CriticalIdentityProofResponse`
- `coherence_layers` on `CoherenceProofResponse`
- `cardinality_check` and `quality_signal` on `PartitionResponse`
- `observable:commutator` on `ObservableMetricsResponse`

---

## Category 5 — Parameter Issues

**Problem:** The `x` parameter schema declares `maximum: 65535` unconditionally but the runtime enforcement is `x < 2^n` (context-dependent). Sending `x=300` with default `n=8` passes schema validation but fails at runtime. The `PartitionRequest` needs `oneOf` semantics declared.

**Fix in `public/openapi.json`:**

Improve `x` description to make the runtime constraint explicit:
```json
"x": {
  "description": "Ring element. Must satisfy 0 ≤ x < 2^n (e.g., < 256 for n=8, < 65536 for n=16). Schema maximum is the widest valid range (n=16); actual bound enforced at runtime against `n`.",
  "example": 42
}
```

Convert `PartitionRequest` to proper `oneOf`:
```json
"PartitionRequest": {
  "oneOf": [
    { "title": "TypeDefinitionPartition", "required": ["type_definition"], "properties": { ... } },
    { "title": "InputStringPartition", "required": ["input"], "properties": { ... } }
  ]
}
```

---

## Category 6 — Response Header Issues

**Problem:** No `ETag` headers on any endpoint (all deterministic — same input always produces same output). No `X-RateLimit-*` headers returned despite rate limits being documented. These omissions prevent agents from implementing proper caching and proactive rate limit management.

**Fix in `supabase/functions/uor-api/index.ts`:**

Add to `CACHE_HEADERS_KERNEL` and `CACHE_HEADERS_CONTENT`:
```javascript
'X-RateLimit-Limit': '120',   // or '60' for POST
'X-RateLimit-Remaining': String(limit - recent.length),
'X-RateLimit-Reset': String(Math.ceil((now + 60000) / 1000)),
```

Add ETag computation for deterministic GET endpoints:
```javascript
function makeETag(path: string, params: Record<string, string>): string {
  const key = path + JSON.stringify(params, Object.keys(params).sort());
  // Simple but stable hash — no crypto needed for deterministic resources
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return `"uor-${h.toString(16)}"`;
}
```

Pass ETag in response headers and handle `If-None-Match` conditional requests (return `304 Not Modified` when ETag matches).

**Fix in `public/openapi.json` — declare headers in `components`:**
```json
"components": {
  "headers": {
    "X-RateLimit-Limit": { "schema": { "type": "integer" }, "description": "Max requests per minute" },
    "X-RateLimit-Remaining": { "schema": { "type": "integer" }, "description": "Remaining requests in window" },
    "X-RateLimit-Reset": { "schema": { "type": "integer" }, "description": "Unix timestamp when window resets" },
    "ETag": { "schema": { "type": "string" }, "description": "Cache validator — stable for same inputs" }
  }
}
```

Add `headers` blocks to all `200` responses in the spec referencing these components.

---

## Category 7 — POST Endpoint Semantic Annotation

**Problem:** POST endpoints return `200 OK` rather than `201 Created`. Per the audit, `200` is actually semantically correct here (computed on the fly, not persisted), but this should be explicitly stated so agents do not assume idempotency issues.

**Fix in `public/openapi.json`:** Add to each POST operation description:
> "Returns `200 OK` because this endpoint computes a deterministic artifact on the fly — same inputs always produce the same output. No resource is persisted."

---

## Files Changed

### 1. `public/openapi.json` — Complete schema conformance update

All changes above to: servers, security schemes, response codes, stub paths, component schemas (required arrays, format annotations, expanded object types, x-json-ld-term, missing fields), parameter descriptions, oneOf for PartitionRequest, new component headers block, and headers on 200 responses.

### 2. `supabase/functions/uor-api/index.ts` — Router and header fixes

- Add 405 Method Not Allowed handling for valid paths with wrong HTTP method
- Add 501 routes for `/bridge/derivation`, `/bridge/trace`, `/bridge/resolver`
- Add `X-RateLimit-Limit/Remaining/Reset` to all responses (requires threading limit/remaining through the rate-limit check function return)
- Add `ETag` computation and `If-None-Match` / `304` handling for GET endpoints
- Refactor `checkRateLimit` to return `{ allowed: boolean, remaining: number, reset: number }` so headers can be set on every response
- Update `NOT_IMPLEMENTED` code to also cover bridge derivation/trace/resolver (currently only user/state and user/morphism)

### 3. `src/pages/Api.tsx` — UI alignment with updated spec

- Add `500` and `default` response code chips to every endpoint card
- Add `405` response chip to every endpoint card  
- Add `415` response chip to POST endpoint cards
- Add stub entries for the 5 unimplemented namespace paths in the UI sidebar (shown as "Not implemented in v1" with `501` badge)
- Update `TAGS` array to include placeholder tags for `bridge-derivation`, `bridge-trace`, `bridge-resolver`, `user-morphism`, `user-state` — shown greyed out with "v2" label
- Update Servers block to show `x-server-status: active` / `planned` visually
- Update security section to show the `AgentKey` scheme formally
- Update `X-RateLimit-*` in the UI rate limit documentation table

---

## Execution Order

1. Update `supabase/functions/uor-api/index.ts` — router fixes (405, 501 routes, rate-limit headers, ETag)
2. Update `public/openapi.json` — full schema conformance rewrite
3. Update `src/pages/Api.tsx` — UI alignment with new spec (new response chips, stub tags, security display)
4. Deploy edge function

This order ensures the live API is correct before the spec and UI are updated to reflect it.
