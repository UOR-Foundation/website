
# UOR Framework REST API — OpenAPI 3.1.0 Implementation Plan

## What We Are Building

A fully functional REST API for AI agents to access the UOR Framework, implemented as Supabase Edge Functions and served through a clean path structure. The API strictly follows the OpenAPI 3.1.0 specification you provided, with every endpoint, schema field, and response example mapped 1:1 to the UOR ontology namespaces.

The API will be discoverable at `https://uor.foundation/api/v1/` (via the published site) and directly from the edge function base URL.

---

## Architecture Overview

```text
Agent Discovery Path
────────────────────
/.well-known/uor.json  →  api.url: https://...supabase.co/functions/v1/uor-api
/llms.md               →  Step 1.5: Live API Reference
/public/openapi.json   →  Machine-readable OpenAPI 3.1.0 spec (static, served as public file)

Edge Function Layout
────────────────────
supabase/functions/uor-api/index.ts   ← Single router function handling ALL API routes
supabase/config.toml                  ← verify_jwt = false for uor-api

Route Dispatch (inside uor-api/index.ts)
─────────────────────────────────────────
GET  /kernel/op/verify           → opVerifyCriticalIdentity
GET  /kernel/op/verify/all       → opVerifyAll
GET  /kernel/op/compute          → opCompute
GET  /kernel/op/operations       → opList
POST /kernel/address/encode      → addressEncode
GET  /kernel/schema/datum        → schemaDatum
POST /bridge/partition           → partitionResolve
GET  /bridge/proof/critical-identity → proofCriticalIdentity
POST /bridge/proof/coherence     → proofCoherence
GET  /bridge/cert/involution     → certInvolution
GET  /bridge/observable/metrics  → observableMetrics
GET  /user/type/primitives       → typeList
GET  /navigate                   → frameworkIndex (reading order, namespace map)
GET  /openapi.json               → serves the OpenAPI spec inline
```

---

## Files Being Created or Changed

### 1. `supabase/functions/uor-api/index.ts` — New Edge Function (Main Deliverable)

One edge function, one file, full router. All UOR algebra is computed in pure TypeScript/Deno — no external dependencies, no secrets required.

**Core math module (embedded at top of file):**

```typescript
// ── Ring R_n = Z/(2^n)Z ──────────────────────────────────────────────
const modulus = (n: number) => Math.pow(2, n);

// UnaryOp individuals from op.rs
function neg(x: number, n = 8): number { const m = modulus(n); return ((-x) % m + m) % m; }
function bnot(x: number, n = 8): number { return x ^ (modulus(n) - 1); }
function succ(x: number, n = 8): number { return (x + 1) % modulus(n); }
function pred(x: number, n = 8): number { return (x - 1 + modulus(n)) % modulus(n); }

// BinaryOp individuals from op.rs
function add(x: number, y: number, n = 8): number { return (x + y) % modulus(n); }
function sub(x: number, y: number, n = 8): number { return ((x - y) % modulus(n) + modulus(n)) % modulus(n); }
function mul(x: number, y: number, n = 8): number { return (x * y) % modulus(n); }
function xor(x: number, y: number): number { return x ^ y; }
function and(x: number, y: number): number { return x & y; }
function or(x: number, y: number): number { return x | y; }

// Content addressing — simplified 6-bit bijection (u.rs)
function encodeGlyph(b: number): string { return String.fromCodePoint(0x2800 + (b & 0x3F)); }
function addressSimplified(bytes: Uint8Array): string { return Array.from(bytes).map(encodeGlyph).join(''); }

// schema:Datum construction (schema.rs)
function makeDatum(value: number, n: number) {
  const m = modulus(n);
  const spectrum = value.toString(2).padStart(n, '0');
  // stratum: number of set bits (popcount)
  const stratum = value.toString(2).split('').filter(b => b === '1').length;
  const glyph = encodeGlyph(value);
  return {
    "@type": "schema:Datum",
    "schema:value": value,
    "schema:quantum": n,
    "schema:stratum": stratum,
    "schema:spectrum": spectrum,
    "schema:glyph": { "@type": "u:Address", "u:glyph": glyph, "u:length": 1 }
  };
}

// partition:Partition classification (partition.rs + Python pseudocode from llms-full.md)
function classifyByte(b: number, n: number): { component: string; reason: string } {
  const m = modulus(n);
  if (b === 0)                    return { component: 'partition:ExteriorSet',  reason: 'Additive identity (zero)' };
  if (b === 1 || b === m - 1)    return { component: 'partition:UnitSet',       reason: `Ring unit — multiplicative inverse exists` };
  if (b % 2 !== 0)               return { component: 'partition:IrreducibleSet', reason: `Odd, not a unit — irreducible in R_${n}` };
  if (b === m / 2)               return { component: 'partition:ExteriorSet',  reason: `Even generator (${m/2}) — exterior` };
  return                               { component: 'partition:ReducibleSet',  reason: `Even — decomposes in R_${n}` };
}
```

**Endpoints implemented:**

| Route | Handler | Description |
|---|---|---|
| `GET /kernel/op/verify` | opVerifyCriticalIdentity | Verify neg(bnot(x)) = succ(x) for x in [0, 2^n) |
| `GET /kernel/op/verify/all` | opVerifyAll | Full CoherenceProof for all 2^n elements |
| `GET /kernel/op/compute` | opCompute | All 10 op/ individuals applied to x (and y) |
| `GET /kernel/op/operations` | opList | Catalogue of all 12 op/ named individuals |
| `POST /kernel/address/encode` | addressEncode | UTF-8 → u:Address with per-byte u:Glyph decomposition |
| `GET /kernel/schema/datum` | schemaDatum | Full schema:Datum for a ring value |
| `POST /bridge/partition` | partitionResolve | Four-component partition:Partition of input |
| `GET /bridge/proof/critical-identity` | proofCriticalIdentity | proof:CriticalIdentityProof for x |
| `POST /bridge/proof/coherence` | proofCoherence | proof:CoherenceProof for a type definition |
| `GET /bridge/cert/involution` | certInvolution | cert:InvolutionCertificate for neg or bnot |
| `GET /bridge/observable/metrics` | observableMetrics | RingMetric, HammingMetric, CascadeLength for x |
| `GET /user/type/primitives` | typeList | Catalogue of type:PrimitiveType definitions |
| `GET /navigate` | frameworkIndex | Reading order, namespace index, entry points |
| `GET /openapi.json` | openapiSpec | Full OpenAPI 3.1.0 spec as JSON |

**Response shape design:** Every response is a valid JSON-LD object with `@type`, `@id`, and `@context` references traceable to UOR namespace IRIs. All timestamps are ISO 8601. All namespace prefix keys use the format `prefix:property` matching the ontology spec.

**Error handling:** Consistent error envelope for all 400/422/429/500 codes:
```json
{ "error": "description", "code": "INVALID_PARAMETER", "param": "x", "docs": "/api/v1/openapi.json" }
```

**Rate-limiting response (HTTP 429):** Lightweight in-memory sliding window per IP (same pattern as project-submit), max 120 req/min for GET endpoints, 60 req/min for POST endpoints. `Retry-After` header included.

**Input validation:**
- `x`: integer, 0 ≤ x < 2^n
- `n`: integer, 1 ≤ n ≤ 16 (defaults to 8)
- `y`: integer, 0 ≤ y < 2^n, optional
- `expand`: boolean
- POST body `input`: string, max 1000 chars
- `operation`: enum `["neg", "bnot"]`
- All validation returns descriptive 400 with field name

---

### 2. `public/openapi.json` — Static OpenAPI 3.1.0 Specification File

A complete, valid OpenAPI 3.1.0 document served as a public static file. This is the machine-readable API specification that:
- Agents can fetch and parse programmatically
- OpenAPI tooling (Swagger UI, Redoc, Postman) can import directly
- The edge function's `GET /openapi.json` endpoint also returns this document inline

The spec includes:
- All paths, parameters, request bodies, and responses from the specification you provided
- Complete `components/schemas` for all 15+ schema types
- Complete `components/parameters` for shared parameters (x, n, expand, operation)
- Complete `components/responses` for shared error responses
- `x-agent-entry-point`, `x-discovery-metadata`, `x-community`, `x-ontology-source` extension fields
- CORS-friendly, no-auth required for all GET endpoints

---

### 3. `supabase/config.toml` — Register New Function

Add `[functions.uor-api]` with `verify_jwt = false`.

---

### 4. `public/.well-known/uor.json` — Add API Discovery Entry

Add an `"uor:api"` field to the endpoints section:
```json
"uor:api": {
  "openapi": "https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api/openapi.json",
  "base": "https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api",
  "version": "1.0.0",
  "description": "OpenAPI 3.1.0 REST API. Kernel GET endpoints require no auth. POST endpoints accept optional X-UOR-Agent-Key."
}
```

---

### 5. `public/llms.md` — Reference the API

In the Quick Start section, add a Step 1.6 entry pointing to the live API:
```
Step 1.6 (optional, zero tooling): Explore the full REST API.
GET https://.../uor-api/navigate → framework index, reading order, all endpoints
GET https://.../uor-api/openapi.json → full OpenAPI 3.1.0 specification
```

---

## Correctness Verification Strategy

Before deployment, every endpoint will be verified against the worked examples from the OpenAPI spec:

**Algebraic correctness — verified inline:**
- `neg(42)` → 214 ✓ ((-42) mod 256 = 214)
- `bnot(42)` → 213 ✓ (42 XOR 255 = 213)
- `succ(42)` → 43 ✓ ((42+1) mod 256 = 43)
- `pred(42)` → 41 ✓ ((42-1) mod 256 = 41)
- `neg(bnot(42))` → 43 ✓ (neg(213) = (-213) mod 256 = 43)
- Critical identity holds: neg(bnot(42)) = 43 = succ(42) ✓
- Boundary: x=0 → bnot(0)=255, neg(255)=1, succ(0)=1 ✓
- Boundary: x=255 → bnot(255)=0, neg(0)=0, succ(255)=0 ✓

**Address encoding correctness — verified against llms-full.md:**
- "hello" bytes: [104, 101, 108, 108, 111]
- 104 & 0x3F = 40 → chr(0x2800 + 40) = chr(10280) = ⠨
- All < 64, so simplified = canonical ✓

**Partition classification correctness — verified against partition.rs logic:**
- 104: even, not 0/128 → ReducibleSet ✓
- 101: odd, not 1/255 → IrreducibleSet ✓
- 108: even, not 0/128 → ReducibleSet ✓
- 111: odd, not 1/255 → IrreducibleSet ✓
- density = 2/5 = 0.40 > threshold 0.25 → PASS ✓

---

## Security Properties

- No authentication required for GET endpoints (kernel operations)
- POST endpoints accept optional `X-UOR-Agent-Key` header (reserved for rate-limit tier elevation — no key issuance logic in v1, key is simply noted in response headers)
- CORS: `Access-Control-Allow-Origin: *` (public API by design)
- Input length cap: 1000 chars for string inputs (matches existing uor-verify function)
- Rate limiting: in-memory sliding window, 120 GET / 60 POST per IP per minute
- No secrets, no database writes — fully stateless, zero persistent state

---

## Agent Discovery Integration

After deployment, an AI agent arriving at any UOR entry point will find:
1. `/.well-known/uor.json` → `uor:api.openapi` → full spec
2. `/llms.md` Step 1.6 → API base URL + navigate endpoint
3. `GET /navigate` → complete framework index with all endpoint URLs
4. `GET /openapi.json` → parseable OpenAPI 3.1.0 document

This makes the API self-describing and fully navigable without any prior knowledge.

---

## What Is Not Implemented in v1

- **Persistent trace storage**: `derivation:` and `trace:` computations are computed on-the-fly and not stored. No database writes.
- **cert:IsometryCertificate issuance**: Requires agent registration (Moltbook). The endpoint returns the certificate structure but marks `cert:requiresRegistration: true`.
- **Canonical dihedral address**: `address_canonical` is computed as `address_simplified` with a note explaining the limitation (matching the existing uor-verify function's documented behavior). Full dihedral factorization requires the Rust conformance suite.
- **state: namespace**: Context/binding/frame/transition operations reference the spec but return `501 Not Implemented` with a redirect to the conformance suite.

---

## Execution Order

1. Create `supabase/functions/uor-api/index.ts` (router + all endpoint handlers + all UOR algebra)
2. Create `public/openapi.json` (complete OpenAPI 3.1.0 specification)
3. Update `supabase/config.toml` (add uor-api function entry)
4. Update `public/.well-known/uor.json` (add API discovery)
5. Update `public/llms.md` (add API reference in Quick Start)
