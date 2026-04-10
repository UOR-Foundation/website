

# Compliance Zoom Engine — Layered Exploration with Zoom In/Out

## Terminology Evaluation

The current terms "atoms," "modules," and "applications" are close but have gaps. Here's my assessment and recommendation:

**Current names → Proposed names:**

| Current | Issue | Proposed | Why |
|---|---|---|---|
| Atoms | Good — universally understood as "smallest unit" | **Primitives** | More self-descriptive for developers; "atom" overloaded in React/Jotai ecosystems. "Primitive" clearly says "this cannot be decomposed further." |
| *(no name)* | The atom chains (pipelines) that form individual exports are invisible as a layer | **Pipelines** | Each export is built from a chain of atoms (e.g., `urdna2015 → sha256 → cid`). This is already in the data as the `pipeline` field. Developers know "pipeline" from CI/CD. |
| Modules | Good — universal term | **Modules** | Keep as-is. Perfect mapping to npm packages, Rust crates, Go modules. |
| *(no name)* | The provenance map already groups modules into layers (Engine, Name System, Build System, Services) but this isn't surfaced | **System** | The top-level view showing how layers compose into the full system. |

**Resulting 4-level zoom:**

```text
Level 0: Primitives   — 86 atomic operations/types (the periodic table)
Level 1: Pipelines    — 46 exports, each a chain of primitives
Level 2: Modules      — 23 modules, each grouping related pipelines  
Level 3: System       — 4 layers (Engine → Names → Build → Services)
```

Zoom in = more granular (System → Modules → Pipelines → Primitives).
Zoom out = more composed (Primitives → Pipelines → Modules → System).

This maps exactly to the existing data — the provenance map already has all four levels, they're just not navigable as discrete views.

## UI Design

Replace the current Top↓/Bottom↑ toggle with a **zoom slider** (4 discrete stops). Each zoom level shows:
- A **table view** appropriate to that granularity
- A **graph view** appropriate to that granularity
- HUD stats scoped to the current level
- Click-to-zoom: clicking any row zooms into its children

```text
┌──────────────────────────────────────────────────────┐
│  [−]  ●───●───●───●  [+]     Primitives | Pipelines │
│       P   Pl  M   S          | Modules  | System    │
│                                                      │
│  ── SYSTEM VIEW (zoomed all the way out) ──────────  │
│                                                      │
│  Layer          Modules  Pipelines  Grounded  Score  │
│  ───────────────────────────────────────────────────  │
│  Engine            5        17        17/17    100%  │
│  Name System       3         5         5/5     100%  │
│  Build System      5        12        12/12    100%  │
│  Services          7        12         8/12     67%  │
│                                                      │
│  Click "Engine" → zooms to Module view filtered to   │
│  Engine modules only                                 │
│                                                      │
│  ── MODULE VIEW ─────────────────────────────────── │
│                                                      │
│  Module              Pipelines  Grounded  Atoms Used │
│  ───────────────────────────────────────────────────  │
│  ring-core              4        4/4      Ring, Add  │
│  uns/core/address        5        5/5      Address…  │
│  uns/core/ring           4        4/4      Neg, Bnot │
│                                                      │
│  Click "ring-core" → zooms to Pipeline view          │
│                                                      │
│  ── PIPELINE VIEW ──────────────────────────────── │
│                                                      │
│  Export              Status     Atom Chain            │
│  ───────────────────────────────────────────────────  │
│  UORRing             GROUNDED   Ring→Add→Mul→Neg→Xor │
│  Q0/Q1/Q2/Q3        GROUNDED   Ring→Add→Mul          │
│                                                      │
│  Click "UORRing" → zooms to Primitive view           │
│                                                      │
│  ── PRIMITIVE VIEW ─────────────────────────────── │
│                                                      │
│  The periodic table grid, filtered to atoms used by  │
│  the selected pipeline. Click any atom → detail panel│
└──────────────────────────────────────────────────────┘
```

## Implementation

### 1. Rewrite `ComplianceDashboardPage.tsx`

**Replace** the current flat table + Top↓/Bottom↑ toggle with:

- **Zoom state**: `zoomLevel: 0|1|2|3` + `zoomContext: string | null` (which parent you zoomed into)
- **Zoom controls**: A discrete 4-stop slider in the top bar, plus `[−]` `[+]` buttons. Keyboard: `-` and `+` keys.
- **Click-to-zoom**: Clicking any row at levels 3/2/1 zooms in and sets `zoomContext` to filter children.
- **Breadcrumb-as-zoom-out**: The breadcrumb path updates with each zoom. Clicking any breadcrumb segment zooms back to that level.
- **Level-specific table renderers**: `SystemTable`, `ModuleTable`, `PipelineTable`, `PrimitiveGrid` — four small inline components, each showing the right columns for its level.
- **Level-specific graph**: Pass zoom level to `ProvenanceGraph` so it renders the appropriate granularity (nodes = layers at L3, modules at L2, exports at L1, atoms at L0).

### 2. Add layer metadata to `provenance-map.ts`

Add a `SYSTEM_LAYERS` constant that groups modules into their 4 layers (already implicit in comments — just formalize):

```typescript
export const SYSTEM_LAYERS = [
  { id: "engine", label: "Engine", modules: ["ring-core", "uns/core/address", "uns/core/ring", "uns/core/identity", "uns/core/keypair"] },
  { id: "names", label: "Name System", modules: ["uns/core/record", "uns/core/resolver", "uns/core/dht"] },
  { id: "build", label: "Build System", modules: ["uns/build/container", "uns/build/uorfile", "uns/build/registry", "uns/build/compose", "uns/build/secrets", "uns/build/snapshot"] },
  { id: "services", label: "Services", modules: ["compose/orchestrator", "compose/app-kernel", "oracle", "identity", "messenger", "donate", "landing", "desktop", "app-store"] },
];
```

### 3. Update `AtomSidebar.tsx`

Add the zoom level indicator and make the sidebar contextual — at System level show layer stats, at Module level show module list, at Pipeline level show exports, at Primitive level show the atom index (current behavior).

### 4. Update `ProvenanceGraph.tsx`

Accept a `zoomLevel` prop. At each level, render different node granularities — layer nodes at L3, module nodes at L2, export nodes at L1, atom nodes at L0.

## Files

| File | Action | Purpose |
|---|---|---|
| `src/modules/canonical-compliance/pages/ComplianceDashboardPage.tsx` | Rewrite | Zoom engine with 4-level navigation |
| `src/modules/canonical-compliance/provenance-map.ts` | Update | Add `SYSTEM_LAYERS` constant |
| `src/modules/canonical-compliance/components/AtomSidebar.tsx` | Update | Context-aware sidebar per zoom level |
| `src/modules/canonical-compliance/components/ProvenanceGraph.tsx` | Update | Zoom-level-aware graph rendering |

~400 lines rewritten, ~80 lines added/updated in supporting files.

