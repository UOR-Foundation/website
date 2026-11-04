// The prism-sdk agent skill, served for `npx skills add https://uor.foundation`.
// The skills CLI reads /.well-known/agent-skills/index.json (v2, digest checked) first,
// then /.well-known/skills/index.json (v1). Both point at the same SKILL.md bytes.
// Every code block below is executed by src/test/skill-examples.test.ts against prism-code VERIFIED_WITH.
// Build and test only: uses node:crypto, so browser code must not import this file.
import { createHash } from "node:crypto";
import { ALL_PAGES, DOCUMENTED_API, RELEASE_STATUS, SOURCE } from "../docs/content";
import { FIRST_EXAMPLE, ORIGIN, SDK_FEATURES, feedbackUrl } from "./site";
import { NEW_APP_PATH, NEW_APP_SKILL_DESCRIPTION, NEW_APP_SKILL_NAME, newAppSkillMarkdown } from "./newApp";

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

/** The sample app's request contract. The examples test checks it against the fixture's own vectors. */
export const CALCULATOR = {
  operations: ["add", "subtract", "multiply", "divide"],
  errors: ["overflow", "division-by-zero", "malformed-request", "unsupported-version", "unknown-operation"],
};

const APP = "APP=node_modules/prism-code/fixtures/Calculator.holo";
const URL_FROM_LOG = 'URL=$(grep -o "http://[^ ]*" prism-server.log)';
const INTENT ='{"version":1,"name":"application.invoke","payload":"1\\tadd\\t20\\t22"}';

/** Every runnable block in SKILL.md. The test runs each one and checks the stated output. */
export const EXAMPLES = {
  install: { lang: "sh", code: `npm install --save-exact prism-code@${VERIFIED_WITH}` },
  hash: { lang: "js", file: "hash.mjs", code: FIRST_EXAMPLE, output: "true false\n" },
  call: {
    lang: "js",
    file: "call.mjs",
    code: `import { load } from "prism-code";

const app = await load("./node_modules/prism-code/fixtures/Calculator.holo");
console.log(app.name, app.identities.verified);

const response = await app.dispatch(new TextEncoder().encode("1\\tadd\\t20\\t22"));
console.log(JSON.stringify(new TextDecoder().decode(response)));

const result = await app.acceptance();
console.log(result.passed, "of", result.total, "examples replayed");`,
    output: 'Calculator true\n"1\\tok\\t42"\n22 of 22 examples replayed\n',
  },
  vectors: {
    lang: "js",
    file: "vectors.mjs",
    code: `import { load } from "prism-code";

const app = await load("./node_modules/prism-code/fixtures/Calculator.holo");
const text = (bytes) => JSON.stringify(new TextDecoder().decode(bytes));
for (const v of app.vectors) console.log(text(v.request), "->", text(v.response));`,
    firstLines: ['"1\\tadd\\t0\\t0" -> "1\\tok\\t0"', '"1\\tadd\\t20\\t22" -> "1\\tok\\t42"'],
  },
  cli: {
    lang: "sh",
    code: [
      APP,
      'npx prism-code vectors "$APP"  # replay every example: 22 of 22 vectors passed (...)',
      'npx prism-code inspect "$APP"  # identities, limits, provenance and view files as JSON',
    ].join("\n"),
  },
  serve: {
    lang: "sh",
    code: [
      APP,
      'node node_modules/prism-code/bin/prism-code.mjs run "$APP" > prism-server.log 2>&1 &',
      "echo $! > prism-server.pid",
      'for i in $(seq 50); do grep -q " at http" prism-server.log && break; kill -0 "$(cat prism-server.pid)" 2>/dev/null || break; sleep 0.2; done',
      'grep -o "http://[^ ]*" prism-server.log || echo "server did not start: $(cat prism-server.log)"',
    ].join("\n"),
  },
  request: {
    lang: "sh",
    code: [
      URL_FROM_LOG,
      `curl -s -X POST "\${URL}_hologram/intent" -H "content-type: application/json" --data '${INTENT}'; echo`,
      '# {"version":1,"outputs":["1\\tok\\t42"]}',
    ].join("\n"),
  },
  stop: {
    lang: "sh",
    code: [
      URL_FROM_LOG,
      'kill "$(cat prism-server.pid)"',
      'for i in $(seq 25); do curl -s -o /dev/null "$URL" || break; sleep 0.2; done',
      'if curl -s -o /dev/null "$URL"; then echo "still running"; else echo "stopped"; rm -f prism-server.pid prism-server.log; fi',
    ].join("\n"),
  },
} as const;

const fence = (e: { lang: string; code: string }) => ["```" + e.lang, e.code, "```"];

/** Rows of the release-status page's generated distribution table that are not out yet. */
function notShipped() {
  const body = ALL_PAGES.find((p) => p.slug === "reference/release-status")?.body ?? "";
  const table = body.match(/<!-- generated:distribution:begin -->([\s\S]*?)<!-- generated:distribution:end -->/)?.[1] ?? "";
  const rows = table.split("\n").filter((l) => l.startsWith("|")).slice(2)
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
    .filter((r) => r.length >= 3 && /^not /i.test(r[1]));
  if (rows.length) return rows.map(([what, today, note]) => `- ${what}: ${today}. ${note.replace(/\.$/, "")}.`);
  return RELEASE_STATUS.filter((r) => /^not /i.test(r.status)).map((r) => `- ${r.item}: ${r.status.toLowerCase()}. ${r.note}.`);
}

export function skillMarkdown() {
  const E = EXAMPLES;
  const ops = CALCULATOR.operations.map((o) => `\`${o}\``);
  const errors = CALCULATOR.errors.map((o) => `\`${o}\``);
  const list = (xs: string[]) => `${xs.slice(0, -1).join(", ")} or ${xs[xs.length - 1]}`;
  return [
    "---",
    `name: ${SKILL_NAME}`,
    `description: "${SKILL_DESCRIPTION}"`,
    "---",
    "",
    "# Prism SDK",
    "",
    `Prism gives data and apps an identity computed from their bytes, so anyone can check a result without trusting where it came from. This skill covers prism-code ${SOURCE.npm}, the release on npm today. The docs at ${ORIGIN}/docs/ describe the planned ${DOCUMENTED_API} API, and most of it is not published yet. When the two disagree, trust this file and the [release status](${ORIGIN}/docs/reference/release-status.md) page.`,
    "",
    "## What you can do today",
    "",
    "| Task | Use |",
    "| --- | --- |",
    "| Identify text such as source code | `codeHash(text)` from `prism-code/canonical` |",
    "| Identify an app | `app.identities.applicationKappa` |",
    "| Identify any other file, such as a binary | SHA-256 of its raw bytes, for example `sha256sum <file>`. prism-code has no function for this |",
    "| Load an app, send it requests, replay its examples | `load`, `app.dispatch` and `app.acceptance` |",
    "| Check that an app file is intact | `npx prism-code inspect`: its `verified` and `consistent` fields |",
    "| Check an app's proof | Not possible in this release. Say so, and report `inspect` and `vectors` results instead |",
    "| Judge the risk of running an app | Its WebAssembly code may import nothing, and `load` refuses code that does, so it cannot reach files, network or the host. `prism-code run` also serves the app's own web page, which is not sandboxed |",
    `| Build or author a new app | Read the prism-new-app skill at \`${ORIGIN}${NEW_APP_PATH}\`. It creates the repository from the template, writes and proves the model through the UOR MCP server, and publishes the app. Do not hand craft a \`.holo\` |`,
    "| Call an app from Python, Rust or another language | Serve it and post to its HTTP endpoint, see below. No Python or Rust package exists yet |",
    "| Call an app from an MCP client | No Prism MCP server ships. Wrap `load` and `dispatch` in your own MCP tool |",
    "",
    "## Install",
    "",
    "Node 22 or later. The API is Experimental, so pin the exact version.",
    "",
    ...fence(E.install),
    "",
    "## Hash content",
    "",
    `Save as \`${E.hash.file}\` and run \`node ${E.hash.file}\`. It prints \`${E.hash.output.trim()}\`.`,
    "",
    ...fence(E.hash),
    "",
    "`codeHash(text)` returns `sha256:` plus 64 hex characters: the SHA-256 of the text after normalizing line endings to `\\n`, dropping a leading BOM, trimming trailing spaces and tabs on each line, collapsing trailing blank lines and ending it with exactly one newline. Empty or blank only text canonicalizes to the empty string, so it hashes as `sha256:` plus the SHA-256 of zero bytes. Use it for text, not for binary files. It is not an app's identity: a loaded app carries its own in `app.identities`. Pin an app by `applicationKappa`, which is `blake3:` plus hex. `archiveFingerprint` and `footer` are bare hex. `identities.consistent` is true when the manifest and provenance name the same code, view and capability blobs. `identities.verified` is true when that holds and the footer digest and every blob label also check out.",
    "",
    "## Load an app, send a request, replay its examples",
    "",
    `An app is one \`.holo\` file. The package ships a sample at \`node_modules/prism-code/fixtures/Calculator.holo\`. In Node, \`load()\` takes a path, a \`file:\` URL or bytes. For an \`https:\` URL, fetch the bytes first and pass them in. Save as \`${E.call.file}\` and run \`node ${E.call.file}\`.`,
    "",
    ...fence(E.call),
    "",
    "Expected output:",
    "",
    "```text",
    E.call.output.trimEnd(),
    "```",
    "",
    `Requests and responses are bytes. This app takes tab separated text with no trailing newline: a leading \`1\`, the operation (${list(ops)}), then two signed 64 bit integers written without a leading \`+\` or zeros. \`divide\` rounds toward zero. Build requests from strings, not JavaScript numbers, which lose precision above 2^53. Errors are normal responses shaped \`1\\terror\\t<reason>\`, where the reason is ${list(errors)}. \`dispatch\` throws only when the request is not bytes or is larger than \`app.limits.guestAllocation\`.`,
    "",
    `Every app carries examples of its own requests and responses in \`app.vectors\`. To learn an app's request format, print them. Save as \`${E.vectors.file}\` and run \`node ${E.vectors.file}\`. For the sample it prints 22 lines, starting with \`${E.vectors.firstLines[0]}\`.`,
    "",
    ...fence(E.vectors),
    "",
    "## Command line",
    "",
    ...fence(E.cli),
    "",
    "### Serve an app and call it",
    "",
    "`npx prism-code run \"$APP\"` serves the app over HTTP in the foreground. Stop it with Ctrl+C. From a script or an agent shell, start node directly so `$!` is the server process, because killing an `npx` wrapper can leave the server running. Without `--port` it takes a free port and prints its URL. Each block below stands alone, because many agent shells do not keep variables between commands: the process ID goes to `prism-server.pid` and the URL is read back from `prism-server.log`.",
    "",
    ...fence(E.serve),
    "",
    "A running app takes a JSON intent, not raw bytes. `payload` is the request as text. The status is 200 even when the app answers with an error, and 400 with an `error` field when the intent itself is malformed. This endpoint is how Python, Rust or any other language calls an app today.",
    "",
    ...fence(E.request),
    "",
    "Stop it, then confirm it stopped:",
    "",
    ...fence(E.stop),
    "",
    "### Commands that need a Prism project",
    "",
    "`prism-code check`, `build`, `verify` and `conformance` run `prismpm` inside the digest pinned SDK image named by a `prismpm.lock` file in the current directory. They need both Docker and that file. Without the file they print `prismpm.lock not found in the current directory` and exit with code 64. prism-code cannot create the file, so this release cannot build a new app or check an app's proof on its own. A new project starts from the [UOR-Foundation/template](https://github.com/UOR-Foundation/template) repository, which carries a `prismpm.lock` and documents how to write an app; building it pulls the SDK image, so ask before doing that. If the user has no `prismpm.lock`, say so and do not run these commands, not even to confirm the error. The nearest check available is `npx prism-code inspect`: its `verified` and `consistent` fields cover the file's internal digests, not a proof.",
    "",
    "## Not shipped yet: do not run these",
    "",
    ...notShipped(),
    "- The MCP server the docs describe.",
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

/** The skills this site publishes, in index order: prism-sdk first, then prism-new-app. */
const SKILLS = () => [
  { name: SKILL_NAME, description: SKILL_DESCRIPTION, markdown: skillMarkdown() },
  { name: NEW_APP_SKILL_NAME, description: NEW_APP_SKILL_DESCRIPTION, markdown: newAppSkillMarkdown() },
];

/** v2 discovery index for /.well-known/agent-skills/index.json. */
export function skillIndexV2() {
  return JSON.stringify({
    $schema: DISCOVERY_SCHEMA_V2,
    skills: SKILLS().map((s) => ({ name: s.name, description: s.description, type: "skill-md", url: `${s.name}/SKILL.md`, digest: sha256(s.markdown) })),
  }, null, 2) + "\n";
}

/** v1 discovery index for /.well-known/skills/index.json, read by older CLIs. */
export function skillIndexV1() {
  return JSON.stringify({ skills: SKILLS().map((s) => ({ name: s.name, description: s.description, files: ["SKILL.md"] })) }, null, 2) + "\n";
}

/** Every file the skills need, keyed by published path. */
export function skillFiles(): Record<string, string> {
  const out: Record<string, string> = {
    ".well-known/agent-skills/index.json": skillIndexV2(),
    ".well-known/skills/index.json": skillIndexV1(),
  };
  for (const s of SKILLS()) {
    out[`.well-known/agent-skills/${s.name}/SKILL.md`] = s.markdown;
    out[`.well-known/skills/${s.name}/SKILL.md`] = s.markdown;
  }
  // One hop from the site root: the new-app skill is also the page /new.md.
  out[NEW_APP_PATH.slice(1)] = newAppSkillMarkdown();
  return out;
}
