/**
 * mcp module barrel export.
 */

export type {
  McpToolName,
  DeriveInput,
  VerifyInput,
  QueryInput,
  CorrelateInput,
  PartitionInput,
  McpServerConfig,
  InferenceProof,
  ProofSource,
} from "./types";

export { MCP_RESOURCES, DEFAULT_MCP_CONFIG } from "./types";

export type { McpClientInfo } from "./data/clients";
export { MCP_URL, MCP_CLIENTS, MCP_CONFIG, CURSOR_DEEP_LINK } from "./data/clients";

export { default as SetupGuide } from "./components/SetupGuide";
export { default as CopyButton } from "./components/CopyButton";
export { default as McpDocsPage } from "./pages/McpDocsPage";
export { default as McpClientTabs } from "./components/McpClientTabs";
export { default as McpToolsTable } from "./components/McpToolsTable";
export { default as McpPageNav } from "./components/McpPageNav";
export { MCP_TOOLS, MCP_RESOURCE_LIST } from "./data/tools";
export type { McpToolMeta, McpResourceMeta } from "./data/tools";
