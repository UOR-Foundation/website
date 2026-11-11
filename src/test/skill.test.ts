import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  DISCOVERY_SCHEMA_V2, RETIRED_SKILL, SKILL_DESCRIPTION, SKILL_NAME, SKILL_RELEASE,
  skillFiles, skillIndexV1, skillIndexV2, skillMarkdown,
} from "@/agent/skill";
import { SKILL_INDEX, wellKnownJson } from "@/agent/site";
import { SOURCE } from "@/docs/content";
import { PRISM_SKILL } from "@/docs/prism.generated";

// The same rules the skills CLI (vercel-labs/skills, WellKnownProvider) applies before it installs.
const validName = (n: unknown) => typeof n === "string" && /^[a-z0-9-]{1,64}$/.test(n) && !n.startsWith("-") && !n.endsWith("-") && !n.includes("--");
const safePath = (p: unknown) => typeof p === "string" && p.length > 0 && !p.startsWith("/") && !p.startsWith("\\") && !p.includes("..") && !p.includes("\0");
const frontmatter = (md: string) => {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  return Object.fromEntries(m[1].split("\n").map((l) => { const i = l.indexOf(":"); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"(.*)"$/, "$1")]; }));
};

describe("agent skill discovery", () => {
  it("v2 index lists exactly one skill and passes the CLI's entry checks", () => {
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

  it("serves the skill bundled in the npm release the site states, byte for byte", () => {
    expect(SKILL_RELEASE).toBe(SOURCE.npm);
    expect(skillMarkdown()).toBe(PRISM_SKILL);
    expect(SKILL_NAME).toBe("prism");
  });

  it("keeps the retired prism-sdk skill out of both indexes", () => {
    expect(SKILL_NAME).not.toBe(RETIRED_SKILL);
    expect(skillIndexV2()).not.toContain(RETIRED_SKILL);
    expect(skillIndexV1()).not.toContain(RETIRED_SKILL);
    const stub = skillFiles()[`.well-known/agent-skills/${RETIRED_SKILL}/SKILL.md`];
    expect(stub).toContain("retired");
    expect(stub).toContain(`/.well-known/agent-skills/${SKILL_NAME}/SKILL.md`);
  });

  it("agents.json still advertises the install command and links the index", () => {
    const wk = JSON.parse(wellKnownJson());
    expect(wk.install.command).toBe("npx prism-code@latest setup");
    expect(wk.install.skill_index).toBe(`https://uor.foundation${SKILL_INDEX}`);
    expect(Object.keys(skillFiles())).toContain(SKILL_INDEX.slice(1));
  });
});
