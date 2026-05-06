/**
 * Full project catalog. serializable data for UOR certification.
 * Images are mapped at the component level by `imageKey`.
 */
export interface ProjectData {
  name: string;
  slug: string;
  category: string;
  description: string;
  url?: string;
  imageKey?: string;
}

export const projects: ProjectData[] = [
  {
    name: "Hologram",
    slug: "hologram",
    category: "Systems",
    description: "A software layer that turns existing hardware into a high-performance computing engine. No new chips required.",
    url: "https://github.com/UOR-Foundation/hologram",
    imageKey: "hologram",
  },
  {
    name: "Atlas Embeddings",
    slug: "atlas-embeddings",
    category: "Open Science",
    description: "Research proving that five of the most complex structures in mathematics share a single origin, revealing a hidden order that connects seemingly unrelated fields.",
    url: "https://github.com/UOR-Foundation/research/tree/main/atlas-embeddings",
    imageKey: "atlas",
  },
  {
    name: "Atomic Language Model",
    slug: "atomic-language-model",
    category: "Systems",
    description: "A language model where every output follows defined rules and is fully traceable. No black boxes. Fits in under 50 kilobytes.",
    url: "https://github.com/dkypuros/atomic-lang-model",
    imageKey: "atomicLang",
  },
  {
    name: "Prism",
    slug: "prism",
    category: "Core Infrastructure",
    description: "The reference implementation of the UOR Framework. Assigns every piece of data a permanent, unique address based on what it is, not where it is stored.",
    url: "https://github.com/UOR-Foundation/prism",
    imageKey: "prism",
  },
  {
    name: "UOR Name Service (UNS)",
    slug: "uns",
    category: "Core Infrastructure",
    description: "A complete network infrastructure platform where every resource is findable, verifiable, and protected. Trust is built into the address itself.",
    url: "https://github.com/UOR-Foundation/uns",
    imageKey: "uns",
  },
  {
    name: "Project Severance AI",
    slug: "project-severance-ai",
    category: "Core Infrastructure",
    description: "A post-quantum homomorphic encryption framework for federated computing. Achieves 85–94% operation reduction through connection optimization while preserving full data privacy across organizations.",
    url: "https://github.com/dkypuros/Project_Severance_AI",
    imageKey: "severanceAi",
  },
];
