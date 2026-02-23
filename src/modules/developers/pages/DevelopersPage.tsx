import Layout from "@/modules/core/components/Layout";
import { Link } from "react-router-dom";
import { ArrowRight, Terminal, Copy, Check, Rocket, Layers, BookOpen, Code, Globe, Cpu, Database, Key, ScrollText, Shield, Lock, Bot, FileJson, FlaskConical, Wrench, Newspaper } from "lucide-react";
import { useState } from "react";

/* ── Copy button ─────────────────────────────────────────────── */
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

/* ── Nav link row ────────────────────────────────────────────── */
const NavRow = ({ title, href, icon: Icon }: { title: string; href: string; icon?: React.ElementType }) => (
  <Link
    to={href}
    className="group flex items-center gap-2.5 py-2 text-sm text-foreground/80 hover:text-primary transition-colors"
  >
    {Icon && <Icon size={14} className="shrink-0 text-muted-foreground/50 group-hover:text-primary transition-colors" />}
    <span className="truncate">{title}</span>
    <ArrowRight size={12} className="shrink-0 ml-auto text-muted-foreground/20 group-hover:text-primary transition-colors" />
  </Link>
);

/* ── Section card ────────────────────────────────────────────── */
const SectionCard = ({
  title,
  children,
  viewAll,
}: {
  title: string;
  children: React.ReactNode;
  viewAll?: { label: string; href: string };
}) => (
  <div className="rounded-xl border border-border/40 bg-card/20 p-6 flex flex-col">
    <h3 className="text-base font-bold text-foreground font-body mb-3">{title}</h3>
    <div className="flex-1">{children}</div>
    {viewAll && (
      <Link to={viewAll.href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
        {viewAll.label} <ArrowRight size={14} />
      </Link>
    )}
  </div>
);

const curlCmd = `curl "https://api.uor.foundation/v1/kernel/op/verify?x=42"`;

/* ── Page ─────────────────────────────────────────────────────── */
const DevelopersPage = () => (
  <Layout>
    <div className="dark bg-section-dark text-section-dark-foreground min-h-screen">

      {/* ━━ Hero ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pt-44 pb-6 md:pt-52 md:pb-10">
        <div className="container max-w-6xl">
          <nav className="flex items-center gap-5 text-sm mb-8">
            <Link to="/developers/directory" className="text-foreground/70 hover:text-foreground underline underline-offset-4 decoration-border/60 transition-colors">Directory</Link>
            <Link to="/research" className="text-foreground/70 hover:text-foreground underline underline-offset-4 decoration-border/60 transition-colors">Resources</Link>
            <Link to="/api" className="text-foreground/70 hover:text-foreground underline underline-offset-4 decoration-border/60 transition-colors">API</Link>
          </nav>

          <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-foreground mb-3">
            UOR Developer Docs
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
            Guides and references for building on the UOR content-addressed framework.
          </p>
        </div>
      </section>

      {/* ━━ Primary grid — 4 columns ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pb-12">
        <div className="container max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Featured */}
            <SectionCard title="Featured" viewAll={{ label: "View all docs", href: "/developers/directory" }}>
              <NavRow title="Getting Started" href="/developers/getting-started" icon={Rocket} />
              <NavRow title="What is UOR?" href="/developers/fundamentals" icon={Layers} />
              <NavRow title="Core Concepts" href="/developers/concepts" icon={BookOpen} />
              <NavRow title="API Reference" href="/api" icon={FileJson} />
            </SectionCard>

            {/* Platform Services */}
            <SectionCard title="Platform Services" viewAll={{ label: "View all services", href: "/developers/directory" }}>
              <NavRow title="Name Service (DNS)" href="/developers/dns" icon={Globe} />
              <NavRow title="Compute" href="/developers/compute" icon={Cpu} />
              <NavRow title="Object Store" href="/developers/store" icon={Database} />
              <NavRow title="KV Store" href="/developers/kv" icon={Key} />
              <NavRow title="Ledger (SQL)" href="/developers/ledger" icon={ScrollText} />
            </SectionCard>

            {/* Security & Trust */}
            <SectionCard title="Security & Trust" viewAll={{ label: "View all security docs", href: "/developers/shield" }}>
              <NavRow title="Shield (WAF)" href="/developers/shield" icon={Shield} />
              <NavRow title="Trust & Auth" href="/developers/trust" icon={Lock} />
              <NavRow title="Conformance Suite" href="/conformance" icon={FlaskConical} />
              <NavRow title="System Audit" href="/audit" icon={Wrench} />
            </SectionCard>

            {/* AI & Agents */}
            <SectionCard title="AI & Agents" viewAll={{ label: "View agent docs", href: "/developers/agents" }}>
              <NavRow title="Agent Gateway" href="/developers/agents" icon={Bot} />
              <NavRow title="MCP Integration" href="/standard#mcp" />
              <NavRow title="Agent Console" href="/agent-console" />
            </SectionCard>
          </div>
        </div>
      </section>

      {/* ━━ Divider ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="container max-w-6xl"><div className="h-px bg-border/30" /></div>

      {/* ━━ Code snippet ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-12">
        <div className="container max-w-6xl">
          <h2 className="text-xl font-display font-bold text-foreground mb-1">Build with UOR</h2>
          <p className="text-sm text-muted-foreground mb-5">No account, no API key — just curl.</p>

          <div className="relative rounded-lg border border-border/40 bg-card/10 overflow-hidden max-w-2xl">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 text-xs text-muted-foreground">
              <Terminal size={12} className="text-primary" />
              <span className="font-mono">Try it now</span>
            </div>
            <CopyBtn text={curlCmd} />
            <pre className="px-4 py-3 text-[13px] font-mono text-foreground/90 overflow-x-auto"><code>{curlCmd}</code></pre>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Every response includes a cryptographic receipt.{" "}
            <Link to="/api" className="text-primary hover:underline">Full API reference →</Link>
          </p>
        </div>
      </section>

      {/* ━━ Divider ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="container max-w-6xl"><div className="h-px bg-border/30" /></div>

      {/* ━━ Secondary grid — 3 columns ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-12">
        <div className="container max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* API Reference */}
            <SectionCard title="API Reference" viewAll={{ label: "Interactive API explorer", href: "/api" }}>
              <NavRow title="Foundation (Layer 0)" href="/api#layer-0" />
              <NavRow title="Identity (Layer 1)" href="/api#layer-1" />
              <NavRow title="Structure (Layer 2)" href="/api#layer-2" />
              <NavRow title="Verification (Layer 4)" href="/api#layer-4" />
              <NavRow title="Persistence (Layer 6)" href="/api#layer-6" />
              <NavRow title="OpenAPI 3.1 Spec" href="/openapi.json" />
            </SectionCard>

            {/* Developer Tools */}
            <SectionCard title="Developer Tools" viewAll={{ label: "View all tools", href: "/developers/directory" }}>
              <NavRow title="API Reference" href="/api" icon={FileJson} />
              <NavRow title="SPARQL Editor" href="/sparql-editor" />
              <NavRow title="Knowledge Graph" href="/knowledge-graph" />
              <NavRow title="Ring Explorer" href="/ring-explorer" />
              <NavRow title="Derivation Lab" href="/derivation-lab" />
            </SectionCard>

            {/* Resources */}
            <SectionCard title="Resources" viewAll={{ label: "View all resources", href: "/research" }}>
              <NavRow title="Atlas Embeddings" href="/research/atlas-embeddings" icon={Newspaper} />
              <NavRow title="UOR Standard" href="/standard" />
              <NavRow title="Semantic Web" href="/semantic-web" />
              <NavRow title="Blog" href="/blog/uor-framework-launch" />
            </SectionCard>
          </div>
        </div>
      </section>

      {/* ━━ Divider ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="container max-w-6xl"><div className="h-px bg-border/30" /></div>

      {/* ━━ Footer links ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-12 pb-24">
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
