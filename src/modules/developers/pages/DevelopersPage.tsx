import Layout from "@/modules/core/components/Layout";
import { Link } from "react-router-dom";
import { overviewCategories, docPillars } from "../data/doc-categories";
import DocCategoryCard from "../components/DocCategoryCard";
import { DocIcon } from "../components/DocIcon";
import {
  ArrowRight,
  Terminal,
  Copy,
  Check,
  BookOpen,
  FlaskConical,
  Wrench,
  FolderTree,
} from "lucide-react";
import { useState } from "react";

/* ── Inline copy button ───────────────────────────────────────── */
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

/* ── Pillar icons ─────────────────────────────────────────────── */
const pillarIcon: Record<string, string> = { compute: "Cpu", storage: "HardDrive", networking: "Network" };

/* ── Quick-start snippet ──────────────────────────────────────── */
const curlCmd = `curl "https://api.uor.foundation/v1/kernel/op/verify?x=42"`;

/* ── Tools & explorers — focused set ──────────────────────────── */
const tools = [
  { title: "API Reference", desc: "48 endpoints with working examples.", href: "/api", icon: "FileJson" },
  { title: "Conformance Suite", desc: "35 algebraic proofs. Run them yourself.", href: "/conformance", icon: "ShieldCheck" },
  { title: "Ring Explorer", desc: "Inspect the algebraic ring underlying all addresses.", href: "/ring-explorer", icon: "CircleDot" },
  { title: "Knowledge Graph", desc: "Browse the live triplestore.", href: "/knowledge-graph", icon: "Share2" },
  { title: "SPARQL Editor", desc: "Query the graph directly.", href: "/sparql-editor", icon: "Search" },
  { title: "Agent Console", desc: "Register agents, route messages.", href: "/agent-console", icon: "Bot" },
];

/* ── Research ─────────────────────────────────────────────────── */
const papers = [
  { title: "Atlas Embeddings", desc: "Topological embedding theory for content-addressed spaces.", href: "/research/atlas-embeddings" },
  { title: "Building the Internet's Knowledge Graph", desc: "How content-addressed identity enables a verifiable web.", href: "/blog/building-the-internets-knowledge-graph" },
  { title: "Universal Mathematical Language", desc: "The algebraic foundations behind UOR addressing.", href: "/blog/universal-mathematical-language" },
  { title: "Framework Launch", desc: "Design rationale, architecture, and road ahead.", href: "/blog/uor-framework-launch" },
];

/* ── Page ─────────────────────────────────────────────────────── */
const DevelopersPage = () => (
  <Layout>
    <div className="dark bg-section-dark text-section-dark-foreground min-h-screen">

      {/* ━━ Hero ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="container max-w-4xl">
          <p className="text-[11px] font-medium tracking-[0.25em] uppercase text-primary mb-3">
            Documentation
          </p>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-foreground mb-3">
            UOR Developer Docs
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-xl mb-8">
            Content-addressed identity, verifiable computation, and zero-trust
            networking — one SDK, every service, no prior knowledge required.
          </p>

          {/* Primary actions */}
          <div className="flex flex-wrap gap-3">
            <Link to="/developers/getting-started" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Get Started <ArrowRight size={14} />
            </Link>
            <Link to="/api" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-card/60 transition-colors">
              API Reference
            </Link>
            <Link to="/developers/sdk" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-card/60 transition-colors">
              TypeScript SDK
            </Link>
          </div>
        </div>
      </section>

      {/* ━━ Try it — single curl ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pb-14 md:pb-16">
        <div className="container max-w-4xl">
          <div className="relative rounded-lg border border-border/50 bg-card/10 overflow-hidden max-w-2xl">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 text-xs text-muted-foreground">
              <Terminal size={12} className="text-primary" />
              <span className="font-mono">Try it — no account needed</span>
            </div>
            <CopyBtn text={curlCmd} />
            <pre className="px-4 py-3 text-[13px] font-mono text-foreground/90 overflow-x-auto">
              <code>{curlCmd}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ━━ Learn ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pb-14 md:pb-16">
        <div className="container max-w-4xl">
          <SectionHeader icon={<BookOpen size={15} />} title="Learn" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {overviewCategories.map((c) => (
              <DocCategoryCard key={c.id} category={c} />
            ))}
          </div>
        </div>
      </section>

      {/* ━━ Infrastructure — Pillars ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {docPillars.map((p) => (
        <section key={p.id} className="pb-14 md:pb-16">
          <div className="container max-w-4xl">
            <SectionHeader
              icon={<DocIcon name={pillarIcon[p.id] || "Server"} size={15} />}
              title={p.title}
              subtitle={p.description}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {p.categories.map((c) => (
                <DocCategoryCard key={c.id} category={c} />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* ━━ Tools & Explorers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pb-14 md:pb-16">
        <div className="container max-w-4xl">
          <SectionHeader
            icon={<Wrench size={15} />}
            title="Tools & Explorers"
            subtitle="Hands-on — everything runs in-browser."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tools.map((t) => (
              <Link
                key={t.href}
                to={t.href}
                className="group flex items-start gap-3 rounded-xl border border-border/40 bg-card/20 p-4 hover:border-primary/30 hover:bg-card/40 transition-all"
              >
                <DocIcon name={t.icon} size={16} className="text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground mb-0.5 font-body">{t.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{t.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ Research & Papers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pb-14 md:pb-16">
        <div className="container max-w-4xl">
          <SectionHeader
            icon={<FlaskConical size={15} />}
            title="Research & Papers"
            subtitle="Every claim is backed by formal proofs and published research."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {papers.map((r) => (
              <Link
                key={r.href}
                to={r.href}
                className="group flex items-start gap-3 rounded-xl border border-border/40 bg-card/20 p-4 hover:border-primary/30 hover:bg-card/40 transition-all"
              >
                <FlaskConical size={14} className="text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground mb-0.5 font-body">{r.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{r.desc}</p>
                </div>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            <Link to="/research" className="text-primary hover:underline">Browse all research →</Link>
          </p>
        </div>
      </section>

      {/* ━━ More ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pb-14 md:pb-16">
        <div className="container max-w-4xl">
          <SectionHeader icon={<FolderTree size={15} />} title="Explore" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { title: "Docs Directory", href: "/developers/directory", icon: "FolderTree" },
              { title: "Fundamentals", href: "/developers/fundamentals", icon: "Fingerprint" },
              { title: "Your Projects", href: "/projects", icon: "Layers" },
              { title: "UOR Standard", href: "/standard", icon: "BookOpen" },
            ].map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className="group flex flex-col items-center text-center rounded-xl border border-border/40 bg-card/20 p-4 hover:border-primary/30 hover:bg-card/40 transition-all"
              >
                <DocIcon name={l.icon} size={20} className="text-primary mb-2" />
                <span className="text-xs font-semibold text-foreground font-body">{l.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ Bottom CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pb-24">
        <div className="container max-w-4xl">
          <div className="h-px bg-border/30 mb-10" />
          <div className="text-center max-w-md mx-auto">
            <h2 className="text-lg font-display font-bold text-foreground mb-2">Ready to build?</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Make your first verifiable API call in under 5 minutes — no account required.
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

/* ── Reusable section header ──────────────────────────────────── */
const SectionHeader = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) => (
  <div className="mb-5">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-primary">{icon}</span>
      <h2 className="text-sm font-semibold text-foreground font-body tracking-wide uppercase">{title}</h2>
    </div>
    {subtitle && <p className="text-xs text-muted-foreground max-w-lg">{subtitle}</p>}
  </div>
);

export default DevelopersPage;
