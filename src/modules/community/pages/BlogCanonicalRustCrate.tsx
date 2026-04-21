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
        <h2>What UOR Identity is</h2>
        <p>
          UOR (Universal Object Reference) is an open standard, with a Rust reference implementation as <code>uor-foundation</code>, that gives a typed structured object a content-derived 256-bit address — one that survives the transformations those objects actually undergo between agents.
        </p>
        <p>
          It is designed to sit underneath MCP, A2A, and any other transport that carries structured data between autonomous systems.
        </p>
      </section>

      <section>
        <h2>The gap it fills</h2>
        <p>
          MCP and A2A specify how agents talk. Neither specifies how a receiver can prove the object it received is the one the sender produced.
        </p>
        <p>
          In practice, objects cross JSON libraries in two or three languages, middleware that reorders keys, queues that re-encode numbers, and checkpoint files that round-trip through different serializers. Byte-level integrity schemes — JCS (RFC 8785) and the closed MCP proposal SEP-2395 — break here: a single legitimate re-serialization invalidates the fingerprint even when the object is semantically unchanged.
        </p>
        <p>
          The pattern is visible across every major agent framework: LangGraph #7066, #7272, #7417; AutoGen #7220, #7403; CrewAI #5544.
        </p>
        <p>
          The byte-addressable world (Git, IPFS, Sigstore, JSON-LD with URDNA2015) solved this for files, immutable blocks, and signed documents. None of those tools were built for live typed objects moving between runtimes.
        </p>
      </section>

      <section>
        <h2>How it works</h2>
        <p>
          UOR canonicalizes an object at the algebraic-structure level, then hashes the canonical form. The canonicalization is a total, deterministic reduction over ℤ/256ℤ, formally verified in Lean 4. Its central correctness lemma — the two's-complement identity <code>neg(bnot(x)) = succ(x)</code> — eliminates a signedness branch and keeps the reduction arithmetic uniform.
        </p>
        <p>
          The canonical form is unique up to semantic equivalence. Reorder the keys, swap integer encodings, round-trip through three JSON libraries — the canonical form, and therefore the fingerprint, is unchanged. This is the property byte-level canonicalization cannot provide.
        </p>
        <pre>{`object → canonical form (ℤ/256ℤ reduction) → SHA-256 → 256-bit fingerprint`}</pre>
        <p>
          The fingerprint is produced by a pluggable cryptographic hash (default SHA-256). Collision resistance comes from the hash, exactly as in Git, IPFS, and Sigstore. What UOR contributes is the input: a structural canonical form rather than a byte serialization.
        </p>
      </section>

      <section>
        <h2>Architecture</h2>
        <p>
          One pipeline runs on both ends. The sender derives a fingerprint from the object; the receiver re-derives it from whatever bytes arrived and compares. No third party sits between them.
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
        <h2>The Rust pipeline</h2>
        <p>
          In the reference implementation, the pipeline is enforced as a typestate. <code>Grounded</code> and <code>Certified</code> are sealed types with <code>pub(crate)</code> constructors. Downstream code cannot fabricate them — they can only be produced by running the sanctioned pipeline. If an agent hands you a <code>Certified</code>, the Rust compiler has already checked that the object passed the canonical reduction.
        </p>
        <pre>{`use uor_foundation::prelude::*;

let cert = identify(&tool_call)?;          // sender
assert_eq!(cert.fingerprint(), expected);  // receiver`}</pre>
        <p>
          Verification at the receiver is five lines: run the same pipeline, compare fingerprints, check the certificate. No keys, no registry, no network, no PKI.
        </p>
      </section>

      <section>
        <h2>What the certificate carries</h2>
        <ul>
          <li><strong><code>ContentFingerprint</code></strong> — the 256-bit address.</li>
          <li><strong><code>witt_bits: u16</code></strong> — the structural depth the reduction reached.</li>
          <li><strong><code>UorTime</code></strong> — a content-deterministic two-clock value combining <code>rewrite_steps</code> and <code>landauer_nats</code> (mapped to <code>derivation:stepCount</code> and <code>observable:LandauerCost</code>).</li>
        </ul>
        <p>
          The Landauer component ties computational effort to the thermodynamic lower bound on irreversible computation, so the same reduction yields the same <code>UorTime</code> on any machine. Cost becomes a reproducibility invariant, not a performance metric.
        </p>
      </section>

      <section>
        <h2>Where it differs from prior art</h2>
        <p>
          Content-addressed identity is not new. Git did this in 2005, IPFS generalized it in 2015, and Sigstore, JSON-LD/URDNA2015, and Rekor refined the pattern. For their own domains those tools are correct and UOR would be overkill. UOR targets a specific gap they were not built for.
        </p>
        <ul>
          <li><strong>Git, IPFS/CIDs, Sigstore</strong> — hash specific byte encodings. Exactly right when the bytes <em>are</em> the object (source tree, immutable block, signed artifact). They do not survive the re-serialization cycle that is routine between agents.</li>
          <li><strong>JSON-LD with URDNA2015</strong> — achieves structure-level invariance, but is scoped to RDF graphs and still requires a PKI for signatures. UOR applies to the broader family of typed objects (plans, tool calls, memory records, checkpoints) and has no key-management layer.</li>
          <li><strong>JCS (RFC 8785)</strong> — canonicalizes JSON bytes, sufficient to sign at the moment of serialization. The guarantee ends at the first deserialize.</li>
          <li><strong>SEP-2395</strong> — proposed a signing layer for MCP; closed in March 2026, the discussion citing the operational cost of managing signatures across every hop. UOR addresses the same integrity problem with no signature layer, so a single agent pair can adopt it without coordinating anything.</li>
          <li><strong>W3C Subresource Integrity</strong> — the closest philosophical cousin: re-derive on arrival, refuse on mismatch. UOR is SRI's pattern applied to structured objects instead of byte streams.</li>
        </ul>
      </section>

      <section>
        <h2>Try it</h2>
        <ul>
          <li><strong>Playground:</strong> <Link to="/oracle">/oracle</Link> — the same pipeline running in your browser.</li>
          <li><strong>Install:</strong> <code>cargo add uor-foundation</code></li>
          <li><strong>Source:</strong> <a href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer">github.com/uor-foundation</a></li>
          <li><strong>Spec:</strong> <Link to="/framework">/framework</Link></li>
        </ul>
      </section>
    </ArticleLayout>
  );
};

export default BlogCanonicalRustCrate;
