

# Concise Health Report with Rich Copy

## Problem
The visual panel shows every tech stack component equally, making it hard to scan. The copied markdown report lacks depth (no selection criteria, no kernel function mapping, no timing breakdown). The UI needs to be scannable; the clipboard needs to be comprehensive.

## Design

### Visual Panel (what the user sees)
Restructure the panel into 3 tiers of progressive disclosure:

1. **Hero summary** (always visible): Status dot + label, seal glyph, boot time, last verified — 4 lines max
2. **Kernel Functions** (keep as-is): P₀–P₆ with framework + status dot — already concise
3. **Issues only** (conditional): Only show degradation entries and failing/missing tech stack components. Hide all green/passing components. If everything is healthy, show a single "All 23 components operational" line instead of the full table
4. **Collapsed sections**: Device Context and Selection Policy move behind a "Show Details" toggle — they're reference material, not monitoring data

Remove from default view:
- Full tech stack table (replace with issue-only list + summary count)
- Selection Policy section (move behind toggle)
- Stack hash display (only in copied report)
- Monitoring section rows for "Sealed At" (redundant with seal section)

### Copied Markdown Report (what gets copied)
Enhance `formatMarkdownReport` to include:

1. **Kernel Functions table**: P₀–P₆ with name, framework, status, ring basis
2. **Selection Policy**: The 7 criteria listed in the report
3. **Per-component selection criteria**: For each tech stack entry, include license, standard, portability, adoption signal
4. **Categorized tech stack**: Group components by category (critical/recommended/optional) instead of flat list
5. **Timing breakdown**: Boot time, seal time, verification interval
6. **Environment details**: WASM support, SIMD support, SharedArrayBuffer availability
7. **Recommendations section**: For each degradation, add a "Recommended Action" field

## Files Changed

| File | Change |
|------|--------|
| `src/modules/boot/EngineStatusIndicator.tsx` | Restructure panel UI: hero summary, issues-only stack view, collapsible details toggle. Enhance `formatMarkdownReport` with kernel table, selection criteria, categorized stack, recommendations |

## Implementation Details

- Add `showDetails` state toggle for Device Context and Selection Policy
- Filter `receipt.stackHealth.components` to only show `!available` in default view
- Add a summary line: `"{available}/{total} components operational"`
- In `formatMarkdownReport`: add `## Kernel Functions` table, `## Selection Policy` section, expand tech stack with per-entry criteria columns, add `## Recommendations` section from degradation entries
- No new dependencies, no API changes

