import Navbar from "@/modules/core/components/Navbar";
import Footer from "@/modules/core/components/Footer";
import DocsLayout from "../components/DocsLayout";
import { docSidebars } from "../data/doc-sidebars";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink } from "lucide-react";
import { DocIcon } from "../components/DocIcon";

const FundamentalsDocPage = () => (
  <>
    <Navbar />
    <DocsLayout
      sidebar={docSidebars.fundamentals}
      breadcrumbs={[{ label: "Fundamentals" }]}
      tocItems={[
        { label: "What is UOR?", id: "what" },
        { label: "How it works", id: "how" },
        { label: "Why it matters", id: "why" },
        { label: "Infrastructure", id: "infrastructure" },
        { label: "For AI agents", id: "agents" },
        { label: "Get started", id: "start" },
        { label: "Resources", id: "resources" },
      ]}
    >
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          UOR Fundamentals
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
          UOR is a universal coordinate system for information. It gives every piece of
          content a permanent address derived from what it <em>is</em> — not where it lives.
          Same content, same address, on any system, with no coordination required.
        </p>
      </div>

      {/* What is UOR? */}
      <section id="what" className="mb-12">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-3">What is UOR?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Most systems identify data by <em>where</em> it is — a URL, a database row, a file path.
          Move the data and the ID breaks. Copy it and you get a new ID. The same information
          has different identities depending on which system you ask.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          UOR inverts this. Every object's address is computed from its content using
          deterministic algebra. The result is a single, permanent identifier that works
          the same way everywhere:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border/30 rounded-xl overflow-hidden border border-border/40 mb-4">
          {[
            {
              title: "Content = Identity",
              desc: "The address is derived from the content. Change the content, the address changes. Keep the content, the address stays.",
            },
            {
              title: "No registry needed",
              desc: "Any system can compute the same address independently. No central authority, no coordination, no conflicts.",
            },
            {
              title: "Verifiable by anyone",
              desc: "Given an address and its content, any peer can confirm the match. No trust in third parties required.",
            },
          ].map((item, i) => (
            <div key={i} className="bg-card/30 p-5">
              <h3 className="text-sm font-semibold text-foreground mb-1.5 font-body">{item.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mb-12">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-3">How it works</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          UOR is built on a mathematical structure called a <strong className="text-foreground">commutative ring</strong> — the same
          algebra behind integer arithmetic. Content is encoded as elements in this ring,
          and identities are computed using standard ring operations.
        </p>

        <div className="space-y-4 mb-4">
          {[
            {
              step: "1",
              title: "Encode",
              desc: "Content is converted into a sequence of ring elements (bytes → integers). Each element gets a canonical representation — a unique prime factorization.",
            },
            {
              step: "2",
              title: "Address",
              desc: "The canonical form is hashed to produce a fixed-length address. Same content → same canonical form → same hash → same address. Always.",
            },
            {
              step: "3",
              title: "Verify",
              desc: "Given content and its claimed address, recompute the canonical form and hash. If they match, the content is authentic. If not, it's been modified. No exceptions.",
            },
          ].map((s) => (
            <div key={s.step} className="flex gap-4 items-start">
              <span className="shrink-0 w-8 h-8 rounded-lg bg-primary/15 text-primary text-sm font-bold flex items-center justify-center">
                {s.step}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground font-body mb-1">{s.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">The key insight:</strong> because the addressing
            is algebraic (not heuristic), UOR can <em>prove</em> correctness — not just estimate it.
            Every result carries a verification grade (A–D) indicating the strength of evidence.{" "}
            <Link to="/developers/concepts#grades" className="text-primary hover:underline">
              Learn about grades →
            </Link>
          </p>
        </div>
      </section>

      {/* Why it matters */}
      <section id="why" className="mb-12">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-3">Why it matters</h2>
        <div className="space-y-4">
          {[
            {
              title: "Eliminate integration glue",
              desc: "When every system derives the same ID for the same content, cross-system joins become trivial. No mapping tables, no reconciliation pipelines, no ID translation layers.",
            },
            {
              title: "Trust without authority",
              desc: "Verification is mathematical, not institutional. Any peer can confirm any claim independently. This is the foundation for zero-trust architectures that actually work.",
            },
            {
              title: "Agentic AI needs verifiable data",
              desc: "AI agents making decisions on your behalf need to know the data they're working with is authentic and unchanged. Content-addressed identity gives agents a cryptographic proof chain for every input and output.",
            },
            {
              title: "Future-proof identity",
              desc: "Content-derived addresses don't depend on any company, server, or protocol surviving. The math works the same today, tomorrow, and in 50 years.",
            },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="text-sm font-semibold text-foreground font-body mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Infrastructure overview */}
      <section id="infrastructure" className="mb-12">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-3">Infrastructure</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          UOR is deployed as a virtual private infrastructure with three pillars.
          Each service is independently useful, but they share the same content-addressed identity layer.
        </p>

        <div className="space-y-3">
          {[
            {
              icon: "Cpu",
              pillar: "Compute",
              desc: "Sandboxed edge functions with deterministic execution traces. Every invocation is independently verifiable.",
              links: [
                { label: "Edge Functions", href: "/developers/compute" },
                { label: "Agent Gateway", href: "/developers/agents" },
              ],
            },
            {
              icon: "HardDrive",
              pillar: "Storage",
              desc: "Content-addressed persistence. Objects, key-value pairs, and relational queries — all with cryptographic receipts.",
              links: [
                { label: "Object Store", href: "/developers/store" },
                { label: "KV Store", href: "/developers/kv" },
                { label: "Ledger", href: "/developers/ledger" },
              ],
            },
            {
              icon: "Network",
              pillar: "Networking",
              desc: "Identity, routing, and zero-trust security. Names resolve to content, not locations. Authentication is post-quantum.",
              links: [
                { label: "Name Service", href: "/developers/dns" },
                { label: "Shield (WAF)", href: "/developers/shield" },
                { label: "Trust & Auth", href: "/developers/trust" },
              ],
            },
          ].map((p) => (
            <div key={p.pillar} className="rounded-xl border border-border/40 bg-card/20 p-5">
              <div className="flex items-center gap-2.5 mb-2">
                <DocIcon name={p.icon} size={16} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground font-body">{p.pillar}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">{p.desc}</p>
              <div className="flex flex-wrap gap-2">
                {p.links.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {link.label}
                    <ArrowRight size={10} />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Agentic AI */}
      <section id="agents" className="mb-12">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-3">Built for agentic AI</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          When AI agents operate autonomously — reading data, calling APIs, making decisions —
          they need guarantees that traditional systems can't provide:
        </p>
        <div className="space-y-2 mb-4">
          {[
            { label: "Data hasn't been tampered with", desc: "Content addresses prove integrity without trusting the source." },
            { label: "Computations are reproducible", desc: "Deterministic traces let any agent re-verify another agent's work." },
            { label: "Injection is detectable", desc: "Algebraic partition analysis catches malicious prompts before they reach the agent." },
            { label: "Attribution is provable", desc: "Every agent output is signed and graded, creating an auditable chain of responsibility." },
          ].map((item) => (
            <div key={item.label} className="flex gap-3 items-start rounded-lg border border-border/30 bg-card/20 p-3">
              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
              <div>
                <p className="text-sm text-foreground font-medium font-body">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Link
          to="/developers/agents"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          Explore the Agent Gateway →
        </Link>
      </section>

      {/* Get started */}
      <section id="start" className="mb-12">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-3">Get started</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Before building, we recommend reviewing{" "}
          <Link to="/developers/concepts" className="text-primary hover:underline">
            Core Concepts
          </Link>{" "}
          to understand content addressing, verification grades, and the trust model.
        </p>
        <div className="space-y-3">
          {[
            {
              icon: "BookOpen",
              label: "Core Concepts",
              desc: "Five ideas in under 10 minutes. Content addressing, verification grades, trust model.",
              href: "/developers/concepts",
            },
            {
              icon: "Rocket",
              label: "Getting Started",
              desc: "Zero to first API call in 5 minutes. No account, no SDK, just curl.",
              href: "/developers/getting-started",
            },
            {
              icon: "Code",
              label: "TypeScript SDK",
              desc: "Install @uns/sdk — one client class wrapping all services with full type safety.",
              href: "/developers/sdk",
            },
            {
              icon: "FileJson",
              label: "API Reference",
              desc: "48 endpoints with working curl examples and JSON-LD responses.",
              href: "/api",
            },
          ].map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="group flex items-center gap-4 rounded-xl border border-border/40 bg-card/20 p-4 hover:border-primary/30 transition-colors"
            >
              <DocIcon name={link.icon} size={18} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground font-body">{link.label}</p>
                <p className="text-xs text-muted-foreground">{link.desc}</p>
              </div>
              <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      {/* Resources */}
      <section id="resources">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-4">Additional resources</h2>
        <div className="space-y-2">
          {[
            { label: "GitHub — UOR Foundation", href: "https://github.com/UOR-Foundation", external: true },
            { label: "Conformance Suite", href: "/conformance", desc: "35 mathematical proofs. Verify the framework yourself." },
            { label: "Knowledge Graph Explorer", href: "/kg", desc: "Browse the UOR knowledge graph with SPARQL." },
            { label: "Agent Console", href: "/agent-console", desc: "Register agents, route messages, detect injection." },
            { label: "UOR Standard", href: "/standard", desc: "Full specification of the framework's six-layer architecture." },
          ].map((link) => (
            <div key={link.href}>
              {"external" in link && link.external ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  {link.label}
                  <ExternalLink size={12} />
                </a>
              ) : (
                <Link to={link.href} className="text-sm text-primary hover:underline">
                  {link.label}
                </Link>
              )}
              {link.desc && (
                <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </DocsLayout>
    <Footer />
  </>
);

export default FundamentalsDocPage;
