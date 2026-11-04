import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  DISCOVERY_SCHEMA_V2, SKILL_DESCRIPTION, SKILL_NAME, VERIFIED_WITH,
  compareRelease, skillFiles, skillIndexV1, skillIndexV2, skillMarkdown,
} from "@/agent/skill";
import { SKILL_INDEX, wellKnownJson } from "@/agent/site";
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
    expect(idx.skills).toHaveLength(1);
    const e = idx.skills[0];
    expect(validName(e.name)).toBe(true);
    expect(e.description.length).toBeGreaterThan(0);
    expect(e.description.length).toBeLessThanOrEqual(1024);
    expect(e.type).toBe("skill-md");
    expect(new URL(e.url, "https://uor.foundation/.well-known/agent-skills/index.json").pathname).toBe(`/.well-known/agent-skills/${SKILL_NAME}/SKILL.md`);
    expect(e.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
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
