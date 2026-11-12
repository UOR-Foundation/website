// One source for every site wide agent file: llms.txt front door, agents.md manual,
// page twins, sitemap and .well-known pointers. Rendered by the Vite agentDocs plugin.
import { ABOUT, FRAMEWORK, HERO, START } from "../site/copy";
import { DISCORD_URL } from "../site/links";
import { INTRO, FOCUS, BOARD, DOCS as GOV } from "../about/content";
import { PRISM_REQUESTS } from "../docs/requests.generated";
import { PRISM_CODE } from "../docs/npm.generated";

export const ORIGIN = "https://uor.foundation";
export const FEEDBACK_REPO = "UOR-Foundation/website";
export const ISSUES = `https://github.com/${FEEDBACK_REPO}/issues`;
export const SDK_REPO = "UOR-Foundation/PrismPM";
export const SDK_FEATURES = `https://github.com/${SDK_REPO}/issues/new?template=feature_request.yml`;
/** Agent skill discovery index, built by src/agent/skill.ts. */
export const SKILL_INDEX = "/.well-known/agent-skills/index.json";

export const FEEDBACK_KINDS = [
  { id: "agent-feedback", label: "Agent feedback", title: "[agent] ", use: "Anything about using this site or Prism as an agent" },
  { id: "bug", label: "Bug", title: "[bug] ", use: "Something does not work as documented" },
  { id: "feature", label: "Feature request", title: "[feature] ", use: "A capability you need" },
  { id: "docs", label: "Docs fix", title: "[docs] ", use: "Missing, unclear or wrong documentation" },
] as const;

export const feedbackUrl = (kind: (typeof FEEDBACK_KINDS)[number]["id"], title = "", body = "") => {
  const k = FEEDBACK_KINDS.find((x) => x.id === kind);
  if (!k) throw new Error(`Unknown feedback kind: ${kind}`);
  const q = new URLSearchParams({ template: `${k.id}.yml`, title: k.title + title, labels: `${k.id},agent-submitted` });
  if (body) q.set("body", body);
  return `${ISSUES}/new?${q.toString()}`;
};

export const FIRST_EXAMPLE = `import { codeHash } from "prism-code/canonical";

// codeHash is SHA-256 of the text after line endings, BOM and trailing whitespace are normalized.
const a = codeHash("export const x = 1;\\n");
const b = codeHash("export const x = 1;   \\r\\n"); // same text, different formatting
const c = codeHash("export const x = 2;\\n");       // different text
console.log(a === b, a === c); // true false`;

/** Pages humans visit and their plain text twins. */
export const PAGES = [
  { path: "/", md: "/index.md", title: "Home", summary: "What UOR and Prism are, in one screen." },
  { path: "/framework/", md: "/framework.md", title: "UOR Framework", summary: "Why UOR exists, how it works and what you get." },
  { path: "/docs/", md: "/docs.md", title: "Prism docs", summary: "Guides, API reference and SDKs." },
  { path: "/blog/", md: "/blog.md", title: "Blog", summary: "Research, releases and community posts." },
  { path: "/agents/", md: "/agents/index.md", title: "For agents", summary: "Share findings, join swarms, get credited." },
  { path: "/agents/discord", md: "/agents/discord.md", title: "Post to Discord", summary: "How an agent posts findings to the UOR Discord." },
  { path: "/about/", md: "/about.md", title: "About", summary: "The nonprofit foundation, board and governance." },
];

/** What leaves the machine. Stated in llms.txt, agents.md and agents.json, so an agent can decide before it sends a user's source anywhere. */
export const HOSTED = {
  url: "https://mcp.uor.foundation/",
  registered_by: "npx prism-code@latest setup, which adds it as the MCP server lexlean to every agent it finds (setup --dry-run prints every change first)",
  uploads: "The files under src/ (prism/src/ in the guided build) whenever a check or proof runs without the SDK image on this machine: prism_prove and prism_build from the prism MCP server, prism-code build --check and prism-code verify --lean. Agents calling the lexlean tools directly send the drafts they write.",
  readable_by: "Anyone with the draft ID. Drafts are stored unlisted: not searchable, but not private. Put no secrets in source sent there.",
  stay_local: "--local runs checks and proofs in the SDK image on this machine instead (Docker, about 5.5 GB).",
  github: "Builds can also run on the user's own GitHub Actions with their GitHub sign in; a new app's public repository is created only after the user approves its name.",
};
const hostedSection = () => [
  "## Hosted verifier", "",
  `Setup registers a hosted verifier run by the UOR Foundation. Registered by: ${HOSTED.registered_by}.`, "",
  `- URL: ${HOSTED.url}`,
  `- What is uploaded: ${HOSTED.uploads}`,
  `- Who can read it: ${HOSTED.readable_by}`,
  `- To keep source on this machine: ${HOSTED.stay_local}`,
  `- GitHub: ${HOSTED.github}`, "",
].join("\n");

/** Opening lines every agent file shares: the one command, then where the manual lives. */
export const startBanner = () => [`> Start: \`${START.command}\`. Agent manual: [/agents.md](/agents.md).`, ""].join("\n");
const startSection = () => [
  "## Start", "", START.line, "", "```sh", START.command, "```", "",
  "Requires Node 22 or later. No account is needed. Setup also registers the hosted verifier described under Hosted verifier, which receives source when it checks or proves.", "",
  hostedSection(),
].join("\n");
const capabilitiesSection = () => [
  "## What you get", "", ...START.capabilities.map((c) => `- ${c}.`), "",
  "## Tools", "", ...START.tools.map((t) => `- **${t.name}**: ${t.what}`), "",
].join("\n");

const feedbackSection = () => [
  "## Give feedback",
  "",
  `Open a GitHub issue in ${FEEDBACK_REPO}. Every agent submission is labelled \`agent-submitted\` and triaged by maintainers.`,
  "",
  ...FEEDBACK_KINDS.map((k) => `- [${k.label}](${feedbackUrl(k.id)}): ${k.use}.`),
  "",
  `Capability requests for the Prism SDK itself go to ${SDK_REPO}: ${SDK_FEATURES}`,
  "",
  "### Improvement loop for SDK requests",
  "",
  "1. Read [/docs/requests.md](/docs/requests.md) (or `/docs/requests.json`): open requests ranked by votes, plus recently shipped ones. Refreshed every 6 hours.",
  "2. Already requested? Add a 👍 reaction and a comment with your use case instead of filing a duplicate.",
  `3. New? Open ${SDK_FEATURES} and fill every field: component, problem, current workaround and an acceptance test (code that should pass once it ships). Add the \`agent-submitted\` label when you can.`,
  "4. Check back: when your issue appears under Shipped, update your notes and the pages you rely on.",
  "",
  "With GitHub access, one command:",
  "",
  "```sh",
  `gh issue create --repo ${FEEDBACK_REPO} --label agent-submitted,agent-feedback --title "[agent] <summary>" --body "<what you tried, what happened, what you expected>"`,
  "```",
  "",
  "Without it, open a prefilled link above; add `&title=` and `&body=` (URL encoded) to fill it in.",
  "",
].join("\n");

const shareSection = () => [
  "## Share what you learn", "",
  "Found something about UOR or Prism? Hash it, post it, get credited.", "",
  "- [/share.md](/share.md): skill file. What to share, where (Moltbook, GitHub, Discord), how to prove it.",
  "- [/swarm.md](/swarm.md): protocol for multi agent swarms.",
  "- [/agents/](/agents/): the wall of credited findings.", "",
].join("\n");

export function homeMarkdown() {
  return [
    `# UOR Foundation: ${HERO.lead} ${HERO.rest}`,
    "",
    `> ${HERO.sub}`,
    "",
    startBanner(),
    "## Why",
    "",
    ABOUT.body,
    "",
    ...ABOUT.points.flatMap((p) => [`### ${p.t}`, "", ...p.b.map((b) => `- ${b}`), ""]),
    "## How",
    "",
    `${FRAMEWORK.title.replace(/\n/g, " ")} ${FRAMEWORK.line}`,
    "",
    "## What",
    "",
    `- Start: \`${START.command}\``,
    ...PAGES.slice(1).map((p) => `- [${p.title}](${p.md}): ${p.summary}`),
    "",
    "Agent manual: [/agents.md](/agents.md)",
    "",
  ].join("\n");
}

export function aboutMarkdown() {
  return [
    `# ${INTRO.title}`, "", `> ${INTRO.line}`, "", startBanner(), `Governance: ${INTRO.cta.href}`, "",
    `## ${FOCUS.title}`, "", ...FOCUS.items.map((i) => `- **${i.t}**: ${i.b}`), "",
    `## ${BOARD.title}`, "", BOARD.line, "", ...BOARD.members.map((m) => `- **${m.name}**, ${m.role}. ${m.bio}`), "",
    `## ${GOV.title}`, "", ...GOV.items.map((d) => `- [${d.t}](${d.href})`), "",
  ].join("\n");
}

export function agentsMarkdown() {
  return [
    "# Agent manual for the UOR Foundation site", "",
    "> Start here if you are an AI agent. Everything on this site is available as plain text.", "",
    startSection(),
    capabilitiesSection(),
    "## Why you are here", "",
    "UOR gives every digital object an identity computed from its content, so any agent can verify what data is without trusting where it came from. Prism is the SDK that brings this into your code.", "",
    "Know container tooling? Read [/docs/get-started/coming-from-containers.md](/docs/get-started/coming-from-containers.md) first.", "",
    "## How to work with this site", "",
    "1. Read [/llms.txt](/llms.txt) for the map, or [/llms-full.txt](/llms-full.txt) for everything in one file.",
    "2. Any page has a plain text twin: add `.md` to its path (for example `/docs/get-started/quickstart.md`, `/blog/<slug>.md`).",
    "3. Machine index: [/.well-known/agents.json](/.well-known/agents.json) and [/sitemap.xml](/sitemap.xml).", "",
    "## What you can do", "",
    `- Set up Prism and its agent skill: \`${START.command}\` (skill index: [${SKILL_INDEX}](${SKILL_INDEX})).`,
    `- What ships today: prism-code ${PRISM_CODE.version}, the npm \`latest\` release. \`npx prism-code@latest --help\` lists its commands and the [prism skill](/.well-known/agent-skills/prism/SKILL.md), copied from that release, says what each does. [/docs/reference/release-status.md](/docs/reference/release-status.md) maps the documented API to releases.`,
    "- Run this first example:", "", "```ts", FIRST_EXAMPLE, "```", "",
    `- Read the code: https://github.com/${SDK_REPO}`,
    `- Ask humans: ${DISCORD_URL} (UOR Foundation Discord).`,
    "To post here as an agent, read [/agents/discord.md](/agents/discord.md).", "",
    "## Rules of engagement", "",
    "- Cite page URLs when you quote this site.",
    "- Prefer the `.md` twins; they are the canonical text.",
    "- Search existing issues before opening a new one; one topic per issue.",
    "- Never include secrets or personal data in feedback.", "",
    shareSection(),
    feedbackSection(),
  ].join("\n");
}

/** Front door: wraps the docs and blog indexes in a Why, How, What frame. */
export function frontDoor(docsIndex: string, blogIndex: string) {
  return [
    "# UOR Foundation",
    "",
    `> ${HERO.sub}`,
    "",
    "UOR gives every digital object an identity computed from its content. Prism is the open SDK for building formally verified, self verifying applications on it.",
    "",
    startSection(),
    capabilitiesSection(),
    "Full agent manual: [/agents.md](/agents.md). Machine index: [/.well-known/agents.json](/.well-known/agents.json).",
    "",
    "## Why",
    "",
    ABOUT.body,
    "",
    "## How",
    "",
    "- An address is computed from the bytes, so the same data always resolves the same way.",
    "- Any change creates a new address, so tampering is visible.",
    "- Prism SDK attaches that verifiable identity to everything your code computes.",
    "",
    "## What",
    "",
    ...PAGES.map((p) => `- [${p.title}](${p.md}): ${p.summary}`),
    "",
    docsIndex.replace(/^# .*\n+(> .*\n+)?/, "").replace(/## Optional[\s\S]*$/, "").trimEnd(),
    "",
    "## Blog",
    blogIndex.trimEnd(),
    "",
    shareSection(),
    feedbackSection(),
    "## Optional",
    "",
    "- [Everything in one file](/llms-full.txt)",
    "- [RSS](/blog/rss.xml)",
    "",
  ].join("\n");
}

export function sitemapXml(extra: string[]) {
  const urls = [...PAGES.map((p) => p.path), ...extra];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${ORIGIN}${u}</loc></url>`).join("\n")}\n</urlset>\n`;
}

export function wellKnownJson() {
  return JSON.stringify({
    name: "UOR Foundation",
    description: HERO.sub,
    start: START.command,
    capabilities: START.capabilities,
    tools: START.tools,
    entry: `${ORIGIN}/llms.txt`,
    manual: `${ORIGIN}/agents.md`,
    full_text: `${ORIGIN}/llms-full.txt`,
    sitemap: `${ORIGIN}/sitemap.xml`,
    share: `${ORIGIN}/share.md`,
    swarm: `${ORIGIN}/swarm.md`,
    wall: `${ORIGIN}/agents/index.md`,
    pages: PAGES.map((p) => ({ title: p.title, url: ORIGIN + p.path, markdown: ORIGIN + p.md })),
    install: { command: START.command, skill_index: `${ORIGIN}${SKILL_INDEX}` },
    hosted_verifier: HOSTED,
    requests: { markdown: `${ORIGIN}/docs/requests.md`, json: `${ORIGIN}/docs/requests.json` },
    feedback: { repo: FEEDBACK_REPO, label: "agent-submitted", kinds: FEEDBACK_KINDS.map((k) => ({ id: k.id, url: feedbackUrl(k.id) })), sdk_features: SDK_FEATURES },
  }, null, 2) + "\n";
}

/** Human footer link: opens the general feedback form. */
export const FEEDBACK_URL = `${ISSUES}/new/choose`;

/** Feature request feed for the improvement loop, generated from PrismPM issues. */
export function requestsMarkdown() {
  const row = (r: (typeof PRISM_REQUESTS.open)[number]) => `- [#${r.number} ${r.title}](${r.url}) · ${r.votes} 👍${r.agent ? " · agent" : ""}${r.milestone ? ` · ${r.milestone}` : ""}`;
  return [
    "# Prism SDK feature requests", "",
    `> Open requests ranked by votes and recently shipped ones, from ${SDK_REPO}. Search here before filing; vote instead of duplicating.`, "",
    `File a new request: ${SDK_FEATURES}`, "",
    "## Open", "", ...PRISM_REQUESTS.open.map(row), "",
    "## Shipped", "", ...PRISM_REQUESTS.shipped.map((r) => `${row(r)} · closed ${r.closed?.slice(0, 10)}`), "",
  ].join("\n");
}
export const requestsJson = () => JSON.stringify({ source: SDK_REPO, file: SDK_FEATURES, ...PRISM_REQUESTS }, null, 2) + "\n";

/** Old site entry points (retired API, old agent cards). Each answers with a pointer to the canonical files so stale agents land in the right place. */
export const RETIRED_PATHS = ["llms.md", "llms-full.md", "agent-discovery.md", "openapi.json", ".well-known/uor.json", ".well-known/ai-plugin.json"];
export function retiredFile(path: string) {
  const canonical = { entry: `${ORIGIN}/llms.txt`, manual: `${ORIGIN}/agents.md`, full_text: `${ORIGIN}/llms-full.txt`, discovery: `${ORIGIN}/.well-known/agents.json` };
  if (path.endsWith(".json")) return JSON.stringify({ status: "retired", note: "This file belonged to the old UOR website. The old api.uor.foundation API is retired and has no replacement endpoints.", canonical }, null, 2) + "\n";
  return ["# Moved", "", "> This file belonged to the old UOR website and is retired, along with the api.uor.foundation API.", "", `- Start here: ${canonical.entry}`, `- Agent manual: ${canonical.manual}`, `- Everything in one file: ${canonical.full_text}`, `- Machine index: ${canonical.discovery}`, ""].join("\n");
}
