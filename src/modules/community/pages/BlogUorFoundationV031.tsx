import ArticleLayout from "@/modules/core/components/ArticleLayout";
import { CRATE_URL } from "@/data/external-links";
import { blogPosts } from "@/data/blog-posts";
import { getBlogCover } from "@/data/blog-covers";
import heroImage from "@/assets/blog-uor-foundation-crate.jpg";
import { Package, Boxes, Wand2, ShieldCheck, Terminal, ExternalLink } from "lucide-react";
import { usePageMeta } from "@/modules/core/hooks/usePageMeta";

const SLUG = "/blog/uor-foundation-v0-3-1";
const PAGE_URL = `https://uor.foundation${SLUG}`;
const OG_IMAGE = "https://uor.foundation/og-uor-foundation-v0-3-1.jpg";
const PAGE_DESCRIPTION =
  "uor-foundation v0.3.1 brings the complete UOR Foundation vocabulary to Rust as typed traits — 34 namespaces, 471 classes, 948 properties, plus the uor! macro. cargo add uor-foundation.";

const STATS = [
  { icon: Boxes, label: "Namespaces", value: "34" },
  { icon: Package, label: "OWL classes", value: "471" },
  { icon: Wand2, label: "Properties", value: "948" },
  { icon: ShieldCheck, label: "License", value: "Apache-2.0" },
];

const HIGHLIGHTS = [
  {
    title: "The full ontology, as Rust types",
    body:
      "Every class and property in the UOR Foundation ontology is now available as a typed Rust trait. Your editor autocompletes the vocabulary, and the compiler catches mistakes before they ship.",
  },
  {
    title: "The uor! macro",
    body:
      "A short, readable way to describe objects in code. Write once, and the macro turns it into the canonical form used across every UOR system, with no hand-written boilerplate.",
  },
  {
    title: "One source of truth",
    body:
      "The crate is generated directly from the published specification. The Rust types, the ontology, and the addresses they produce always stay in sync.",
  },
  {
    title: "Ready for production",
    body:
      "Stable API surface, semantic versioning, no unsafe code, and zero runtime dependencies on the network. Drop it into any Rust project today.",
  },
];

const BlogUorFoundationV031 = () => {
  usePageMeta({
    title: "uor-foundation v0.3.1 is live on crates.io | UOR Foundation",
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    image: OG_IMAGE,
    imageAlt: "Terminal showing cargo add uor-foundation v0.3.1",
    type: "article",
    twitterCard: "summary_large_image",
  });

  const related = blogPosts
    .filter((p) => p.href !== SLUG)
    .slice(0, 3)
    .map((p) => ({
      title: p.title,
      href: p.href,
      meta: `${p.tag} · ${p.date}`,
      image: getBlogCover(p.coverKey),
    }));

  return (
    <ArticleLayout
      kicker="Engineering"
      date="May 5, 2026"
      title="uor-foundation v0.3.1 is live on crates.io"
      heroImage={heroImage}
      backHref="/news"
      backLabel="Back to News"
      sourceUrl={CRATE_URL}
      sourceLabel="crates.io/crates/uor-foundation"
      related={related}
    >
      <p>
        <strong>Today we are publishing version 0.3.1 of the <code>uor-foundation</code> Rust crate.</strong>{" "}
        It brings the complete UOR Foundation vocabulary into Rust as typed traits, so any Rust project
        can describe, address, and verify objects using the same standard the rest of the ecosystem
        speaks.
      </p>

      <section>
        <h2>What is in the release</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 not-prose">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <s.icon size={18} className="text-primary mb-3" />
              <div className="font-display text-[1.5em] font-semibold text-foreground leading-none">
                {s.value}
              </div>
              <div className="mt-1 text-[12px] uppercase tracking-[0.18em] font-mono text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Why it matters</h2>
        <p>
          Until now, working with the UOR vocabulary in Rust meant copying schema definitions by hand.
          With v0.3.1, the entire vocabulary lives in one crate that you can pull in with a single
          command. Your code expresses meaning, not plumbing, and the compiler keeps it honest.
        </p>
        <ul>
          {HIGHLIGHTS.map((h) => (
            <li key={h.title}>
              <strong>{h.title}.</strong> {h.body}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Install</h2>
        <p>One line in any Rust project:</p>
        <pre className="not-prose mt-4 mb-2 p-4 rounded-lg bg-muted/60 border border-border text-[13.5px] font-mono text-foreground leading-relaxed overflow-x-auto">
{`$ cargo add uor-foundation`}
        </pre>
        <p className="text-muted-foreground text-[14px]">
          Or pin it explicitly in <code>Cargo.toml</code>:
        </p>
        <pre className="not-prose mb-2 p-4 rounded-lg bg-muted/60 border border-border text-[13.5px] font-mono text-foreground leading-relaxed overflow-x-auto">
{`[dependencies]
uor-foundation = "0.3.1"`}
        </pre>
      </section>

      <section>
        <h2>A first taste</h2>
        <p>
          The <code>uor!</code> macro lets you describe an object in plain Rust and get back a fully
          typed, canonical UOR object ready to address, store, or send to another agent.
        </p>
        <pre className="not-prose mt-4 mb-2 p-4 rounded-lg bg-muted/60 border border-border text-[13.5px] font-mono text-foreground leading-relaxed overflow-x-auto">
{`use uor_foundation::uor;

let post = uor! {
    type: BlogPost,
    title: "Hello, UOR",
    author: "alex@uor.foundation",
};

let address = post.address(); // permanent, content-derived address`}
        </pre>
        <p>
          The same object always produces the same address, in any language and on any machine.
        </p>
      </section>

      <section>
        <h2>Get the crate</h2>
        <div className="not-prose mt-6 flex flex-wrap items-center gap-3">
          <a
            href={CRATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground font-display text-[14px] font-medium hover:opacity-90 transition-opacity"
          >
            <Terminal size={16} /> View on crates.io <ExternalLink size={14} />
          </a>
          <a
            href="https://docs.rs/uor-foundation"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-card text-foreground font-display text-[14px] font-medium hover:bg-muted transition-colors"
          >
            Read the docs <ExternalLink size={14} />
          </a>
        </div>
        <p className="mt-6">
          Found a bug, a missing class, or a rough edge? We would love to hear from you at{" "}
          <a href="mailto:hi@uor.foundation">hi@uor.foundation</a>.
        </p>
      </section>
    </ArticleLayout>
  );
};

export default BlogUorFoundationV031;