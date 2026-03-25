/**
 * Featured projects (homepage showcase) — serializable data for UOR certification.
 */
export type MaturityLevel = "Graduated" | "Incubating" | "Sandbox";

export const featuredProjects = [
  {
    name: "Atlas Embeddings",
    category: "Open Science",
    description: "Research showing that five of the most complex structures in mathematics all come from a single, simple starting point, revealing a deeper shared order.",
    maturity: "Sandbox" as MaturityLevel,
    license: "MIT",
    url: "https://github.com/UOR-Foundation/research/tree/main/atlas-embeddings",
  },
  {
    name: "Atomic Language Model",
    category: "Frontier Technology",
    description: "A language model where every output follows defined rules and is fully traceable — no black boxes.",
    maturity: "Sandbox" as MaturityLevel,
    license: "MIT",
    url: "https://github.com/dkypuros/atomic-lang-model",
  },
  {
    name: "UOR MCP",
    category: "Developer Tools",
    description: "A server that connects AI models to the UOR kernel. Every response is verified and auditable.",
    maturity: "Sandbox" as MaturityLevel,
    license: "Apache-2.0",
    url: "https://github.com/UOR-Foundation/uor-mcp",
  },
];
