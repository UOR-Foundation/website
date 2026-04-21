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
      date="April 21, 2026"
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
            viewBox="0 0 820 420"
            role="img"
            aria-label="Agent A sends a multimodal payload (text, image, audio, JSON tool call) to Agent B over MCP or A2A. A UOR fingerprint travels with the payload. Agent B re-derives the fingerprint locally and compares — no third-party authority is involved."
            className="w-full h-auto text-foreground"
          >
            <defs>
              <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="currentColor" className="text-muted-foreground" />
              </marker>
              <marker id="arrPrimary" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="currentColor" className="text-primary" />
              </marker>
            </defs>

            {/* ============ AGENT A (sender) ============ */}
            <rect x="20" y="40" width="240" height="220" rx="14" className="fill-background stroke-border" strokeWidth="1.5" />
            <text x="40" y="68" className="fill-muted-foreground" style={{ fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, monospace" }}>Agent A</text>
            <text x="40" y="92" className="fill-foreground" style={{ fontSize: 18, fontWeight: 600 }}>Sender</text>

            {/* Multimodal payload chips */}
            <g>
              <rect x="40" y="110" width="92" height="34" rx="17" className="fill-muted/40 stroke-border" strokeWidth="1" />
              <text x="86" y="132" textAnchor="middle" className="fill-foreground" style={{ fontSize: 13, fontWeight: 500 }}>text</text>

              <rect x="140" y="110" width="100" height="34" rx="17" className="fill-muted/40 stroke-border" strokeWidth="1" />
              <text x="190" y="132" textAnchor="middle" className="fill-foreground" style={{ fontSize: 13, fontWeight: 500 }}>image</text>

              <rect x="40" y="152" width="92" height="34" rx="17" className="fill-muted/40 stroke-border" strokeWidth="1" />
              <text x="86" y="174" textAnchor="middle" className="fill-foreground" style={{ fontSize: 13, fontWeight: 500 }}>audio</text>

              <rect x="140" y="152" width="100" height="34" rx="17" className="fill-muted/40 stroke-border" strokeWidth="1" />
              <text x="190" y="174" textAnchor="middle" className="fill-foreground" style={{ fontSize: 13, fontWeight: 500 }}>tool call</text>
            </g>

            {/* UOR seal on agent A */}
            <rect x="40" y="206" width="200" height="40" rx="8" className="fill-primary/10 stroke-primary" strokeWidth="1.25" />
            <text x="140" y="231" textAnchor="middle" className="fill-foreground" style={{ fontSize: 14, fontWeight: 600 }}>UOR fingerprint · 256-bit</text>

            {/* ============ TRANSPORT (A2A / MCP) ============ */}
            {/* Payload bundle traveling */}
            <line x1="260" y1="150" x2="560" y2="150" stroke="currentColor" className="text-primary" strokeWidth="2.25" markerEnd="url(#arrPrimary)" />
            <rect x="335" y="108" width="150" height="40" rx="8" className="fill-card stroke-primary" strokeWidth="1.25" />
            <text x="410" y="133" textAnchor="middle" className="fill-foreground" style={{ fontSize: 13, fontWeight: 600 }}>payload + passport</text>
            <text x="410" y="174" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, monospace" }}>A2A · MCP</text>

            {/* No third party — explicit, struck through */}
            <g>
              <rect x="320" y="220" width="180" height="56" rx="10" className="fill-muted/20 stroke-border" strokeWidth="1" strokeDasharray="4 4" />
              <text x="410" y="244" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 12, fontWeight: 500 }}>third-party authority</text>
              <text x="410" y="262" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11, fontFamily: "ui-monospace, monospace" }}>PKI · CA · registry</text>
              {/* big diagonal strike */}
              <line x1="328" y1="270" x2="492" y2="226" stroke="currentColor" className="text-destructive" strokeWidth="2.25" />
            </g>
            <text x="410" y="296" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 12, fontStyle: "italic" }}>not in the loop</text>

            {/* ============ AGENT B (receiver) ============ */}
            <rect x="560" y="40" width="240" height="220" rx="14" className="fill-background stroke-border" strokeWidth="1.5" />
            <text x="580" y="68" className="fill-muted-foreground" style={{ fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, monospace" }}>Agent B</text>
            <text x="580" y="92" className="fill-foreground" style={{ fontSize: 18, fontWeight: 600 }}>Receiver</text>

            {/* Receiver re-derives */}
            <rect x="580" y="110" width="200" height="48" rx="8" className="fill-background stroke-border" strokeWidth="1.25" />
            <text x="680" y="132" textAnchor="middle" className="fill-foreground" style={{ fontSize: 14, fontWeight: 600 }}>Re-run pipeline</text>
            <text x="680" y="150" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11, fontFamily: "ui-monospace, monospace" }}>same canonical form + hash</text>

            {/* Compare */}
            <line x1="680" y1="158" x2="680" y2="190" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.5" markerEnd="url(#arr)" />
            <rect x="580" y="190" width="200" height="56" rx="8" className="fill-primary/10 stroke-primary" strokeWidth="1.25" />
            <text x="680" y="214" textAnchor="middle" className="fill-foreground" style={{ fontSize: 15, fontWeight: 600 }}>Compare fingerprints</text>
            <text x="680" y="234" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 12 }}>match → trust   ·   mismatch → refuse</text>

            {/* Footer band */}
            <text x="410" y="345" textAnchor="middle" className="fill-foreground" style={{ fontSize: 14, fontWeight: 500 }}>
              Both agents compute the same passport from the same payload — independently.
            </text>
            <text x="410" y="370" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 12, fontFamily: "ui-monospace, monospace" }}>
              no shared key · no registry · no PKI
            </text>
          </svg>
          <figcaption className="mt-4 text-[12px] text-muted-foreground font-body text-center">
            Two agents, one pipeline. UOR Identity travels with the payload — verification happens locally on each side.
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
