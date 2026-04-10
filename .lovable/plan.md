

# Master Gate — Coherence Analysis + Comprehensive System Health

## Overview

Create a **Master Gate** that runs a pre-flight coherence analysis on all registered gates before executing them, then produces a comprehensive markdown-exportable report. The master gate operates in three phases:

1. **Phase 1: Gate Coherence Analysis** — Inspect all gate metadata for conflicts, overlaps, and redundancies using categorical reasoning
2. **Phase 2: Quality Threshold Check** — Only proceed if coherence score meets minimum threshold (default 70/100)
3. **Phase 3: Full Execution + Self-Reflection** — Run all gates, then analyze the aggregate results for systemic patterns and improvement proposals

## Architecture

```text
┌────────────────────────────────────────────────────┐
│                   MASTER GATE                      │
│                                                    │
│  Phase 1: Coherence Pre-flight                     │
│  ├─ Overlap Detection (finding intersection)       │
│  ├─ Contradiction Detection (conflicting verdicts) │
│  ├─ Redundancy Analysis (subsumption check)        │
│  ├─ Coverage Gaps (unmapped UOR categories)         │
│  └─ Consolidation Proposals                        │
│                                                    │
│  Phase 2: Threshold Gate (coherence ≥ 70)          │
│  └─ Abort with report if incoherent                │
│                                                    │
│  Phase 3: Full Execution + Reflection              │
│  ├─ Run all sync + async gates                     │
│  ├─ Cross-gate pattern analysis                    │
│  ├─ Self-improvement proposals                     │
│  └─ Comprehensive markdown report                  │
└────────────────────────────────────────────────────┘
```

## Categorical Reasoning Applied

The coherence analysis uses category-theoretic concepts already in the codebase (`graph-morphisms.ts`):

- **Overlap = Pullback**: Two gates share a common sub-domain (same files, same checks). Detected by comparing finding titles and file references across gate pairs.
- **Contradiction = Non-commutativity**: Gate A says "pass" on a domain that Gate B says "fail". Detected by comparing status verdicts on overlapping domains.
- **Redundancy = Epimorphism**: Gate A's findings are a strict subset of Gate B's — A is subsumed and can be folded into B.
- **Coverage gap = Missing arrow**: A UOR namespace or ontology concept has no gate checking it.
- **Consolidation = Coequalizer**: Two gates with overlapping domains can be merged into one that covers both.

## Implementation

### File 1: `src/modules/canonical-compliance/gates/master-gate.ts` (new)

**Gate Coherence Analysis (Phase 1):**
- Enumerate all registered gates by running them once in "dry-run" mode (they're pure functions, so this is safe)
- Build a **domain matrix**: for each gate, extract the set of files, modules, and ontology IDs it references from its findings
- Compute pairwise Jaccard similarity on domain sets to detect overlaps
- Flag contradictions where two gates give opposing verdicts on the same file/module
- Identify subsumption where one gate's domain is a strict subset of another's
- Check that every UOR namespace in the ontology has at least one gate covering it
- Produce consolidation proposals for gates with >60% domain overlap

**Threshold Gate (Phase 2):**
- Coherence score = 100 minus deductions for contradictions (10 each), high overlaps (3 each), coverage gaps (5 each)
- If coherence < 70, return early with a detailed report of why the gates are incoherent
- This prevents running an incoherent gate suite that would produce misleading results

**Full Execution + Self-Reflection (Phase 3):**
- Run `runAllGatesAsync()` to get all gate results
- Cross-gate pattern analysis: cluster findings by file, by severity, by module to find systemic hotspots
- Self-improvement proposals: for each cluster of 3+ findings on the same file, propose a targeted gate or gate amendment
- Score distribution analysis: flag gates that always score 100 (potentially too lenient) or always 0 (potentially broken)

**Markdown Report:**
- Executive summary with composite score and coherence score
- Coherence analysis section with overlap matrix, contradictions, and consolidation proposals
- Per-gate results (reusing existing `exportGatesMarkdown` format)
- Systemic hotspot analysis
- Self-improvement recommendations
- Footer with timestamp and gate count

### File 2: `src/modules/canonical-compliance/gates/index.ts` (update)

- Add `import "./master-gate"` to register the master gate
- Export `runMasterGate` and `exportMasterGateMarkdown` from the barrel

### File 3: `src/modules/canonical-compliance/gates/gate-runner.ts` (update)

- Export `getRegisteredGateCount()` and `getRegisteredGates()` so the master gate can introspect the registry
- Add `MasterGateReport` type extending `GateReport` with coherence analysis fields

## Report Structure

```text
# Master Gate Report
## Executive Summary
- Composite Score: 84/100
- Coherence Score: 92/100
- Gates Executed: 15
- Systemic Hotspots: 3

## Phase 1: Gate Coherence Analysis
### Overlap Matrix
| Gate A | Gate B | Overlap | Action |
### Contradictions (0 found)
### Coverage Gaps
- Namespace "quantum:" has no dedicated gate
### Consolidation Proposals
- Merge "SKOS Conformance" + "Ontology Consistency" (72% overlap)

## Phase 2: Threshold — PASSED (92/100)

## Phase 3: Gate Results
[... per-gate detail ...]

## Systemic Analysis
### Hotspot Files (3+ findings)
### Score Distribution
### Self-Improvement Proposals
- Gate "Canonical Pipeline" has 13 static bypasses — consider auto-resolution
- Gate "Provenance Coverage" overlaps 40% with "Graph Anchor" — unify domain
```

## Files Summary

| File | Action | Purpose |
|---|---|---|
| `src/modules/canonical-compliance/gates/master-gate.ts` | Create | Master gate with 3-phase execution |
| `src/modules/canonical-compliance/gates/gate-runner.ts` | Update | Expose registry introspection + MasterGateReport type |
| `src/modules/canonical-compliance/gates/index.ts` | Update | Register master gate + export runner |

