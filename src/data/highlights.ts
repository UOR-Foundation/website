/**
 * Community highlights. serializable data for UOR certification.
 * Image imports are mapped at the component level.
 */
export type TagType = "Research" | "Announcement" | "Release" | "Field Notes" | "Engineering" | "Vision" | "Open Research";

export const highlights = [
  {
    tag: "Open Research" as TagType,
    title: "Same Data, Different Bytes: Integrity Checks That Survive Re-Serialization",
    date: "October 21, 2026",
    imageKey: "serializationInvariant",
    href: "/blog/serialization-invariant-integrity",
  },
  {
    tag: "Field Notes" as TagType,
    title: "Agents don't need more pages. They need objects they can trust.",
    date: "August 10, 2026",
    imageKey: "objectInternetNanda",
    href: "/blog/object-internet-nanda",
  },
  {
    tag: "Field Notes" as TagType,
    title: "The Path to Sustainable AI: Notes from the Uganda Deep Tech Summit",
    date: "May 6, 2026",
    imageKey: "sustainableAiUganda",
    href: "/blog/sustainable-ai-uganda",
  },
  {
    tag: "Open Research" as TagType,
    title: "Unveiling a Universal Mathematical Language",
    date: "October 10, 2025",
    imageKey: "goldenSeed",
    href: "/blog/universal-mathematical-language",
  },
];
