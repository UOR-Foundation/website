

# UOR Topic Anchoring Card — Automatic Classification and Framework Grounding

## What This Builds

A new **UOR Anchoring Card** component that appears above every article, immediately after the ProvenanceBanner. When a user searches any term, the system automatically:

1. **Classifies the topic** into a precise domain and sub-category using the existing `classifyQueryDomain()` on the backend and `detectDomain()` on the frontend
2. **Maps it to UOR framework coordinates** — showing the OS taxonomy category (RESOLVE, IDENTITY, COMPUTE, etc.), the knowledge domain, and the coherence engine's novelty/depth signals
3. **Displays this as a compact, beautifully designed anchoring card** that serves as a "guide before exploration"

The card answers: *"What kind of knowledge is this, how does UOR anchor it, and what should you know before diving in?"*

## Visual Design

```text
┌─────────────────────────────────────────────────────────┐
│  ⚛️ Physics · Quantum Mechanics                        │
│                                                         │
│  UOR Domain    Physics                                  │
│  Category      RESOLVE → Query resolution               │
│  Anchoring     Content-addressed via R₈ ring arithmetic │
│  Depth         ██████░░░░ 3 prior explorations          │
│  Novelty       72% — Familiar territory                 │
│                                                         │
│  ▸ How UOR anchors this topic                           │
└─────────────────────────────────────────────────────────┘
```

Expandable section shows: *"This topic is content-addressed through UOR's canonical identity system. The search term is decomposed into its prime factorization within R₈, producing a unique cryptographic address. Sources are dynamically rebalanced toward physics-authoritative repositories (arXiv, Nature, NASA)."*

## Technical Approach

### 1. New Component: `UorAnchoringCard.tsx`

A new component in `src/modules/oracle/components/` that receives:
- `queryDomain` — from the edge function's classifier (already emitted in SSE)
- `keyword` — the search term
- `noveltyScore` / `noveltyLabel` — from the coherence engine (already computed client-side)
- `domainDepth` — from the coherence engine
- `sessionCoherence` — from the coherence engine

Renders a compact card with:
- Domain icon + label (reusing `DOMAIN_LABELS` from ProvenanceBanner, extended with sub-categories)
- OS taxonomy mapping (from `os-taxonomy.ts` — maps to the RESOLVE category for search/oracle)
- A mini progress bar for domain depth
- Novelty percentage badge
- Expandable "How UOR anchors this topic" section with a 2-3 sentence human-readable explanation of how content-addressing works for this specific domain

### 2. Extend `ProvenanceMeta` in `stream-knowledge.ts`

Add an optional `domainSubcategory` field. The edge function will emit a more precise sub-label (e.g., "Quantum Mechanics" within "Physics") derived from the keyword pattern match. This gives finer granularity than just the top-level domain.

### 3. Emit Sub-Category from Edge Function

In `uor-knowledge/index.ts`, extend `classifyQueryDomain()` to also return a `subcategory` string. This uses the same regex infrastructure but picks a more specific label based on which keyword pattern matched (e.g., if "quantum" matched within physics, subcategory = "Quantum Mechanics").

### 4. Wire into `ContextualArticleView.tsx`

Add the `UorAnchoringCard` between the ProvenanceBanner and the Context Banner. Pass through the provenance data (queryDomain, subcategory) and coherence data (novelty, depth).

### 5. Wire Coherence Data into `HumanContentView.tsx`

The coherence engine already runs client-side. Pass `noveltyScore`, `domainDepth`, and `sessionCoherence` from `ResolvePage.tsx` through `HumanContentView` into `ContextualArticleView` and then into `UorAnchoringCard`.

## Files Modified

| File | Change |
|------|--------|
| `src/modules/oracle/components/UorAnchoringCard.tsx` | **New** — The anchoring card component |
| `src/modules/oracle/components/ContextualArticleView.tsx` | Add UorAnchoringCard between ProvenanceBanner and Context Banner, accept new props |
| `src/modules/oracle/components/HumanContentView.tsx` | Pass coherence/novelty data through to ContextualArticleView |
| `src/modules/oracle/lib/stream-knowledge.ts` | Extend `ProvenanceMeta` with `domainSubcategory` |
| `supabase/functions/uor-knowledge/index.ts` | Extend classifier to emit `domainSubcategory` in SSE |
| `src/modules/oracle/pages/ResolvePage.tsx` | Pass coherence state (novelty, depth) to HumanContentView |

## Design Details

- Glass-effect card with subtle border, matching the existing ProvenanceBanner aesthetic
- Domain emoji + bold label as the card header
- 5 compact key-value rows using muted foreground text
- Expandable section with a smooth `framer-motion` animation
- Dark theme compatible, no new dependencies

