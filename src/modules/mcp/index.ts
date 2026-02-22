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
} from "./types";

export { MCP_RESOURCES, DEFAULT_MCP_CONFIG } from "./types";

export type { McpClientInfo } from "./data/clients";
export { MCP_URL, MCP_CLIENTS, MCP_CONFIG, CURSOR_DEEP_LINK } from "./data/clients";

export { default as SetupGuide } from "./components/SetupGuide";
export { default as CopyButton } from "./components/CopyButton";
