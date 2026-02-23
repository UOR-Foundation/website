import Layout from "@/modules/core/components/Layout";
import { Link } from "react-router-dom";
import { ArrowRight, Rocket, Layers, BookOpen, Globe, Cpu, Database, Key, ScrollText, Shield, Lock, Bot, FileJson, FlaskConical, Wrench, Newspaper } from "lucide-react";
import BuildWithUOR from "../components/BuildWithUOR";

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
            Welcome to UOR Developer Portal
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
            Explore a content-addressed framework that gives every piece of data a unique, verifiable identity — so you can build protocols and applications that are tamper-proof, interoperable, and ready for production.
          </p>
        </div>
      </section>

      {/* ━━ Primary grid — 4 columns ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pb-12">
        <div className="container max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SectionCard title="Featured" viewAll={{ label: "View all docs", href: "/developers/directory" }}>
              <NavRow title="Getting Started" href="/developers/getting-started" icon={Rocket} />
              <NavRow title="What is UOR?" href="/developers/fundamentals" icon={Layers} />
              <NavRow title="Core Concepts" href="/developers/concepts" icon={BookOpen} />
              <NavRow title="API Reference" href="/api" icon={FileJson} />
            </SectionCard>

            <SectionCard title="Platform Services" viewAll={{ label: "View all services", href: "/developers/directory" }}>
              <NavRow title="Name Service (DNS)" href="/developers/dns" icon={Globe} />
              <NavRow title="Compute" href="/developers/compute" icon={Cpu} />
              <NavRow title="Object Store" href="/developers/store" icon={Database} />
              <NavRow title="KV Store" href="/developers/kv" icon={Key} />
              <NavRow title="Ledger (SQL)" href="/developers/ledger" icon={ScrollText} />
            </SectionCard>

            <SectionCard title="Security & Trust" viewAll={{ label: "View all security docs", href: "/developers/shield" }}>
              <NavRow title="Shield (WAF)" href="/developers/shield" icon={Shield} />
              <NavRow title="Trust & Auth" href="/developers/trust" icon={Lock} />
              <NavRow title="Conformance Suite" href="/conformance" icon={FlaskConical} />
              <NavRow title="System Audit" href="/audit" icon={Wrench} />
            </SectionCard>

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

      {/* ━━ Build with UOR — tabbed code showcase ━━━━━━━━━━━━━━━ */}
      <BuildWithUOR />

      {/* ━━ Divider ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="container max-w-6xl"><div className="h-px bg-border/30" /></div>

      {/* ━━ Secondary grid — 2 columns ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-12">
        <div className="container max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SectionCard title="Developer Tools" viewAll={{ label: "View all tools", href: "/developers/directory" }}>
              <NavRow title="API Explorer" href="/api" icon={FileJson} />
              <NavRow title="SPARQL Editor" href="/sparql-editor" />
              <NavRow title="Knowledge Graph" href="/knowledge-graph" />
              <NavRow title="Ring Explorer" href="/ring-explorer" />
              <NavRow title="Derivation Lab" href="/derivation-lab" />
            </SectionCard>

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
