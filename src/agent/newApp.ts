// The prism-new-app skill: one sentence from a user becomes a formally verified Prism
// application in a new GitHub repository, written through the UOR MCP server. The text is
// src/agent/new-app.skill.md, served verbatim at /new.md and as a discoverable skill next to
// prism-sdk (see src/agent/skill.ts). The frontmatter is the single source of its name and
// description, so the index entries cannot drift from the file.
// Build and test only, like skill.ts: read with fs, because vite.config.ts imports this
// through skill.ts and the config bundler has no Markdown loader.
import { readFileSync } from "node:fs";

const md = readFileSync(new URL("./new-app.skill.md", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const fm = md.match(/^---\n([\s\S]*?)\n---\n/);
if (!fm) throw new Error("new-app.skill.md has no frontmatter");
const field = (key: string) => {
  const line = fm[1].split("\n").find((l) => l.startsWith(`${key}:`));
  if (!line) throw new Error(`new-app.skill.md frontmatter lacks ${key}`);
  return line.slice(key.length + 1).trim().replace(/^"(.*)"$/, "$1");
};

export const NEW_APP_SKILL_NAME = field("name");
export const NEW_APP_SKILL_DESCRIPTION = field("description");
/** Published at /new.md and /.well-known/agent-skills/prism-new-app/SKILL.md. */
export const NEW_APP_PATH = "/new.md";

export function newAppSkillMarkdown() {
  return md;
}
