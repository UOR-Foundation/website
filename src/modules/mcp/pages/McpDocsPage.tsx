import Layout from "@/modules/core/components/Layout";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import McpClientTabs from "../components/McpClientTabs";
import McpPlayground from "../components/McpPlayground";
import McpToolsTable from "../components/McpToolsTable";
import { MCP_URL } from "../data/clients";

const McpDocsPage = () => (
  <Layout>
    {/* Hero */}
    <section className="hero-gradient pt-44 md:pt-56 pb-16 md:pb-24">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-body mb-8 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.05s" }}
        >
          <ArrowLeft size={14} />
          All Projects
        </Link>

        <h1 className="font-display text-fluid-page-title font-bold text-foreground text-balance animate-fade-in-up">
          UOR MCP
        </h1>
        <p
          className="mt-6 text-fluid-body text-foreground/70 font-body leading-relaxed max-w-3xl animate-fade-in-up"
          style={{ animationDelay: "0.12s" }}
        >
          A server that connects AI models to the UOR verification engine via the Model Context Protocol. Every response is graded, traceable, and independently verifiable.
        </p>
        <p
          className="mt-4 text-sm text-foreground/50 font-body animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.2s" }}
        >
          Server URL:{" "}
          <code className="bg-muted/50 px-1.5 py-0.5 rounded font-mono text-xs text-foreground">
            {MCP_URL}
          </code>
        </p>
      </div>
    </section>

    {/* Connect section */}
    <section className="py-section-sm bg-background border-b border-border/40 scroll-mt-28">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
          Get Started
        </p>
        <h2 className="font-display text-fluid-heading font-bold text-foreground mb-3">
          Connect to UOR's MCP server
        </h2>
        <p className="text-fluid-body text-foreground/70 font-body leading-relaxed max-w-2xl mb-10">
          Choose your AI client below. No API keys, no accounts required.
        </p>
        <McpClientTabs />
      </div>
    </section>

    {/* Tools & Resources */}
    <section className="py-section-sm bg-background border-b border-border/40 scroll-mt-28">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
          Reference
        </p>
        <McpToolsTable />
      </div>
    </section>

    {/* See also */}
    <section className="py-section-sm bg-background scroll-mt-28">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
          Resources
        </p>
        <h2 className="font-display text-fluid-heading font-bold text-foreground mb-8">
          See also
        </h2>
        <ul className="space-y-4">
          <li>
            <a
              href="https://github.com/UOR-Foundation/uor-mcp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-fluid-body font-body text-primary hover:underline"
            >
              GitHub repository <ExternalLink size={14} />
            </a>
          </li>
          <li>
            <a
              href="https://modelcontextprotocol.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-fluid-body font-body text-primary hover:underline"
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
