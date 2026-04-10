

# Compliance Layer Naming — Developer-Aligned Refactor

## Analysis

**Current zoom levels** use UOR-internal jargon that would confuse a Red Hat / CNCF engineer:
- L0: "Primitives" — ambiguous (language primitives? UOR primitives?)
- L1: "Pipelines" — overloaded (CI/CD pipelines? data pipelines?)
- L2: "Modules" — acceptable but generic
- L3: "System" — too vague

**Current system layers** (the L3 content) are missing Applications and Protocol:
- Engine, Name System, Build System, Services (Applications are buried inside "Services")

**UOR crate structure** (`docs.rs/uor-foundation`): `kernel` → `bridge` → `user` → `enforcement`

## Proposed Naming

### Zoom Levels (view granularity — how deep you're looking)

Mapped to how a systems engineer navigates any codebase:

| Level | Current | Proposed | Description | Dev mental model |
|-------|---------|----------|-------------|-----------------|
| L0 | Primitives | **Operations** | Atomic ops, types, ring elements | syscalls, instructions |
| L1 | Pipelines | **Exports** | Function chains and public APIs | exported symbols, endpoints |
| L2 | Modules | **Packages** | Logical module groups | crates, npm packages |
| L3 | System | **Architecture** | System-wide layer view | architecture diagram |

"Operations → Exports → Packages → Architecture" is exactly how a developer zooms: from individual function calls, to a module's public surface, to package boundaries, to the full system map.

### System Layers (the L3 architectural tiers)

Aligned with both UOR ontology and CNCF/infrastructure conventions:

| Current | Proposed | UOR mapping | CNCF analog |
|---------|----------|-------------|-------------|
| Engine | **Kernel** | `kernel` (addressing, schema, ops) | Linux kernel |
| Name System | **Protocol** | `bridge` (resolution, queries) | DNS / service discovery |
| Build System | **Runtime** | `enforcement` (containers, images) | containerd / CRI-O |
| Services | **Services** | orchestrator, kernel isolation | platform services |
| *(missing)* | **Applications** | `user` (types, morphisms, state) | workloads / pods |

This gives us 5 layers: **Kernel → Protocol → Runtime → Services → Applications**

### Why this works for a skeptical CNCF engineer

- "Kernel" — immediately understood as the foundation layer
- "Protocol" — name resolution IS a protocol; maps to DNS/service discovery
- "Runtime" — container lifecycle IS runtime; maps to containerd/CRI-O
- "Services" — orchestration, isolation = platform services
- "Applications" — the actual apps (oracle, desktop, landing, app-store)

### Module redistribution for the new layers

```text
Kernel:       ring-core, uns/core/address, uns/core/ring, uns/core/identity, uns/core/keypair
Protocol:     uns/core/record, uns/core/resolver, uns/core/dht
Runtime:      uns/build/container, uns/build/uorfile, uns/build/registry,
              uns/build/compose, uns/build/secrets, uns/build/snapshot
Services:     compose/orchestrator, compose/app-kernel, oracle, identity, messenger
Applications: landing, desktop, app-store, donate
```

## Files to Change

| File | Change |
|---|---|
| `src/modules/canonical-compliance/components/ZoomControls.tsx` | Rename labels + descriptions |
| `src/modules/canonical-compliance/provenance-map.ts` | 5 system layers with new names + module redistribution |
| `src/modules/canonical-compliance/components/LevelTables.tsx` | Update L3 table column headers if needed |
| `src/modules/canonical-compliance/components/ProvenanceGraph.tsx` | Update legend labels |
| `src/modules/canonical-compliance/pages/ComplianceDashboardPage.tsx` | Update any hardcoded label references |

All changes are label/data renames — no structural or logic changes needed.

