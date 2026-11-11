// Single source for every docs page, the llms.txt index and the per page Markdown files.
// Page text comes from src/docs/prism.generated.ts, pulled from the PrismPM docs-site branch
// by scripts/sync-prism-docs.mjs. Navigation order follows the upstream llms.txt.
import { PRISM_CODE } from "./npm.generated";
import { PRISM_CHANGELOG, PRISM_LLMS, PRISM_LLMS_FULL, PRISM_PAGES, PRISM_SOURCE, PRISM_VOCABULARY } from "./prism.generated";
import { findMilestone, HINT_TERMS, dockerGloss, dockerMarkdown, implicitTerms, siteTerms, verbMilestone, type Milestone } from "./vocabulary";

export type DocPage = { slug: string; title: string; summary: string; updated: string; body: string; availableIn?: string };
export type DocGroup = { label: string; pages: DocPage[]; planned?: { label: string; milestone: Milestone | null }[] };
export type DocTab = { id: "get-started" | "guides" | "reference"; label: string; groups: DocGroup[] };

export const SOURCE = PRISM_SOURCE;
export const UPSTREAM_LLMS = PRISM_LLMS;
export const UPSTREAM_LLMS_FULL = PRISM_LLMS_FULL;

/** "MIT OR Apache-2.0" as words: "MIT or Apache 2.0". */
export const spdxWords = (id: string) => id.replace(/ OR /g, " or ").replace(/ AND /g, " and ").replace(/-(\d)/g, " $1");

/** Shown on every docs page: the docs describe the v1.0 API, npm ships an earlier release. */
export const DOCUMENTED_API = "v1.0";
export const RELEASE_STATUS = [
  { item: "Documented API", status: DOCUMENTED_API, note: "What these pages describe" },
  { item: "prism-code on npm", status: PRISM_SOURCE.npm, note: "The runtime npx prism-code@latest setup adds today" },
  { item: "prism CLI", status: "Not shipped", note: "Usage shown for reference" },
  { item: "Prism Rust crate", status: "Not published", note: "The UOR Framework crates uor-foundation and uor-addr are on crates.io; they are not the Prism SDK" },
  { item: "Licence", status: spdxWords(PRISM_CODE.license) || "See package", note: `prism-code on npm${PRISM_SOURCE.license ? `. The PrismPM source repository: ${spdxWords(PRISM_SOURCE.license)}` : ""}` },
];

const updated = new Date(PRISM_SOURCE.committedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const slugOf = (file: string) => file.replace(/\.md$/, "").replace(/\/index$/, "");
/** The npm release the upstream release-status page was last written for, read from its distribution table. */
export const upstreamNpm = (body: string) => body.match(/^\|\s*`prism-code` on npm\s*\|\s*([^|\s]+)\s*\|/m)?.[1] ?? null;
/**
 * The upstream release-status page states the npm release by hand and can lag npm `latest`.
 * When it does, the npm row and sentence take the synced npm version and a note says the tables lag,
 * so the page can never name an older release as the one on npm today.
 */
export function withNpmRelease(body: string, npm: string = PRISM_SOURCE.npm) {
  const stated = upstreamNpm(body);
  if (!stated || stated === npm) return body;
  const published = npm === PRISM_CODE.version && PRISM_CODE.published ? `, published ${PRISM_CODE.published.slice(0, 10)},` : "";
  const note = `> prism-code ${npm}${published} is the npm \`latest\` release. The tables below were last updated for ${stated}, so ${npm} already ships features they list under later releases. \`npx prism-code@${npm} --help\` lists its commands, and the [prism skill](/.well-known/agent-skills/prism/SKILL.md), copied from that release, says what each one does.`;
  return body
    .replace(/^(\|\s*`prism-code` on npm\s*\|\s*)[^|\s]+(\s*\|)/m, `$1${npm}$2`)
    .replace(new RegExp(`Today \`prism-code\` ${stated.replace(/\./g, "\\.")} is on npm\\.`), `Today \`prism-code\` ${npm} is on npm.`)
    .replace(/\n## What is published\n/, `\n${note}\n\n## What is published\n`);
}
const bySlug = new Map(PRISM_PAGES.map((p) => {
  const body = slugOf(p.file) === "reference/release-status" ? withNpmRelease(p.body) : p.body;
  return [slugOf(p.file), { slug: slugOf(p.file), title: implicitTerms(p.title), summary: implicitTerms(p.description), updated, body: implicitTerms(body), availableIn: p.availableIn }];
}));

// Upstream llms.txt order: "## Section" headings with "- [Title](.../docs/<slug>)" links.
function upstreamOrder() {
  const out: { section: string; slugs: string[] }[] = [];
  for (const line of PRISM_LLMS.split("\n")) {
    if (line.startsWith("## ")) out.push({ section: line.slice(3).trim(), slugs: [] });
    const m = line.match(/\]\([^)]*\/docs\/([^)#]+?)(?:\.md)?\/?\)/);
    if (m && out.length && bySlug.has(m[1])) out[out.length - 1].slugs.push(m[1]);
  }
  return out;
}

// Three sections. Upstream folders map onto them; a section shows once it has pages.
const FOLDER_TAB: Record<string, DocTab["id"]> = { "get-started": "get-started", guides: "guides", examples: "guides", migration: "guides", concepts: "guides", api: "reference", reference: "reference", sdks: "reference" };
const TAB_DEFS: { id: DocTab["id"]; label: string }[] = [
  { id: "get-started", label: "Get started" },
  { id: "guides", label: "Guides" },
  { id: "reference", label: "Reference" },
];
// Reference is a plain lookup: grouped by kind (API, CLI, Formats, Errors), never by task, because Get started already teaches the path.
const FEATURE: Record<string, [group: string, label: string]> = {
  api: ["API", "Overview"],
  "api/load": ["API", "load"],
  "api/instantiate": ["API", "instantiate"],
  "api/dispatch": ["API", "dispatch"],
  "api/verify": ["API", "verify"],
  "api/inspect": ["API", "inspect"],
  "api/history-and-replay": ["API", "history and replay"],
  "api/as-tool": ["API", "asTool"],
  "api/verify-package": ["Packages", "Verify"],
  "api/spec-package": ["Packages", "Spec"],
  "api/testing-package": ["Packages", "Testing"],
  "reference/cli": ["CLI", "Commands"],
  "reference/holo-format": ["Formats", "App"],
  "reference/attestations": ["Formats", "Attestations"],
  "reference/manifest": ["Formats", "Manifest"],
  "reference/lockfile": ["Formats", "Lockfile"],
  "api/errors": ["Errors", "API"],
  "reference/errors": ["Errors", "CLI"],
  "reference/vocabulary": ["Glossary", "Terms"],
  "reference/policy": ["Formats", "Policy"],
  "reference/release-status": ["Status", "Release status"],
};
const REF_GROUP = (slug: string) => FEATURE[slug]?.[0] ?? (slug.startsWith("sdks/") ? "SDKs" : "Formats");
export const navLabel = (p: DocPage) => FEATURE[p.slug]?.[1] ?? p.title;
/** Prism SDK v1.0 scope (milestones M2 to M6 on the public roadmap) with no Reference page yet, listed dimmed under its kind with its milestone. Each code is resolved against the synced milestones, so a closed or missing milestone drops the entry. v1.1 work (M7) is never listed. */
export const REF_PLANNED = ([
  ["API", "Streaming dispatch", "M4"], ["API", "Middleware on dispatch", "M4"], ["API", "Conformance package", "M3"],
  ["CLI", "prism init", "M3"], ["CLI", "prism build", "M6"], ["CLI", "prism run", "M3"], ["CLI", "prism check", "M2"],
  ["CLI", "prism attest / verify", "M2"], ["CLI", "prism inspect", "M2"], ["CLI", "prism replay", "M3"], ["CLI", "prism dev", "M3"],
  ["CLI", "prism generate", "M3"], ["CLI", "prism export", "M3"], ["CLI", "prism images / tag / rmi", "M4"],
  ["CLI", "prism push / pull", "M4"], ["CLI", "prism deploy", "M4"], ["CLI", "CLI plugins", "M4"],
  ["Formats", "prism.toml manifest", "M3"], ["Formats", "Policy file", "M3"], ["Formats", "World contract (WIT)", "M3"], ["Formats", "Attestation bundle", "M2"],
  ["SDKs", "Rust runtime", "M4"],
] as [string, string, string][]).map(([group, label, code]) => ({ group, label, verb: "", milestone: findMilestone(code) }))
  .filter((f) => f.milestone && f.milestone.state !== "closed");
const REF_ORDER = ["API", "Packages", "CLI", "Formats", "Errors", "Glossary", "SDKs", "Status"];
/** Within Guides, upstream folders become named groups so examples, migration notes and concepts stay findable. */
const FOLDER_GROUP: Record<string, string> = { guides: "Guides", examples: "Examples", migration: "Migration", concepts: "Concepts" };
const TAB_FOLDERS: Partial<Record<DocTab["id"], string[]>> = { guides: ["guides", "examples", "migration", "concepts"] };

/** Docker features on the roadmap with no page yet: shown dimmed with their milestone. Features off the roadmap are never listed. */
export const PLANNED: { group: string; label: string; verb: string; milestone: Milestone | null }[] = ([
  { group: "Build", label: "Build an app (prism build)", verb: "build" },
  { group: "Share", label: "Push to a registry (prism push)", verb: "push" },
  { group: "Share", label: "Pull from a registry (prism pull)", verb: "pull" },
] as { group: string; label: string; verb: string }[]).map((f) => ({ ...f, milestone: verbMilestone(f.verb) })).filter((f) => f.milestone);

/** The five step path from install to share, in Docker's get started order. */
export const GOLDEN_PATH: { step: string; text: string; cmd: string; slug?: string; verb?: string }[] = [
  { step: "Set up", text: "Set up Prism and its agent skill in any project with one command.", cmd: "npx prism-code@latest setup", slug: "api" },
  { step: "Build", text: "Turn your app into one portable package, ready to run anywhere.", cmd: "prism build", verb: "build" },
  { step: "Run", text: "Load an app, start it and send it a request, the same way everywhere.", cmd: "load + instantiate + dispatch", slug: "api/load" },
  { step: "Verify", text: "Confirm every result is exactly what the code produced, with proof anyone can check.", cmd: "verify", slug: "api/verify" },
  { step: "Share", text: "Push it to a registry so others can pull, run and verify it.", cmd: "prism push / pull", verb: "push" },
];

/** Get started step pages, one per golden path card. Each reads why, then how, then what, without labels. Code and output are copied from the synced upstream API examples. */
export type Step = { slug: string; title: string; summary: string; opening: string; task?: string; taskLine?: string; code?: string; output?: string; handoff: string; verb?: string; ref: string };
const CALC = "import { load } from 'prism-code';\n\nconst app = await load('./Calculator.holo');";
export const STEPS: Step[] = [
  { slug: "get-started/install", title: "Set up", summary: "Set up Prism and its agent skill in any project with one command.",
    opening: "Prism runs apps: small, sealed packages of code that give the same answer on a laptop, a server or in a browser. One command sets up the runtime that loads and runs them, and teaches your coding agent the Prism SDK.",
    task: "Set up Prism", taskLine: "Run this in your project folder.", code: "```bash\nnpx prism-code@latest setup\n```",
    handoff: "Prism is set up. Next, see how an app gets made.", ref: "api" },
  { slug: "get-started/build", title: "Build", summary: "Turn your code into one portable app, ready to run anywhere.", verb: "build",
    opening: "Building packages your code, its settings and its examples into one app file with a fixed fingerprint. It is the step you know as building an image: write it once, then run it anywhere.",
    handoff: "Until building ships, every other step works with a ready made app. Next, run one.", ref: "reference/holo-format" },
  { slug: "get-started/run", title: "Run", summary: "Load an app, send it a request and read the reply, the same way everywhere.",
    opening: "Running an app means loading the file and sending it a request. The reply depends only on the app and the request, never on the machine, so moving between laptop, server and cloud changes nothing.",
    task: "Send an app a request", taskLine: "Load the Calculator example and ask it to add 20 and 22.",
    code: "```js\n" + CALC + "\n\nconst request = new TextEncoder().encode('1\\tadd\\t20\\t22');\nconst response = await app.dispatch(request);\n\nconsole.log(JSON.stringify(new TextDecoder().decode(response)));\n```",
    output: "```text\n\"1\\tok\\t42\"\n```",
    handoff: "Every app carries its own proof. Next, check it.", ref: "api/dispatch" },
  { slug: "get-started/verify", title: "Verify", summary: "Confirm every result is exactly what the code produced, with proof anyone can check.",
    opening: "An app carries a fingerprint of its contents and the examples it promises to pass. Verifying checks both, so you, a colleague or an agent can trust a result without trusting whoever sent it. This step is new: container tools have nothing like it.",
    task: "Check an app", taskLine: "Confirm the fingerprint matched on load, then replay every example the app ships with.",
    code: "```js\n" + CALC + "\n\nconsole.log(app.identities.verified);\n\nconst result = await app.acceptance();\nconsole.log(result.passed, 'of', result.total, 'examples replayed');\n```",
    output: "```text\ntrue\n22 of 22 examples replayed\n```",
    handoff: "You have run an app and proved its results. Next, share it.", ref: "api/verify" },
  { slug: "get-started/share", title: "Share", summary: "Push your app to a registry so others can pull, run and verify it.", verb: "push",
    opening: "Sharing publishes an app to a registry, so anyone can pull the exact same file by its fingerprint. Because every app verifies itself, whoever pulls it can check it before running it.",
    handoff: "That completes the path. For every detail, browse the Reference.", ref: "reference/cli" },
];
const stepBody = (s: Step, i: number) => {
  const m = s.verb ? verbMilestone(s.verb) : null;
  const next = STEPS[i + 1];
  return [
    `Step ${i + 1} of ${STEPS.length}${m ? `. Coming in ${m.code} ${m.version}.` : ""}`, "", s.opening, "",
    ...(s.code ? [`## ${s.task}`, "", s.taskLine!, "", s.code, ""] : ["## Until then", "", "Progress is on the [public roadmap](https://github.com/orgs/UOR-Foundation/projects/12).", ""]),
    ...(s.output ? ["## You should see", "", s.output, ""] : []),
    next ? `${s.handoff} [${next.title}](/docs/${next.slug})` : s.handoff, "",
    `Full detail: [Reference](/docs/${s.ref})`,
  ].join("\n");
};
STEPS.forEach((s, i) => bySlug.set(s.slug, { slug: s.slug, title: s.title, summary: s.summary, updated, body: stepBody(s, i), availableIn: "" }));
GOLDEN_PATH.forEach((g, i) => { g.slug = STEPS[i].slug; });

// Site made pages, generated from upstream vocabulary.md so they are never retyped. implicitTerms keeps the container equivalence implicit on every page.
const GH = "https://github.com/UOR-Foundation/PrismPM/blob/main";
const fixLinks = (md: string) => md.replace(/\]\((\.\.\/)?([A-Za-z][^)#:]*\.md)(#[^)]*)?\)/g, (_m, up, f, h = "") => `](${GH}/${up ? "" : "docs/"}${f}${h})`).replace(/\]\(\.\.\/([^)]+)\)/g, `](${GH}/$1)`);
bySlug.set("get-started/coming-from-containers", { slug: "get-started/coming-from-containers", title: "Coming from containers", summary: "The container words you know, and their Prism equivalents.", updated, body: siteTerms(dockerMarkdown()).replace(/^# .*\n+> .*\n+/, ""), availableIn: "" });
if (PRISM_VOCABULARY) bySlug.set("reference/vocabulary", { slug: "reference/vocabulary", title: "Vocabulary", summary: "Prism nouns and verbs, in words you already know.", updated, body: fixLinks(implicitTerms(PRISM_VOCABULARY.replace(/^# .*\n+/, ""))), availableIn: "" });

/** Overview pages above the steps: why Prism exists, how the UOR framework makes it work, what you can build. Written for readers new to UOR and Prism. */
export const OVERVIEW = [
  { slug: "get-started/why-prism", title: "Why Prism", summary: "AI software gives answers nobody can check. Prism makes every result provable.",
    body: ["AI agents and applications now write code, call tools and make decisions. When one hands you a result, you usually cannot tell what code produced it, whether that code changed, or whether you would get the same answer twice. You are asked to trust the sender.", "",
      "## The gap", "", "Containers solved one half of this: they make software portable, so it runs the same on any machine. They do not prove what ran. Logs and signatures say who sent something, not whether the result is correct.", "",
      "## What Prism adds", "", "Prism packages software into an app that carries its own proof. Anyone who receives a result, a person, a server or another agent, can check it independently, in seconds, without trusting whoever sent it.", "",
      "Next, see [how it works](/docs/get-started/how-it-works)."].join("\n") },
  { slug: "get-started/how-it-works", title: "How it works", summary: "The UOR framework gives every piece of data one exact address. Prism builds on it.",
    body: ["Prism is built on the UOR framework, an open standard for naming data by what it contains rather than where it is stored.", "",
      "## One address per thing", "", "A library catalogues a book by its exact text, not by the shelf it sits on. UOR does the same for data: the address is a fingerprint computed from the bytes, so the same content always has the same address, and any change gives a new one.", "",
      "## An app is a sealed package", "", "Prism uses those fingerprints to seal your code, its settings and the examples it promises to pass into one app file. Loading the app recomputes the fingerprint; if a single byte differs, it does not match.", "",
      "## Every result comes with a receipt", "", "Because the app is fixed and its behaviour depends only on the request, anyone can replay a request and get the same bytes back. That replay is the receipt: proof the result came from this exact app.", "",
      "Read the full [UOR framework](/framework/) explainer, or see [what you can build](/docs/get-started/what-you-can-build)."].join("\n") },
  { slug: "get-started/what-you-can-build", title: "What you can build", summary: "Agent tools, services and apps whose every result can be checked.",
    body: ["Anything that takes a request and returns an answer can become a Prism app. A few starting points:", "",
      "## Tools for AI agents", "", "Give an agent a tool it can call and verify, so its decisions rest on results it can prove rather than trust.", "",
      "## Services that run anywhere", "", "Ship one app file that behaves identically on a laptop, a server, at the edge or in a browser.", "",
      "## Results others can audit", "", "Calculations, data transforms and checks where a colleague, customer or regulator needs to confirm the answer themselves.", "",
      "Ready? Start with [Install](/docs/get-started/install)."].join("\n") },
];
OVERVIEW.forEach((o) => bySlug.set(o.slug, { ...o, updated, availableIn: "" }));
const firstRank = (s: string) => { const o = OVERVIEW.findIndex((x) => x.slug === s); if (o >= 0) return o - 10; const i = STEPS.findIndex((x) => x.slug === s); return i >= 0 ? i : s === "get-started/coming-from-containers" ? STEPS.length : 99; };
const GS_GROUP = (s: string) => OVERVIEW.some((o) => o.slug === s) ? "Overview" : STEPS.some((x) => x.slug === s) ? "Your first app" : "Orientation";
export const TABS: DocTab[] = TAB_DEFS.map((t) => {
  const order = upstreamOrder().flatMap((s) => s.slugs);
  const slugs = [...bySlug.keys()].filter((s) => FOLDER_TAB[s.split("/")[0]] === t.id)
    .sort((a, b) => (firstRank(a) - firstRank(b)) || ((order.indexOf(a) + 1 || 999) - (order.indexOf(b) + 1 || 999)) || a.localeCompare(b));
  const fk = Object.keys(FEATURE);
  const rank = (s: string) => (fk.indexOf(s) + 1 || 999);
  const groups: DocGroup[] = t.id === "reference"
    ? REF_ORDER.map((g) => ({ label: g, pages: slugs.filter((s) => REF_GROUP(s) === g).sort((a, b) => rank(a) - rank(b)).map((s) => bySlug.get(s)!) }))
    : t.id === "get-started"
    ? ["Overview", "Your first app", "Orientation"].map((g) => ({ label: g, pages: slugs.filter((s) => GS_GROUP(s) === g).map((s) => bySlug.get(s)!) }))
    : (TAB_FOLDERS[t.id] ?? []).map((f) => ({ label: FOLDER_GROUP[f], pages: slugs.filter((s) => s.split("/")[0] === f).map((s) => bySlug.get(s)!) }));
  return { id: t.id, label: t.label, groups: groups.filter((g) => g.pages.length || g.planned?.length) };
}).filter((t) => t.groups.length > 0);

/** Upstream changelog.md from the docs-site branch; null until it exists. */
export const UPSTREAM_CHANGELOG: DocPage | null = PRISM_CHANGELOG
  ? { slug: "changelog", title: PRISM_CHANGELOG.title, summary: PRISM_CHANGELOG.description, updated, body: PRISM_CHANGELOG.body, availableIn: PRISM_CHANGELOG.availableIn }
  : null;

export const CHANGELOG = [
  { date: "October 22, 2026", version: "v1.0.0", tag: "Feature", title: "Prism SDK v1.0", note: "Placeholder. Describe the release here." },
  { date: "September 30, 2026", version: "v0.9.2", tag: "Fix", title: "Placeholder fix", note: "Placeholder. Describe the fix here." },
  { date: "September 12, 2026", version: "v0.9.0", tag: "Feature", title: "Placeholder feature", note: "Placeholder. Describe the feature here." },
];

export const DOCS_ASK = {
  title: "How can we help?",
  placeholder: "Ask anything about Prism",
  questions: [
    "How do I get started with Prism?",
    "What is an app, compared with an image?",
    "How do I run an app?",
    "Can my AI agent call an app as a tool?",
    "What ships in v1.0?",
  ],
};

export const DOCS_HOME = {
  eyebrow: "Overview",
  title: "Prism documentation",
  intro: "Everything you need to build, ship and run self-verifying AI applications with Prism.",
  cards: [
    { title: "Get started", text: "New to Prism? Five steps, start here.", slug: "get-started/why-prism", pattern: "dots" },
    { title: "Guides", text: "Build, check and share an app.", slug: "guides", pattern: "grid" },
    { title: "Reference", text: "CLI, API, formats and errors.", slug: "reference/cli", pattern: "grid" },
  ],
};

export const ALL_PAGES = TABS.flatMap((t) => t.groups.flatMap((g) => g.pages.map((p) => ({ ...p, tab: t.id, group: g.label }))));

export const releaseStatusMarkdown = () => [
  "## Release status", "",
  "| Item | Status | Note |", "| --- | --- | --- |",
  ...RELEASE_STATUS.map((r) => `| ${r.item} | ${r.status} | ${r.note} |`), "",
].join("\n");

export const pageMarkdown = (p: DocPage) => `# ${p.title}\n\n> ${p.summary}\n\n${p.availableIn ? `Available in: ${p.availableIn}\n\n` : ""}${releaseStatusMarkdown()}\n${p.body}`;

export function llmsTxt(origin = "") {
  const lines = ["# Prism documentation", "", `> Prism builds your application into one content addressed package that carries its own proof. These pages document the ${DOCUMENTED_API} API; prism-code on npm is ${PRISM_SOURCE.npm}.`, "", "Know container tooling? Read [Coming from containers](" + origin + "/docs/get-started/coming-from-containers.md) first, and check [/docs/roadmap.json](" + origin + "/docs/roadmap.json) before suggesting a command.", ""];
  for (const t of TABS) {
    lines.push(`## ${t.label}`, "");
    for (const p of t.groups.flatMap((g) => g.pages)) {
      const term = HINT_TERMS.find((x) => new RegExp(`\\b${x.prism}\\b`, "i").test(`${p.title} ${p.summary}`));
      const extra = [term && `Also known as: ${dockerGloss(term)}`, p.availableIn && `Available in: ${p.availableIn}`].filter(Boolean).join("; ");
      lines.push(`- [${p.title}](${origin}/docs/${p.slug}.md): ${p.summary}${extra ? ` (${extra})` : ""}`);
    }
    lines.push("");
  }
  if (UPSTREAM_CHANGELOG) lines.push("## What's new", "", `- [${UPSTREAM_CHANGELOG.title}](${origin}/docs/changelog.md): ${UPSTREAM_CHANGELOG.summary}`, "");
  lines.push("## Optional", "", `- [Full documentation](${origin}/llms-full.txt): Every page in one file.`, "");
  return lines.join("\n");
}

export const llmsFullTxt = () => [...ALL_PAGES, ...(UPSTREAM_CHANGELOG ? [UPSTREAM_CHANGELOG] : [])].map(pageMarkdown).join("\n\n---\n\n");
