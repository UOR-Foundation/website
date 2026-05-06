/**
 * Community highlights. serializable data for UOR certification.
 * Image imports are mapped at the component level.
 */
export type TagType = "Research" | "Announcement" | "Release" | "Field Notes" | "Engineering" | "Vision" | "Open Research";

export const highlights = [
  {
    tag: "Field Notes" as TagType,
    title: "The Path to Sustainable AI: Notes from the Uganda Deep Tech Summit",
    date: "May 6, 2026",
    imageKey: "sustainableAiUganda",
    href: "/blog/sustainable-ai-uganda",
  },
  {
    tag: "Engineering" as TagType,
    title: "uor-foundation v0.3.1 is live on crates.io",
    date: "May 5, 2026",
    imageKey: "uorFoundationCrate",
    href: "/blog/uor-foundation-v0-3-1",
  },
  {
    tag: "Open Research" as TagType,
    title: "Unveiling a Universal Mathematical Language",
    date: "October 10, 2025",
    imageKey: "goldenSeed",
    href: "/blog/universal-mathematical-language",
  },
];
