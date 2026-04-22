import ArticleLayout from "@/modules/core/components/ArticleLayout";
import { Link } from "react-router-dom";
import { CRATE_URL } from "@/data/external-links";
import { blogPosts } from "@/data/blog-posts";
import McpInstallTabs from "../components/McpInstallTabs";
import FourHashesProof from "../components/FourHashesProof";
import heroImage from "@/assets/project-uor-identity.jpg";
import blogKnowledgeGraph from "@/assets/blog-knowledge-graph.png";
import blogGoldenSeed from "@/assets/blog-golden-seed-vector.png";
import blogFrameworkLaunch from "@/assets/blog-uor-framework-launch.png";

const coverMap: Record<string, string> = {
  knowledgeGraph: blogKnowledgeGraph,
  goldenSeed: blogGoldenSeed,
  frameworkLaunch: blogFrameworkLaunch,
};

const SLUG = "/blog/universal-data-fingerprint";

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
      title="A universal data fingerprint for your AI agent"
      heroImage={heroImage}
      backHref="/research#blog"
      backLabel="Back to Research"
      sourceUrl={CRATE_URL}
      sourceLabel="crates.io/crates/uor-foundation"
      related={related}
    >
      <aside
        aria-label="TL;DR"
        className="not-prose mb-12 md:mb-14 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm px-6 md:px-8 py-6 md:py-7"
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[11px] uppercase tracking-[0.24em] font-semibold text-primary/80 font-mono">
            TL;DR
          </span>
          <span className="h-px flex-1 bg-border/60" />
        </div>
        <p className="font-body text-[15px] md:text-[16px] leading-[1.75] text-foreground/85 m-0">
          When two agents exchange data, the receiver can&rsquo;t prove what arrived is what was sent — re-serialization breaks every signature. UOR derives a 256-bit fingerprint from the object&rsquo;s <em>canonical structure</em>, not its bytes, so the same object hashes to the same identifier in any language or runtime. The result: agents verify each other directly, with no PKI, no registry, no middleman for verification — a decentralized, universal, self-verifying identifier for any structured object.
        </p>
        <pre className="not-prose mt-5 mb-2 p-4 rounded-lg bg-muted/60 border border-border text-[13.5px] font-mono text-foreground leading-relaxed overflow-x-auto">
{`{"a": 1, "b": 2}     → 43258cff783fe7036d8a…
{"b": 2, "a": 1}     → 43258cff783fe7036d8a…   (same object, different JSON, same identifier)`}
        </pre>
        <p className="font-body text-[13.5px] text-muted-foreground m-0 mt-2">
          Same object, same fingerprint, in any language or runtime.
        </p>
        <p className="font-body text-[15px] md:text-[16px] text-muted-foreground m-0 mt-4 leading-[1.7]">
          UOR provides content consistency, not channel security. A man-in-the-middle who replaces payload and fingerprint together is invisible to UOR alone — pair it with TLS / mTLS for channel integrity and with a key-binding layer (Sigstore, JWS+X.509, DIDs, OIDC) if you need to prove who produced the object.
        </p>
      </aside>

      <section>
        <h2>What it is</h2>
        <p>
          Two AI agents exchange a tool call. Today, neither one can prove the object that arrived is the object that was sent. Re-serialize the JSON, the hash changes. Sign the bytes, the signature breaks at the first parse. Add a PKI, now you operate a PKI.
        </p>
        <p>
          <strong>UOR</strong> (Universal Object Reference) gives every structured object a permanent, decentralized, content-derived, self-verifying 256-bit identifier — a universal data fingerprint that travels with the object across languages, runtimes, and re-serializations. It is an open standard with a reference Rust implementation, <a href={CRATE_URL} target="_blank" rel="noopener noreferrer"><code>uor-foundation</code></a>, designed to sit underneath MCP today — and under any structured-data transport that carries JSON, including A2A.
        </p>
        <p>
          UOR is a content-addressing scheme for digital objects — not an identity system for people. It answers <em>"what is this?"</em> with a 256-bit identifier, not <em>"who made this?"</em> The two questions compose: keep your existing identity layer (OAuth, mTLS, Sigstore, DIDs) for the second; UOR handles the first, everywhere, with no infrastructure.
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
          The obvious fix has already been tried. <a href="https://github.com/modelcontextprotocol/modelcontextprotocol/issues/2395" target="_blank" rel="noopener noreferrer">SEP-2395 (MCPS)</a>, which proposed canonical-JSON signing for MCP, was closed on <strong>March 15, 2026</strong> after canonical JSON was shown to produce different bytes in Node.js and Python.
        </p>
        <p>
          <strong>Where UOR sits relative to prior art.</strong> The pattern — canonicalize structure, hash canonical bytes, re-derive on receipt — is not new. IPFS CIDs do this over canonical CBOR / DAG-JSON. JSON-LD URDNA2015 does this over RDF graphs. Git does it over tree objects. UOR&rsquo;s contribution is not a new cryptographic primitive; it is the packaging:
        </p>
        <ul>
          <li>IPFS CIDs require transcoding plain JSON into DAG-JSON or CBOR first. MCP and A2A speak plain JSON on the wire; asking every agent framework to adopt DAG-JSON is a larger ask than adopting a fingerprint field in <code>_meta</code>.</li>
          <li>JSON-LD URDNA2015 requires the payload to be modeled as RDF. Most agent JSON isn&rsquo;t and won&rsquo;t be.</li>
          <li>JCS + SHA-256 is what everyone converged on after SEP-2395. UOR&rsquo;s only addition on top of JCS is NFC normalization of strings — load-bearing for the cross-runtime claim, but small.</li>
        </ul>
        <p>
          UOR is to MCP / A2A what CIDs are to content-addressable storage: the same pattern, applied in the ecosystem that needs it. The novelty is <em>where</em> it plugs in (a <code>_meta</code> field any MCP server can emit, any MCP client can verify, no protocol change) and the NFC extension that makes the universality claim actually hold on realistic string data. Not a new primitive.
        </p>
      </section>

      <section>
        <h2>How it works</h2>
        <p>
          The scheme is <strong><code>uor-sha256-v1</code></strong> — NFC Unicode normalization, then RFC 8785 JCS canonicalization, then SHA-256. It factors out key order, Unicode normalization form, integer width (<code>1</code> vs <code>1.0</code>), float representation including <code>-0</code>, and whitespace. Same object, same fingerprint, on any runtime, in any language.
        </p>
        <p>
          NFC normalization is a documented UOR extension on top of RFC 8785. RFC 8785 JCS itself does not mandate NFC on input strings; UOR adds it so that <code>"café"</code> (NFC, U+00E9) and <code>"café"</code> (NFD, e + U+0301) produce the same fingerprint. The normalization is a pure function of the object's typed structure — deterministic by construction. Collision resistance is SHA-256, the same primitive Git and IPFS rely on.
        </p>
        <pre>{`object → normalize → SHA-256 → 256-bit fingerprint`}</pre>
      </section>

      <section>
        <h2>What UOR does not do</h2>
        <p>
          UOR Passport provides content integrity — proof that the bytes you hold are bit-for-bit the canonical form the content producer produced. It does not provide:
        </p>
        <ul>
          <li><strong>Identity binding.</strong> The public key embedded in an MCPS receipt proves a keypair was used to sign the fingerprint; it does not prove whose keypair. Anyone can generate an Ed25519 keypair, sign a receipt, and embed their own public key. If you need "this came from Alice, not Bob," layer Sigstore, JWS + X.509, OIDC, or a DID method on top.</li>
          <li><strong>Replay protection.</strong> Receipts are stateless; the same receipt verifies forever. If your protocol cares about freshness, track nonces or timestamps at the application layer.</li>
          <li><strong>Channel security.</strong> A MITM who replaces payload + fingerprint atomically is invisible to UOR alone. Use TLS / mTLS for the wire.</li>
          <li><strong>Content-addressable storage.</strong> UOR makes a CAS possible and interoperable across runtimes; it does not ship one. Deduplication and provenance are capabilities you build on top of the fingerprint.</li>
        </ul>
      </section>

      <section>
        <h2>Limits today</h2>
        <p>
          The canonical form of a single fingerprinted object is capped at 64&nbsp;KB to bound worst-case canonicalization cost and prevent DoS against the server. Realistic MCP tool responses that carry long code snippets, multi-page search results, or dense structured data can exceed this.
        </p>
        <p><strong>Workarounds available now:</strong></p>
        <ul>
          <li>Chunk large payloads and fingerprint each chunk, storing chunk identifiers in a manifest object you fingerprint separately.</li>
          <li>Fingerprint the manifest, not the raw payload — the manifest is small and the chunk identifiers carry the integrity guarantee transitively.</li>
        </ul>
        <p>
          On the roadmap: <code>uor-sha256-v2</code> will use a Merkle tree over canonical chunks to lift the cap while preserving the single-identifier property. Versioning is explicit (<code>algorithm: &quot;uor-sha256-v1&quot;</code> today, <code>&quot;uor-sha256-v2&quot;</code> when shipped); <code>verify_passport</code> rejects unsupported versions, so migration is safe.
        </p>
      </section>

      <section>
        <h2>Why not just mTLS?</h2>
        <p>
          A reasonable question: if you already run mTLS between agents, don&rsquo;t you already have integrity and identity? For a single, direct two-agent call, largely yes — and UOR adds little. UOR earns its keep in the case mTLS does not cover: <strong>multi-hop agent pipelines.</strong>
        </p>
        <p>
          In a LangGraph, CrewAI, AutoGen, or A2A pipeline, an object typically traverses several agents before it reaches the verifier. Every hop terminates TLS, parses the JSON, acts on it, re-serializes it, re-encrypts it, and forwards it. The wire-level integrity guarantee mTLS provided dies at hop 1. Only the object&rsquo;s structural content continues to the next hop — and, without UOR, there is no way for a downstream agent to prove the object it now holds is bit-for-bit what the originator emitted.
        </p>
        <p>
          UOR&rsquo;s fingerprint rides with the object, through every hop, in <code>_meta.uor.passport</code>. Any downstream verifier re-derives it from the object alone and compares. <strong>mTLS secures the wire; UOR secures the payload across wires.</strong> Use both. They compose.
        </p>
      </section>

      <section>
        <h2>Architecture</h2>
        <p>
          One pipeline, two ends. Sender derives the fingerprint and ships it alongside the payload. Receiver re-derives it from whatever arrived and compares. Match → trust. Mismatch → refuse. No third party in the loop for verification.
        </p>
        <figure className="not-prose my-8 rounded-xl border border-border bg-card p-6 md:p-8">
          <svg
            viewBox="0 0 820 420"
            role="img"
            aria-label="Agent A sends a payload sealed with a UOR fingerprint to Agent B over MCP or A2A. Agent B re-derives the fingerprint locally and compares. The identifier is derived from the content. No third-party authority is involved."
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
            <text x="411" y="372" textAnchor="middle" className="fill-foreground" style={{ fontSize: 16, fontWeight: 700 }}>
              The identifier is derived from the content — same object, same identifier.
            </text>
            <text x="411" y="398" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 14, fontFamily: "ui-monospace, monospace" }}>
              no PKI · no registry · no third party for verification
            </text>
          </svg>
          <figcaption className="mt-4 text-muted-foreground font-body text-center">
            UOR Identity rides inside every MCP / A2A message. Both agents derive the same seal from the same bytes. Trust is local, instant, and needs no authority.
          </figcaption>
        </figure>
      </section>

      <section>
        <h2>How it compares</h2>
        <p>
          Content addressing is well-trodden ground. Git shipped it in 2005, IPFS generalized it in 2015, Sigstore bolted PKI around it. Each is the right tool inside its lane. The unsolved part — and what UOR targets — is <strong>an identifier that holds through re-serialization</strong> (which happens on every parse, mutation, and hop between agents) <strong>without standing up a signing stack to keep it alive</strong>.
        </p>
        <figure className="not-prose my-8 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-[15px] md:text-base leading-relaxed">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">System</th>
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">What it hashes</th>
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Survives re-serialization</th>
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Needs PKI / registry</th>
              </tr>
            </thead>
            <tbody className="[&>tr]:border-b [&>tr]:border-border [&>tr:last-child]:border-0">
              <tr>
                <td className="px-5 py-5 align-top font-semibold text-foreground">UOR</td>
                <td className="px-5 py-5 align-top text-foreground">canonical structure of typed objects</td>
                <td className="px-5 py-5 align-top text-foreground">yes</td>
                <td className="px-5 py-5 align-top text-foreground">no</td>
              </tr>
              <tr>
                <td className="px-5 py-5 align-top text-foreground"><a href="https://git-scm.com/book/en/v2/Git-Internals-Git-Objects" target="_blank" rel="noopener noreferrer">Git</a> · <a href="https://docs.ipfs.tech/concepts/content-addressing/" target="_blank" rel="noopener noreferrer">IPFS / CIDs</a> · <a href="https://www.sigstore.dev/" target="_blank" rel="noopener noreferrer">Sigstore</a></td>
                <td className="px-5 py-5 align-top text-foreground">specific byte encoding</td>
                <td className="px-5 py-5 align-top text-muted-foreground">no, bytes change, hash changes</td>
                <td className="px-5 py-5 align-top text-muted-foreground">Sigstore: yes</td>
              </tr>
              <tr>
                <td className="px-5 py-5 align-top text-foreground"><a href="https://www.w3.org/TR/rdf-canon/" target="_blank" rel="noopener noreferrer">JSON-LD + URDNA2015</a></td>
                <td className="px-5 py-5 align-top text-foreground">canonical RDF graph</td>
                <td className="px-5 py-5 align-top text-foreground">yes (RDF only)</td>
                <td className="px-5 py-5 align-top text-muted-foreground">yes, for signatures</td>
              </tr>
              <tr>
                <td className="px-5 py-5 align-top text-foreground"><a href="https://www.rfc-editor.org/rfc/rfc8785" target="_blank" rel="noopener noreferrer">JCS (RFC 8785)</a></td>
                <td className="px-5 py-5 align-top text-foreground">canonical JSON bytes</td>
                <td className="px-5 py-5 align-top text-muted-foreground">guarantee ends at first deserialize</td>
                <td className="px-5 py-5 align-top text-muted-foreground">yes, for signatures</td>
              </tr>
              <tr>
                <td className="px-5 py-5 align-top text-foreground"><a href="https://github.com/modelcontextprotocol/modelcontextprotocol/issues/2395" target="_blank" rel="noopener noreferrer">SEP-2395 (MCP signing)</a></td>
                <td className="px-5 py-5 align-top text-foreground">message + signature</td>
                <td className="px-5 py-5 align-top text-muted-foreground">closed Mar 2026, operational cost</td>
                <td className="px-5 py-5 align-top text-muted-foreground">yes, across every hop</td>
              </tr>
              <tr>
                <td className="px-5 py-5 align-top text-foreground"><a href="https://www.w3.org/TR/SRI/" target="_blank" rel="noopener noreferrer">W3C SRI</a></td>
                <td className="px-5 py-5 align-top text-foreground">byte stream of a resource</td>
                <td className="px-5 py-5 align-top text-foreground">re-derive on arrival</td>
                <td className="px-5 py-5 align-top text-foreground">no</td>
              </tr>
            </tbody>
          </table>
        </figure>
        <p>
          Closest cousin: <strong>W3C SRI</strong>. Re-derive on arrival, refuse on mismatch. UOR is the same pattern lifted from byte streams to structured objects. Two agents can adopt it without coordinating with anyone else.
        </p>
      </section>

      <section>
        <h2>How UOR resolves the SEP-2395 failure modes</h2>
        <p>
          <a href="https://github.com/modelcontextprotocol/modelcontextprotocol/issues/2395" target="_blank" rel="noopener noreferrer">SEP-2395</a> hashed the <em>bytes</em> and layered trust on top. UOR hashes the <em>structure</em> and has no trust layer. The five failures collapse:
        </p>
        <figure className="not-prose my-8 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-[15px] md:text-base leading-relaxed">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground w-[42%]">SEP-2395 failure</th>
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">How UOR resolves it</th>
              </tr>
            </thead>
            <tbody className="[&>tr]:border-b [&>tr]:border-border [&>tr:last-child]:border-0">
              <tr>
                <td className="px-5 py-5 align-top text-foreground"><strong className="font-semibold text-foreground">Canonical JSON differs across languages.</strong> <span className="text-muted-foreground">Node and Python produce different bytes for the same JSON.</span></td>
                <td className="px-5 py-5 align-top text-foreground">Normalize structure, not bytes. Same object, same fingerprint, any runtime. Deterministic by construction.</td>
              </tr>
              <tr>
                <td className="px-5 py-5 align-top text-foreground"><strong className="font-semibold text-foreground">Downgrade attack.</strong> <span className="text-muted-foreground">Drop a key, server falls back to unsigned.</span></td>
                <td className="px-5 py-5 align-top text-foreground">No signed mode to fall back from. The fingerprint <em>is</em> the identifier.</td>
              </tr>
              <tr>
                <td className="px-5 py-5 align-top text-foreground"><strong className="font-semibold text-foreground">Self-signed trust anchors.</strong> <span className="text-muted-foreground">An anchor could stamp itself L4.</span></td>
                <td className="px-5 py-5 align-top text-foreground">No PKI, no levels, no issuers. Trust is a local hash comparison.</td>
              </tr>
              <tr>
                <td className="px-5 py-5 align-top text-foreground"><strong className="font-semibold text-foreground">Fail-open revocation.</strong> <span className="text-muted-foreground">Unauthenticated revocation lists failed open.</span></td>
                <td className="px-5 py-5 align-top text-foreground">Nothing to revoke. No keys, no lists. Change the object, change the identifier.</td>
              </tr>
              <tr>
                <td className="px-5 py-5 align-top text-foreground"><strong className="font-semibold text-foreground">CVE attributions and endorsement claims contested during review.</strong> <span className="text-muted-foreground">Several supporting claims did not hold up under procedural review; see the SEP-2395 closure for details.</span></td>
                <td className="px-5 py-5 align-top text-foreground">No social trust surface. Around 1000 lines of Rust — small enough that a full read takes an afternoon, and we'd welcome one. "Small" does not mean "audited"; if your use case is security-sensitive, read the code or fund a review.</td>
              </tr>
            </tbody>
          </table>
        </figure>
        <p>
          SEP-2395 layered integrity <em>on top of</em> MCP. UOR pushes it <em>into the object</em>, so MCP and A2A carry it unchanged.
        </p>
      </section>

      <section>
        <h2>What this unlocks</h2>
        <ul>
          <li><strong>Provable agent-to-agent calls.</strong> The receiver knows the tool call, memory, or result it ran is bit-for-bit the one the sender produced, across any language or transport.</li>
          <li><strong>Free deduplication and caching.</strong> Identical objects collapse to one identifier. Caches, audit logs, and replay systems stop storing the same payload twice.</li>
          <li><strong>Portable provenance.</strong> Fork an object, move it between MCP servers, hand it to a different agent, the identifier still resolves to the same content.</li>
          <li><strong>No trust infrastructure to operate.</strong> No certificates to issue, rotate, or revoke. Verification is a local hash, not a network call.</li>
        </ul>
      </section>

      <section>
        <h2>Try it</h2>
        <p>
          Connect any MCP-compatible agent to UOR's hosted server in under a minute. <strong>No install, no signup, no config.</strong> Pick your client below — the same canonical endpoint works everywhere:{" "}
          <code>https://mcp.uor.foundation/mcp</code> <span className="not-prose inline-flex items-center gap-1.5 align-middle ml-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono uppercase tracking-[0.14em]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />live</span>.
        </p>
        <McpInstallTabs />
        <h3>The surface</h3>
        <p>Three tools. That's the whole API.</p>
        <figure className="not-prose my-8 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-[15px] md:text-base leading-relaxed">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground w-[28%]">Tool</th>
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground w-[26%]">Returns</th>
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">What it does</th>
              </tr>
            </thead>
            <tbody className="[&>tr]:border-b [&>tr]:border-border [&>tr:last-child]:border-0">
              <tr>
                <td className="px-5 py-5 align-top text-foreground"><code>uor.encode_address</code></td>
                <td className="px-5 py-5 align-top text-foreground"><code>sha256:&lt;64-hex&gt;</code></td>
                <td className="px-5 py-5 align-top text-muted-foreground">256-bit content address of any JSON value — string, number, bool, array, or object. Computed via the <code>uor-sha256-v1</code> scheme (NFC + RFC 8785 JCS + SHA-256). Canonical form up to 64&nbsp;KB.</td>
              </tr>
              <tr>
                <td className="px-5 py-5 align-top text-foreground"><code>uor.verify_passport</code></td>
                <td className="px-5 py-5 align-top text-foreground"><code>{`{ valid, reason? }`}</code></td>
                <td className="px-5 py-5 align-top text-muted-foreground">Re-derive a payload's fingerprint and compare to a claimed passport. Stateless.</td>
              </tr>
              <tr>
                <td className="px-5 py-5 align-top text-foreground"><code>uor.verify_receipt</code></td>
                <td className="px-5 py-5 align-top text-foreground"><code>{`{ valid, reason? }`}</code></td>
                <td className="px-5 py-5 align-top text-muted-foreground">Verify an Ed25519-signed MCPS receipt using only the key embedded in it. No network, no PKI.</td>
              </tr>
            </tbody>
          </table>
        </figure>
        <p>
          Every response carries a <code>uor.passport</code> envelope in <code>_meta</code> — and a <code>uor.mcps.receipt</code> when MCPS is enabled. Reference Rust implementation at{" "}
          <a href="https://github.com/humuhumu33/uor-passport" target="_blank" rel="noopener noreferrer">
            github.com/humuhumu33/uor-passport
          </a>
          .
        </p>
        <FourHashesProof />
      </section>
    </ArticleLayout>
  );
};

export default BlogCanonicalRustCrate;
