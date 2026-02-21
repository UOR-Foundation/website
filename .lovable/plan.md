

# IPFS x UOR Integration Audit -- Final Technical Report and Fix Plan

## Current Status Summary

Live testing of all six store/ endpoints confirms:

| Endpoint | Dry-Run | Live Pin | Status |
|---|---|---|---|
| POST /store/write (pin:false) | 200 OK | -- | WORKING |
| POST /store/write (pin:true) | -- | 503 | BLOCKED (no PINATA_JWT) |
| POST /store/write-context (pin:false) | 200 OK | -- | WORKING |
| POST /store/write-context (pin:true) | -- | 503 | BLOCKED (no PINATA_JWT) |
| GET /store/resolve | 200 OK | -- | WORKING |
| GET /store/gateways | 200 OK | -- | WORKING |
| GET /store/read/:cid | -- | N/A | UNTESTABLE (no pinned content) |
| GET /store/verify/:cid | 400 | -- | PARTIAL (bafkqaaa rejected as "too short") |
| Kernel-space rejection | 422 | -- | WORKING |
| Braille header encoding | ASCII hex | -- | FIXED |

The three critical blockers from the previous audit have been addressed:
1. Braille-in-headers crash -- FIXED (glyphToHeaderSafe produces ASCII hex)
2. dualVerify round-trip -- FIXED (stripSelfReferentialFields reconstructs Round 1)
3. Default gateway switched to Pinata -- FIXED (code defaults to "pinata")

---

## Remaining Issues

### Issue A: No PINATA_JWT Secret Configured (BLOCKER for live writes)

The single blocking issue preventing the full write-read-verify cycle. The code correctly defaults to Pinata and the `pinToPinata()` implementation is correct, but the `PINATA_JWT` secret is not configured. Without it, `pin:true` returns HTTP 503.

**Fix:** Configure the `PINATA_JWT` secret. Pinata offers a free tier with 1GB storage -- sufficient for agent memory use cases.

### Issue B: Gateway Registry Metadata Inconsistency

The `/store/gateways` response contains stale metadata that contradicts the actual implementation:

1. **web3.storage** is listed with `"store:defaultFor": ["write"]` and `"store:authRequired": false` with a note saying "Anonymous uploads accepted" -- but the actual code rejects requests without `WEB3_STORAGE_TOKEN` and the old API is sunset
2. **Pinata** is listed with `"store:defaultFor": []` -- but it IS the actual default write gateway now
3. The `"store:authNote"` on web3.storage says "Anonymous uploads accepted" which is false

These mismatches will confuse AI agents reading the gateway registry.

**Fix:** Update the GATEWAY_REGISTRY constant to reflect reality:
- Pinata: set `"store:defaultFor": ["write"]`, keep `"store:authRequired": true`
- web3.storage: set `"store:defaultFor": []`, set `"store:authRequired": true`, update note to explain the API has been sunset

### Issue C: CID Validation Rejects Valid Short CIDs

The `validateCid()` function requires CIDv1 to be at least 10 characters. The IPFS identity CID `bafkqaaa` (8 characters) is a valid CIDv1 used as the IPFS probe standard (Trustless Gateway spec section 7.1), but it's rejected with "CIDv1 is too short." The gateways endpoint itself uses `bafkqaaa` for health probing, creating an inconsistency where the system uses a CID internally that it rejects from users.

**Fix:** Lower the minimum CIDv1 length from 10 to 8 characters.

### Issue D: OpenAPI Spec Default Gateway Mismatch

The OpenAPI spec at `public/openapi.json` line 1107 lists the default gateway for write-context as `"web3.storage"` but the actual implementation defaults to `"pinata"`. AI agents reading the spec will send requests with the wrong gateway assumption.

**Fix:** Update the OpenAPI spec default from `"web3.storage"` to `"pinata"` for both `/store/write` and `/store/write-context`.

### Issue E: Duplicate Code Between index.ts and lib/store.ts

The shared library `lib/store.ts` exports `computeUorAddress`, `computeCid`, `canonicalJsonLd`, `validateStorableType`, `KERNEL_SPACE_TYPES`, `glyphToHeaderSafe`, and `stripSelfReferentialFields`. But `index.ts` re-declares all of these identically (lines 254-404) instead of using the imports from lib/store.ts. The imports exist (lines 246-252) but are aliased with `_IMPORTED` suffixes and never used. This means any future bug fix must be applied in two places.

**Fix:** Remove the duplicated declarations in index.ts and use the imported versions directly.

### Issue F: storeRead Recomputes UOR from Round 2 Bytes for Header

At line 2879, `storeRead` recomputes the UOR address from the raw retrieved bytes (Round 2) for the response body field `store:recomputedUorAddress`. But the `dualVerify` function correctly uses Round 1 reconstruction. This means the `store:recomputedUorAddress` in the response body will differ from what `dualVerify` computed, creating confusion in the response.

**Fix:** Use the verification result's `recomputed_uor_address` instead of recomputing.

---

## Implementation Plan

### Step 1: Configure PINATA_JWT Secret

Prompt the user to add the `PINATA_JWT` secret. This unblocks the entire write-read-verify pipeline.

### Step 2: Fix Gateway Registry Metadata

Update the `GATEWAY_REGISTRY` constant in index.ts:

```text
Lines 3352-3366 (web3.storage entry):
- "store:defaultFor": ["write"]  -->  "store:defaultFor": []
- "store:authRequired": false    -->  "store:authRequired": true
- Remove "Anonymous uploads accepted" note
- Add note: "Legacy API sunset. Requires WEB3_STORAGE_TOKEN (UCAN). Use Pinata for new deployments."

Lines 3368-3381 (Pinata entry):
- "store:defaultFor": []         -->  "store:defaultFor": ["write"]
```

### Step 3: Fix CID Validation Minimum Length

```text
Line 2633: change `if (cid.length < 10)` to `if (cid.length < 8)`
```

### Step 4: Remove Duplicate Code in index.ts

- Delete the duplicated declarations (lines 254-404): `KERNEL_SPACE_TYPES`, `validateStorableType`, `UOR_STORE_CONTEXT`, `canonicalJsonLd`, `encodeBase32Lower`, `computeCid`, `computeUorAddress`, `glyphToHeaderSafe`, `stripSelfReferentialFields`
- Rename imports to drop the `_IMPORTED` suffix and use them directly
- Add missing imports from lib/store.ts: `UOR_JSONLD_CONTEXT` as `UOR_STORE_CONTEXT`, plus `encodeGlyph` (or keep the local one for the non-store endpoints)

### Step 5: Fix storeRead Response Inconsistency

Replace line 2879:
```typescript
// Before:
const recomputedUor = computeUorAddress(bytes);

// After: use the verification result
const recomputedUorGlyph = verification.uor_consistency.recomputed_uor_address;
```

And update `store:recomputedUorAddress` and the header to use this value.

### Step 6: Update OpenAPI Spec

In `public/openapi.json`, update the store endpoint defaults:
- Line 1107: change `"default": "web3.storage"` to `"default": "pinata"`
- Also update the `/store/write` schema default gateway if present

### Step 7: End-to-End Validation (After PINATA_JWT)

Once the secret is configured, run the full cycle:
1. `POST /store/write` with `pin:true` -- should return 200 with a real CID
2. `GET /store/read/{cid}` -- should return the content with `store:verified: true`
3. `GET /store/verify/{cid}` -- should return `verdict: VERIFIED`

---

## What is Already Correct (No Changes Needed)

- Braille bijection (byte to U+2800+byte) -- mathematically sound, lossless
- CIDv1 computation (dag-json 0x0129, sha2-256, base32lower) -- IPFS-compliant
- Canonical JSON-LD serialisation (recursive key sort, minified) -- deterministic
- Kernel-space type guard (13 types, HTTP 422) -- working correctly
- Round 1/Round 2 envelope design -- architecturally sound
- stripSelfReferentialFields for verification -- correctly implemented
- glyphToHeaderSafe for ASCII headers -- working
- Full @context with all 17 UOR namespaces in every response -- correct
- CORS, rate limiting, error responses -- all functional
- IPLD DAG structure for write-context -- correctly links bindings to root
- Global try-catch error handler in router -- present and working

---

## Files to Modify

| File | Changes |
|---|---|
| `supabase/functions/uor-api/index.ts` | Fix gateway registry, remove duplicates, fix CID validation, fix storeRead |
| `public/openapi.json` | Update default gateway |

## Secret to Add

| Secret | Purpose |
|---|---|
| `PINATA_JWT` | Authenticate with Pinata IPFS pinning API for live writes |

