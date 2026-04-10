import type { LucideIcon } from "lucide-react";

/**
 * Community module types.
 */

export interface ResearchCategory {
  icon: LucideIcon;
  label: string;
  slug: string;
  description: string;
  active: boolean;
}

export interface ResearchItem {
  title: string;
  authors: string;
  status: string;
  description: string;
  href: string;
}

export interface BlogPost {
  title: string;
  excerpt: string;
  date: string;
  tag: string;
  href: string;
  cover: string;
}

export interface CommunityEvent {
  title: string;
  location: string;
  date: string;
  type: string;
  link?: string;
  calendarDate?: string;
}
