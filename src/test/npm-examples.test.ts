import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FIRST_EXAMPLE } from "@/agent/site";
import { SOURCE } from "@/docs/content";
import { createProject, EXAMPLES as PLAYGROUND } from "@/playground/project";
import { HOW, WHAT } from "@/framework/content";

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

  it("codeHash does what the framework page says and no more", () => {
    expect(HOW.steps[0].tech).toContain("normalizes only line endings, a leading BOM and trailing whitespace");
    expect(WHAT.outputs.find((o) => o.t === "Routable address")?.b).toMatch(/^Planned/);
    const r = runNode("claims.mjs", `import * as c from "prism-code/canonical";
console.log(JSON.stringify({
  keyOrder: c.codeHash('{"a":1,"b":2}') === c.codeHash('{"b":2,"a":1}'),
  whitespace: c.codeHash("x\\r\\n") === c.codeHash("x  \\n"),
  exports: Object.keys(c).sort(),
}));`);
    expect(r.stderr).toBe("");
    const out = JSON.parse(r.stdout);
    expect(out.keyOrder).toBe(false);
    expect(out.whitespace).toBe(true);
    // An address, CID or IPv6 export here means the framework page can say it ships.
    expect(out.exports.filter((k: string) => /addr|cid|ipv6|word/i.test(k))).toEqual([]);
  });

  it("the playground pins this release and every example runs on it without warnings", () => {
    expect(JSON.parse(createProject()["package.json"]).dependencies["prism-code"]).toBe(SOURCE.npm);
    for (const example of PLAYGROUND) {
      const r = runNode(`${example.id}.mjs`, example.source);
      expect(r.stderr, example.id).toBe("");
      expect(r.status, example.id).toBe(0);
    }
  });
});
