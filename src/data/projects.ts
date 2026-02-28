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
  {
    name: "UOR MCP",
    slug: "uor-mcp",
    category: "Developer Tools",
    description: "A Model Context Protocol server that gives any LLM access to the UOR kernel. Every response becomes content-addressed, verified, and auditable.",
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
    description: "Turn any content into a scannable QR code that carries its own verified identity. Movies, apps, music, websites — one scan to load, no trust required.",
    maturity: "Sandbox",
    imageKey: "qrCartridge",
  },
  {
    name: "UOR Identity",
    slug: "uor-identity",
    category: "Core Infrastructure",
    description: "No more juggling dozens of logins, resetting forgotten passwords, or trusting platforms that sell your data. One permanent, private identity — derived from who you are, not which service you signed up for — that works everywhere and is controlled entirely by you.",
    maturity: "Sandbox",
    imageKey: "uorIdentity",
  },
  {
    name: "UOR Privacy",
    slug: "uor-privacy",
    category: "Core Infrastructure",
    description: "Define your own privacy rules. When any app or agent wants your data, they accept your terms — not the other way around. Privacy becomes programmable, enforceable, and tamper-proof.",
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
