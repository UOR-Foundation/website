import { useState } from "react";
import { ExternalLink, ChevronRight, ShieldCheck } from "lucide-react";
import CopyButton from "./CopyButton";
import { MCP_CLIENTS, MCP_CONFIG, MCP_URL } from "../data/clients";

const TROUBLESHOOTING = [
  "Restart your client after saving the config — tools won't appear until you do.",
  "Make sure the URL starts with https:// and has no trailing spaces.",
  "If tools still don't load, check your client's MCP log for connection errors.",
];

const McpClientTabs = () => {
  const [active, setActive] = useState(0);
  const [showVerify, setShowVerify] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const c = MCP_CLIENTS[active];

  return (
    <div>
      {/* Underlined tab bar */}
      <div className="flex border-b border-border mb-6">
        {MCP_CLIENTS.map((cl, i) => (
          <button
            key={cl.name}
            onClick={() => {
              setActive(i);
              setShowVerify(false);
              setShowTroubleshooting(false);
            }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative font-body ${
              i === active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {cl.name}
            {i === active && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {/* Install button (deep link) */}
        {c.deepLink && (
          <div>
            <a
              href={c.deepLink}
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-body"
            >
              Install in {c.name}
              <ExternalLink size={14} />
            </a>
          </div>
        )}

        {/* Manual config */}
        <div className="space-y-3">
          {c.deepLink ? (
            <p className="text-sm text-muted-foreground font-body">
              Or add manually to{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-foreground">
                {c.configPath?.mac}
              </code>
              :
            </p>
          ) : (
            <>
              <ol className="space-y-2">
                {c.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm font-body text-foreground">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              {c.configPath && (
                <p className="text-sm text-muted-foreground font-body">
                  Config location:{" "}
                  <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-foreground">
                    {c.configPath.mac}
                  </code>
                </p>
              )}
            </>
          )}

          {/* Server URL for clients without config files */}
          {!c.configPath && (
            <div className="relative rounded-lg bg-muted/60 border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40">
                <span className="text-xs font-mono text-muted-foreground">Server URL</span>
                <CopyButton text={MCP_URL} label="Copy" />
              </div>
              <pre className="p-4 text-sm font-mono text-foreground leading-relaxed overflow-x-auto">
                {MCP_URL}
              </pre>
            </div>
          )}

          {/* JSON config block for clients with config files */}
          {c.configPath && (
            <div className="relative rounded-lg bg-muted/60 border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40">
                <span className="text-xs font-mono text-muted-foreground">mcp.json</span>
                <CopyButton text={MCP_CONFIG} label="Copy" />
              </div>
              <pre className="p-4 text-sm font-mono text-foreground leading-relaxed overflow-x-auto">
                {MCP_CONFIG}
              </pre>
            </div>
          )}
        </div>

        {/* Collapsible: Verify it works */}
        <button
          onClick={() => setShowVerify(!showVerify)}
          className="flex items-center gap-2 text-sm font-medium text-foreground font-body hover:text-primary transition-colors"
        >
          <ChevronRight
            size={14}
            className={`transition-transform ${showVerify ? "rotate-90" : ""}`}
          />
          Verify it works
        </button>
        {showVerify && (
          <div className="pl-6 space-y-3 text-sm font-body text-muted-foreground">
            <p>Paste this into your AI client:</p>
            <div className="flex items-center gap-2">
              <code className="bg-muted px-2.5 py-1.5 rounded text-foreground font-mono text-sm">
                What is 6 × 7? Derive the answer.
              </code>
              <CopyButton text="What is 6 × 7? Derive the answer." label="Copy" />
            </div>
            <p>
              You should get{" "}
              <code className="bg-muted px-1 py-0.5 rounded font-mono text-xs text-foreground">42</code>{" "}
              with a derivation ID, proof hash, and trust grade.
            </p>
          </div>
        )}

        {/* Collapsible: Troubleshooting */}
        <button
          onClick={() => setShowTroubleshooting(!showTroubleshooting)}
          className="flex items-center gap-2 text-sm font-medium text-foreground font-body hover:text-primary transition-colors"
        >
          <ChevronRight
            size={14}
            className={`transition-transform ${showTroubleshooting ? "rotate-90" : ""}`}
          />
          Troubleshooting
        </button>
        {showTroubleshooting && (
          <ul className="pl-6 space-y-2 text-sm font-body text-muted-foreground">
            {TROUBLESHOOTING.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Docs link */}
        <a
          href={c.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-body text-primary hover:underline"
        >
          {c.name} MCP documentation <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
};

export default McpClientTabs;
