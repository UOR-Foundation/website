import { useState } from "react";
import { ExternalLink } from "lucide-react";
import CopyButton from "./CopyButton";
import { MCP_CLIENTS, MCP_CONFIG, MCP_URL } from "../data/clients";

const SetupGuide = () => {
  const [active, setActive] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const c = MCP_CLIENTS[active];
  const isClaude = active === 0;

  return (
    <div>
      {/* Client tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {MCP_CLIENTS.map((cl, i) => (
          <button
            key={cl.name}
            onClick={() => {
              setActive(i);
              setShowFallback(false);
            }}
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
              {(isClaude && showFallback ? c.fallbackSteps : c.steps)!.map(
                (step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm md:text-base font-body text-foreground leading-relaxed">
                      {step}
                    </p>
                  </li>
                ),
              )}
            </ol>

            {/* Config block */}
            <div className="bg-muted/50 rounded-xl p-4 overflow-x-auto">
              <pre className="text-sm font-mono text-foreground leading-relaxed">
                {MCP_CONFIG}
              </pre>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <CopyButton text={MCP_CONFIG} label="Copy config" large />
              <CopyButton text={MCP_URL} label="Copy URL" />
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
          <p className="text-sm font-body text-foreground font-medium mb-1">
            Verify it works
          </p>
          <p className="text-sm font-body text-muted-foreground leading-relaxed">
            Type{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-xs">
              derive 42
            </code>{" "}
            in your chat. If you see a derivation ID, you're connected.
          </p>
        </div>

        {/* Merging note */}
        <details className="text-sm font-body text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground transition-colors">
            Already have other MCP servers configured?
          </summary>
          <p className="mt-2 leading-relaxed pl-1">
            Add the{" "}
            <code className="bg-muted px-1 py-0.5 rounded font-mono text-xs text-foreground">
              "uor"
            </code>{" "}
            key inside your existing{" "}
            <code className="bg-muted px-1 py-0.5 rounded font-mono text-xs text-foreground">
              mcpServers
            </code>{" "}
            object. Don't replace the whole file — just merge.
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
};

export default SetupGuide;
