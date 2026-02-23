import Layout from "@/modules/core/components/Layout";
import { Link } from "react-router-dom";
import { ArrowRight, Terminal, Copy, Check } from "lucide-react";
import { useState } from "react";
import {
  gettingStarted,
  apiLayers,
  platformCompute,
  platformStorage,
  platformNetworking,
  agenticAi,
  verificationTrust,
  developerTools,
  resources,
  type ApiDirectoryCategory,
} from "../data/api-directory";

/* ── Inline copy button ──────────────────────────────────────── */
const CopyBtn = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors"
      aria-label="Copy"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
};

/* ── Link row (Cloudflare-style: simple text + arrow) ────────── */
const LinkRow = ({ title, href }: { title: string; href: string }) => {
  const isExternal = href.startsWith("http");
  const Comp = isExternal ? "a" : Link;
  const props = isExternal
    ? { href, target: "_blank", rel: "noopener noreferrer" }
    : { to: href };
  return (
    <Comp
      {...(props as any)}
      className="group flex items-center justify-between py-2 text-sm text-foreground/80 hover:text-primary transition-colors"
    >
      <span className="truncate">{title}</span>
      <ArrowRight size={14} className="shrink-0 ml-2 text-muted-foreground/30 group-hover:text-primary transition-colors" />
    </Comp>
  );
};

/* ── Category card (Cloudflare-style) ────────────────────────── */
const CategoryCard = ({
  category,
  viewAllLabel,
  viewAllHref,
}: {
  category: ApiDirectoryCategory;
  viewAllLabel?: string;
  viewAllHref?: string;
}) => (
  <div className="rounded-xl border border-border/40 bg-card/20 p-6 flex flex-col">
    <h3 className="text-base font-bold text-foreground font-body mb-4">
      {category.title}
    </h3>
    <div className="flex-1 space-y-0">
      {category.entries.map((entry) => (
        <LinkRow key={entry.id} title={entry.title} href={entry.href} />
      ))}
    </div>
    {viewAllLabel && viewAllHref && (
      <Link
        to={viewAllHref}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        {viewAllLabel} <ArrowRight size={14} />
      </Link>
    )}
  </div>
);

/* ── Merge API layers into one summary card ──────────────────── */
const apiHighlights: ApiDirectoryCategory = {
  id: "api-reference",
  title: "API Reference",
  description: "7 live layers — 48 endpoints",
  entries: [
    { id: "foundation", title: "Foundation (Layer 0)", description: "", href: "/api#layer-0" },
    { id: "identity", title: "Identity (Layer 1)", description: "", href: "/api#layer-1" },
    { id: "structure", title: "Structure (Layer 2)", description: "", href: "/api#layer-2" },
    { id: "verification", title: "Verification (Layer 4)", description: "", href: "/api#layer-4" },
    { id: "persistence", title: "Persistence (Layer 6)", description: "", href: "/api#layer-6" },
  ],
};

const platformHighlights: ApiDirectoryCategory = {
  id: "platform",
  title: "Platform Services",
  description: "Compute, Storage, Networking",
  entries: [
    ...platformCompute.entries,
    ...platformStorage.entries,
    ...platformNetworking.entries,
  ],
};

const curlCmd = `curl "https://api.uor.foundation/v1/kernel/op/verify?x=42"`;

/* ── Page ─────────────────────────────────────────────────────── */
const DevelopersPage = () => (
  <Layout>
    <div className="dark bg-section-dark text-section-dark-foreground min-h-screen">
      {/* ━━ Hero ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pt-44 pb-8 md:pt-52 md:pb-12">
        <div className="container max-w-6xl">
          {/* Top nav anchors */}
          <nav className="flex items-center gap-5 text-sm mb-8">
            <Link to="/developers/directory" className="text-foreground/70 hover:text-foreground underline underline-offset-4 decoration-border/60 transition-colors">
              Directory
            </Link>
            <a href="#resources" className="text-foreground/70 hover:text-foreground underline underline-offset-4 decoration-border/60 transition-colors">
              Resources
            </a>
            <Link to="/api" className="text-foreground/70 hover:text-foreground underline underline-offset-4 decoration-border/60 transition-colors">
              API
            </Link>
          </nav>

          <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-foreground mb-4">
            UOR Developer Docs
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Explore guides and references to start building on UOR's content-addressed framework.
          </p>
        </div>
      </section>

      {/* ━━ Top card grid (Cloudflare-style) ━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pb-14">
        <div className="container max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Featured / Getting Started */}
            <CategoryCard
              category={{
                ...gettingStarted,
                title: "Featured",
              }}
              viewAllLabel="View all docs"
              viewAllHref="/developers/directory"
            />

            {/* API Reference summary */}
            <CategoryCard
              category={apiHighlights}
              viewAllLabel="View all API layers"
              viewAllHref="/api"
            />

            {/* Platform Services summary */}
            <CategoryCard
              category={platformHighlights}
              viewAllLabel="View all services"
              viewAllHref="/developers/directory"
            />

            {/* Agentic AI */}
            <CategoryCard
              category={agenticAi}
              viewAllLabel="View all AI tools"
              viewAllHref="/developers/agents"
            />
          </div>
        </div>
      </section>

      {/* ━━ Divider ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="container max-w-6xl"><div className="h-px bg-border/30" /></div>

      {/* ━━ Build with UOR — code snippet ━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-14">
        <div className="container max-w-6xl">
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">
            Build with UOR
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl">
            Make your first verifiable API call — no account, no API key required.
          </p>

          <div className="relative rounded-lg border border-border/40 bg-card/10 overflow-hidden max-w-2xl">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30 text-xs text-muted-foreground">
              <Terminal size={12} className="text-primary" />
              <span className="font-mono">Try it now</span>
            </div>
            <CopyBtn text={curlCmd} />
            <pre className="px-4 py-4 text-[13px] font-mono text-foreground/90 overflow-x-auto">
              <code>{curlCmd}</code>
            </pre>
          </div>
          <p className="mt-3 text-sm text-muted-foreground max-w-xl">
            Every response includes a cryptographic receipt — proof the computation
            is correct and tamper-evident.{" "}
            <Link to="/api" className="text-primary hover:underline">
              Full API reference →
            </Link>
          </p>
        </div>
      </section>

      {/* ━━ Divider ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="container max-w-6xl"><div className="h-px bg-border/30" /></div>

      {/* ━━ Expanded sections — two-column layout ━━━━━━━━━━━━━━━ */}
      <section className="py-14">
        <div className="container max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <CategoryCard
              category={verificationTrust}
              viewAllLabel="View all verification tools"
              viewAllHref="/conformance"
            />
            <CategoryCard
              category={developerTools}
              viewAllLabel="View all developer tools"
              viewAllHref="/developers/directory"
            />
            <div id="resources">
              <CategoryCard
                category={resources}
                viewAllLabel="View all resources"
                viewAllHref="/research"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ━━ Divider ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="container max-w-6xl"><div className="h-px bg-border/30" /></div>

      {/* ━━ Bottom — Community & Open Source (Cloudflare-style) ━━ */}
      <section className="py-14 pb-24">
        <div className="container max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <h3 className="text-sm font-bold text-foreground font-body mb-3">Community</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="https://discord.gg/uorfoundation" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">Discord</a></li>
                <li><a href="https://www.linkedin.com/company/uorfoundation" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">LinkedIn</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground font-body mb-3">Open Source</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="https://github.com/UOR-Foundation" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">GitHub</a></li>
                <li><Link to="/standard" className="text-muted-foreground hover:text-foreground transition-colors">UOR Standard</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground font-body mb-3">Get Started</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Make your first verifiable API call in under 5 minutes.
              </p>
              <Link
                to="/developers/getting-started"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Get Started <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Layout>
);

export default DevelopersPage;
