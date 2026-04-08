

## Real-Time Rendered Internet — "Type and the World Materializes"

### Vision

Transform the current search-then-wait-then-render flow into a continuous, live-rendering experience where content materializes as the user types or speaks. The key insight: we already stream tokens — but the UX still feels like "submit → wait → render." The magic comes from eliminating every perceptual gap between intent and response.

### Current Architecture (What We Have)

```text
User types → [Enter] → loading spinner → edge function warms up (~500ms)
→ wiki SSE event → AI tokens stream → lens renders progressively
```

Three perceptual bottlenecks:
1. **Dead time after Enter**: ~500-800ms before first token while edge function boots + AI gateway responds
2. **No feedback during typing**: input is inert until submitted — no preview, no anticipation
3. **Content appears in a block swap**: empty state → skeleton → content (jarring transition)

### Proposed Architecture — Five Techniques

#### 1. Speculative Prefetch ("Predictive Warming")

**Concept**: After 600ms of typing pause, fire a lightweight Wikipedia REST API call (client-side, no edge function) to fetch the summary + thumbnail for the current input. This gives us structured data to render *before the user presses Enter*.

**File**: `src/modules/oracle/lib/speculative-prefetch.ts` (new)
- Debounced (600ms) Wikipedia summary fetch as user types
- Returns: title, thumbnail, extract, description — enough to render a preview card
- Cached in a Map so repeated queries are instant
- Cancelled on each keystroke via AbortController

**File**: `src/modules/oracle/components/LivePreviewCard.tsx` (new)
- A translucent, floating card that fades in below the search input showing:
  - Wikipedia thumbnail (if available)
  - Topic title + 1-line description
  - Subtle "Press Enter to explore" prompt
- Animated with `framer-motion` — slides up, fades in, dissolves when user continues typing
- On Enter, this card *morphs* into the full article container (shared layout animation) — no jarring page swap

**File**: `ResolvePage.tsx` — Wire debounced prefetch to input onChange, show LivePreviewCard

#### 2. Instant Skeleton Seeding from Wikipedia Extract

**Concept**: When the user presses Enter, we already have the Wikipedia extract from prefetch. Immediately render it as a "seed" article while the AI stream begins. As AI tokens arrive, they *replace* the seed content with smooth crossfade.

**File**: `ResolvePage.tsx` — In `handleKeywordResolve`:
- If prefetch cache has data for this keyword, use its `extract` as initial `uor:content`
- Set a `seedContent` flag so the lens renderer knows to animate the transition
- When first AI delta arrives, begin replacing seed content

**File**: `src/modules/oracle/components/ContentTransition.tsx` (new)
- Wraps lens content with a crossfade animation
- When `seedContent` transitions to `streamedContent`, applies a smooth opacity/position morph
- The reader sees: instant text (Wikipedia seed) → text begins enriching/rewriting in place (AI stream)

#### 3. Progressive Section Rendering ("Waterfall Reveal")

**Concept**: Instead of rendering all streamed markdown at once (which causes layout shifts), parse the markdown into sections as tokens arrive and reveal each `## Section` with a staggered entrance animation.

**File**: `src/modules/oracle/lib/section-parser.ts` (new)
- Splits accumulated markdown on `## ` boundaries
- Returns `{ complete: Section[]; partial: string }` — completed sections + the current in-progress section
- Each completed section gets a stable key for animation

**File**: Update all 5 lens renderers to use section-based rendering:
- Completed sections fade in with `motion.div` (opacity 0→1, y 8→0, staggered 80ms)
- The partial (in-progress) section renders with a subtle pulsing cursor
- Result: content "waterfalls" down the page section by section, like pages of a book appearing

#### 4. Type-to-Stream Input Mode

**Concept**: Add an optional "Live" toggle to the search bar. When active, typing triggers a debounced (800ms) stream — the content begins rendering as you type, and updates if you keep typing (cancel-on-resume, like the AI Lab's Live Inference Mode).

**File**: `src/modules/oracle/components/LiveSearchToggle.tsx` (new)
- Small toggle pill next to the search input: "Live" with a pulsing dot when active
- Stored in localStorage (`uor-live-search`)

**File**: `ResolvePage.tsx`:
- When live mode is on and input changes, debounce 800ms then call `handleKeywordResolve`
- If user types more, abort the current stream (via AbortController passed to `streamKnowledge`)
- Visual indicator: the search bar border pulses gently while streaming

**File**: `stream-knowledge.ts` — Accept optional `AbortSignal` parameter to support cancellation

#### 5. Voice-to-Render Pipeline

**Concept**: Integrate with the Web Speech API (`SpeechRecognition`) for voice input. As the user speaks, interim transcripts appear in the search bar, and when a natural pause is detected, the system auto-triggers a search — content begins rendering while they're still talking.

**File**: `src/modules/oracle/components/VoiceInput.tsx` (new)
- Microphone button in the search bar (replaces or augments the AI mode pill)
- Uses `webkitSpeechRecognition` / `SpeechRecognition` (free, no API key, works in Chrome/Edge/Safari)
- `interimResults: true` — shows live transcription in the input
- On `speechend` or confidence > 0.85, auto-triggers search
- Combines with Live mode: as speech flows in, content starts rendering

**File**: `ImmersiveSearchView.tsx` — Add voice button to the immersive search bar
**File**: `MobileSearchBar.tsx` — Add microphone button for mobile

### Rendering Polish

#### Smooth Layout Animation
- Use `framer-motion` `layoutId` to morph the search bar into the article header when transitioning from search to results
- The search input shrinks into the top bar while the article container expands from where the preview card was

#### Token Animation
- Individual tokens fade in with 50ms opacity transition instead of appearing instantly
- CSS: `.streaming-token { animation: tokenFadeIn 80ms ease-out; }`

#### Ambient Feedback
- Search bar border color shifts from neutral → warm gold as AI confidence builds
- A subtle progress line (like YouTube's red loading bar) shows stream progress at the top

### Files Changed

| File | Change |
|------|--------|
| `src/modules/oracle/lib/speculative-prefetch.ts` | **New** — Debounced Wikipedia prefetch with AbortController |
| `src/modules/oracle/components/LivePreviewCard.tsx` | **New** — Floating preview card during typing |
| `src/modules/oracle/components/ContentTransition.tsx` | **New** — Crossfade from seed to streamed content |
| `src/modules/oracle/lib/section-parser.ts` | **New** — Markdown section splitter for waterfall reveal |
| `src/modules/oracle/components/LiveSearchToggle.tsx` | **New** — "Live" mode toggle for type-to-stream |
| `src/modules/oracle/components/VoiceInput.tsx` | **New** — Web Speech API voice input |
| `src/modules/oracle/lib/stream-knowledge.ts` | Add AbortSignal support |
| `src/modules/oracle/pages/ResolvePage.tsx` | Prefetch wiring, live mode, voice input, seed content, layout animations |
| `src/modules/oracle/components/ImmersiveSearchView.tsx` | Voice button, live preview |
| `src/modules/oracle/components/MobileSearchBar.tsx` | Voice button |
| All 5 lens renderers | Section-based waterfall reveal animation |

### What the User Experiences

1. **Start typing** "quantum" → after 600ms, a translucent preview card floats up showing the Wikipedia thumbnail and description for "Quantum mechanics"
2. **Press Enter** (or just keep typing in Live mode) → the preview card morphs into the article container, Wikipedia extract appears instantly as seed text
3. **AI tokens begin streaming** → the seed text crossfades into the AI-generated article, sections waterfall in one by one with gentle animations
4. **Voice**: tap mic, say "Tell me about black holes" → words appear in the search bar as you speak, content starts rendering before you finish talking
5. **Everything flows** — no loading spinners, no blank screens, no jarring transitions. Content materializes like it was always there, waiting to be revealed.

