import { describe, it, expect } from "vitest";
import { TERMS, VERBS, MILESTONES, dockerMarkdown, roadmapJson } from "@/docs/vocabulary";
import { ALL_PAGES, DOCS_ASK, DOCS_HOME, RELEASE_STATUS, SOURCE, TABS, UPSTREAM_CHANGELOG, UPSTREAM_LLMS, llmsTxt, navLabel, pageMarkdown } from "@/docs/content";

describe("Prism docs", () => {
  it("imports the upstream pages, not the old placeholders", () => {
    const refs = ALL_PAGES.filter((p) => /^(api|reference)\b/.test(p.slug) && p.slug !== "reference/vocabulary");
    expect(refs.length).toBeGreaterThan(18);
    const slugs = ALL_PAGES.map((p) => p.slug);
    for (const old of ["api/code-hash", "api/describe", "api/canonicalize", "api/differs"]) expect(slugs).not.toContain(old);
    expect(slugs).toEqual(expect.arrayContaining(["api", "api/load", "api/dispatch", "reference/cli", "reference/policy", "reference/release-status"]));
    for (const t of TABS) expect(["get-started", "guides", "reference"]).toContain(t.id);
    expect(TABS.map((t) => t.id)).not.toContain("manuals");
  });

  it("states the documented v1.0 API against the published prism-code version", () => {
    expect(RELEASE_STATUS.find((r) => r.item === "Documented API")?.status).toBe("v1.0");
    expect(RELEASE_STATUS.find((r) => r.item === "prism-code on npm")?.status).toBe(SOURCE.npm);
  });

  it("puts the release status on every page twin", () => {
    for (const p of ALL_PAGES) expect(pageMarkdown(p)).toContain("## Release status");
  });

  it("resolves every link in the upstream llms.txt to a page", () => {
    const linked = [...UPSTREAM_LLMS.matchAll(/\/docs\/([^)#]+?)\)/g)].map((m) => m[1]).filter((s) => s !== "llms-full.md"); // emitted as /docs/llms-full.md
    const changelog = linked.indexOf("changelog");
    expect(changelog).toBeGreaterThan(-1); // served from UPSTREAM_CHANGELOG, outside the tabs
    const pages = linked.filter((_, i) => i !== changelog);
    expect(pages.length).toBeGreaterThan(0);
    for (const s of pages) expect(ALL_PAGES.map((p) => p.slug)).toContain(s);
    expect(UPSTREAM_CHANGELOG?.slug).toBe("changelog");
  });

  it("shows available_in on a page twin when upstream sets it", () => {
    const p = { ...ALL_PAGES[0], availableIn: "prism-code 1.0" };
    expect(pageMarkdown(p)).toContain("Available in: prism-code 1.0");
  });

  it("only lists sections that have pages", () => {
    for (const t of TABS) expect(t.groups[0].pages.length).toBeGreaterThan(0);
  });

  it("comes from PrismPM", () => {
    expect(SOURCE.repo).toBe("UOR-Foundation/PrismPM");
    expect(["docs-site", "main"]).toContain(SOURCE.branch);
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
    for (const s of [...DOCS_ASK.questions, ...DOCS_HOME.cards.map((c) => c.text), ...GOLDEN_PATH.map((g) => `${g.step} ${g.text}`), ...PLANNED.map((f) => f.label)]) expect(s).not.toMatch(HOLO);
    expect(prose(llmsTxt())).not.toMatch(HOLO);
    expect(prose(llmsTxt())).toContain("Load an app");
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
    expect(TABS[0].groups.map((g) => g.label)).toEqual(["Overview", "Your first app", "Orientation"]);
    expect(TABS[0].groups[0].pages.map((p) => p.slug)).toEqual(["get-started/why-prism", "get-started/how-it-works", "get-started/what-you-can-build"]);
    expect(TABS[0].groups[1].pages[0].slug).toBe("get-started/install");
  });
});

import { GOLDEN_PATH, PLANNED } from "@/docs/content";
import { verbMilestone } from "@/docs/vocabulary";
describe("Golden path", () => {
  it("resolves every step to a page or a milestone", () => {
    for (const g of GOLDEN_PATH) expect(g.slug ? ALL_PAGES.some((p) => p.slug === g.slug) : !!verbMilestone(g.verb!)).toBe(true);
  });
  it("never lists features that are off the roadmap", () => {
    for (const f of PLANNED) expect(f.milestone).toBeTruthy();
    expect(PLANNED.map((f) => f.verb)).not.toEqual(expect.arrayContaining(["compose"]));
  });
  it("groups Reference by kind, with no task groups, and no milestone entries", () => {
    const ref = TABS.find((t) => t.id === "reference")!;
    expect(ref.groups[0].label).toBe("API");
    expect(ref.groups.some((g) => ["Run", "Verify", "Build", "Share"].includes(g.label))).toBe(false);
    expect(ref.groups.every((g) => !g.planned?.length)).toBe(true);
  });
});

import { STEPS, ALL_PAGES as STEP_PAGES, llmsTxt as stepLlms } from "@/docs/content";
describe("get started steps", () => {
  it("follows the container order", () => {
    expect(STEPS.map((s) => s.title)).toEqual(["Set up", "Build", "Run", "Verify", "Share"]);
  });
  it("marks Build and Share as coming, with no command", () => {
    for (const t of ["Build", "Share"]) { const s = STEPS.find((x) => x.title === t)!; expect(s.verb).toBeTruthy(); expect(s.code).toBeUndefined(); }
  });
  it("puts every step in Get started and llms.txt", () => {
    const txt = stepLlms();
    for (const s of STEPS) { expect(STEP_PAGES.find((p) => p.slug === s.slug)?.tab).toBe("get-started"); expect(txt).toContain(`/docs/${s.slug}.md`); }
  });
  it("keeps step prose free of dashes and Docker", () => {
    for (const s of STEPS) expect(`${s.summary} ${s.opening} ${s.handoff} ${s.taskLine ?? ""}`).not.toMatch(/ - |Docker|holo\b/i);
  });
});

import { upstreamNpm, withNpmRelease } from "@/docs/content";
describe("release status follows npm", () => {
  const upstream = "Today `prism-code` 0.2.0 is on npm.\n\n## What is published\n\n| What | Today | Note |\n| --- | --- | --- |\n| `prism-code` on npm      | 0.2.0         | x |\n";
  it("rewrites a lagging npm row and sentence and says the tables lag", () => {
    const out = withNpmRelease(upstream, "0.7.2");
    expect(upstreamNpm(out)).toBe("0.7.2");
    expect(out).toContain("Today `prism-code` 0.7.2 is on npm.");
    expect(out).toMatch(/last updated for 0\.2\.0/);
  });
  it("leaves an up to date page alone", () => {
    expect(withNpmRelease(upstream, "0.2.0")).toBe(upstream);
  });
  it("the published page names the synced npm release", () => {
    const page = ALL_PAGES.find((p) => p.slug === "reference/release-status")!;
    expect(upstreamNpm(page.body)).toBe(SOURCE.npm);
  });
});
