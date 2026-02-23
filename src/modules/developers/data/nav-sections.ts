/**
 * Developer docs sidebar navigation — serializable data for UOR certification.
 * Designed for future extraction into standalone docs site.
 */

export interface DocNavItem {
  label: string;
  href: string;
  icon?: string;
}

export interface DocNavSection {
  title: string;
  items: DocNavItem[];
}

export const devNavSections: DocNavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Developer Hub", href: "/developers", icon: "Home" },
      { label: "Getting Started", href: "/developers/getting-started", icon: "Rocket" },
    ],
  },
  {
    title: "Services",
    items: [
      { label: "Name Service", href: "/developers/dns", icon: "Globe" },
      { label: "Compute", href: "/developers/compute", icon: "Cpu" },
      { label: "Object Store", href: "/developers/store", icon: "Database" },
      { label: "KV Store", href: "/developers/kv", icon: "Key" },
      { label: "Ledger", href: "/developers/ledger", icon: "ScrollText" },
    ],
  },
  {
    title: "Security",
    items: [
      { label: "Shield (WAF)", href: "/developers/shield", icon: "Shield" },
      { label: "Trust & Auth", href: "/developers/trust", icon: "Lock" },
    ],
  },
  {
    title: "AI",
    items: [
      { label: "Agent Gateway", href: "/developers/agents", icon: "Bot" },
    ],
  },
  {
    title: "SDK & Tools",
    items: [
      { label: "TypeScript SDK", href: "/developers/sdk", icon: "Code" },
      { label: "API Reference", href: "/api", icon: "FileJson" },
    ],
  },
];
