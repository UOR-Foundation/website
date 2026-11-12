// Single source for every docs page, the llms.txt index and the per page Markdown files.
// Page text is hand-written in src/docs/pages.ts from the Prism SDK documentation report,
// keeping only behaviour that was run and verified.
import { PRISM_SOURCE } from "./prism.generated";
import { CHANGELOG_PAGE, SOURCE_PAGES, TESTED_WITH } from "./pages";
import { HINT_TERMS, dockerGloss, type Milestone } from "./vocabulary";

export type DocPage = { slug: string; title: string; summary: string; updated: string; body: string; availableIn?: string };
export type DocGroup = { label: string; pages: DocPage[]; planned?: { label: string; milestone: Milestone | null }[] };
export type DocTab = { id: "get-started" | "guides" | "reference"; label: string; groups: DocGroup[] };

export const SOURCE = PRISM_SOURCE;

/** "MIT OR Apache-2.0" as words: "MIT or Apache 2.0". */
export const spdxWords = (id: string) => id.replace(/ OR /g, " or ").replace(/ AND /g, " and ").replace(/-(\d)/g, " $1");

export const SDK_VERSION = "v0.4";
export const RELEASE_STATUS = [
  { item: "Prism SDK", status: SDK_VERSION, note: "What these pages describe" },
  { item: "prism-code", status: TESTED_WITH.npm, note: "Runtime, commands and agent tools; every output here was recorded with it" },
  { item: "PrismPM", status: TESTED_WITH.prismpm, note: "Build tools" },
  { item: "LexLean", status: TESTED_WITH.lexlean, note: "Model language" },
  { item: "Lean", status: TESTED_WITH.lean, note: "Proof checker" },
];

const updated = "November 12, 2026";
const TAB_DEFS: { id: DocTab["id"]; label: string; groups: string[] }[] = [
  { id: "get-started", label: "Get started", groups: ["Overview", "Your first app"] },
  { id: "guides", label: "Guides", groups: ["Build with agents", "Write and check", "Use an app"] },
  { id: "reference", label: "Reference", groups: ["Basics", "Commands"] },
];
const toPage = (p: (typeof SOURCE_PAGES)[number]): DocPage => ({ slug: p.slug, title: p.title, summary: p.summary, updated, body: p.body, availableIn: "" });
const NAV = new Map(SOURCE_PAGES.map((p) => [p.slug, p.nav ?? p.title]));
export const navLabel = (p: DocPage) => NAV.get(p.slug) ?? p.title;

export const TABS: DocTab[] = TAB_DEFS.map((t) => ({
  id: t.id, label: t.label,
  groups: t.groups.map((g) => ({ label: g, pages: SOURCE_PAGES.filter((p) => p.tab === t.id && p.group === g).map(toPage) })).filter((g) => g.pages.length),
}));
export const ALL_PAGES = TABS.flatMap((t) => t.groups.flatMap((g) => g.pages.map((p) => ({ ...p, tab: t.id, group: g.label }))));

/** The five step path; every step is a page. */
export const STEPS = ALL_PAGES.filter((p) => p.group === "Your first app").map((p) => ({ slug: p.slug, title: p.title, summary: p.summary }));
export const GOLDEN_PATH: { step: string; text: string; cmd: string; slug?: string; verb?: string }[] = STEPS.map((s) => ({ step: s.title === "Build your first app" ? "Build" : s.title, text: s.summary, cmd: "", slug: s.slug }));
/** Nothing unshipped is listed. */
export const PLANNED: { group: string; label: string; verb: string; milestone: Milestone | null }[] = [];

export const UPSTREAM_CHANGELOG: DocPage = { slug: CHANGELOG_PAGE.slug, title: CHANGELOG_PAGE.title, summary: CHANGELOG_PAGE.summary, updated, body: CHANGELOG_PAGE.body, availableIn: "" };
export const CHANGELOG = [{ date: "November 12, 2026", version: SDK_VERSION, tag: "Release", title: "Prism SDK v0.4", note: "Guided build, proofs in Lean, and the full prism-code command set." }];

export const DOCS_ASK = {
  title: "How can we help?",
  placeholder: "Ask anything about Prism",
  questions: [
    "How do I set up Prism with my coding agent?",
    "Why is my first run refused?",
    "What is proved, and what is only tested?",
    "Where does my source code go during a check?",
    "What ships in Prism SDK v0.4?",
  ],
};

export const DOCS_HOME = {
  eyebrow: "Overview",
  title: "Prism documentation",
  intro: "Build apps whose rules are proved by Lean, then run and check them anywhere. For developers and AI agents using Prism SDK v0.4.",
  cards: [
    { title: "Get started", text: "Set up, build, run, verify and share in five steps.", slug: "get-started/why-prism", pattern: "dots" },
    { title: "Guides", text: "Build with an agent, check and prove, use an app.", slug: "guides/agents", pattern: "grid" },
    { title: "Reference", text: "Concepts, commands, agent tools and exit codes.", slug: "reference/concepts", pattern: "grid" },
  ],
};

export const releaseStatusMarkdown = () => [
  "## Versions", "",
  "| Part | Version | Note |", "| --- | --- | --- |",
  ...RELEASE_STATUS.map((r) => `| ${r.item} | ${r.status} | ${r.note} |`), "",
].join("\n");

export const pageMarkdown = (p: DocPage) => `# ${p.title}\n\n> ${p.summary}\n\n${p.availableIn ? `Available in: ${p.availableIn}\n\n` : ""}${releaseStatusMarkdown()}\n${p.body}`;

export function llmsTxt(origin = "") {
  const lines = ["# Prism documentation", "", `> Prism SDK ${SDK_VERSION}: build apps whose rules are proved by Lean, sealed into one file anyone can check before running. Start with \`npx prism-code@latest setup\`. Every command is \`npx prism-code <command>\`; there is no separate \`prism\` command.`, ""];
  for (const t of TABS) {
    lines.push(`## ${t.label}`, "");
    for (const p of t.groups.flatMap((g) => g.pages)) {
      const term = HINT_TERMS.find((x) => new RegExp(`\\b${x.prism}\\b`, "i").test(`${p.title} ${p.summary}`));
      lines.push(`- [${p.title}](${origin}/docs/${p.slug}.md): ${p.summary}${term ? ` (Also known as: ${dockerGloss(term)})` : ""}`);
    }
    lines.push("");
  }
  lines.push("## What's new", "", `- [${UPSTREAM_CHANGELOG.title}](${origin}/docs/changelog.md): ${UPSTREAM_CHANGELOG.summary}`, "");
  lines.push("## Optional", "", `- [Full documentation](${origin}/llms-full.txt): Every page in one file.`, "");
  return lines.join("\n");
}

export const llmsFullTxt = () => [...ALL_PAGES, UPSTREAM_CHANGELOG].map(pageMarkdown).join("\n\n---\n\n");
/** Kept for the published /docs/upstream/llms.txt and /docs/llms-full.md paths; both now carry the same docs. */
export const UPSTREAM_LLMS = llmsTxt();
export const UPSTREAM_LLMS_FULL = llmsFullTxt();
