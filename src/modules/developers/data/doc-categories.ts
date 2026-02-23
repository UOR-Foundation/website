/**
 * Developer documentation categories — serializable data for UOR certification.
 * Maps to UNS service modules and UOR framework layers.
 */

export interface DocCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  status: "available" | "coming-soon";
  "u:moduleRef"?: string;
}

export const docCategories: DocCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Set up the UNS SDK, generate your first keypair, and resolve your first name.",
    icon: "Rocket",
    href: "/developers/getting-started",
    status: "coming-soon",
  },
  {
    id: "dns",
    title: "Name Service (DNS)",
    description: "Register, resolve, and verify content-addressed names on the UOR Name Service.",
    icon: "Globe",
    href: "/developers/dns",
    status: "coming-soon",
    "u:moduleRef": "uns/core",
  },
  {
    id: "compute",
    title: "Compute",
    description: "Deploy sandboxed functions with deterministic execution traces and cryptographic verification.",
    icon: "Cpu",
    href: "/developers/compute",
    status: "coming-soon",
    "u:moduleRef": "uns/compute",
  },
  {
    id: "store",
    title: "Object Store",
    description: "Content-addressed storage with canonical IDs. Every object verifiable, every byte accounted for.",
    icon: "Database",
    href: "/developers/store",
    status: "coming-soon",
    "u:moduleRef": "uns/store",
  },
  {
    id: "shield",
    title: "Shield (WAF)",
    description: "Algebraic content analysis using prime factorization density. No signature databases required.",
    icon: "Shield",
    href: "/developers/shield",
    status: "coming-soon",
    "u:moduleRef": "uns/shield",
  },
  {
    id: "trust",
    title: "Trust & Auth",
    description: "Post-quantum authentication with Dilithium-3 challenges and policy-based access control.",
    icon: "Lock",
    href: "/developers/trust",
    status: "coming-soon",
    "u:moduleRef": "uns/trust",
  },
  {
    id: "agents",
    title: "Agent Gateway",
    description: "Register AI agents, route morphism-typed messages, and detect prompt injection algebraically.",
    icon: "Bot",
    href: "/developers/agents",
    status: "coming-soon",
    "u:moduleRef": "uns/compute/agent-gateway",
  },
  {
    id: "kv",
    title: "KV Store",
    description: "Key-value storage with content-addressed values. Every write produces a canonical receipt.",
    icon: "Key",
    href: "/developers/kv",
    status: "coming-soon",
    "u:moduleRef": "uns/store/kv",
  },
  {
    id: "ledger",
    title: "Ledger (D1)",
    description: "Verifiable SQL with state transitions. Every query returns a cryptographic proof of its result set.",
    icon: "ScrollText",
    href: "/developers/ledger",
    status: "coming-soon",
    "u:moduleRef": "uns/ledger",
  },
  {
    id: "sdk",
    title: "TypeScript SDK",
    description: "The official @uns/sdk — one UnsClient class wrapping all services with full type safety.",
    icon: "Code",
    href: "/developers/sdk",
    status: "coming-soon",
    "u:moduleRef": "uns/sdk",
  },
];
