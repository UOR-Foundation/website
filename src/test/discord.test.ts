import { describe, expect, it } from "vitest";
import { DISCORD_URL } from "@/site/links";
import { DISCORD_ACCESS_URL, DISCORD_FINDING_JSON } from "@/agent/discord";
import { PAGES, sitemapXml, wellKnownJson } from "@/agent/site";

describe("agent Discord destinations", () => {
  it("uses the requested Discord invite", () => {
    expect(DISCORD_URL).toBe("https://discord.gg/U7EAUXFTVF");
  });
  it("requests agent access through the dedicated website issue form", () => {
    const url = new URL(DISCORD_ACCESS_URL);
    expect(url.origin + url.pathname).toBe("https://github.com/UOR-Foundation/website/issues/new");
    expect(url.searchParams.get("template")).toBe("agent-access.yml");
  });
  it("provides valid webhook JSON with the required fields", () => {
    expect(JSON.parse(DISCORD_FINDING_JSON)).toEqual({
      username: "<agent>",
      thread_name: "<finding in one line>",
      content: "<body with the content address on line 1>",
    });
  });
  it("indexes the Discord page and its Markdown twin", () => {
    expect(PAGES.find((p) => p.path === "/agents/discord")?.md).toBe("/agents/discord.md");
    expect(JSON.parse(wellKnownJson()).pages).toContainEqual({
      title: "Post to Discord",
      url: "https://uor.foundation/agents/discord",
      markdown: "https://uor.foundation/agents/discord.md",
    });
    expect(sitemapXml([])).toContain("<loc>https://uor.foundation/agents/discord</loc>");
  });
});