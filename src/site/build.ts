// The homepage build box: one sentence in, handed to the agent the visitor already uses.
// Pure functions, no DOM, no assets, so the hand-offs are unit tested and this file is
// safe to import from tests and build config. Every hand-off ends in the same sentence,
// because any agent can act on it from the URL alone (/new.md); the per-agent part only
// saves a paste or installs the MCP server.

export const MCP_URL = "https://mcp.uor.foundation/";
export const MCP_NAME = "lexlean";
export const SITE = "uor.foundation";

/** The one sentence. "that" and a trailing full stop are absorbed, so the user can type either. */
export function sentence(description: string) {
  const d = description.trim().replace(/^(that|which)\s+/i, "").replace(/[.\s]+$/, "");
  return `Go to ${SITE} and build me a Prism app that ${d}.`;
}

/** Shell-quoted for a double-quoted argument: a quote, backslash, dollar or backtick inside is escaped. */
export const shellQuote = (s: string) => `"${s.replace(/(["\\$`])/g, "\\$1")}"`;

export type Handoff =
  | { kind: "command"; command: string }
  | { kind: "link"; href: string; label: string; then: string }
  | { kind: "install"; href: string; label: string; then: string };

export type Agent = {
  id: string;
  name: string;
  /** What the visitor needs before the sentence works there, in one line. Empty when nothing. */
  setup: string;
  handoff: (s: string) => Handoff;
};

const mcpConfig = { url: MCP_URL };

export const AGENTS: Agent[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    setup: "",
    handoff: (s) => ({ kind: "command", command: `claude ${shellQuote(s)}` }),
  },
  {
    id: "codex",
    name: "Codex",
    setup: "",
    handoff: (s) => ({ kind: "command", command: `codex ${shellQuote(s)}` }),
  },
  {
    id: "cursor",
    name: "Cursor",
    setup: "One click adds the UOR MCP server; then paste the sentence into the agent panel.",
    handoff: (s) => ({
      kind: "install",
      href: `cursor://anysphere.cursor-deeplink/mcp/install?name=${MCP_NAME}&config=${btoa(JSON.stringify(mcpConfig))}`,
      label: "Add to Cursor",
      then: s,
    }),
  },
  {
    id: "vscode",
    name: "VS Code",
    setup: "One click adds the UOR MCP server; then paste the sentence into Copilot agent mode.",
    handoff: (s) => ({
      kind: "install",
      href: `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: MCP_NAME, type: "http", ...mcpConfig }))}`,
      label: "Add to VS Code",
      then: s,
    }),
  },
  {
    id: "claude",
    name: "Claude",
    setup: `Once, in Customize, add ${MCP_URL} as a custom connector with no sign in.`,
    handoff: (s) => ({ kind: "link", href: `https://claude.ai/new?q=${encodeURIComponent(s)}`, label: "Open in Claude", then: s }),
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    setup: `Once, in Settings, connect ${MCP_URL} as an MCP server.`,
    handoff: (s) => ({ kind: "link", href: `https://chatgpt.com/?prompt=${encodeURIComponent(s)}`, label: "Open in ChatGPT", then: s }),
  },
];

export const DEFAULT_AGENT = AGENTS[0].id;

export function agentById(id: string) {
  return AGENTS.find((a) => a.id === id) ?? AGENTS[0];
}
