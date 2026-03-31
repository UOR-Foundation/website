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
    category: "Systems",
    description: "A software layer that turns existing hardware into a high-performance computing engine. No new chips required.",
    maturity: "Sandbox",
    url: "https://gethologram.ai/",
    imageKey: "hologram",
  },
  {
    name: "Hologram SDK",
    slug: "hologram-sdk",
    category: "Developer Tools",
    description: "The developer toolkit for building, shipping, and running applications on the Hologram platform. One identity, one build, every device.",
    maturity: "Sandbox",
    imageKey: "hologramSdk",
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
    category: "Systems",
    description: "A language model where every output follows defined rules and is fully traceable. No black boxes. Fits in under 50 kilobytes.",
    maturity: "Sandbox",
    url: "https://github.com/dkypuros/atomic-lang-model",
    imageKey: "atomicLang",
  },
  {
    name: "Prism",
    slug: "prism",
    category: "Core Infrastructure",
    description: "The reference implementation of the UOR Framework. Assigns every piece of data a permanent, unique address based on what it is, not where it is stored.",
    maturity: "Sandbox",
    url: "https://github.com/UOR-Foundation/prism",
    imageKey: "prism",
  },
  {
    name: "UOR MCP",
    slug: "uor-mcp",
    category: "Developer Tools",
    description: "A server that connects AI models to the UOR verification engine. Every response is graded, traceable, and independently verifiable.",
    maturity: "Sandbox",
    url: "https://github.com/UOR-Foundation/uor-mcp",
    imageKey: "uorMcp",
  },
  {
    name: "UOR Name Service (UNS)",
    slug: "uns",
    category: "Core Infrastructure",
    description: "A complete network infrastructure platform where every resource is findable, verifiable, and protected. Trust is built into the address itself.",
    maturity: "Sandbox",
    imageKey: "uns",
  },
  {
    name: "QR Cartridge",
    slug: "qr-cartridge",
    category: "Developer Tools",
    description: "Turn any content into a scannable QR code that carries its own verified identity. One scan to load. No trust required.",
    maturity: "Sandbox",
    imageKey: "qrCartridge",
  },
  {
    name: "UOR Identity",
    slug: "uor-identity",
    category: "Core Infrastructure",
    description: "One permanent, private identity derived from who you are, not which service you signed up for. Works everywhere. Controlled entirely by you.",
    maturity: "Sandbox",
    imageKey: "uorIdentity",
  },
  {
    name: "UOR Privacy",
    slug: "uor-privacy",
    category: "Core Infrastructure",
    description: "You write the privacy rules. Applications either accept your terms, or they don't get access. Privacy becomes something you own, not something you hope for.",
    maturity: "Sandbox",
    url: "https://myterms.info/",
    imageKey: "uorPrivacy",
  },
  {
    name: "UOR Certificate",
    slug: "uor-certificate",
    category: "Core Infrastructure",
    description: "A self-verifying receipt for any digital object. Proves authenticity through mathematics, not authorities. Anyone can verify, anywhere, with no special access required.",
    maturity: "Sandbox",
    imageKey: "uorCertificate",
  },
];

export const maturityInfo: { level: MaturityLevel; tagline: string; description: string; criteria: string[] }[] = [
  {
    level: "Sandbox",
    tagline: "Early stage & experimental",
    description: "New projects with high potential. Open to anyone with an idea that aligns with the UOR framework.",
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
