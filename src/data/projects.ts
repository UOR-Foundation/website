/**
 * Full project catalog and maturity model — serializable data for UOR certification.
 * Images are mapped at the component level by `imageKey`.
 */
export type MaturityLevel = "Graduated" | "Incubating" | "Sandbox";

export interface ProjectData {
  name: string;
  category: string;
  description: string;
  maturity: MaturityLevel;
  url?: string;
  imageKey?: string;
}

export const projects: ProjectData[] = [
  {
    name: "Hologram",
    category: "Frontier Technology",
    description: "A new kind of computing infrastructure built from the ground up. Software-defined, high-performance, and designed for the next generation of applications.",
    maturity: "Sandbox",
    url: "https://gethologram.ai/",
    imageKey: "hologram",
  },
  {
    name: "Atlas Embeddings",
    category: "Open Science",
    description: "Research showing that five of the most complex structures in mathematics all come from a single, simple starting point, revealing a deeper shared order.",
    maturity: "Sandbox",
    url: "https://github.com/UOR-Foundation/research/tree/main/atlas-embeddings",
    imageKey: "atlas",
  },
  {
    name: "Atomic Language Model",
    category: "Frontier Technology",
    description: "A language model built on formal grammar rules rather than statistical prediction. Every output is traceable to precise, well-defined operations.",
    maturity: "Sandbox",
    url: "https://github.com/dkypuros/atomic-lang-model",
    imageKey: "atomicLang",
  },
  {
    name: "Prism",
    category: "Core Infrastructure",
    description: "The computation engine for the UOR Framework. While the Framework defines the rules (what concepts exist and how they relate), Prism proves they work by running them: encoding data, generating addresses, verifying computations, and producing certificates. Same algebra, same coordinates, same guarantees.",
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
