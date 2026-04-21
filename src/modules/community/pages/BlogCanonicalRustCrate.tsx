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
          <strong>UOR</strong> (Universal Object Reference) is an open-source standard, with a reference Rust implementation as <a href={CRATE_URL} target="_blank" rel="noopener noreferrer"><code>uor-foundation</code></a>, for giving typed structured objects a content-derived 256-bit address that survives the transformations those objects actually undergo between agents.
        </p>
        <p>
          It is designed to sit underneath MCP, A2A, and any other transport that carries structured data between autonomous systems.
        </p>
      </section>

      <section>
        <h2>Why it exists</h2>
        <p>
          MCP and A2A specify <em>how</em> agents talk. Neither lets the receiver prove the object it got is the one the sender produced.
        </p>
        <p>
          Existing fixes hash bytes. The instant a JSON library re-orders keys, normalizes a number, or re-encodes a string (routine across LangGraph, AutoGen, CrewAI), the hash changes and trust breaks. Signing the bytes (<a href="https://www.rfc-editor.org/rfc/rfc8785" target="_blank" rel="noopener noreferrer">JCS</a>, JWS) doesn't help: the guarantee dies at the first deserialize.
        </p>
        <p>
          The MCP community already tried the obvious fix and abandoned it. <a href="https://github.com/modelcontextprotocol/modelcontextprotocol/issues/2395" target="_blank" rel="noopener noreferrer">SEP-2395 (MCPS)</a> proposed canonical-JSON signing for MCP and was closed on <strong>March 15, 2026</strong>. The fatal finding: canonical JSON does not produce identical bytes across Node.js and Python, so the signing scheme falls apart at the language boundary. UOR addresses the same integrity problem one level up the stack, where re-serialization is no longer fatal.
        </p>
      </section>

      <section>
        <h2>How it works</h2>
        <p>
          Two steps: <strong>(1) normalize</strong> the object to a canonical form that ignores key order, encoding choice, and numeric representation; <strong>(2) SHA-256</strong> it. Same object → same fingerprint, on any runtime, in any language.
        </p>
        <p>
          The normalization step is formally verified in Lean 4, so determinism isn't a property we test for. It's a property we proved. Collision resistance is SHA-256, the same primitive Git and IPFS rely on.
        </p>
        <pre>{`object → normalize → SHA-256 → 256-bit fingerprint`}</pre>
      </section>

      <section>
        <h2>Architecture</h2>
        <p>
          One pipeline, two ends. Sender derives the fingerprint and ships it alongside the payload. Receiver re-derives it from whatever arrived and compares. Match → trust. Mismatch → refuse. No third party in the loop.
        </p>
        <figure className="not-prose my-8 rounded-xl border border-border bg-card p-6 md:p-8">
          <svg
            viewBox="0 0 820 420"
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
            <circle cx="120" cy="170" r="92" className="fill-background stroke-foreground" strokeWidth="2.25" />
            <text x="120" y="160" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 14, letterSpacing: "0.26em", textTransform: "uppercase", fontFamily: "ui-monospace, monospace" }}>Agent A</text>
            <text x="120" y="194" textAnchor="middle" className="fill-foreground" style={{ fontSize: 26, fontWeight: 700 }}>Sender</text>

            {/* ============ AGENT B ============ */}
            <circle cx="700" cy="170" r="92" className="fill-background stroke-foreground" strokeWidth="2.25" />
            <text x="700" y="160" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 14, letterSpacing: "0.26em", textTransform: "uppercase", fontFamily: "ui-monospace, monospace" }}>Agent B</text>
            <text x="700" y="194" textAnchor="middle" className="fill-foreground" style={{ fontSize: 26, fontWeight: 700 }}>Receiver</text>

            {/* ============ TRANSPORT RAIL (MCP · A2A) ============ */}
            <line x1="214" y1="170" x2="608" y2="170" stroke="currentColor" className="text-primary" strokeWidth="3" markerEnd="url(#arrPrimary)" />
            {/* MCP / A2A label sits on the rail, framed as "the wire" */}
            <rect x="346" y="78" width="130" height="30" rx="15" className="fill-background stroke-border" strokeWidth="1.25" />
            <text x="411" y="98" textAnchor="middle" className="fill-foreground" style={{ fontSize: 14, letterSpacing: "0.28em", textTransform: "uppercase", fontFamily: "ui-monospace, monospace", fontWeight: 600 }}>MCP · A2A</text>
            <text x="411" y="126" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 12, fontStyle: "italic" }}>the wire agents talk over</text>

            {/* ============ SEALED PAYLOAD (the essence) ============ */}
            <g transform="translate(411 170)">
              {/* Sealed envelope */}
              <rect x="-128" y="-54" width="256" height="108" rx="14" className="fill-card stroke-primary" strokeWidth="2.25" />
              {/* Payload row */}
              <text x="0" y="-26" textAnchor="middle" className="fill-foreground" style={{ fontSize: 17, fontWeight: 600 }}>
                payload · text · image · audio
              </text>
              {/* Divider */}
              <line x1="-104" y1="-12" x2="104" y2="-12" stroke="currentColor" className="text-border" strokeWidth="1" />
              {/* The seal */}
              <text x="0" y="14" textAnchor="middle" className="fill-primary" style={{ fontSize: 16, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>UOR seal</text>
              <text x="0" y="38" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 13, fontFamily: "ui-monospace, monospace" }}>sha256 · 256-bit · self-verifiable</text>
            </g>

            {/* ============ SENDER ACTION ============ */}
            <text x="120" y="294" textAnchor="middle" className="fill-foreground" style={{ fontSize: 17, fontWeight: 600 }}>1 · derive seal</text>
            <text x="120" y="316" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 13, fontFamily: "ui-monospace, monospace" }}>canonical form → hash</text>

            {/* ============ RECEIVER ACTION ============ */}
            <text x="700" y="294" textAnchor="middle" className="fill-foreground" style={{ fontSize: 17, fontWeight: 600 }}>2 · re-derive · compare</text>
            <text x="700" y="316" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 13, fontFamily: "ui-monospace, monospace" }}>match → trust locally</text>

            {/* ============ FOOTER ============ */}
            <text x="411" y="372" textAnchor="middle" className="fill-foreground" style={{ fontSize: 18, fontWeight: 700 }}>
              The address IS the content.
            </text>
            <text x="411" y="398" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 14, fontFamily: "ui-monospace, monospace" }}>
              no PKI · no registry · no third party
            </text>
          </svg>
          <figcaption className="mt-4 text-[13px] text-muted-foreground font-body text-center">
            UOR Identity rides inside every MCP / A2A message. Both agents derive the same seal from the same bytes. Trust is local, instant, and needs no authority.
          </figcaption>
        </figure>
      </section>

      <section>
        <h2>Where it differs from prior art</h2>
        <p>
          Content-addressed identity isn't new. Git did it in 2005, IPFS generalized it in 2015, Sigstore wrapped it in PKI. For their domains those tools are right. The gap UOR fills: <strong>identity that survives re-serialization</strong> (exactly what happens every time an agent parses, mutates, or forwards an object) <strong>without a signature layer to operate</strong>.
        </p>
        <figure className="not-prose my-6 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left">
                <th className="px-4 py-3 font-semibold">System</th>
                <th className="px-4 py-3 font-semibold">What it hashes</th>
                <th className="px-4 py-3 font-semibold">Survives re-serialization</th>
                <th className="px-4 py-3 font-semibold">Needs PKI / registry</th>
              </tr>
            </thead>
            <tbody className="[&>tr]:border-b [&>tr]:border-border [&>tr:last-child]:border-0">
              <tr>
                <td className="px-4 py-3 font-semibold">UOR</td>
                <td className="px-4 py-3">canonical structure of typed objects</td>
                <td className="px-4 py-3 text-foreground">yes</td>
                <td className="px-4 py-3 text-foreground">no</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><a href="https://git-scm.com/book/en/v2/Git-Internals-Git-Objects" target="_blank" rel="noopener noreferrer">Git</a> · <a href="https://docs.ipfs.tech/concepts/content-addressing/" target="_blank" rel="noopener noreferrer">IPFS / CIDs</a> · <a href="https://www.sigstore.dev/" target="_blank" rel="noopener noreferrer">Sigstore</a></td>
                <td className="px-4 py-3">specific byte encoding</td>
                <td className="px-4 py-3 text-muted-foreground">no, bytes change, hash changes</td>
                <td className="px-4 py-3 text-muted-foreground">Sigstore: yes</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><a href="https://www.w3.org/TR/rdf-canon/" target="_blank" rel="noopener noreferrer">JSON-LD + URDNA2015</a></td>
                <td className="px-4 py-3">canonical RDF graph</td>
                <td className="px-4 py-3 text-foreground">yes (RDF only)</td>
                <td className="px-4 py-3 text-muted-foreground">yes, for signatures</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><a href="https://www.rfc-editor.org/rfc/rfc8785" target="_blank" rel="noopener noreferrer">JCS (RFC 8785)</a></td>
                <td className="px-4 py-3">canonical JSON bytes</td>
                <td className="px-4 py-3 text-muted-foreground">guarantee ends at first deserialize</td>
                <td className="px-4 py-3 text-muted-foreground">yes, for signatures</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><a href="https://github.com/modelcontextprotocol/modelcontextprotocol/issues/2395" target="_blank" rel="noopener noreferrer">SEP-2395 (MCP signing)</a></td>
                <td className="px-4 py-3">message + signature</td>
                <td className="px-4 py-3 text-muted-foreground">closed Mar 2026, operational cost</td>
                <td className="px-4 py-3 text-muted-foreground">yes, across every hop</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><a href="https://www.w3.org/TR/SRI/" target="_blank" rel="noopener noreferrer">W3C SRI</a></td>
                <td className="px-4 py-3">byte stream of a resource</td>
                <td className="px-4 py-3 text-foreground">re-derive on arrival</td>
                <td className="px-4 py-3 text-foreground">no</td>
              </tr>
            </tbody>
          </table>
        </figure>
        <p>
          Closest cousin: <strong>W3C SRI</strong>. Re-derive on arrival, refuse on mismatch. UOR is the same pattern lifted from byte streams to structured objects. Two agents can adopt it without coordinating with anyone else.
        </p>
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
