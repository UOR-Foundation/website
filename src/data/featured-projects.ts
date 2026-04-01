/**
 * Featured projects (homepage showcase) — serializable data for UOR certification.
 */
export type MaturityLevel = "Graduated" | "Incubating" | "Sandbox";

export const featuredProjects = [
  {
    name: "Hologram",
    category: "Systems",
    description: "A software layer that turns existing hardware into a high-performance computing engine. No new chips required, no special infrastructure needed.",
    maturity: "Sandbox" as MaturityLevel,
    license: "MIT",
    url: "https://gethologram.ai/",
  },
  {
    name: "Atlas Embeddings",
    category: "Open Science",
    description: "Research showing that five of the most complex structures in mathematics all come from a single, simple starting point, revealing a deeper shared order.",
    maturity: "Sandbox" as MaturityLevel,
    license: "MIT",
    url: "https://github.com/UOR-Foundation/research/tree/main/atlas-embeddings",
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
