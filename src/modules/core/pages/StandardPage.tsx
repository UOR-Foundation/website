import { useEffect, useState } from "react";
import Layout from "@/modules/core/components/Layout";
import { Copy, Check, BookOpen, Github, Package } from "lucide-react";
import {
  GITHUB_FRAMEWORK_URL,
  GITHUB_FRAMEWORK_DOCS_URL,
  CRATE_URL,
  CRATE_DOCS_URL,
} from "@/data/external-links";
import { singleProofHash } from "@/lib/uor-canonical";

const DEMO_DEFAULT = `{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "Hello UOR",
  "author": "you"
}`;

const LiveDemo = () => {
  const [input, setInput] = useState(DEMO_DEFAULT);
  const [result, setResult] = useState<{ derivationId: string; glyph: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      setError("Waiting for valid JSON…");
      return;
    }
    singleProofHash(parsed)
      .then((r) => {
        if (cancelled) return;
        setResult({
          derivationId: r.derivationId,
          glyph: r.uorAddress["u:glyph"],
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Could not derive identity.");
      });
    return () => {
      cancelled = true;
    };
  }, [input]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          aria-label="Your data"
          className="w-full min-h-[260px] font-mono text-[14px] leading-[1.6] bg-background/60 border border-border/70 rounded-lg p-4 text-foreground/90 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
        />
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
        <div className="font-mono text-[13.5px] leading-[1.6] break-all bg-background/60 border border-border/70 rounded-lg p-4 text-foreground/90 min-h-[88px]">
          {error ? <span className="text-foreground/50">{error}</span> : result?.derivationId}
        </div>
        <div className="font-mono text-[22px] leading-[1.4] break-all bg-background/60 border border-border/70 rounded-lg p-4 text-foreground/90 min-h-[88px]">
          {result?.glyph ?? ""}
        </div>
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
      className="group inline-flex items-center gap-3 font-mono text-[14px] bg-card border border-border rounded-full pl-5 pr-4 py-2.5 text-foreground/90 hover:border-primary/40 transition-colors"
    >
      <span>{value}</span>
      {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} className="opacity-60 group-hover:opacity-100" />}
    </button>
  );
};

const Standard = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-44 md:pt-56 pb-16 md:pb-24">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <h1 className="font-display text-fluid-page-title font-bold text-foreground animate-fade-in-up">
            UOR Framework
          </h1>
          <p
            className="mt-10 text-foreground/70 font-body text-fluid-body leading-[1.7] max-w-4xl animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.15s" }}
          >
            Every piece of data gets one universal identity. Type something below and watch it
            become an address that anyone, anywhere, can verify.
          </p>
          <div
            className="mt-8 flex flex-wrap gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.25s" }}
          >
            <a
              href={GITHUB_FRAMEWORK_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-foreground/60 text-foreground font-medium font-body text-fluid-body hover:bg-foreground hover:text-background transition-all duration-200"
            >
              <BookOpen size={16} />
              Read the docs
            </a>
            <a
              href={GITHUB_FRAMEWORK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-foreground/60 text-foreground font-medium font-body text-fluid-body hover:bg-foreground hover:text-background transition-all duration-200"
            >
              <Github size={16} />
              View on GitHub
            </a>
            <a
              href={CRATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-foreground/60 text-foreground font-medium font-body text-fluid-body hover:bg-foreground hover:text-background transition-all duration-200"
            >
              <Package size={16} />
              crates.io
            </a>
          </div>
        </div>
      </section>

      {/* Live demo */}
      <section className="py-section-sm bg-background border-b border-border/40">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            Try it
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-8">
            See it work
          </h2>
          <LiveDemo />
          <p className="mt-5 text-fluid-label font-body text-foreground/55">
            Same input → same identity. On any machine. Forever.
          </p>
        </div>
      </section>

      {/* Install */}
      <section className="py-section-sm bg-background">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            Install
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-8">
            Add it to your project
          </h2>
          <div className="flex flex-col items-start gap-5">
            <CopyableCommand value="cargo add uor-foundation" />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-fluid-label font-body text-foreground/65">
              <a href={CRATE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">crates.io</a>
              <span aria-hidden className="text-foreground/30">·</span>
              <a href={CRATE_DOCS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">docs.rs</a>
              <span aria-hidden className="text-foreground/30">·</span>
              <a href={GITHUB_FRAMEWORK_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">source on GitHub</a>
              <span aria-hidden className="text-foreground/30">·</span>
              <a href={GITHUB_FRAMEWORK_DOCS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">full spec</a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Standard;
