/**
 * Developer documentation categories — organized as virtual private infrastructure.
 * Three pillars: Compute, Storage, Networking — preceded by an Overview layer.
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

export interface DocPillar {
  id: string;
  title: string;
  description: string;
  categories: DocCategory[];
}

/* ── Overview: What UOR Is ─────────────────────────────────────── */
export const overviewCategories: DocCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Make your first API call in under 5 minutes. No account required.",
    icon: "Rocket",
    href: "/developers/getting-started",
    status: "coming-soon",
  },
  {
    id: "what-is-uor",
    title: "What is UOR?",
    description: "Permanent, content-derived addresses. Same content → same ID, everywhere.",
    icon: "Fingerprint",
    href: "/developers/what-is-uor",
    status: "coming-soon",
  },
  {
    id: "core-concepts",
    title: "Core Concepts",
    description: "Content addressing, verification grades, precision levels — no prior knowledge assumed.",
    icon: "BookOpen",
    href: "/developers/concepts",
    status: "coming-soon",
  },
];

/* ── Pillar 1: Compute ─────────────────────────────────────────── */
const computeCategories: DocCategory[] = [
  {
    id: "compute",
    title: "Edge Functions",
    description: "Deploy sandboxed functions with deterministic execution traces. Every invocation is verifiable.",
    icon: "Cpu",
    href: "/developers/compute",
    status: "coming-soon",
    "u:moduleRef": "uns/compute",
  },
  {
    id: "agents",
    title: "Agent Gateway",
    description: "Register AI agents, route typed messages, detect prompt injection — algebraically.",
    icon: "Bot",
    href: "/developers/agents",
    status: "coming-soon",
    "u:moduleRef": "uns/compute/agent-gateway",
  },
];

/* ── Pillar 2: Storage ─────────────────────────────────────────── */
const storageCategories: DocCategory[] = [
  {
    id: "store",
    title: "Object Store",
    description: "Content-addressed storage. Every object gets a permanent ID derived from its content.",
    icon: "Database",
    href: "/developers/store",
    status: "coming-soon",
    "u:moduleRef": "uns/store",
  },
  {
    id: "kv",
    title: "KV Store",
    description: "Key-value storage with content-addressed values. Every write produces a cryptographic receipt.",
    icon: "Key",
    href: "/developers/kv",
    status: "coming-soon",
    "u:moduleRef": "uns/store/kv",
  },
  {
    id: "ledger",
    title: "Ledger",
    description: "Verifiable SQL. Every query returns a cryptographic proof of its result set.",
    icon: "ScrollText",
    href: "/developers/ledger",
    status: "coming-soon",
    "u:moduleRef": "uns/ledger",
  },
];

/* ── Pillar 3: Networking ──────────────────────────────────────── */
const networkingCategories: DocCategory[] = [
  {
    id: "dns",
    title: "Name Service",
    description: "Register, resolve, and verify content-addressed names. Your identity, your control.",
    icon: "Globe",
    href: "/developers/dns",
    status: "coming-soon",
    "u:moduleRef": "uns/core",
  },
  {
    id: "shield",
    title: "Shield (WAF)",
    description: "Content analysis using prime factorization density. No signature databases required.",
    icon: "Shield",
    href: "/developers/shield",
    status: "coming-soon",
    "u:moduleRef": "uns/shield",
  },
  {
    id: "trust",
    title: "Trust & Auth",
    description: "Post-quantum authentication. Policy-based access control. Zero shared secrets.",
    icon: "Lock",
    href: "/developers/trust",
    status: "coming-soon",
    "u:moduleRef": "uns/trust",
  },
];

/* ── Pillars array ─────────────────────────────────────────────── */
export const docPillars: DocPillar[] = [
  {
    id: "compute",
    title: "Compute",
    description: "Deterministic execution with cryptographic traces",
    categories: computeCategories,
  },
  {
    id: "storage",
    title: "Storage",
    description: "Content-addressed persistence with verifiable receipts",
    categories: storageCategories,
  },
  {
    id: "networking",
    title: "Networking",
    description: "Identity, routing, and zero-trust security",
    categories: networkingCategories,
  },
];

/* ── Flat list for backward compatibility ──────────────────────── */
export const docCategories: DocCategory[] = [
  ...overviewCategories,
  ...computeCategories,
  ...storageCategories,
  ...networkingCategories,
  {
    id: "sdk",
    title: "TypeScript SDK",
    description: "One UnsClient class wrapping all services with full type safety.",
    icon: "Code",
    href: "/developers/sdk",
    status: "coming-soon",
    "u:moduleRef": "uns/sdk",
  },
];
