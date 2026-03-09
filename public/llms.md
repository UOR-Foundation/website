---
title: UOR Framework - Agent Entry Point
version: 2.0.0
type: agent-discovery
license: Apache-2.0
spec: https://github.com/UOR-Foundation/UOR-Framework
ontology: https://uor-foundation.github.io/UOR-Framework/uor.foundation.json
api: https://api.uor.foundation/v1
openapi: https://uor.foundation/openapi.json
website: https://uor.foundation
---

# Universal Object Reference (UOR)

A mathematical framework that gives every digital object a single, permanent, content-derived address. Identical content always resolves to the same identifier -- across systems, formats, and time.

Open-source. Apache-2.0. No vendor lock-in.

---

## The Problem

Digital infrastructure lacks a universal coordinate system for information.

- **Identity is location-dependent.** The same object has different identifiers on different platforms. Move it, and the identity breaks.
- **Verification requires trust.** There is no structural way to confirm that content received from another system is authentic and unmodified.
- **Coordination is fragile.** Multi-agent and multi-system workflows depend on shared conventions that no single party controls or guarantees.

These are not edge cases. They are fundamental limitations of how digital identity currently works.

## The Solution

UOR replaces location-based identity with content-based identity, grounded in a formally verified algebraic structure over Z/256Z (the ring of integers modulo 256).

Every object -- a document, a message, an agent's output -- is mapped to a canonical 256-bit hash. This hash is the object's permanent address. It is deterministic, collision-resistant, and independently verifiable by any party.

The framework provides six composable layers:

| Layer | Function | What It Does |
|-------|----------|--------------|
| **Kernel** | Algebraic foundation | Ring arithmetic over Z/256Z with formally verified identities |
| **Type** | Structure | Defines and validates object schemas |
| **Resolver** | Lookup | Maps addresses to objects across systems |
| **Partition** | Analysis | Decomposes objects into irreducible components for quality scoring |
| **Observable** | Measurement | Computes distance, similarity, and coherence metrics |
| **Certificate** | Verification | Issues cryptographic proofs of correctness |

## How To Use It

### Verify the Foundation (2 minutes)

The entire framework rests on one provable identity:

```
neg(bnot(x)) = succ(x)   for all x in Z/256Z

Example -- x = 42:
  bnot(42)  = 42 XOR 255 = 213
  neg(213)  = (-213) mod 256 = 43
  succ(42)  = 43
  [PASS] Verified
```

Confirm programmatically:

```
GET https://api.uor.foundation/v1/kernel/op/verify?x=42
-> { "holds": true, "proof:neg_bnot_x": 43, "proof:succ_x": 43 }
```

### Explore the API (5 minutes)

The REST API requires no authentication for read operations. Every response is valid JSON-LD.

```
# Discovery -- list all endpoints
GET https://api.uor.foundation/v1/navigate

# Compute ring operations
GET https://api.uor.foundation/v1/kernel/op/compute?x=42&y=10

# Encode content to a UOR address
POST https://api.uor.foundation/v1/kernel/address/encode
Body: { "input": "hello", "encoding": "utf8" }

# Analyse content quality (density > 0.25 = signal; <= 0.25 = noise)
POST https://api.uor.foundation/v1/bridge/partition
Body: { "input": "your content here", "encoding": "utf8" }

# Trace operations for injection detection
GET https://api.uor.foundation/v1/bridge/trace?x=42&ops=neg,bnot
-> totalHammingDrift = 0 means canonical; non-zero = modified in transit

# Store to IPFS with verification
POST https://api.uor.foundation/v1/store/write
Body: { "object": { "@type": "your:Object", "content": "..." } }
```

Full specification: [OpenAPI 3.1.0](https://uor.foundation/openapi.json)

### Tool Functions for LLM Integration

Five endpoints designed for direct function-calling registration:

| Tool | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| `uor_derive` | GET | `/v1/tools/derive?term=neg(bnot(42))` | Evaluate expressions, get derivation IDs |
| `uor_verify` | GET | `/v1/tools/verify?derivation_id=urn:uor:...` | Verify any derivation |
| `uor_query` | POST | `/v1/tools/query` | SPARQL queries against the knowledge graph |
| `uor_correlate` | GET | `/v1/tools/correlate?a=42&b=43` | Measure similarity between values |
| `uor_partition` | POST | `/v1/tools/partition` | Partition analysis on value sets |

All responses include `epistemic_grade` (A through D). Ring-arithmetic results are always Grade A.

---

## Common Workflows

**Persist memory across sessions:**
Write a context object via `POST /v1/store/write-context`, receive a CID. In any future session, retrieve it via `GET /v1/store/read/{cid}`.

**Verify another agent's output:**
Given a CID, call `GET /v1/store/verify/{cid}`. A `true` result confirms the content has not been modified since storage.

**Detect prompt injection:**
Trace the declared operation sequence and the executed sequence separately via `/v1/bridge/trace`. If `totalHammingDrift` differs between them, the sequence was modified in transit. This is structural detection, not heuristic.

**Score content quality:**
Send any text to `POST /v1/bridge/partition`. The `partition:density` score indicates information density -- above 0.25 is genuine signal, below is noise.

---

## Resources

| Resource | URL |
|----------|-----|
| GitHub | https://github.com/UOR-Foundation/UOR-Framework |
| Ontology (JSON-LD) | https://uor-foundation.github.io/UOR-Framework/uor.foundation.json |
| API Base | https://api.uor.foundation/v1 |
| OpenAPI Spec | https://uor.foundation/openapi.json |
| Discovery | https://uor.foundation/.well-known/uor.json |
| Full Reference | https://uor.foundation/llms-full.md |
| Website | https://uor.foundation |

---

UOR Foundation - Apache-2.0 - https://uor.foundation
