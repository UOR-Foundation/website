

# Algebrica Insights Applied to the Sovereign Knowledge Space

## What Makes Algebrica Brilliant

Having studied the site in detail, five design principles stand out:

1. **Ontological Graph as First-Class Navigation** — The graph isn't a debug tool buried in settings. It IS the home page CTA ("Explore the Ontological Graph"). Every concept page shows its position in the graph: "Requires 0, Enables 7." The graph is the table of contents for all knowledge.

2. **Concept Maps as Article Headers** — Each article opens with a radial mind-map showing the concept's internal structure (e.g., Sets → foundations, operations, structures). This immediately orients the reader before they read a single word. It's a visual schema.

3. **Sidebar as Living Context** — The left sidebar has three contextual sections: "Your history" (breadcrumb trail of visited concepts), "Discover" (related concepts with connection counts), and "Most Explored" (social proof / popularity). This creates a personal navigation trail through the knowledge space.

4. **Prerequisite Chains** — Every concept shows its depth in the dependency graph: "Requires → Enables" with counts. The graph page shows "Longest Dependency Chain: 11." This makes learning paths explicit and navigable.

5. **Monochrome Minimalism** — Pure grayscale with occasional accent. No color noise. Content breathes. The graph visualization uses subtle node sizes and thin connection lines rather than color-coded categories.

## How This Maps to Your System

Your system already has all the underlying infrastructure — GrafeoDB, backlinks, graph namespaces, adjacency index, the Oracle article renderer, LinkedReferencesSidebar. What's missing is the **Algebrica-style presentation layer** that makes the knowledge graph feel like a living, explorable space rather than a search engine.

```text
Algebrica Feature          →  Your Equivalent
─────────────────────────────────────────────────
Concept mind-map header    →  Article "resonance graph" from node's KG neighbors
Sidebar history trail      →  Already have search history; render as breadcrumb
Discover (related)         →  Adjacency index neighbors + backlinks
Requires/Enables counts    →  Incoming/outgoing edge counts from grafeoStore
Ontological Graph page     →  SovereignGraphExplorer (already exists)
Most Explored              →  Attention tracker profile data
```

## Implementation Plan

### 1. Knowledge Sidebar — Living Context Panel
**Create: `src/modules/oracle/components/KnowledgeSidebar.tsx`**

A left-docked panel (280px) inside the Oracle/search window that mirrors Algebrica's sidebar:
- **Your Trail**: Last 10 visited topics from search history, rendered as a vertical breadcrumb with dots (like Algebrica's "Your history")
- **Related Concepts**: Uses the new adjacency index to show neighbors of the currently viewed topic, with edge counts as badges (like Algebrica's "Discover" section with connection counts)
- **Most Explored**: Top concepts from the attention tracker, with view counts
- Clicking any item triggers a new search/navigation
- Collapsible on smaller windows; hidden on mobile

### 2. Concept Map Header for Articles
**Modify: `src/modules/oracle/components/WikiArticleView.tsx`**

Add an Algebrica-style radial concept map above the article body:
- When the article loads, query the adjacency index for the topic's 1-hop neighbors
- Render a simple radial tree (pure SVG, no heavy library) showing the concept at center with branches to related concepts, grouped by relationship type
- Monochrome styling: thin lines, small dots, subtle labels
- Shows "Requires X · Enables Y" counts below the map (incoming vs outgoing edges)
- Falls back gracefully to nothing if no graph data exists for the topic

### 3. Prerequisite/Dependency Badges
**Modify: `src/modules/oracle/components/WikiArticleView.tsx`**

Add metadata badges below the title (like Algebrica's "Intermediate · Requires 0 · Enables 7"):
- Query `grafeoStore` for incoming edges (prerequisites) and outgoing edges (enables)
- Display as subtle monochrome badges
- Clicking "Requires" or "Enables" scrolls to a section listing those connected concepts

### 4. Personal Internet Graph View Enhancement
**Modify: `src/modules/knowledge-graph/components/SovereignGraphExplorer.tsx`**

Apply Algebrica's graph page patterns:
- Add summary stats at top: "Nodes · Relations · Longest Chain" (using adjacency index `shortestPath` + graph stats)
- Add "Search a node" input field within the graph view (already partially exists via GraphFilterBar)
- Namespace-colored clusters: subtle color coding by graph namespace (messenger=blue, identity=green, etc.) rather than type

### 5. Solar Context Space Navigation
**Create: `src/modules/oracle/components/SolarContextExplorer.tsx`**

A dedicated view for exploring the "solar context space" — the user's knowledge organized by time-of-day and topic clusters:
- Uses the quote-context system (`gatherQuoteContext`) to understand temporal patterns
- Renders topics as a constellation/cluster view organized by when they were explored (morning knowledge vs evening knowledge)
- Each cluster is clickable, opening the Graph Explorer filtered to that namespace
- Accessible from the home screen dock or via Spotlight

### 6. Monochrome Graph Aesthetic
**Modify: `src/modules/knowledge-graph/hooks/useGraphData.ts`**

Update the graph visualization colors to match Algebrica's restrained palette:
- Replace the current `colorForType` rainbow with a monochrome scale (white/gray nodes, subtle size differentiation)
- Selected node: white with glow. Backlinks: warm gray. Unrelated: dark gray
- Edge colors: single subtle gray, thicker for stronger connections

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `oracle/components/KnowledgeSidebar.tsx` | Create | Living context panel (trail, related, popular) |
| `oracle/components/SolarContextExplorer.tsx` | Create | Temporal knowledge constellation view |
| `oracle/components/WikiArticleView.tsx` | Modify | Add concept map header + prerequisite badges |
| `knowledge-graph/components/SovereignGraphExplorer.tsx` | Modify | Add Algebrica-style stats + search |
| `knowledge-graph/hooks/useGraphData.ts` | Modify | Monochrome graph palette |

No database changes needed. All data comes from existing GrafeoDB + adjacency index + attention tracker.

## Technical Notes

- The concept map SVG renderer will be ~150 lines of pure SVG (no D3/Sigma dependency for inline maps)
- KnowledgeSidebar reads from `getSearchHistory()`, `adjacencyIndex.getNeighbors()`, and `loadAttentionProfile()`
- The solar context explorer uses `gatherQuoteContext()` for temporal clustering
- All new components follow the existing monochrome/frosted-glass design language

