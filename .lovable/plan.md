

## Plan: Edge-Defined Nodes — UOR Object Blueprints with Dehydration/Rehydration

### The Insight

The existing infrastructure is 80% there. The holographic lens system already has `dehydrate()` (object → canonical UOR form) and `rehydrate()` (canonical form → object). The KG already stores edges as first-class triples. What's missing is the **bridge**: a formal `ObjectBlueprint` schema that defines a node purely by its attribute edges, and the runtime functions to decompose any KG node into that blueprint and reconstruct it back.

The key shift: instead of a KGNode being a flat bag of properties with edges attached, the **edges become the definition** — the node is nothing more than what its edges declare. The `properties` field on KGNode becomes derived from edges, not the other way around.

### Architecture

```text
Any Object
    ↓ decomposeToBlueprint()
ObjectBlueprint (JSON-LD, serializable, shareable)
  ├── spaceDefinition: { kind, domain, rdfType }
  ├── attributes: [ { predicate, valueType, value?, targetAddress? } ]
  ├── compositionRules: [ { parentPredicate, childBlueprint? } ]
  └── derivationRules: [ { operation, inputs[] } ]
    ↓ content-address via singleProofHash()
GroundBlueprint (blueprint + UOR identity)
    ↓ materializeFromBlueprint()
Fully reconstructed KGNode + all edges
```

### Changes

**1. New: `src/modules/knowledge-graph/blueprint.ts`**

The core module. Contains:

- `ObjectBlueprint` interface — the JSON-LD schema that defines a node by its attributes/edges:
  ```
  {
    "@context": "https://uor.foundation/contexts/object-blueprint-v1.jsonld",
    "@type": "uor:ObjectBlueprint",
    spaceDefinition: { kind, localDomain, rdfType },
    attributes: [
      { predicate: "schema:hasColumn", valueType: "reference", targetAddress: "urn:uor:column:..." },
      { predicate: "schema:name", valueType: "literal", value: "revenue.csv" },
      { predicate: "schema:dateCreated", valueType: "literal", value: "2026-04-09" }
    ],
    compositionRules: [
      { parentPredicate: "schema:hasPart", decomposition: "recursive" }
    ],
    derivationRules: [
      { operation: "sha256", inputs: ["content-bytes"], plan: "UOR-v2" }
    ]
  }
  ```

- `GroundObjectBlueprint` — blueprint + UOR identity (via `singleProofHash`)

- `decomposeToBlueprint(nodeAddress: string): Promise<GroundObjectBlueprint>` — reads a KGNode + all its outgoing edges from the store, converts the node's properties into attribute entries with `valueType: "literal"`, converts edges into attribute entries with `valueType: "reference"`, and content-addresses the whole blueprint. This is **dehydration at the KG level**.

- `materializeFromBlueprint(blueprint: ObjectBlueprint): Promise<{ node: KGNode, edges: KGEdge[] }>` — takes a blueprint and produces the KGNode + edges, computing the UOR address from the blueprint's content hash. This is **rehydration at the KG level**. Does not write to the store — caller decides.

- `decomposeRecursive(nodeAddress: string, maxDepth?: number): Promise<GroundObjectBlueprint>` — follows reference attributes recursively, embedding child blueprints inline up to `maxDepth`. Produces a single self-contained blueprint for an entire subgraph.

- `serializeBlueprint(bp: GroundObjectBlueprint): string` — deterministic JSON serialization (sorted keys)

- `deserializeBlueprint(json: string): GroundObjectBlueprint` — parse + validate

- `verifyBlueprint(bp: GroundObjectBlueprint): Promise<boolean>` — recompute the UOR address from the blueprint content and check it matches the stored identity. Integrity verification.

**2. New: `src/modules/knowledge-graph/blueprint-registry.ts`**

A type registry mapping `rdfType` → attribute schema expectations. This ensures blueprints conform to known types:

- `registerNodeType(rdfType: string, schema: AttributeSchema)` — registers what attributes a node of this type must/may have
- `validateBlueprint(bp: ObjectBlueprint): ValidationResult` — checks a blueprint against the registered schema for its `rdfType`
- Pre-registers the existing types: `schema:Dataset`, `schema:MediaObject`, `schema:WebPage`, `schema:Column`, `schema:URL`, `schema:ContactPoint`, `schema:Date`, `schema:MonetaryAmount`, `schema:Thing`

This is the UOR framework's type system applied to graph nodes — "the definitions of the attributes and how they're transformed."

**3. Update: `src/modules/knowledge-graph/ingest-bridge.ts`**

After creating a node + edges in `addToGraph()`, also produce and store the `GroundObjectBlueprint`:
- Call `decomposeToBlueprint()` on the newly created node
- Store the serialized blueprint as a derivation record (the blueprint IS a derivation — it's the canonical decomposition)
- This ensures every ingested item has a shareable, self-contained blueprint from the moment it enters the graph

**4. Update: `src/modules/knowledge-graph/local-store.ts`**

Add a `blueprints` object store (DB_VERSION → 3) keyed by UOR address:
- `putBlueprint(address: string, blueprint: string): Promise<void>`
- `getBlueprint(address: string): Promise<string | undefined>`
- `getAllBlueprints(): Promise<Array<{ address: string; blueprint: string }>>`

**5. Update: `src/modules/knowledge-graph/index.ts`**

Export the new blueprint module:
- `decomposeToBlueprint`, `materializeFromBlueprint`, `decomposeRecursive`
- `serializeBlueprint`, `deserializeBlueprint`, `verifyBlueprint`
- `registerNodeType`, `validateBlueprint`
- Types: `ObjectBlueprint`, `GroundObjectBlueprint`, `AttributeSchema`

**6. New: `src/test/kg-blueprint.test.ts`**

Test suite covering:
- Decompose a KGNode with edges into a blueprint → verify all edges appear as attributes
- Materialize a blueprint back → verify it produces identical node + edges
- Round-trip: decompose → serialize → deserialize → materialize → compare
- Recursive decomposition: node with child nodes → single nested blueprint
- Blueprint verification: tamper with an attribute → `verifyBlueprint` returns false
- Type validation: blueprint missing required attributes → validation fails

### How This Connects to the Existing Holographic Lens

The `ObjectBlueprint` is the KG-level equivalent of `LensBlueprint`. Just as a `LensBlueprint` defines a lens circuit by its element specifications (not live functions), an `ObjectBlueprint` defines a graph node by its attribute edges (not stored property values). Both use `singleProofHash()` for content-addressing. Both are serializable JSON-LD. Both can be shared and instantiated anywhere.

The existing `dehydrate()` in `lens.ts` operates on arbitrary JS objects. The new `decomposeToBlueprint()` operates specifically on KG nodes, producing a schema-aware decomposition that the LLM can later use for demand-driven materialization.

### Files Summary

| File | Action |
|------|--------|
| `src/modules/knowledge-graph/blueprint.ts` | New — Core decompose/materialize/verify |
| `src/modules/knowledge-graph/blueprint-registry.ts` | New — Type registry + validation |
| `src/modules/knowledge-graph/ingest-bridge.ts` | Store blueprint on ingestion |
| `src/modules/knowledge-graph/local-store.ts` | Add blueprints store (DB v3) |
| `src/modules/knowledge-graph/index.ts` | Export blueprint API |
| `src/test/kg-blueprint.test.ts` | New — Full test suite |

### The Result

After this, any KG node can be decomposed into a portable JSON blueprint where edges define the node. Share the blueprint → anyone can reconstruct the exact node. Change an attribute → the UOR address changes (content-addressing enforces integrity). The LLM can consume blueprints as structured prompts, constrained by the type registry. Dehydration at any hierarchy level — a single node, a subtree, or the entire graph — produces a single deterministic JSON file that is its own identity.

