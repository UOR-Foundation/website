

## Fix: Schema.org Pinning Fails with "loading remote context failed"

### Root Cause

The `jsonld` library's URDNA2015 canonicalization (`jld.canonize()`) needs to resolve `@context` URLs like `"https://schema.org/"`. In the Deno edge function runtime, the library's default `documentLoader` does **not** support fetching remote URLs, so every call to `canonicalizeToNQuads()` with a schema.org-contexted object throws:

```
jsonld.InvalidUrl: Dereferencing a URL did not result in a valid JSON-LD object.
  code: "loading remote context failed", url: "https://schema.org/"
```

This affects `GET /schema-org/extend?type=Person&store=true` because `computeSobridgeIdentity()` calls `singleProofHashEdge()` which calls `canonicalizeToNQuads()` with `@context: "https://schema.org/"`.

### Fix (1 file)

**`supabase/functions/uor-api/lib/store.ts`** -- Add a custom `documentLoader` that uses `fetch()` to retrieve remote JSON-LD contexts, with an in-memory cache for performance.

1. Create a `customDocumentLoader` function that:
   - Intercepts `https://schema.org/` (and its trailing-slash variant) and fetches the context via HTTP with `Accept: application/ld+json`
   - Caches fetched contexts in a `Map` to avoid repeated network calls
   - Falls back to the jsonld library's default node document loader for non-HTTP URLs
2. Pass this loader to `jld.canonize()` in `canonicalizeToNQuads()` via the `documentLoader` option

### Key code change

In `canonicalizeToNQuads()`:

```typescript
return jld.canonize(doc, {
  algorithm: 'URDNA2015',
  format: 'application/n-quads',
  documentLoader: customDocumentLoader,  // <-- add this
});
```

The `customDocumentLoader` will handle schema.org and any other remote context by fetching via the standard `fetch()` API available in Deno, then returning the expected `{ document, documentUrl }` format the jsonld library requires.

### Technical Details

- The cached context map prevents repeated 1MB+ fetches of the schema.org vocabulary during batch operations
- The loader normalizes common URL variants (`https://schema.org`, `https://schema.org/`, `http://schema.org/`) to a single cache key
- For non-remote contexts (inline objects), no loader is invoked -- existing behavior is preserved
- No changes to the frontend `BulkPinPage.tsx` are needed; the fix is entirely backend

