import ArticleLayout from "@/modules/core/components/ArticleLayout";
import { Link } from "react-router-dom";
import { CRATE_URL, GITHUB_ORG_URL } from "@/data/external-links";
import { blogPosts } from "@/data/blog-posts";
import heroImage from "@/assets/project-uor-identity.jpg";

const SLUG = "/blog/canonical-rust-crate";

const BlogCanonicalRustCrate = () => {
  const related = blogPosts
    .filter((p) => p.href !== SLUG)
    .slice(0, 3)
    .map((p) => ({ title: p.title, href: p.href, meta: `${p.tag} · ${p.date}` }));

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
        <h2>The problem</h2>
        <p>
          The same JSON tool-call leaves an agent, passes through a queue, gets re-serialized by another runtime, and arrives with a different hash. MCP and A2A standardize how agents talk; neither lets the receiver prove the object is the one the sender produced.
        </p>
        <p>
          Byte-level integrity (RFC 8785 / JCS) breaks at the first legitimate re-serialization. This is the class of issue showing up across LangGraph, AutoGen, and CrewAI deserialization and state-mismatch threads.
        </p>
      </section>

      <section>
        <h2>A data passport</h2>
        <p>
          A short, content-derived identifier that travels with the object. Identical meaning produces an identical identifier across languages, runtimes, and serializers. Different meaning always produces a different one.
        </p>
      </section>

      <section>
        <h2>How it works</h2>
        <p>
          Reduce the object to a canonical structural form, then hash it with a standard cryptographic hash (SHA-256 by default, pluggable). The canonicalization step is small, deterministic, and formally verified in Lean 4. Collision resistance comes from the hash you already trust.
        </p>
        <pre>{`object → canonical form → SHA-256 → 256-bit identity`}</pre>
      </section>

      <section>
        <h2>What you write</h2>
        <pre>{`use uor_foundation::prelude::*;

let cert = identify(&tool_call)?;          // sender
assert_eq!(cert.fingerprint(), expected);  // receiver`}</pre>
        <p>
          No keys. No registry. No network. No PKI. The receiver re-runs the same function and compares.
        </p>
      </section>

      <section>
        <h2>Where it sits next to what you know</h2>
        <ul>
          <li><strong>Git, IPFS, Sigstore</strong> — perfect when the object <em>is</em> its bytes; breaks when the bytes legitimately change.</li>
          <li><strong>JCS / RFC 8785</strong> — fixes byte order at one moment in time; ends at the first deserialize.</li>
          <li><strong>W3C Subresource Integrity</strong> — closest cousin. SRI re-derives a script's identity on arrival; this is SRI for structured objects.</li>
          <li><strong>JSON-LD + URDNA2015</strong> — solves canonicalization for RDF; this generalizes the idea and removes the PKI dependency.</li>
        </ul>
      </section>

      <section>
        <h2>What it isn't, and how to try it</h2>
        <p>
          Not a PKI, ledger, namespace, or filesystem. Compose with those when you need them. The Rust crate is the reference implementation; the same pipeline runs in your browser on the playground.
        </p>
        <ul>
          <li><strong>Playground:</strong> <Link to="/oracle">/oracle</Link></li>
          <li><strong>Install:</strong> <code>cargo add uor-foundation</code></li>
          <li><strong>Source:</strong> <a href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer">github.com/uor-foundation</a></li>
          <li><strong>Spec:</strong> <Link to="/framework">/framework</Link></li>
        </ul>
      </section>
    </ArticleLayout>
  );
};

export default BlogCanonicalRustCrate;
