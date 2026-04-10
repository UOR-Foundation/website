

# Health Gate System — Systematic Bypass Detection & Compliance Enforcement

## Problem Identified

After auditing the codebase, here are the concrete bypass patterns found:

### 1. Raw SHA-256 Bypassing `singleProofHash()` Pipeline
**21 files** import `sha256hex` from `@/lib/crypto` and use it for direct string hashing, bypassing the canonical URDNA2015 → SHA-256 → UOR identity pipeline. Key offenders:

- `diffusion/compiler.ts` — defines its **own local `sha256Hex()` function** (lines 91-97), completely duplicating `@/lib/crypto`
- `certificate/boundary.ts` — hashes boundary keys with raw `sha256hex()` instead of canonicalization
- `code-kg/analyzer.ts` + `analyzer-rust.ts` — hashes entities with raw sha256 instead of `singleProofHash()`
- `data-bank/lib/sync.ts` — content-addresses slots with raw sha256
- `knowledge-graph/lib/schema-templates.ts` — schema CIDs from raw sha256
- `knowledge-graph/raw-store.ts` — raw hashes for audit records
- `boot/tech-stack.ts` — stack fingerprint via raw sha256
- `boot/reflection-chain.ts` — reflection entries via raw sha256
- `sovereign-spaces/sync/change-dag.ts` — change CIDs via raw sha256
- `uns/mesh/triple-dedup.ts` + `sync-protocol.ts` — mesh message CIDs via raw sha256
- `time-machine/checkpoint-capture.ts` — checkpoint hashes via raw sha256
- `donate/DonatePopup.tsx` + `community/DonatePopup.tsx` — **duplicate components** both using raw sha256

### 2. Duplicate Components
- `src/modules/donate/components/DonatePopup.tsx` and `src/modules/community/components/DonatePopup.tsx` — identical file, two locations
- The pruning gate lists `donate` as absorbed into `community`, but the original still exists

### 3. Missing Provenance Registry Entries
The `PROVENANCE_REGISTRY` in `provenance-map.ts` only covers ~19 modules. Missing modules that exist in the codebase:
- `knowledge-graph`, `data-bank`, `sovereign-spaces`, `time-machine`, `code-kg`, `certificate`, `verify`, `bus`, `trust-graph`, `atlas`, `quantum`, `mcp`, `hologram-ui`, `audio`, `agent-tools`, `console`, `bitcoin`, `community`, `morphism`, `derivation`, `epistemic`, `sparql`, `state`, `observable`, `resolver`, `sovereign-vault`, `uor-sdk`, `projects`, `qsvg`

## Solution: Health Gate System

### Architecture

A pluggable gate runner that lives in `canonical-compliance`, producing structured reports exportable as Markdown. Each gate is a pure function: `() => GateReport`. New gates can be added over time.

```text
┌─────────────────────────────────────────────────────────┐
│  Compliance Dashboard                                    │
│  [Provenance Graph]  [Health Gates]     ← new tab        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  GATE                        STATUS    SCORE   DETAILS   │
│  ─────────────────────────── ──────── ─────── ────────   │
│  Canonical Pipeline Gate      ● PASS   92%    [View]     │
│    sha256hex bypass: 15 files                            │
│    local sha256 dupes: 1 file                            │
│                                                          │
│  Provenance Coverage Gate     ● WARN   40%    [View]     │
│    19/48 modules registered                              │
│    29 modules untraced                                   │
│                                                          │
│  Duplicate Detection Gate     ● FAIL   85%    [View]     │
│    2 duplicate components                                │
│    1 absorbed module still active                         │
│                                                          │
│  Module Hygiene Gate          ● PASS   94%    [View]     │
│    37 active, 13 absorbed                                │
│                                                          │
│  [ Export All Gates as Markdown ]                         │
└─────────────────────────────────────────────────────────┘
```

### Implementation

#### 1. Create Gate Runner Engine (~120 lines)
**File**: `src/modules/canonical-compliance/gates/gate-runner.ts`

```typescript
interface GateResult {
  id: string;
  name: string;
  status: "pass" | "warn" | "fail";
  score: number;           // 0-100
  findings: GateFinding[];
  timestamp: string;
}
interface GateFinding {
  severity: "error" | "warning" | "info";
  title: string;
  detail: string;
  file?: string;
  recommendation?: string;
}
type Gate = () => GateResult;
```

A registry of gates. `runAllGates()` executes them all, returns a combined report. `exportGatesMarkdown()` produces a detailed Markdown file.

#### 2. Canonical Pipeline Gate (~80 lines)
**File**: `src/modules/canonical-compliance/gates/canonical-pipeline-gate.ts`

Statically detects bypass patterns:
- Counts modules using `sha256hex` directly vs `singleProofHash`
- Flags any file that defines its own local hash function
- Reports ratio of canonical vs raw hash calls
- Produces per-file findings with recommendations to rewire

#### 3. Provenance Coverage Gate (~60 lines)
**File**: `src/modules/canonical-compliance/gates/provenance-coverage-gate.ts`

Compares `ACTIVE_MODULES` list from pruning-gate against `PROVENANCE_REGISTRY` entries. Flags every active module that has no provenance mapping — meaning it can't be traced back to UOR atoms.

#### 4. Duplicate Detection Gate (~70 lines)
**File**: `src/modules/canonical-compliance/gates/duplicate-detection-gate.ts`

Cross-references `ABSORBED_MODULES` from pruning-gate against actual `PROVENANCE_REGISTRY` and known file paths. Flags:
- Absorbed modules that still appear in the active registry
- Known duplicate component paths (donate/DonatePopup vs community/DonatePopup)
- Multiple files exporting the same function name from different locations

#### 5. Module Hygiene Gate (wrapper) (~30 lines)
**File**: `src/modules/canonical-compliance/gates/hygiene-gate.ts`

Wraps the existing `pruningGate()` into the standard `Gate` interface so it shows alongside the other gates.

#### 6. Health Gates UI Tab (~180 lines)
**File**: `src/modules/canonical-compliance/components/HealthGatesPanel.tsx`

A new tab in `ComplianceDashboardPage` (alongside Table/Graph views) showing:
- Gate list with status dots (green/amber/red), scores, and expandable findings
- Each finding shows severity icon, title, detail, file path, and recommendation
- "Export All as Markdown" button generates a comprehensive report
- Per-gate "View Details" expansion with collapsible finding groups
- Monochrome Algebrica-style aesthetic consistent with the existing compliance page

#### 7. Update ComplianceDashboardPage (~25 lines changed)
Add a third view mode `"gates"` alongside `"table"` and `"graph"`, with a Shield icon in the toolbar toggle.

#### 8. Fix Known Bypasses (~40 lines across files)
- **`diffusion/compiler.ts`**: Replace local `sha256Hex` with import from `@/lib/crypto`
- **`donate/DonatePopup.tsx`**: Delete the file, ensure the `community/DonatePopup.tsx` version is the canonical one (it already is — donate is absorbed into community)

## Files

| File | Action | Lines |
|---|---|---|
| `src/modules/canonical-compliance/gates/gate-runner.ts` | Create | ~120 |
| `src/modules/canonical-compliance/gates/canonical-pipeline-gate.ts` | Create | ~80 |
| `src/modules/canonical-compliance/gates/provenance-coverage-gate.ts` | Create | ~60 |
| `src/modules/canonical-compliance/gates/duplicate-detection-gate.ts` | Create | ~70 |
| `src/modules/canonical-compliance/gates/hygiene-gate.ts` | Create | ~30 |
| `src/modules/canonical-compliance/components/HealthGatesPanel.tsx` | Create | ~180 |
| `src/modules/canonical-compliance/pages/ComplianceDashboardPage.tsx` | Update | ~25 lines |
| `src/modules/uns/core/hologram/diffusion/compiler.ts` | Update | ~5 lines (fix local sha256 dupe) |

