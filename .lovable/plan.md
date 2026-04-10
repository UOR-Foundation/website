

# Compliance App — Algebrica-Inspired Provenance Explorer

## Overview

Rewrite the Compliance Dashboard as a standalone full-screen application (no Layout wrapper) inspired by Algebrica's design language: left sidebar for navigation/discovery, main content area with a toggle between **Table View** and **Graph View**, and a right detail panel that slides in when any node is selected. The app opens in a new browser window via `window.open`.

## Architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│  Compliance App (standalone, full-screen, dark background)           │
│                                                                      │
│  ┌─────────────┐  ┌─────────────────────────────────────┐  ┌──────┐ │
│  │  LEFT SIDEBAR│  │  MAIN CONTENT                       │  │DETAIL│ │
│  │             │  │                                      │  │PANEL │ │
│  │ RAS Crate   │  │  [Table View] [Graph View] toggle   │  │      │ │
│  │  v1.0.0     │  │                                      │  │ Name │ │
│  │ Components  │  │  TABLE: atom grid + findings table   │  │ Type │ │
│  │  42         │  │    OR                                │  │ Cat  │ │
│  │ Score Ring  │  │  GRAPH: force-directed SVG           │  │ Chain│ │
│  │             │  │  (atoms → modules → exports)         │  │ Refs │ │
│  │ ─────────── │  │                                      │  │      │ │
│  │ Atom Index  │  │  Click any node to open detail →     │  │      │ │
│  │  PrimitiveOp│  │                                      │  │      │ │
│  │  Space      │  │                                      │  │      │ │
│  │  CoreType   │  │                                      │  │      │ │
│  │  Morphism   │  │                                      │  │      │ │
│  │  Pipeline   │  │                                      │  │      │ │
│  │  Algebraic  │  │                                      │  │      │ │
│  │ ─────────── │  │                                      │  │      │ │
│  │ Most Used   │  │                                      │  │      │ │
│  │  Address 12 │  │                                      │  │      │ │
│  │  Effect  9  │  │                                      │  │      │ │
│  │ ─────────── │  │                                      │  │      │ │
│  │ Export .md  │  │                                      │  │      │ │
│  │ Export .nq  │  │                                      │  │      │ │
│  └─────────────┘  └─────────────────────────────────────┘  └──────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

## Design (Algebrica-Inspired)

- **Left sidebar**: Permanent. Contains RAS crate version + component count inputs, score ring, atom category index (clickable to filter), "Most Referenced" atoms list (like Algebrica's "Most Explored"), and export buttons
- **Main content**: Toggle between Table View and Graph View
  - **Table View**: Score stats bar (Nodes/Relations/Longest Chain like Algebrica), search bar, category filter pills, atom periodic table grid, then findings table with atom chains shown as `→` daisy chains
  - **Graph View**: Force-directed SVG. Atoms = small filled circles (by category color), Modules = medium rounded nodes, Exports = smaller diamonds. Edges for `derivedFrom` and `belongsTo`. Click any node to select. Zoom/pan. Search highlights matching nodes
- **Right detail panel**: Slides in on node click. Shows full metadata: name, type, category, description, foundation path, upstream atoms (for exports/modules), downstream modules (for atoms), pipeline description, health status badge

## Files

| File | Action | Purpose |
|---|---|---|
| `src/modules/uns/build/container.ts` | Delete + recreate | Fix persistent build resolution error (fresh write) |
| `src/modules/canonical-compliance/pages/ComplianceDashboardPage.tsx` | Rewrite | Standalone three-panel Algebrica-inspired app |
| `src/modules/canonical-compliance/components/ProvenanceGraph.tsx` | Create | Force-directed SVG knowledge graph |
| `src/modules/canonical-compliance/components/NodeDetailPanel.tsx` | Create | Right-side detail panel for selected nodes |
| `src/modules/canonical-compliance/components/AtomSidebar.tsx` | Create | Left sidebar with RAS metadata, atom index, exports |

## Technical Details

- Force simulation uses vanilla `requestAnimationFrame` physics (repulsion + attraction + centering) — no d3-force dependency needed
- Three node types with distinct visual sizes and shapes, colored by category (zinc scale matching Algebrica's monochrome palette)
- Graph data sourced from existing `buildProvenanceTriples()` and `buildProvenanceAdjacency()`
- RAS crate version defaults to `1.0.0`, component count auto-computed from `ALL_ATOMS.length`
- "Open in New Window" button: `window.open('/compliance', '_blank', 'width=1400,height=900')`
- Container.ts will be deleted and rewritten byte-clean to resolve the persistent Rollup module resolution failure

