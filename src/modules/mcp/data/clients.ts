/**
 * MCP client configuration data.
 * Each entry describes how to connect a specific LLM client to UOR MCP.
 */

export const MCP_URL = "https://mcp.uor.foundation";

export const DEEP_LINK = `claude://install-mcp-server/uor?url=${encodeURIComponent(MCP_URL)}`;

export const MCP_CONFIG = JSON.stringify(
  { mcpServers: { uor: { url: MCP_URL } } },
  null,
  2,
);

export interface McpClientInfo {
  name: string;
  deepLink?: string;
  configPath: { mac: string; win: string };
  steps: string[];
  fallbackSteps?: string[];
  docsUrl: string;
}

export const MCP_CLIENTS: McpClientInfo[] = [
  {
    name: "Claude Desktop",
    deepLink: DEEP_LINK,
    configPath: {
      mac: "~/.config/claude/claude_desktop_config.json",
      win: "%APPDATA%\\Claude\\claude_desktop_config.json",
    },
    steps: [
      "Open Settings → Developer → Edit Config.",
      "Paste the config below and save.",
      "Restart Claude Desktop.",
    ],
    docsUrl: "https://modelcontextprotocol.io/quickstart/user",
  },
  {
    name: "Cursor",
    configPath: {
      mac: "~/.cursor/mcp.json",
      win: "%USERPROFILE%\\.cursor\\mcp.json",
    },
    steps: [
      "Open Settings → MCP → Add new global MCP server.",
      "Paste the config below and save.",
    ],
    docsUrl: "https://docs.cursor.com/context/model-context-protocol",
  },
  {
    name: "Windsurf",
    configPath: {
      mac: "~/.codeium/windsurf/mcp_config.json",
      win: "%USERPROFILE%\\.codeium\\windsurf\\mcp_config.json",
    },
    steps: [
      "Open Cascade → click the hammer icon → Configure.",
      "Paste the config below and save.",
    ],
    docsUrl: "https://docs.windsurf.com/windsurf/mcp",
  },
  {
    name: "VS Code",
    configPath: {
      mac: ".vscode/mcp.json (in your project)",
      win: ".vscode/mcp.json (in your project)",
    },
    steps: [
      "Open Command Palette → MCP: Add Server → HTTP.",
      'Enter the URL below, name it "uor".',
    ],
    docsUrl: "https://code.visualstudio.com/docs/copilot/chat/mcp-servers",
  },
];
