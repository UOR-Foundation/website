

# IPFS x UOR Integration — Current State

## Completed Changes

### 1. Removed `?format=raw` from Read/Verify URLs
Gateway fetch URLs no longer append `?format=raw`, which was returning raw IPLD blocks on trustless gateways.

### 2. Updated Gateway Registry Metadata
All gateway notes now accurately describe the pinning method and read approach.

### 3. Added dag-pb/UnixFS Unwrapper
A `unwrapDagPbUnixFS()` function was added to handle gateways returning raw dag-pb blocks. It extracts the original file content from the protobuf wrapper.

### 4. Kept `pinJSONToIPFS` for Writes
After testing, `pinFileToIPFS` was found to produce CIDs that all tested public gateways serve as `application/vnd.ipld.raw` (raw dag-pb blocks), preventing direct JSON parsing. `pinJSONToIPFS` was retained as it stores content in a gateway-readable format.

## Outstanding Issue: Gateway Returns Raw IPLD

Both `gateway.pinata.cloud` and `ipfs.io` return `application/vnd.ipld.raw` content-type for all CIDs, regardless of Accept headers or `?format=raw` presence. The dag-pb unwrapper needs debugging — the protobuf field parsing may not match the actual dag-pb structure used by Pinata.

### Potential Solutions (in order of pragmatism)
1. **Pinata Dedicated Gateway** — Use Pinata's paid dedicated gateway (`<name>.mypinata.cloud`) which serves file content directly with proper MIME types
2. **Pinata v2 Retrieve API** — Use `https://api.pinata.cloud/v3/files/{id}` with JWT auth for direct content retrieval
3. **Fix dag-pb unwrapper** — Debug the protobuf parser to correctly extract UnixFS file data from raw blocks
4. **pinFileToIPFS + dedicated gateway** — Combine raw byte upload with authenticated retrieval for true byte-level losslessness

## Losslessness Architecture

The UOR framework guarantees **logical losslessness** through:
- `canonicalJsonLd()` — deterministic recursive key sort produces identical bytes from equivalent objects
- `computeUorAddress()` — Braille bijection (byte→U+2800+byte) is mathematically invertible
- `computeCid()` — CIDv1/dag-json/sha2-256 is deterministic
- `stripSelfReferentialFields()` — reconstructs Round 1 from Round 2 for verification
- `dualVerify()` — confirms both CID and UOR address match after re-canonicalization

**Byte-level losslessness** (write_bytes === read_bytes) requires `pinFileToIPFS` + a dedicated gateway that serves unwrapped file content.
