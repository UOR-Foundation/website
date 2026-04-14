/**
 * UOR MCP tool metadata for the docs page.
 */

export interface McpToolMeta {
  name: string;
  description: string;
  docsAnchor?: string;
}

export const MCP_TOOLS: McpToolMeta[] = [
  { name: "uor_derive", description: "Derive a prime factorization and content-addressed proof for any term." },
  { name: "uor_verify", description: "Re-verify a previously derived result using its derivation ID." },
  { name: "uor_query", description: "Run a SPARQL query against the UOR knowledge graph." },
  { name: "uor_correlate", description: "Compute the spectral correlation between two integers." },
  { name: "uor_partition", description: "Partition a seed set into prime orbits with optional closure." },
  { name: "uor_resolve", description: "Resolve a UOR content address to its original derivation data." },
  { name: "uor_certify", description: "Issue a verifiable certificate for a completed derivation." },
  { name: "uor_trace", description: "Retrieve the full derivation trace for a given proof ID." },
  { name: "uor_schema_bridge", description: "Bridge between external schemas and UOR's canonical representation." },
  { name: "uor_schema_coherence", description: "Check coherence of a schema mapping against UOR axioms." },
];

export interface McpResourceMeta {
  uri: string;
  description: string;
}

export const MCP_RESOURCE_LIST: McpResourceMeta[] = [
  { uri: "uor://llms.md", description: "Trust enforcement instructions delivered to your AI client on connection." },
  { uri: "uor://openapi.json", description: "OpenAPI specification for all UOR MCP tools." },
];
