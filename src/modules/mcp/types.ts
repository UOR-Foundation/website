/**
 * UOR MCP Module — Shared types for tool inputs/outputs.
 *
 * These types mirror the MCP tool schemas defined in the edge function
 * and can be used by any frontend code that needs to reference MCP
 * tool parameters or results programmatically.
 */

// ── Tool names ──────────────────────────────────────────────────────────────

export type McpToolName =
  | "uor_derive"
  | "uor_verify"
  | "uor_query"
  | "uor_correlate"
  | "uor_partition";

// ── Tool input types ────────────────────────────────────────────────────────

export interface DeriveInput {
  term: string;
  quantum?: number;
}

export interface VerifyInput {
  derivation_id: string;
}

export interface QueryInput {
  sparql: string;
}

export interface CorrelateInput {
  a: number;
  b: number;
  quantum?: number;
}

export interface PartitionInput {
  seed_set: number[];
  closure_mode?: "none" | "oneStep" | "full";
  quantum?: number;
}

// ── MCP resource URIs ───────────────────────────────────────────────────────

export const MCP_RESOURCES = {
  LLMS_MD: "uor://llms.md",
  OPENAPI: "uor://openapi.json",
} as const;

// ── Server configuration ────────────────────────────────────────────────────

export interface McpServerConfig {
  name: string;
  version: string;
  endpointUrl: string;
  tools: McpToolName[];
  resources: string[];
}

export const DEFAULT_MCP_CONFIG: McpServerConfig = {
  name: "uor-mcp",
  version: "1.0.0",
  endpointUrl:
    "https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-mcp/mcp",
  tools: [
    "uor_derive",
    "uor_verify",
    "uor_query",
    "uor_correlate",
    "uor_partition",
  ],
  resources: ["uor://llms.md", "uor://openapi.json"],
};
