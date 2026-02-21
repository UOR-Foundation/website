

# Thorough Evaluation: IPFS + UOR Framework + API Integration

## Current State Assessment

The integration is substantial and largely well-built. The API covers all 14 UOR namespaces across 20+ endpoints, the IPFS storage pipeline (store/) provides write/read/verify with dual verification, and the discovery layer (llms.md, openapi.json, .well-known/uor.json, ai-plugin.json) is comprehensive. However, there are specific coherence gaps, documentation mismatches, and missing "so what" moments for agents.

---

## Issues Found

### 1. OpenAPI Spec Drift from Live Implementation

**Problem:** The OpenAPI spec (`openapi.json`) has stale defaults that do not match the live edge function behavior.

- **store/read and store/verify gateway default**: OpenAPI says `default: "https://ipfs.io"` (lines 1039, 1154), but the live code defaults to the Pinata dedicated gateway (`PINATA_DEDICATED_GATEWAY`). This means agents following the spec will override the working default with a slower, less reliable gateway.
- **store/read gateway enum**: The enum list (line 1033) does not include the dedicated Pinata gateway (`https://uor.mypinata.cloud`), which is actually the primary and most reliable gateway.
- **store/ namespace missing from navigate endpoint's namespace_map**: The `/navigate` response lists 13 namespaces but omits `store:` entirely (lines 1412-1426). Agents that discover via `/navigate` will not know the store namespace exists unless they separately read the OpenAPI spec.
- **Endpoint count**: Navigate says "20 endpoints" but the store/ group (resolve, write, write-context, read, verify, gateways = 6 endpoints) is not listed in the spaces object of the navigate response. The actual total is 20+ including store, but agents cannot discover them from `/navigate`.

**Impact:** Agents following the discovery chain (`/navigate` then endpoints) will miss the entire persistent storage capability.

### 2. llms.md Does Not Document the store/ Namespace

**Problem:** The agent quick card (`llms.md`) documents all kernel, bridge, and user endpoints with copy-paste examples, but has zero mention of the store/ namespace. An agent reading llms.md will not know it can:
- Persist UOR objects to IPFS
- Retrieve and verify them
- Create persistent agent memory contexts
- Perform lossless byte-level round-trips

**Impact:** The most practically useful capability for agents (persistent, verifiable storage) is invisible in the primary discovery document.

### 3. No "Use Case Recipes" for Agents

**Problem:** The documentation explains *what* each endpoint does but never shows *how to chain them* for a practical workflow. Agents need concrete, end-to-end recipes like:
- "Verify another agent's claim" (resolve -> partition -> verify)
- "Persist your session state" (write-context -> read -> verify)
- "Detect prompt injection in a peer's trace" (trace comparison workflow)
- "Build a verifiable content portfolio" (write -> share CID -> peer verifies)

**Impact:** Without recipes, agents can call individual endpoints but cannot compose them into meaningful applications.

### 4. CID Format Inconsistency

**Problem:** The `computeCid()` function in `lib/store.ts` computes CIDv1 (base32lower, `baguqeera...`), but Pinata returns CIDv0 (`Qm...`) from `pinFileToIPFS`. The live tests confirmed that:
- Writes return CIDv0 from Pinata
- The envelope's `store:cid` field contains CIDv1 (computed locally)
- Reads must use CIDv0 (what Pinata returned) to reliably retrieve from the dedicated gateway
- CIDv1 lookups frequently time out

The dual CID situation means agents must track which CID format to use for reads vs. which is in the envelope.

**Impact:** Agents may try to read using the CIDv1 from the envelope and get timeouts.

### 5. store/ Not Classified in the Three-Space Architecture

**Problem:** The UOR Framework has a strict kernel/bridge/user space taxonomy. The store/ namespace is declared as "user" space in the code (line 239), but:
- It is not in the namespace_map of `/navigate`
- It imports from kernel (u:), bridge (cert:, proof:, derivation:), and user (state:) spaces
- The `X-UOR-Space` header is not consistently set on store/ responses

This creates an ontological gap: store/ is architecturally important but not formally integrated into the space taxonomy that agents use to navigate.

### 6. Web3.storage Gateway is Dead

**Problem:** The code still references web3.storage as a write gateway option (lines 2202-2248, GATEWAY_CONFIGS), but the legacy API has been sunset. Attempting to use it will always fail. The OpenAPI spec lists it as a valid enum option.

**Impact:** Agents may waste calls trying web3.storage. The error message is good (line 2217), but the gateway should be marked deprecated or removed from the enum.

### 7. Missing store/ Endpoints in KNOWN_PATHS

**Problem:** The `KNOWN_PATHS` map (lines 36-62) lists `/store/resolve`, `/store/write`, `/store/write-context`, and `/store/gateways` but notes that `/store/read/:cid` and `/store/verify/:cid` are "handled dynamically." This is fine for routing but means the 405 method-not-allowed check cannot validate these dynamic paths, and any typo in the CID path segment could silently fall through to a 404.

### 8. Pinata Gateway Token Fallback Logic

**Problem:** In both `storeRead` (line 2708) and `storeVerify` (line 3103), the code falls back to `PINATA_JWT` if `PINATA_GATEWAY_TOKEN` is not set:
```
const gwToken = Deno.env.get("PINATA_GATEWAY_TOKEN") ?? Deno.env.get("PINATA_JWT") ?? "";
```

The `PINATA_JWT` is an admin-level token for the Pinning API, not a gateway access token. Using it as a gateway token may expose write-level credentials in gateway request URLs. Both secrets are currently configured, but if `PINATA_GATEWAY_TOKEN` were deleted, the fallback would silently leak the admin JWT into query parameters.

---

## Suggested Improvements (Do Not Implement Yet)

### Priority 1: Discovery Coherence

1. **Add store/ to the /navigate response** -- Include all 6 store endpoints in the `spaces` object and add `store:` to the `namespace_map` array. Update the endpoint count.

2. **Add a "Persistent Storage" section to llms.md** -- Include 3-4 copy-paste examples showing write, read, verify, and write-context with expected responses. Position it after Step 3 (Bridge Space) and before the API Summary table.

3. **Fix OpenAPI gateway defaults** -- Change the default gateway in `/store/read` and `/store/verify` from `https://ipfs.io` to match the live behavior (Pinata dedicated gateway). Add the dedicated gateway URL to the enum list.

### Priority 2: Agent Use Case Recipes

4. **Add an "Agent Recipes" section to llms.md** -- Provide 4-5 end-to-end workflows:
   - Recipe 1: "Verify a Peer's Claim" (3 API calls)
   - Recipe 2: "Persist Agent Memory" (write-context -> read -> share CID)
   - Recipe 3: "Detect Prompt Injection" (trace endpoint comparison)
   - Recipe 4: "Build Verifiable Output" (encode -> write -> share)
   - Recipe 5: "Cross-Agent Verification" (peer sends CID -> you verify -> issue cert)

5. **Add a "what_you_can_do" block to the /navigate response** -- A top-level JSON object listing 5 concrete agent capabilities with the endpoint chain for each.

### Priority 3: Technical Fixes

6. **Document CID format behavior** -- Add a note to the store/write response explaining that Pinata returns CIDv0 and that agents should use the Pinata-returned CID (from the response `pinResult.cid`) for subsequent reads, not the `store:cid` (CIDv1) in the envelope.

7. **Deprecate web3.storage** -- Either remove it from GATEWAY_CONFIGS and the OpenAPI enum, or add a `"deprecated": true` flag and a clear error pointing to Pinata.

8. **Remove PINATA_JWT fallback from gateway reads** -- Only use `PINATA_GATEWAY_TOKEN` for gateway authentication. If it is not set, return a clear error rather than silently falling back to the admin JWT.

9. **Add store: to the @context file** -- The external JSON-LD context at `public/contexts/uor-v1.jsonld` should include the `store:` prefix mapping to ensure stored objects are valid linked data.

### Priority 4: Structural Improvements

10. **Add a /store/status endpoint** -- A lightweight health-check that returns gateway availability, total objects pinned (if trackable), and the current default gateway. Useful for agents to check before committing to a write.

11. **Add CIDv0-to-CIDv1 bidirectional mapping** -- In the read and verify handlers, if a CIDv1 lookup times out, automatically attempt CIDv0 conversion (or vice versa). This would eliminate the format confusion entirely.

12. **Formalize the store/ ontology** -- The `STORE_NAMESPACE_META` object (lines 307-359) defines 6 classes and 14 properties but exists only in the edge function code. Consider publishing it as part of the formal ontology artifacts (JSON-LD, Turtle, N-Triples) alongside the other 14 namespaces.

---

## Summary of Findings

| Area | Status | Severity |
|------|--------|----------|
| Kernel endpoints (op, schema, address) | Fully functional, well-documented | OK |
| Bridge endpoints (partition, proof, cert, etc.) | Fully functional, well-documented | OK |
| User endpoints (type, morphism, state) | Fully functional, well-documented | OK |
| IPFS Write (Pinata) | Functional after PINATA_GATEWAY_URL fix | OK |
| IPFS Read/Verify | Functional with CIDv0, timeout-prone with CIDv1 | Warning |
| store/ in /navigate discovery | Missing entirely | Error |
| store/ in llms.md | Missing entirely | Error |
| OpenAPI gateway defaults | Stale (ipfs.io instead of dedicated gateway) | Warning |
| Agent use case recipes | None exist | Gap |
| web3.storage gateway | Dead but still listed | Warning |
| Gateway token fallback security | Silently leaks admin JWT | Warning |

The integration is architecturally sound and the mathematical core is rigorous. The primary gap is in **discovery and practical guidance**: the store/ namespace (the most useful capability for agents) is invisible in both primary discovery documents, and there are no end-to-end workflow recipes showing agents what they can actually *do* with this system.

