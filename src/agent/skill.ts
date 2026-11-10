// The agent skill served for `npx skills add https://uor.foundation`.
// The site publishes exactly one skill, `prism`: the skill/SKILL.md bundled in the prism-code npm
// release that scripts/sync-prism-docs.mjs pulls (npm `latest`), byte for byte. It is the same file
// `npx prism-code@latest setup` installs, so the site and the package cannot give different instructions.
// The skills CLI reads /.well-known/agent-skills/index.json (v2, digest checked) first,
// then /.well-known/skills/index.json (v1). Both point at the same SKILL.md bytes.
// Build and test only: uses node:crypto, so browser code must not import this file.
import { createHash } from "node:crypto";
import { PRISM_SKILL, PRISM_SOURCE } from "../docs/prism.generated";
import { ORIGIN } from "./site";

export const DISCOVERY_SCHEMA_V2 = "https://schemas.agentskills.io/discovery/0.2.0/schema.json";
/** The prism-code release whose bundled skill the site serves. */
export const SKILL_RELEASE = PRISM_SOURCE.npm;

function frontmatter(md: string) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) throw new Error(`prism-code ${SKILL_RELEASE} skill/SKILL.md has no frontmatter`);
  const field = (k: string) => m[1].match(new RegExp(`^${k}:\\s*(.*)$`, "m"))?.[1].trim().replace(/^"(.*)"$/, "$1") ?? "";
  return { name: field("name"), description: field("description") };
}

const FM = frontmatter(PRISM_SKILL);
export const SKILL_NAME = FM.name;
export const SKILL_DESCRIPTION = FM.description;

export function skillMarkdown() {
  return PRISM_SKILL;
}

/** The site's earlier skill. Kept at its old paths, outside both indexes, so a stale link says where to go. */
export const RETIRED_SKILL = "prism-sdk";
export function retiredSkillMarkdown() {
  return [
    "---",
    `name: ${RETIRED_SKILL}`,
    `description: "Retired. Use the ${SKILL_NAME} skill instead."`,
    "---",
    "",
    `# ${RETIRED_SKILL} (retired)`,
    "",
    `This skill is retired. It covered prism-code 0.2.0 only and now contradicts the current release. Use the \`${SKILL_NAME}\` skill, the one bundled with prism-code: \`npx prism-code@latest setup\` installs it, and ${ORIGIN}/.well-known/agent-skills/${SKILL_NAME}/SKILL.md serves the same bytes.`,
    "",
  ].join("\n");
}

export const sha256 = (text: string) => `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;

/** v2 discovery index for /.well-known/agent-skills/index.json. */
export function skillIndexV2() {
  return JSON.stringify({
    $schema: DISCOVERY_SCHEMA_V2,
    skills: [{ name: SKILL_NAME, description: SKILL_DESCRIPTION, type: "skill-md", url: `${SKILL_NAME}/SKILL.md`, digest: sha256(skillMarkdown()) }],
  }, null, 2) + "\n";
}

/** v1 discovery index for /.well-known/skills/index.json, read by older CLIs. */
export function skillIndexV1() {
  return JSON.stringify({ skills: [{ name: SKILL_NAME, description: SKILL_DESCRIPTION, files: ["SKILL.md"] }] }, null, 2) + "\n";
}

/** Every file the skill needs, keyed by published path. */
export function skillFiles(): Record<string, string> {
  const md = skillMarkdown();
  const retired = retiredSkillMarkdown();
  return {
    ".well-known/agent-skills/index.json": skillIndexV2(),
    [`.well-known/agent-skills/${SKILL_NAME}/SKILL.md`]: md,
    ".well-known/skills/index.json": skillIndexV1(),
    [`.well-known/skills/${SKILL_NAME}/SKILL.md`]: md,
    [`.well-known/agent-skills/${RETIRED_SKILL}/SKILL.md`]: retired,
    [`.well-known/skills/${RETIRED_SKILL}/SKILL.md`]: retired,
  };
}
