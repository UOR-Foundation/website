/**
 * News items. Announcements, releases, research notes, and community updates.
 * Serializable data for UOR certification.
 */
export type NewsCategory = "Engineering" | "Research" | "Company" | "Community";

export type NewsItem = {
  title: string;
  excerpt: string;
  date: string; // human-readable
  isoDate: string; // sortable ISO
  category: NewsCategory;
  href: string;
  external?: boolean;
  coverKey?: string;
};

export const newsItems: NewsItem[] = [
  {
    title: "uor-foundation v0.3.1 released on crates.io",
    excerpt:
      "The complete UOR Foundation ontology as typed Rust traits. 34 namespaces, 471 OWL classes, 948 properties, plus the uor! proc macro for compile-time DSL. cargo add uor-foundation.",
    date: "May 5, 2026",
    isoDate: "2026-05-05",
    category: "Engineering",
    href: "https://crates.io/crates/uor-foundation",
    external: true,
    coverKey: "uorFoundationCrate",
  },
  {
    title: "The Path to Sustainable AI: Notes from the Uganda Deep Tech Summit",
    excerpt:
      "Alex Flom represented the UOR Foundation in Kampala. The pitch: compute once, lookup forever. AI that runs on devices people already own, with data that stays local.",
    date: "May 6, 2026",
    isoDate: "2026-05-06",
    category: "Community",
    href: "/blog/sustainable-ai-uganda",
    coverKey: "sustainableAiUganda",
  },
  {
    title: "A Universal Data Fingerprint for Your AI Agent",
    excerpt:
      "Two agents, one verifiable identifier. UOR derives a 256-bit fingerprint from canonical structure. same object, same hash, in any language or runtime.",
    date: "April 21, 2026",
    isoDate: "2026-04-21",
    category: "Engineering",
    href: "/blog/universal-data-fingerprint",
    coverKey: "universalDataFingerprint",
  },
  {
    title: "What If Every Piece of Data Had One Permanent Address?",
    excerpt:
      "The open specification is live. Browse the full framework, review the architecture, and start building.",
    date: "February 19, 2026",
    isoDate: "2026-02-19",
    category: "Research",
    href: "/blog/uor-framework-launch",
    coverKey: "frameworkLaunch",
  },
  {
    title: "Unveiling a Universal Mathematical Language",
    excerpt:
      "A breakthrough that reveals the hidden order behind nature's most complex systems and could reshape open science, AI, and quantum computing.",
    date: "October 10, 2025",
    isoDate: "2025-10-10",
    category: "Research",
    href: "/blog/universal-mathematical-language",
    coverKey: "goldenSeed",
  },
  {
    title: "UOR: Building the Internet's Knowledge Graph",
    excerpt:
      "How a single addressing system could turn the internet into a structured, navigable knowledge graph.",
    date: "December 21, 2023",
    isoDate: "2023-12-21",
    category: "Company",
    href: "/blog/building-the-internets-knowledge-graph",
    coverKey: "knowledgeGraph",
  },
  {
    title: "The UOR Framework: Everything Is an Object",
    excerpt:
      "The original framework introduction. Universal Object Reference reframes information systems around content-derived addresses, attribute queries, and embedded runtimes.",
    date: "July 13, 2022",
    isoDate: "2022-07-13",
    category: "Research",
    href: "/blog/uor-framework-origin",
    coverKey: "uorFrameworkOrigin",
  },
];
