/**
 * Docs sidebar navigation data — one section per service.
 * Each service doc page uses its ID to look up its sidebar items.
 */

export interface DocSidebarItem {
  label: string;
  href: string;
  badge?: string;
  children?: DocSidebarItem[];
}

export interface DocSidebarSection {
  serviceId: string;
  title: string;
  icon: string;
  items: DocSidebarItem[];
}

export const docSidebars: Record<string, DocSidebarSection> = {
  dns: {
    serviceId: "dns",
    title: "UNS (Name Service)",
    icon: "Globe",
    items: [
      { label: "Overview", href: "/developers/dns" },
      { label: "The Problem", href: "/developers/dns#problem" },
      { label: "What UNS Does", href: "/developers/dns#what-uns-does" },
      { label: "How It Works", href: "/developers/dns#how-it-works" },
      { label: "Platform Services", href: "/developers/dns#services" },
      { label: "For AI Agents", href: "/developers/dns#agents" },
      { label: "Get Started", href: "/developers/dns#get-started" },
      { label: "API Reference", href: "/api" },
    ],
  },
  compute: {
    serviceId: "compute",
    title: "Compute",
    icon: "Cpu",
    items: [
      { label: "Overview", href: "/developers/compute" },
      { label: "Get Started", href: "/developers/compute#get-started" },
      { label: "Edge Functions", href: "/developers/compute#functions" },
      { label: "Execution Traces", href: "/developers/compute#traces" },
      { label: "Verification", href: "/developers/compute#verification" },
      { label: "API Reference", href: "/api" },
    ],
  },
  store: {
    serviceId: "store",
    title: "Object Store",
    icon: "Database",
    items: [
      { label: "Overview", href: "/developers/store" },
      { label: "Get Started", href: "/developers/store#get-started" },
      { label: "Content Addressing", href: "/developers/store#addressing" },
      { label: "Write & Read", href: "/developers/store#operations" },
      { label: "IPFS Integration", href: "/developers/store#ipfs" },
      { label: "API Reference", href: "/api" },
    ],
  },
  kv: {
    serviceId: "kv",
    title: "KV Store",
    icon: "Key",
    items: [
      { label: "Overview", href: "/developers/kv" },
      { label: "Get Started", href: "/developers/kv#get-started" },
      { label: "Operations", href: "/developers/kv#operations" },
      { label: "Receipts", href: "/developers/kv#receipts" },
      { label: "API Reference", href: "/api" },
    ],
  },
  ledger: {
    serviceId: "ledger",
    title: "Ledger",
    icon: "ScrollText",
    items: [
      { label: "Overview", href: "/developers/ledger" },
      { label: "Get Started", href: "/developers/ledger#get-started" },
      { label: "Queries & Proofs", href: "/developers/ledger#queries" },
      { label: "State Transitions", href: "/developers/ledger#transitions" },
      { label: "Migrations", href: "/developers/ledger#migrations" },
      { label: "API Reference", href: "/api" },
    ],
  },
  shield: {
    serviceId: "shield",
    title: "Shield (WAF)",
    icon: "Shield",
    items: [
      { label: "Overview", href: "/developers/shield" },
      { label: "Get Started", href: "/developers/shield#get-started" },
      { label: "Content Analysis", href: "/developers/shield#analysis" },
      { label: "Partition Density", href: "/developers/shield#density" },
      { label: "Middleware", href: "/developers/shield#middleware" },
      { label: "API Reference", href: "/api" },
    ],
  },
  trust: {
    serviceId: "trust",
    title: "Trust & Auth",
    icon: "Lock",
    items: [
      { label: "Overview", href: "/developers/trust" },
      { label: "Get Started", href: "/developers/trust#get-started" },
      { label: "Authentication", href: "/developers/trust#auth" },
      { label: "Access Control", href: "/developers/trust#access" },
      { label: "Conduit (E2E)", href: "/developers/trust#conduit" },
      { label: "API Reference", href: "/api" },
    ],
  },
  agents: {
    serviceId: "agents",
    title: "Agent Gateway",
    icon: "Bot",
    items: [
      { label: "Overview", href: "/developers/agents" },
      { label: "Get Started", href: "/developers/agents#get-started" },
      { label: "Registration", href: "/developers/agents#registration" },
      { label: "Message Routing", href: "/developers/agents#routing" },
      { label: "Injection Detection", href: "/developers/agents#injection" },
      { label: "API Reference", href: "/api" },
    ],
  },
  sdk: {
    serviceId: "sdk",
    title: "TypeScript SDK",
    icon: "Code",
    items: [
      { label: "Overview", href: "/developers/sdk" },
      { label: "Installation", href: "/developers/sdk#installation" },
      { label: "UnsClient", href: "/developers/sdk#client" },
      { label: "Identity", href: "/developers/sdk#identity" },
      { label: "Services", href: "/developers/sdk#services" },
      { label: "API Reference", href: "/api" },
    ],
  },
  "getting-started": {
    serviceId: "getting-started",
    title: "Getting Started",
    icon: "Rocket",
    items: [
      { label: "Overview", href: "/developers/getting-started" },
      { label: "First API Call", href: "/developers/getting-started#first-call" },
      { label: "Content Addressing", href: "/developers/getting-started#addressing" },
      { label: "Endpoint Map", href: "/developers/getting-started#endpoints" },
      { label: "Next Steps", href: "/developers/getting-started#next" },
    ],
  },
  concepts: {
    serviceId: "concepts",
    title: "Core Concepts",
    icon: "BookOpen",
    items: [
      { label: "Overview", href: "/developers/concepts" },
      { label: "Content Addressing", href: "/developers/concepts#addressing" },
      { label: "Verification Grades", href: "/developers/concepts#grades" },
      { label: "Content Quality", href: "/developers/concepts#quality" },
      { label: "Precision Levels", href: "/developers/concepts#precision" },
      { label: "Trust Model", href: "/developers/concepts#trust" },
    ],
  },
  fundamentals: {
    serviceId: "fundamentals",
    title: "Fundamentals",
    icon: "Layers",
    items: [
      { label: "Overview", href: "/developers/fundamentals" },
      { label: "What is UOR?", href: "/developers/fundamentals#what" },
      { label: "How it works", href: "/developers/fundamentals#how" },
      { label: "Why it matters", href: "/developers/fundamentals#why" },
      { label: "Infrastructure", href: "/developers/fundamentals#infrastructure" },
      { label: "For AI agents", href: "/developers/fundamentals#agents" },
      { label: "Concepts", href: "/developers/concepts" },
      { label: "Get started", href: "/developers/getting-started" },
    ],
  },
};
