#!/usr/bin/env node
// Pulls the Prism SDK docs from the docs-site branch of UOR-Foundation/PrismPM into
// src/docs/prism.generated.ts. Run by .github/workflows/sync-prism-docs.yml on a schedule
// and on webhook (repository_dispatch). Never edit the generated file by hand.
//
// Without the docs-site branch this exits without changes. `--seed` allows a one-time
// import from main's docs/generated folder, used only before the branch exists.
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

const REPO = "UOR-Foundation/PrismPM";
const BRANCH = "docs-site";
const OUT = new URL("../src/docs/prism.generated.ts", import.meta.url);
const seed = process.argv.includes("--seed");
const headers = { Accept: "application/vnd.github+json", "User-Agent": "uor-site-docs-sync", ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };

async function json(url) {
  const r = await fetch(url, { headers });
  if (r.status === 404 || r.status === 422) return null;
  if (!r.ok) throw new Error(`${url} → ${r.status} ${await r.text()}`);
  return r.json();
}
async function text(path, sha) {
  const r = await fetch(`https://raw.githubusercontent.com/${REPO}/${sha}/${path}`);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.text();
}
function frontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta = {};
  let last = null;
  if (m) for (const line of m[1].split("\n")) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && last) { meta[last] = [meta[last], item[1].trim().replace(/^["']|["']$/g, "")].filter(Boolean).join(", "); continue; }
    const i = line.indexOf(":");
    if (i > 0) { last = line.slice(0, i).trim(); meta[last] = line.slice(i + 1).trim().replace(/^\[|\]$/g, "").split(",").map((v) => v.trim().replace(/^["']|["']$/g, "")).filter(Boolean).join(", "); }
  }
  return { meta, body: (m ? src.slice(m[0].length) : src).trim() + "\n" };
}
/** One regular file from an uncompressed (ustar) tar, as UTF-8 text, or null. */
function tarEntry(tar, want) {
  const field = (at, len) => tar.subarray(at, at + len).toString("utf8").replace(/\0.*$/s, "");
  for (let at = 0; at + 512 <= tar.length && tar[at] !== 0;) {
    const size = parseInt(field(at + 124, 12).trim() || "0", 8);
    const prefix = field(at + 345, 155);
    const name = (prefix ? prefix + "/" : "") + field(at, 100);
    const type = String.fromCharCode(tar[at + 156] || 48);
    if (name === want && (type === "0" || type === "\0")) return tar.subarray(at + 512, at + 512 + size).toString("utf8");
    at += 512 + Math.ceil(size / 512) * 512;
  }
  return null;
}

let branch = BRANCH, prefix = null;
let commit = await json(`https://api.github.com/repos/${REPO}/commits/${BRANCH}`);
if (!commit) {
  if (!seed) { console.log(`${BRANCH} branch not found; keeping current docs.`); process.exit(0); }
  branch = "main"; prefix = "docs/generated/";
  commit = await json(`https://api.github.com/repos/${REPO}/commits/main`);
}
const sha = commit.sha;
const tree = (await json(`https://api.github.com/repos/${REPO}/git/trees/${sha}?recursive=1`)).tree.filter((t) => t.type === "blob");
if (prefix === null) {
  // The llms.txt closest to the root marks the docs root on the docs-site branch.
  const llms = tree.map((t) => t.path).filter((p) => p.endsWith("llms.txt")).sort((a, b) => a.split("/").length - b.split("/").length)[0];
  if (!llms) throw new Error("No llms.txt on the docs-site branch");
  prefix = llms.slice(0, -"llms.txt".length);
}
const inRoot = tree.map((t) => t.path).filter((p) => p.startsWith(prefix)).map((p) => p.slice(prefix.length));
const pageFiles = inRoot.filter((p) => p.endsWith(".md") && !/^llms/.test(p) && /^(get-started|guides|api|reference|sdks|concepts|examples|migration)\//.test(p)).sort();
if (!pageFiles.length) throw new Error("No pages found; refusing to overwrite the current docs");
const llmsFullName = inRoot.find((p) => /^llms-full\.(md|txt)$/.test(p));

const pages = [];
for (const file of pageFiles) {
  const { meta, body } = frontmatter(await text(prefix + file, sha));
  pages.push({ file, title: meta.title || file, description: meta.description || "", availableIn: meta.available_in || "", body });
}
let changelog = null;
if (inRoot.includes("changelog.md")) {
  const { meta, body } = frontmatter(await text(prefix + "changelog.md", sha));
  changelog = { file: "changelog.md", title: meta.title || "Changelog", description: meta.description || "", availableIn: meta.available_in || "", body };
}
const llms = (await text(prefix + "llms.txt", sha)).replace(/https:\/\/universal-coordinate-foundation\.lovable\.app/g, "https://uor.foundation");
const llmsFull = (llmsFullName ? await text(prefix + llmsFullName, sha) : "").replace(/https:\/\/universal-coordinate-foundation\.lovable\.app/g, "https://uor.foundation");
// Vocabulary: docs-site root when present, otherwise docs/vocabulary.md on main, which stays canonical after the docs-site reorganization.
let vocabulary = "";
const vocabOnBranch = [prefix + "vocabulary.md", "docs/vocabulary.md"].find((p) => tree.some((t) => t.path === p));
if (vocabOnBranch) vocabulary = await text(vocabOnBranch, sha);
else {
  const mainCommit = await json(`https://api.github.com/repos/${REPO}/commits/main`);
  if (mainCommit) vocabulary = await text("docs/vocabulary.md", mainCommit.sha).catch(() => "");
}
const milestones = ((await json(`https://api.github.com/repos/${REPO}/milestones?state=all&per_page=50&sort=due_on`)) || [])
  .sort((a, b) => a.number - b.number)
  .map((m) => ({ number: m.number, title: m.title, description: m.description || "", due: m.due_on, state: m.state, open: m.open_issues, closed: m.closed_issues, url: m.html_url }));
// The npm `latest` release decides every version the site states, and its bundled skill/SKILL.md is
// the one agent skill the site publishes, byte for byte, so the site and the package cannot disagree.
const registry = await fetch("https://registry.npmjs.org/prism-code").then((r) => r.json());
const npm = registry["dist-tags"]?.latest;
const release = registry.versions?.[npm];
if (!release) throw new Error("npm registry gave no prism-code latest release; refusing to overwrite the current docs");
const tarball = Buffer.from(await fetch(release.dist.tarball).then((r) => { if (!r.ok) throw new Error(`${release.dist.tarball} → ${r.status}`); return r.arrayBuffer(); }));
const [alg, want] = release.dist.integrity.split("-");
if (createHash(alg).update(tarball).digest("base64") !== want) throw new Error(`prism-code ${npm} tarball does not match its registry integrity`);
const skill = tarEntry(gunzipSync(tarball), "package/skill/SKILL.md");
if (!skill) throw new Error(`prism-code ${npm} ships no skill/SKILL.md`);

const source = { repo: REPO, branch, commit: sha, committedAt: commit.commit.committer.date, npm, npmLicense: release.license ?? "", npmPublished: registry.time?.[npm] ?? "" };
await writeFile(OUT, `// Generated by scripts/sync-prism-docs.mjs from ${REPO}@${branch}. Do not edit.\n` +
  `export const PRISM_SOURCE = ${JSON.stringify(source, null, 2)} as const;\n` +
  `export type PrismPage = { file: string; title: string; description: string; availableIn: string; body: string };\n` +
  `export const PRISM_PAGES: PrismPage[] = ${JSON.stringify(pages, null, 2)};\n` +
  `export const PRISM_CHANGELOG: PrismPage | null = ${JSON.stringify(changelog, null, 2)};\n` +
  `export const PRISM_VOCABULARY: string = ${JSON.stringify(vocabulary)};\n` +
  `export const PRISM_MILESTONES: { number: number; title: string; description: string; due: string | null; state: string; open: number; closed: number; url: string }[] = ${JSON.stringify(milestones, null, 2)};\n` +
  `export const PRISM_LLMS: string = ${JSON.stringify(llms)};\n` +
  `export const PRISM_LLMS_FULL: string = ${JSON.stringify(llmsFull)};\n` +
  `/** skill/SKILL.md from the prism-code ${npm} npm package, the skill \`prism-code setup\` installs. */\n` +
  `export const PRISM_SKILL: string = ${JSON.stringify(skill)};\n`);
console.log(`Synced ${pages.length} pages from ${REPO}@${branch} (${sha.slice(0, 7)}), prism-code ${npm}.`);

