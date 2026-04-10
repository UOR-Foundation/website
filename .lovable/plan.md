

# Library Redesign — Blas.com-Powered Immersive Reading Experience

## Overview

Transform the Library page from a functional ingestion tool into a delightful, media-player-style experience modeled after the existing MediaPlayer component's aesthetic (dark cinema UI, category tabs, card grid, immersive player view). Auto-populate with ~100 book summaries scraped from blas.com, and add a book reader view with knowledge graph integration.

## Architecture

```text
┌─────────────────────────────────────────────────┐
│            LibraryPage (rewrite)                │
│  ┌───────────────────────────────────────────┐  │
│  │  Browse View (grid + categories + search) │  │
│  │  - Hero shelf (featured books carousel)   │  │
│  │  - Category pills (domain tabs)           │  │
│  │  - Book card grid (covers + titles)       │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Reader View (when book clicked)          │  │
│  │  - Book header (cover, title, metadata)   │  │
│  │  - Rendered markdown (beautiful prose)    │  │
│  │  - Related books sidebar                  │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Resonance View (existing, refined)       │  │
│  │  - Graph + invariant cards                │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## What Changes

### 1. Hardcoded Book Catalog (~50 books from blas.com)

Create `src/modules/oracle/lib/book-catalog.ts` — a static catalog of ~50 curated books from blas.com with:
- Title, author, domain/category, cover URL (from blas.com wp-content), source URL, tags
- Short summary text (1-2 sentences from the page)
- Key takeaways array

This mirrors the MediaPlayer's `video-catalog.ts` pattern — no API call needed for initial load. The existing ingestion system remains for adding more books dynamically.

Categories derived from blas.com's tag system: Business, Philosophy, Psychology, Science, Technology, History, Finance, Self-Improvement, Leadership, Biography, Literature.

### 2. LibraryPage Rewrite

Complete rewrite of `src/modules/oracle/pages/LibraryPage.tsx` following the MediaPlayer's three-state pattern:

**Browse State:**
- Dark cinema background (`hsl(220 15% 6%)`) matching MediaPlayer
- Search bar (rounded pill, same styling)
- Category tabs (horizontal scrollable pills)
- Book card grid: cover image with subtle hover scale, title overlay at bottom, domain badge
- "Featured" hero row at top (3 large cards for highlighted books)
- Book count + selected count in header
- Fuse/Discover buttons preserved

**Reader State** (new — triggered on book click):
- Back button header (like MediaPlayer's player view)
- Left column: rendered book summary markdown with beautiful typography (serif fonts, generous line-height, proper headings)
- Right sidebar: book cover, metadata (author, domain, tags), key takeaways, "Related Books" list (same-domain books), link to source on blas.com
- Smooth transition in/out

**Resonance State** (existing — refined styling):
- Keep ResonanceGraph and InvariantCard
- Match dark cinema aesthetic

### 3. BookCard Component Rewrite

Rewrite `src/modules/oracle/components/BookCard.tsx`:
- Larger, more visual card focused on the cover image
- Cover fills most of the card (like a real bookshelf)
- Title and author below in clean typography
- Subtle domain color accent (thin top border or badge)
- Hover: gentle lift + shadow + "Read" overlay
- Selection mode: checkbox overlay for fuse operations

### 4. BookReader Component (New)

Create `src/modules/oracle/components/BookReader.tsx`:
- Immersive reading layout with max-width prose container
- Markdown rendered with `react-markdown` + `remark-gfm` (already available)
- Typography: larger font, serif option, generous spacing
- Book cover displayed alongside title/metadata
- Key takeaways as styled callout cards
- "Related Books" section at bottom
- Back-to-grid navigation

### 5. Edge Function Enhancement

Add a `"get"` action to `supabase/functions/book-resonance/index.ts`:
- Accepts `bookId` parameter
- Returns full book data including `summary_markdown`
- Used by the reader view

### 6. Auto-Population Strategy

The existing ingestion system already works with blas.com. The hardcoded catalog provides instant load without waiting for scraping. When the user clicks "Ingest" for the first time, the edge function crawls blas.com and fills the `book_summaries` table. The static catalog is used as fallback/seed data.

### 7. Knowledge Graph Mapping

Add a small bridge in `src/modules/oracle/lib/book-graph-bridge.ts`:
- On book load, emit KG triples: `book → uor:hasDomain → domain`, `book → uor:hasTag → tag`
- When invariants are discovered, emit: `invariant → uor:connectsBook → book`
- This makes the entire library navigable in the Sovereign Graph Explorer

## Files to Create/Modify

| File | Action | Purpose |
|---|---|---|
| `src/modules/oracle/lib/book-catalog.ts` | Create | Static catalog of ~50 blas.com books |
| `src/modules/oracle/pages/LibraryPage.tsx` | Rewrite | Three-state cinema-style library |
| `src/modules/oracle/components/BookCard.tsx` | Rewrite | Visual cover-focused book cards |
| `src/modules/oracle/components/BookReader.tsx` | Create | Immersive reading view |
| `src/modules/oracle/components/BookGrid.tsx` | Rewrite | Category tabs + search + grid |
| `src/modules/oracle/lib/book-graph-bridge.ts` | Create | KG triple emission for books |
| `supabase/functions/book-resonance/index.ts` | Modify | Add "get" action for single book |

## Estimated Scope

~1200 lines across 7 files. The book catalog (~400 lines) and LibraryPage rewrite (~350 lines) are the largest pieces. The reader component is ~200 lines.

