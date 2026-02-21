import type { LucideIcon } from "lucide-react";

/**
 * Framework module types.
 */

export interface NamespaceLink {
  label: string;
  url: string;
}

export interface FrameworkLayer {
  number: number;
  icon: LucideIcon;
  title: string;
  summary: string;
  description: string;
  namespaces: NamespaceLink[];
}
