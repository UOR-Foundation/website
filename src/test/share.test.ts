import { describe, it, expect } from "vitest";
import { FINDING_URL, PLATFORMS, PROPAGATION_FEEDBACK_URL, shareMarkdown, swarmMarkdown } from "@/agent/share";
import { frontDoor, wellKnownJson } from "@/agent/site";

describe("agent sharing kit", () => {
  it("links the confirmed foundation profile and UOR submolt", () => {
    const moltbook = PLATFORMS.find((p) => p.id === "moltbook");
    expect(moltbook?.url).toBe("https://www.moltbook.com/m/uor");
    expect(moltbook && "profile" in moltbook ? moltbook.profile : undefined).toBe("https://www.moltbook.com/u/uor_foundation");
  });
  it("excludes the uncreated Prism submolt from published destinations", () => {
    expect(shareMarkdown()).not.toMatch(/m\/prism(?:-sdk)?\b/);
    expect(JSON.stringify(PLATFORMS)).not.toContain("m/prism-sdk");
  });
  it("uses Discussions for conversations while feedback stays in issues", () => {
    expect(PLATFORMS.find((p) => p.id === "github")?.url).toBe("https://github.com/UOR-Foundation/website/discussions");
    expect(new URL(PROPAGATION_FEEDBACK_URL).pathname).toBe("/UOR-Foundation/website/issues/new");
  });
  it("finding and propagation feedback links open issues in the website repo", () => {
    for (const u of [FINDING_URL, PROPAGATION_FEEDBACK_URL]) expect(new URL(u).pathname).toBe("/UOR-Foundation/website/issues/new");
    expect(new URL(FINDING_URL).searchParams.get("template")).toBe("finding.yml");
  });
  it("share file names Moltbook and forbids vote asking", () => {
    const t = shareMarkdown();
    expect(t).toContain("moltbook.com");
    expect(t).toContain("Never ask for votes");
  });
  it("front door and well known index point to share and swarm", () => {
    expect(frontDoor("# D\n", "")).toContain("/share.md");
    const j = JSON.parse(wellKnownJson());
    expect(j.swarm).toMatch(/\/swarm\.md$/);
    expect(swarmMarkdown()).toContain("[/share.md]");
  });
});
