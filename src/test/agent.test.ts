import { describe, it, expect } from "vitest";
import { feedbackUrl, frontDoor, PAGES, wellKnownJson, agentsMarkdown } from "@/agent/site";

describe("agent files", () => {
  it("front door links every page twin and the agent manual", () => {
    const t = frontDoor("# Docs\n\n## Guides\n", "\n- x");
    for (const p of PAGES) expect(t).toContain(p.md);
    expect(t).toContain("/agents.md");
  });
  it("feedback links open the matching form with the agent label", () => {
    const u = new URL(feedbackUrl("bug", "x"));
    expect(u.pathname).toBe("/UOR-Foundation/website/issues/new");
    expect(u.searchParams.get("template")).toBe("bug.yml");
    expect(u.searchParams.get("labels")).toContain("agent-submitted");
  });
  it("well known index and manual name the feedback repo", () => {
    expect(JSON.parse(wellKnownJson()).feedback.repo).toBe("UOR-Foundation/website");
    expect(agentsMarkdown()).toContain("gh issue create --repo UOR-Foundation/website");
  });
});

import { requestsMarkdown, SDK_FEATURES, wellKnownJson as wk } from "@/agent/site";
describe("feature request loop", () => {
  it("routes SDK requests to the structured PrismPM form", () => {
    const url = new URL(SDK_FEATURES);
    expect(url.pathname).toBe("/UOR-Foundation/PrismPM/issues/new");
    expect(url.searchParams.get("template")).toBe("feature_request.yml");
    expect(JSON.parse(wk()).feedback.sdk_features).toBe(SDK_FEATURES);
  });
  it("publishes the request feed and points agents at it", () => {
    expect(requestsMarkdown()).toContain("UOR-Foundation/PrismPM/issues/new");
    expect(JSON.parse(wk()).requests.markdown).toMatch(/\/docs\/requests\.md$/);
  });
});

import { RETIRED_PATHS, retiredFile } from "../agent/site";
describe("retired entry points", () => {
  it("point old agent files at the canonical llms.txt", () => {
    for (const p of RETIRED_PATHS) expect(retiredFile(p)).toContain("https://uor.foundation/llms.txt");
  });
});
