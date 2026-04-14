import { MCP_TOOLS, MCP_RESOURCE_LIST } from "../data/tools";

const McpToolsTable = () => (
  <div className="space-y-10">
    {/* Tools */}
    <div id="tools">
      <h2 className="text-xl font-semibold text-foreground font-body mb-4">Tools</h2>
      <p className="text-sm text-muted-foreground font-body mb-4">
        These tools are automatically available to your AI client when connected.
      </p>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider font-body">
                Tool
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider font-body">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {MCP_TOOLS.map((tool) => (
              <tr key={tool.name} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-foreground text-sm whitespace-nowrap">
                  {tool.name}
                </td>
                <td className="px-4 py-3 text-muted-foreground font-body">
                  {tool.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Resources */}
    <div id="resources">
      <h2 className="text-xl font-semibold text-foreground font-body mb-4">Resources</h2>
      <p className="text-sm text-muted-foreground font-body mb-4">
        Resources are read-only data endpoints exposed by the MCP server.
      </p>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider font-body">
                URI
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider font-body">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {MCP_RESOURCE_LIST.map((r) => (
              <tr key={r.uri} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-foreground text-sm whitespace-nowrap">
                  {r.uri}
                </td>
                <td className="px-4 py-3 text-muted-foreground font-body">
                  {r.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export default McpToolsTable;
