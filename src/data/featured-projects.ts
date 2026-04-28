/**
 * Featured projects (homepage showcase). serializable data for UOR certification.
 */
export type MaturityLevel = "Graduated" | "Incubating" | "Sandbox";

export const featuredProjects = [
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
    name: "Atomic Language Model",
    slug: "atomic-language-model",
    category: "Systems",
    description: "A language model where every output follows defined rules and is fully traceable. No black boxes. Fits in under 50 kilobytes.",
    maturity: "Sandbox" as MaturityLevel,
    license: "MIT",
    url: "https://github.com/dkypuros/atomic-lang-model",
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
];
