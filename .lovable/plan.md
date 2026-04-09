

## System Health Report Review & Lean Architecture Plan

### What the Report Tells Us

The report is already strong — it covers seal integrity, kernel primitives, tech stack selection, hardware profiling, and degradation tracking. But it has two blind spots and the codebase has clear consolidation opportunities.

### Key Findings from Codebase Audit

**By the numbers:**
- **40 module directories** on disk (target: ≤30)
- **191,805 lines** of TypeScript across modules
- Top 5 modules alone = **116,107 lines** (60% of total)
- The pruning gate's `KNOWN_MODULES` list is **stale** — 17 real modules aren't tracked (atlas, quantum, desktop, boot, engine, audio, etc.)
- The `CONSOLIDATION_MAP` references modules already absorbed but directories still exist on disk

**Immediate consolidation targets (small modules that belong inside parents):**

| Module | Lines | Absorb Into | Rationale |
|--------|-------|-------------|-----------|
| `triad` | 70 | `ring-core` | Already noted in CONSOLIDATION_MAP but dir still exists |
| `donate` | 441 | `community` | Already noted but dir still exists |
| `jsonld` | 1,767 | `knowledge-graph` | Already noted but dir still exists |
| `shacl` | 1,906 | `sparql` | Already noted but dir still exists |
| `qr-cartridge` | 958 | `identity` | Already noted but dir still exists |
| `messenger` | 1,235 | `oracle` or `community` | Small chat UI, no unique kernel function |
| `data-bank` | 2,438 | `sovereign-vault` | Both are storage-focused; merge |

**Large module review:**
- `quantum` (13,422 lines) — only imported by 2 test files externally. Nearly self-contained. Consider if it should be a lazy-loaded extension rather than a core module.
- `atlas` (26,776 lines) — heavily imported (55 files). Core mathematical layer. Keep, but audit for dead files.

### Report Improvements — What to Add

**1. Pruning Gate Sync (fix the stale registry)**
The `KNOWN_MODULES` array in `pruning-gate.ts` is missing 17 modules that actually exist on disk. This means the module count metric (showing ~37) is wrong — reality is 40. Fix by auto-deriving from the filesystem or maintaining the list accurately.

**2. Add "Module Weight" Section to the Report**
Show lines-of-code per module so the report itself surfaces bloat. The top 5 modules are 60% of the codebase — the report should flag this.

**3. Add "Consolidation Debt" Section**
The CONSOLIDATION_MAP lists 10 modules as "absorbed" but their directories still exist. The report should track this debt and flag stale directories.

**4. Implement the Missing Self-Assessment Metrics**
The report lists 12 metrics, 10 untracked (13% coverage). Prioritize these 4 high-value, low-effort additions:
- **IndexedDB Quota** — `navigator.storage.estimate()` (3 lines)
- **JS Heap Usage** — `performance.memory` (already partially done in sparklines)
- **Ring Operation Throughput** — time 1000 `add()` calls (5 lines)
- **Boot Phase Timing** — break 750ms into stage-level detail

**5. Add "Module Dependency Depth" Metric**
Track how many cross-module imports each module has. Modules with >10 external imports are coupling risks.

### Implementation Plan

**Step 1 — Sync Pruning Gate Registry**
Update `KNOWN_MODULES` in `pruning-gate.ts` to include all 40 actual modules. Remove references to modules that no longer exist. Mark absorbed modules.

**Step 2 — Execute Consolidations (7 merges)**
Move the 7 small modules listed above into their parent modules. Update all import paths. Delete empty directories. This removes ~8,815 lines of organizational overhead and reduces module count from 40 to 33.

**Step 3 — Enhance Report Generation**
Add to the System Monitor's "Export Report" function:
- Module weight table (lines per module, sorted descending)
- Consolidation debt tracker (absorbed modules with stale directories)
- 4 new self-assessment metrics (heap, IndexedDB quota, ring throughput, boot phases)

**Step 4 — Add Lazy Boundaries**
Mark `quantum` and `atlas` as lazy-loaded — they should not increase boot time unless accessed. Verify they aren't imported in the boot path.

### Technical Details

Files to modify:
- `src/modules/uns/core/pruning-gate.ts` — sync KNOWN_MODULES, add weight analysis
- `src/modules/boot/SystemMonitorApp.tsx` — add new report sections
- `src/modules/boot/useBootStatus.ts` — add heap/quota/throughput metrics
- 7 module directories to merge (update imports across ~20 files)
- `src/modules/bus/modules/index.ts` — remove absorbed module registrations if applicable

