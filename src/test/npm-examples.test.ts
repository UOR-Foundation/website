import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FIRST_EXAMPLE } from "@/agent/site";
import { SOURCE } from "@/docs/content";

// Runs the code the site shows against the prism-code release the site states (npm `latest` at the last sync),
// in a fresh project, the way a reader would. Needs network for npm install.
const MINUTE = 60_000;
let dir = "";

const runNode = (file: string, code: string) => {
  writeFileSync(join(dir, file), code);
  return spawnSync(process.execPath, [file], { cwd: dir, encoding: "utf8", timeout: MINUTE });
};

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "prism-site-"));
  writeFileSync(join(dir, "package.json"), '{ "private": true, "type": "module" }\n');
  const r = spawnSync(`npm install --no-audit --no-fund --save-exact prism-code@${SOURCE.npm}`, { cwd: dir, encoding: "utf8", shell: true, timeout: 3 * MINUTE });
  if (r.status !== 0) throw new Error(`npm install failed: ${r.stderr}`);
}, 4 * MINUTE);

afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe(`site examples run on prism-code ${SOURCE.npm}`, { timeout: MINUTE }, () => {
  it("the first example prints what its comment says", () => {
    const r = runNode("first.mjs", FIRST_EXAMPLE);
    expect(r.stderr).toBe("");
    expect(r.stdout).toBe("true false\n");
  });
});
