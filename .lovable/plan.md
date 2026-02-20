
# UOR API Audit — Fixes Plan

## What the audit found, and what we're going to fix

The audit is thorough and accurate. The good news: every single endpoint already works. The problems are entirely in how the API describes itself — mislabeled statuses, a broken discovery chain, a `/navigate` index that hides three of the best endpoints, and copy that overstates what partition analysis actually does. Every fix below is surgical.

---

## Priority 1 — Critical fixes (broken agent experience)

### Fix 1: `/openapi.json` on the edge function returns a meta-document, not a spec

**Current behaviour:** `GET .../uor-api/openapi.json` returns a JSON-LD `sdo:WebAPI` object pointing to the spec elsewhere. An automated client following the discovery chain (`/.well-known/uor.json → uor:api.openapi → /openapi.json`) gets zero paths and must follow a second URL.

**Fix:** Replace the `openapiSpec()` handler in `supabase/functions/uor-api/index.ts` with a `301 Redirect` to `https://uor.foundation/openapi.json`. This is one line. Any client following the discovery chain will land on the real 19-path spec immediately.

```text
GET .../uor-api/openapi.json
→ 301 Location: https://uor.foundation/openapi.json
```

---

### Fix 2: `/navigate` hides 3 working endpoints (`/bridge/derivation`, `/bridge/trace`, `/bridge/resolver`)

**Current behaviour:** The `frameworkIndex()` function puts derivation, trace, and resolver under a separate `endpoints_also` sub-key inside the bridge space — not in the main `endpoints` array. Many clients iterating `bridge.endpoints` miss them entirely.

**Fix:** Move all three into the main `bridge.endpoints` array alongside the other bridge endpoints. Add `example` URLs with pre-filled parameters. These are among the most compelling endpoints in the API (prompt injection detection), and they are fully live.

---

### Fix 3: `/navigate` count in `openapiSpec()` is wrong (says 14, reality is 19+)

**Current behaviour:** The `openapiSpec()` meta-document says `"paths_count": 14`. Actual working paths: 19 (plus the simple `/uor-verify` endpoint at the other function). The navigate response itself also omits the count.

**Fix:** Update the count to 19 in the meta-document. Also update the `note` field to accurately reflect what the static spec contains.

---

## Priority 2 — OpenAPI spec fixes (`public/openapi.json`)

### Fix 4: 5 endpoints marked "not implemented" in the static spec — they all work

**Current state in `public/openapi.json`:**

| Path | Spec says | Reality |
|---|---|---|
| `/bridge/derivation` | `501 Not Implemented` | Returns `200 DerivationTrace` |
| `/bridge/trace` | `501 Not Implemented` | Returns `200 ExecutionTrace` |
| `/bridge/resolver` | `501 Not Implemented` | Returns `200 Resolution` |
| `/user/morphism/transforms` | `501 Not Implemented` | Returns `200 RingHomomorphism` |
| `/user/state` | `501 Not Implemented` | Returns `200 Frame` |

**Fix:** For each of the five endpoints in `public/openapi.json`:
- Update the `summary` to remove "not implemented in v1"
- Update the `description` to describe what the endpoint actually returns
- Replace the `501` response with a proper `200` response with schema and parameter definitions
- Add `parameters` arrays (`x`, `n`, `ops` where applicable)
- Update the tag descriptions to remove the "not implemented in v1" text

This single change transforms the perceived API surface from 14 to 19 endpoints at zero implementation cost.

### Fix 5: Tag descriptions for bridge-derivation, bridge-trace, bridge-resolver, user-morphism, user-state

Each tag currently says `"(not implemented in v1). Requires Rust conformance suite."` — update to describe what the endpoint actually returns.

### Fix 6: Remove the dead second server entry

The `servers` array lists `https://uor.foundation/api/v1` as a server. Every request to that URL returns a 404 HTML page. This breaks any toolchain (Swagger UI, Postman, etc.) that tries the second server. Remove it or mark it clearly as `x-server-status: planned`.

---

## Priority 3 — Response quality fixes (edge function)

### Fix 7: Add a flat `summary` block to every response

**Current problem:** The key result is buried inside JSON-LD prefixed keys. An agent parsing `proof:verified` has to know JSON-LD conventions. A flat `summary` object at the top level lets agents consume results in one line.

**Fix:** Add a `summary` field to every response that contains the key result fields with plain names (no namespace prefixes). Example for `/kernel/op/verify`:

```json
{
  "summary": {
    "verified": true,
    "x": 42,
    "statement": "neg(bnot(42)) = 43 = succ(42) [PASS]"
  },
  "@type": "proof:CriticalIdentityProof",
  ...
}
```

This does not remove any existing fields — it adds a convenience layer on top.

### Fix 8: Add `partition_interpretation` field to partition responses

**Current problem:** `"aaaaaaaaaa"` gets `quality_signal: PASS` with `density: 1.0` because byte 97 (`a`) is algebraically irreducible (odd, not a unit). This is mathematically correct but misleading — repetitive content passes spam detection. The audit correctly identifies this as a semantics mismatch.

**Fix:** Add a `partition_interpretation` field to the partition response that makes the algebraic nature of the test explicit:

```json
"partition_interpretation": {
  "method": "algebraic-byte-class",
  "note": "Density measures algebraic class distribution of byte values — not semantic novelty or entropy. Repetitive content with algebraically irreducible byte values (odd bytes that are not ring units) will score high density.",
  "threshold": 0.25,
  "result": "PASS",
  "caveat": "byte 97 ('a') is algebraically irreducible — repeated content with this byte will always PASS"
}
```

Also update the `quality_signal` field label to `algebraic_density_signal` to be unambiguous.

### Fix 9: Expose the `uor-verify` simple endpoint in the navigate index

The simple `GET /uor-verify?x=42` endpoint (at the `uor-verify` function, not the `uor-api` function) is the clearest first-call in the API — flat JSON, 5 fields, zero JSON-LD. The audit correctly identifies it as the strongest onboarding asset. Add it to the navigate response `quick_start` section with a note explaining it is the simplest entry point.

### Fix 10: Fix parameterless calls on derivation/trace/resolver returning 404 instead of 400

**Current behaviour:** `GET /bridge/derivation` (no `x` param) returns a 400 error correctly — but the navigate index implies calling without params works. The parameter validation in these handlers already handles this correctly (returns 400). The issue is only in the navigate description — it should explicitly document that `x` is required.

**Fix:** Ensure the navigate endpoint entries for derivation, trace, and resolver clearly list `x` as required (not optional).

---

## Priority 4 — Copy fixes (Api.tsx page + openapi.json descriptions)

### Fix 11: Correct the partition description throughout `Api.tsx`

The UI copy in `src/pages/Api.tsx` currently describes partition as measuring "information density" and flags low scores as "strong signal of spam or filler." After the audit's finding (algebraic, not semantic), this needs qualification. The explanation for the partition endpoint should add one sentence: "Note: density measures algebraic byte-class distribution, not semantic novelty."

### Fix 12: Correct the `/bridge/cert/involution` framing in `Api.tsx`

The current UI copy for Problem 2 (Auth Exploits) implies `cert:TransformCertificate` is available via the API. The audit shows only `cert:InvolutionCertificate` is exposed. The copy should be adjusted to describe what is actually available, not the aspirational planned endpoint.

---

## Files changed

| File | Changes |
|---|---|
| `supabase/functions/uor-api/index.ts` | Fix `/openapi.json` handler to return 301 redirect; fix `frameworkIndex` to move 3 endpoints into main array and add `example` URLs; add `summary` blocks to every handler; add `partition_interpretation` to partition handler; add uor-verify to quick_start |
| `public/openapi.json` | Fix 5 endpoint specs from 501→200 with proper schemas and parameters; fix 5 tag descriptions; remove/clarify the dead second server entry; update paths_count references |
| `src/pages/Api.tsx` | Qualify partition description; fix auth exploits problem card to match what the cert endpoint actually provides |

---

## What we are NOT changing

- The mathematical logic in any endpoint — the audit confirmed every computation is correct
- The JSON-LD structure of responses — the context and namespaces are correct
- The rate limit logic — it works; rate-limit headers are already returned
- The `uor-verify` simple endpoint itself — it is already excellent
- The `/bridge/cert/involution` endpoint itself — it works and returns correct data
- Any new endpoints — the audit's priority 5 suggestions (pairwise coherence, TransformCertificate, trace/compare) are aspirational. We will not build them now; we will ensure the existing endpoints are correctly represented.

---

## Sequencing

1. **Edge function** (`index.ts`) — deploy first; all route/response fixes
2. **Static spec** (`openapi.json`) — update in parallel with edge function
3. **UI copy** (`Api.tsx`) — update in parallel, no deploy dependency

All three files can be edited in one pass and deployed together.
