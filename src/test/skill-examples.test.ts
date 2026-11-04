import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CALCULATOR, EXAMPLES, skillMarkdown } from "@/agent/skill";

// Runs every SKILL.md code block exactly as written, in a fresh project, the way an agent would.
// Needs network for npm install, bash and curl. Set SKILL_TEST_BASH if `bash` on PATH is not a POSIX bash.
const BASH = process.env.SKILL_TEST_BASH ?? "bash";
const MINUTE = 60_000;
let dir = "";

const sh = (script: string, cwd = dir, timeout = MINUTE) => spawnSync(BASH, ["-c", script], { cwd, encoding: "utf8", timeout });
const runNode = (file: string, code: string) => {
  writeFileSync(join(dir, file), code);
  return spawnSync(process.execPath, [file], { cwd: dir, encoding: "utf8", timeout: MINUTE });
};

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "prism-skill-"));
  writeFileSync(join(dir, "package.json"), '{ "private": true }\n');
  const r = sh(EXAMPLES.install.code, dir, 3 * MINUTE);
  if (r.status !== 0) throw new Error(`install block failed: ${r.stderr}`);
}, 4 * MINUTE);

afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe("SKILL.md examples run as written", { timeout: MINUTE }, () => {
  it("hash.mjs prints what the skill says", () => {
    const r = runNode(EXAMPLES.hash.file, EXAMPLES.hash.code);
    expect(r.stderr).toBe("");
    expect(r.stdout).toBe(EXAMPLES.hash.output);
  });

  it("call.mjs prints the stated output byte for byte", () => {
    const r = runNode(EXAMPLES.call.file, EXAMPLES.call.code);
    expect(r.stderr).toBe("");
    expect(r.stdout).toBe(EXAMPLES.call.output);
    expect(skillMarkdown()).toContain("```text\n" + EXAMPLES.call.output);
  });

  it("vectors.mjs prints the app's 22 examples", () => {
    const r = runNode(EXAMPLES.vectors.file, EXAMPLES.vectors.code);
    const lines = r.stdout.trimEnd().split("\n");
    expect(lines).toHaveLength(22);
    expect(lines.slice(0, 2)).toEqual(EXAMPLES.vectors.firstLines);
  });

  it("the command line block replays and inspects the sample", () => {
    const r = sh(EXAMPLES.cli.code);
    expect(r.status).toBe(0);
    const [summary, ...json] = r.stdout.split("\n");
    expect(summary).toMatch(/^22 of 22 vectors passed \(.+\)$/);
    const info = JSON.parse(json.join("\n"));
    expect(info.identities.verified).toBe(true);
    expect(info.identities.applicationKappa).toMatch(/^blake3:[0-9a-f]{64}$/);
  });

  it("serve, request and stop work as separate shells and free the port", async () => {
    // Each block runs in its own shell, as an agent whose shell keeps no variables would run them.
    try {
      const url = sh(EXAMPLES.serve.code).stdout.trim();
      expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
      const stated = EXAMPLES.request.code.split("\n").find((l) => l.startsWith("# "))!.slice(2);
      expect(sh(EXAMPLES.request.code).stdout).toBe(stated + "\n");
      expect(sh(EXAMPLES.stop.code).stdout).toBe("stopped\n");
      await expect(fetch(url)).rejects.toThrow();
      expect(existsSync(join(dir, "prism-server.pid"))).toBe(false);
    } finally {
      // Only matters when an assertion above failed before the stop block ran.
      if (existsSync(join(dir, "prism-server.pid"))) sh('kill "$(cat prism-server.pid)" 2>/dev/null; rm -f prism-server.pid');
    }
  }, 2 * MINUTE);

  it("the serve block gives up quickly when the server cannot start", () => {
    const empty = mkdtempSync(join(tmpdir(), "prism-skill-empty-"));
    try {
      const started = Date.now();
      const r = sh(EXAMPLES.serve.code, empty);
      expect(Date.now() - started).toBeLessThan(20_000);
      expect(r.stdout).toMatch(/^server did not start: /);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  }, MINUTE);
});

describe("SKILL.md claims hold for the pinned prism-code", { timeout: MINUTE }, () => {
  it("the lock gated commands fail as stated", () => {
    const message = "prismpm.lock not found in the current directory";
    expect(skillMarkdown()).toContain(`print \`${message}\` and exit with code 64`);
    for (const command of ["check", "build", "verify", "conformance"]) {
      const r = sh(`npx prism-code ${command}`);
      expect(r.status).toBe(64);
      expect(r.stderr.trim()).toBe(message);
    }
  }, 2 * MINUTE);

  it("codeHash, load and the Calculator contract behave as described", () => {
    const r = runNode("_claims.mjs", `
import { codeHash } from "prism-code/canonical";
import { load, compileGuest } from "prism-code";
import { readFileSync } from "node:fs";
// (module (import "a" "b" (func))): one import, which the Core-Wasm contract forbids.
const importing = new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,2,7,1,1,97,1,98,0,0]);
const refused = await compileGuest(importing).then(() => "accepted", (e) => e.code);
import { pathToFileURL } from "node:url";
const path = "./node_modules/prism-code/fixtures/Calculator.holo";
const app = await load(path);
const td = new TextDecoder(), te = new TextEncoder();
const fields = (v) => td.decode(v).split("\\t");
const ops = new Set(), errors = new Set();
for (const v of app.vectors) {
  const [, kind, reason] = fields(v.response);
  if (kind === "ok") ops.add(fields(v.request)[1]);
  else errors.add(reason);
}
const ask = async (s) => fields(await app.dispatch(te.encode(s)))[2];
console.log(JSON.stringify({
  ops: [...ops].sort(), errors: [...errors].sort(),
  emptyHash: codeHash("") === codeHash("\\n\\n") && codeHash("").endsWith("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"),
  trailingNewline: await ask("1\\tadd\\t1\\t2\\n"),
  refused,
  divideTowardZero:[await ask("1\\tdivide\\t-7\\t2"), await ask("1\\tdivide\\t7\\t2")],
  fileUrl: (await load(pathToFileURL(path))).name,
  bytes: (await load(new Uint8Array(readFileSync(path)))).name,
  identityPrefixes: Object.entries(app.identities).filter(([, v]) => typeof v === "string").map(([k, v]) => k + "=" + v.split(":")[0].length),
}));`);
    expect(r.stderr).toBe("");
    const out = JSON.parse(r.stdout);
    expect(out.ops).toEqual([...CALCULATOR.operations].sort());
    expect(out.errors).toEqual([...CALCULATOR.errors].sort());
    expect(out.emptyHash).toBe(true);
    expect(out.trailingNewline).toBe("malformed-request");
    expect(skillMarkdown()).toContain("`divide` rounds toward zero");
    expect(out.divideTowardZero).toEqual(["-3", "3"]);
    expect(skillMarkdown()).toContain("`load` refuses code that does");
    expect(out.refused).toBe("core.imports");
    expect(out.fileUrl).toBe("Calculator");
    expect(out.bytes).toBe("Calculator");
    // Bare hex has no ":", so its "prefix" is the whole 64 character value.
    expect(out.identityPrefixes).toEqual(expect.arrayContaining(["archiveFingerprint=64", "footer=64", "applicationKappa=6"]));
  }, MINUTE);
});
