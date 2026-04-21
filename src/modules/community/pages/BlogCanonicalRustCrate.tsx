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
            viewBox="0 0 820 360"
            role="img"
            aria-label="Agent A sends a payload sealed with a UOR fingerprint to Agent B over MCP or A2A. Agent B re-derives the fingerprint locally and compares. The address is the content. No third-party authority is involved."
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

            {/* ============ AGENT A ============ */}
            <circle cx="120" cy="150" r="78" className="fill-background stroke-foreground" strokeWidth="2" />
            <text x="120" y="142" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 12, letterSpacing: "0.24em", textTransform: "uppercase", fontFamily: "ui-monospace, monospace" }}>Agent A</text>
            <text x="120" y="170" textAnchor="middle" className="fill-foreground" style={{ fontSize: 22, fontWeight: 700 }}>Sender</text>

            {/* ============ AGENT B ============ */}
            <circle cx="700" cy="150" r="78" className="fill-background stroke-foreground" strokeWidth="2" />
            <text x="700" y="142" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 12, letterSpacing: "0.24em", textTransform: "uppercase", fontFamily: "ui-monospace, monospace" }}>Agent B</text>
            <text x="700" y="170" textAnchor="middle" className="fill-foreground" style={{ fontSize: 22, fontWeight: 700 }}>Receiver</text>

            {/* ============ TRANSPORT RAIL ============ */}
            <line x1="200" y1="150" x2="622" y2="150" stroke="currentColor" className="text-primary" strokeWidth="2.5" markerEnd="url(#arrPrimary)" strokeDasharray="0" />
            <text x="411" y="100" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 13, letterSpacing: "0.28em", textTransform: "uppercase", fontFamily: "ui-monospace, monospace" }}>MCP  ·  A2A</text>

            {/* ============ SEALED PAYLOAD (the essence) ============ */}
            <g transform="translate(411 150)">
              {/* Outer seal ring */}
              <rect x="-110" y="-44" width="220" height="88" rx="12" className="fill-card stroke-primary" strokeWidth="2" />
              {/* Payload row */}
              <text x="0" y="-20" textAnchor="middle" className="fill-foreground" style={{ fontSize: 15, fontWeight: 600 }}>
                payload  ·  text · image · audio
              </text>
              {/* Divider */}
              <line x1="-90" y1="-8" x2="90" y2="-8" stroke="currentColor" className="text-border" strokeWidth="1" />
              {/* The seal */}
              <text x="0" y="14" textAnchor="middle" className="fill-primary" style={{ fontSize: 13, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>UOR seal</text>
              <text x="0" y="32" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 12, fontFamily: "ui-monospace, monospace" }}>sha256 · 256-bit · self-verifiable</text>
            </g>

            {/* ============ SENDER ACTION ============ */}
            <text x="120" y="252" textAnchor="middle" className="fill-foreground" style={{ fontSize: 14, fontWeight: 600 }}>derive seal</text>
            <text x="120" y="272" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 12, fontFamily: "ui-monospace, monospace" }}>canonical form → hash</text>

            {/* ============ RECEIVER ACTION ============ */}
            <text x="700" y="252" textAnchor="middle" className="fill-foreground" style={{ fontSize: 14, fontWeight: 600 }}>re-derive · compare</text>
            <text x="700" y="272" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 12, fontFamily: "ui-monospace, monospace" }}>match → trust locally</text>

            {/* ============ FOOTER ============ */}
            <text x="411" y="324" textAnchor="middle" className="fill-foreground" style={{ fontSize: 15, fontWeight: 600 }}>
              The address is the content. No PKI · no registry · no third party.
            </text>
          </svg>
          <figcaption className="mt-4 text-[12px] text-muted-foreground font-body text-center">
            Every object carries its own permanent, content-derived address — verification happens locally on each side.
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
