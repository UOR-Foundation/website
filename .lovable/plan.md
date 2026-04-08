

## Book Resonance Engine — Cross-Domain Invariant Discovery

### Vision

A new page (`/library`) that ingests book summaries from blas.com (or any source), encodes them into the UOR substrate, and reveals hidden invariant patterns that transcend domains. Two modes: **Manual** (user selects books to fuse) and **Automatic** (AI discovers cross-domain resonances). The experience feels like a living constellation of ideas that light up when connections are found.

### Architecture

```text
┌─────────────────────────────────────────────────────┐
│  /library                                           │
│                                                     │
│  ┌──── Book Grid ────────────────────────────┐      │
│  │ Visual cards grouped by domain/genre       │      │
│  │ (scraped from blas.com via Firecrawl)      │      │
│  │ Select books → "Fuse" button               │      │
│  └────────────────────────────────────────────┘      │
│                                                     │
│  ┌──── Resonance View ───────────────────────┐      │
│  │ Visual graph/constellation showing         │      │
│  │ invariant patterns across selected books   │      │
│  │ Nodes = books, Edges = shared invariants   │      │
│  │ Click edge → deep dive into the pattern    │      │
│  └────────────────────────────────────────────┘      │
│                                                     │
│  ┌──── Pattern Synthesis ────────────────────┐      │
│  │ AI-generated new patterns/insights         │      │
│  │ infused with user context + UOR constraint │      │
│  └────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────┘
```

### Implementation Plan

#### 1. Edge Function: `book-resonance`

**New file: `supabase/functions/book-resonance/index.ts`**

Three endpoints via action field in the request body:

- **`ingest`**: Takes a URL (e.g. blas.com/books), uses Firecrawl to scrape the book list, then for each book summary page scrapes the content. Returns structured book data (title, author, domain/tags, summary markdown, cover image URL). Caches results in a `book_summaries` table.

- **`fuse`** (Manual mode): Takes an array of book IDs. Sends their summaries to the AI gateway with a UOR-constrained prompt that identifies shared invariants, structural patterns, and cross-domain resonances. Streams the response back via SSE.

- **`discover`** (Automatic mode): Takes the full library (or a subset) + user context (recent searches, attention profile). AI identifies the most surprising cross-domain invariant clusters. Streams back a structured resonance map.

The AI prompt will be carefully crafted to:
- Identify structural invariants (patterns that appear across 3+ domains)
- Map each invariant to UOR-style canonical form
- Score resonance strength
- Connect to user's exploration context

#### 2. Database: `book_summaries` table

```sql
CREATE TABLE public.book_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  cover_url TEXT,
  source_url TEXT UNIQUE,
  domain TEXT,          -- e.g. "Philosophy", "Business", "Physics"
  tags TEXT[] DEFAULT '{}',
  summary_markdown TEXT,
  uor_hash TEXT,        -- content-addressed hash of the summary
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.book_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read books" ON public.book_summaries FOR SELECT USING (true);
```

#### 3. New Page: `src/pages/LibraryPage.tsx`

Route: `/library`

**Book Grid Section:**
- Visual grid of book covers grouped by domain (collapsible sections)
- Search/filter bar
- Multi-select mode: click books to select them, selected books glow with a UOR-style ring
- "Fuse Selected" button appears when 2+ books are selected
- "Auto-Discover" button for automatic mode

**Resonance Constellation:**
- When fusion runs, transition to a visual constellation view
- Books become nodes arranged in a force-directed graph
- Shared invariants become labeled edges connecting books
- Edge thickness = resonance strength
- Animated: nodes drift gently, edges pulse when hovered
- Click an invariant edge → expands into a detailed pattern card streamed from the AI

**Pattern Cards:**
- Each discovered invariant rendered as a beautiful card
- Shows: pattern name, description, which books share it, domain tags, UOR hash
- "Generate New" button: uses the invariant as a seed + user context to synthesize new insights

#### 4. Components

| Component | Purpose |
|---|---|
| `src/modules/oracle/pages/LibraryPage.tsx` | Main page with grid + constellation |
| `src/modules/oracle/components/BookCard.tsx` | Individual book cover card with selection state |
| `src/modules/oracle/components/BookGrid.tsx` | Filterable grid of books grouped by domain |
| `src/modules/oracle/components/ResonanceGraph.tsx` | Force-directed constellation visualization |
| `src/modules/oracle/components/InvariantCard.tsx` | Rendered pattern/invariant result |
| `src/modules/oracle/lib/stream-resonance.ts` | SSE client for the book-resonance edge function |

#### 5. Resonance Graph Visualization

Use HTML Canvas or SVG with Framer Motion for the constellation:
- Books as circular nodes with cover images
- Invariant connections as curved, labeled edges
- Color-coded by domain
- Interactive: drag nodes, zoom, click for details
- Animated transitions when new patterns are discovered
- The graph pulses subtly to feel alive

#### 6. Integration with Existing Systems

- **User context**: Pull from `coherence-engine` (attention profile, recent searches) to personalize automatic discovery
- **UOR encoding**: Each book summary and each discovered invariant gets a UOR content-address
- **Provenance**: Each invariant card shows which books contributed and the AI synthesis provenance
- **Search bar integration**: Typing a book title in the main search bar could suggest "Explore in Library"

#### 7. Route Addition

**File: `src/App.tsx`** — Add `<Route path="/library" element={<LibraryPage />} />`

#### 8. Ingestion Flow

On first visit or when user provides a URL:
1. Input field: "Point to a book summary source" (prefilled with blas.com)
2. Edge function scrapes the book list via Firecrawl Map to get all book URLs
3. Then scrapes each book page for summary content (batched, with rate limiting)
4. Stores in `book_summaries` table
5. Grid populates progressively as books are ingested

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/book-resonance/index.ts` | New edge function for ingest/fuse/discover |
| `src/modules/oracle/pages/LibraryPage.tsx` | New main page |
| `src/modules/oracle/components/BookCard.tsx` | Book cover card component |
| `src/modules/oracle/components/BookGrid.tsx` | Filterable grid |
| `src/modules/oracle/components/ResonanceGraph.tsx` | Force-directed constellation |
| `src/modules/oracle/components/InvariantCard.tsx` | Pattern result card |
| `src/modules/oracle/lib/stream-resonance.ts` | SSE streaming client |
| `src/App.tsx` | Add `/library` route |
| Database migration | Create `book_summaries` table |

### UX Flow

1. User navigates to `/library` → sees empty state with URL input
2. Enters `blas.com` → ingestion begins, book covers appear progressively
3. Books auto-group by domain tags (Business, Philosophy, Science, etc.)
4. **Manual**: User taps 3-5 books → hits "Fuse" → constellation animates in, invariants stream as cards
5. **Automatic**: User hits "Discover" → AI analyzes full library with user context → reveals top invariant clusters
6. User clicks an invariant → deep-dive card expands with full synthesis
7. "Generate Forward" button creates new UOR-constrained insights from discovered patterns

