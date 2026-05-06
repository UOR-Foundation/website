import ArticleLayout from "@/modules/core/components/ArticleLayout";
import { CRATE_URL } from "@/data/external-links";
import { blogPosts } from "@/data/blog-posts";
import { getBlogCover } from "@/data/blog-covers";
import heroImage from "@/assets/blog-uor-foundation-crate.jpg";
import { Package, Boxes, Wand2, ShieldCheck, Terminal, ExternalLink, Sparkles, Wrench, Bug, Scale, Rss } from "lucide-react";
import { usePageMeta } from "@/modules/core/hooks/usePageMeta";

const SLUG = "/blog/uor-foundation-v0-3-1";
const PAGE_URL = `https://uor.foundation${SLUG}`;
const OG_IMAGE = "https://uor.foundation/og-uor-foundation-v0-3-1.jpg";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ENGINEERING_RSS = `${SUPABASE_URL ?? ""}/functions/v1/news-rss?category=Engineering`;
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

const RELEASE_NOTES: Array<{
  icon: typeof Sparkles;
  label: string;
  items: string[];
}> = [
  {
    icon: Sparkles,
    label: "New",
    items: [
      "Complete UOR Foundation vocabulary: 34 namespaces, 471 classes, 948 properties, all available as typed Rust traits.",
      "uor! procedural macro for writing canonical objects in plain Rust.",
      "Built-in helpers to compute the permanent address of any object with a single call.",
      "Generated docs on docs.rs covering every namespace and trait.",
    ],
  },
  {
    icon: Wrench,
    label: "Improved",
    items: [
      "Faster compile times through smaller, focused modules per namespace.",
      "Clearer error messages when a required field is missing or has the wrong type.",
      "Smaller binary footprint by tree-shaking unused namespaces at build time.",
    ],
  },
  {
    icon: Bug,
    label: "Fixed",
    items: [
      "Edge cases in canonical ordering for nested arrays.",
      "Property aliases that previously resolved to the wrong namespace.",
      "Documentation links for cross-referenced classes.",
    ],
  },
];

const MODULES: Array<{ name: string; purpose: string }> = [
  { name: "uor_foundation::core", purpose: "Base types, traits, and the address pipeline shared by every namespace." },
  { name: "uor_foundation::ontology", purpose: "Generated traits for all 34 namespaces in the UOR vocabulary." },
  { name: "uor_foundation::macros", purpose: "The uor! macro and supporting derive macros for canonical objects." },
  { name: "uor_foundation::address", purpose: "Deterministic, content-derived address computation and verification." },
  { name: "uor_foundation::prelude", purpose: "One-line import that brings the most common types into scope." },
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
      heroOverride={
        <div className="bg-muted/40 w-full overflow-hidden rounded-xl flex items-center justify-center">
          <img
            src={heroImage}
            alt="Terminal showing cargo add uor-foundation v0.3.1"
            className="w-full h-auto object-contain"
            loading="eager"
          />
        </div>
      }
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
        <h2>Release notes</h2>
        <p className="text-muted-foreground">
          What changed in v0.3.1, at a glance.
        </p>
        <div className="not-prose mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {RELEASE_NOTES.map((group) => (
            <div key={group.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <group.icon size={16} className="text-primary" />
                <span className="text-[11px] uppercase tracking-[0.22em] font-mono text-muted-foreground">
                  {group.label}
                </span>
              </div>
              <ul className="space-y-2.5 text-[14.5px] leading-[1.65] text-foreground/90">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 rounded-full bg-primary/70 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Module structure</h2>
        <p>
          The crate is organized so you can pull in just the pieces you need. Most projects start
          with <code>use uor_foundation::prelude::*;</code> and grow from there.
        </p>
        <figure className="not-prose my-6 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-[14.5px] leading-relaxed">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground w-[38%]">
                  Module
                </th>
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  What it provides
                </th>
              </tr>
            </thead>
            <tbody className="[&>tr]:border-b [&>tr]:border-border [&>tr:last-child]:border-0">
              {MODULES.map((m) => (
                <tr key={m.name}>
                  <td className="px-5 py-4 align-top">
                    <code className="text-foreground">{m.name}</code>
                  </td>
                  <td className="px-5 py-4 align-top text-muted-foreground">{m.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      </section>

      <section>
        <h2>License & compatibility</h2>
        <div className="not-prose mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <Scale size={18} className="text-primary mb-3" />
            <div className="font-display text-[1.05em] font-semibold text-foreground">Apache-2.0</div>
            <p className="mt-1 text-[13.5px] text-muted-foreground leading-[1.6]">
              Free for commercial and personal use. Patent grant included.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <Terminal size={18} className="text-primary mb-3" />
            <div className="font-display text-[1.05em] font-semibold text-foreground">Rust 1.75+</div>
            <p className="mt-1 text-[13.5px] text-muted-foreground leading-[1.6]">
              Builds on the current stable toolchain. No nightly required.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <ShieldCheck size={18} className="text-primary mb-3" />
            <div className="font-display text-[1.05em] font-semibold text-foreground">No unsafe</div>
            <p className="mt-1 text-[13.5px] text-muted-foreground leading-[1.6]">
              <code>#![forbid(unsafe_code)]</code> across the crate. Zero network dependencies at runtime.
            </p>
          </div>
        </div>
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
          <a
            href={ENGINEERING_RSS}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-card text-foreground font-display text-[14px] font-medium hover:bg-muted transition-colors"
            aria-label="Subscribe to Engineering announcements via RSS"
          >
            <Rss size={16} /> Subscribe (Engineering RSS)
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