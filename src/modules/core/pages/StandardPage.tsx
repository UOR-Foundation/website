import { useState } from "react";
import Layout from "@/modules/core/components/Layout";
import { Copy, Check, ExternalLink } from "lucide-react";
import { CRATE_URL, CRATE_DOCS_URL, CRATE_VERSION } from "@/data/external-links";

/**
 * /framework — Rust crate quickstart for AI-app developers.
 *
 * Four blocks, in order:
 *   1. What it gives you / what it removes (two sentences).
 *   2. Cargo.toml line (CRATE_VERSION is the single source of truth).
 *   3. A 10-line main.rs that compiles and prints a result you can re-derive
 *      by hand: neg(bnot(42)) = succ(42) = 43.
 *   4. One link to docs.rs.
 *
 * Everything else (REST API, ontology, theorem counts, agent-discovery files)
 * has been moved off this page; this is the crate door.
 */

const CARGO_SNIPPET = `[dependencies]
uor-foundation = "${CRATE_VERSION}"`;

const MAIN_RS = `// src/main.rs — compiles, runs, prints a result you can verify by hand.
extern crate uor_foundation;

fn neg(x: u8)  -> u8 { x.wrapping_neg() }   //  -x mod 256
fn bnot(x: u8) -> u8 { !x }                  //  bitwise NOT
fn succ(x: u8) -> u8 { x.wrapping_add(1) }   //  x + 1 mod 256

fn main() {
    let x: u8 = 42;
    assert_eq!(neg(bnot(x)), succ(x));       //  core invariant
    println!("neg(bnot({x})) = {} = succ({x}) = {}", neg(bnot(x)), succ(x));
}`;

const EXPECTED_OUTPUT = "neg(bnot(42)) = 43 = succ(42) = 43";

const CodeBlock = ({ code, label }: { code: string; label?: string }) => {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="relative rounded-lg border border-border/60 bg-card/40 overflow-hidden">
      {label && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
          <span className="font-mono text-[12px] tracking-[0.14em] uppercase text-foreground/55">
            {label}
          </span>
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1.5 text-[12px] font-body text-foreground/60 hover:text-foreground transition-colors"
            aria-label="Copy to clipboard"
          >
            {copied ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      <pre className="overflow-x-auto p-5 font-mono text-[13.5px] leading-[1.65] text-foreground/90"><code>{code}</code></pre>
    </div>
  );
};

const Standard = () => {
  return (
    <Layout>
      <section className="hero-gradient pt-44 md:pt-52 pb-10 md:pb-14">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] max-w-4xl">
          <h1 className="font-display text-fluid-page-title font-bold text-foreground">
            UOR Framework — Rust crate quickstart
          </h1>

          {/* Block 1: what it gives you, what it removes. Two sentences. */}
          <p className="mt-8 text-foreground/80 font-body text-fluid-body leading-[1.7]">
            <code className="font-mono text-foreground/95">uor-foundation</code> gives an
            AI app a content hash for every value it passes between agents, plus a
            re-derivable trace of how that value was produced.
          </p>
          <p className="mt-3 text-foreground/80 font-body text-fluid-body leading-[1.7]">
            Peers verify each other&rsquo;s outputs and detect tampering by recomputing
            the hash locally — no third party, no shared registry, no trust.
          </p>
        </div>
      </section>

      <section className="py-section-sm bg-background">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] max-w-4xl flex flex-col gap-12">
          {/* Block 2: Cargo.toml — single source of truth via CRATE_VERSION. */}
          <div>
            <p className="font-semibold tracking-[0.18em] uppercase text-primary/70 font-body text-fluid-label mb-4">
              1 · Add the dependency
            </p>
            <CodeBlock code={CARGO_SNIPPET} label="Cargo.toml" />
            <p className="mt-3 font-body text-[14px] text-foreground/55 leading-[1.65]">
              Or run <code className="font-mono text-foreground/80">cargo add uor-foundation</code> from your project root. Rust 1.74+.
            </p>
          </div>

          {/* Block 3: a main.rs that compiles, runs, prints a verifiable result. */}
          <div>
            <p className="font-semibold tracking-[0.18em] uppercase text-primary/70 font-body text-fluid-label mb-4">
              2 · Run a verifiable example
            </p>
            <CodeBlock code={MAIN_RS} label="src/main.rs" />
            <div className="mt-4 rounded-md border border-border/50 bg-muted/20 px-4 py-3 font-mono text-[13px] text-foreground/80">
              <span className="text-foreground/45">$ cargo run&nbsp;&nbsp;→&nbsp;&nbsp;</span>
              {EXPECTED_OUTPUT}
            </div>
            <p className="mt-3 font-body text-[14px] text-foreground/60 leading-[1.65]">
              Re-derive by hand in 8-bit modular arithmetic:
              <code className="font-mono text-foreground/85"> !42 = 213</code>,
              <code className="font-mono text-foreground/85"> -213 mod 256 = 43</code>,
              <code className="font-mono text-foreground/85"> 42 + 1 = 43</code>.
              That equality is the crate&rsquo;s core invariant — every higher-level
              operation in <code className="font-mono text-foreground/85">kernel</code>,
              <code className="font-mono text-foreground/85"> pipeline</code>, and
              <code className="font-mono text-foreground/85"> bridge</code> reduces
              back to it.
            </p>
          </div>

          {/* Block 4: one link to docs.rs. */}
          <div>
            <p className="font-semibold tracking-[0.18em] uppercase text-primary/70 font-body text-fluid-label mb-4">
              3 · Read the rest
            </p>
            <a
              href={CRATE_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-mono text-fluid-body text-primary hover:text-primary/80 transition-colors underline underline-offset-4 decoration-primary/40"
            >
              docs.rs/uor-foundation/{CRATE_VERSION}
              <ExternalLink size={14} />
            </a>
            <p className="mt-3 font-body text-[14px] text-foreground/55 leading-[1.65]">
              Source on{" "}
              <a
                href={CRATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/75 hover:text-foreground underline underline-offset-2 decoration-foreground/30"
              >
                crates.io
              </a>.
            </p>
          </div>

          {/* Server-renderable fallback. mirrors index.html noscript pattern so
              curl, search-engine crawlers, and JS-disabled browsers still see
              the install snippet and the example. */}
          <noscript>
            <div className="mt-8 rounded-lg border border-border/60 bg-card/30 p-6 font-body text-foreground/80">
              <h2 className="font-display text-fluid-card-title font-semibold mb-3">
                UOR Framework — Rust crate quickstart
              </h2>
              <p className="mb-2">
                Add to <code>Cargo.toml</code>:
              </p>
              <pre className="overflow-x-auto rounded-md border border-border/50 bg-muted/30 p-3 font-mono text-[13px] mb-4"><code>{CARGO_SNIPPET}</code></pre>
              <p className="mb-2">A 10-line <code>src/main.rs</code> that compiles and prints {EXPECTED_OUTPUT}:</p>
              <pre className="overflow-x-auto rounded-md border border-border/50 bg-muted/30 p-3 font-mono text-[13px] mb-4"><code>{MAIN_RS}</code></pre>
              <p>
                Docs: <a href={CRATE_DOCS_URL}>docs.rs/uor-foundation/{CRATE_VERSION}</a>
                {" · "}
                Source: <a href={CRATE_URL}>crates.io/crates/uor-foundation</a>
              </p>
            </div>
          </noscript>
        </div>
      </section>
    </Layout>
  );
};

export default Standard;
