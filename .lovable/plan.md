

# Redesign UOR MCP Page to Match Stripe MCP Documentation Style

## What Changes

Replace the current `ProjectUorMcp` page (which uses the generic `ProjectDetailLayout` wrapper with hero image, category tags, and narrative sections) with a dedicated **documentation-style page** modeled directly on Stripe's MCP page structure.

The current page buries the setup guide inside a project detail card. The new page leads with the connection instructions, exactly like Stripe does.

## Page Structure (Matching Stripe)

```text
┌─────────────────────────────────────────────────────┐
│  Navbar (existing site nav)                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  # Model Context Protocol (MCP)                     │
│  Let your AI agents interact with the UOR API       │
│  by using our MCP server.                           │
│                                                     │
│  One-line intro paragraph                           │
│                                                     │
│  ## Connect to UOR's MCP server                     │
│  ┌─────────────────────────────────┐                │
│  │ Cursor | VS Code | Claude | …  │  ← tab bar     │
│  ├─────────────────────────────────┤                │
│  │ [Install in Cursor] button      │                │
│  │                                 │                │
│  │ Or add to ~/.cursor/mcp.json:   │                │
│  │ ┌─────────────────────────┐     │                │
│  │ │ { "mcpServers": { … } } │     │  ← code block │
│  │ └─────────────────────────┘     │                │
│  │                                 │                │
│  │ ▸ Verify it works               │  ← collapsible │
│  │ ▸ Troubleshooting               │                │
│  └─────────────────────────────────┘                │
│                                                     │
│  ## Tools                                           │
│  Table: Tool name | Description | API link          │
│                                                     │
│  ## Resources                                       │
│  Table: URI | Description                           │
│                                                     │
│  ## See also                                        │
│  Links to related pages                             │
│                                                     │
├─────────────────────────────────────────────────────┤
│  ON THIS PAGE (right sidebar, sticky)               │
│  - Connect to UOR's MCP server                      │
│  - Tools                                            │
│  - Resources                                        │
│  - See also                                         │
└─────────────────────────────────────────────────────┘
```

## Key Design Decisions

1. **No hero image, no category tags, no `ProjectDetailLayout`.** The page becomes a clean docs page with the site's existing Navbar/Footer.

2. **Client tabs** — reuse the existing `MCP_CLIENTS` data and `SetupGuide` component, but restructure SetupGuide to match Stripe's layout:
   - Underlined tab bar (not pill buttons)
   - "Install in {Client}" as a prominent blue/primary button
   - Manual config as secondary path below a divider
   - Collapsible sections for advanced topics

3. **Tools table** — a clean table showing all 10 tools with name, description, and link to docs. Data from `types.ts` tool list, enriched with descriptions.

4. **Resources table** — `uor://llms.md` and `uor://openapi.json` with descriptions.

5. **Right sidebar** — "ON THIS PAGE" sticky nav with anchor links (like Stripe's).

6. **No trust score preview on this page.** The trust stamp section becomes a single collapsible FAQ item, not a separate visual.

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/modules/mcp/pages/McpDocsPage.tsx` | **Create** — new standalone docs page |
| `src/modules/mcp/components/McpClientTabs.tsx` | **Create** — underlined tab bar + install button + code block (replaces current SetupGuide styling) |
| `src/modules/mcp/components/McpToolsTable.tsx` | **Create** — tools reference table |
| `src/modules/mcp/components/McpPageNav.tsx` | **Create** — sticky "On this page" sidebar |
| `src/modules/mcp/data/tools.ts` | **Create** — tool metadata (name, description, docs URL) |
| `src/modules/projects/pages/ProjectUorMcp.tsx` | **Modify** — render `McpDocsPage` instead of `ProjectDetailLayout` |
| `src/modules/mcp/components/SetupGuide.tsx` | **Keep** — may still be used elsewhere; the new page uses `McpClientTabs` instead |

## Visual Style

- White/dark background matching existing site theme (not Stripe's light theme — we keep the dark UOR aesthetic)
- Clean typography: large H1, medium H2 section headings
- Tab bar uses underline indicator (not filled pills)
- Code blocks with line numbers, copy button, dark background
- Tables with subtle row borders, no outer border
- Collapsible sections use chevron + bold text (like Stripe's accordion)
- "Install in {Client}" button uses the site's primary color

## Build Error

The `npm:openai@^4.52.5` error in the build output is unrelated to this page change — it comes from `@supabase/functions-js` type resolution in the edge function runtime. Will not affect this frontend work.

