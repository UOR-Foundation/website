import { ExternalLink } from "lucide-react";
import McpClientTabs from "../components/McpClientTabs";
import McpToolsTable from "../components/McpToolsTable";
import { MCP_URL } from "../data/clients";

const McpDocsPage = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-12 lg:py-16 space-y-12">
    {/* Header */}
    <header className="space-y-4">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-body">
        Model Context Protocol (MCP)
      </h1>
      <p className="text-lg text-muted-foreground font-body max-w-2xl leading-relaxed">
        Let your AI agents interact with the UOR verification engine by connecting to our MCP server. Every response is graded, traceable, and independently verifiable.
      </p>
      <p className="text-sm text-muted-foreground font-body">
        Server URL:{" "}
        <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-foreground">
          {MCP_URL}
        </code>
      </p>
    </header>

    {/* Connect section */}
    <section id="connect">
      <h2 className="text-xl font-semibold text-foreground font-body mb-6">
        Connect to UOR's MCP server
      </h2>
      <McpClientTabs />
    </section>

    {/* Tools & Resources */}
    <McpToolsTable />

    {/* See also */}
    <section id="see-also">
      <h2 className="text-xl font-semibold text-foreground font-body mb-4">See also</h2>
      <ul className="space-y-2">
        <li>
          <a
            href="https://github.com/UOR-Foundation/uor-mcp"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-body text-primary hover:underline"
          >
            GitHub repository <ExternalLink size={13} />
          </a>
        </li>
        <li>
          <a
            href="https://modelcontextprotocol.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-body text-primary hover:underline"
          >
            Model Context Protocol specification <ExternalLink size={13} />
          </a>
        </li>
      </ul>
    </section>
  </div>
);

export default McpDocsPage;
