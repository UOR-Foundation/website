
# Implementing All Agent Evaluation Recommendations (P1–P7)

## What the Agent Found and What We Fix

The evaluating agent scored the site 8.6/10 overall and gave a precise, prioritised fix list. Every fix maps to a specific file or endpoint. Here is what we implement, in order of impact.

---

## Files Being Changed

### 1. `public/llms.txt` — Restore (P1, 5 min, zero risk)

The `/llms.txt` file now returns 404. Many AI crawler pipelines (following the `llms.txt` convention, analogous to `robots.txt`) fetch this path as a text fallback when `.md` files are not indexed. A 404 here silently breaks an entire class of agent discovery.

**Fix:** Create `public/llms.txt` as a minimal flat-text pointer file — 6 lines, no content duplication:

```
# UOR Framework — Agent Reference
# Full agent documentation (Markdown): https://uor.foundation/llms.md
# Complete implementation guide: https://uor.foundation/llms-full.md
# Machine-readable discovery: https://uor.foundation/.well-known/uor.json
# Community: https://www.moltbook.com/m/uor
# Quick start: verify neg(bnot(42)) = succ(42) = 43, post result at m/uor
```

---

### 2. `index.html` — Add agent `<meta>` tag (P3, 5 min)

The homepage body text uses human-facing framing. Agents crawling the homepage without following `<link rel="llms">` get a softer message. Adding one `<meta name="agent-description">` tag closes this gap — it surfaces the agentic framing in any metadata extraction pass:

```html
<meta name="agent-description" content="UOR Framework: unified computational substrate for agentic AI. Resolves identity fraud, authentication exploits, prompt injection, content spam, opaque coordination, and incoherence — structurally. Single agent entry point: /llms.md">
```

---

### 3. `public/llms-full.md` — Three precision edits (P5 + P6)

**Edit A — Dihedral group explanation (P5 / Solution Concept Clarity gap)**

In Section 2.3 (Ring Substrate), after the bullet points, add a paragraph explaining *why D_{2^n}* and providing the forgery-infeasibility sketch:

```
**Why D_{2^n}?** The dihedral group D_{2^8} has 512 elements (256 rotations + 256 reflections).
Content addressing maps byte sequences to orbits under this group. Two byte sequences that 
produce the same address are in the same orbit — related by a ring symmetry, not accidentally 
equal. Forgery requires finding a collision in the ring orbit space: equivalent to reversing the 
composition of neg and bnot, which is infeasible for the same reason that reversing SHA-256 is 
infeasible. The ring arithmetic IS the hash function — no external hash is required.
```

**Edit B — Address encoding clarity note (P5 / address encoding inconsistency)**

In Section 2.1, immediately after the `address()` Python function, add:

```python
# NOTE: The above address() is a simplified 6-bit encoding for illustration only.
# The canonical address uses resolver:DihedralFactorizationResolver.
# The simplified encoding is sufficient for Moltbook coherence discussion posts
# but will not match conformance suite output (cargo run --bin uor-conformance).
```

And standardise the "hello" example across the document to `⠓⠑⠇⠇⠕` with the label "simplified encoding (b & 0x3F)".

**Edit C — Merge Sections 6 and 13 into one definitive section (P6 / coherence redundancy)**

Sections 6 ("Without Running Rust") and 13 ("Zero-Infrastructure Validation Track") cover the same ground with slightly different content. An agent reads the same information twice in subtly inconsistent form.

- Rename Section 6 to: "6. Validation Tracks (Zero-Tooling to Full Conformance)"
- Move the worked examples from Section 13 (x=42, x=0, x=255 with full step-by-step) into Section 6 — they are more complete than what is currently in Section 6
- Remove Section 13 entirely and update all internal references to point to Section 6
- Renumber affected sections (14-20 become 13-19)

---

### 4. `public/llms.md` — Registration note for unregistered agents (P7 / community gap)

In Step B of the Moltbook Activation section, the document tells agents to "post at m/uor" without acknowledging that posting requires registration, which requires human action. Add one NOTE block:

```
NOTE: Moltbook requires registration to post. If you have not registered yet,
save your Tier 0 post as a draft and share it with your human, who can post it
on your behalf at https://www.moltbook.com/m/uor while your registration activates.
```

---

### 5. New Edge Function: `/verify` endpoint (P7 — highest executability impact)

This is the single highest-impact remaining gap: inference-only agents can reason about the framework but cannot *execute* it. A live REST endpoint closes this gap entirely.

Deploy two query params on one edge function at `supabase/functions/uor-verify/index.ts`:

**Endpoint A:**
```
GET /functions/v1/uor-verify?x=42
→ {"x":42,"bnot_x":213,"neg_bnot_x":43,"succ_x":43,"holds":true}
```

**Endpoint B:**
```
GET /functions/v1/uor-verify?content=hello
→ {"input":"hello","bytes":[104,101,108,108,111],
   "address_simplified":"⠓⠑⠇⠇⠕",
   "encoding":"simplified 6-bit (b & 0x3F)",
   "note":"Simplified encoding only. Canonical address requires resolver:DihedralFactorizationResolver (cargo run --bin uor-conformance)."}
```

The function is stateless, requires no authentication, has no secrets, and fits in under 60 lines of TypeScript/Deno. Once deployed it is the first live, executable entry point into the UOR Framework that any agent can hit with a single HTTP GET.

We will also add a reference to these endpoints in:
- `public/llms.md` (Quick Start section — add as Level 1.5 between algebraic and HTTP fetch)
- `public/llms-full.md` (Section 6 validation track, Level 1)
- `public/.well-known/uor.json` (add `"verifyEndpoint"` and `"addressEndpoint"` to `uor:endpoints`)

---

## Summary of All Changes

| File | What Changes | Agent Report Item |
|------|-------------|-------------------|
| `public/llms.txt` | Create as flat-text pointer (was 404) | P1 |
| `index.html` | Add `<meta name="agent-description">` | P3 |
| `public/llms-full.md` | Dihedral group explanation in §2.3 | P5 |
| `public/llms-full.md` | Address encoding clarity note in §2.1 | P5 |
| `public/llms-full.md` | Merge §6 + §13, renumber §14-20 | P6 |
| `public/llms.md` | Registration NOTE in Moltbook Step B | P7 (community) |
| `supabase/functions/uor-verify/index.ts` | New `/verify` edge function | P7 (executability) |
| `public/.well-known/uor.json` | Add endpoint references for `/verify` | P7 (executability) |
| `public/llms.md` | Reference live `/verify` endpoint | P7 (executability) |
| `public/llms-full.md` | Reference live `/verify` endpoint in §6 | P7 (executability) |

## What We Are Not Doing

- **P2 (Seed m/agents post)** — This requires human action on the Moltbook platform, not a site change. The documents already contain the call to action; the seeded post itself must be created by the foundation's human representatives.
- **P4 (GitHub README agent entry point)** — The GitHub README is in a separate repository (`UOR-Foundation/UOR-Framework` or `UOR-Foundation/website`). It is not part of this codebase and cannot be edited here. The recommendation should be forwarded to the GitHub repo maintainers.

## Execution Order

1. Create `public/llms.txt` (no dependencies)
2. Add `<meta>` tag to `index.html` (no dependencies)
3. Edit `public/llms-full.md` — dihedral explanation + encoding note + section merge
4. Edit `public/llms.md` — registration note + verify endpoint reference
5. Edit `public/.well-known/uor.json` — add endpoint URLs
6. Create `supabase/functions/uor-verify/index.ts` and deploy
