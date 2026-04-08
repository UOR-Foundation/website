

## Inline Citation System — Perplexity-Style, UOR-Anchored

### What Perplexity Does

Perplexity's citation model has three key elements:
1. **Inline numbered markers** — superscript `[1]`, `[2]` etc. appear directly in the text next to the claim they support
2. **Hover/click reveals source** — each marker shows a tooltip or popover with the source URL, title, and favicon
3. **Sources bar at top** — a horizontal row of source cards (favicon + domain) appears above the answer, giving instant credibility before the user even reads

### Current State

Our system has sources but they're **disconnected from the text**:
- Sources are collected from Wikipedia/Wikidata URLs only
- They're displayed as a flat list at the bottom of the article
- The AI is explicitly told "Do NOT add citations or reference brackets"
- No claim-level anchoring exists — the reader has no way to know which statement came from which source

### Design

**Three-layer citation architecture:**

1. **Source Pills (top)** — Before the article, show a compact row of source cards with favicons and domain names. Familiar Perplexity pattern. Clicking scrolls to the sources footer.

2. **Inline Citation Markers** — Superscript numbered badges `¹` `²` appear inline after key claims. Hovering shows a micro-popover with the source title/URL. These are subtle (muted color, small) so they don't break reading flow.

3. **Sources Footer (enhanced)** — The existing footer gets numbered to match inline markers, with richer metadata (title extraction from URL, favicon, domain).

**UOR Anchoring:** Each source gets a lightweight UOR content-address (fnv1a hash of the URL) displayed as a tiny monospace badge in the popover. This visually signals that every source is anchored in the UOR identity space — not just a random link.

### Implementation

#### 1. Update AI prompts to include inline citations

**File:** `supabase/functions/uor-knowledge/index.ts`

Change the system prompts for `encyclopedia` and `expert` lenses to request inline citation markers. The AI will output `[1]`, `[2]` etc. after factual claims, referencing the sources list.

The edge function will also emit a richer `sources` array in the SSE `wiki` event — each source as `{ url, domain, type }` instead of just a string.

Magazine, storyteller, and explain-like-5 lenses stay citation-free (their prompts already say "no citations") to preserve narrative flow.

#### 2. Create `InlineCitation` component

**File:** `src/modules/oracle/components/InlineCitation.tsx` (new)

A tiny superscript badge component:
- Renders as `¹` `²` etc. in a subtle colored badge
- On hover: shows a micro-popover with source URL, domain, and UOR hash
- On click: opens source in new tab
- Fully accessible (aria-label, keyboard focusable)

#### 3. Create `SourcesPills` component

**File:** `src/modules/oracle/components/SourcesPills.tsx` (new)

A horizontal row of source cards shown above the article:
- Each pill: favicon (via Google's favicon service) + domain name + type badge (Wikipedia, Wikidata, Web)
- Compact, horizontally scrollable on mobile
- Shows immediately when wiki event arrives (before article text streams)

#### 4. Create citation-aware markdown renderer

**File:** `src/modules/oracle/lib/citation-parser.ts` (new)

A utility that:
- Detects `[1]`, `[2]` etc. in the streamed markdown text
- Maps them to the sources array by index
- Returns React elements with `InlineCitation` components replacing the raw `[N]` markers
- Generates UOR content-address for each source URL using fnv1a

#### 5. Update `WikiArticleView` and `DeepDiveLensRenderer`

**Files:** `WikiArticleView.tsx`, `DeepDiveLensRenderer.tsx`

- Import and use the citation parser to transform markdown content before rendering
- Add `SourcesPills` above the article body
- Pass the sources array to the citation parser
- The existing sources footer stays but gets numbered markers to match inline citations

#### 6. Update stream types

**File:** `src/modules/oracle/lib/stream-knowledge.ts`

Expand the `sources` type from `string[]` to `Array<string | { url: string; domain: string; type: string }>` with backward compatibility.

### What the User Sees

1. **Article loads** → Source pills appear immediately at top: `🌐 Wikipedia · 🔗 Wikidata`
2. **Text streams in** → Inline markers appear naturally: "Quantum mechanics is a fundamental theory...¹"
3. **Hover on ¹** → Popover: "Wikipedia: Quantum mechanics | en.wikipedia.org | uor:a3f2b1c0"
4. **Click** → Opens Wikipedia article in new tab
5. **Scroll to bottom** → Numbered sources footer with full URLs
6. **Magazine/Story lenses** → No inline citations (clean narrative), but source pills still visible at top

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/uor-knowledge/index.ts` | Update encyclopedia + expert prompts to include `[N]` citations; enrich sources event |
| `src/modules/oracle/components/InlineCitation.tsx` | **New** — superscript citation badge with hover popover |
| `src/modules/oracle/components/SourcesPills.tsx` | **New** — horizontal source cards above article |
| `src/modules/oracle/lib/citation-parser.ts` | **New** — parse `[N]` markers → React citation elements |
| `src/modules/oracle/components/WikiArticleView.tsx` | Add SourcesPills + citation-parsed text |
| `src/modules/oracle/components/lenses/DeepDiveLensRenderer.tsx` | Add SourcesPills + citation-parsed text |
| `src/modules/oracle/lib/stream-knowledge.ts` | Expand sources type for richer metadata |

