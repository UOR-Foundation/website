

# Ontology Profile Switcher — Live Persona Showcase

## What We're Building

A new **Ontology tab** in the Compliance Dashboard (alongside Table, Graph, Gates) that provides:

1. **Profile Switcher** — Three toggle buttons (Developer / User / Scientist) at the top. Clicking one instantly re-renders all terminology in the selected persona.

2. **Live Vocabulary Table** — Shows every SKOS concept with columns: `@id`, current profile label, definition, UOR namespace, and schema.org mapping. The label column updates instantly when switching profiles, making the translation layer visible and auditable.

3. **Active Profile Indicator** — A small chip in the Compliance Dashboard top bar showing the current profile (e.g. "Profile: Developer") so it's always visible regardless of which tab you're on.

4. **Diff Preview** — When hovering or clicking a concept row, a mini panel shows all three profile labels side-by-side so you can see exactly how the same concept translates across audiences.

## Why This Architecture

- **Single input**: The vocabulary in `vocabulary.ts` remains the sole source. The UI only reads from `ALL_CONCEPTS` and calls `labelForProfile()`.
- **No duplication**: No new data structures — the existing `SkosConcept.uor:profileLabels` is the complete translation layer.
- **Swappable**: Because every label resolves through `labelForProfile()`, adding a 4th profile (e.g. "executive") is a single type extension + vocabulary update — the UI auto-adapts.
- **Globally wirable**: The profile selector can later be lifted to a React context, making `useOntologyLabel` profile-aware across the entire system.

## Files

| File | Action | Purpose |
|---|---|---|
| `src/modules/canonical-compliance/components/OntologyPanel.tsx` | Create | Profile switcher + live vocabulary table + diff preview |
| `src/modules/canonical-compliance/pages/ComplianceDashboardPage.tsx` | Update | Add 4th view tab ("Ontology" with BookOpen icon), render OntologyPanel, add profile indicator chip |

## Implementation Detail

**OntologyPanel.tsx**: 
- State: `profile: OntologyProfile` (default "developer")
- Renders 3 profile toggle buttons with `describeProfile()` tooltips
- Maps `ALL_CONCEPTS` into a table with sortable columns
- Label column calls `labelForProfile(concept, profile)` reactively
- Row expansion shows all 3 labels + `skos:exactMatch` + `skos:closeMatch` links
- Search filter across `@id`, prefLabel, altLabels

**ComplianceDashboardPage.tsx**:
- Add `"ontology"` to the view union type
- Add BookOpen icon tab button next to the gates tab
- Render `<OntologyPanel />` when view === "ontology"

