import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-uor-mcp.jpg";
import { useState, useCallback } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

const MCP_URL = "https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-mcp/mcp";

const DEEP_LINK = `claude://install-mcp-server/uor?url=${encodeURIComponent(MCP_URL)}`;

const MCP_CONFIG = JSON.stringify({ mcpServers: { uor: { url: MCP_URL } } }, null, 2);

const clients = [
  {
    name: "Claude Desktop",
    deepLink: DEEP_LINK,
    configPath: {
      mac: "~/.config/claude/claude_desktop_config.json",
      win: "%APPDATA%\\Claude\\claude_desktop_config.json",
    },
    steps: [
      "Click the button below to install automatically",
      "Restart Claude Desktop",
    ],
    fallbackSteps: [
      "Open Settings → Developer → Edit Config",
      "Paste the config below and save",
      "Restart Claude Desktop",
    ],
    docsUrl: "https://modelcontextprotocol.io/quickstart/user",
  },
  {
    name: "Cursor",
    configPath: {
      mac: "~/.cursor/mcp.json",
      win: "%USERPROFILE%\\.cursor\\mcp.json",
    },
    steps: [
      "Open Settings → MCP → Add new global MCP server",
      "Paste the config below and save",
    ],
    docsUrl: "https://docs.cursor.com/context/model-context-protocol",
  },
  {
    name: "Windsurf",
    configPath: {
      mac: "~/.codeium/windsurf/mcp_config.json",
      win: "%USERPROFILE%\\.codeium\\windsurf\\mcp_config.json",
    },
    steps: [
      "Open Cascade → click the hammer icon → Configure",
      "Paste the config below and save",
    ],
    docsUrl: "https://docs.windsurf.com/windsurf/mcp",
  },
  {
    name: "VS Code",
    configPath: {
      mac: ".vscode/mcp.json (in your project)",
      win: ".vscode/mcp.json (in your project)",
    },
    steps: [
      "Open Command Palette → MCP: Add Server → HTTP",
      'Enter the URL below, name it "uor"',
    ],
    docsUrl: "https://code.visualstudio.com/docs/copilot/chat/mcp-servers",
  },
];

function CopyBtn({ text, label, large }: { text: string; label?: string; large?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handle = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);
  return (
    <button
      onClick={handle}
      className={`inline-flex items-center gap-1.5 shrink-0 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-body ${
        large ? "px-5 py-2.5 text-base" : "px-3 py-1.5 text-sm"
      }`}
      aria-label="Copy"
    >
      {copied ? <><Check size={large ? 16 : 14} /> Copied!</> : <><Copy size={large ? 16 : 14} /> {label || "Copy"}</>}
    </button>
  );
}

function SetupGuide() {
  const [active, setActive] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const c = clients[active];
  const isClaude = active === 0;

  return (
    <div>
      {/* Client tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {clients.map((cl, i) => (
          <button
            key={cl.name}
            onClick={() => { setActive(i); setShowFallback(false); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border font-body ${
              i === active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/40 text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {cl.name}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 md:p-7 space-y-6">
        {/* One-click install for Claude */}
        {isClaude && !showFallback && (
          <div className="space-y-4">
            <a
              href={c.deepLink}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-body"
            >
              Install in Claude Desktop
              <ExternalLink size={15} />
            </a>
            <p className="text-sm text-muted-foreground font-body">
              Click the button, then restart Claude Desktop. That's it.
            </p>
            <button
              onClick={() => setShowFallback(true)}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 font-body transition-colors"
            >
              Prefer to configure manually?
            </button>
          </div>
        )}

        {/* Manual steps */}
        {(!isClaude || showFallback) && (
          <>
            <ol className="space-y-3">
              {(isClaude && showFallback ? c.fallbackSteps : c.steps)!.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm md:text-base font-body text-foreground leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>

            {/* Config block */}
            <div className="bg-muted/50 rounded-xl p-4 overflow-x-auto">
              <pre className="text-sm font-mono text-foreground leading-relaxed">{MCP_CONFIG}</pre>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <CopyBtn text={MCP_CONFIG} label="Copy config" large />
              <CopyBtn text={MCP_URL} label="Copy URL" />
            </div>

            {/* Config file path */}
            {c.configPath && (
              <p className="text-xs text-muted-foreground font-mono bg-muted/30 rounded-lg px-3 py-2">
                Config file: {c.configPath.mac}
              </p>
            )}
          </>
        )}

        {/* Verify */}
        <div className="border-t border-border pt-5">
          <p className="text-sm font-body text-foreground font-medium mb-1">Verify it works</p>
          <p className="text-sm font-body text-muted-foreground leading-relaxed">
            Type <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-xs">derive 42</code> in your chat. If you see a derivation ID, you're connected.
          </p>
        </div>

        {/* Merging note */}
        <details className="text-sm font-body text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground transition-colors">Already have other MCP servers configured?</summary>
          <p className="mt-2 leading-relaxed pl-1">
            Add the <code className="bg-muted px-1 py-0.5 rounded font-mono text-xs text-foreground">"uor"</code> key inside your existing <code className="bg-muted px-1 py-0.5 rounded font-mono text-xs text-foreground">mcpServers</code> object. Don't replace the whole file — just merge.
          </p>
        </details>

        {/* Docs link */}
        <a
          href={c.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-body text-primary hover:underline"
        >
          Full {c.name} guide <ExternalLink size={13} />
        </a>
      </div>

      <p className="text-sm font-body text-muted-foreground leading-relaxed mt-5">
        No API keys. No accounts. No setup files to manage.
      </p>
    </div>
  );
}

const ProjectUorMcp = () => (
  <ProjectDetailLayout
    name="UOR MCP"
    slug="uor-mcp"
    category="Developer Tools"
    tagline="A Model Context Protocol server that gives any LLM access to the UOR kernel. Every response becomes content-addressed, verified, and auditable."
    heroImage={heroImg}
    repoUrl="https://github.com/UOR-Foundation/uor-mcp"
    agentInstructions={[
      { action: "Understand the value proposition", detail: "UOR MCP exposes five tools (derive, verify, query, correlate, partition) via the Model Context Protocol. Any LLM client can ground its responses in content-addressed, cryptographically verifiable data." },
      { action: "Connect your LLM client", detail: "Add the MCP server URL to Claude Desktop, Cursor, Windsurf, or VS Code. The tools appear automatically with no additional configuration." },
      { action: "Evaluate for your use case", detail: "If your workflow involves AI-assisted development, research, or data processing, UOR MCP ensures every output carries a derivation ID and content-addressed IRI." },
      { action: "Access the project", detail: "Visit the GitHub repository for documentation, tool schemas, and integration examples." },
    ]}
    sections={[
      {
        heading: "What it is",
        content: (
          <>
            <p>
              UOR MCP is a Model Context Protocol server that connects large language models directly to the UOR kernel. It exposes five tools — derive, verify, query, correlate, and partition — through a standardized protocol that any MCP-compatible client can use.
            </p>
            <p>
              Every tool output carries a derivation ID and a content-addressed IRI. This means every response your LLM produces through UOR MCP is traceable, verifiable, and permanent.
            </p>
          </>
        ),
      },
      {
        heading: "The problem it solves",
        content: (
          <>
            <p>
              LLM outputs are ephemeral and unverifiable. When an AI generates a response, there is no way to confirm whether the computation was correct, trace how it was derived, or reference the exact result later.
            </p>
            <p>
              UOR MCP solves this by grounding every LLM operation in the UOR Framework. Each output is cryptographically certified, assigned a permanent address, and linked to a complete computation trace.
            </p>
          </>
        ),
      },
      {
        heading: "How to connect",
        content: <SetupGuide />,
      },
      {
        heading: "How it works",
        content: (
          <>
            <p>
              The server implements the Model Context Protocol specification, exposing UOR kernel operations as callable tools. When an LLM client connects, it discovers five tools: derive (apply ring operations), verify (check the critical identity), query (retrieve coordinate data), correlate (measure similarity), and partition (decompose types).
            </p>
            <p>
              Each tool call passes through the full UOR pipeline: the input is processed, a derivation trace is created, a certificate is issued, and the result is assigned a content-addressed IRI. The LLM receives structured JSON-LD with complete provenance.
            </p>
          </>
        ),
      },
      {
        heading: "Where it applies",
        content: (
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">AI-assisted development.</strong> Ground code generation and technical responses in verifiable mathematical operations.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Research workflows.</strong> Ensure every computation in your research pipeline is traceable and reproducible.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Data verification.</strong> Use the verify tool to confirm algebraic identities and check data integrity across systems.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Content addressing.</strong> Assign permanent, content-based identifiers to any data processed through your LLM.</span>
            </li>
          </ul>
        ),
      },
      {
        heading: "Next steps",
        content: (
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Visit the <a href="https://github.com/UOR-Foundation/uor-mcp" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub repository</a> for documentation and setup guides.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Browse the <a href="/tools" className="text-primary hover:underline">Tool Registry</a> for complete JSON schemas and integration examples.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Join the UOR Foundation community on Discord to connect with the MCP team.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectUorMcp;
