

## Plan: Roam-Inspired Bi-Directional Knowledge Graph Enhancements

### Analysis of Roam Research

Roam's genius distills to three architectural insights that map perfectly onto our UOR system:

1. **Bi-directional links (backlinks)**: Every `[[page reference]]` automatically creates a reverse edge. When you mention "meditation" on your daily page, the "meditation" page collects that reference. In graph terms: inserting edge `A→B` implicitly creates a queryable reverse index `B←A`.

2. **Block-level granularity**: Every paragraph is an addressable node (not just pages). Roam uses entity IDs internally — we already have content-addressed UOR IPv6 addresses for every node, which is strictly more powerful.

3. **Transclusion via block references**: `((block-id))` embeds a live reference to another block. Changes propagate everywhere. This is exactly what our `singleProofHash` identity system enables — same content = same address = single source of truth.

### What We Already Have (and What's Missing)

**Already built:**
- Content-addressed nodes via `singleProofHash` → IPv6 ULA (better than Roam's opaque entity IDs)
- Entity extraction on ingestion (URLs, emails, dates, proper nouns)
- Forward edges created during ingestion (`schema:mentions`, `schema:temporal`, etc.)
- Sigma.js graph visualizer with node detail panel
- GrafeoDB SPARQL engine for querying

**Missing (Roam-inspired gaps):**
- No **backlink index** — we create `A→B` edges but don't surface "what links to B?"
- No **inline `[[wiki-link]]` syntax** in text content — no way to create links while writing
- No **backlink panel** on the NodeDetailSheet — clicking a node doesn't show incoming references
- No **block reference / transclusion** — can't embed one node's content inside another
- No **daily page** concept — no temporal entry point for knowledge capture

### Implementation Plan

#### 1. Backlink Index + Query (core engine)

**File: `src/modules/knowledge-graph/backlinks.ts`** (new)

A lightweight reverse-index layer on top of the existing graph store:
- `getBacklinks(nodeAddress: string)` — queries all edges where `target === nodeAddress`, returns `{ source, predicate, label, nodeType }[]`
- Uses existing `bus.call("graph/query", { object: nodeAddress })` which already queries by object
- Caches results in a `Map<string, Backlink[]>` with TTL invalidation
- Registers as `bus.call("graph/backlinks", { address })` operation

#### 2. Backlinks Panel in NodeDetailSheet

**File: `src/modules/knowledge-graph/components/NodeDetailSheet.tsx`** (modified)

Add a "Linked References" section (Roam's signature feature) below the existing edges list:
- Shows all nodes that reference the selected node, grouped by type
- Each backlink is clickable → navigates to that node in the graph
- Shows the context snippet (the text around the reference)
- Count badge in section header ("7 linked references")

#### 3. Wiki-Link Syntax Parser

**File: `src/modules/knowledge-graph/lib/wiki-links.ts`** (new)

Parse `[[Page Name]]` syntax in ingested text content:
- Regex: `/\[\[([^\]]+)\]\]/g`
- For each match, create or find a node with that label via `singleProofHash`
- Create a `schema:mentions` edge from the source document to the linked node
- This runs as a post-processing step in `ingest-bridge.ts` after entity extraction

#### 4. Enhanced Ingestion with Backlink-Aware Edges

**File: `src/modules/knowledge-graph/ingest-bridge.ts`** (modified)

After creating forward edges during ingestion, also:
- Parse text for `[[wiki-links]]` and create bidirectional edges
- Extract `#hashtags` as topic nodes (like Roam's tags)
- For URL ingestion, create `schema:cites` / `schema:citedBy` reverse edges

#### 5. Bus Module Registration

**File: `src/modules/bus/modules/graph.ts`** (modified)

Add new operations:
- `graph/backlinks` — get all incoming references to a node
- `graph/wikilink` — resolve a `[[page name]]` to its UOR address (create-on-reference)

#### 6. Graph Explorer: Backlink Highlighting

**File: `src/modules/knowledge-graph/components/SovereignGraphExplorer.tsx`** (modified)

When a node is selected, visually highlight all nodes that link TO it (not just FROM it):
- Incoming edges get a distinct color (gold) vs outgoing (emerald)
- Backlink nodes pulse briefly to draw attention

### Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/modules/knowledge-graph/backlinks.ts` | New | Backlink index with caching, bus-queryable |
| `src/modules/knowledge-graph/lib/wiki-links.ts` | New | `[[wiki-link]]` and `#hashtag` parser |
| `src/modules/knowledge-graph/components/NodeDetailSheet.tsx` | Modified | Add "Linked References" backlinks panel |
| `src/modules/knowledge-graph/ingest-bridge.ts` | Modified | Wiki-link + hashtag extraction during ingestion |
| `src/modules/knowledge-graph/components/SovereignGraphExplorer.tsx` | Modified | Highlight backlinks on node selection |
| `src/modules/bus/modules/graph.ts` | Modified | Register `backlinks` and `wikilink` operations |
| `src/modules/knowledge-graph/index.ts` | Modified | Export new backlink + wiki-link modules |

### What This Does NOT Include (Future Phase)

- Daily pages / temporal journal (needs a new UI surface, not just graph changes)
- Full block-level transclusion UI (needs a rich text editor — significant scope)
- Roam-style query language (`{{query}}` blocks) — our SPARQL is more powerful but less user-friendly

These are deliberately deferred to keep this change focused on the core graph intelligence that makes backlinks work throughout the system.

