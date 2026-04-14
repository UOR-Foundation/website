import Layout from "@/modules/core/components/Layout";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import McpClientTabs from "../components/McpClientTabs";
import McpToolsTable from "../components/McpToolsTable";
import { MCP_URL } from "../data/clients";

const McpDocsPage = () => (
  <Layout>
    {/* Hero — matches ProjectDetailLayout */}
    <section className="hero-gradient pt-32 md:pt-44 pb-12 md:pb-16">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-body mb-8"
        >
          <ArrowLeft size={14} />
          All Projects
        </Link>

        <div className="flex items-center gap-3 mb-5">
          <span className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary font-body whitespace-nowrap">
            Developer Tools
          </span>
        </div>

        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
          UOR MCP
        </h1>
        <p
          className="mt-5 text-lg text-muted-foreground font-body leading-relaxed max-w-2xl animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          A server that connects AI models to the UOR verification engine via the Model Context Protocol. Every response is graded, traceable, and independently verifiable.
        </p>
        <p
          className="mt-4 text-sm text-muted-foreground font-body animate-fade-in-up"
          style={{ animationDelay: "0.15s" }}
        >
          Server URL:{" "}
          <code className="bg-muted/50 px-1.5 py-0.5 rounded font-mono text-xs text-foreground">
            {MCP_URL}
          </code>
        </p>
      </div>
    </section>

    {/* Connect section */}
    <section className="border-b border-border">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] py-12 md:py-16">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
          Connect to UOR's MCP server
        </h2>
        <p className="text-muted-foreground font-body leading-relaxed max-w-2xl mb-8">
          Choose your AI client below. No API keys, no accounts required.
        </p>
        <McpClientTabs />
      </div>
    </section>

    {/* Tools & Resources */}
    <section className="border-b border-border">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] py-12 md:py-16">
        <McpToolsTable />
      </div>
    </section>

    {/* See also */}
    <section>
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] py-12 md:py-16">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          See also
        </h2>
        <ul className="space-y-3">
          <li>
            <a
              href="https://github.com/UOR-Foundation/uor-mcp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-base font-body text-primary hover:underline"
            >
              GitHub repository <ExternalLink size={14} />
            </a>
          </li>
          <li>
            <a
              href="https://modelcontextprotocol.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-base font-body text-primary hover:underline"
            >
              Model Context Protocol specification <ExternalLink size={14} />
            </a>
          </li>
        </ul>
      </div>
    </section>
  </Layout>
);

export default McpDocsPage;
