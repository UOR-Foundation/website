
# UOR API Compliance Improvements — Implementation Plan

## Overview

The Genetic AI audit identified 6 remaining issues and 6 new issues across the edge function, OpenAPI spec, and `llms.md`. This plan addresses all of them in priority order, making structural changes to three files:

1. `supabase/functions/uor-api/index.ts` — the live edge function
2. `public/openapi.json` — the static spec served at `uor.foundation/openapi.json`
3. `public/llms.md` — the agent quick card

---

## Changes by File

### File 1: `supabase/functions/uor-api/index.ts`

**Issue 1 (Priority 1): Replace inline `@context` with a URL string**

The 741-byte `UOR_CONTEXT` object is currently embedded inline into every single response. The fix is one structural change: replace:
```
"@context": UOR_CONTEXT,
```
with:
```
"@context": "https://uor.foundation/contexts/uor-v1.jsonld",
```
across all 17 endpoint handlers. This reduces every response by ~35% and is the highest-leverage single change in the entire audit. A static context document will be created at `public/contexts/uor-v1.jsonld`.

**Issue 2 (Priority 2): Add `summary` flat field to the 12 endpoints that lack it**

Currently only 5 of 17 endpoints return a `summary` object. The remaining 12 will each receive a concise, JSON-LD-free `summary` block containing the most important fields as plain key/value pairs. Each summary goes at the top of the response body so agents can read the result without parsing namespaced JSON-LD.

Endpoints to add summary to:
- `/bridge/derivation` — source_value, operation_sequence, final_value, steps, identity_holds, statement
- `/bridge/trace` — source_value, operation_sequence, final_state, frames, total_hamming_drift, injection_detected, note
- `/bridge/resolver` — input, component, canonical_form, is_irreducible, category_label
- `/user/morphism/transforms` — input, from_ring, to_ring, image, morphism_type, is_injective, is_isomorphism, ring_structure_preserved
- `/user/state` — value, component, stable_entry, phase_boundary, transition_count, critical_identity_holds
- `/bridge/cert/involution` — operation, total_checked, passed, failed, verified, statement
- `/bridge/observable/metrics` — value, ring_distance, hamming_weight, cascade_depth, at_phase_boundary
- `/kernel/op/compute` — x, y, neg, bnot, succ, pred, add, sub, mul, xor, and, or, critical_identity_holds
- `/kernel/op/operations` — total, unary_count, binary_count, special_count, critical_identity_individuals
- `/kernel/schema/datum` — value, quantum, stratum, spectrum, glyph_character, ring
- `/user/type/primitives` — total_primitive_types, rings
- `/navigate` — already has a description but will get a flat summary: total_endpoints, spaces, quick_start_url

**Issue 3 (Priority 3): Fix `X-UOR-Space` header values**

The header constants are defined statically at the top. Currently:
- `CACHE_HEADERS_KERNEL` always sets `X-UOR-Space: kernel`
- `CACHE_HEADERS_CONTENT` always sets `X-UOR-Space: bridge`

This means 6 endpoints get the wrong value. The fix: add a third header constant `CACHE_HEADERS_USER` with `X-UOR-Space: user`, and audit every handler call to `jsonResp(...)` to pass the correct header set:

| Endpoint | Correct Space | Fix |
|---|---|---|
| `/bridge/cert/involution` | bridge | Change from KERNEL → CONTENT |
| `/user/type/primitives` | user | Change from KERNEL → USER (new constant) |
| `/user/morphism/transforms` | user | Already uses CONTENT → change to USER |
| `/user/state` | user | Already uses CONTENT → change to USER |
| `/bridge/derivation` | bridge | Already correct |
| `/bridge/trace` | bridge | Already correct |
| `/bridge/resolver` | bridge | Already correct |

**Issue 4 (New Issue 3, New Issue 2): Fix morphism `to_n` default and add `externalDocs`**

Change the `to_n` default from `4` (projection, lossy) to `16` (inclusion, lossless) to match the navigate index example (`?x=42&from_n=8&to_n=16`). This makes the default response demonstrate an `InclusionHomomorphism`, which is the most illustrative for the UOR identity claim.

**Issue 5 (New Issue 4): Add injection-detection worked example to `/bridge/trace`**

Add an `injection_example` field to the `/bridge/trace` response that demonstrates the key use case: show what a normal trace looks like (`drift=0`) vs what non-zero drift signals. This makes the prompt injection detection claim concrete and self-demonstrating in the live API response.

**Issue 6 (Priority 6 + New Issue 6): Fix `415` enforcement for POST endpoints**

Add a Content-Type check to the POST handlers (`/kernel/address/encode`, `/bridge/partition`, `/bridge/proof/coherence`):
```typescript
const contentType = req.headers.get('content-type') ?? '';
if (!contentType.includes('application/json')) {
  return new Response(JSON.stringify({ error: 'Content-Type must be application/json', code: 'UNSUPPORTED_MEDIA_TYPE' }), 
    { status: 415, headers: JSON_HEADERS });
}
```

---

### File 2: `public/openapi.json`

**Changes needed:**

1. **`@context` schema update** — Change `"@context": { "type": "object" }` to `"@context": { "type": "string", "format": "uri" }` in `CriticalIdentityProofResponse` and all other schemas that reference `@context`.

2. **Add `externalDocs` to all 13 tags** — Each tag gets a link to its corresponding Rust source file in the UOR Framework repo. Example for `bridge-derivation`:
   ```json
   "externalDocs": {
     "url": "https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/derivation.rs",
     "description": "derivation.rs — ontology source"
   }
   ```

3. **Fix `to_n` default** — Change `"default": 4` to `"default": 16` for the `to_n` parameter in `/user/morphism/transforms` to match the edge function change.

4. **Add named schemas for 5 restored endpoints** — Replace the inline `"type": "object"` schema for `/bridge/derivation`, `/bridge/trace`, `/bridge/resolver`, `/user/morphism/transforms`, and `/user/state` with proper `$ref` references to new named schemas: `DerivationTraceResponse`, `ExecutionTraceResponse`, `ResolutionResponse`, `RingHomomorphismResponse`, and `StateFrameResponse`. Each will capture the key fields with proper types.

5. **Update rate limit description for bridge GETs** — Change the spec text from "bridge: 60 req/min" to "bridge GET: 120 req/min, bridge POST: 60 req/min" to match actual server behaviour.

6. **Add top-level `externalDocs`** — Add to the spec root:
   ```json
   "externalDocs": {
     "description": "UOR Framework GitHub source and conformance suite",
     "url": "https://github.com/UOR-Foundation/UOR-Framework"
   }
   ```

---

### File 3: `public/llms.md`

**Changes needed:**

1. **Update API summary table** — Add `derivation:`, `trace:`, `resolver:` to the bridge row, and correct the rate limit column to show "GET: 120 / POST: 60" for bridge:

```
| /kernel | u:, schema:, op:                                            | None     | 120 req/min        |
| /bridge | partition:, proof:, cert:, observable:,                     | Optional | GET: 120 / POST: 60|
|         | derivation:, trace:, resolver:                              |          |                    |
| /user   | type:, morphism:, state:                                    | Optional | 120 req/min        |
```

2. **Extend Step 3 — Bridge Space section** — Add the three restored endpoints with example calls:

```
# Execution audit trail — derivation:DerivationTrace
GET {BASE_URL}/bridge/derivation?x=42&ops=neg,bnot,succ
→ { "summary": { "final_value": 42, "steps": 3, "identity_holds": true }, ... }

# Bit-level trace — trace:ExecutionTrace (non-zero totalHammingDrift = injection signal)
GET {BASE_URL}/bridge/trace?x=42&ops=neg,bnot
→ { "summary": { "total_hamming_drift": 0, "injection_detected": false }, ... }

# Canonical factorization — resolver:Resolution
GET {BASE_URL}/bridge/resolver?x=42
→ { "summary": { "component": "partition:ReducibleSet", "canonical_form": "2^1 × 21", "is_irreducible": false }, ... }
```

3. **Add injection detection worked example** — Add a short, concrete worked example showing how an agent uses the trace endpoint to detect anomalous operations:

```
# Injection detection: compare two operation sequences
# Normal (canonical) sequence — neg followed by bnot returns to original:
GET {BASE_URL}/bridge/trace?x=42&ops=neg,bnot
→ trace:totalHammingDrift = 0 (zero drift = canonical sequence, no anomaly)

# Anomalous sequence — unexpected extra operation appended:
GET {BASE_URL}/bridge/trace?x=42&ops=neg,bnot,succ
→ trace:totalHammingDrift = -2 (non-zero drift = sequence diverges from canonical)

Non-zero drift signals that the executed operation sequence differs from what was declared.
This is the UOR mechanism for prompt injection detection.
```

---

### New File: `public/contexts/uor-v1.jsonld`

Create the static JSON-LD context document containing the full `UOR_CONTEXT` object that currently lives inline in the edge function. This is the document that `"@context": "https://uor.foundation/contexts/uor-v1.jsonld"` will point to. It must serve the `application/ld+json` media type and be reachable at that exact URL through the Vite static file serving.

---

## Technical Notes

- The edge function is ~1,881 lines. The `@context` change touches approximately 17 call sites. All other changes are additive (adding `summary` fields, fixing header constants, fixing default values).
- The `public/openapi.json` is ~1,441 lines. Tag `externalDocs` additions are purely additive. The 5 new named schemas will be appended to `components/schemas`.
- The `public/llms.md` changes are purely additive — new content inserted after existing sections.
- After deploying the edge function, the `@context` URL must resolve. Since `public/contexts/uor-v1.jsonld` is a static file, it will be available at `https://uor.foundation/contexts/uor-v1.jsonld` after the next publish.
- No database migrations or authentication changes are required.

## Prioritised Implementation Order

1. Create `public/contexts/uor-v1.jsonld` (prerequisite for context URL change)
2. Update edge function — `@context` URL, summary fields, X-UOR-Space fixes, morphism default, 415 enforcement, injection example
3. Update `public/openapi.json` — `@context` schema type, externalDocs, new named schemas, to_n default, rate limit accuracy
4. Update `public/llms.md` — table, three restored endpoints, injection detection example
