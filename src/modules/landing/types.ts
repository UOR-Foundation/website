/**
 * Landing module types.
 */

export interface Highlight {
  tag: "Research" | "Announcement" | "Event";
  title: string;
  date: string;
  image: string;
  href: string;
}

export interface FeaturedProject {
  name: string;
  category: string;
  description: string;
  maturity: "Graduated" | "Incubating" | "Sandbox";
  url?: string;
}

export interface CommunityMember {
  name: string;
  role: string;
  description: string;
  image: string;
  link: string;
}

export interface Pillar {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  cta: string;
}
