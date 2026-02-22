

# UOR MCP Server Module

## What This Does

Creates an MCP (Model Context Protocol) server as a standalone Supabase Edge Function that any LLM client (Claude, GPT, Cursor, etc.) can connect to. When an LLM uses UOR tools through this server, its responses become **physically grounded** -- every computation is content-addressed, algebraically verified, and produces an auditable receipt.

## Architecture

The MCP server exposes the 5 canonical UOR agent tools as MCP tools, plus 2 resource endpoints for discovery. Any MCP-compatible client connects via the Streamable HTTP transport.

```text
+------------------+       MCP Protocol        +---------------------+
|  Any LLM Client  | <--- (Streamable HTTP) --> |  uor-mcp (Edge Fn)  |
|  Claude, GPT,    |                            |                     |
|  Cursor, etc.    |                            |  5 Tools:           |
+------------------+                            |   - uor_derive      |
                                                |   - uor_verify      |
                                                |   - uor_query       |
                                                |   - uor_correlate   |
                                                |   - uor_partition   |
                                                |                     |
                                                |  2 Resources:       |
                                                |   - llms.md         |
                                                |   - openapi.json    |
                                                +----------+----------+
                                                           |
                                                    Calls existing
                                                    UOR REST API
                                                           |
                                                           v
                                                +---------------------+
                                                |   uor-api (Edge Fn) |
                                                |   (existing API)    |
                                                +---------------------+
```

## Module Structure

Two deliverables -- a frontend module (portable, can move to another repo) and the Edge Function backend:

```text
src/modules/mcp/
  index.ts              -- barrel export
  module.json           -- UOR module manifest
  types.ts              -- shared types
  README.md             -- standalone documentation

supabase/functions/uor-mcp/
  index.ts              -- MCP server (Edge Function)
```

## The 5 MCP Tools

Each tool maps 1:1 to the existing UOR API endpoints. The MCP server calls the live API internally, so all ring arithmetic, content addressing, and receipt generation remain centralized.

| MCP Tool | Description | UOR API Endpoint |
|---|---|---|
| `uor_derive` | Parse and canonicalize a ring expression. Returns content-addressed IRI, CID, and receipt. | `POST /kernel/derive` |
| `uor_verify` | Re-derive and verify a previous computation by derivation ID. | `GET /tools/verify` |
| `uor_query` | Execute a SPARQL query over the UOR knowledge graph. | `POST /tools/query` |
| `uor_correlate` | Compute algebraic correlation (Hamming fidelity) between two values. | `GET /tools/correlate` |
| `uor_partition` | Classify ring elements into algebraic partition sets. | `POST /tools/partition` |

## 2 MCP Resources

- `uor://llms.md` -- The agent quick card (what UOR is, how to use it)
- `uor://openapi.json` -- Full API specification for deeper exploration

## Technical Details

**Stack:** mcp-lite (v0.10.0+) + Hono + Zod for schema validation, deployed as a Supabase Edge Function with `verify_jwt = false` (public access, same as the existing API).

**Security:**
- Input validation with Zod schemas (bounded integers, string length limits)
- Rate limiting inherited from the underlying UOR API
- No secrets required -- calls the public UOR API
- CORS headers for web-based MCP clients

**Config changes:**
- Add `[functions.uor-mcp]` with `verify_jwt = false` to `supabase/config.toml`

**Connection URL (after deploy):**
```
https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-mcp/mcp
```

## Frontend Module

`src/modules/mcp/` contains the module manifest, types, and a README with connection instructions for Claude Desktop, Cursor, and the MCP Inspector. This is the portable piece you can move to another repo.

## Files to Create

1. **`supabase/functions/uor-mcp/index.ts`** -- The MCP server edge function
2. **`src/modules/mcp/module.json`** -- UOR module manifest
3. **`src/modules/mcp/types.ts`** -- Shared types for tool inputs/outputs
4. **`src/modules/mcp/index.ts`** -- Barrel export
5. **`src/modules/mcp/README.md`** -- Standalone docs with connection examples

## Files to Modify

1. **`supabase/config.toml`** -- Add `[functions.uor-mcp]` entry

