import ArticleLayout from "@/modules/core/components/ArticleLayout";
import { Link } from "react-router-dom";
import { CRATE_URL, GITHUB_ORG_URL } from "@/data/external-links";
import { blogPosts } from "@/data/blog-posts";
import heroImage from "@/assets/project-uor-identity.jpg";
import blogKnowledgeGraph from "@/assets/blog-knowledge-graph.png";
import blogGoldenSeed from "@/assets/blog-golden-seed-vector.png";
import blogFrameworkLaunch from "@/assets/blog-uor-framework-launch.png";

const coverMap: Record<string, string> = {
  knowledgeGraph: blogKnowledgeGraph,
  goldenSeed: blogGoldenSeed,
  frameworkLaunch: blogFrameworkLaunch,
};

const SLUG = "/blog/canonical-rust-crate";

const BlogCanonicalRustCrate = () => {
  const related = blogPosts
    .filter((p) => p.href !== SLUG)
    .slice(0, 3)
    .map((p) => ({
      title: p.title,
      href: p.href,
      meta: `${p.tag} · ${p.date}`,
      image: coverMap[p.coverKey],
    }));

  return (
    <ArticleLayout
      kicker="Standards"
      date="April 2, 2026"
      title="A universal data passport for your AI agent"
      deck="An open standard with a Rust reference implementation that gives every structured object a stable, content-derived identity — one that survives the round-trips real agents put it through."
      heroImage={heroImage}
      heroCaption="An open standard for structured-object identity between agents."
      backHref="/research#blog"
      backLabel="Back to Research"
      sourceUrl={CRATE_URL}
      sourceLabel="crates.io/crates/uor-foundation"
      related={related}
    >
      <section>
        <h2>What it is</h2>
        <p>
          UOR is an open standard, with a Rust reference implementation <code>uor-foundation</code>, that gives any structured object a 256-bit content-derived address.
        </p>
        <p>
          It's designed to sit underneath MCP, A2A, and any transport carrying typed objects between agents.
        </p>
      </section>

      <section>
        <h2>Why it exists</h2>
        <p>
          MCP and A2A specify how agents talk. Neither lets the receiver prove the object it got is the one the sender produced.
        </p>
        <p>
          Byte-level schemes like JCS (RFC 8785) break the moment a JSON library re-orders keys or re-encodes a number — the issue tracked across LangGraph, AutoGen, and CrewAI today.
        </p>
      </section>

      <section>
        <h2>How it works</h2>
        <p>
          Reduce the object to a canonical structural form, then hash it. The reduction is a deterministic operation over ℤ/256ℤ, formally verified in Lean 4 (its central lemma is the two's-complement identity <code>neg(bnot(x)) = succ(x)</code>).
        </p>
        <p>
          Reorder keys, swap encodings, round-trip through three serializers — the canonical form, and the fingerprint, don't change. Collision resistance comes from SHA-256, exactly as in Git or IPFS.
        </p>
        <pre>{`object → canonical form (ℤ/256ℤ reduction) → SHA-256 → 256-bit fingerprint`}</pre>
      </section>

      <section>
        <h2>Architecture</h2>
        <p>
          One pipeline, two ends. The sender derives a fingerprint; the receiver re-derives it from whatever arrives and compares.
        </p>
        <figure className="not-prose my-8 rounded-xl border border-border bg-card p-6 md:p-8">
          <svg
            viewBox="0 0 760 280"
            role="img"
            aria-label="Sender derives a 256-bit fingerprint from a structured object via canonical form and SHA-256; the receiver re-runs the same pipeline on arrival and compares."
            className="w-full h-auto text-foreground"
          >
            <defs>
              <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="currentColor" className="text-muted-foreground" />
              </marker>
            </defs>

            {/* Sender lane */}
            <text x="20" y="28" className="fill-muted-foreground" style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "ui-monospace, monospace" }}>Sender</text>
            <g>
              <rect x="20" y="44" width="150" height="56" rx="8" className="fill-background stroke-border" strokeWidth="1.25" />
              <text x="95" y="70" textAnchor="middle" className="fill-foreground" style={{ fontSize: 13, fontWeight: 600 }}>Object</text>
              <text x="95" y="88" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>typed structure</text>

              <line x1="170" y1="72" x2="210" y2="72" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.25" markerEnd="url(#arr)" />

              <rect x="210" y="44" width="170" height="56" rx="8" className="fill-background stroke-border" strokeWidth="1.25" />
              <text x="295" y="70" textAnchor="middle" className="fill-foreground" style={{ fontSize: 13, fontWeight: 600 }}>Canonical form</text>
              <text x="295" y="88" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>ℤ/256ℤ reduction</text>

              <line x1="380" y1="72" x2="420" y2="72" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.25" markerEnd="url(#arr)" />

              <rect x="420" y="44" width="150" height="56" rx="8" className="fill-background stroke-border" strokeWidth="1.25" />
              <text x="495" y="70" textAnchor="middle" className="fill-foreground" style={{ fontSize: 13, fontWeight: 600 }}>SHA-256</text>
              <text x="495" y="88" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>pluggable hash</text>

              <line x1="570" y1="72" x2="610" y2="72" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.25" markerEnd="url(#arr)" />

              <rect x="610" y="44" width="130" height="56" rx="8" className="fill-primary/10 stroke-primary" strokeWidth="1.25" />
              <text x="675" y="70" textAnchor="middle" className="fill-foreground" style={{ fontSize: 13, fontWeight: 600 }}>Fingerprint</text>
              <text x="675" y="88" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>256-bit</text>
            </g>

            {/* Transport */}
            <line x1="675" y1="106" x2="675" y2="150" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.25" strokeDasharray="3 3" markerEnd="url(#arr)" />
            <text x="685" y="132" className="fill-muted-foreground" style={{ fontSize: 11, fontFamily: "ui-monospace, monospace" }}>travels with object</text>

            <line x1="95" y1="106" x2="95" y2="180" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.25" strokeDasharray="3 3" />
            <line x1="95" y1="180" x2="610" y2="180" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.25" strokeDasharray="3 3" markerEnd="url(#arr)" />
            <text x="340" y="172" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11, fontFamily: "ui-monospace, monospace" }}>MCP / A2A / queue / re-serializer</text>

            {/* Receiver lane */}
            <text x="20" y="216" className="fill-muted-foreground" style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "ui-monospace, monospace" }}>Receiver</text>

            <rect x="420" y="190" width="190" height="56" rx="8" className="fill-background stroke-border" strokeWidth="1.25" />
            <text x="515" y="216" textAnchor="middle" className="fill-foreground" style={{ fontSize: 13, fontWeight: 600 }}>Re-run pipeline</text>
            <text x="515" y="234" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>same canonical form + hash</text>

            <line x1="610" y1="218" x2="650" y2="218" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.25" markerEnd="url(#arr)" />

            <rect x="650" y="190" width="90" height="56" rx="8" className="fill-primary/10 stroke-primary" strokeWidth="1.25" />
            <text x="695" y="216" textAnchor="middle" className="fill-foreground" style={{ fontSize: 13, fontWeight: 600 }}>Compare</text>
            <text x="695" y="234" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>match / refuse</text>
          </svg>
          <figcaption className="mt-4 text-[12px] text-muted-foreground font-body text-center">
            One pipeline, two ends. The fingerprint is re-derived on arrival — no keys, no registry.
          </figcaption>
        </figure>
      </section>

      <section>
        <h2>Use it</h2>
        <pre>{`use uor_foundation::prelude::*;

let cert = identify(&tool_call)?;          // sender
assert_eq!(cert.fingerprint(), expected);  // receiver`}</pre>
        <ul>
          <li><strong>Playground:</strong> <Link to="/oracle">/oracle</Link></li>
          <li><strong>Install:</strong> <code>cargo add uor-foundation</code></li>
          <li><strong>Source:</strong> <a href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer">github.com/uor-foundation</a></li>
        </ul>
      </section>
    </ArticleLayout>
  );
};

export default BlogCanonicalRustCrate;
