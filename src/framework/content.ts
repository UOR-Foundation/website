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
    { t: "Canonicalize", plain: "Like tidying a sentence so the same meaning is always written the same way.", tech: "Data is reduced to one exact byte form, independent of formatting, key order or encoding." },
    { t: "Fingerprint", plain: "Like a fingerprint, not a name tag: it comes from what the thing is.", tech: "The canonical bytes are hashed with SHA 256 into a fixed, collision resistant identifier." },
    { t: "Address", plain: "Like a street address that never changes, because the house never moves.", tech: "The identifier becomes a routable address, so the same bytes resolve to the same address everywhere." },
  ],
  promise: "Same content, same address. On any machine, forever.",
  pillars: ["No registry.", "No middleman.", "No single point of failure."],
};

export const WHAT = {
  label: "What you get",
  title: "One call. Everything you need.",
  line: "One function turns any value into a verifiable identity. Anyone holding the bytes can recompute it and check it locally.",
  outputs: [
    { t: "Canonical bytes", b: "One exact form of your data, the same on every machine." },
    { t: "SHA 256 ID", b: "A permanent identifier derived from those bytes." },
    { t: "Routable address", b: "The same identity as IPv6, CID or human readable words." },
    { t: "Verifier", b: "A single check that proves bytes match an identity." },
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
