import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  CALCULATOR, DISCOVERY_SCHEMA_V2, EXAMPLES, SKILL_DESCRIPTION, SKILL_NAME, VERIFIED_WITH,
  compareRelease, skillFiles, skillIndexV1, skillIndexV2, skillMarkdown,
} from "@/agent/skill";
import { CLIENT_CONFIG, LEXLEAN_SKILL_DESCRIPTION, LEXLEAN_SKILL_NAME, MINIMAL_MODULE, lexleanSkillMarkdown } from "@/agent/lexlean-mcp-skill";
import { MCP, SKILL_INDEX, agentsMarkdown, frontDoor, wellKnownJson } from "@/agent/site";
import { SOURCE } from "@/docs/content";

// The same rules the skills CLI (vercel-labs/skills, WellKnownProvider) applies before it installs.
const validName = (n: unknown) => typeof n === "string" && /^[a-z0-9-]{1,64}$/.test(n) && !n.startsWith("-") && !n.endsWith("-") && !n.includes("--");
const safePath = (p: unknown) => typeof p === "string" && p.length > 0 && !p.startsWith("/") && !p.startsWith("\\") && !p.includes("..") && !p.includes("\0");
const frontmatter = (md: string) => {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  return Object.fromEntries(m[1].split("\n").map((l) => { const i = l.indexOf(":"); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"(.*)"$/, "$1")]; }));
};

describe("agent skill discovery", () => {
  it("v2 index passes the CLI's entry checks", () => {
    const idx = JSON.parse(skillIndexV2());
    expect(idx.$schema).toBe(DISCOVERY_SCHEMA_V2);
    expect(idx.skills).toHaveLength(2);
    for (const e of idx.skills) {
      expect(validName(e.name)).toBe(true);
      expect(e.description.length).toBeGreaterThan(0);
      expect(e.description.length).toBeLessThanOrEqual(1024);
      expect(e.type).toBe("skill-md");
      expect(new URL(e.url, "https://uor.foundation/.well-known/agent-skills/index.json").pathname).toBe(`/.well-known/agent-skills/${e.name}/SKILL.md`);
      expect(e.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    }
    // The deploy reads the Prism skill's digest first; see skills() in src/agent/skill.ts.
    expect(idx.skills[0].name).toBe(SKILL_NAME);
    expect(idx.skills[1].name).toBe(LEXLEAN_SKILL_NAME);
  });

  it("v2 digest is the SHA-256 of the exact SKILL.md bytes", () => {
    const expected = "sha256:" + createHash("sha256").update(Buffer.from(skillMarkdown(), "utf8")).digest("hex");
    expect(JSON.parse(skillIndexV2()).skills[0].digest).toBe(expected);
  });

  it("v1 index passes the legacy checks", () => {
    const idx = JSON.parse(skillIndexV1());
    expect(idx.$schema).toBeUndefined();
    for (const e of idx.skills) {
      expect(validName(e.name)).toBe(true);
      expect(e.description).toBeTruthy();
      expect(e.files.length).toBeGreaterThan(0);
      expect(e.files.every(safePath)).toBe(true);
      expect(e.files.some((f: string) => f.toLowerCase() === "skill.md")).toBe(true);
    }
  });

  it("SKILL.md frontmatter matches the index entries", () => {
    const fm = frontmatter(skillMarkdown());
    expect(fm).not.toBeNull();
    expect(fm!.name).toBe(SKILL_NAME);
    expect(fm!.description).toBe(SKILL_DESCRIPTION);
    expect(JSON.parse(skillIndexV1()).skills[0].description).toBe(SKILL_DESCRIPTION);
  });

  it("both well-known paths serve identical bytes", () => {
    const f = skillFiles();
    expect(f[`.well-known/agent-skills/${SKILL_NAME}/SKILL.md`]).toBe(f[`.well-known/skills/${SKILL_NAME}/SKILL.md`]);
  });

  it("gives no runnable command for unshipped features", () => {
    const md = skillMarkdown();
    expect(md).not.toMatch(/npx @prism-code\//);
    expect(md).not.toMatch(/^\s*prism\s/m);
    expect(md).not.toMatch(/cargo add prism|pip install prism/);
  });

  it("states the prerequisites of the image backed commands", () => {
    const md = skillMarkdown();
    expect(md).toContain("prismpm.lock");
    expect(md).toMatch(/exit with code 64/);
    expect(md).toMatch(/do not run these commands/);
  });

  it("shows how to stop a served app and check the port", () => {
    const md = skillMarkdown();
    expect(md).toMatch(/^node node_modules\/prism-code\/bin\/prism-code\.mjs run .+ &$/m);
    // The PID lives in a file, so the stop block works from a shell that did not start the server.
    expect(md).toMatch(/^echo \$! > prism-server\.pid$/m);
    expect(md).toMatch(/^kill "\$\(cat prism-server\.pid\)"$/m);
    // Every wait is bounded and watches the server process, so a failed start cannot hang an agent.
    expect(md).toMatch(/^for i in \$\(seq \d+\); do .*kill -0 .*; done$/m);
    expect(md).not.toMatch(/^until /m);
    // No fixed port: the server picks a free one and the agent reads the URL it prints.
    expect(md).not.toMatch(/--port \d/);
  });

  it("says what codeHash returns and how it differs from app identities", () => {
    const md = skillMarkdown();
    expect(md).toContain("`sha256:` plus 64 hex characters");
    expect(md).toContain("app.identities");
    expect(md).toContain("blake3:");
    expect(md).not.toMatch(/each `blake3:`/);
    expect(md).toContain("Pin an app by `applicationKappa`");
  });

  it("states the sample app's request contract and how to read any app's", () => {
    const md = skillMarkdown();
    for (const op of CALCULATOR.operations) expect(md).toContain(`\`${op}\``);
    for (const reason of CALCULATOR.errors) expect(md).toContain(`\`${reason}\``);
    expect(md).toContain("no trailing newline");
    expect(md).toContain("app.vectors");
  });

  it("names a substitute for everything that cannot be done today", () => {
    const md = skillMarkdown();
    expect(md).toMatch(/^\| Check an app's proof \| Not possible in this release/m);
    expect(md).toMatch(/^\| Build or author a new app \| Needs a `prismpm.lock`/m);
    expect(md).toMatch(/^\| Call an app from Python, Rust or another language \| Serve it/m);
    expect(md).toMatch(/^\| Call an app from an MCP client \| No Prism MCP server ships/m);
  });

  it("lists unshipped packages from the release status table", () => {
    const md = skillMarkdown();
    expect(md).toMatch(/^- Python package: not published\. .*1\.1\.$/m);
    expect(md).toMatch(/^- Rust crates: not published\. .*1\.0-beta\.1\.$/m);
  });

  it("pins the install and has no placeholders in shell blocks", () => {
    const md = skillMarkdown();
    expect(md).toContain(`npm install --save-exact prism-code@${VERIFIED_WITH}`);
    const sh = [...md.matchAll(/```sh\n([\s\S]*?)```/g)].map((m) => m[1]).join("\n");
    expect(sh).not.toMatch(/<[\w.-]+>/);
  });

  it("every runnable block is one the examples test executes", () => {
    const blocks = [...skillMarkdown().matchAll(/^```(\w+)\n([\s\S]*?)\n```$/gm)]
      .filter((m) => m[1] !== "text").map((m) => m[2]);
    expect(blocks.sort()).toEqual(Object.values(EXAMPLES).map((e) => e.code).sort());
  });

  it("never ends a bare URL with sentence punctuation", () => {
    // A bare URL runs to the next space or ")"; punctuation glued to its end gets copied into the link.
    const prose = skillMarkdown().replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
    expect(prose).not.toMatch(/https?:\/\/[^\s)]+[.,;:](\s|$)/m);
  });

  it("links only docs pages that ship in the npm release", () => {
    const links = [...skillMarkdown().matchAll(/\/docs\/([^)\s]+)\.md\)/g)].map((m) => m[1]);
    expect(links).toContain("reference/release-status");
    expect(links.length).toBeGreaterThan(1);
  });

  it("examples were verified against the release npm ships today", () => {
    // Fails when the docs sync moves to a new prism-code. Re-run the SKILL.md examples, then bump VERIFIED_WITH.
    expect(SOURCE.npm).toBe(VERIFIED_WITH);
  });

  it("orders releases the way the docs label them", () => {
    expect(compareRelease("0.2.0", "0.2.0")).toBe(0);
    expect(compareRelease("0.2.0", "0.5")).toBe(-1);
    expect(compareRelease("1.0-beta", "1.0")).toBe(-1);
    expect(compareRelease("1.0", "0.6")).toBe(1);
  });

  it("agents.json still advertises the install command and links the index", () => {
    const wk = JSON.parse(wellKnownJson());
    expect(wk.install.skill).toBe("npx skills add https://uor.foundation");
    expect(wk.install.skill_index).toBe(`https://uor.foundation${SKILL_INDEX}`);
    expect(Object.keys(skillFiles())).toContain(SKILL_INDEX.slice(1));
  });
});

describe("lexlean-mcp skill", () => {
  const md = lexleanSkillMarkdown();

  it("is listed second in both indexes with its own digest and identical bytes on both paths", () => {
    const v2 = JSON.parse(skillIndexV2()).skills[1];
    expect(v2.name).toBe(LEXLEAN_SKILL_NAME);
    expect(v2.digest).toBe("sha256:" + createHash("sha256").update(Buffer.from(md, "utf8")).digest("hex"));
    expect(JSON.parse(skillIndexV1()).skills[1]).toEqual({ name: LEXLEAN_SKILL_NAME, description: LEXLEAN_SKILL_DESCRIPTION, files: ["SKILL.md"] });
    const f = skillFiles();
    expect(f[`.well-known/agent-skills/${LEXLEAN_SKILL_NAME}/SKILL.md`]).toBe(md);
    expect(f[`.well-known/skills/${LEXLEAN_SKILL_NAME}/SKILL.md`]).toBe(md);
  });

  it("frontmatter matches the index entry and names the endpoint", () => {
    const fm = frontmatter(md);
    expect(fm!.name).toBe(LEXLEAN_SKILL_NAME);
    expect(fm!.description).toBe(LEXLEAN_SKILL_DESCRIPTION);
    expect(fm!.description).toContain(MCP.url);
    expect(validName(fm!.name)).toBe(true);
  });

  it("teaches the whole loop in order, with a client config and a module that checks", () => {
    const headings = [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    expect(headings).toEqual(["Connect", "1. Pick a profile", "2. Find the words before you write", "3. Write a draft", "4. Check, read, fix", "5. Verify", "6. Present and share", "Failures", "Not here", "When something fails"]);
    expect(md).toContain("```json\n" + CLIENT_CONFIG + "\n```");
    expect(JSON.parse(CLIENT_CONFIG).mcpServers.lexlean.url).toBe(MCP.url);
    expect(md).toContain("```latex\n" + MINIMAL_MODULE + "\n```");
    for (const tool of ["lexlean_profiles", "lexlean_lexicon_search", "lexlean_draft_write", "lexlean_check", "lexlean_explain", "lexlean_verify", "lexlean_verify_control", "lexlean_present", "lexlean_attestation", "lexlean_export"]) {
      expect(md).toMatch(new RegExp(`\\b${tool}\\b`));
    }
  });

  it("promises no token and no Prism build, and sends failures to the server's repository", () => {
    expect(md).toContain("No token, no account.");
    expect(md).not.toMatch(/Authorization|Bearer/);
    expect(md).toContain("It does not build a Prism app");
    expect(md).toContain("https://github.com/UOR-Foundation/lexlean-mcp/issues");
  });

  it("never ends a bare URL with sentence punctuation", () => {
    const prose = md.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
    expect(prose).not.toMatch(/https?:\/\/[^\s)]+[.,;:](\s|$)/m);
  });

  it("the agent manual, front door and agents.json point at the live server", () => {
    expect(agentsMarkdown()).toContain(MCP.url);
    expect(agentsMarkdown()).not.toContain("There is no remote API or MCP server yet");
    expect(frontDoor("# D\n", "")).toContain(MCP.url);
    const wk = JSON.parse(wellKnownJson());
    expect(wk.mcp).toEqual({ name: MCP.name, url: MCP.url, transport: MCP.transport, auth: "none", skill: LEXLEAN_SKILL_NAME });
  });
});
