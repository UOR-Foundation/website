import Layout from "@/modules/core/components/Layout";
import { Link } from "react-router-dom";
import {
  overviewCategories,
  docPillars,
} from "../data/doc-categories";
import DocCategoryCard from "../components/DocCategoryCard";
import { DocIcon } from "../components/DocIcon";
import {
  ArrowRight,
  BookOpen,
  FileJson,
  Terminal,
  Github,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";

/* ── Copy button for code blocks ──────────────────────────────── */
const CopyBtn = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors"
      aria-label="Copy code"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
};

/* ── Pillar icon mapping ──────────────────────────────────────── */
const pillarIcons: Record<string, string> = {
  compute: "Cpu",
  storage: "HardDrive",
  networking: "Network",
};

/* ── Quick-start code ─────────────────────────────────────────── */
const quickStartCode = `curl "https://api.uor.foundation/v1/kernel/op/verify?x=42"`;

const quickStartResponse = `{
  "x": 42,
  "neg_bnot_x": 43,
  "succ_x": 43,
  "holds": true,
  "epistemic_grade": "A"
}`;

/* ── Page ─────────────────────────────────────────────────────── */
const DevelopersPage = () => (
  <Layout>
    <div className="dark bg-section-dark text-section-dark-foreground min-h-screen">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="pt-32 pb-14 md:pt-40 md:pb-20">
        <div className="container max-w-5xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-primary mb-4">
                Developer Documentation
              </p>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight text-foreground mb-4">
                Build on UOR
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
                A virtual private infrastructure for content-addressed identity,
                verifiable computation, and zero-trust networking. One SDK. Every service.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/api"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <FileJson size={15} />
                API Reference
              </Link>
              <a
                href="https://github.com/UOR-Foundation"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-card/60 transition-colors"
              >
                <Github size={15} />
                GitHub
              </a>
            </div>
          </div>

          {/* ── In 30 seconds ─────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border/30 rounded-xl overflow-hidden border border-border/40">
            {[
              {
                title: "Content = Identity",
                desc: "Every piece of content gets a permanent address derived from that content — not from a registry.",
              },
              {
                title: "Deterministic",
                desc: "The same content always produces the same address, on any system, with no coordination.",
              },
              {
                title: "Independently Verifiable",
                desc: "Any peer can verify that an address is correct, independently, with no shared state.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-card/30 p-6"
              >
                <h3 className="text-sm font-semibold text-foreground mb-2 font-body">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quick Start ───────────────────────────────────────── */}
      <section className="pb-16 md:pb-20">
        <div className="container max-w-5xl">
          <div className="flex items-center gap-2 mb-6">
            <Terminal size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground font-body tracking-wide uppercase">
              Quick Start
            </h2>
            <span className="text-xs text-muted-foreground ml-2">
              — First API call in 30 seconds
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Request */}
            <div className="relative rounded-xl border border-border/50 bg-section-dark overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30 text-xs text-muted-foreground">
                <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-mono font-medium text-[10px]">
                  GET
                </span>
                <span className="font-mono">Request</span>
              </div>
              <CopyBtn text={quickStartCode} />
              <pre className="p-4 text-xs font-mono text-foreground/90 leading-relaxed overflow-x-auto">
                <code>{quickStartCode}</code>
              </pre>
            </div>

            {/* Response */}
            <div className="relative rounded-xl border border-border/50 bg-section-dark overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30 text-xs text-muted-foreground">
                <span className="px-2 py-0.5 rounded bg-green-500/15 text-green-400 font-mono font-medium text-[10px]">
                  200
                </span>
                <span className="font-mono">Response</span>
              </div>
              <CopyBtn text={quickStartResponse} />
              <pre className="p-4 text-xs font-mono text-foreground/90 leading-relaxed overflow-x-auto">
                <code>
                  <span className="text-muted-foreground">{"{"}</span>{"\n"}
                  {"  "}<span className="text-primary">"x"</span>: 42,{"\n"}
                  {"  "}<span className="text-primary">"neg_bnot_x"</span>: 43,{"\n"}
                  {"  "}<span className="text-primary">"succ_x"</span>: 43,{"\n"}
                  {"  "}<span className="text-primary">"holds"</span>: <span className="text-green-400">true</span>,{"\n"}
                  {"  "}<span className="text-primary">"epistemic_grade"</span>: <span className="text-amber-300">"A"</span>{"\n"}
                  <span className="text-muted-foreground">{"}"}</span>
                </code>
              </pre>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground max-w-2xl">
            <code className="text-primary/80">holds: true</code> confirms the addressing
            scheme's mathematical foundation is intact.{" "}
            <code className="text-primary/80">epistemic_grade: "A"</code> means
            this result is algebraically proven — not estimated.
          </p>
        </div>
      </section>

      {/* ── Overview: What UOR Is ─────────────────────────────── */}
      <section className="pb-16 md:pb-20">
        <div className="container max-w-5xl">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground font-body tracking-wide uppercase">
              Overview
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mb-6 max-w-lg">
            Understand the framework before you build. What it is, how it works, why it matters.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {overviewCategories.map((cat) => (
              <DocCategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Infrastructure Pillars ─────────────────────────────── */}
      {docPillars.map((pillar) => (
        <section key={pillar.id} className="pb-16 md:pb-20">
          <div className="container max-w-5xl">
            <div className="flex items-center gap-2 mb-2">
              <DocIcon name={pillarIcons[pillar.id] || "Server"} size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground font-body tracking-wide uppercase">
                {pillar.title}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-6 max-w-lg">
              {pillar.description}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pillar.categories.map((cat) => (
                <DocCategoryCard key={cat.id} category={cat} />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* ── SDK Quick Start ────────────────────────────────────── */}
      <section className="pb-16 md:pb-20">
        <div className="container max-w-5xl">
          <div className="flex items-center gap-2 mb-6">
            <DocIcon name="Code" size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground font-body tracking-wide uppercase">
              TypeScript SDK
            </h2>
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase tracking-wider ml-2">
              Soon
            </span>
          </div>
          <div className="relative rounded-xl border border-border/50 bg-section-dark overflow-hidden max-w-2xl">
            <CopyBtn text={`npm install @uns/sdk`} />
            <pre className="p-5 text-xs font-mono text-foreground/90 leading-loose overflow-x-auto">
              <code>
                <span className="text-muted-foreground">// Install</span>{"\n"}
                npm install @uns/sdk{"\n\n"}
                <span className="text-muted-foreground">// Initialize</span>{"\n"}
                <span className="text-primary">import</span> {"{"} UnsClient, generateKeypair {"}"} <span className="text-primary">from</span> <span className="text-amber-300">'@uns/sdk'</span>;{"\n\n"}
                <span className="text-primary">const</span> keypair = <span className="text-primary">await</span> generateKeypair();{"\n"}
                <span className="text-primary">const</span> client = <span className="text-primary">new</span> UnsClient({"{"}
                {"\n"}{"  "}nodeUrl: <span className="text-amber-300">'https://node.uor.foundation'</span>,
                {"\n"}{"  "}identity: keypair,
                {"\n"}{"}"});{"\n\n"}
                <span className="text-muted-foreground">// Derive a content address</span>{"\n"}
                <span className="text-primary">const</span> id = <span className="text-primary">await</span> client.computeCanonicalId({"{"} hello: <span className="text-amber-300">'world'</span> {"}"});
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* ── Bottom nav links ───────────────────────────────────── */}
      <section className="pb-24">
        <div className="container max-w-5xl">
          <div className="h-px bg-border/30 mb-10" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                title: "API Reference",
                desc: "48 endpoints. Working curl examples. JSON-LD responses.",
                href: "/api",
                icon: "FileJson",
              },
              {
                title: "Conformance Suite",
                desc: "35 mathematical proofs. Verify the framework yourself.",
                href: "/conformance",
                icon: "Shield",
              },
              {
                title: "Agent Console",
                desc: "Register agents, route messages, detect injection.",
                href: "/agent-console",
                icon: "Bot",
              },
            ].map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="group flex items-start gap-3 rounded-xl border border-border/40 bg-card/20 p-5 hover:border-primary/30 hover:bg-card/40 transition-all"
              >
                <DocIcon name={link.icon} size={18} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1 font-body flex items-center gap-1.5">
                    {link.title}
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {link.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  </Layout>
);

export default DevelopersPage;
