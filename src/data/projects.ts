/**
 * Full project catalog and maturity model — serializable data for UOR certification.
 * Images are mapped at the component level by `imageKey`.
 */
export type MaturityLevel = "Graduated" | "Incubating" | "Sandbox";

export interface ProjectData {
  name: string;
  slug: string;
  category: string;
  description: string;
  maturity: MaturityLevel;
  url?: string;
  imageKey?: string;
}

export const projects: ProjectData[] = [
  {
    name: "Hologram",
    slug: "hologram",
    category: "Frontier Technology",
    description: "A software layer that turns your existing hardware into a high-performance computing engine. No expensive GPUs or cloud subscriptions required.",
    maturity: "Sandbox",
    url: "https://gethologram.ai/",
    imageKey: "hologram",
  },
  {
    name: "Atlas Embeddings",
    slug: "atlas-embeddings",
    category: "Open Science",
    description: "Research proving that five of the most complex structures in mathematics share a single origin, revealing a hidden order that connects seemingly unrelated fields.",
    maturity: "Sandbox",
    url: "https://github.com/UOR-Foundation/research/tree/main/atlas-embeddings",
    imageKey: "atlas",
  },
  {
    name: "Atomic Language Model",
    slug: "atomic-language-model",
    category: "Frontier Technology",
    description: "A language model built on precise grammar rules instead of statistical guessing. Every output is traceable and explainable, and it fits in under 50 kilobytes.",
    maturity: "Sandbox",
    url: "https://github.com/dkypuros/atomic-lang-model",
    imageKey: "atomicLang",
  },
  {
    name: "Prism",
    slug: "prism",
    category: "Core Infrastructure",
    description: "The engine that runs the UOR Framework. It assigns every piece of data a permanent, unique address based on what it is, not where it is stored.",
    maturity: "Sandbox",
    url: "https://github.com/UOR-Foundation/prism",
    imageKey: "prism",
  },
];

export const maturityInfo: { level: MaturityLevel; tagline: string; description: string; criteria: string[] }[] = [
  {
    level: "Sandbox",
    tagline: "Early stage & experimental",
    description: "New projects with high potential. Open to anyone with an idea that aligns with the UOR standard.",
    criteria: [
      "Aligns with the UOR Foundation mission",
      "Has a clear problem statement",
      "At least one committed maintainer",
      "Open-source license (Apache 2.0 or MIT)",
    ],
  },
  {
    level: "Incubating",
    tagline: "Growing adoption & active development",
    description: "Projects with a clear roadmap, growing contributor base, and demonstrated value to the ecosystem.",
    criteria: [
      "Healthy contributor growth",
      "Production use by at least 2 organizations",
      "Clear governance model",
      "Passing CI/CD and documentation standards",
    ],
  },
  {
    level: "Graduated",
    tagline: "Production-ready & proven",
    description: "Stable, widely adopted projects with mature governance and long-term sustainability.",
    criteria: [
      "Broad adoption across the ecosystem",
      "Committer diversity from multiple organizations",
      "Security audit completed",
      "Stable release cadence with semantic versioning",
    ],
  },
];
