// Single source for the UOR Framework page and its agent readable markdown.
export const HERO = {
  label: "UOR Framework",
  title: "Data that proves what it is.",
  line: "UOR gives every piece of content a permanent address made from the content itself. Anyone can verify it, anywhere, without asking permission.",
};

export const TOC = [
  { id: "problem", t: "The problem" },
  { id: "how", t: "How it works" },
  { id: "what", t: "What you get" },
  { id: "who", t: "Who it is for" },
  { id: "glossary", t: "Glossary" },
];

export const PROBLEM = {
  label: "The problem",
  title: "Same data, many labels.",
  body: [
    "Every system invents its own labels for data: web links, file paths, database keys, model IDs.",
    "Move the data, rename a folder or change a single byte, and those labels break or quietly point at something else.",
    "Today, identity belongs to whoever hosts the data. Not to the data itself.",
  ],
  labels: ["URL", "Path", "DB key", "Model ID", "CID", "Hash"],
  outcomes: ["v1 · ok", "v2 · changed", "404 · moved"],
  systems: ["APIs", "Databases", "Files", "AI Models", "Graphs", "Streams", "Ledgers", "Devices", "Protocols"],
};

export const HOW = {
  label: "How it works",
  title: "Addresses derived from content.",
  pipeline: ["data", "canonical form", "SHA 256", "address"],
  steps: [
    { t: "Canonicalize", plain: "Like tidying a sentence so the same meaning is always written the same way.", tech: "Data is reduced to one exact byte form. For JSON, the uor-addr library sorts keys (RFC 8785), writes each number one way and normalizes text to Unicode NFC. For text, codeHash in prism-code normalizes only line endings, a leading BOM and trailing whitespace." },
    { t: "Fingerprint", plain: "Like a fingerprint, not a name tag: it comes from what the thing is.", tech: "The canonical bytes are hashed with SHA 256 into a fixed, collision resistant identifier." },
    { t: "Address", plain: "Like a street address that never changes, because the house never moves.", tech: "The identifier is the address, so the same bytes give the same address everywhere. Routable forms (IPv6, CID, words) are planned; no published package produces them yet." },
  ],
  promise: "Same content, same address. On any machine, forever.",
  pillars: ["No registry.", "No middleman.", "No single point of failure."],
};

export const WHAT = {
  label: "What you get",
  title: "What ships today.",
  line: "Each format has one canonical form and one hash. Anyone holding the bytes can recompute the identity and check it locally.",
  outputs: [
    { t: "Canonical bytes", b: "JSON: uor-addr for Rust, JavaScript and Python. Text: codeHash in prism-code, which takes text, not any value." },
    { t: "SHA 256 ID", b: "A permanent identifier derived from those bytes, written sha256: plus hex. A Prism app also carries BLAKE3 identities." },
    { t: "Routable address", b: "Planned: the same identity as IPv6, CID or human readable words. Not in any published package yet." },
    { t: "Verifier", b: "Recompute the identity from the bytes and compare. Loading a Prism app recomputes its digests and reports whether they match." },
  ],
};

export const WHO = {
  label: "Who it is for",
  title: "Built for everyone who relies on data.",
  items: [
    { t: "AI agents and ML", b: "Every output, model and dataset carries proof of exactly what it is." },
    { t: "Developers", b: "Stable references that survive moves, renames and system boundaries." },
    { t: "Everyone else", b: "Simple certainty that information has not been changed along the way." },
  ],
};

export const GLOSSARY = {
  label: "Glossary",
  title: "Plain words.",
  items: [
    { t: "Canonical form", b: "The one agreed way to write a piece of data, byte for byte." },
    { t: "Hash", b: "A short fingerprint computed from data. Change one byte and it changes completely." },
    { t: "Content address", b: "An address made from what the data is, rather than where it is stored." },
    { t: "Verification", b: "Recomputing the fingerprint yourself to confirm the data is genuine." },
  ],
};

export const CLOSE = { title: "Start building.", docs: "Read the docs", play: "Try playground", discord: "Join Discord" };

export function frameworkMarkdown(): string {
  const l: string[] = [`# ${HERO.title}`, "", `> ${HERO.line}`, ""];
  l.push(`## ${PROBLEM.title}`, "", ...PROBLEM.body.flatMap((p) => [p, ""]));
  l.push(`## ${HOW.title}`, "", `Pipeline: ${HOW.pipeline.join(" → ")}`, "");
  HOW.steps.forEach((s, i) => l.push(`${i + 1}. **${s.t}**: ${s.tech} ${s.plain}`));
  l.push("", HOW.promise, HOW.pillars.join(" "), "");
  l.push(`## ${WHAT.title}`, "", WHAT.line, "", ...WHAT.outputs.map((o) => `- **${o.t}**: ${o.b}`), "");
  l.push(`## ${WHO.title}`, "", ...WHO.items.map((o) => `- **${o.t}**: ${o.b}`), "");
  l.push(`## Glossary`, "", ...GLOSSARY.items.map((o) => `- **${o.t}**: ${o.b}`), "");
  l.push("## Next", "", "- [Docs](/docs/)", "- [Playground](/playground/)", "");
  return l.join("\n");
}
