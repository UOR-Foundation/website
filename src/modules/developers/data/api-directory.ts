/**
 * API Directory — comprehensive, Cloudflare-inspired category structure
 * mapped 1:1 to the actual UOR API implementation (7 layers + platform services).
 */

export interface ApiDirectoryEntry {
  id: string;
  title: string;
  description: string;
  href: string;
  method?: "GET" | "POST";
  /** If true, links to an external API endpoint */
  external?: boolean;
}

export interface ApiDirectoryCategory {
  id: string;
  title: string;
  description: string;
  entries: ApiDirectoryEntry[];
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Section 1: Getting Started
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const gettingStarted: ApiDirectoryCategory = {
  id: "getting-started",
  title: "Getting Started",
  description: "First steps — no account required",
  entries: [
    { id: "quickstart", title: "Quickstart", description: "First API call in under 5 minutes", href: "/developers/getting-started" },
    { id: "fundamentals", title: "What is UOR?", description: "Content-derived identity explained in plain language", href: "/developers/fundamentals" },
    { id: "concepts", title: "Core Concepts", description: "Addressing, verification grades, precision levels", href: "/developers/concepts" },
    { id: "api-ref", title: "API Reference", description: "48 endpoints with curl examples and JSON-LD responses", href: "/api" },
  ],
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Section 2: API Reference — mapped to the 7 live layers
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const apiFoundation: ApiDirectoryCategory = {
  id: "api-foundation",
  title: "Foundation (Layer 0)",
  description: "The core mathematical rule — provable in under 100ms",
  entries: [
    { id: "verify", title: "Verify Critical Identity", description: "Check the core algebraic rule for any value", href: "/api#layer-0", method: "GET" },
    { id: "verify-all", title: "Verify All", description: "Exhaustive check across every value in the ring", href: "/api#layer-0", method: "GET" },
    { id: "correlate", title: "Correlate", description: "Hamming distance and structural fidelity between two values", href: "/api#layer-0", method: "GET" },
  ],
};

export const apiIdentity: ApiDirectoryCategory = {
  id: "api-identity",
  title: "Identity (Layer 1)",
  description: "Permanent content-derived addresses",
  entries: [
    { id: "address-encode", title: "Address Encode", description: "Compute a permanent content address for any text", href: "/api#layer-1", method: "POST" },
    { id: "schema-datum", title: "Schema Datum", description: "Full structural profile of any number", href: "/api#layer-1", method: "GET" },
    { id: "kernel-derive", title: "Kernel Derive", description: "Derive a certificate from a term tree with audit trail", href: "/api#layer-1", method: "POST" },
  ],
};

export const apiStructure: ApiDirectoryCategory = {
  id: "api-structure",
  title: "Structure (Layer 2)",
  description: "5 primitive + 7 derived operations, formally defined",
  entries: [
    { id: "compute", title: "Compute", description: "Run all operations on a value at once", href: "/api#layer-2", method: "GET" },
    { id: "operations", title: "Operations", description: "List all named operations with formal definitions", href: "/api#layer-2", method: "GET" },
  ],
};

export const apiResolution: ApiDirectoryCategory = {
  id: "api-resolution",
  title: "Resolution (Layer 3)",
  description: "Type system and structural classification",
  entries: [
    { id: "type-primitives", title: "Type Primitives", description: "Browse the built-in type catalogue (U1–U16)", href: "/api#layer-3", method: "GET" },
    { id: "resolver", title: "Resolver", description: "Classify any value into its canonical category", href: "/api#layer-3", method: "GET" },
  ],
};

export const apiVerification: ApiDirectoryCategory = {
  id: "api-verification",
  title: "Verification (Layer 4)",
  description: "Portable proofs and certificates anyone can verify",
  entries: [
    { id: "proof-critical", title: "Proof: Critical Identity", description: "Generate a portable proof for one value", href: "/api#layer-4", method: "GET" },
    { id: "proof-coherence", title: "Proof: Coherence", description: "Verify type consistency across all values", href: "/api#layer-4", method: "POST" },
    { id: "cert-involution", title: "Certificate: Involution", description: "Certify that an operation is self-inverting", href: "/api#layer-4", method: "GET" },
    { id: "derivation", title: "Derivation", description: "Step-by-step audit trail for any computation", href: "/api#layer-4", method: "GET" },
    { id: "trace", title: "Trace", description: "Binary state capture at every computation step", href: "/api#layer-4", method: "GET" },
  ],
};

export const apiTransformation: ApiDirectoryCategory = {
  id: "api-transformation",
  title: "Transformation (Layer 5)",
  description: "Density analysis, morphisms, and state inspection",
  entries: [
    { id: "partition", title: "Partition Analysis", description: "Measure algebraic byte-class density of any content", href: "/api#layer-5", method: "POST" },
    { id: "observable-metrics", title: "Observable Metrics", description: "Structural measurements — ring position, cascade depth, phase boundary", href: "/api#layer-5", method: "GET" },
    { id: "morphism", title: "Morphism Transforms", description: "Map values between ring sizes with property preservation", href: "/api#layer-5", method: "GET" },
    { id: "state", title: "State Inspector", description: "Category, stability, and transition map for any value", href: "/api#layer-5", method: "GET" },
  ],
};

export const apiPersistence: ApiDirectoryCategory = {
  id: "api-persistence",
  title: "Persistence (Layer 6)",
  description: "IPFS storage with dual-address integrity",
  entries: [
    { id: "store-resolve", title: "Store: Resolve", description: "Preview the UOR address of any URL before storing", href: "/api#layer-6", method: "GET" },
    { id: "store-write", title: "Store: Write", description: "Pin objects to IPFS with dual content addressing", href: "/api#layer-6", method: "POST" },
    { id: "store-read", title: "Store: Read", description: "Retrieve and verify a stored object by CID", href: "/api#layer-6", method: "GET" },
    { id: "store-write-context", title: "Store: Write Context", description: "Persist a full agent context as linked IPLD DAG", href: "/api#layer-6", method: "POST" },
    { id: "store-verify", title: "Store: Verify", description: "Lightweight integrity check without content retrieval", href: "/api#layer-6", method: "GET" },
    { id: "store-gateways", title: "Store: Gateways", description: "List IPFS gateways with live health status", href: "/api#layer-6", method: "GET" },
  ],
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Section 3: Platform Services
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const platformCompute: ApiDirectoryCategory = {
  id: "platform-compute",
  title: "Compute",
  description: "Deterministic execution with cryptographic traces",
  entries: [
    { id: "edge-functions", title: "Edge Functions", description: "Sandboxed functions with deterministic execution traces", href: "/developers/compute" },
    { id: "agent-gateway", title: "Agent Gateway", description: "Register agents, route messages, detect prompt injection", href: "/developers/agents" },
  ],
};

export const platformStorage: ApiDirectoryCategory = {
  id: "platform-storage",
  title: "Storage",
  description: "Content-addressed persistence with verifiable receipts",
  entries: [
    { id: "object-store", title: "Object Store", description: "Every object gets a permanent ID derived from its content", href: "/developers/store" },
    { id: "kv-store", title: "KV Store", description: "Key-value storage with cryptographic receipts on every write", href: "/developers/kv" },
    { id: "ledger", title: "Ledger (SQL)", description: "Verifiable SQL — every query returns a cryptographic proof", href: "/developers/ledger" },
  ],
};

export const platformNetworking: ApiDirectoryCategory = {
  id: "platform-networking",
  title: "Networking",
  description: "Identity, routing, and zero-trust security",
  entries: [
    { id: "name-service", title: "Name Service (DNS)", description: "Register, resolve, and verify content-addressed names", href: "/developers/dns" },
    { id: "shield", title: "Shield (WAF)", description: "Content analysis using prime factorization density", href: "/developers/shield" },
    { id: "trust-auth", title: "Trust & Auth", description: "Post-quantum authentication and policy-based access control", href: "/developers/trust" },
  ],
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Section 4: Agentic AI
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const agenticAi: ApiDirectoryCategory = {
  id: "agentic-ai",
  title: "Agentic AI",
  description: "Agent registration, routing, and MCP integration",
  entries: [
    { id: "agent-gateway-ai", title: "Agent Gateway", description: "Typed message routing with injection detection", href: "/developers/agents" },
    { id: "mcp", title: "MCP Integration", description: "Connect UOR to Model Context Protocol-compatible clients", href: "/standard#mcp" },
    { id: "agent-console", title: "Agent Console", description: "Register agents and inspect alerts in real time", href: "/agent-console" },
  ],
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Section 5: Verification & Trust
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const verificationTrust: ApiDirectoryCategory = {
  id: "verification-trust",
  title: "Verification & Trust",
  description: "Prove the framework's axioms yourself",
  entries: [
    { id: "conformance", title: "Conformance Suite", description: "35 mathematical proofs verifying framework axioms", href: "/conformance" },
    { id: "derivation-lab", title: "Derivation Lab", description: "Derive canonical addresses and inspect receipts interactively", href: "/derivation-lab" },
    { id: "ring-explorer", title: "Ring Explorer", description: "Visualize the commutative ring structure", href: "/ring-explorer" },
    { id: "audit", title: "System Audit", description: "Full audit trail of all verified operations", href: "/audit" },
  ],
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Section 6: Developer Tools
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const developerTools: ApiDirectoryCategory = {
  id: "developer-tools",
  title: "Developer Tools",
  description: "Explorers and semantic web tooling",
  entries: [
    { id: "api-ref", title: "API Reference", description: "48 endpoints with curl examples and JSON-LD responses", href: "/api" },
    { id: "sparql-editor", title: "SPARQL Editor", description: "Write and execute queries against UOR's RDF triple store", href: "/sparql-editor" },
    { id: "knowledge-graph", title: "Knowledge Graph", description: "Browse and query the UOR knowledge graph", href: "/knowledge-graph" },
    { id: "semantic-web", title: "Semantic Web", description: "JSON-LD contexts, SHACL shapes, and RDF vocabulary", href: "/semantic-web" },
  ],
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Section 7: Resources
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const resources: ApiDirectoryCategory = {
  id: "resources",
  title: "Resources",
  description: "Research, papers, and community",
  entries: [
    { id: "atlas-embeddings", title: "Atlas Embeddings", description: "Embedding mathematics into navigable coordinate spaces", href: "/research/atlas-embeddings" },
    { id: "blog-kg", title: "Building the Internet's Knowledge Graph", description: "How content-addressing enables a decentralised knowledge graph", href: "/blog/building-the-internets-knowledge-graph" },
    { id: "blog-lang", title: "Universal Mathematical Language", description: "Why a shared algebraic substrate matters for AI", href: "/blog/universal-mathematical-language" },
    { id: "blog-launch", title: "Framework Launch & Roadmap", description: "From theory to production: the UOR journey", href: "/blog/uor-framework-launch" },
    { id: "uor-standard", title: "UOR Standard", description: "Full specification of the six-layer framework", href: "/standard" },
  ],
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Grouped exports for page sections
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const apiLayers: ApiDirectoryCategory[] = [
  apiFoundation,
  apiIdentity,
  apiStructure,
  apiResolution,
  apiVerification,
  apiTransformation,
  apiPersistence,
];

export const platformServices: ApiDirectoryCategory[] = [
  platformCompute,
  platformStorage,
  platformNetworking,
];

export const allCategories: ApiDirectoryCategory[] = [
  gettingStarted,
  ...apiLayers,
  ...platformServices,
  agenticAi,
  verificationTrust,
  developerTools,
  resources,
];
