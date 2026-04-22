import { useState } from "react";
import { Copy, Check, ArrowUpRight } from "lucide-react";

const MCP_URL = "https://mcp.uor.foundation/mcp";

const CURSOR_DEEP_LINK =
  "cursor://anysphere.cursor-deeplink/mcp/install?name=uor-passport&config=eyJ1cmwiOiJodHRwczovL21jcC51b3IuZm91bmRhdGlvbi9tY3AifQ";

const VSCODE_DEEP_LINK =
  "vscode:mcp/install?%7B%22name%22%3A%22uor-passport%22%2C%22serverUrl%22%3A%22https%3A//mcp.uor.foundation/mcp%22%7D";

const JSON_CONFIG = `{
  "mcpServers": {
    "uor-passport": { "url": "https://mcp.uor.foundation/mcp" }
  }
}`;

const CLAUDE_CMD = `claude mcp add --transport http uor-passport https://mcp.uor.foundation/mcp`;

const CLAUDE_AGENT_PROMPT = `Please add this MCP server to my Claude Code config at
~/.claude/settings.json (or the equivalent mcpServers location):

  { "mcpServers": { "uor-passport": { "url": "https://mcp.uor.foundation/mcp" } } }

Then verify by calling the uor.encode_address tool with content "hello"
and showing me the full response including the _meta field.`;

const VERIFY_PROMPT = `Use the uor.encode_address tool to fingerprint 'hello' and show me the full response including _meta.`;

const VERIFY_RESPONSE = `"_meta": {
  "uor.passport": {
    "fingerprint": "5c8f96c88a648178c09bd73764639bb2cf4d8d5c8f72f077f0e872cab6a6be6f",
    "algorithm": "uor-sha256-v1",
    "length": 438,
    "timestamp": "2026-04-21T19:59:02Z"
  },
  "uor.mcps.receipt": {
    "signature": "3FB+nfc9Fy2er4ThCaBfXuMoyzahO1ZcZlaftiRp...",
    "public_key": "Y/JdKNj9CIhpSBPBJ0I9oKBXDJnCwZ5/xtvpsjIc8PY=",
    "algorithm": "ed25519",
    "trust_level": "L1"
  }
}`;

type TabId = "cursor" | "vscode" | "claude" | "chatgpt" | "other";

const TABS: { id: TabId; label: string }[] = [
  { id: "cursor", label: "Cursor" },
  { id: "vscode", label: "VS Code" },
  { id: "claude", label: "Claude Code" },
  { id: "chatgpt", label: "ChatGPT" },
  { id: "other", label: "Other" },
];

const CodeBlock = ({ code, language }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="not-prose relative rounded-lg border border-border bg-muted/60 overflow-hidden my-4">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40">
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          {language ?? "code"}
        </span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Copy code"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 text-[13.5px] font-mono text-foreground leading-relaxed overflow-x-auto m-0">
        {code}
      </pre>
    </div>
  );
};

const InstallButton = ({
  href,
  icon,
  client,
}: {
  href: string;
  icon: React.ReactNode;
  client: string;
}) => (
  <a
    href={href}
    className="not-prose group relative inline-flex items-center gap-3 overflow-hidden rounded-full pl-2 pr-5 py-2 bg-white text-neutral-950 ring-1 ring-white/15 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] hover:ring-primary/60 hover:shadow-[0_10px_30px_-8px_hsl(var(--primary)/0.55)] hover:-translate-y-0.5 transition-all duration-200 no-underline"
  >
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-950 text-white">
      <span className="h-[18px] w-[18px] flex items-center justify-center">{icon}</span>
    </span>
    <span className="text-[14.5px] font-semibold tracking-tight leading-none">
      Install in <span className="font-bold">{client}</span>
    </span>
    <ArrowUpRight size={15} strokeWidth={2.4} className="text-neutral-500 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
  </a>
);

// ── Brand glyphs (inline SVG, themed via currentColor) ──────────────────────
const CursorIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
    <path d="M3 2l9 20 2.6-8.4L23 11 3 2z" />
  </svg>
);
const VSCodeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
    <path d="M17.5 2.5L9 11 4.5 7.5 2 9l4 3-4 3 2.5 1.5L9 13l8.5 8.5L22 19V5l-4.5-2.5zM17 8v8l-5-4 5-4z" />
  </svg>
);

const McpInstallTabs = () => {
  const [active, setActive] = useState<TabId>("cursor");

  return (
    <div className="not-prose">
      {/* Tab bar */}
      <div role="tablist" aria-label="MCP client install" className="flex flex-wrap border-b border-border mb-6">
        {TABS.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`mcp-panel-${t.id}`}
              id={`mcp-tab-${t.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  const i = TABS.findIndex((x) => x.id === active);
                  const next =
                    e.key === "ArrowRight"
                      ? TABS[(i + 1) % TABS.length]
                      : TABS[(i - 1 + TABS.length) % TABS.length];
                  setActive(next.id);
                }
              }}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative font-body ${
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      <div className="text-[15.5px] leading-relaxed text-foreground/85 font-body">
        {active === "cursor" && (
          <div role="tabpanel" id="mcp-panel-cursor" aria-labelledby="mcp-tab-cursor" className="space-y-4">
            <InstallButton
              href={CURSOR_DEEP_LINK}
              icon={<CursorIcon />}
              client="Cursor"
            />
            <p>
              One click installs the UOR Passport MCP. Or add it to{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[13px]">~/.cursor/mcp.json</code> manually:
            </p>
            <CodeBlock code={JSON_CONFIG} language="mcp.json" />
          </div>
        )}

        {active === "vscode" && (
          <div role="tabpanel" id="mcp-panel-vscode" aria-labelledby="mcp-tab-vscode" className="space-y-4">
            <InstallButton
              href={VSCODE_DEEP_LINK}
              icon={<VSCodeIcon />}
              client="VS Code"
            />
            <p>
              Or run <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[13px]">MCP: Add Server</code> from the
              command palette (<code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[13px]">⌘⇧P</code>),
              choose HTTP, and paste:
            </p>
            <CodeBlock code={MCP_URL} language="server url" />
          </div>
        )}

        {active === "claude" && (
          <div role="tabpanel" id="mcp-panel-claude" aria-labelledby="mcp-tab-claude" className="space-y-4">
            <p className="text-[12px] font-mono uppercase tracking-[0.18em] text-muted-foreground mt-2 mb-0">
              If you're in a terminal
            </p>
            <CodeBlock code={CLAUDE_CMD} language="terminal" />

            <p className="text-[12px] font-mono uppercase tracking-[0.18em] text-muted-foreground mt-6 mb-0">
              If you're already inside Claude Code — just paste this prompt
            </p>
            <CodeBlock code={CLAUDE_AGENT_PROMPT} language="prompt" />

            <p className="text-foreground/70">
              After installing, restart Claude Code (or run{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[13px]">/mcp</code> in the menu) for the
              config to take effect.
            </p>
          </div>
        )}

        {active === "chatgpt" && (
          <div role="tabpanel" id="mcp-panel-chatgpt" aria-labelledby="mcp-tab-chatgpt" className="space-y-4">
            <p>
              ChatGPT (Plus, Pro, Business, or Enterprise) supports MCP via{" "}
              <strong>Settings → Connectors → New Connector</strong>. Paste the URL below as the connector endpoint:
            </p>
            <CodeBlock code={MCP_URL} language="connector endpoint" />
            <p>
              For agent frameworks built on OpenAI, use the{" "}
              <a
                href="https://github.com/openai/openai-agents-python"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                OpenAI Agents SDK
              </a>{" "}
              with its native MCP client.
            </p>
          </div>
        )}

        {active === "other" && (
          <div role="tabpanel" id="mcp-panel-other" aria-labelledby="mcp-tab-other" className="space-y-4">
            <p>
              The server speaks standard MCP Streamable HTTP, so every compliant client works. Add{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[13px]">{MCP_URL}</code> in:
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-[14px]">
                <thead className="bg-muted/40 text-left">
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Client</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Where</th>
                  </tr>
                </thead>
                <tbody className="[&>tr]:border-b [&>tr]:border-border [&>tr:last-child]:border-0">
                  <tr>
                    <td className="px-4 py-3 align-top font-medium">Claude Desktop</td>
                    <td className="px-4 py-3 align-top text-foreground/80">
                      <code className="font-mono text-[12.5px]">claude_desktop_config.json</code>
                      <div className="text-[12.5px] text-muted-foreground mt-1">
                        macOS: <code className="font-mono">~/Library/Application Support/Claude/</code> ·
                        Windows: <code className="font-mono">%APPDATA%\Claude\</code> ·
                        Linux: <code className="font-mono">~/.config/Claude/</code>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 align-top font-medium">Windsurf</td>
                    <td className="px-4 py-3 align-top text-foreground/80">Settings → MCP Servers → Add Server</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 align-top font-medium">Zed</td>
                    <td className="px-4 py-3 align-top text-foreground/80">
                      <code className="font-mono text-[12.5px]">~/.config/zed/settings.json</code> →{" "}
                      <code className="font-mono text-[12.5px]">context_servers</code>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 align-top font-medium">Continue</td>
                    <td className="px-4 py-3 align-top text-foreground/80">
                      <code className="font-mono text-[12.5px]">~/.continue/config.json</code> →{" "}
                      <code className="font-mono text-[12.5px]">mcpServers</code>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 align-top font-medium">LangChain · LlamaIndex · Agno · CrewAI</td>
                    <td className="px-4 py-3 align-top text-foreground/80">each framework's MCP client adapter with the URL above</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>Claude Desktop example (same JSON as Cursor):</p>
            <CodeBlock code={JSON_CONFIG} language="claude_desktop_config.json" />
          </div>
        )}
      </div>

      {/* Verify it worked — always visible */}
      <div className="not-prose mt-8 rounded-xl border border-primary/30 bg-primary/[0.04] p-5 md:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80 mb-2 font-body">
          Verify it works
        </p>
        <CodeBlock code={VERIFY_PROMPT} language="ask your agent" />
        <CodeBlock code={VERIFY_RESPONSE} language="response · excerpt" />
        <p className="text-[14.5px] text-foreground/80 font-body leading-relaxed mt-3">
          The response carries <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[12.5px]">_meta.uor.passport</code> — a 256-bit SHA-256 fingerprint of the canonicalized response — and{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[12.5px]">_meta.uor.mcps.receipt</code>, an Ed25519 signature that verifies locally with its embedded public key. <strong>No PKI, no registry, no third party.</strong>
        </p>
      </div>
    </div>
  );
};

export default McpInstallTabs;