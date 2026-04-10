

# Canonical Ontology Module — W3C SKOS-Based Terminology System

## Assessment

After auditing from a CNCF developer perspective, the system has strong architectural alignment but suffers from three problems:

1. **Terminology fragmentation** — "Sovereign Bus", "Sovereign Boot", "Sovereign Reconciler", "Sovereign Spaces" are opaque to CNCF developers. The word "Sovereign" appears 1,826 times across 157 files but maps to standard concepts (Service Mesh, Init System, Controller, Namespaces).

2. **No single ontology** — terminology mappings exist in three disconnected places: `devops-glossary.ts` (18 entries), `cncf-compat/categories.ts` (22 entries), and `namespace-registry.ts` (16 entries). None are linked. None support multiple audiences.

3. **No enforcement** — the glossary exists but nothing verifies that docstrings, UI labels, or log messages actually use consistent terminology.

## Solution: W3C SKOS Vocabulary Module

**W3C SKOS** (Simple Knowledge Organization System) is the battle-tested standard for exactly this problem — it was designed by W3C specifically for managing controlled vocabularies with multiple labels per concept, multilingual support, and hierarchical relationships. It's used by the EU, Library of Congress, UNESCO, and most knowledge management systems. It already exists in our JSON-LD context (`skos: "http://www.w3.org/2004/02/skos/core#"`).

The plan: create a **single SKOS-based ontology module** that declares every system concept once, with audience-specific labels (developer, user, ML scientist), canonical links to UOR namespaces, and a compliance gate that enforces consistency.

### Architecture

```text
src/modules/ontology/
├── index.ts              ← Barrel export
├── types.ts              ← SKOS concept types  
├── vocabulary.ts         ← THE canonical vocabulary (all concepts)
├── profiles.ts           ← Audience profiles (developer, user, scientist)
├── resolve.ts            ← Lookup: internal term → profile-specific label
├── gate.ts               ← Compliance gate: verify terminology consistency
└── module.json           ← Module manifest
```

### SKOS Concept Model

Each concept in the vocabulary is a W3C SKOS Concept with:

```typescript
interface SkosConcept {
  "@id": string;                    // e.g. "uor:ServiceMesh"
  "@type": "skos:Concept";
  "skos:prefLabel": string;         // Canonical label: "Service Mesh"
  "skos:altLabel": string[];        // ["Sovereign Bus", "Message Bus"]
  "skos:definition": string;        // What it IS
  "skos:scopeNote": string;         // When to use it
  "skos:inScheme": string;          // "uor:SystemOntology"
  "skos:broader"?: string;          // Parent concept
  "skos:narrower"?: string[];       // Child concepts
  "skos:exactMatch"?: string[];     // External URIs (K8s docs, CNCF)
  "skos:related"?: string[];        // Related concepts
  
  // UOR extensions
  "uor:namespace"?: string;         // Canonical UOR namespace prefix
  "uor:cncfCategory"?: string;      // CNCF landscape category
  "uor:k8sEquivalent"?: string;     // K8s resource name
  "uor:cncfProject"?: string;       // CNCF project name
}
```

### Audience Profiles

```typescript
type OntologyProfile = "developer" | "user" | "scientist";

// Developer profile: "Service Mesh", "Container Runtime", "Reconciliation Controller"
// User profile:      "Message System", "App Engine", "Auto-repair"
// Scientist profile: "Communication Graph", "Computation Substrate", "Convergence Loop"
```

Each profile selects which `skos:prefLabel` vs `skos:altLabel` to surface in the UI. The vocabulary is one; the rendering varies.

### Core Vocabulary (~40 concepts)

Consolidating the existing glossary + categories + namespace registry into one canonical list:

| Concept ID | Developer Label | User Label | UOR Namespace | CNCF Match |
|---|---|---|---|---|
| `ServiceMesh` | Service Mesh | Message System | `bus/` | Istio, Linkerd |
| `ContainerRuntime` | Container Runtime | App Engine | `compose/` | containerd |
| `Reconciler` | Reconciliation Controller | Auto-repair | `compose/` | Kubernetes |
| `DeploymentManifest` | Deployment Manifest | App Blueprint | `compose/` | Helm |
| `InitSystem` | Init System | Boot Sequence | `boot/` | systemd |
| `Container` | Container | App Instance | `uns/build/` | Docker |
| `IntegrityAttestation` | Integrity Attestation | Security Seal | `cert/` | Sigstore |
| `HealthProbe` | Liveness Probe | Health Check | `observable/` | K8s probes |
| `ClusterEvent` | Cluster Event | System Event | `observable/` | K8s events |
| `ServiceRegistry` | Service Registry | Module Directory | `bus/` | etcd |
| `ServiceDiscovery` | Service Discovery | Name Lookup | `uns/core/` | CoreDNS |
| `HPA` | Horizontal Pod Autoscaler | Auto-scaler | `compose/` | KEDA |
| `RuntimeSecurity` | Runtime Security | Security Shield | `uns/shield/` | Falco, OPA |
| ... | ... | ... | ... | ... |

### Compliance Gate: `ontology-consistency-gate.ts`

Verifies:
- Every module docstring header uses a term from the vocabulary (not ad-hoc terminology)
- No orphaned terms: every `skos:altLabel` resolves to a known concept
- All CNCF categories have a corresponding ontology concept
- All namespace registry entries have a corresponding ontology concept
- Cross-references: `devops-glossary.ts` entries are a strict subset of the ontology

### Integration Points

1. **Replaces `devops-glossary.ts`** — the ontology subsumes it (backward-compat re-export kept)
2. **Links to `namespace-registry.ts`** — each concept references its UOR namespace
3. **Links to `cncf-compat/categories.ts`** — each concept references its CNCF category
4. **Bus operation** — `bus.call("ontology/resolve", { term, profile })` returns the audience-appropriate label
5. **React hook** — `useOntologyLabel(term, profile)` for UI components

## Files

| File | Action | Purpose |
|---|---|---|
| `src/modules/ontology/types.ts` | Create | SKOS concept types + profile types |
| `src/modules/ontology/vocabulary.ts` | Create | ~40 canonical concepts with full SKOS metadata |
| `src/modules/ontology/profiles.ts` | Create | 3 audience profiles (developer/user/scientist) |
| `src/modules/ontology/resolve.ts` | Create | Lookup functions + React hook |
| `src/modules/ontology/gate.ts` | Create | Ontology consistency compliance gate |
| `src/modules/ontology/index.ts` | Create | Barrel export |
| `src/modules/ontology/module.json` | Create | Module manifest |
| `src/modules/canonical-compliance/devops-glossary.ts` | Update | Re-export from ontology for backward compat |
| `src/modules/canonical-compliance/gates/index.ts` | Update | Register ontology gate |
| `src/modules/canonical-compliance/index.ts` | Update | Export ontology types |

## Technical Notes

- Uses W3C SKOS, which is already declared in our JSON-LD context (`skos` namespace)
- Each concept is valid JSON-LD — can be serialized to the knowledge graph
- The vocabulary is a `skos:ConceptScheme` with a content-addressed CID
- No external dependencies — pure TypeScript, runs in browser
- Profiles are composable: a "devops" profile could extend "developer" with K8s-specific labels

