import Navbar from "@/modules/core/components/Navbar";
import Footer from "@/modules/core/components/Footer";
import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { DocIcon } from "../components/DocIcon";
import { Search } from "lucide-react";

/* ── Directory entries ─────────────────────────────────────────── */
interface DirectoryEntry {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  groups: string[];
}

const groups = [
  "Overview",
  "Compute",
  "Storage",
  "Networking",
  "Agentic AI",
  "Verification",
  "Developer tools",
] as const;

type Group = (typeof groups)[number];

const entries: DirectoryEntry[] = [
  // ── Overview ──
  {
    id: "fundamentals",
    title: "Fundamentals",
    description: "What UOR is, how it works, and why it matters — in plain language",
    icon: "Layers",
    href: "/developers/fundamentals",
    groups: ["Overview"],
  },
  {
    id: "concepts",
    title: "Core Concepts",
    description: "Content addressing, verification grades, precision levels, trust model",
    icon: "BookOpen",
    href: "/developers/concepts",
    groups: ["Overview"],
  },
  {
    id: "getting-started",
    title: "Getting Started",
    description: "First API call in 5 minutes — no account, no SDK, just curl",
    icon: "Rocket",
    href: "/developers/getting-started",
    groups: ["Overview", "Developer tools"],
  },
  // ── Compute ──
  {
    id: "compute",
    title: "Compute",
    description: "Sandboxed edge functions with deterministic execution traces",
    icon: "Cpu",
    href: "/developers/compute",
    groups: ["Compute"],
  },
  {
    id: "agents",
    title: "Agent Gateway",
    description: "Register AI agents, route typed messages, detect prompt injection",
    icon: "Bot",
    href: "/developers/agents",
    groups: ["Compute", "Agentic AI"],
  },
  // ── Storage ──
  {
    id: "store",
    title: "Object Store",
    description: "Content-addressed storage — every object gets a permanent ID from its content",
    icon: "Database",
    href: "/developers/store",
    groups: ["Storage"],
  },
  {
    id: "kv",
    title: "KV Store",
    description: "Key-value storage with cryptographic receipts on every write",
    icon: "Key",
    href: "/developers/kv",
    groups: ["Storage"],
  },
  {
    id: "ledger",
    title: "Ledger",
    description: "Verifiable SQL — every query returns a cryptographic proof of its result set",
    icon: "ScrollText",
    href: "/developers/ledger",
    groups: ["Storage"],
  },
  // ── Networking ──
  {
    id: "dns",
    title: "Name Service",
    description: "Register, resolve, and verify content-addressed names",
    icon: "Globe",
    href: "/developers/dns",
    groups: ["Networking"],
  },
  {
    id: "shield",
    title: "Shield (WAF)",
    description: "Algebraic content analysis using prime factorization density",
    icon: "Shield",
    href: "/developers/shield",
    groups: ["Networking", "Verification"],
  },
  {
    id: "trust",
    title: "Trust & Auth",
    description: "Post-quantum authentication and policy-based access control",
    icon: "Lock",
    href: "/developers/trust",
    groups: ["Networking"],
  },
  // ── Developer tools ──
  {
    id: "sdk",
    title: "TypeScript SDK",
    description: "One UnsClient class wrapping all services with full type safety",
    icon: "Code",
    href: "/developers/sdk",
    groups: ["Developer tools"],
  },
  {
    id: "api",
    title: "API Reference",
    description: "48 endpoints with working curl examples and JSON-LD responses",
    icon: "FileJson",
    href: "/api",
    groups: ["Developer tools"],
  },
  // ── Verification ──
  {
    id: "conformance",
    title: "Conformance Suite",
    description: "35 mathematical proofs — verify the framework's axioms yourself",
    icon: "ShieldCheck",
    href: "/conformance",
    groups: ["Verification"],
  },
  {
    id: "derivation",
    title: "Derivation Lab",
    description: "Derive canonical addresses and inspect verification receipts interactively",
    icon: "FlaskConical",
    href: "/derivation",
    groups: ["Verification", "Developer tools"],
  },
  {
    id: "ring-explorer",
    title: "Ring Explorer",
    description: "Visualize the commutative ring structure underlying content addressing",
    icon: "CircleDot",
    href: "/ring",
    groups: ["Verification"],
  },
  // ── Agentic AI ──
  {
    id: "agent-console",
    title: "Agent Console",
    description: "Register agents, route messages, inspect injection alerts in real time",
    icon: "Terminal",
    href: "/agent-console",
    groups: ["Agentic AI", "Developer tools"],
  },
  {
    id: "mcp",
    title: "MCP Integration",
    description: "Connect UOR verification to Model Context Protocol-compatible AI clients",
    icon: "Plug",
    href: "/mcp",
    groups: ["Agentic AI"],
  },
  // ── Other tools ──
  {
    id: "kg",
    title: "Knowledge Graph",
    description: "Browse and query the UOR knowledge graph with SPARQL",
    icon: "Share2",
    href: "/kg",
    groups: ["Developer tools", "Storage"],
  },
  {
    id: "sparql",
    title: "SPARQL Editor",
    description: "Write and execute SPARQL queries against UOR's RDF triple store",
    icon: "Search",
    href: "/sparql",
    groups: ["Developer tools"],
  },
  {
    id: "standard",
    title: "UOR Standard",
    description: "Full specification of the six-layer framework architecture",
    icon: "FileText",
    href: "/standard",
    groups: ["Overview"],
  },
  {
    id: "semantic-web",
    title: "Semantic Web",
    description: "JSON-LD contexts, SHACL shapes, and RDF vocabulary for the UOR ontology",
    icon: "Braces",
    href: "/semantic-web",
    groups: ["Overview", "Developer tools"],
  },
];

/* ── Page ─────────────────────────────────────────────────────── */
const DirectoryPage = () => {
  const [search, setSearch] = useState("");
  const [activeGroups, setActiveGroups] = useState<Set<Group>>(new Set());

  const toggleGroup = (group: Group) => {
    setActiveGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let result = entries;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
      );
    }
    if (activeGroups.size > 0) {
      result = result.filter((e) =>
        e.groups.some((g) => activeGroups.has(g as Group))
      );
    }
    return result;
  }, [search, activeGroups]);

  return (
    <>
      <Navbar />
      <div className="dark bg-section-dark text-section-dark-foreground min-h-screen">
        {/* Hero */}
        <section className="pt-40 pb-10 md:pt-52 md:pb-14">
          <div className="container max-w-6xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-3">
              Docs directory
            </h1>
            <p className="text-base text-muted-foreground max-w-xl">
              Every service, tool, and reference in one place. Filter by group or search by name.
            </p>
          </div>
        </section>

        {/* Body */}
        <section className="pb-24">
          <div className="container max-w-6xl">
            <div className="flex gap-10">
              {/* ── Left: search + groups ──────────────────────── */}
              <aside className="hidden md:block w-56 shrink-0">
                {/* Search */}
                <div className="relative mb-6">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60"
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search docs..."
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-border/40 bg-card/20 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                {/* Groups */}
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 font-body">
                  Groups
                </p>
                <div className="space-y-1">
                  {groups.map((group) => {
                    const isActive = activeGroups.has(group);
                    return (
                      <label
                        key={group}
                        className="flex items-center gap-2.5 cursor-pointer group py-1"
                      >
                        <span
                          className={`shrink-0 w-4 h-4 rounded border transition-colors flex items-center justify-center ${
                            isActive
                              ? "border-primary bg-primary"
                              : "border-border/60 group-hover:border-muted-foreground"
                          }`}
                        >
                          {isActive && (
                            <svg
                              width="10"
                              height="8"
                              viewBox="0 0 10 8"
                              fill="none"
                              className="text-primary-foreground"
                            >
                              <path
                                d="M1 4L3.5 6.5L9 1"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => toggleGroup(group)}
                          className="sr-only"
                        />
                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                          {group}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </aside>

              {/* ── Right: card grid ───────────────────────────── */}
              <div className="flex-1 min-w-0">
                {/* Mobile search */}
                <div className="md:hidden relative mb-6">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60"
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search docs..."
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-border/40 bg-card/20 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-12 text-center">
                    No results found. Try a different search or clear filters.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map((entry) => (
                      <Link
                        key={entry.id}
                        to={entry.href}
                        className="group rounded-xl border border-border/40 bg-card/20 p-5 hover:border-primary/30 hover:bg-card/40 transition-all"
                      >
                        <div className="flex items-center gap-2.5 mb-2">
                          <DocIcon
                            name={entry.icon}
                            size={18}
                            className="text-primary shrink-0"
                          />
                          <h3 className="text-sm font-semibold text-foreground font-body truncate">
                            {entry.title}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {entry.description}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default DirectoryPage;
