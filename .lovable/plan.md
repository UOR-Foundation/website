

# UOR Proof-Based Inference Load Limitation

## Summary

This plan implements a system where every AI inference result is assigned a UOR proof (a compact, verifiable fingerprint). Once a result has been proven, any future request for the same computation is served from the proof cache instead of re-running the expensive model. This is structural information compression: expensive AI runs once, its output is reduced to a deterministic coordinate in a bounded space, and all subsequent lookups verify against that coordinate rather than recomputing.

## How It Works (Plain Language)

1. **First time an AI question is asked**: The expensive model runs, produces an answer, and the system generates a UOR proof -- a unique fingerprint for that exact input-output pair.

2. **The proof is stored**: The fingerprint, the answer, and its trust grade are saved in a proof cache (a database table).

3. **Next time the same question is asked**: Instead of running the model again, the system finds the stored proof, verifies it still matches (a fast check), and returns the cached answer with its original trust score.

4. **The result**: Models run once per unique question. Verification is far cheaper than re-computation. Load drops dramatically for repeated or similar queries.

## What Gets Built

### 1. New Database Table: `uor_inference_proofs`

A table to store proven inference results. Each row links a request fingerprint to its verified output.

Columns:
- `id` (UUID, auto-generated)
- `proof_id` (text, unique) -- the UOR proof URN (e.g., `urn:uor:proof:sha256:...`)
- `input_hash` (text) -- SHA-256 of the canonical input (tool name + arguments)
- `output_hash` (text) -- SHA-256 of the canonical output
- `tool_name` (text) -- which MCP tool produced this (e.g., `uor_derive`)
- `input_canonical` (text) -- the canonical input for cache lookup
- `output_cached` (text) -- the full JSON output to return on cache hit
- `epistemic_grade` (text) -- the trust grade (A/B/C/D)
- `hit_count` (integer, default 0) -- how many times this proof has been served from cache
- `created_at` (timestamptz)
- `last_hit_at` (timestamptz, nullable)

Indexes on `input_hash` for fast lookup.

### 2. Proof Generation Logic (in `uor-mcp/index.ts`)

After every successful tool call, the system:
1. Canonicalizes the input (tool name + sorted arguments) into a deterministic string
2. Hashes it with SHA-256 to produce `input_hash`
3. Hashes the output to produce `output_hash`
4. Combines them into a `proof_id`: `urn:uor:proof:sha256:{hash(input_hash + output_hash)}`
5. Stores the proof in `uor_inference_proofs`

### 3. Cache-First Lookup (in `uor-mcp/index.ts`)

Before running any tool, the system:
1. Canonicalizes the incoming request
2. Computes `input_hash`
3. Looks up `uor_inference_proofs` by `input_hash`
4. If found: increments `hit_count`, returns cached output with the original trust score and a `proof_source: "cached"` flag
5. If not found: runs the tool normally, then stores the proof

### 4. Updated Trust Score Block

The trust report gains a new field:
- **Proof Status**: `Proven (served from cache)` or `Fresh computation (proof stored)`
- This tells the reader whether the answer was recomputed or served from a verified proof

### 5. Updated `epistemics.ts`

Each epistemic builder function gets a `cached` flag. When true, the trust summary explains: "This answer was previously computed and proven. The stored proof was verified against its original fingerprint. No recomputation was needed."

### 6. Rate Limit Integration

The existing rate limiter benefits automatically: cached responses skip the expensive `callApi()` step entirely, so rate-limited users get faster responses for previously-proven queries.

## Architecture

```text
  Incoming MCP Request
         |
         v
  Canonicalize Input
  (tool + args -> SHA-256)
         |
         v
  Lookup input_hash in
  uor_inference_proofs
        / \
       /   \
    HIT     MISS
     |        |
     v        v
  Verify    Run Tool
  output    (callApi)
  hash        |
     |        v
     v     Hash Output
  Return   Store Proof
  cached   Return fresh
  result   result
```

## Files Changed

1. **New migration**: Create `uor_inference_proofs` table with RLS (public read, service-role write)
2. **`supabase/functions/uor-mcp/index.ts`**: Add proof cache lookup before `runTool`, proof storage after successful tool execution, and the `proof_source` field in responses
3. **`supabase/functions/uor-mcp/epistemics.ts`**: Add `cached` parameter to `formatEpistemicBlock` and all builder functions; update trust summaries for cached results
4. **`src/modules/mcp/pages/TrustScorePreview.tsx`**: Add a "Proof Status" row to the trust score card and show an example of a cached proof
5. **`src/modules/mcp/types.ts`**: Add proof-related types

## Technical Details

### Canonical Input Formula
```
canonical_input = JSON.stringify({ tool: name, args: sortedArgs })
input_hash = SHA-256(canonical_input)
```

### Proof ID Formula
```
proof_id = "urn:uor:proof:sha256:" + SHA-256(input_hash + "=" + output_hash)
```

### Cache Bypass
- Grade D results (unverified) are NOT cached, since they may change
- Only Grade A and B results are stored as proofs
- SPARQL queries (Grade B) are cached with a 1-hour TTL consideration via `last_hit_at`

### RLS Policy
- `SELECT`: allowed for all (proofs are public, verifiable records)
- `INSERT/UPDATE`: service role only (only the MCP server writes proofs)

### What This Achieves
- Expensive AI model calls happen once per unique input
- Repeated queries are served from compact, verified proofs
- Every cached response carries the same trust grade as the original computation
- The proof is independently verifiable: anyone can recompute the SHA-256 to confirm the cached result matches
- Load scales with unique queries, not total queries

