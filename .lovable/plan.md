

# Docker-Style Container Boot UX + Runtime Inspector

## What We're Building

Two interconnected improvements:

1. **Rewrite `ContainerBootOverlay`** to feel like watching `docker run` — slower, readable terminal output with Docker-exact terminology (pulling image, creating container, attaching volumes, starting process)
2. **Upgrade `ContainerStatusPill` + `ContainerInspector`** to be a delightful, always-visible runtime metadata panel — one click to see everything about the running container (like `docker inspect` meets Kubernetes dashboard)

## Current Problems

- Boot sequence completes in ~50-150ms total — too fast to read anything
- Terminology is internal ("INIT", "KERNEL", "SEAL") — meaningless to Docker/K8s developers
- The status pill after boot is tiny (10px text, 50% opacity) — users don't notice it
- Inspector panel lacks health indicators and graph/package visibility

## Design

### Boot Overlay — Docker `run` Terminal

```text
┌──────────────────────────────────────────────────┐
│  ▸ docker run bp:messenger                        │
│                                                    │
│  Pulling image bp:messenger:1.0.0...         done  │
│  ├─ Layer 1/4: base runtime              ████ 0ms  │
│  ├─ Layer 2/4: kernel permissions         ████ 0ms  │
│  ├─ Layer 3/4: bus namespaces             ████ 0ms  │
│  └─ Layer 4/4: component bundle           ████ 0ms  │
│  Image digest: sha256:a1b2c3d4...                  │
│                                                    │
│  Creating container uor:messenger-ct...      done  │
│  Attaching volumes: 4 ns · 12 ops            done  │
│  Starting process...                          done  │
│  Sealing runtime: sha256:e5f6...              done  │
│                                                    │
│  ● Container messenger is running (238ms)          │
└──────────────────────────────────────────────────┘
```

Key UX decisions:
- **Minimum display time: 1.2s** — each phase gets at least 180ms so users can read it
- **Progressive reveal** — lines appear one at a time with a typewriter feel
- **Real data** — container IDs, namespace counts, seal hashes are live
- **Green monospace terminal** aesthetic on dark background

### Runtime Inspector — "Container Details" Pill

After boot, a refined status pill (bottom-left) shows:
```
● messenger  running  4ns · 12ops  ⓘ
```

Clicking opens a **3-tab inspector panel**:

**Tab 1: Overview** (docker inspect)
- Container ID, Image, State, Uptime, Created
- Seal hash, Boot time
- Resource usage (calls, denied, payload bytes)

**Tab 2: Packages** (docker image layers / npm ls)  
- Kernel namespaces as "packages" with operation counts
- Permission grants per namespace
- Expandable operation list per namespace

**Tab 3: Graph** (knowledge graph context)
- Node/relation counts
- 1-hop concept map (existing GraphQuickView inline)
- "Open Full Graph" action

### New Compliance Gate

A **Container Boot Integrity Gate** added to the compliance system:
- Verifies all blueprints resolve to valid components
- Checks that every boot phase produces real data (not fallback stubs)
- Flags boot times >2s as degraded
- Reports container seal coverage

## Implementation

### Files

| File | Action | Purpose |
|---|---|---|
| `src/modules/desktop/components/ContainerBootOverlay.tsx` | **Rewrite** | Docker-style terminal boot with phased timing |
| `src/modules/desktop/components/ContainerInspector.tsx` | **Rewrite** | 3-tab inspector with Packages + Graph tabs |
| `src/modules/canonical-compliance/gates/container-boot-gate.ts` | **Create** | Boot integrity compliance gate |
| `src/modules/canonical-compliance/gates/index.ts` | **Update** | Register new gate |

### ContainerBootOverlay Rewrite (~220 lines)

- Replace 6 generic phases with Docker-mapped steps:
  - `pull` → "Pulling image bp:{appId}:{version}" — calls `getBlueprint()`, shows 4 sub-layers (runtime, permissions, namespaces, bundle)
  - `create` → "Creating container uor:{containerId}" — calls `orchestrator.ensureRunning()`
  - `attach` → "Attaching volumes: {N} ns · {M} ops" — reads kernel permissions
  - `start` → "Starting process..." — component ready
  - `seal` → "Sealing runtime: sha256:{hash}" — calls `kernel.seal()`
  - `ready` → "● Container {name} is running ({totalMs}ms)"
- Each step renders as a terminal line with left-aligned label and right-aligned status
- Sub-layers under "pull" show progress bars (4 small bars that fill sequentially)
- Minimum 180ms per step, total minimum 1.2s display time
- Image digest shown after pull completes
- Monospace font, dark terminal background, green/white/dim-gray palette

### ContainerInspector Rewrite (~280 lines)

- **Pill redesign**: Slightly larger (12px text), 70% opacity default, green dot + app name + state + counts
- **Panel**: 320px wide, 3 tabs at top (Overview / Packages / Graph)
  - Overview: existing metrics + boot receipt data in labeled rows
  - Packages: namespace tree with op counts, expandable (reuses existing graph view data)
  - Graph: inline ConceptMap (reuses GraphQuickView logic without the overlay)
- Panel slides up from pill position with subtle animation

### Container Boot Gate (~80 lines)

Checks:
- All `STATIC_BLUEPRINTS` have valid `name` and `requires` fields
- Blueprint count matches expected active module count
- Boot phase naming follows Docker convention (pull/create/attach/start/seal)
- Reports coverage: X/Y blueprints have complete permission declarations

