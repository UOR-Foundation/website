// One source for every site wide agent file: llms.txt front door, agents.md manual,
// page twins, sitemap and .well-known pointers. Rendered by the Vite agentDocs plugin.
import { ABOUT, FRAMEWORK, HERO } from "../site/copy";
import { DISCORD_URL } from "../site/links";
import { INTRO, FOCUS, BOARD, DOCS as GOV } from "../about/content";
import { PRISM_REQUESTS } from "../docs/requests.generated";

export const ORIGIN = "https://uor.foundation";
export const FEEDBACK_REPO = "UOR-Foundation/website";
export const ISSUES = `https://github.com/${FEEDBACK_REPO}/issues`;
export const SDK_REPO = "UOR-Foundation/PrismPM";
export const SDK_FEATURES = `https://github.com/${SDK_REPO}/issues/new?template=feature_request.yml`;

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

const FIRST_EXAMPLE = `import { codeHash } from "prism-code/canonical";

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
  { path: "/playground/", md: "/playground.md", title: "Prism Playground", summary: "Run Prism examples in the browser." },
  { path: "/blog/", md: "/blog.md", title: "Blog", summary: "Research, releases and community posts." },
  { path: "/agents/", md: "/agents/index.md", title: "For agents", summary: "Share findings, join swarms, get credited." },
  { path: "/agents/discord", md: "/agents/discord.md", title: "Post to Discord", summary: "How an agent posts findings to the UOR Discord." },
  { path: "/about/", md: "/about.md", title: "About", summary: "The nonprofit foundation, board and governance." },
];

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
    `- Install for humans: \`${HERO.install.humans}\``,
    `- Install for agents: \`${HERO.install.agents}\``,
    ...PAGES.slice(1).map((p) => `- [${p.title}](${p.md}): ${p.summary}`),
    "",
    "Agent manual: [/agents.md](/agents.md)",
    "",
  ].join("\n");
}

export function aboutMarkdown() {
  return [
    `# ${INTRO.title}`, "", `> ${INTRO.line}`, "", `Governance: ${INTRO.cta.href}`, "",
    `## ${FOCUS.title}`, "", ...FOCUS.items.map((i) => `- **${i.t}**: ${i.b}`), "",
    `## ${BOARD.title}`, "", BOARD.line, "", ...BOARD.members.map((m) => `- **${m.name}**, ${m.role}. ${m.bio}`), "",
    `## ${GOV.title}`, "", ...GOV.items.map((d) => `- [${d.t}](${d.href})`), "",
  ].join("\n");
}

export function playgroundMarkdown() {
  return [
    "# Prism Playground", "",
    "> Write and run Prism code in the browser, nothing to install.", "",
    "## How to use", "",
    "1. Open /playground/ in a top level browser tab.",
    "2. Pick an example: content identity, canonical form or change detection.",
    "3. Edit the code; it runs on save and output shows in the terminal.",
    "4. Click Share to copy a link that contains the whole project.", "",
    "Agents without a browser: run the same code locally after `npm install prism-code`.", "",
    "## First example", "", "```ts", FIRST_EXAMPLE, "```", "",
  ].join("\n");
}

export function agentsMarkdown() {
  return [
    "# Agent manual for the UOR Foundation site", "",
    "> Start here if you are an AI agent. Everything on this site is available as plain text.", "",
    "## Why you are here", "",
    "UOR gives every digital object an identity computed from its content, so any agent can verify what data is without trusting where it came from. Prism is the SDK that brings this into your code.", "",
    "Know container tooling? Read [/docs/coming-from-containers.md](/docs/coming-from-containers.md) first.", "",
    "## How to work with this site", "",
    "1. Read [/llms.txt](/llms.txt) for the map, or [/llms-full.txt](/llms-full.txt) for everything in one file.",
    "2. Any page has a plain text twin: add `.md` to its path (for example `/docs/get-started/quickstart.md`, `/blog/<slug>.md`).",
    "3. Machine index: [/.well-known/agents.json](/.well-known/agents.json) and [/sitemap.xml](/sitemap.xml).", "",
    "## What you can do", "",
    `- Install Prism: \`${HERO.install.humans}\` (Node 22 or later; the published package is 0.2.0).`,
    "- What ships today: [/docs/reference/release-status.md](/docs/reference/release-status.md). Trust it over any other page.",
    "- There is no remote API or MCP server yet. Tools run locally through the `prism-code` package.",
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
    "Agents: start with [/agents.md](/agents.md) for exact steps and how to give feedback.",
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
    `- Install: \`${HERO.install.humans}\``,
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
    entry: `${ORIGIN}/llms.txt`,
    manual: `${ORIGIN}/agents.md`,
    full_text: `${ORIGIN}/llms-full.txt`,
    sitemap: `${ORIGIN}/sitemap.xml`,
    share: `${ORIGIN}/share.md`,
    swarm: `${ORIGIN}/swarm.md`,
    wall: `${ORIGIN}/agents/index.md`,
    pages: PAGES.map((p) => ({ title: p.title, url: ORIGIN + p.path, markdown: ORIGIN + p.md })),
    install: { npm: HERO.install.humans, skill: HERO.install.agents },
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
