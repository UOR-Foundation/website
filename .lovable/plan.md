

## Plan: Interactive Knowledge Graph Visualizer

### Evaluation of SpellWeb and Alternatives

**SpellWeb** uses a Canvas/SVG force-directed layout with domain filtering and node-type legends. It's visually rich but appears to be a closed-source product — not something we can embed or fork. The UX patterns (layers, node types, domain colors, edge labels) are excellent reference points though.

**Recommendation: Sigma.js + Graphology**

After evaluating the major open-source options:

| Library | Rendering | Nodes at 60fps | React | Open Source | Mobile | Edge/Local |
|---------|-----------|----------------|-------|-------------|--------|------------|
| **Sigma.js + Graphology** | WebGL | 50,000+ | `@react-sigma/core` | MIT, 12k stars | Yes | Yes |
| Cytoscape.js | Canvas/SVG | ~5,000 | Wrapper needed | MIT | Partial | Yes |
| react-force-graph | WebGL/3D | ~10,000 | Native | MIT | Poor (3D) | Yes |
| Cosmograph | WebGPU | 1M+ | React lib | Freemium | Yes | Partial |
| D3-force (current) | SVG | ~500 | Manual | BSD | Poor | Yes |

**Sigma.js wins** because:
- **WebGL rendering** — handles thousands of nodes at 60fps on mobile
- **Graphology** data model — isomorphic to our KG triple store (nodes + edges with attributes)
- **`@react-sigma/core`** — idiomatic React hooks, TypeScript-native
- **MIT license** — fully open source, 12 years mature
- **Zero server dependency** — runs entirely client-side, edge/local/cloud portable
- **Touch support** — pinch-zoom, pan, tap built in
- **Compatible with our bus** — we query `bus.call("graph/query")` and feed results directly into a Graphology instance

### What Gets Built

A new `SovereignGraphExplorer` component accessible from the desktop shell, providing an immersive, full-screen interactive visualization of the user's knowledge graph.

**Features:**
1. **WebGL force-directed layout** via Sigma.js — nodes are KG entities (datums, derivations, ceremonies, connections), edges are predicates
2. **Node type filtering** — toggle visibility by type (Datum, Derivation, Certificate, Person, Ceremony) with color-coded legend
3. **Search** — find nodes by label, type, or UOR address with instant camera focus
4. **Node detail panel** — click a node to see its full attributes, connected edges, and UOR address
5. **Edge labels on hover** — show predicate names (defines, proves, derives, connects)
6. **Sovereign atmosphere** — dark theme matching the OS shell, emerald/gold accents for ceremony nodes, moon phase glyphs on the founding blade node
7. **Mobile-optimized** — responsive layout, touch gestures, bottom sheet for node details on small screens
8. **Live data** — pulls from `bus.call("graph/query")` and `bus.call("graph/stats")`, optionally subscribes to realtime changes

### Architecture

```text
┌─────────────────────────────────────────┐
│         SovereignGraphExplorer          │
│  ┌───────────┐  ┌────────────────────┐  │
│  │ FilterBar │  │   SigmaContainer   │  │
│  │ (types,   │  │   (WebGL canvas)   │  │
│  │  search,  │  │                    │  │
│  │  layers)  │  │  Graphology ←──────│──│── bus.call("graph/query")
│  └───────────┘  └────────────────────┘  │
│  ┌──────────────────────────────────┐   │
│  │  NodeDetailPanel (slide-over)    │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Files

| File | Action |
|------|--------|
| `package.json` | Add `sigma@^3.0.2`, `graphology@^0.25`, `graphology-layout-forceatlas2@^0.10`, `@react-sigma/core@^4` |
| `src/modules/knowledge-graph/components/SovereignGraphExplorer.tsx` | New — main full-screen graph explorer component with Sigma canvas, filter sidebar, search, node detail panel |
| `src/modules/knowledge-graph/components/GraphFilterBar.tsx` | New — node type toggles, layer switches, search input |
| `src/modules/knowledge-graph/components/NodeDetailSheet.tsx` | New — slide-over panel showing node attributes, edges, UOR address; bottom sheet on mobile |
| `src/modules/knowledge-graph/hooks/useGraphData.ts` | New — hook that fetches graph data via bus, transforms to Graphology instance, handles refresh |
| `src/modules/knowledge-graph/pages/KnowledgeGraphPage.tsx` | Modified — add a "Visual Explorer" button/tab that mounts SovereignGraphExplorer |
| `src/modules/desktop/TabBar.tsx` | Modified — add graph explorer as a launchable app from the desktop |

### Key Design Decisions

- **Graphology as the data layer** — it's a proper graph data structure library that Sigma reads from. We populate it from `bus.call("graph/query")` results, mapping KG nodes to Graphology nodes and KG edges to Graphology edges with full attribute preservation.
- **ForceAtlas2 layout** — runs as a Web Worker via `graphology-layout-forceatlas2/worker`, keeping the main thread free for 60fps rendering. Falls back to synchronous on environments without Worker support.
- **Node sizing by degree** — nodes with more connections appear larger, making hubs visually prominent.
- **Ceremony nodes get special treatment** — the founding blade node gets the sovereign ring glow (emerald/gold conic gradient) and displays the moon phase glyph.
- **Mobile: bottom sheet instead of sidebar** — on screens < 768px, the filter bar collapses to a floating action button, and node details appear in a draggable bottom sheet.

