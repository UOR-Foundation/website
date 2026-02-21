/**
 * Donation project data — serializable for UOR certification.
 */
import { DONATE_URL } from "./external-links";

export interface DonationProject {
  title: string;
  raised: number;
  target: number;
  description: string;
  highlights: string[];
  donateUrl: string;
}

export const donationProjects: DonationProject[] = [
  {
    title: "UOR Standard Development",
    raised: 42000,
    target: 200000,
    description:
      "Fund the core development and formalization of the Universal Object Reference standard, the foundational specification that gives every piece of data one permanent, verifiable address.",
    highlights: [
      "Formal specification and mathematical proofs",
      "Reference implementations in multiple languages",
      "Community review and governance tooling",
    ],
    donateUrl: DONATE_URL,
  },
  {
    title: "Open Science Infrastructure",
    raised: 18500,
    target: 150000,
    description:
      "Support open, reproducible research infrastructure built on UOR. Enable scientists worldwide to share, reference, and build upon each other's work with full provenance and transparency.",
    highlights: [
      "Reproducible research pipelines",
      "Open dataset indexing and discovery",
      "Cross-institutional collaboration tools",
    ],
    donateUrl: DONATE_URL,
  },
  {
    title: "Community & Education",
    raised: 7200,
    target: 50000,
    description:
      "Grow the UOR community through workshops, hackathons, documentation, and educational resources. Help developers and researchers adopt the standard and contribute back.",
    highlights: [
      "Developer workshops and hackathons",
      "Comprehensive documentation and tutorials",
      "Fellowship program for emerging contributors",
    ],
    donateUrl: DONATE_URL,
  },
];
