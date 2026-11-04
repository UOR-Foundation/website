// The prism-sdk agent skill, served for `npx skills add https://uor.foundation`.
// The skills CLI reads /.well-known/agent-skills/index.json (v2, digest checked) first,
// then /.well-known/skills/index.json (v1). Both point at the same SKILL.md bytes.
// Build and test only: uses node:crypto, so browser code must not import this file.
import { createHash } from "node:crypto";
import { ALL_PAGES, DOCUMENTED_API, RELEASE_STATUS, SOURCE } from "../docs/content";
import { FIRST_EXAMPLE, ORIGIN, SDK_FEATURES, feedbackUrl } from "./site";

export const SKILL_NAME = "prism-sdk";
/** The prism-code release the examples below were run against. Re-run them before bumping. */
export const VERIFIED_WITH = "0.2.0";
export const SKILL_DESCRIPTION =
  "Use the Prism SDK (npm package prism-code) to compute content hashes, load .holo apps, send them requests and replay their built in examples. Use when a task mentions UOR, Prism, prism-code or .holo files. Covers only what ships on npm today.";
export const DISCOVERY_SCHEMA_V2 = "https://schemas.agentskills.io/discovery/0.2.0/schema.json";

/** "0.2.0" < "0.5" < "1.0-beta" < "1.0". A prerelease sorts before its release. */
export function compareRelease(a: string, b: string) {
  const parse = (v: string) => { const [core, pre] = v.split("-"); return { n: core.split(".").map(Number), pre: pre ?? null }; };
  const x = parse(a), y = parse(b);
  for (let i = 0; i < Math.max(x.n.length, y.n.length); i++) {
    const d = (x.n[i] ?? 0) - (y.n[i] ?? 0);
    if (d) return Math.sign(d);
  }
  if (x.pre === y.pre) return 0;
  if (x.pre === null) return 1;
  if (y.pre === null) return -1;
  return x.pre < y.pre ? -1 : 1;
}

const shippedPages = () => ALL_PAGES.filter((p) => p.availableIn && compareRelease(p.availableIn, SOURCE.npm) <= 0);

const CALL_EXAMPLE = `import { load } from "prism-code";

const app = await load("./node_modules/prism-code/fixtures/Calculator.holo");
console.log(app.name, app.identities.verified);

const response = await app.dispatch(new TextEncoder().encode("1\\tadd\\t20\\t22"));
console.log(JSON.stringify(new TextDecoder().decode(response)));

const result = await app.acceptance();
console.log(result.passed, "of", result.total, "examples replayed");`;

export function skillMarkdown() {
  return [
    "---",
    `name: ${SKILL_NAME}`,
    `description: "${SKILL_DESCRIPTION}"`,
    "---",
    "",
    "# Prism SDK",
    "",
    `Prism gives data and apps an identity computed from their bytes, so anyone can check a result without trusting where it came from. This skill covers prism-code ${SOURCE.npm}, the release on npm today. The docs at ${ORIGIN}/docs/ describe the planned ${DOCUMENTED_API} API, and most of it is not published yet. When the two disagree, trust this file and ${ORIGIN}/docs/reference/release-status.md.`,
    "",
    "## Install",
    "",
    "Node 22 or later.",
    "",
    "```sh",
    "npm install prism-code",
    "```",
    "",
    "## Hash content",
    "",
    "Save as `hash.mjs` and run `node hash.mjs`. It prints `true false`.",
    "",
    "```js",
    FIRST_EXAMPLE,
    "```",
    "",
    "## Load an app, send a request, replay its examples",
    "",
    "An app is one `.holo` file. The package ships a sample at `node_modules/prism-code/fixtures/Calculator.holo`. Save as `call.mjs` and run `node call.mjs`.",
    "",
    "```js",
    CALL_EXAMPLE,
    "```",
    "",
    "Expected output:",
    "",
    "```text",
    "Calculator true",
    '"1\\tok\\t42"',
    "22 of 22 examples replayed",
    "```",
    "",
    "Requests and responses are bytes. This app takes tab separated text: a leading `1`, the operation, then its arguments.",
    "",
    "## Command line",
    "",
    "```sh",
    "npx prism-code vectors <app.holo>          # replay every example, prints N of N vectors passed",
    "npx prism-code inspect <app.holo>          # identities, limits and provenance as JSON",
    "npx prism-code run <app.holo> --port 8080  # serve the app over HTTP",
    "```",
    "",
    "A running app takes a JSON intent, not raw bytes. `payload` is the request as text:",
    "",
    "```sh",
    `curl -s -X POST http://127.0.0.1:8080/_hologram/intent -H "content-type: application/json" --data '{"version":1,"name":"application.invoke","payload":"1\\tadd\\t20\\t22"}'`,
    "# {\"version\":1,\"outputs\":[\"1\\tok\\t42\"]}",
    "```",
    "",
    "`prism-code check`, `build` and `verify` run inside a pinned SDK image and need Docker. Skip them unless the user has Docker running.",
    "",
    "## Not shipped yet: do not run these",
    "",
    ...RELEASE_STATUS.filter((r) => /^not /i.test(r.status)).map((r) => `- ${r.item}: ${r.status.toLowerCase()}. ${r.note}.`),
    "- Any `@prism-code/*` package, including the MCP server the docs describe.",
    "- The Python package.",
    `- Anything on a docs page marked "Available in" a release later than ${SOURCE.npm}.`,
    "",
    "## Docs that apply today",
    "",
    `- [Release status](${ORIGIN}/docs/reference/release-status.md): what ships and when the rest lands.`,
    ...shippedPages().filter((p) => p.slug !== "reference/release-status").map((p) => `- [${p.title}](${ORIGIN}/docs/${p.slug}.md): ${p.summary}`),
    "",
    "## When something fails",
    "",
    `- Docs wrong or unclear: ${feedbackUrl("docs")}`,
    `- Works differently than documented: ${feedbackUrl("bug")}`,
    `- Need a capability in the SDK: search ${ORIGIN}/docs/requests.md first, then ${SDK_FEATURES}`,
    "",
    `Examples verified with prism-code ${VERIFIED_WITH}.`,
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
  return {
    ".well-known/agent-skills/index.json": skillIndexV2(),
    [`.well-known/agent-skills/${SKILL_NAME}/SKILL.md`]: md,
    ".well-known/skills/index.json": skillIndexV1(),
    [`.well-known/skills/${SKILL_NAME}/SKILL.md`]: md,
  };
}
