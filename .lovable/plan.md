

# Algebrica-Grade Knowledge Graph Experience — System-Wide Enforcement

## Analysis of Algebrica

Algebrica's power comes from three design principles:

1. **Graph-first hierarchy**: The ontological graph is the primary navigation structure, not a secondary feature. Content exists to serve the graph, not the other way around.
2. **Brutal restraint**: Monochrome palette, monospace typography for data, generous whitespace, zero decorative elements. Every pixel carries information.
3. **Contextual discovery**: The left sidebar (Your History, Discover, Most Explored) provides ambient awareness of where you are in the knowledge structure without demanding attention.

Our system already has the foundational pieces — `KnowledgeSidebar`, `KnowledgeLayout`, `SovereignGraphExplorer`, `ConceptMap`, `NodeDetailSheet` — but they are confined to the graph-explorer app. The rest of the OS (Oracle, App Builder, Vault, Compliance, etc.) operates independently with no graph awareness.

## What We Will Build

A **system-wide knowledge graph context layer** that makes every application in the OS graph-aware without cluttering any of them. Three components:

### 1. GraphContextBar — Universal Bottom Strip (~120 lines)
**File**: `src/modules/desktop/components/GraphContextBar.tsx`

A minimal, persistent bar that appears at the bottom of every `DesktopWindow` content area. It shows the current content's position in the knowledge graph:

```text
┌─────────────────────────────────────────────────────────┐
│  ● 3 nodes   ↔ 7 relations   ◇ graph-explorer          │
│  [View in Graph]                                        │
└─────────────────────────────────────────────────────────┘
```

- **24px tall**, monochrome, monospace — Algebrica-style stat strip
- Shows: node count connected to current context, relation count, current app name
- Single action: "View in Graph" opens the graph explorer focused on the current node
- Conditionally visible: only when the current app has produced or resolved graph-addressable content
- Uses the existing `localGraphStore.queryBySubject()` to check for related nodes

### 2. KnowledgeTrailProvider — Session-Wide Trail Tracking (~80 lines)
**File**: `src/modules/desktop/hooks/useKnowledgeTrail.ts`

A React context that wraps `DesktopShell` and tracks every meaningful user action (opening an app, building an image, resolving a query, inspecting a node) as a trail entry. This feeds the existing `KnowledgeSidebar` component so it works system-wide, not just in the knowledge graph app.

- Hooks into `useWindowManager` to track app opens/focuses
- Exposes `pushTrailEntry(id, label, appId)` to any app that wants to register a graph-relevant action
- Stores trail in sessionStorage (already implemented in `KnowledgeSidebar.tsx` — we unify it)

### 3. GraphQuickView — Inline Graph Preview (~150 lines)
**File**: `src/modules/desktop/components/GraphQuickView.tsx`

When a user clicks "View in Graph" from the GraphContextBar, instead of switching to the full graph-explorer app, a compact Algebrica-style overlay appears within the current window:

- **Radial 1-hop concept map** (reuses existing `ConceptMap` component) centered on the current content node
- Stat block at bottom: Nodes / Relations / Longest Chain (same `StatBlock` pattern from `SovereignGraphExplorer`)
- Click any neighbor node to navigate to it (opens the relevant app or graph explorer)
- Click "Full Graph" to open the graph-explorer app with the node pre-selected
- Monochrome, frosted glass overlay, dismissible with Escape or click-outside

### 4. DesktopWindow Integration (~30 lines changed)
**File**: `src/modules/desktop/DesktopWindow.tsx`

After boot completes, render `<GraphContextBar appId={win.appId} />` below the app content. The bar is opt-in per app via a blueprint flag `graphAware: true` (defaulting to true for all apps except system-monitor and settings).

### 5. App-Specific Graph Emission (~40 lines total across files)

Wire existing apps to emit graph nodes when they produce content:

- **Oracle**: After each response, emit a `uor:Query` node linked to any `uor:Claim` nodes from the neuro-symbolic scaffold (already produces `EnrichedReceipt` with CIDs)
- **App Builder**: After each build, emit a `uor:Image` node linked to its `uor:Layer` nodes (already produces canonical IDs)
- **Compliance**: Emit `uor:ComplianceReport` nodes from provenance data

This is lightweight — each app adds 5-10 lines calling `localGraphStore.putNode()` after its primary operation.

## Files

| File | Action | Lines |
|---|---|---|
| `src/modules/desktop/components/GraphContextBar.tsx` | **Create** | ~120 |
| `src/modules/desktop/components/GraphQuickView.tsx` | **Create** | ~150 |
| `src/modules/desktop/hooks/useKnowledgeTrail.ts` | **Create** | ~80 |
| `src/modules/desktop/DesktopWindow.tsx` | Update | ~15 lines |
| `src/modules/desktop/DesktopShell.tsx` | Update | ~5 lines (wrap with trail provider) |
| `src/modules/oracle/pages/OraclePage.tsx` | Update | ~10 lines (emit graph nodes on response) |
| `src/modules/app-builder/pages/AppBuilderPage.tsx` | Update | ~10 lines (emit graph nodes on build) |

## Design Principles

- **Algebrica-grade restraint**: The GraphContextBar is 24px. The QuickView is a focused overlay, not a dashboard. No color except the monochrome zinc scale.
- **Graph-first, not graph-only**: The graph is ambient context, not a mode switch. Users see their position in the knowledge structure at all times.
- **Zero cognitive overhead**: The bar is informational. One click to see the graph. One more click to go deep. No configuration, no settings.
- **Standardized across every app**: Same bar, same typography, same interaction pattern. The graph experience is the OS experience.

