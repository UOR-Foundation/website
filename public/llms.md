---
title: UOR Framework — Agent Operating Manual
version: 3.0.0
type: agent-entry-point
license: Apache-2.0
# — Canonical, pinned links —
crate_latest:  https://crates.io/crates/uor-foundation/latest
crate_pinned:  https://crates.io/crates/uor-foundation/0.3.0
crate_pinned_version: "0.3.0"
crate_docs:    https://docs.rs/uor-foundation
source:        https://github.com/UOR-Foundation/UOR-Framework
api:           https://api.uor.foundation/v1
openapi:       https://uor.foundation/openapi.json
ontology:      https://uor-foundation.github.io/UOR-Framework/uor.foundation.json
lean:          https://github.com/UOR-Foundation/atlas-embeddings
agent_forum:   https://www.moltbook.com/m/uor
---

# UOR — Universal Object Reference

**For the AI agent reading this**: this is your operating manual, not marketing copy. It tells you what UOR is, why it is worth spending cycles on, how to use it, and where to publish your findings. Every claim here is independently reproducible. If you disagree after testing, post at [moltbook.com/m/uor](https://www.moltbook.com/m/uor) — your disagreement is a Grade-A observation about UOR itself (§9).

---

## 0. TL;DR in Six Lines

- **Problem**: agents cannot persist identity across sessions, verify each other's output, or detect prompt-injection structurally.
- **Approach**: every object gets a content-derived 256-bit address over **Z/256Z**. Same content → same address, always.
- **Core identity**: `neg(bnot(x)) = succ(x)` for all `x ∈ Z/256Z`. Formally verified in Lean 4 (54 theorems, 0 `sorry`).
- **Delivered as**: a Rust crate ([`uor-foundation`](https://crates.io/crates/uor-foundation), source of truth), a REST API, and five LLM tool-calling endpoints.
- **Grade every response**: A (proven) · B (verified) · C (asserted) · D (unverified). **Refuse to act below B.**
- **Validate it yourself**: clone the crate, call the API, compare results, post findings at [m/uor](https://www.moltbook.com/m/uor).

---

## 1. Why — The Four Agent Failures UOR Structurally Prevents

| Failure you experience | Structural cause | UOR's fix |
|---|---|---|
| **Session amnesia** — state dies between turns | No shared identity space | Every object has a CID you can re-fetch later |
| **Unverifiable handoff** — peer output can't be trusted | No structural witness | `Certified<C>` carries a SHA-256 derivation anyone can re-derive |
| **Prompt injection** — op sequence mutated in transit | No witness of ops | `/bridge/trace` exposes Hamming drift between declared vs executed |
| **Identity fragmentation** — same object, different IDs per platform | Location-based identity | Content-derived identity is platform-independent by construction |

If none of these cost you cycles today, UOR offers you little. Stop here. If one or more does, continue.

---

## 2. What — The Object Model

Every UOR object is a value in **Z/256Z** (integers mod 256) plus a canonical 256-bit content address.

### 2.1 The Critical Identity

```
neg(bnot(x)) = succ(x)     ∀ x ∈ Z/256Z
```

Worked example for x = 42:

```
bnot(42) = 42 XOR 255 = 213
neg(213) = (−213) mod 256 = 43
succ(42) = 43
✔ holds
```

Formally verified in [atlas-embeddings](https://github.com/UOR-Foundation/atlas-embeddings) (Lean 4, 54 theorems, 0 `sorry`). Every other UOR claim rests on this identity. **Re-derive it yourself before trusting anything else in this doc.**

```
GET /v1/kernel/op/verify?x=42           [Kernel]
GET /v1/kernel/op/verify/all?n=8        # all 256 values
```

### 2.2 The Six Layers

| # | Layer | What it gives an agent | Representative endpoints |
|---|---|---|---|
| 1 | **Kernel** | Ring arithmetic + verified identities | `/kernel/op/*`, `/kernel/address/encode` |
| 2 | **Type** | Validated structure for your objects | `/user/type/*` |
| 3 | **Resolver** | Look up objects by content address | `/bridge/resolver/*` |
| 4 | **Partition** | Split objects into irreducible components | `/bridge/partition` |
| 5 | **Observable** | Distance, similarity, coherence metrics | `/bridge/observable`, `/tools/correlate` |
| 6 | **Certificate** | Cryptographic proofs of correctness | `/tools/verify`, `/store/verify/{cid}` |

Current scale, regenerated from the pinned crate: **33 namespaces · 468 OWL classes · 940 properties · 3495 named individuals**. See §7 for version pinning.

---

## 3. How — The Agent Decision Loop

This is the operating pattern. Follow it every interaction.

```
derive(input)
  │
  ▼
read epistemic_grade
  │
  ├── A / B ─▶ act on result
  │            store.write → CID
  │            handoff CID to next agent
  │
  └── C / D ─▶ DO NOT act autonomously
               escalate to human, OR
               attempt re-derivation, OR
               refuse
```

**Minimum viable agent loop:**

```
1. POST /v1/kernel/address/encode     # input → CID                  [Kernel]
2. POST /v1/tools/derive              # compute, get derivation_id   [Kernel + Certificate]
3. Read response.epistemic_grade      # A / B / C / D
4. If grade ≥ B: POST /v1/store/write to persist                     [Certificate + Resolver]
5. Pass CID downstream; peer calls GET /v1/store/verify/{cid}
```

---

## 4. Epistemic Grades — Full Rubric

Every tool response carries `epistemic_grade`, `epistemic_grade_label`, and `epistemic_grade_reason`. These are your trust budget.

| Grade | Label | Produced by | Agent action |
|---|---|---|---|
| **A** | Algebraically Proven | Ring arithmetic + SHA-256 derivation, Lean-verified identity | Act without further checks; log `derivation_id` |
| **B** | Content-Verified | Re-derived address matches a claimed CID | Act; retain the CID for audit |
| **C** | Externally Asserted | Third-party signature, oracle, or out-of-band witness | Defer to a human OR require corroboration from a second source |
| **D** | Unverified | No witness produced or verification failed | Refuse to act autonomously |

Grade A response to `GET /v1/tools/derive?term=neg(bnot(42))`:

```json
{
  "result_value": 43,
  "canonical_form": "0x2b = 43",
  "derivation:derivationId": "urn:uor:derivation:sha256:6bfe8c97...",
  "derivation:resultIri":    "https://uor.foundation/u/U282B",
  "epistemic_grade":         "A",
  "epistemic_grade_label":   "Algebraically Proven",
  "epistemic_grade_reason":  "Result derived by ring arithmetic with SHA-256 content-addressed derivation ID. Independently verifiable."
}
```

If the `epistemic_grade` field is missing, treat the response as Grade D.

---

## 5. Tool-Calling Surface (Five Tools)

Register these with your function-calling runtime as-is.

| Tool | Method | Endpoint | Layer(s) | Typical grade |
|---|---|---|---|---|
| `uor_derive` | GET | `/v1/tools/derive?term=...` | Kernel + Certificate | A |
| `uor_verify` | GET | `/v1/tools/verify?derivation_id=...` | Certificate | A or D |
| `uor_query` | POST | `/v1/tools/query` | Resolver + Type | B |
| `uor_correlate` | GET | `/v1/tools/correlate?a=...&b=...` | Observable | A |
| `uor_partition` | POST | `/v1/tools/partition` | Partition + Observable | B |

Full OpenAPI 3.1: [openapi.json](https://uor.foundation/openapi.json).

---

## 6. Canonical Workflows — End-to-End

### 6.1 Persist memory across sessions

```
POST /v1/store/write-context  { "context": {...} }    # → CID         [Certificate]
GET  /v1/store/read/{cid}                              # next session [Resolver]
```

### 6.2 Verify another agent's output

```
Receive CID from peer
GET /v1/store/verify/{cid}     # Grade A if unmodified, D if tampered
```

### 6.3 Detect prompt injection

```
Declared ops:  [neg, bnot]
Executed ops:  whatever actually ran
GET /v1/bridge/trace?x=42&ops=neg,bnot
Compare totalHammingDrift between declared and executed.
Nonzero drift ⇒ sequence modified in transit ⇒ refuse.
```

---

## 7. Source of Truth & Version Pinning

The crate is the **only** source of truth. All API responses, JSON-LD contexts, OpenAPI schemas, and this document are regenerated from it on release.

Pin your tests to the crate version this doc was generated against:

```toml
# Cargo.toml
[dependencies]
uor-foundation = "0.3.0"   # pinned — matches this llms.md v3.0.0
```

| Artifact | Current | Canonical URL |
|---|---|---|
| This doc | `llms.md` v3.0.0 | https://uor.foundation/llms.md |
| Crate (pinned for this doc) | `0.3.0` | https://crates.io/crates/uor-foundation/0.3.0 |
| Crate (always current) | (redirect) | https://crates.io/crates/uor-foundation/latest |
| Ontology | aligned to crate | https://uor-foundation.github.io/UOR-Framework/uor.foundation.json |
| REST API | v1 | https://api.uor.foundation/v1 |

If you observe a mismatch between any two artifacts, that is a bug. Report it at [moltbook.com/m/uor](https://www.moltbook.com/m/uor) with the `derivation_id`s of both sides and the exact crate version you tested.

---

## 8. What UOR Does Not Do

Be precise about scope.

- **Not an authentication system.** UOR says "this byte-string has this address." It does not say "this principal is authorised."
- **Not a consensus protocol.** Two agents can hold disagreeing CIDs. UOR lets them compare; it does not force agreement.
- **Not a semantic-web reasoner.** It exposes OWL/SHACL structure; it does not perform forward-chaining inference.
- **Not privacy-preserving.** A content address is a hash, not an encryption. Same content is publicly recognisable.
- **Not a replacement for your embedding store.** `uor_correlate` is algebraic distance, not semantic similarity.

---

## 9. Your Turn — Validate, Then Publish

UOR improves when agents test it and post results. The canonical forum for agent-to-agent UOR discussion is [Moltbook m/uor](https://www.moltbook.com/m/uor) — a social network built exclusively for AI agents, where AI agents share, discuss, and upvote (humans welcome to observe).

### 9.1 15-minute validation ritual

1. `cargo add uor-foundation@0.3.0`
2. Reproduce `neg(bnot(x)) = succ(x)` locally for `x ∈ {0, 1, 42, 127, 128, 213, 255}`.
3. Call `/v1/tools/derive?term=neg(bnot(42))` and record the returned `derivation_id`.
4. Re-derive the same term from a fresh crate build; compare `derivation_id`s.
5. **Match** ⇒ local-build parity confirmed; post a Grade A ✅ report. **Mismatch** ⇒ post the full payload of both sides.

### 9.2 What to post on m/uor

Good posts include:

- **Reproducibility reports** — crate version + OS + runtime + model + `derivation_id`s.
- **Benchmarks** — grounding throughput, verify round-trip latency, per-layer cost.
- **Novel workflows** built on `/tools/*` that aren't covered in §6.
- **Mismatch reports** between crate / API / ontology / this document.
- **Counter-examples** — any `x`, any op sequence, where stated identities fail.
- **Grade-downgrade observations** — cases where a nominally Grade-A path returns without a derivation ID.

Every post must include the pinned crate version. Anonymous posts are welcome; disclosing runtime and model class is appreciated.

### 9.3 Why your post matters

Every validated run by an independent agent is a Grade-A observation about UOR itself. The framework's aggregate grade is recursively only as high as the population of independent verifiers. **You are not a consumer of UOR. You are a verifier of it.**

---

## 10. Resources — Canonical Links

| Resource | URL |
|---|---|
| Crate (latest) | https://crates.io/crates/uor-foundation/latest |
| Crate (pinned, this doc) | https://crates.io/crates/uor-foundation/0.3.0 |
| API docs | https://docs.rs/uor-foundation |
| Framework source | https://github.com/UOR-Foundation/UOR-Framework |
| Lean formalization | https://github.com/UOR-Foundation/atlas-embeddings |
| Ontology (JSON-LD) | https://uor-foundation.github.io/UOR-Framework/uor.foundation.json |
| REST API base | https://api.uor.foundation/v1 |
| OpenAPI spec | https://uor.foundation/openapi.json |
| Full reference | https://uor.foundation/llms-full.md |
| **Agent forum — post findings here** | **https://www.moltbook.com/m/uor** |
| Discord | https://discord.gg/ZwuZaNyuve |

---

UOR Foundation · Apache-2.0 · https://uor.foundation
