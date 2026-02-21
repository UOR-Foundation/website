

# IPFS x UOR Lossless Round-Trip Audit -- Critical Fix

## The Losslessness Problem

There is one critical bug that breaks byte-level lossless round-trips. Everything else is architecturally sound.

### CRITICAL: `pinJSONToIPFS` Destroys Canonical Byte Ordering

The `pinToPinata()` function (index.ts lines 2251-2285) currently does this:

```text
1. Takes our carefully computed canonical bytes
2. Calls JSON.parse(canonicalBytes) -- destroys deterministic key order
3. Wraps result in { pinataContent: parsedObject, pinataMetadata: ... }
4. Sends to Pinata's pinJSONToIPFS endpoint
5. Pinata re-serializes the JSON with its own key ordering and whitespace
6. Pinata stores ITS serialization, not our canonical bytes
```

When reading back:

```text
1. Gateway returns Pinata's serialization (different byte sequence)
2. Our verification re-parses and re-canonicalizes, which happens to match
3. But the raw bytes on IPFS are NOT our canonical representation
```

This means:
- The IPFS network stores a non-canonical representation of our data
- Any external tool reading from IPFS directly gets non-canonical bytes
- The claim of "universal lossless encoding" is undermined at the storage layer
- The CIDv0 returned by Pinata addresses Pinata's serialization, not our canonical form

### The Fix: Use `pinFileToIPFS` Instead

Pinata's `pinFileToIPFS` endpoint accepts raw file uploads via multipart form data. It pins the exact bytes we send -- no parsing, no re-serialization. This guarantees:

- Byte-exact storage of our canonical JSON-LD
- The CIDv0 addresses our exact bytes (wrapped in UnixFS)
- Any IPFS client retrieving the content gets our exact canonical bytes back
- True lossless round-trip: write(object) -> read(cid) -> identical bytes

### Secondary Issue: `?format=raw` on Read Path

The read and verify endpoints append `?format=raw` to gateway URLs. On IPFS Trustless Gateways, this returns the raw IPLD block (dag-pb protobuf wrapper), NOT the unwrapped file content. The Pinata public gateway may silently ignore this parameter and serve content correctly, but this is gateway-specific behavior, not spec-compliant.

For reliability, the read path should request the content without `?format=raw` and use standard content negotiation via the Accept header.

### Gateway Registry Metadata

The gateway registry lists `pinJSONToIPFS` as the pins API URL. This should be updated to `pinFileToIPFS` to match the new implementation.

---

## Implementation Plan

### Step 1: Rewrite `pinToPinata()` to Use `pinFileToIPFS`

Replace `pinJSONToIPFS` with `pinFileToIPFS` using multipart form data:

```text
Current (LOSSY):
  JSON.parse(bytes) -> pinJSONToIPFS({ pinataContent: parsed })

Fixed (LOSSLESS):
  FormData.append("file", new Blob([bytes]), "uor-object.jsonld")
  -> pinFileToIPFS with multipart/form-data
```

The metadata (name) moves to a `pinataMetadata` form field as a JSON string, and the file is uploaded as raw bytes.

### Step 2: Fix Read/Verify Gateway URLs

Remove `?format=raw` from the gateway fetch URLs in `storeRead` and `storeVerify`. Use content negotiation via the Accept header instead:

```text
Current: ${gateway}/ipfs/${cid}?format=raw
Fixed:   ${gateway}/ipfs/${cid}
Accept:  application/ld+json, application/json, application/octet-stream, */*
```

### Step 3: Update Gateway Registry

Change the Pinata entry's `store:pinsApiUrl` from `pinJSONToIPFS` to `pinFileToIPFS`.

### Step 4: Update Gateways Note

Update the store note in the gateways response to reference file pinning rather than JSON pinning.

---

## What Remains Correct (No Changes Needed)

- Canonical JSON-LD serialization (deterministic recursive key sort) -- the foundation of losslessness
- Braille bijection (byte-to-U+2800+byte) -- mathematically lossless
- CIDv1 computation (dag-json / sha2-256 / base32lower) -- IPFS-compliant
- Round 1 / Round 2 envelope design -- eliminates self-referential bootstrapping
- `stripSelfReferentialFields` for verification -- correctly reconstructs Round 1
- `dualVerify` logic -- sound verification algorithm
- Kernel-space type guard -- working correctly
- All 17 UOR namespace @context -- complete and correct
- OpenAPI spec -- already updated with correct defaults

---

## Files to Modify

| File | Change |
|---|---|
| `supabase/functions/uor-api/index.ts` | Rewrite `pinToPinata()` to use `pinFileToIPFS`, remove `?format=raw` from read/verify fetch URLs, update gateway registry metadata |

## Losslessness Guarantee After Fix

```text
Write path:  object -> canonicalJsonLd(envelope) -> exact bytes -> pinFileToIPFS -> CIDv0
Read path:   CIDv0 -> gateway fetch -> exact same bytes -> JSON.parse -> canonicalJsonLd -> verify
Result:      write_bytes === read_bytes (byte-exact round-trip)
```

This completes the proof that UOR canonical serialization is lossless across the IPFS persistence layer.

