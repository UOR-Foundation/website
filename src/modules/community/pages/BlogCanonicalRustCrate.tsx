import ArticleLayout from "@/modules/core/components/ArticleLayout";
import { Link } from "react-router-dom";
import { CRATE_URL, GITHUB_ORG_URL } from "@/data/external-links";
import { blogPosts } from "@/data/blog-posts";
import heroImage from "@/assets/blog-uor-framework-launch.png";

const SLUG = "/blog/canonical-rust-crate";

const BlogCanonicalRustCrate = () => {
  const related = blogPosts
    .filter((p) => p.href !== SLUG)
    .slice(0, 3)
    .map((p) => ({ title: p.title, href: p.href, meta: `${p.tag} · ${p.date}` }));

  return (
    <ArticleLayout
      kicker="Release"
      date="April 2, 2026"
      title="uor-foundation v0.1.5 — Canonical Rust Crate"
      deck="We gave every digital object its own permanent, content-addressed, self-verifying identity. The canonical Rust crate is now on crates.io."
      heroImage={heroImage}
      heroCaption="uor-foundation — the canonical Rust implementation of the UOR Framework"
      backHref="/research#blog"
      backLabel="Back to Research"
      sourceUrl={CRATE_URL}
      sourceLabel="crates.io/crates/uor-foundation"
      related={related}
    >
      <p>
        UOR is an open source standard that gives every structured object — a tool call, a config, a dataset row, a memory record, or any other piece of data moving between agents — its own permanent identity derived directly from its exact content.
      </p>

      <section>
        <h2>Imagine this</h2>
        <p>
          An agent sends a structured object to another agent. The object travels through different programming languages, JSON libraries, middleware that reorders keys, queues that re-encode numbers, and checkpoint files that round-trip through different serializers.
        </p>
        <p>
          Traditional byte-level methods break on the first normal transformation. The identity changes even though the meaning stays the same.
        </p>
        <p>With UOR the identity stays exactly the same:</p>
        <pre>{`tool_call.json
  sent                 >  identity stays identical
  after 3 round-trips  >  identity stays identical

  Verified locally in under 15 ms.`}</pre>
        <p>
          One consistent identity, no matter how many times the object is passed between systems. No trust required in the sender, the storage, the platform, or the network.
        </p>
        <blockquote>That single property is what UOR delivers.</blockquote>
      </section>

      <section>
        <h2>How UOR works</h2>
        <p>
          UOR creates a single, repeatable structural description of the object at the algebraic level. It then produces a compact certificate from that description. Anyone can verify the certificate on their own device by running the same simple process.
        </p>
        <p>
          Change even one meaningful part of the object and the identity changes completely. Keep the meaning the same — even after reordering keys, swapping number encodings, or multiple round-trips through different JSON libraries — and the identity remains identical.
        </p>
        <p>
          The entire process is designed so the receiver can prove they received exactly what the sender produced, even after the normal transformations that happen between agents.
        </p>
      </section>

      <section>
        <h2>How UOR is different</h2>
        <ul>
          <li><strong>Git, IPFS, SHA-256:</strong> work well for fixed files and immutable blocks but break when objects are re-serialized.</li>
          <li><strong>Filename tags and model cards:</strong> rely on external metadata that can drift.</li>
          <li><strong>Platform signatures and blockchain entries:</strong> depend on the platform staying online.</li>
          <li><strong>Separate provenance tools:</strong> add extra databases and complexity.</li>
        </ul>
        <p>
          UOR solves the problem at the object level itself. It needs no extra service, no keys, no registry, no PKI, and no coordination between parties.
        </p>
      </section>

      <section>
        <h2>What can UOR enable?</h2>
        <ul>
          <li><strong>AI pipelines and agents:</strong> Every config, dataset, tool call, or output carries its own verifiable identity so downstream systems can confirm it is unchanged.</li>
          <li><strong>Data sharing and supply chains:</strong> Share a file or contract and the recipient can confirm it is identical, years later, on any device.</li>
          <li><strong>Deepfake and authenticity problems:</strong> Content carries a permanent identity that survives every mirror or re-upload.</li>
          <li><strong>Data lakes and reproducibility:</strong> Deduplication and lineage appear naturally without extra tools.</li>
        </ul>
      </section>

      <section>
        <h2>Why does UOR matter?</h2>
        <p>
          MCP and A2A define how agents talk to each other. UOR gives them the missing piece: a way for the receiver to know the object is exactly what the sender produced, even after every normal transformation across languages and runtimes.
        </p>
        <p>Identity now belongs to the object itself, not to any platform. You can verify it on your own machine in seconds.</p>
        <p>This makes structured data between autonomous systems trustworthy at the object level.</p>
      </section>

      <section>
        <h2>Try it yourself in under 30 seconds</h2>
        <p>Live playground runs entirely in your browser. No account. No server. No data leaves your device.</p>
        <p>Drop in any file or paste text. Instantly see the identity. Change one character or round-trip the object and watch how the identity behaves exactly as expected.</p>
        <p><strong>For developers:</strong></p>
        <pre>{`cargo add uor-foundation
# then run the end-to-end example`}</pre>
        <blockquote>
          A digital object's identity should travel with the object, survive every migration, and be verifiable by anyone, forever.
        </blockquote>
      </section>

      <section>
        <h2>Learn more</h2>
        <ul>
          <li><strong>Live playground:</strong> <Link to="/oracle">uor.foundation/try</Link></li>
          <li><strong>Full developer guide:</strong> <Link to="/framework">uor.foundation</Link></li>
          <li><strong>Open repository:</strong> <a href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer">github.com/uor-foundation</a></li>
          <li><strong>Canonical Rust crate:</strong> <a href={CRATE_URL} target="_blank" rel="noopener noreferrer">crates.io/crates/uor-foundation</a></li>
        </ul>
      </section>
    </ArticleLayout>
  );
};

export default BlogCanonicalRustCrate;
