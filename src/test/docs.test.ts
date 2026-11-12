import { describe, it, expect } from "vitest";
import { TERMS, VERBS, MILESTONES, dockerMarkdown, roadmapJson } from "@/docs/vocabulary";
import { ALL_PAGES, DOCS_ASK, DOCS_HOME, RELEASE_STATUS, TABS, UPSTREAM_CHANGELOG, llmsTxt, navLabel, pageMarkdown, GOLDEN_PATH as GP } from "@/docs/content";

describe("Prism docs", () => {
  const text = (p: { title: string; summary: string; body: string }) => `${p.title} ${p.summary} ${p.body}`;
  it("describes Prism SDK v0.4 with the tested part versions", () => {
    expect(RELEASE_STATUS[0]).toMatchObject({ item: "Prism SDK", status: "v0.4" });
    expect(RELEASE_STATUS.find((r) => r.item === "prism-code")?.status).toBe("0.7.2");
    for (const p of ALL_PAGES) expect(text(p)).not.toMatch(/v1\.0|Coming in M\d/);
  });
  it("never suggests the unshipped prism command", () => {
    for (const p of ALL_PAGES) expect(p.body).not.toMatch(/(^|[`\s])prism (build|run|check|push|pull|init|inspect|verify|deploy|lock|update)\b/m);
  });
  it("drops capabilities the report did not verify", () => {
    for (const p of ALL_PAGES) expect(p.body).not.toMatch(/build --remote github|verify-attestation|prism-code (attest|export|dev|open)\b|--unstable-author/);
  });
  it("warns that hosted checks upload src/ readable by draft ID", () => {
    const setup = ALL_PAGES.find((p) => p.slug === "get-started/install")!;
    expect(setup.body).toContain("https://mcp.uor.foundation/");
    expect(setup.body).toMatch(/readable by anyone who has the draft's ID/);
  });
  it("explains that every app is P0 and the default policy needs P2", () => {
    const run = ALL_PAGES.find((p) => p.slug === "get-started/run")!;
    expect(run.body).toContain("policy default requires P2");
    expect(run.body).toContain('{"minimum":"P0"}');
  });
  it("lists the seven agent tools", () => {
    const tools = ALL_PAGES.find((p) => p.slug === "reference/agent-tools")!.body;
    for (const t of ["prism_start", "prism_spec", "prism_answer", "prism_try", "prism_prove", "prism_build", "prism_status"]) expect(tools).toContain(t);
  });
  it("puts the versions table on every page twin and links every llms entry to a page", () => {
    for (const p of ALL_PAGES) expect(pageMarkdown(p)).toContain("## Versions");
    const linked = [...llmsTxt().matchAll(/\/docs\/([^)#]+?)\.md\)/g)].map((m) => m[1]).filter((s) => s !== "changelog");
    for (const s of linked) expect(ALL_PAGES.map((p) => p.slug)).toContain(s);
    expect(UPSTREAM_CHANGELOG.slug).toBe("changelog");
  });
  it("only lists sections that have pages", () => {
    for (const t of TABS) expect(t.groups[0].pages.length).toBeGreaterThan(0);
    expect(TABS.map((t) => t.id)).toEqual(["get-started", "guides", "reference"]);
    expect(navLabel(ALL_PAGES.find((p) => p.slug === "reference/cli")!)).toBe("CLI");
  });
});

describe("Vocabulary", () => {
  it("maps holo to image and instance to container", () => {
    expect(TERMS.find((t) => t.prism === "holo")?.docker).toMatch(/^image/);
    expect(TERMS.find((t) => t.prism === "instance")?.docker).toBe("container");
  });
  it("calls the artifact an app, never a holo, in visible copy", () => {
    const HOLO = /(?<![\w./-])[Hh]olos?(?![\w/-])(?!\.[\w])/;
    const prose = (s: string) => {
      let fence = false;
      const kept = s.split("\n").filter((l) => {
        if (/^\s*(?:```|~~~)/.test(l)) { fence = !fence; return false; }
        return !fence;
      });
      return kept.join("\n").replace(/`[^`\n]*`/g, "");
    };
    for (const p of ALL_PAGES) {
      expect(prose(`${p.title} ${p.summary} ${p.body}`)).not.toMatch(HOLO);
      expect(navLabel(p)).not.toMatch(HOLO);
    }
    for (const s of [...DOCS_ASK.questions, ...DOCS_HOME.cards.map((c) => c.text), ...GP.map((g) => `${g.step} ${g.text}`)]) expect(s).not.toMatch(HOLO);
    expect(prose(llmsTxt())).not.toMatch(HOLO);
    expect(prose(llmsTxt())).toContain("Run");
  });
  it("keeps the container equivalence implicit: no Docker wording outside code spans", () => {
    for (const p of ALL_PAGES) expect(p.body.replace(/`[^`]*`/g, "").replace(/\]\([^)]*\)/g, "]()")).not.toMatch(/[Dd]ocker/);
    for (const p of ALL_PAGES) expect(`${p.title} ${p.summary}`).not.toMatch(/[Dd]ocker/);
  });
  it("lists every verb with an availability in coming-from-containers.md", () => {
    const md = dockerMarkdown();
    for (const v of VERBS) expect(md).toMatch(new RegExp(`prism ${v.prism.replace("/", "\\/")}\`[^\n]*\\| (M\\d+ v|Today)`));
  });
  it("puts run in M3 and check in M2", () => {
    expect(VERBS.find((v) => v.prism === "run")?.milestone?.code).toBe("M3");
    expect(VERBS.find((v) => v.prism === "check")?.milestone?.code).toBe("M2");
  });
  it("publishes the seven milestones", () => {
    expect(MILESTONES.length).toBe(7);
    expect(JSON.parse(roadmapJson()).milestones.map((m: { code: string }) => m.code)).toEqual(["M1", "M2", "M3", "M4", "M5", "M6", "M7"]);
  });
  it("opens Get started with the Why, How, What overview, then the steps", () => {
    expect(TABS[0].id).toBe("get-started");
    expect(TABS[0].groups.map((g) => g.label)).toEqual(["Overview", "Your first app"]);
    expect(TABS[0].groups[0].pages.map((p) => p.slug)).toEqual(["get-started/why-prism", "get-started/how-it-works", "get-started/what-you-can-build"]);
    expect(TABS[0].groups[1].pages[0].slug).toBe("get-started/install");
  });
});

import { GOLDEN_PATH, STEPS } from "@/docs/content";
describe("Golden path", () => {
  it("has five steps, each a page in Get started and llms.txt", () => {
    expect(GOLDEN_PATH.map((g) => g.step)).toEqual(["Set up", "Build", "Run", "Verify", "Share"]);
    for (const s of STEPS) { expect(ALL_PAGES.find((p) => p.slug === s.slug)?.tab).toBe("get-started"); expect(llmsTxt()).toContain(`/docs/${s.slug}.md`); }
  });
});
