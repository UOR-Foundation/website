import { useState } from "react";
import { Check, Copy } from "lucide-react";
import ArticleLayout from "@/modules/core/components/ArticleLayout";
import { blogPosts } from "@/data/blog-posts";
import { getBlogCover } from "@/data/blog-covers";
import coverImage from "@/assets/blog-serialization-invariant.jpg";

const SLUG = "/blog/serialization-invariant-integrity";
const ARXIV_URL = "https://arxiv.org/abs/2610.24916";
const REPO_URL = "https://github.com/UOR-Foundation/uor-addr";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

const FIG1 = [
  { label: "Owner's reference", value: '{"age": 34}', checksum: "Reference", id: "Reference" },
  { label: "Copy A: re-encoded", value: '{"age": 34.0}', checksum: "Mismatch", id: "Match" },
  { label: "Copy B: altered", value: '{"age": 43}', checksum: "Mismatch", id: "Mismatch" },
];

const SAME = [
  ["Formatting", "Whitespace, key order"],
  ["Integers", "64 vs 64.0"],
  ["Trailing zeros", "21.5 vs 21.500"],
  ["Exponents", "0.0000001 vs 1e-7"],
  ["Unicode", "Composed vs decomposed é"],
  ["Escapes", '"a" vs "\\u0061"'],
];

const CHANGED = [
  ["Values", "0.1 vs 0.1001"],
  ["Types", '7 vs "7"'],
  ["Arrays", "Different order or length"],
  ["Structure", "Field moved elsewhere"],
];

const RESULTS = [
  { scenario: "Equivalent copy (should accept)", ordinary: "18.4%", checksum: "28.5%", proposed: "98.8%" },
  { scenario: "Altered copy (should reject)", ordinary: "65.9%", checksum: "93.8%", proposed: "97.4%" },
  { scenario: "No reference (should abstain)", ordinary: "99.2%", checksum: "99.5%", proposed: "99.5%" },
];

const USE_CASES = [
  {
    title: "Agent to agent handoff",
    body: "An agent forwards a dataset it reformatted. The receiver can still confirm it matches the owner's original.",
  },
  {
    title: "Data pipelines",
    body: "Tools that parse and re-save JSON no longer trigger false alarms. Only real changes do.",
  },
  {
    title: "Caches and mirrors",
    body: "A mirrored copy keeps the same identity as the source, so it can be checked without contacting the owner's server for the data itself.",
  },
  {
    title: "Audit and reproducibility",
    body: "Record the identifier of the exact inputs an AI used. Anyone can later prove the inputs were the same.",
  },
];

const INSTALL = [
  { lang: "Rust", cmd: "cargo add uor-addr" },
  { lang: "JavaScript / TypeScript", cmd: "npm install @uor-foundation/uor-addr" },
  { lang: "Python", cmd: "pip install uor-addr" },
];

const CopyLine = ({ cmd }: { cmd: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
      <code className="font-mono text-fluid-body text-foreground">{cmd}</code>
      <button
        type="button"
        aria-label={`Copy ${cmd}`}
        onClick={() => {
          navigator.clipboard.writeText(cmd);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
};

const th = "px-4 py-3 font-display font-semibold text-foreground";
const td = "px-4 py-3 text-muted-foreground";

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
          <a href="https://www.projectnanda.org" {...ext}>MIT Project NANDA</a> and the UOR Foundation.
        </strong>{" "}
        When AI agents pass data to each other, the receiver needs a simple answer: is this the data
        the owner published? The paper{" "}
        <a href={ARXIV_URL} {...ext}>
          <em>Same Data, Different Bytes</em>
        </a>{" "}
        by Jin Gao and Maura Clark, accepted at the NANDA Workshop at IEEE TPS-ISA 2026, shows how to
        answer it reliably, even after the data has been reformatted along the way.
      </p>

      <section>
        <h2>A mismatch tells you nothing</h2>
        <p>
          A checksum is a fingerprint of bytes, not of meaning. Write <code>34</code> as{" "}
          <code>34.0</code> and the checksum changes, exactly as if the value had become{" "}
          <code>43</code>. The receiving agent sees two identical alarms and cannot tell a harmless
          reformat from a real change. So it either rejects good data or learns to ignore warnings.
        </p>
        <p>
          This happens constantly in agent networks. Agents generate output, tools parse and re-save
          JSON, and every step can change how numbers and text are written without changing what they
          mean. Data catalogs such as <a href="https://arxiv.org/abs/2606.26211" {...ext}>DataFacts</a>{" "}
          already sort keys and strip whitespace before hashing, but different number formats and
          Unicode forms still break the match.
        </p>
        <div className="not-prose mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-fluid-body">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className={th}>Copy</th>
                <th className={th}>Data</th>
                <th className={th}>Checksum</th>
                <th className={th}>Invariant identifier</th>
              </tr>
            </thead>
            <tbody>
              {FIG1.map((r) => (
                <tr key={r.label} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground">{r.label}</td>
                  <td className={`${td} font-mono`}>{r.value}</td>
                  <td className={td}>{r.checksum}</td>
                  <td className={r.id === "Match" ? "px-4 py-3 font-semibold text-primary" : td}>{r.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>The method in four steps</h2>
        <p>
          The same steps run on the owner's data and on the received copy. If the two results match,
          the data is the same under clearly written rules.
        </p>
        <ol>
          <li>
            <strong>Read exactly.</strong> Parse the JSON and keep every number as its exact decimal
            value, so <code>0.1</code>, <code>0.10</code> and <code>1e-1</code> are the same number.
          </li>
          <li>
            <strong>Normalize text.</strong> Convert every string and key to{" "}
            <a href="https://unicode.org/reports/tr15/" {...ext}>Unicode NFC</a>, so visually
            identical characters are stored identically.
          </li>
          <li>
            <strong>Write one way.</strong> Serialize with the JSON Canonicalization Scheme (
            <a href="https://www.rfc-editor.org/rfc/rfc8785" {...ext}>RFC 8785</a>), then read it back
            and confirm no number lost precision.
          </li>
          <li>
            <strong>Hash.</strong> Take the SHA-256 of those bytes. That is the identifier.
          </li>
        </ol>
        <div className="not-prose mt-6 grid gap-4 md:grid-cols-2">
          {[
            { title: "Treated as the same", rows: SAME },
            { title: "Treated as a change", rows: CHANGED },
          ].map((g) => (
            <div key={g.title} className="rounded-xl border border-border p-5">
              <h3 className="mb-3 font-display text-fluid-body font-semibold text-foreground">{g.title}</h3>
              <ul className="space-y-2 text-fluid-body">
                {g.rows.map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-4">
                    <span className="text-foreground">{k}</span>
                    <span className="font-mono text-muted-foreground">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p>
          Input the rules cannot handle, such as invalid UTF-8, duplicate keys, or numbers too large to
          represent safely, is reported as unsupported or invalid. It is never reported as a mismatch,
          so an agent is not misled into thinking the data was tampered with.
        </p>
      </section>

      <section>
        <h2>Adding it to existing systems</h2>
        <p>
          Nothing is replaced. In the DataFacts case study, the owner's gateway publishes the new
          identifier next to the existing checksum, along with the name of the processing profile used.
          The receiving agent recomputes the identifier and compares it with the owner's record, not
          with whatever identifier travelled with the copy, since both could have been swapped. If the
          owner's record cannot be reached, the agent reports that the data cannot be verified instead
          of guessing.
        </p>
      </section>

      <section>
        <h2>What the study found</h2>
        <p>
          The authors tested 36 datasets in three situations, with six AI models (three sizes each from
          two providers), three runs per combination, in isolated agent deployments. Each agent had to
          accept, reject, or abstain, and back its decision with evidence.
        </p>
        <div className="not-prose mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-fluid-body">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className={th}>Situation</th>
                <th className={th}>Ordinary tools</th>
                <th className={th}>Checksum</th>
                <th className={th}>Invariant identifier</th>
              </tr>
            </thead>
            <tbody>
              {RESULTS.map((r) => (
                <tr key={r.scenario} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground">{r.scenario}</td>
                  <td className={td}>{r.ordinary}</td>
                  <td className={td}>{r.checksum}</td>
                  <td className="px-4 py-3 font-semibold text-primary">{r.proposed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          On reformatted but equivalent data, correct outcomes rose by 80.4 points over ordinary tools
          and 70.2 points over checksums. Evidence-backed rejection of altered data also improved by 3.5
          points over checksums. Agents stopped confusing format with content.
        </p>
      </section>

      <section>
        <h2>Where it helps</h2>
        <div className="not-prose mt-6 grid gap-4 sm:grid-cols-2">
          {USE_CASES.map((u) => (
            <div key={u.title} className="rounded-xl border border-border p-5">
              <h3 className="mb-2 font-display text-fluid-body font-semibold text-foreground">{u.title}</h3>
              <p className="text-fluid-body text-muted-foreground">{u.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Try it</h2>
        <p>
          The UOR Foundation's open-source{" "}
          <a href={REPO_URL} {...ext}>uor-addr</a> library implements this kind of structural content
          addressing for Rust, JavaScript and Python. Install it for your language:
        </p>
        <div className="not-prose mt-6 space-y-4">
          {INSTALL.map((i) => (
            <div key={i.lang}>
              <div className="mb-2 font-mono text-fluid-body text-muted-foreground">{i.lang}</div>
              <CopyLine cmd={i.cmd} />
            </div>
          ))}
        </div>
        <p>
          Then hash two versions of the same JSON, for example <code>{'{"age": 34}'}</code> and{" "}
          <code>{'{ "age": 34.0 }'}</code>. Both return the same <code>sha256:</code> address. Change
          the value to <code>43</code> and the address changes. The{" "}
          <a href={REPO_URL} {...ext}>repository README</a> has a quickstart and per-language examples.
        </p>
      </section>

      <section>
        <h2>Sources</h2>
        <ul>
          <li><a href={ARXIV_URL} {...ext}>Paper on arXiv</a> (abstract and PDF)</li>
          <li><a href="https://arxiv.org/html/2610.24916" {...ext}>HTML version</a> for reading in the browser</li>
          <li><a href="https://arxiv.org/abs/2606.26211" {...ext}>DataFacts</a>, the data layer used as the case study</li>
          <li><a href="https://www.rfc-editor.org/rfc/rfc8785" {...ext}>RFC 8785</a>, JSON Canonicalization Scheme</li>
          <li><a href="https://unicode.org/reports/tr15/" {...ext}>Unicode UAX #15</a>, normalization forms</li>
          <li><a href="https://www.projectnanda.org" {...ext}>MIT Project NANDA</a></li>
          <li><a href={REPO_URL} {...ext}>uor-addr on GitHub</a></li>
          <li><a href="/blog/object-internet-nanda">Our NANDA workshop field notes</a></li>
        </ul>
      </section>
    </ArticleLayout>
  );
};

export default BlogSerializationInvariant;
