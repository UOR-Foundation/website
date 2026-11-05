import { describe, it, expect } from "vitest";
import { AGENTS, MCP_NAME, MCP_URL, OPEN_AGENTS, SETUP_COMMAND, agentById, prismLink, sentence, shellQuote } from "@/site/build";
import { HERO } from "@/site/copy";

const SENTENCE = "Go to uor.foundation and build me a Prism app that validates a card number with the Luhn check.";

describe("the build box sentence", () => {
  it("is the one sentence the path documents, whatever the user typed around it", () => {
    for (const typed of [
      "validates a card number with the Luhn check",
      "that validates a card number with the Luhn check",
      "  validates a card number with the Luhn check. ",
      "which validates a card number with the Luhn check",
    ]) expect(sentence(typed)).toBe(SENTENCE);
  });

  it("the placeholder makes a sentence an agent can act on", () => {
    expect(sentence(HERO.build.placeholder)).toBe("Go to uor.foundation and build me a Prism app that tells whether a year is a leap year.");
  });

  it("shell quoting keeps the sentence one argument", () => {
    expect(shellQuote('say "hi" $HOME `x`')).toBe('"say \\"hi\\" \\$HOME \\`x\\`"');
  });
});

describe("the hand-offs", () => {
  it("terminal agents get one command that carries the whole sentence", () => {
    for (const id of ["claude-code", "codex"]) {
      const h = agentById(id).handoff(SENTENCE);
      expect(h.kind).toBe("command");
      if (h.kind === "command") expect(h.command).toBe(`${id === "codex" ? "codex" : "claude"} "${SENTENCE}"`);
    }
  });

  it("Cursor's install link decodes to the MCP server and nothing else", () => {
    const h = agentById("cursor").handoff(SENTENCE);
    expect(h.kind).toBe("install");
    if (h.kind !== "install") return;
    const u = new URL(h.href);
    expect(u.protocol).toBe("cursor:");
    expect(u.searchParams.get("name")).toBe(MCP_NAME);
    expect(JSON.parse(atob(u.searchParams.get("config")!))).toEqual({ url: MCP_URL });
    expect(h.then).toBe(SENTENCE);
  });

  it("VS Code's install link carries name, transport and URL", () => {
    const h = agentById("vscode").handoff(SENTENCE);
    if (h.kind !== "install") throw new Error("install expected");
    const json = decodeURIComponent(h.href.slice("vscode:mcp/install?".length));
    expect(JSON.parse(json)).toEqual({ name: MCP_NAME, type: "http", url: MCP_URL });
  });

  it("web agents get the sentence in the URL and the sentence to paste", () => {
    for (const [id, origin] of [["claude", "https://claude.ai/new"], ["chatgpt", "https://chatgpt.com/"]] as const) {
      const h = agentById(id).handoff(SENTENCE);
      if (h.kind !== "link") throw new Error("link expected");
      const u = new URL(h.href);
      expect(`${u.origin}${u.pathname}`).toBe(origin);
      expect([...u.searchParams.values()]).toEqual([SENTENCE]);
      expect(h.then).toBe(SENTENCE);
      expect(agentById(id).setup).toContain(MCP_URL);
    }
  });

  it("the holo:// link is the shape prism-code open accepts, with the sentence as its only payload", () => {
    // Mirrors sdk/npm/prism-code/src/open.mjs in UOR-Foundation/PrismPM#538: host build, no path,
    // parameters agent and q only, the agent one of six ids, the sentence one plain line.
    const href = prismLink("claude-code", SENTENCE);
    const u = new URL(href);
    expect(u.protocol).toBe("holo:");
    expect(u.hostname).toBe("build");
    expect(["", "/"]).toContain(u.pathname);
    expect([...u.searchParams.keys()].sort()).toEqual(["agent", "q"]);
    expect(u.searchParams.get("agent")).toBe("claude-code");
    expect(u.searchParams.get("q")).toBe(SENTENCE);
    expect(u.username + u.password + u.port + u.hash).toBe("");
  });

  it("the box's agent ids are exactly the ids prism-code open accepts", () => {
    expect(AGENTS.map((a) => a.id).sort()).toEqual([...OPEN_AGENTS].sort());
    expect(SETUP_COMMAND).toBe("npx prism-code@latest setup");
  });

  it("every agent has a unique id and a name, and an unknown id falls back to the first", () => {
    expect(new Set(AGENTS.map((a) => a.id)).size).toBe(AGENTS.length);
    for (const a of AGENTS) expect(a.name.length).toBeGreaterThan(0);
    expect(agentById("nope")).toBe(AGENTS[0]);
  });

  it("the box copy has no dashes and names no site, like the rest of the homepage copy", () => {
    const visible = JSON.stringify(HERO.build);
    expect(visible).not.toMatch(/[-–—]/);
    expect(visible).not.toMatch(/uor\.foundation/);
  });
});
