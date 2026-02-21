/**
 * Featured projects (homepage showcase) — serializable data for UOR certification.
 */
export type MaturityLevel = "Graduated" | "Incubating" | "Sandbox";

export const featuredProjects = [
  {
    name: "Hologram",
    category: "Frontier Technology",
    description: "A new kind of computing infrastructure built from the ground up. Software-defined, high-performance, and designed for the next generation of applications.",
    maturity: "Sandbox" as MaturityLevel,
    url: "https://gethologram.ai/",
  },
  {
    name: "Atlas Embeddings",
    category: "Open Science",
    description: "Research showing that five of the most complex structures in mathematics all come from a single, simple starting point, revealing a deeper shared order.",
    maturity: "Sandbox" as MaturityLevel,
    url: "https://github.com/UOR-Foundation/research/tree/main/atlas-embeddings",
  },
  {
    name: "Atomic Language Model",
    category: "Frontier Technology",
    description: "A language model built on formal grammar rules rather than statistical prediction. Every output is traceable to precise, well-defined operations.",
    maturity: "Sandbox" as MaturityLevel,
    url: "https://github.com/dkypuros/atomic-lang-model",
  },
];
