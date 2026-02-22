/**
 * Community highlights — serializable data for UOR certification.
 * Image imports are mapped at the component level.
 */
export type TagType = "Research" | "Announcement";

export const highlights = [
  {
    tag: "Research" as TagType,
    title: "UOR: Building the Internet's Knowledge Graph",
    date: "December 21, 2023",
    imageKey: "knowledgeGraph",
    href: "/blog/building-the-internets-knowledge-graph",
  },
  {
    tag: "Announcement" as TagType,
    title: "Meet the UOR Framework",
    date: "February 19, 2026",
    imageKey: "frameworkLaunch",
    href: "/blog/uor-framework-launch",
  },
  {
    tag: "Announcement" as TagType,
    title: "The Semantic Web for Agentic AI",
    date: "February 22, 2026",
    imageKey: "semanticWeb",
    href: "/semantic-web",
  },
];
