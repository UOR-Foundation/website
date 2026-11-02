import coverSerialization from "@/assets/blog/serialization-invariant-integrity.jpg.asset.json";
import coverObjectInternet from "@/assets/blog/object-internet-nanda.jpg.asset.json";
import coverUganda from "@/assets/blog/sustainable-ai-uganda.jpg.asset.json";

export { RIBBON, HERO, ABOUT, FRAMEWORK } from "./copy";

export const POSTS = {
  label: "Connect with community",
  title: "Highlights.",
  all: "All posts",
  items: [
    {
      category: "Research",
      title: "Same Data, Different Bytes: Integrity Checks That Survive Reserialization",
      href: "/blog/serialization-invariant-integrity/?from=highlights",
      date: "October 21, 2026",
      cover: coverSerialization.url,
    },
    {
      category: "Community",
      title: "Agents don't need more pages. They need objects they can trust.",
      href: "/blog/object-internet-nanda/?from=highlights",
      date: "August 10, 2026",
      cover: coverObjectInternet.url,
    },
    {
      category: "Community",
      title: "The Path to Sustainable AI: Notes from the Uganda Deep Tech Summit",
      href: "/blog/sustainable-ai-uganda/?from=highlights",
      date: "May 6, 2026",
      cover: coverUganda.url,
    },
  ],
};

export const STATS: [string, string][] = [
  ["Standard library", "1"],
  ["Formal verification", "Byte-precise"],
  ["Open source", "100%"],
  ["Contributors", "200+"],
];

export const CLOSING = { title1: "Let's build the", title2: "impossible. Together.", cta: "Join your community" };
