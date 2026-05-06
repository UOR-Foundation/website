import { useEffect, useMemo, useState } from "react";
import Layout from "@/modules/core/components/Layout";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  Globe,
  ShieldCheck,
  Bot,
  Microscope,
  Layers,
  Rocket,
  Package,
  BookOpen,
  Github,
  Copy,
  Check,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { applications } from "@/data/applications";
import {
  GITHUB_FRAMEWORK_URL,
  GITHUB_FRAMEWORK_DOCS_URL,
  CRATE_URL,
  CRATE_DOCS_URL,
} from "@/data/external-links";
import { singleProofHash } from "@/lib/uor-canonical";

const appIconMap: Record<string, LucideIcon> = {
  Globe,
  ShieldCheck,
  Bot,
  Microscope,
  Layers,
  Rocket,
};

const conceptCards = [
  {
    eyebrow: "The idea",
    title: "Same data, same identity.",
    body: "Any piece of data — a document, a dataset, an AI output — gets one universal address derived from its content. Anywhere. Forever.",
    href: `${GITHUB_FRAMEWORK_DOCS_URL}docs/overview.html`,
    label: "Read the overview",
  },
  {
    eyebrow: "How it works",
    title: "Canonicalize, hash, address.",
    body: "Data is rewritten into one deterministic form, hashed once, and that hash becomes its name. No registry, no server, no trust required.",
    href: `${GITHUB_FRAMEWORK_DOCS_URL}docs/architecture.html`,
    label: "See the architecture",
  },
  {
    eyebrow: "Why it matters",
    title: "Verifiable by anyone.",
    body: "Two people on opposite sides of the world can check the same data and get the same identity. That makes AI auditable and science reproducible.",
    href: `${GITHUB_FRAMEWORK_DOCS_URL}docs/use-cases.html`,
    label: "Where it applies",
  },
];

const DEMO_DEFAULT = `{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "Hello UOR",
  "author": "you"
}`;

const LiveDemo = () => {
  const [input, setInput] = useState(DEMO_DEFAULT);
  const [result, setResult] = useState<{
    nquads: string;
    hashHex: string;
    derivationId: string;
    glyph: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      setError("Not valid JSON yet — keep typing.");
      setLoading(false);
      return;
    }
    singleProofHash(parsed)
      .then((r) => {
        if (cancelled) return;
        setResult({
          nquads: r.nquads.trim(),
          hashHex: r.hashHex,
          derivationId: r.derivationId,
          glyph: r.uorAddress["u:glyph"],
        });
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Could not derive identity.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [input]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-border bg-card p-5 flex flex-col">
        <label className="text-fluid-label font-semibold uppercase tracking-[0.14em] text-primary/70 font-body mb-3">
          Your data
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          className="flex-1 min-h-[220px] font-mono text-[14px] leading-[1.6] bg-background/60 border border-border/70 rounded-lg p-4 text-foreground/90 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
        />
        <p className="mt-3 text-fluid-label font-body text-foreground/55">
          Edit anything — even one character — and the identity below changes.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
        <div>
          <label className="text-fluid-label font-semibold uppercase tracking-[0.14em] text-primary/70 font-body">
            UOR identity
          </label>
          <div className="mt-3 font-mono text-[13.5px] leading-[1.6] break-all bg-background/60 border border-border/70 rounded-lg p-4 text-foreground/90 min-h-[64px]">
            {loading && !result ? "computing…" : error ? <span className="text-foreground/50">{error}</span> : result?.derivationId}
          </div>
        </div>
        <div>
          <label className="text-fluid-label font-semibold uppercase tracking-[0.14em] text-primary/70 font-body">
            Address glyph
          </label>
          <div className="mt-3 font-mono text-[20px] leading-[1.4] break-all bg-background/60 border border-border/70 rounded-lg p-4 text-foreground/90 min-h-[64px]">
            {result?.glyph ?? ""}
          </div>
        </div>
        <p className="text-fluid-label font-body text-foreground/55 mt-auto">
          Same input → same identity, on any machine. This is exactly what the Rust crate produces.
        </p>
      </div>
    </div>
  );
};

const CopyableCommand = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="group w-full flex items-center justify-between gap-3 font-mono text-[14px] bg-background/60 border border-border/70 rounded-lg px-4 py-3 text-foreground/90 hover:border-primary/40 transition-colors"
    >
      <span className="truncate text-left">{value}</span>
      {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} className="opacity-60 group-hover:opacity-100" />}
    </button>
  );
};

const Standard = () => {
  const pathCards = useMemo(
    () => [
      {
        icon: Package,
        eyebrow: "Run it",
        title: "Use the Rust crate",
        body: "The canonical implementation. Install once, get a verifiable UOR identity for any data.",
        command: "cargo add uor-foundation",
        primary: { href: CRATE_URL, label: "crates.io" },
        secondary: { href: CRATE_DOCS_URL, label: "docs.rs" },
      },
      {
        icon: BookOpen,
        eyebrow: "Read it",
        title: "Read the spec",
        body: "Plain-language documentation: what UOR is, how it's built, and the API surface.",
        primary: { href: GITHUB_FRAMEWORK_DOCS_URL, label: "Open docs" },
      },
      {
        icon: Github,
        eyebrow: "Browse it",
        title: "Read the source",
        body: "Every layer is open. Audit it, fork it, contribute back.",
        primary: { href: GITHUB_FRAMEWORK_URL, label: "View on GitHub" },
      },
    ],
    [],
  );

  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-48 md:pt-64 pb-20 md:pb-32">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <h1 className="font-display text-fluid-page-title font-bold text-foreground animate-fade-in-up">
            Learn UOR
          </h1>
          <p
            className="mt-6 text-fluid-body text-foreground/70 font-body leading-relaxed animate-fade-in-up max-w-2xl"
            style={{ animationDelay: "0.12s" }}
          >
            A universal way to give every piece of data a verifiable identity. Read it, run it, build on it — in that order.
          </p>
          <div
            className="mt-10 flex flex-col sm:flex-row flex-wrap gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.3s" }}
          >
            <a href="#see-it" className="btn-primary inline-flex items-center gap-2">
              See how it works
              <ArrowRight size={14} />
            </a>
            <a
              href={CRATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline inline-flex items-center gap-2"
            >
              <Package size={14} />
              Install the crate
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* What is UOR */}
      <section className="py-section-sm bg-background border-b border-border/40">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            What is UOR?
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-golden-lg max-w-3xl">
            Three things to know.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {conceptCards.map((c) => (
              <div key={c.title} className="rounded-2xl border border-border bg-card p-6 flex flex-col">
                <p className="text-fluid-label font-semibold uppercase tracking-[0.14em] text-primary/70 font-body mb-3">
                  {c.eyebrow}
                </p>
                <h3 className="font-display text-fluid-card-title font-bold text-foreground mb-3">
                  {c.title}
                </h3>
                <p className="text-fluid-body font-body text-foreground/70 leading-relaxed flex-1">
                  {c.body}
                </p>
                <a
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-5 text-fluid-label font-body font-medium text-primary/80 hover:text-primary transition-colors"
                >
                  {c.label}
                  <ExternalLink size={13} className="opacity-70" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* See it work */}
      <section id="see-it" className="py-section-sm bg-background border-b border-border/40 scroll-mt-24">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            See it work
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-golden-lg max-w-3xl">
            Type some data. Get its universal identity.
          </h2>
          <LiveDemo />
        </div>
      </section>

      {/* Pick your path */}
      <section className="py-section-sm bg-background border-b border-border/40">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            Pick your path
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-golden-lg max-w-3xl">
            One concrete next step.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pathCards.map((p) => (
              <div key={p.title} className="rounded-2xl border border-border bg-card p-6 flex flex-col">
                <p.icon size={20} className="text-primary mb-4" />
                <p className="text-fluid-label font-semibold uppercase tracking-[0.14em] text-primary/70 font-body mb-2">
                  {p.eyebrow}
                </p>
                <h3 className="font-display text-fluid-card-title font-bold text-foreground mb-2">
                  {p.title}
                </h3>
                <p className="text-fluid-body font-body text-foreground/70 leading-relaxed flex-1">
                  {p.body}
                </p>
                {p.command && (
                  <div className="mt-5">
                    <CopyableCommand value={p.command} />
                  </div>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                  <a
                    href={p.primary.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-fluid-label font-body font-semibold text-primary hover:opacity-80 transition-opacity"
                  >
                    {p.primary.label}
                    <ExternalLink size={13} />
                  </a>
                  {p.secondary && (
                    <a
                      href={p.secondary.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-fluid-label font-body font-medium text-foreground/70 hover:text-primary transition-colors"
                    >
                      {p.secondary.label}
                      <ExternalLink size={13} className="opacity-70" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Where it applies */}
      <section className="py-section-sm bg-background border-b border-border/40">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            Where it applies
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-golden-lg max-w-3xl">
            Real domains, today.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {applications.map((item) => {
              const Icon = appIconMap[item.iconKey];
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border bg-card p-6"
                >
                  {Icon && <Icon size={20} className="text-primary mb-4" />}
                  <h3 className="font-display text-fluid-card-title font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-fluid-body font-body text-foreground/70 leading-relaxed">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Next step */}
      <section className="section-dark py-section-sm">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] max-w-4xl text-center">
          <h2 className="font-display text-fluid-heading font-bold mb-4">
            Ready to build?
          </h2>
          <p className="text-section-dark-foreground/60 font-body text-fluid-body leading-relaxed max-w-xl mx-auto mb-10">
            See projects already running on UOR.
          </p>
          <Link
            to="/projects"
            className="px-7 py-3 rounded-full font-medium text-fluid-label transition-all duration-300 ease-out bg-primary text-primary-foreground hover:opacity-90 hover:shadow-lg inline-flex items-center justify-center gap-2"
          >
            Explore projects
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Standard;
