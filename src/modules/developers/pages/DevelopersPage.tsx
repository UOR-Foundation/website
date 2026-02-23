import Layout from "@/modules/core/components/Layout";
import { Link } from "react-router-dom";
import { ArrowRight, Terminal, Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import {
  gettingStarted,
  apiLayers,
  platformServices,
  agenticAi,
  verificationTrust,
  developerTools,
  resources,
  type ApiDirectoryCategory,
  type ApiDirectoryEntry,
} from "../data/api-directory";

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

/* ── Method badge ─────────────────────────────────────────────── */
const MethodBadge = ({ method }: { method: string }) => (
  <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
    method === "POST"
      ? "bg-accent/15 text-accent border border-accent/20"
      : "bg-primary/10 text-primary border border-primary/20"
  }`}>
    {method}
  </span>
);

/* ── Entry row ────────────────────────────────────────────────── */
const EntryRow = ({ entry }: { entry: ApiDirectoryEntry }) => (
  <Link
    to={entry.href}
    className="group flex items-center gap-3 py-2.5 text-sm hover:pl-1 transition-all duration-200"
  >
    {entry.method && <MethodBadge method={entry.method} />}
    <span className="text-foreground/80 group-hover:text-primary transition-colors font-medium truncate">
      {entry.title}
    </span>
    <ArrowRight size={12} className="ml-auto text-muted-foreground/30 group-hover:text-primary shrink-0 transition-colors" />
  </Link>
);

/* ── Category card ────────────────────────────────────────────── */
const CategoryCard = ({ category }: { category: ApiDirectoryCategory }) => (
  <div className="rounded-xl border border-border/40 bg-card/20 p-5 hover:border-border/60 transition-colors">
    <h3 className="text-sm font-semibold text-foreground font-body mb-1">
      {category.title}
    </h3>
    <p className="text-xs text-muted-foreground/60 mb-3 leading-relaxed">
      {category.description}
    </p>
    <div className="divide-y divide-border/15">
      {category.entries.map((entry) => (
        <EntryRow key={entry.id} entry={entry} />
      ))}
    </div>
  </div>
);

/* ── Section header ───────────────────────────────────────────── */
const SectionHeader = ({
  title,
  description,
  id,
}: {
  title: string;
  description: string;
  id?: string;
}) => (
  <div id={id} className={id ? "scroll-mt-32" : ""}>
    <h2 className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-widest mb-1 font-body">
      {title}
    </h2>
    <p className="text-sm text-muted-foreground/70 mb-5">{description}</p>
  </div>
);

const curlCmd = `curl "https://api.uor.foundation/v1/kernel/op/verify?x=42"`;

/* ── Page ─────────────────────────────────────────────────────── */
const DevelopersPage = () => (
  <Layout>
    <div className="dark bg-section-dark text-section-dark-foreground min-h-screen">

      {/* ━━ Hero ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pt-48 pb-8 md:pt-56 md:pb-12">
        <div className="container max-w-6xl">
          {/* Top nav anchors */}
          <nav className="flex items-center gap-5 text-sm mb-10">
            <Link to="/developers/directory" className="text-foreground/70 hover:text-foreground underline underline-offset-2 decoration-border/60 transition-colors">Directory</Link>
            <a href="#resources" className="text-foreground/70 hover:text-foreground underline underline-offset-2 decoration-border/60 transition-colors">Resources</a>
            <Link to="/api" className="text-foreground/70 hover:text-foreground underline underline-offset-2 decoration-border/60 transition-colors">API</Link>
          </nav>

          <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-foreground mb-4">
            UOR Developer Docs
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-10">
            Content-addressed identity for every object. Seven API layers, three platform pillars,
            and zero-trust networking — no account required.
          </p>

          {/* Hero category pills — mirrors sections below */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Getting Started", href: "#getting-started" },
              { label: "API Reference", href: "#api-reference" },
              { label: "Platform Services", href: "#platform" },
              { label: "Agentic AI", href: "#agentic-ai" },
              { label: "Verification", href: "#verification" },
              { label: "Developer Tools", href: "#dev-tools" },
              { label: "Resources", href: "#resources" },
            ].map((pill) => (
              <a
                key={pill.label}
                href={pill.href}
                className="px-4 py-2 rounded-full border border-border/40 bg-card/10 text-xs font-semibold text-foreground/70 hover:text-foreground hover:border-primary/30 hover:bg-card/30 transition-all font-body"
              >
                {pill.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ Getting Started ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pb-12" id="getting-started">
        <div className="container max-w-6xl">
          <SectionHeader title="Getting Started" description="No account, no API key — make your first verifiable call in 5 minutes" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {gettingStarted.entries.map((entry) => (
              <Link
                key={entry.id}
                to={entry.href}
                className="group rounded-xl border border-border/40 bg-card/20 p-5 hover:border-primary/30 hover:bg-card/40 transition-all"
              >
                <h3 className="text-sm font-semibold text-foreground font-body mb-1 group-hover:text-primary transition-colors">
                  {entry.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{entry.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ Build with UOR — code snippet ━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pb-14">
        <div className="container max-w-6xl">
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
          <p className="mt-3 text-sm text-muted-foreground max-w-xl">
            Every response includes a cryptographic receipt — proof that the computation
            is correct and tamper-evident.{" "}
            <Link to="/api" className="text-primary hover:underline">
              Full API reference →
            </Link>
          </p>
        </div>
      </section>

      {/* ━━ API Reference (7 layers) ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pb-14" id="api-reference">
        <div className="container max-w-6xl">
          <SectionHeader
            title="API Reference"
            description="Seven live layers — from the foundational algebraic rule to IPFS persistence. OpenAPI 3.1.0 compliant."
            id="api-reference-header"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {apiLayers.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
          <div className="mt-5 flex items-center gap-4">
            <Link
              to="/api"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Full interactive API explorer <ArrowRight size={14} />
            </Link>
            <a
              href="https://uor.foundation/openapi.json"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              OpenAPI 3.1.0 spec <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </section>

      {/* ━━ Platform Services ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pb-14" id="platform">
        <div className="container max-w-6xl">
          <SectionHeader
            title="Platform Services"
            description="Three infrastructure pillars: Compute, Storage, and Networking"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {platformServices.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        </div>
      </section>

      {/* ━━ Agentic AI + Verification (two-column) ━━━━━━━━━━━━━ */}
      <section className="pb-14" id="agentic-ai">
        <div className="container max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <SectionHeader title="Agentic AI" description="Agent registration, message routing, and MCP" />
              <CategoryCard category={agenticAi} />
            </div>
            <div id="verification">
              <SectionHeader title="Verification & Trust" description="Prove the framework's axioms independently" />
              <CategoryCard category={verificationTrust} />
            </div>
          </div>
        </div>
      </section>

      {/* ━━ Developer Tools + Resources (two-column) ━━━━━━━━━━━ */}
      <section className="pb-14" id="dev-tools">
        <div className="container max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <SectionHeader title="Developer Tools" description="SDKs, editors, and semantic web tooling" />
              <CategoryCard category={developerTools} />
            </div>
            <div id="resources">
              <SectionHeader title="Resources" description="Research, papers, and the UOR standard" />
              <CategoryCard category={resources} />
            </div>
          </div>
        </div>
      </section>

      {/* ━━ Bottom CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pb-24">
        <div className="container max-w-6xl">
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
