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

/**
 * `npx prism-code@latest setup` (prism-code 0.4.0, UOR-Foundation/PrismPM#538) configures every
 * agent on the machine for the UOR MCP server, installs the Prism skills and registers a holo://
 * handler that opens the agent with the sentence in one click. Where the Hologram app already owns
 * holo://, Hologram hands holo://build links to prism-code (Hologram-Technologies/hologram-apps#29).
 * `@latest`, because npx prefers an older prism-code installed in any folder above the current one.
 */
export const SETUP_PUBLISHED = true;
export const SETUP_COMMAND = "npx prism-code@latest setup";
/** The agent ids prism-code open accepts: the same six, by the same ids. */
export const OPEN_AGENTS = ["claude-code", "codex", "cursor", "vscode", "claude", "chatgpt"] as const;

/** The link the registered handler opens. The sentence is the only payload; prism-code open refuses anything else. */
export function prismLink(agentId: string, s: string) {
  const u = new URL("holo://build");
  u.searchParams.set("agent", agentId);
  u.searchParams.set("q", s);
  return u.toString();
}

export function agentById(id: string) {
  return AGENTS.find((a) => a.id === id) ?? AGENTS[0];
}
