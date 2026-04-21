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
      title="UOR Identity: A universal data passport for your AI agent"
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
            viewBox="0 0 760 330"
            role="img"
            aria-label="Sender derives a 256-bit fingerprint from a structured object via canonical form and SHA-256. The object and fingerprint travel together over MCP or A2A. The receiver re-runs the same pipeline on arrival and compares."
            className="w-full h-auto text-foreground"
          >
            <defs>
              <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="currentColor" className="text-muted-foreground" />
              </marker>
            </defs>

            {/* Sender lane */}
            <text x="20" y="28" className="fill-muted-foreground" style={{ fontSize: 13, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, monospace" }}>Sender</text>
            <g>
              <rect x="20" y="44" width="150" height="64" rx="8" className="fill-background stroke-border" strokeWidth="1.25" />
              <text x="95" y="82" textAnchor="middle" className="fill-foreground" style={{ fontSize: 16, fontWeight: 600 }}>Object</text>

              <line x1="170" y1="76" x2="210" y2="76" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.5" markerEnd="url(#arr)" />

              <rect x="210" y="44" width="170" height="64" rx="8" className="fill-background stroke-border" strokeWidth="1.25" />
              <text x="295" y="82" textAnchor="middle" className="fill-foreground" style={{ fontSize: 16, fontWeight: 600 }}>Canonical form</text>

              <line x1="380" y1="76" x2="420" y2="76" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.5" markerEnd="url(#arr)" />

              <rect x="420" y="44" width="150" height="64" rx="8" className="fill-background stroke-border" strokeWidth="1.25" />
              <text x="495" y="82" textAnchor="middle" className="fill-foreground" style={{ fontSize: 16, fontWeight: 600 }}>SHA-256</text>

              <line x1="570" y1="76" x2="610" y2="76" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.5" markerEnd="url(#arr)" />

              <rect x="610" y="44" width="130" height="64" rx="8" className="fill-primary/10 stroke-primary" strokeWidth="1.25" />
              <text x="675" y="82" textAnchor="middle" className="fill-foreground" style={{ fontSize: 16, fontWeight: 600 }}>Fingerprint</text>
            </g>

            {/* Connectors from sender down into transport */}
            <line x1="95" y1="108" x2="95" y2="142" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="675" y1="108" x2="675" y2="142" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.5" strokeDasharray="4 4" />

            {/* Transport band — MCP / A2A */}
            <rect x="20" y="142" width="720" height="60" rx="10" className="fill-muted/30 stroke-border" strokeWidth="1.25" strokeDasharray="5 4" />
            <text x="40" y="167" className="fill-muted-foreground" style={{ fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, monospace" }}>Transport</text>
            <text x="380" y="180" textAnchor="middle" className="fill-foreground" style={{ fontSize: 17, fontWeight: 600 }}>MCP   ·   A2A</text>
            <text x="380" y="196" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 12, fontFamily: "ui-monospace, monospace" }}>object + fingerprint travel together</text>

            {/* Connectors from transport down into receiver */}
            <line x1="95" y1="202" x2="95" y2="236" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="675" y1="202" x2="675" y2="236" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.5" strokeDasharray="4 4" />

            {/* Receiver lane */}
            <text x="20" y="226" className="fill-muted-foreground" style={{ fontSize: 13, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, monospace" }}>Receiver</text>

            <rect x="20" y="246" width="150" height="64" rx="8" className="fill-background stroke-border" strokeWidth="1.25" />
            <text x="95" y="284" textAnchor="middle" className="fill-foreground" style={{ fontSize: 16, fontWeight: 600 }}>Object</text>

            <line x1="170" y1="278" x2="380" y2="278" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.5" markerEnd="url(#arr)" />

            <rect x="380" y="246" width="220" height="64" rx="8" className="fill-background stroke-border" strokeWidth="1.25" />
            <text x="490" y="284" textAnchor="middle" className="fill-foreground" style={{ fontSize: 16, fontWeight: 600 }}>Re-run pipeline</text>

            <line x1="600" y1="278" x2="640" y2="278" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.5" markerEnd="url(#arr)" />

            <rect x="640" y="246" width="100" height="64" rx="8" className="fill-primary/10 stroke-primary" strokeWidth="1.25" />
            <text x="690" y="284" textAnchor="middle" className="fill-foreground" style={{ fontSize: 16, fontWeight: 600 }}>Compare</text>
          </svg>
          <figcaption className="mt-4 text-[12px] text-muted-foreground font-body text-center">
            One pipeline, two ends. The fingerprint is re-derived on arrival — no keys, no registry.
          </figcaption>
        </figure>
      </section>

      <section>
        <h2>Try it</h2>
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
