

# Add Live MCP Playground to the MCP Page

## What This Does

Add an interactive "Try It" section directly on the MCP documentation page that lets anyone call the live MCP server (`https://mcp.uor.foundation/mcp`) from the browser. This turns the page from static documentation into a working demo.

## How It Works

The MCP server accepts JSON-RPC 2.0 over HTTP POST. No authentication is required (the edge function is open). We send requests to `https://mcp.uor.foundation/mcp` and display the results inline.

The API key (`prism_sk_a7f2k9mxqw3nv8tz4d1yhe6rcjbp5ls`) will be stored as a constant in the client code since it's a publishable key intended for browser use.

## Changes

### 1. New Component: `McpPlayground.tsx`
An interactive playground with:
- **Tool selector** — dropdown of all 12 MCP tools
- **Input form** — auto-generated fields based on the selected tool's input schema (text fields, number fields, etc.)
- **Run button** — sends JSON-RPC to `https://mcp.uor.foundation/mcp` via `tools/call`
- **Result display** — formatted output with syntax-highlighted JSON and the epistemic trust report
- **Pre-filled examples** — each tool has a sensible default (e.g., `uor_derive` pre-fills with `neg(42)`)
- Loading state, error handling, and a copy-result button

### 2. Update `McpDocsPage.tsx`
Add a new section between "Get Started" and "Reference":
- Pre-label: **Live Demo**
- H2: **Try it in the browser**
- Subtitle: "Call any tool on the live server. No setup required."
- Embeds `<McpPlayground />`

### 3. Update CORS in edge function
Add the preview domain (`https://id-preview--c418ce3e-f411-487e-b7fe-1f054adff0a2.lovable.app`) to `ALLOWED_ORIGINS` so it works during development. The fallback to `*` already covers it, but explicit is better.

### 4. Store API key
Add `UOR_API_KEY` as a constant in `src/modules/mcp/data/clients.ts` since it's a publishable key. The current edge function doesn't require it, but we'll include it as an `apikey` header for forward compatibility.

## Design

The playground matches the site's standard section format:
- Dark code block for results (same style as the config blocks)
- Tool selector uses the site's existing form styling
- Results show raw JSON + the epistemic trust report block
- Compact layout — tool picker and inputs on one row, results below

## No Layout or Logic Changes to Existing Sections
The rest of the MCP page stays exactly as-is.

