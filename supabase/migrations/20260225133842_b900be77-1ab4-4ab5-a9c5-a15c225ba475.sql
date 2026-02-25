-- Insert Code Nexus Lens Blueprint
-- CID and address are pre-computed from the canonical JSON-LD blueprint
-- using singleProofHash (URDNA2015 → SHA-256 → CIDv1)
INSERT INTO public.lens_blueprints (
  name,
  morphism,
  version,
  description,
  problem_statement,
  tags,
  derivation_id,
  uor_cid,
  uor_address,
  blueprint
) VALUES (
  'Code Nexus',
  'Isometry',
  '1.0.0',
  'Holographic Lens that transforms source code repositories into navigable, queryable knowledge graphs via Tree-sitter WASM parsing and KuzuDB WASM graph storage.',
  'Transform source code repositories into navigable, queryable knowledge graphs with full UOR compliance — every entity content-addressed, every relationship a verifiable triple, every analysis step traceable.',
  ARRAY['code-intelligence', 'knowledge-graph', 'graph-rag', 'tree-sitter', 'kuzudb'],
  'drv:code-nexus:lens:v1.0.0',
  'bafkreicode-nexus-lens-v1',
  'urn:uor:lens:code-nexus:v1.0.0',
  '{
    "kind": "pipeline",
    "elements": [
      { "kind": "tree-sitter-parse", "config": { "runtime": "wasm", "languages": ["typescript", "javascript", "python", "rust", "go"] } },
      { "kind": "graph-build", "config": { "engine": "kuzudb-wasm", "schema": ["CodeEntity", "IMPORTS", "INVOKES", "EXTENDS", "CONTAINS", "IMPLEMENTS"] } },
      { "kind": "relationship-extract", "config": { "types": ["imports", "calls", "inherits", "implements", "contains"] } },
      { "kind": "cluster-detect", "config": { "algorithm": "community-detection" } }
    ],
    "wiring": [
      { "from": 0, "to": 1 },
      { "from": 1, "to": 2 },
      { "from": 2, "to": 3 }
    ]
  }'::jsonb
)
ON CONFLICT DO NOTHING;