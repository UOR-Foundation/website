#!/usr/bin/env bun
/**
 * Agent Skills Publisher
 * ═══════════════════════════════════════════════════════════════
 *
 * Publishes the Prism agent skill at /.well-known/agent-skills/ so that
 *
 *   npx skills add https://uor.foundation
 *
 * installs it. The skill's source of truth is skills/prism/SKILL.md in
 * UOR-Foundation/PrismPM; this script copies it from PrismPM main at deploy
 * time, so the site never carries a stale copy.
 *
 * Usage:
 *   bun scripts/agent-skills.ts dist
 *
 * Writes, under <out>/.well-known/agent-skills/:
 *   index.json        discovery index, agentskills.io schema 0.2.0
 *   prism/SKILL.md    the skill, byte for byte as PrismPM main has it
 *
 * Exits non-zero if the skill cannot be fetched or has no name and
 * description, so a deploy never publishes a broken index.
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ── Config ───────────────────────────────────────────────────────────────

const REPO = "UOR-Foundation/PrismPM";
const SKILLS = ["prism"];
const SCHEMA = "https://schemas.agentskills.io/discovery/0.2.0/schema.json";

const OUT = process.argv[2];
if (!OUT) {
  console.error("usage: bun scripts/agent-skills.ts <build-dir>");
  process.exit(64);
}

// ── Fetch ────────────────────────────────────────────────────────────────

async function get(url: string): Promise<Response> {
  const res = await fetch(url, { headers: { "User-Agent": "uor-website-deploy" } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res;
}

// Pin one commit so every skill in this deploy comes from the same tree.
const commit = await get(`https://api.github.com/repos/${REPO}/commits/main`)
  .then((r) => r.json())
  .then((c: { sha: string }) => c.sha);

function frontmatter(text: string): Record<string, string> {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const fields: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-z_-]+):\s*(.*)$/i);
    if (kv) fields[kv[1]] = kv[2].trim().replace(/^(["'])(.*)\1$/, "$2");
  }
  return fields;
}

// ── Write ────────────────────────────────────────────────────────────────

const root = path.join(OUT, ".well-known", "agent-skills");
const entries = [];

for (const skill of SKILLS) {
  const url = `https://raw.githubusercontent.com/${REPO}/${commit}/skills/${skill}/SKILL.md`;
  const bytes = new Uint8Array(await (await get(url)).arrayBuffer());
  const meta = frontmatter(new TextDecoder().decode(bytes));
  if (meta.name !== skill || !meta.description) {
    throw new Error(`${url}: frontmatter needs name: ${skill} and a description`);
  }

  fs.mkdirSync(path.join(root, skill), { recursive: true });
  fs.writeFileSync(path.join(root, skill, "SKILL.md"), bytes);
  entries.push({
    name: skill,
    type: "skill-md",
    description: meta.description,
    url: `${skill}/SKILL.md`,
    digest: `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`,
  });
}

fs.writeFileSync(
  path.join(root, "index.json"),
  JSON.stringify({ $schema: SCHEMA, skills: entries }, null, 2) + "\n",
);

console.log(`agent skills: ${SKILLS.join(", ")} from ${REPO}@${commit.slice(0, 12)}`);
