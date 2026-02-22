# UOR MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io/) server that gives any LLM physically grounded computation through the UOR Framework.

## What This Does

When an LLM connects to this MCP server and uses its tools, every computation is:

- **Content-addressed** — results have deterministic IRIs derived from their content
- **Algebraically verified** — ring coherence is checked before any value is emitted
- **Auditable** — every derivation produces a canonical receipt with SHA-256 derivation ID

## Connection URL

```
https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-mcp/mcp
```

## Available Tools

| Tool | Description |
|---|---|
| `uor_derive` | Parse and canonicalize a ring expression. Returns content-addressed IRI, derivation ID, and receipt. |
| `uor_verify` | Re-derive and verify a previous computation by derivation ID. |
| `uor_query` | Execute a SPARQL 1.1 query over the UOR knowledge graph. |
| `uor_correlate` | Compute algebraic correlation (Hamming fidelity) between two values. |
| `uor_partition` | Classify ring elements into the 4 algebraic partition sets. |

## Available Resources

| URI | Description |
|---|---|
| `uor://llms.md` | Agent quick card — what UOR is and how to use it |
| `uor://openapi.json` | Full OpenAPI 3.1.0 specification |

## Connect from Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "uor": {
      "url": "https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-mcp/mcp"
    }
  }
}
```

## Connect from Cursor

Add to your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "uor": {
      "url": "https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-mcp/mcp"
    }
  }
}
```

## Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

Enter the connection URL and explore the available tools and resources interactively.

## Example Usage

Once connected, an LLM can use the tools like:

> "Derive neg(bnot(42)) and verify it."

The LLM will call `uor_derive` with `term: "neg(bnot(42))"`, receive a content-addressed result with IRI `https://uor.foundation/u/U282B` (value 43), and can then call `uor_verify` with the returned derivation ID to confirm algebraic validity.

## Architecture

```
LLM Client  ←→  uor-mcp (this server)  →  uor-api (UOR REST API)
```

The MCP server is a thin protocol adapter. All ring arithmetic, content addressing, and receipt generation happen in the existing UOR API, keeping the system centralized and consistent.
