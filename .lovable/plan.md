

# Wire the Website's REST API to be the Canonical v0.3 Entry Point

## What I Found (Audit)

I compared three things: the published OpenAPI spec at `https://uor.foundation/openapi.json`, the local copy at `public/openapi.json`, and the Supabase edge function at `supabase/functions/uor-api/index.ts`.

| Surface | Paths | Status |
|---|---|---|
| `public/openapi.json` (local spec) | 84 | Byte-identical to the upstream canonical spec |
| `supabase/functions/uor-api` (your edge function) | 79 routes registered, fully implemented | All ring math, partition, proof, observable, derivation, trace, resolver, sparql, shacl, store, observer, schema-org, attribution endpoints work |
| `https://api.uor.foundation/v1/...` (the upstream live API) | Same shape | Currently returning `WORKER_RESOURCE_LIMIT` errors — partially down |
| `crates.io/crates/uor-foundation@0.3.0` | Rust ontology source | Spec maps 1:1 to its namespaces |

**Method signatures match 100%.** The local spec already declares `x-source-crate: https://crates.io/crates/uor-foundation`. Two gaps:

1. The spec doesn't pin to **crate v0.3.0** explicitly — there's no `x-source-crate-version` field, so a reader can't tell which crate release the API conforms to.
2. The website's API page tells users to call `https://api.uor.foundation/v1` (currently flaky) — but your edge function already implements the whole surface and is reliable. The website should publish itself as a canonical mirror.

## What This Plan Does

Make the website's own REST API the **canonical v0.3 entry point** by (a) pinning the spec to `uor-foundation@0.3.0`, (b) exposing the edge function under a stable, first-party URL on the website, and (c) updating the API explorer to call that URL by default with the upstream as fallback.

## Changes

### 1. Pin the spec to crate v0.3.0 — `public/openapi.json`
Add three fields to `info`:
```json
"version": "0.3.0",
"x-source-crate-version": "0.3.0",
"x-conformance": "uor-foundation = \"0.3.0\""
```
Add a second entry to `servers[]` so both the upstream live API and the website's first-party mirror are advertised:
```json
{ "url": "https://uor.foundation/api/v1", "description": "Canonical first-party mirror (this website)", "x-server-status": "active" },
{ "url": "https://api.uor.foundation/v1", "description": "Upstream live API", "x-server-status": "active" }
```

### 2. Expose the edge function under a clean website path
Add a Vite/Vercel rewrite (in `vite.config.ts` proxy + `public/_redirects` for production) that maps:
```
/api/v1/*  →  https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api/*
```
Result: every endpoint becomes callable as `https://uor.foundation/api/v1/kernel/op/verify?x=42` with no edge-function URL leaking. Cache headers, ETags, and rate limits already set by the function pass through.

### 3. Make the website API explorer use the canonical mirror
In `src/data/api-layers.ts` and `src/modules/uor-sdk/client.ts`:
- `API_BASE_URL` becomes `https://uor.foundation/api/v1` (or `/api/v1` in dev)
- The "Try it" buttons in `ApiPage.tsx` call the first-party path
- Curl examples show the first-party URL
- Keep the upstream `https://api.uor.foundation/v1` as a labeled secondary server in the docs, so federation and SPARQL clients still see both

### 4. Add a version banner + crate provenance card to the API page
On `/api`, add a small panel below the hero:
> **Conforms to `uor-foundation` v0.3.0** — every endpoint maps 1:1 to a class, property, or named individual in the Rust ontology. View the crate · View the OpenAPI spec.

Links: crates.io page, docs.rs page, `/openapi.json`.

### 5. Add a self-conformance test endpoint
A new `/api/v1/conformance` route in the edge function returns:
```json
{
  "spec_version": "0.3.0",
  "crate": "uor-foundation",
  "crate_version": "0.3.0",
  "implemented_paths": 79,
  "spec_paths": 84,
  "missing": ["/path1", ...],
  "checked_at": "2026-04-20T..."
}
```
Computed by reading the bundled `openapi.json` and diffing against the in-code `KNOWN_PATHS` table — auto-detects drift the moment the crate or spec moves.

### 6. Fix the 5 spec-only paths the edge function doesn't yet implement
The diff shows 79 implemented vs 84 in the spec. Add the missing handlers (mostly trivial discovery/status endpoints) so the website's mirror is **100% conformant**. I'll enumerate the exact missing paths from the diff during implementation.

## Files Touched

- `public/openapi.json` — version pin + second server
- `vite.config.ts` — dev proxy `/api/v1` → edge function
- `public/_redirects` (or `vercel.json`) — production rewrite
- `src/data/api-layers.ts` — `API_BASE_URL` → first-party
- `src/modules/uor-sdk/client.ts` — `RUNTIME_BASE` → first-party
- `src/modules/api-explorer/components/EndpointPanel.tsx` — same
- `src/modules/api-explorer/pages/ApiPage.tsx` — add v0.3.0 provenance banner
- `src/modules/verify/pages/VerifyPage.tsx`, `EpistemicPage.tsx` — point at first-party path
- `supabase/functions/uor-api/index.ts` — add `/conformance` route + 5 missing path handlers

## Result

- Anyone can call `https://uor.foundation/api/v1/kernel/op/verify?x=42` — first-party, reliable, cached
- The OpenAPI spec, the website, and the Rust crate all share one explicit version: `0.3.0`
- A live `/conformance` endpoint proves the mirror matches the spec
- Existing upstream `api.uor.foundation/v1` still works for federation; the website is no longer dependent on its uptime

