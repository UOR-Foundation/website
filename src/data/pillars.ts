/**
 * Three pillars. Participate · Contribute · Adopt. modeled on OCI's
 * "Participate / Become a Member / Get Certified" path.
 * Icons are mapped at the component level by `iconKey`.
 */
export const pillars = [
  {
    iconKey: "Users",
    title: "Participate",
    description:
      "Join the technical community on Discord and GitHub. Discuss the specifications, ask questions, and meet the maintainers building UOR in the open.",
    href: "/community",
    cta: "Join the Community",
  },
  {
    iconKey: "Globe",
    title: "Contribute",
    description:
      "Propose changes to a specification or a reference implementation. Read the canonical Rust crate, open an issue, or submit a pull request on GitHub.",
    href: "https://github.com/UOR-Foundation/UOR-Framework",
    cta: "Contribute on GitHub",
  },
  {
    iconKey: "Rocket",
    title: "Adopt",
    description:
      "Use the specifications in your product. Install the canonical crate, build a reference implementation, and submit it to the project catalog.",
    href: "/projects",
    cta: "Explore Projects",
  },
];
