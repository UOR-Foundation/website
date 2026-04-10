

# Design Axioms Module — Declarative System Design Parameters

## Concept

The system already enforces **terminology** (ontology module) and **tech selection** (tech-stack.ts) as declarative, auditable registries. What's missing is a third pillar: **design axioms** — the philosophical and aesthetic constraints that make this system feel like itself.

Each axiom is a content-addressed JSON-LD blueprint (like an `AppBlueprint` but for design) that declares a constraint, its rationale, enforcement criteria, and how to verify compliance. Axioms are grouped into swappable **design systems** (e.g., "Algebrica", "Foundation", "Custom") so users can eventually switch or extend them.

## Algebrica Design Axioms (Extracted from Codebase)

From the existing implementation, these are the core Algebrica design principles already embedded but never formally declared:

| # | Axiom | Constraint | Currently Enforced? |
|---|---|---|---|
| A1 | **Monochrome Substrate** | All chrome uses zinc-scale (#0c0c0c → #fafafa). Color is reserved for semantic signals only (error=red, success=green, identity=gold). | No — scattered as inline values |
| A2 | **Golden Ratio Rhythm** | All spacing follows phi-scaled steps (1.618). Already in CSS vars but not enforced. | Partially (CSS vars exist) |
| A3 | **Prime-Based Spacing** | Micro-spacing uses prime numbers (2,3,5,7,11,13...) for non-repeating visual rhythm. | Partially (holo-space vars) |
| A4 | **Content-Addressed Identity** | Every renderable object must have a derivable UOR address. No opaque IDs. | Yes (via singleProofHash) |
| A5 | **Raw Numbers, No Chrome** | Stats display as bold value + tiny label. No cards, no borders, no decorative containers around data. | Informally (StatBlock pattern) |
| A6 | **Radial Topology** | Knowledge visualizations use radial 1-hop layouts with center-focused composition. No force-directed chaos. | Informally (ConceptMap) |
| A7 | **Compositor-First Animation** | All animations use `transform` and `opacity` only (GPU-composited). No layout-triggering properties. | Partially (performance gate) |
| A8 | **Terminal Aesthetic for System Operations** | System-level operations (boot, deploy, inspect) use monospace terminal UI. | Yes (ContainerBootOverlay) |
| A9 | **One Framework Per Function** | No overlapping responsibilities in the stack. Already in tech-stack.ts. | Yes (selection policy) |
| A10 | **Declarative Over Imperative** | All system state is described declaratively (JSON-LD blueprints), never constructed imperatively. | Mostly (AppBlueprints) |
| A11 | **Protective Stillness** | UI reduces visual noise proportional to focus depth. Deep work = less chrome. | Yes (FocusVignette) |
| A12 | **Self-Declaring System** | The system describes its own architecture at boot. No hidden configuration. | Yes (tech-stack manifest) |

## Architecture

```text
src/modules/axioms/
├── types.ts              ← DesignAxiom + DesignSystem types
├── registry.ts           ← The canonical axiom registry (Algebrica defaults)
├── resolve.ts            ← Lookup, filter, query axioms
├── gate.ts               ← Compliance gate: verify axiom adherence
├── index.ts              ← Barrel export
└── module.json           ← Module manifest
```

### DesignAxiom Type (the Blueprint)

```typescript
interface DesignAxiom {
  "@id": string;                    // "axiom:MonochromeSubstrate"
  "@type": "uor:DesignAxiom";
  
  // Identity
  label: string;                    // "Monochrome Substrate"
  category: AxiomCategory;         // "visual" | "interaction" | "architecture" | "data"
  
  // Philosophy  
  principle: string;               // One-sentence law
  rationale: string;               // WHY this constraint exists
  
  // Enforcement
  constraint: AxiomConstraint;     // Machine-readable rule
  verification: VerificationSpec;  // How the gate checks it
  
  // Lineage
  "uor:derivedFrom"?: string;     // Link to UOR axiom
  "skos:related"?: string[];      // Ontology concept links
  
  // Versioning
  version: string;
  supersedes?: string;             // Previous axiom @id
}
```

### DesignSystem (Swappable Axiom Bundle)

```typescript
interface DesignSystem {
  "@id": string;                   // "ds:Algebrica"
  "@type": "uor:DesignSystem";
  label: string;
  version: string;
  axioms: DesignAxiom[];
  cssTokens: Record<string, string>;  // Maps to CSS custom properties
  extends?: string;                   // Parent design system
}
```

### Compliance Gate

The `axioms-compliance-gate.ts` checks:
- **Visual axioms**: CSS token coverage (are golden-ratio vars present? are monochrome values used correctly?)
- **Architecture axioms**: Module patterns (does every module have a manifest? are blueprints declarative?)
- **Interaction axioms**: Animation property validation (only transform/opacity?)
- **Data axioms**: Content-addressing coverage

Each axiom's `verification` field contains a machine-readable spec that the gate interprets — pattern checks, CSS var presence, import analysis.

## How It Works End-to-End

1. **Define**: Axioms are declared in `registry.ts` as a `DesignSystem` — content-addressed, versioned, swappable
2. **Store**: Lives in `src/modules/axioms/` as pure TypeScript (serializable to JSON-LD for the knowledge graph)
3. **Present**: Axioms are queryable via `resolveAxiom()` and renderable via a React hook `useAxiom(id)`
4. **Enforce**: The compliance gate runs all axiom verification specs and reports violations with specific file + line references
5. **Extend**: New axioms are added to the registry; new design systems can extend Algebrica or replace it entirely

## Files

| File | Action | Purpose |
|---|---|---|
| `src/modules/axioms/types.ts` | Create | DesignAxiom, DesignSystem, AxiomCategory, VerificationSpec types |
| `src/modules/axioms/registry.ts` | Create | Algebrica design system with 12 axioms |
| `src/modules/axioms/resolve.ts` | Create | Lookup, filter, React hook |
| `src/modules/axioms/gate.ts` | Create | Compliance gate verifying axiom adherence |
| `src/modules/axioms/index.ts` | Create | Barrel export + gate registration |
| `src/modules/axioms/module.json` | Create | Module manifest |
| `src/modules/canonical-compliance/gates/index.ts` | Update | Register axiom gate |
| `src/modules/canonical-compliance/index.ts` | Update | Re-export axiom types |

