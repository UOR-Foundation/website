/**
 * Service Mesh — MCP (Model Context Protocol) Module.
 * @ontology uor:ServiceMesh
 * Layer 2 — remote. MCP tool discovery and invocation.
 * @version 1.0.0
 */
import { register } from "../registry";

register({
  ns: "mcp",
  label: "MCP Gateway",
  layer: 2,
  defaultRemote: true,
  operations: {
    connect: {
      handler: async (params: any) => {
        throw new Error("[bus] mcp/connect is a remote method — should be dispatched via gateway");
      },
      description: "Connect to an MCP server",
    },
    call: {
      handler: async (params: any) => {
        throw new Error("[bus] mcp/call is a remote method — should be dispatched via gateway");
      },
      description: "Call an MCP tool on a connected server",
    },
    discover: {
      handler: async (params: any) => {
        throw new Error("[bus] mcp/discover is a remote method — should be dispatched via gateway");
      },
      description: "Discover available MCP tools on a server",
    },
  },
});
