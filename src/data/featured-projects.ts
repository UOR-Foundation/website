/**
 * Featured projects (homepage showcase). serializable data for UOR certification.
 */
export type MaturityLevel = "Graduated" | "Incubating" | "Sandbox";

export const featuredProjects = [
  {
    name: "Prism",
    slug: "prism",
    category: "Compiler",
    description: "A formally-specified compiler and runtime grounded in the UOR Foundation ontology. Treats computation as navigation in a categorical structure.",
    maturity: "Sandbox" as MaturityLevel,
    license: "Apache-2.0",
    url: "https://github.com/UOR-Foundation/prism",
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
];
