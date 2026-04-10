# Layer 3 — Data

Encrypted, content-addressed storage and knowledge management.

## Modules

| Module | Description |
|--------|-------------|
| `knowledge-graph/` | Local RDF triple store (GrafeoDB) with schema.org support |
| `sovereign-vault/` | AES-256-GCM encrypted storage with per-slot keys |
| `sovereign-spaces/` | Peer-to-peer sync with CRDT conflict resolution |
| `sparql/` | SPARQL query engine for the knowledge graph |
| `jsonld/` | JSON-LD serialization and validation |
| `code-kg/` | Source code knowledge graph (TypeScript AST → triples) |
| `takeout/` | Full data export — GDPR-compatible portability |
| `time-machine/` | Checkpoint and restore for all local state |
| `data-bank/` | *(Absorbed into sovereign-vault)* — Re-export stub |

## Dependency Rule

Data modules depend on **kernel/** and **identity/**. They do not import from **platform/** or **intelligence/**.
