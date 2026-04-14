import { MCP_TOOLS, MCP_RESOURCE_LIST } from "../data/tools";
import { MCP_URL } from "../data/clients";

const McpToolsTable = () => (
  <div className="space-y-10">
    {/* Tools */}
    <div id="tools">
      <h2 className="font-display text-fluid-heading font-bold text-foreground mb-3">
        Tools
      </h2>
      <p className="text-fluid-body text-foreground/70 font-body leading-relaxed max-w-3xl mb-6">
        The server exposes the following{" "}
        <a
          href="https://modelcontextprotocol.io/docs/concepts/tools"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          MCP tools
        </a>
        . All tools are available to your AI client automatically after connecting.
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
      <h2 className="font-display text-fluid-heading font-bold text-foreground mb-3">
        Resources
      </h2>
      <p className="text-fluid-body text-foreground/70 font-body leading-relaxed max-w-3xl mb-6">
        Read-only data endpoints delivered to your AI client on connection.
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

    {/* Server URL */}
    <div>
      <p className="text-sm text-foreground/50 font-body">
        Server URL:{" "}
        <code className="bg-muted/50 px-1.5 py-0.5 rounded font-mono text-xs text-foreground">
          {MCP_URL}
        </code>
      </p>
    </div>
  </div>
);

export default McpToolsTable;
