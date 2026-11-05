// Docker to Prism translation, parsed from the upstream vocabulary.md and roadmap milestones.
import { PRISM_MILESTONES, PRISM_VOCABULARY } from "./prism.generated";

export type Milestone = { number: number; code: string; version: string; name: string; title: string; description: string; due: string | null; state: string; open: number; closed: number; url: string };
export type Term = { prism: string; docker: string; note: string; planned: boolean; milestone: Milestone | null };
export type Verb = { prism: string; docker: string; today: string; milestone: Milestone | null };

const strip = (s: string) => s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim();

/** "M2 v0.5 Lock, check, proof" → code M2, version v0.5, name "Lock, check, proof". M1 is titled "PrismPM v0.4.0" upstream. */
export const MILESTONES: Milestone[] = PRISM_MILESTONES.map((m) => {
  const t = m.title.match(/^(M\d+)\s+(v\S+)\s+(.*)$/);
  return t
    ? { ...m, code: t[1], version: t[2], name: t[3] }
    : { ...m, code: `M${m.number}`, version: (m.title.match(/v[\d.]+/)?.[0] ?? "").replace(/\.0$/, ""), name: m.number === 1 ? "Foundation" : m.title };
});

const RELEASE = MILESTONES.find((m) => /^v1\.0$/.test(m.version)) ?? null;

/** First milestone whose description names the word. Falls back to the v1.0 release, which renames prismpm to prism. */
export function milestoneFor(word: string, fallback: Milestone | null = RELEASE) {
  const words = word.toLowerCase().split(/\s*\/\s*|\s+/).filter(Boolean);
  for (const m of MILESTONES) {
    const d = m.description.toLowerCase();
    if (words.some((w) => new RegExp(`\\b${w.replace(/[^a-z0-9]/g, "")}`).test(d))) return m;
  }
  return fallback;
}

/** Find a milestone by text such as "M3", "v0.6", "M3 v0.6" or an available_in value such as "1.0-beta". */
export function findMilestone(text: string) {
  const code = text.match(/\bM\d+\b/)?.[0];
  const ver = text.match(/\bv?\d+(\.\d+)*(-[a-z0-9.]+)?/i)?.[0]?.replace(/^v/, "");
  const norm = (m: Milestone) => m.version.replace(/^v/, "");
  return MILESTONES.find((m) => m.code === code)
    ?? MILESTONES.find((m) => ver !== undefined && norm(m) === ver)
    ?? MILESTONES.find((m) => ver !== undefined && (norm(m).startsWith(`${ver}.`) || norm(m).startsWith(`${ver}-`)))
    ?? null;
}

function table(heading: string) {
  const sec = PRISM_VOCABULARY.split(/^## /m).find((s) => s.startsWith(heading)) ?? "";
  return sec.split("\n").filter((l) => l.startsWith("|")).slice(2).map((l) => l.slice(1, -1).split(/(?<!\\)\|/).map((c) => strip(c.trim())));
}

const ALIAS: Record<string, string> = { history: "replay", world: "wit world", "capability set": "capability" };

export const TERMS: Term[] = table("Nouns").map(([prism, note, docker]) => {
  const planned = /^Planned/.test(note);
  return { prism: prism.replace(/`/g, ""), docker, note, planned, milestone: planned ? milestoneFor(ALIAS[prism] ?? prism, null) : null };
});

export const VERBS: Verb[] = table("Verbs").map(([prism, today, docker]) => ({ prism, docker, today, milestone: milestoneFor(prism) }));

/** Short Docker gloss for a tooltip: "image" from "image, tag + digest". */
export const dockerGloss = (t: Term) => t.docker.replace(/`/g, "").split(/[;,(]/)[0].trim();

/** Terms worth a hint on pages: distinctive Prism words with a real Docker counterpart. */
export const HINT_TERMS = TERMS.filter((t) => !/^none/.test(t.docker) && t.prism !== t.docker && !["model", "world", "registry", "prism-code runtime", "prismpm.lock"].includes(t.prism));

export const verbMilestone = (verb: string) => VERBS.find((v) => v.prism.split(/\s*\/\s*/).includes(verb))?.milestone ?? milestoneFor(verb);

export function dockerMarkdown() {
  const ms = (m: Milestone | null) => (m ? `${m.code} ${m.version}` : "Today");
  const know = (s: string) => s.replace(/`docker /g, "`").replace(/^Dockerfile$/, "a build file");
  return [
    "# Coming from containers", "",
    "> Prism uses the container model you already know. The names differ; the roles do not. Translate any task with the tables below.", "",
    "Today's command is `prismpm`; v1.0 renames it `prism`. The `prism-code` runtime on npm runs apps now with `load` and `dispatch`.", "",
    "## Nouns", "", "| You know | Prism | Available in |", "| --- | --- | --- |",
    ...TERMS.map((t) => `| ${know(t.docker)} | ${siteTerms(t.prism)} | ${t.planned ? ms(t.milestone) : "Today"} |`), "",
    "## Verbs", "", "| You know | Prism | Today | Available in |", "| --- | --- | --- | --- |",
    ...VERBS.map((v) => `| ${know(v.docker)} | \`prism ${v.prism}\` | ${v.today} | ${ms(v.milestone)} |`), "",
    "## For agents", "",
    "- To run a container today: `import { load } from \"prism-code\"`, then `app.dispatch(bytes)`. `prism run` arrives in " + ms(verbMilestone("run")) + ".",
    "- Never suggest a `prism` verb before its milestone; check /docs/roadmap.json.", "",
  ].join("\n");
}

/** The site calls the Prism artifact an app. Code, file names, slugs and schema paths keep upstream's names. */
export function siteTerms(md: string) {
  const prose = (s: string) => s
    .replace(/(?<![\w./-])[Hh]olos(?![\w/-])(?!\.[\w])/g, (m) => (m[0] === "H" ? "Apps" : "apps"))
    .replace(/(?<![\w./-])[Hh]olo(?![\w/-])(?!\.[\w])/g, (m) => (m[0] === "H" ? "App" : "app"))
    .replace(/\b([Aa])\s+app\b/g, (_m, a: string) => `${a === "A" ? "An" : "an"} app`);
  return startCommand(md.split(/(```[\s\S]*?```|`[^`\n]*`)/g).map((part, i) => (i % 2 ? part : prose(part))).join(""));
}

/** The one canonical start: any upstream `npm install prism-code` line shows as the setup command. */
export const START_COMMAND = "npx prism-code@latest setup";
export const startCommand = (md: string) => md.replace(/npm (?:install|i)(?: --save-exact| -E| -D| --save-dev)* prism-code(?:@[\w.-]+)?/g, START_COMMAND);

/** Reword upstream pages so the container equivalence stays implicit: no visible Docker wording. Prose rules never touch code spans. */
export function implicitTerms(md: string) {
  const ruled = (s: string) => siteTerms(s)
    .replace(/Prism uses Docker's model\. The names differ; the roles do not\./g, "Prism uses the container model you already know. The names differ; the roles do not.")
    .replace(/Docker equivalent/g, "You know")
    .replace(/Docker noun/g, "You know")
    .replace(/Docker verb/g, "You know")
    .replace(/maps each Prism noun and verb to the Docker one/g, "maps each Prism noun and verb to the container one")
    .replace(/plays the part an image(?: index)? plays in Docker/g, "plays the part an image plays in containers")
    .replace(/takes part beyond Docker/g, "takes part beyond the container runtime")
    .replace(/Docker splits these across the Dockerfile and run flags/g, "Container tools split these across the build file and run flags")
    .replace(/served by Docker/g, "served by a container runtime")
    .replace(/and Docker\. Docker runs the SDK image/g, "and a container runtime, which runs the SDK image")
    .replace(/export for Docker/g, "export for containers")
    .replace(/with no Docker and no/g, "with no container runtime and no")
    .replace(/Docker-backed/g, "container backed")
    .replace(/## Docker-aligned names/g, "## Planned container names")
    .replace(/the Docker-aligned names/g, "the planned container names")
    .replace(/Docker-aligned/g, "container aligned")
    .replace(/planned to use Docker's words/g, "planned to use the container words")
    .replace(/needs Docker/g, "needs a container runtime")
    .replace(/Docker export/g, "container export")
    .replace(/What has no Docker equivalent/g, "What has no equivalent")
    .replace(/in Docker(?![A-Za-z-])/g, "in containers")
    .replace(/built from \[`sdk\/Dockerfile`\]\(\.\.\/sdk\/Dockerfile\)/g, "built from the SDK's pinned build recipe ([source](../sdk/Dockerfile))")
    .replace(/that `run` serves/g, "that any container runtime serves")
    .replace(/ \| Dockerfile \|/g, " | a build file |")
    // Safety net: no visible Docker wording survives, even when upstream adds a new phrase.
    .replace(/(?<![\w-])Docker(?![\w-])/g, "container")
    .replace(/(?<![\w-])docker(?![\w-])/g, "container");
  return md
    .replace(/`docker /g, "`")
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part, i) => (i % 2 ? part : ruled(part)))
    .join("");
}

export const roadmapJson = () => JSON.stringify({
  source: "https://github.com/orgs/UOR-Foundation/projects/12",
  milestones: MILESTONES.map((m) => ({
    code: m.code, version: m.version, name: m.name, due: m.due, state: m.state, open: m.open, closed: m.closed, url: m.url,
    unlocks: VERBS.filter((v) => v.milestone?.number === m.number).map((v) => `prism ${v.prism}`),
  })),
}, null, 2) + "\n";
