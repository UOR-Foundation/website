

# Enforce Topic-Relevant Media Selection via UOR-Typed Coherence Filtering

## Problem
When searching "Formula 1", the system fetched images from the Wikipedia article's image list, which includes unrelated artifacts (e.g., Egyptian writing boards). The relevance scoring is weak — basic word overlap — and there's no hard minimum threshold, so irrelevant images with score 0 still get included via the fallback path.

## Root Cause
Two issues in `supabase/functions/uor-knowledge/index.ts`:

1. **Weak relevance scoring**: Only checks if search term words appear in the filename/caption. An image of an ancient Egyptian tablet linked from the Formula 1 Wikipedia page scores 0 but still gets included.
2. **No minimum relevance gate**: The `distributeMediaAcrossSections` function in `InlineMedia.tsx` has a fallback that places images even when semantic score is 0.

## Solution: Three-Layer Media Coherence Filter

### Layer 1 — Backend: Strict relevance gate in `uor-knowledge/index.ts`

**In `fetchWikimediaImages`**:
- Add a **minimum relevance threshold of 10** — images that score below this are discarded entirely
- Add **negative relevance penalties** for obviously off-topic patterns: if the caption/filename contains none of the search term words, score stays at 0 and the image is dropped
- Add a **topic-type classifier** using the search term: extract the domain (sport, science, person, place, etc.) and penalize images whose captions indicate a different domain (e.g., "ancient", "archaeological" for a motorsport query)

**In `fetchMultiSourceMedia`**:
- After sorting by relevance, enforce a **hard floor**: only keep images with `relevance >= 10`
- If this leaves fewer than 2 images, use the LLM to generate a relevance-check prompt: ask the AI model (via a cheap, fast call) to score each candidate image caption against the topic, keeping only those rated relevant
- Add a `MediaImage.coherenceScore` field (0.0-1.0) that travels with the image through the pipeline, derived from the relevance score normalized to [0,1]

### Layer 2 — Frontend: Coherence-gated rendering in `InlineMedia.tsx`

**In `distributeMediaAcrossSections`**:
- Remove the fallback that places images with score 0 — if no images have meaningful relevance, show **no images** rather than wrong ones
- Add a `coherenceScore` check: only render images where `coherenceScore >= 0.3`
- Update `semanticRelevance` to also check against the article title/topic (passed as a new parameter), not just the section text

### Layer 3 — Type enforcement via `MediaImage` interface

**In `stream-knowledge.ts`**:
- Add `coherenceScore?: number` and `topicDomain?: string` to the `MediaImage` type
- This ensures the coherence metadata flows through the entire pipeline from edge function to renderer

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/uor-knowledge/index.ts` | Hard relevance floor (>=10), topic-domain penalties, LLM fallback relevance check, coherenceScore field |
| `src/modules/oracle/lib/stream-knowledge.ts` | Add `coherenceScore` and `topicDomain` to `MediaImage` type |
| `src/modules/oracle/components/InlineMedia.tsx` | Remove zero-score fallback, add coherenceScore gate, pass topic to `semanticRelevance` |

## Priority
1. Backend relevance gate (highest impact — stops bad images at source)
2. Type updates (structural)
3. Frontend coherence gate (defense-in-depth)

