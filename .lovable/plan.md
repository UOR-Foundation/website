

## Dynamic Contextual Quotes for Immersive Mode

### What we're building

The immersive mode bottom bar currently shows a static "Universal Object Reference" label. We'll replace it with a rotating, personally curated quote system that draws from the user's search history, interaction patterns, and contextual signals to surface meaningful, attributed quotes. The system mixes resonant quotes (affirming strengths) with growth quotes (gently encouraging areas to develop), using UOR semantic categories to match quote themes to user context.

### Architecture

```text
┌──────────────────────────────────────┐
│  ImmersiveSearchView                 │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  ImmersiveQuote (new component)│  │
│  │  - Fetches user context        │  │
│  │  - Calls edge function         │  │
│  │  - Fades between quotes        │  │
│  └────────────────────────────────┘  │
│                                      │
│  Edge function: uor-oracle           │
│  (new "quote" mode)                  │
│  - Receives: recent searches,       │
│    time of day, interaction count    │
│  - Returns: {text, author, source,   │
│    resonanceType: "affirm"|"grow"}   │
└──────────────────────────────────────┘
```

### Design philosophy

Quotes are selected along two axes:
- **Resonance quotes** (~60%): Align with what the user is actively exploring. If they've been searching philosophy, they get Seneca. Yachts? They get a quote about craftsmanship or the sea.
- **Growth quotes** (~40%): Gently stretch into adjacent domains. A user deep in technical topics might receive a quote about patience, creativity, or perspective.

All quotes are real, attributed, and non-cheesy. The AI is instructed to draw from: literary authors, scientists, philosophers, practitioners, and domain experts. Never motivational poster material.

### Files to create/modify

| File | Change |
|---|---|
| `src/modules/oracle/components/ImmersiveQuote.tsx` | **New.** Standalone component that fetches a contextual quote on mount, caches it for 15 minutes in sessionStorage, and renders with a gentle fade-in. Shows author and source. Rotates every ~45 seconds if the user stays on the screen. |
| `src/modules/oracle/lib/quote-context.ts` | **New.** Gathers user context signals: recent search keywords (from `getRecentKeywords`), time of day, day of week, session count. Returns a compact context object for the edge function. |
| `supabase/functions/uor-oracle/index.ts` | **Modify.** Add a `"quote"` mode branch. When `mode === "quote"`, use a curated system prompt to generate 3 quotes (mix of resonance/growth), each with `{text, author, source, resonanceType}`. Non-streaming, fast response. Uses `latencyTier` to pick model (flash-lite is fine for quotes). |
| `src/modules/oracle/components/ImmersiveSearchView.tsx` | **Modify.** Replace the static bottom-left text with `<ImmersiveQuote />`. Style: italic serif, white/50 opacity, max-width ~60%, with author attribution in small caps. |

### Quote component behavior

- On mount: check `sessionStorage` for cached quotes (keyed by date + hour block)
- If no cache: call `uor-oracle` with `mode: "quote"` and the user context object
- Display first quote with a 1s fade-in
- Every 45s, crossfade to next quote in the batch
- If fetch fails, fall back to a small hardcoded set of timeless quotes (Borges, Feynman, Ada Lovelace)
- Quotes render as: `"Quote text here." — Author Name`

### Edge function prompt design

The system prompt instructs the model to:
1. Read the user's recent search topics and time context
2. Select 3 real, verifiable quotes from known authors
3. Tag each as `affirm` (resonates with current interests) or `grow` (adjacent virtue/perspective)
4. Never use generic motivational content
5. Prefer: working practitioners, literary voices, scientists, philosophers
6. Each quote must include the actual source (book, speech, interview)

### UOR anchoring

Each quote response includes a `uor:category` tag derived from the semantic domain of the quote's theme, ensuring it maps into the same category encoding used across the rendered internet experience. The quote's `resonanceType` is itself a UOR epistemic signal: `affirm` maps to coherence (constructive interference), `grow` maps to expansion (adjacent domain bridging).

### Visual treatment

- Font: Georgia/serif, italic, ~15px on desktop, ~14px on mobile
- Color: `text-white/50`, author in `text-white/35` small-caps
- Transition: 800ms opacity crossfade
- Position: Bottom-left of immersive view, replacing current static text
- Max width: 60% of viewport to avoid cramping

