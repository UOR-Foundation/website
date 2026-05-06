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
    name: "Anunix",
    slug: "anunix",
    category: "Core Infrastructure",
    description: "The AI-native operating system. Redefines UNIX primitives — files, processes, pipes, sockets — around state, transformation, memory, routing, and validation. Written in C and assembly.",
    url: "https://github.com/AdamPippert/Anunix",
    imageKey: "anunix",
  },
  {
    name: "prism-btc",
    slug: "prism-btc",
    category: "Core Infrastructure",
    description: "Bitcoin mining reframed as a UOR shape-preserving morphism search. Every block hash is a certified Grounded type, mining is a σ-convergence loop, and termination is formally proven in Lean 4.",
    url: "https://github.com/afflom/prism-btc",
    imageKey: "prismBtc",
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
