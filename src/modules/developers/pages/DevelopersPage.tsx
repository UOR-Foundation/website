import Layout from "@/modules/core/components/Layout";
import { Link } from "react-router-dom";
import { ArrowRight, Terminal, Copy, Check } from "lucide-react";
import { useState } from "react";

/* ── Copy button ──────────────────────────────────────────────── */
const CopyBtn = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors"
      aria-label="Copy"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
};

/* ── Link row (Cloudflare-style) ──────────────────────────────── */
const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link
    to={to}
    className="group flex items-center justify-between py-2 text-sm text-foreground/80 hover:text-primary transition-colors"
  >
    <span>{children}</span>
    <ArrowRight size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
  </Link>
);

/* ── Category card ────────────────────────────────────────────── */
const CategoryCard = ({
  title,
  links,
  viewAllHref,
  viewAllLabel = "View all",
}: {
  title: string;
  links: { label: string; href: string }[];
  viewAllHref?: string;
  viewAllLabel?: string;
}) => (
  <div className="rounded-xl border border-border/40 bg-card/20 p-5">
    <h3 className="text-sm font-semibold text-foreground font-body uppercase tracking-wide mb-3">
      {title}
    </h3>
    <div className="divide-y divide-border/20">
      {links.map((l) => (
        <NavLink key={l.href} to={l.href}>{l.label}</NavLink>
      ))}
    </div>
    {viewAllHref && (
      <Link
        to={viewAllHref}
        className="inline-flex items-center gap-1 mt-4 text-xs font-semibold text-primary hover:underline"
      >
        {viewAllLabel} <ArrowRight size={12} />
      </Link>
    )}
  </div>
);

/* ── Data ─────────────────────────────────────────────────────── */
const featured = [
  { label: "Getting Started", href: "/developers/getting-started" },
  { label: "What is UOR?", href: "/developers/fundamentals" },
  { label: "Core Concepts", href: "/developers/concepts" },
  { label: "TypeScript SDK", href: "/developers/sdk" },
  { label: "API Reference", href: "/api" },
];

const compute = [
  { label: "Edge Functions", href: "/developers/compute" },
  { label: "Agent Gateway", href: "/developers/agents" },
];

const storage = [
  { label: "Object Store", href: "/developers/store" },
  { label: "KV Store", href: "/developers/kv" },
  { label: "Ledger (SQL)", href: "/developers/ledger" },
];

const networking = [
  { label: "Name Service (DNS)", href: "/developers/dns" },
  { label: "Shield (WAF)", href: "/developers/shield" },
  { label: "Trust & Auth", href: "/developers/trust" },
];

const tools = [
  { label: "Conformance Suite", href: "/conformance" },
  { label: "Ring Explorer", href: "/ring-explorer" },
  { label: "Knowledge Graph", href: "/knowledge-graph" },
  { label: "SPARQL Editor", href: "/sparql-editor" },
  { label: "Agent Console", href: "/agent-console" },
];

const research = [
  { label: "Atlas Embeddings", href: "/research/atlas-embeddings" },
  { label: "Building the Internet's Knowledge Graph", href: "/blog/building-the-internets-knowledge-graph" },
  { label: "Universal Mathematical Language", href: "/blog/universal-mathematical-language" },
  { label: "Framework Launch & Roadmap", href: "/blog/uor-framework-launch" },
];

const curlCmd = `curl "https://api.uor.foundation/v1/kernel/op/verify?x=42"`;

/* ── Page ─────────────────────────────────────────────────────── */
const DevelopersPage = () => (
  <Layout>
    <div className="dark bg-section-dark text-section-dark-foreground min-h-screen">

      {/* ━━ Hero ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pt-40 pb-10 md:pt-48 md:pb-14">
        <div className="container max-w-5xl">
          {/* Top nav links */}
          <nav className="flex items-center gap-5 text-sm mb-10">
            <Link to="/developers/directory" className="text-foreground/70 hover:text-foreground underline underline-offset-2 decoration-border/60 transition-colors">Directory</Link>
            <Link to="/research" className="text-foreground/70 hover:text-foreground underline underline-offset-2 decoration-border/60 transition-colors">Research</Link>
            <Link to="/api" className="text-foreground/70 hover:text-foreground underline underline-offset-2 decoration-border/60 transition-colors">API</Link>
            <Link to="/standard" className="text-foreground/70 hover:text-foreground underline underline-offset-2 decoration-border/60 transition-colors">Standard</Link>
          </nav>

          <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-foreground mb-4">
            UOR Developer Docs
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Content-addressed identity for every object. One SDK, verifiable computation,
            and zero-trust networking — no prior knowledge required.
          </p>
        </div>
      </section>

      {/* ━━ Category cards (Cloudflare-style grid) ━━━━━━━━━━━━━━ */}
      <section className="pb-16">
        <div className="container max-w-5xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CategoryCard
              title="Featured"
              links={featured}
              viewAllHref="/developers/directory"
              viewAllLabel="View all docs"
            />
            <CategoryCard
              title="Compute"
              links={compute}
              viewAllHref="/developers/compute"
              viewAllLabel="View all compute"
            />
            <CategoryCard
              title="Storage"
              links={storage}
              viewAllHref="/developers/store"
              viewAllLabel="View all storage"
            />
            <CategoryCard
              title="Networking"
              links={networking}
              viewAllHref="/developers/dns"
              viewAllLabel="View all networking"
            />
          </div>
        </div>
      </section>

      {/* ━━ Build with UOR — code snippet ━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pb-16">
        <div className="container max-w-5xl">
          <h2 className="text-lg md:text-xl font-display font-bold text-foreground mb-6">
            Build with UOR
          </h2>
          <div className="relative rounded-lg border border-border/40 bg-card/10 overflow-hidden max-w-2xl">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30 text-xs text-muted-foreground">
              <Terminal size={12} className="text-primary" />
              <span className="font-mono">Try it — no account needed</span>
            </div>
            <CopyBtn text={curlCmd} />
            <pre className="px-4 py-4 text-[13px] font-mono text-foreground/90 overflow-x-auto">
              <code>{curlCmd}</code>
            </pre>
          </div>
          <p className="mt-4 text-sm text-muted-foreground max-w-xl">
            Every response includes a cryptographic receipt — proof that the computation
            is correct and the result is tamper-evident. No API key required.
          </p>
        </div>
      </section>

      {/* ━━ What is UOR? — one-paragraph explainer ━━━━━━━━━━━━━ */}
      <section className="pb-16">
        <div className="container max-w-5xl">
          <div className="max-w-2xl">
            <h2 className="text-lg md:text-xl font-display font-bold text-foreground mb-4">
              What is UOR?
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              The Universal Object Reference is a coordinate system for information.
              Every object — a file, a record, a function — gets a permanent address
              derived from <em>what it is</em>, not where it lives. Identical content
              always resolves to the same identifier, regardless of the system.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              This eliminates reconciliation. It enables direct verification,
              reliable reuse, and zero-trust security without shared secrets
              or centralised registries.
            </p>
            <Link
              to="/developers/fundamentals"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Read the fundamentals <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ━━ Tools & Research (two-column) ━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pb-16">
        <div className="container max-w-5xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CategoryCard
              title="Tools & Explorers"
              links={tools}
              viewAllHref="/developers/directory"
              viewAllLabel="View all tools"
            />
            <CategoryCard
              title="Research & Papers"
              links={research}
              viewAllHref="/research"
              viewAllLabel="Browse all research"
            />
          </div>
        </div>
      </section>

      {/* ━━ Explore more ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pb-16">
        <div className="container max-w-5xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Docs Directory", href: "/developers/directory" },
              { label: "Your Projects", href: "/projects" },
              { label: "UOR Standard", href: "/standard" },
              { label: "Conformance Proofs", href: "/conformance" },
            ].map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className="group flex items-center justify-center text-center rounded-xl border border-border/40 bg-card/20 px-4 py-4 hover:border-primary/30 hover:bg-card/40 transition-all"
              >
                <span className="text-xs font-semibold text-foreground font-body">{l.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ Bottom CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pb-24">
        <div className="container max-w-5xl">
          <div className="h-px bg-border/30 mb-10" />
          <div className="text-center max-w-md mx-auto">
            <h2 className="text-lg font-display font-bold text-foreground mb-2">Ready to build?</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Make your first verifiable API call in under 5 minutes.
            </p>
            <Link
              to="/developers/getting-started"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Get Started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  </Layout>
);

export default DevelopersPage;
