
# IPFS Integration Audit: Critical Issues and Fixes

## Audit Summary

Testing the live store/ endpoints revealed three critical issues that make the IPFS write/read cycle completely non-functional. The read-only endpoints (`/store/gateways`, `/store/resolve`) and the pure-computation layer (UOR addressing, CID computation, kernel-space rejection) are architecturally sound but also affected by one of these bugs.

---

## Critical Issues Found

### Issue 1: All Store Endpoints Crash -- Braille Characters in HTTP Headers (SEVERITY: BLOCKER)

Every store/ endpoint that returns a UOR address sets a response header like:

```text
X-UOR-Address: ⠓⠑⠇⠇⠕  (Braille Unicode U+2800-U+28FF)
```

HTTP headers are restricted to ASCII (the "ByteString" type). Deno throws `TypeError: Value is not a valid ByteString` and the entire response fails with HTTP 500.

**Affected endpoints:**
- `POST /store/write` -- crashes on both dry-run and live pin
- `GET /store/resolve` -- crashes
- `GET /store/read/:cid` -- crashes (X-UOR-Recomputed-Address header)
- `GET /store/verify/:cid` -- crashes

**Fix:** Encode Braille glyphs to hex or percent-encoding before placing in headers. The full glyph remains in the JSON-LD body (which supports Unicode). For headers, use a hex representation like `U+2868U+2865...` or simply omit the header and rely on the body.

---

### Issue 2: No Working IPFS Write Gateway (SEVERITY: BLOCKER)

Neither write gateway is functional:

- **web3.storage**: The API at `https://api.web3.storage/upload` returns `401 ERROR_NO_TOKEN`. The old web3.storage upload API has been sunset and now requires authentication via the w3up protocol (UCAN-based). The `WEB3_STORAGE_TOKEN` secret is not configured, and even if it were, the old API format is deprecated.
- **Pinata**: Requires `PINATA_JWT` secret which is not configured.

This means `POST /store/write` with `pin:true` and `POST /store/write-context` with `pin:true` will always fail.

**Fix options (in order of preference):**
1. Switch to Pinata as default gateway and configure the `PINATA_JWT` secret (Pinata's API is stable and the code already implements it correctly)
2. Update web3.storage integration to use the new w3up/UCAN protocol
3. As a minimum viable fix: ensure dry-run mode works perfectly (it currently crashes due to Issue 1) so users can compute addresses without pinning, and document that live pinning requires gateway credentials

---

### Issue 3: Write-Read-Verify Round-Trip Always Fails (SEVERITY: CRITICAL)

The dual verification algorithm has a fundamental design flaw that means verification will never pass, even for legitimately stored content:

**The problem:**
1. `POST /store/write` computes CID and UOR address from "Round 1" bytes (the envelope WITHOUT the `store:cid` and `store:uorAddress` fields)
2. It then inserts those computed addresses into the envelope, creating "Round 2" bytes
3. Round 2 bytes (with addresses embedded) are what gets pinned to IPFS
4. `GET /store/read/:cid` retrieves the Round 2 bytes from IPFS
5. Verification recomputes CID from the full Round 2 bytes -- but Round 2 includes the address fields that weren't in Round 1
6. Result: CID mismatch (always) and UOR address mismatch (always)

The code even documents this in `store:cidScope`:
> "Verification: strip store:cid and store:uorAddress from the retrieved JSON-LD, serialise canonically, recompute -- addresses must match."

But the `dualVerify()` function does NOT strip these fields before recomputing. It operates on the raw retrieved bytes.

**Fix:** Before recomputing addresses during verification, parse the JSON-LD, remove `store:cid`, `store:uorAddress`, and `@id` (which contains the encoded glyph), restore the placeholder `@id`, then re-serialise canonically and recompute. This matches the verification algorithm described in `cidScope`.

---

## Implementation Plan

### Step 1: Fix Braille-in-Headers Crash

In `storeWrite`, `storeResolve`, `storeRead`, and `storeVerify`, replace all Braille glyph values in HTTP headers with a hex-encoded representation:

```typescript
function glyphToHeaderSafe(glyph: string): string {
  return [...glyph].slice(0, 32).map(c =>
    'U+' + (c.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')
  ).join('');
}
```

Apply to every `X-UOR-Address` and `X-UOR-Recomputed-Address` header across all four endpoints.

### Step 2: Fix Dual Verification (Round-Trip Integrity)

Update `dualVerify()` to strip the self-referential fields before recomputing:

```typescript
async function dualVerify(retrievedBytes, requestedCid) {
  // Parse the stored JSON-LD
  let parsed;
  try { parsed = JSON.parse(new TextDecoder().decode(retrievedBytes)); }
  catch { /* not JSON -- fall through to raw verification */ }

  if (parsed && parsed["store:cid"]) {
    // Strip self-referential fields to reconstruct Round 1
    const round1 = { ...parsed };
    delete round1["store:cid"];
    delete round1["store:cidScope"];
    delete round1["store:uorAddress"];
    round1["@id"] = "https://uor.foundation/store/object/pending";
    const round1Bytes = new TextEncoder().encode(canonicalJsonLd(round1));
    // Recompute from Round 1
    const recomputedCid = await computeCid(round1Bytes);
    const recomputedUor = computeUorAddress(round1Bytes);
    // Compare against stored values
    ...
  }
}
```

Apply the same stripping logic in `storeVerify()`.

### Step 3: Fix IPFS Write Gateway

Configure Pinata as the default write gateway since its API is stable and the existing `pinToPinata()` implementation is correct:

1. Add the `PINATA_JWT` secret to the project
2. Change `DEFAULT_WRITE_GATEWAY` fallback from `web3.storage` to `pinata`
3. Update `pinToWeb3Storage` to handle the 401 gracefully with a clear error message directing users to configure credentials or use Pinata
4. Add a `try-catch` in `storeWrite` around the gateway selection to provide a helpful error when no credentials are configured for any gateway

### Step 4: Add Global Error Handler

Wrap the store endpoint handlers in try-catch to return structured JSON errors instead of Deno's raw 500 errors. Currently, the Braille crash produces an unhelpful generic error.

### Step 5: Update Test Suite

Update the test file at `supabase/functions/uor-api/store/tests/store.test.ts`:
- Fix unit tests that check glyph characters use actual Unicode assertions (not escaped string literals like `\\u2800`)
- Add a test for the header-safe encoding
- Add a round-trip test that validates the stripping-based verification works

---

## What Works Correctly (No Changes Needed)

- Braille bijection computation (each byte to U+2800+byte) -- mathematically correct
- CID computation (CIDv1 / dag-json / sha2-256 / base32lower) -- correctly implemented
- Canonical JSON-LD serialisation (recursive key sorting, minified) -- correct
- Kernel-space type rejection (13 types blocked with HTTP 422) -- correct
- `GET /store/gateways` endpoint -- works and returns health data
- Rate limiting, CORS, error responses -- all functional
- Router path matching for all store/ endpoints -- correctly wired

---

## Technical Details

### Files to Modify

| File | Changes |
|---|---|
| `supabase/functions/uor-api/index.ts` | Fix headers in 4 endpoints, fix `dualVerify()`, update default gateway, add error handler |
| `supabase/functions/uor-api/store/tests/store.test.ts` | Fix unit test assertions, add round-trip verification test |

### Deployment

After implementing, the edge function will be automatically redeployed. Testing can be done immediately via curl to validate:
1. `POST /store/write` with `pin:false` returns 200 (not 500)
2. Headers contain ASCII-safe UOR address representations
3. If Pinata JWT is configured: `POST /store/write` with `pin:true` returns a real CID
4. `GET /store/read/:cid` with that CID returns `store:verified: true`
