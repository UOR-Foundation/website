import ArticleLayout from "@/modules/core/components/ArticleLayout";
import { blogPosts } from "@/data/blog-posts";
import { getBlogCover } from "@/data/blog-covers";
import coverImage from "@/assets/blog-serialization-invariant.jpg";

const SLUG = "/blog/serialization-invariant-integrity";
const ARXIV_URL = "https://arxiv.org/abs/2610.24916";

const RESULTS = [
  {
    scenario: "Equivalent re-encoding (accept)",
    ordinary: "18.4%",
    checksum: "28.5%",
    proposed: "98.8%",
    gain: "+70.2 pp",
  },
  {
    scenario: "Altered content (reject)",
    ordinary: "65.9%",
    checksum: "93.8%",
    proposed: "97.4%",
    gain: "+3.5 pp",
  },
  {
    scenario: "Unavailable reference (abstain)",
    ordinary: "99.2%",
    checksum: "99.5%",
    proposed: "99.5%",
    gain: "0.0 pp",
  },
];

const BlogSerializationInvariant = () => {
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
      kicker="Open Research"
      date="October 21, 2026"
      title="Same Data, Different Bytes: Integrity Checks That Survive Re-Serialization"
      heroImage={coverImage}
      backHref="/news"
      backLabel="Back to News"
      sourceUrl={ARXIV_URL}
      sourceLabel="Jin Gao & Maura Clark · arXiv:2610.24916 · NANDA Workshop, IEEE TPS-ISA 2026"
      related={related}
    >
      <p>
        <strong>
          New joint research from{" "}
          <a href="https://www.projectnanda.org" target="_blank" rel="noopener noreferrer">
            MIT Project NANDA
          </a>{" "}
          and the UOR Foundation is now public.
        </strong>{" "}
        The paper, <em>Same Data, Different Bytes: Serialization-Invariant Integrity Checks for
        Agent-Published Datasets</em>, was accepted at the NANDA Workshop at IEEE TPS-ISA 2026 and is
        available on <a href={ARXIV_URL} target="_blank" rel="noopener noreferrer">arXiv</a>.
      </p>

      <section>
        <h2>Why checksums are not enough</h2>
        <p>
          In agent networks, a receiving agent must confirm that the data it got matches what the owner
          published. Mechanisms like{" "}
          <a href="https://arxiv.org/abs/2606.26211" target="_blank" rel="noopener noreferrer">
            DataFacts
          </a>{" "}
          handle discovery and access, and ship a checksum computed from a serialized JSON representation.
          The problem: a checksum mismatch is ambiguous. It can mean the content was altered, or it can
          mean the data was harmlessly re-serialized. Different whitespace, key order, numeric notation
          (<code>34</code> vs <code>34.0</code>), Unicode composition forms, or escape sequences all
          change the bytes without changing the data.
        </p>
        <p>
          An agent that cannot tell these two cases apart will either reject valid data or accept
          corrupted data. Both outcomes erode trust in the exchange.
        </p>
      </section>

      <section>
        <h2>How the method works</h2>
        <p>
          The paper introduces a serialization-invariant identifier: any two JSON representations that
          are equivalent under explicit, machine-checkable rules receive the same identifier. The
          pipeline is deterministic and runs identically on the owner's reference and the received copy:
        </p>
        <ol>
          <li>Parse the JSON with exact decimal number handling.</li>
          <li>Apply Unicode NFC normalization recursively to strings and keys.</li>
          <li>Check numbers for bounds and precision safety.</li>
          <li>
            Serialize deterministically with the JSON Canonicalization Scheme (
            <a href="https://www.rfc-editor.org/rfc/rfc8785" target="_blank" rel="noopener noreferrer">
              JCS, RFC 8785
            </a>
            ).
          </li>
          <li>Re-parse the canonical form and verify every number kept its exact decimal value.</li>
          <li>Hash the resulting bytes with SHA-256. That hash is the invariant identifier.</li>
        </ol>
        <p>
          Treated as identical: member order, whitespace, exact decimal representations of the same
          number, NFC-equivalent Unicode, literal versus escaped characters. Treated as different:
          changed values, types, array order or size, structure. Invalid inputs (non-UTF-8, duplicate
          keys after normalization, precision loss) are classified explicitly rather than reported as
          mismatches.
        </p>
        <p>
          Integration with DataFacts is additive: the invariant identifier is published alongside the
          existing checksum, with a processing-profile identifier. Discovery and access control are
          untouched. If the owner's reference is unavailable, the agent abstains instead of guessing.
        </p>
      </section>

      <section>
        <h2>What the evaluation shows</h2>
        <p>
          A controlled study ran 36 JSON materials across three scenarios (equivalent re-encodings,
          altered content, unavailable reference) with six models, three tiers each from two providers,
          in isolated Docker-based agent deployments. Expected-outcome rates:
        </p>
        <div className="not-prose mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-[0.95em]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 font-display font-semibold text-foreground">Scenario</th>
                <th className="px-4 py-3 font-display font-semibold text-foreground">Ordinary tools</th>
                <th className="px-4 py-3 font-display font-semibold text-foreground">Checksum</th>
                <th className="px-4 py-3 font-display font-semibold text-foreground">Proposed</th>
                <th className="px-4 py-3 font-display font-semibold text-foreground">Gain vs. checksum</th>
              </tr>
            </thead>
            <tbody>
              {RESULTS.map((r) => (
                <tr key={r.scenario} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground">{r.scenario}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.ordinary}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.checksum}</td>
                  <td className="px-4 py-3 font-semibold text-primary">{r.proposed}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.gain}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          The headline result: on equivalent re-encodings, agents using the invariant identifier reached
          the expected outcome 98.8% of the time, against 28.5% with the checksum baseline and 18.4%
          with ordinary tools. Rejection of genuinely altered content also improved, and agents correctly
          abstained when the reference was unavailable. Gains were consistent across all six models.
        </p>
      </section>

      <section>
        <h2>Why this matters for the Object Internet</h2>
        <p>
          This is the same principle the UOR Foundation builds on: identity derived from canonical
          structure, not from bytes. The paper gives that principle independent, peer-reviewed empirical
          backing in a realistic agent setting, and shows it composes with existing infrastructure
          instead of replacing it.
        </p>
        <ul>
          <li>
            <a href={ARXIV_URL} target="_blank" rel="noopener noreferrer">
              Read the paper on arXiv
            </a>
            : full method, equivalence rules, and evaluation.
          </li>
          <li>
            <a href="https://arxiv.org/html/2610.24916v1" target="_blank" rel="noopener noreferrer">
              HTML version
            </a>
            : for reading in the browser.
          </li>
          <li>
            <a href="https://www.projectnanda.org" target="_blank" rel="noopener noreferrer">
              MIT Project NANDA
            </a>
            : foundational infrastructure for the Open Agentic Web.
          </li>
          <li>
            <a href="https://crates.io/crates/uor-addr" target="_blank" rel="noopener noreferrer">
              uor-addr
            </a>
            : our open-source implementation of structural content addressing.
          </li>
          <li>
            <a href="/blog/object-internet-nanda">Our NANDA workshop field notes</a>: the broader Object
            Internet vision this research supports.
          </li>
        </ul>
      </section>
    </ArticleLayout>
  );
};

export default BlogSerializationInvariant;
