
# UOR Semantic Web Infrastructure — Gap Analysis and Integration Plan

## Current Status

All 17 modules exist and are individually functional. The core algebraic pipeline (Ring -> Identity -> Triad -> Derivation -> KG Store -> SPARQL -> Agent Tools -> Self-Verify) is complete and passing verification. However, several integration gaps prevent full end-to-end coherence.

---

## Identified Gaps

### Gap 1: Dashboard Missing "Sessions" Navigation Link
The dashboard sidebar `NAV_ITEMS` array (line 22-32 of `DashboardPage.tsx`) lists 9 routes but **omits `/sessions`** (State Explorer). This is a dead end — the Sessions page exists and works, but is unreachable from the dashboard.

**Fix:** Add `{ path: "/sessions", label: "Sessions", icon: Layers }` to `NAV_ITEMS`.

### Gap 2: Route Table Incomplete
`src/data/route-table.ts` is missing 4 routes that exist in `App.tsx`:
- `/ring-explorer` (Ring Explorer)
- `/derivation-lab` (Derivation Lab)
- `/knowledge-graph` (Knowledge Graph)
- `/sessions` (State Explorer / Sessions)

These routes are functional but not registered in the canonical route table, which means they are excluded from UOR content certification.

**Fix:** Add all 4 missing entries to `routeTable`.

### Gap 3: Dashboard Module Health Grid Missing "state"
The `MODULES` array (line 36-39 of `DashboardPage.tsx`) lists 17 modules but **omits "state"**. The state module exists, has a `module.json`, and passes verification, but it does not appear in the health grid.

**Fix:** Add `"state"` to the `MODULES` array (replacing or supplementing the current 17 — the dashboard itself is not a "health-checkable" module, so "state" should take one of the slots or be appended).

### Gap 4: State Module Missing Multi-Agent Persistence Helpers
The database tables `uor_contexts`, `uor_bindings`, `uor_frames`, and `uor_transitions` were created in the last migration, but `src/modules/state/state.ts` has **no TypeScript functions** to read/write these tables. The current state module only uses `uor_state_frames` for single-value state computation.

**Fix:** Add persistence helpers in `state.ts`:
- `createContext(quantum, capacity)` -> inserts into `uor_contexts`
- `addBinding(contextId, address, content)` -> inserts into `uor_bindings`
- `captureFrame(contextId, bindings)` -> inserts into `uor_frames`
- `recordTransition(fromFrame, toFrame, contextId, added, removed)` -> inserts into `uor_transitions`
- `getContextFrames(contextId)` -> queries `uor_frames`

### Gap 5: Dashboard "Quick Query" (SPARQL) Section Missing
The Module 17 specification calls for an inline SPARQL query tool in Row 3 ("Quick Query: inline SPARQL -> execute -> show top 5 results with grades"). The current dashboard has "Quick Navigation" in that slot instead.

**Fix:** Replace the "Quick Navigation" card with a "Quick Query" card that has a SPARQL input, execute button, and results display (reusing `executeSparql` from `src/modules/sparql/executor.ts`).

### Gap 6: Self-Verify `withVerifiedReceipt` Not Wrapped Around All Module Operations
The spec requires wrapping **all** major module operations with receipt generation. Currently:
- `uor_derive` in agent-tools: **Wrapped** (via `generateReceipt`)
- State module `computeStateFrame`: **Wrapped** (via `withVerifiedReceipt` in `SessionsPage.tsx`)
- `ingestDatum` in kg-store: **Not wrapped**
- `executeSparql` in SPARQL: **Not wrapped**
- `correlate` in resolver: **Not wrapped** (only called directly)
- `computePartition` in resolver: **Not wrapped**

**Fix:** The agent-tools already generate receipts for the 5 canonical tool calls. The remaining store-level operations (`ingestDatum`, `executeSparql`) should be optionally receipt-wrapped when called from UI pages. This is a minor enhancement — add `withVerifiedReceipt` calls in the KG page and SPARQL page components.

---

## Technical Implementation Details

### Files to Modify

1. **`src/modules/dashboard/pages/DashboardPage.tsx`**
   - Add `/sessions` to `NAV_ITEMS` array
   - Add `"state"` to `MODULES` array
   - Replace "Quick Navigation" card with "Quick Query" SPARQL card
   - Import `executeSparql` from `@/modules/sparql/executor`

2. **`src/data/route-table.ts`**
   - Add 4 missing route entries: `/ring-explorer`, `/derivation-lab`, `/knowledge-graph`, `/sessions`

3. **`src/modules/state/state.ts`**
   - Add persistence functions for `uor_contexts`, `uor_bindings`, `uor_frames`, `uor_transitions` tables
   - Each function uses the existing Supabase client pattern

4. **`src/modules/state/index.ts`**
   - Export the new persistence functions

### Files NOT Modified (already correct)
- All 17 module source files (ring-core, identity, triad, derivation, jsonld, kg-store, resolver, sparql, shacl, code-kg, semantic-index, agent-tools, epistemic, morphism, self-verify, state, dashboard)
- `src/App.tsx` (all routes registered)
- All test files (passing)
- All module.json manifests
- Database migrations and RLS policies

---

## Verification After Implementation

Once these 6 gaps are closed:
1. Every route is in the canonical route table (content-certifiable)
2. Every module appears in the dashboard health grid
3. Every page is reachable from the dashboard sidebar (no dead ends)
4. State module can persist multi-agent evaluation contexts end-to-end
5. Quick SPARQL queries work from the dashboard
6. The system maintains: **neg(bnot(x)) = succ(x) -- VERIFIED -- ALL SYSTEMS OPERATIONAL**
