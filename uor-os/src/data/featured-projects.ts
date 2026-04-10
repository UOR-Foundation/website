/**
 * Featured projects (homepage showcase). serializable data for UOR certification.
 */
export type MaturityLevel = "Graduated" | "Incubating" | "Sandbox";

export const featuredProjects = [
  {
    name: "UOR Foundation Crate",
    slug: "uor-foundation",
    category: "Core",
    description: "The canonical Rust implementation. Every ontology class as a trait, every property as a method, every named individual as a constant. cargo add uor-foundation.",
    maturity: "Graduated" as MaturityLevel,
    license: "Apache-2.0",
    url: "https://crates.io/crates/uor-foundation",
  },
  {
    name: "Hologram",
    slug: "hologram",
    category: "Systems",
    description: "A software layer that turns existing hardware into a high-performance computing engine. No new chips required, no special infrastructure needed.",
    maturity: "Sandbox" as MaturityLevel,
    license: "MIT",
    url: "https://gethologram.ai/",
  },
  {
    name: "Atlas Embeddings",
    slug: "atlas-embeddings",
    category: "Open Science",
    description: "Research showing that five of the most complex structures in mathematics share a single origin, revealing a deeper order beneath the surface.",
    maturity: "Sandbox" as MaturityLevel,
    license: "MIT",
    url: "https://github.com/UOR-Foundation/research/tree/main/atlas-embeddings",
  },
  {
    name: "UOR MCP",
    slug: "uor-mcp",
    category: "Developer Tools",
    description: "A server that connects AI models to the UOR kernel. Every response is cryptographically verified, auditable, and fully reproducible.",
    maturity: "Sandbox" as MaturityLevel,
    license: "Apache-2.0",
    url: "https://github.com/UOR-Foundation/uor-mcp",
  },
];
