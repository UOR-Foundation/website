import { useState } from "react";
import { ExternalLink, ChevronDown, ShieldCheck } from "lucide-react";
import CopyButton from "./CopyButton";
import { MCP_CLIENTS, MCP_CONFIG, MCP_URL } from "../data/clients";

const CURSOR_RULES_URL = "https://uor.foundation/cursor-rules/uor-trust-stamp.mdc";

const CURSOR_RULES_SNIPPET = `# Add to your project's .cursor/rules directory
# Download from: ${CURSOR_RULES_URL}
#
# This rule ensures every Cursor response includes a UOR PRISM Trust Score,
# even when no UOR tool is called (self-assigns Grade D for training-data answers).`;

const VALUE_STATEMENTS: Record<string, string> = {
  "Claude Desktop": "Add verifiable, content-addressed computation to Claude.",
  Cursor: "Add UOR tools to Cursor for verifiable, content-addressed computation.",
  Windsurf: "Bring deterministic derivations into your Windsurf workflow.",
  "VS Code": "Connect VS Code Copilot to UOR for structured, traceable outputs.",
};

const TROUBLESHOOTING = [
  "Restart your client after saving the config — tools won't appear until you do.",
  "Make sure the URL starts with https:// and has no trailing spaces.",
  "If tools still don't load, check your client's MCP log for connection errors.",
];

const SetupGuide = () => {
  const [active, setActive] = useState(0);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const c = MCP_CLIENTS[active];

  return (
    <div>
      {/* Client tabs */}
      <div className="flex flex-wrap gap-2 mb-2">
        {MCP_CLIENTS.map((cl, i) => (
          <button
            key={cl.name}
            onClick={() => {
              setActive(i);
              setShowTroubleshooting(false);
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

      {/* Value statement */}
      <p className="text-sm text-muted-foreground font-body mb-5">
        {VALUE_STATEMENTS[c.name]}
      </p>

      <div className="rounded-2xl border border-border bg-card p-5 md:p-7 space-y-5">
        {/* ── Deep link (if available) ── */}
        {c.deepLink && (
          <div className="space-y-5">
            <div className="space-y-2">
              <a
                href={c.deepLink}
                className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-body shadow-sm"
              >
                Install in {c.name}
                <ExternalLink size={15} />
              </a>
              <p className="text-sm text-muted-foreground font-body">
                Click to install automatically. No config files needed.
              </p>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-sm font-body text-muted-foreground">
                Or configure manually:
              </p>
              <ol className="space-y-2.5">
                {c.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm font-body text-foreground leading-relaxed">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
              <div className="relative bg-muted/50 rounded-xl p-4 overflow-x-auto">
                <pre className="text-sm font-mono text-foreground leading-relaxed pr-20">
                  {MCP_CONFIG}
                </pre>
                <div className="absolute top-3 right-3">
                  <CopyButton text={MCP_CONFIG} label="Copy" />
                </div>
              </div>
              {c.configPath && (
                <p className="text-xs text-muted-foreground font-mono bg-muted/30 rounded-lg px-3 py-2">
                  Save to: {c.configPath.mac}
                </p>
              )}
            </div>

            {/* ── Cursor Rules (Cursor only) ── */}
            {c.name === "Cursor" && (
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-primary" />
                  <p className="text-sm font-body font-medium text-foreground">
                    Enforce trust stamps on every response
                  </p>
                </div>
                <p className="text-sm font-body text-muted-foreground leading-relaxed">
                  By default, Cursor only appends the UOR Trust Score when it calls a UOR tool.
                  To ensure <strong>every</strong> response gets a trust stamp — even plain-text answers —
                  add this Cursor Rule to your project:
                </p>
                <ol className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">1</span>
                    <p className="text-sm font-body text-foreground leading-relaxed">
                      Download the rule file: <a href={CURSOR_RULES_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">uor-trust-stamp.mdc</a>
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">2</span>
                    <p className="text-sm font-body text-foreground leading-relaxed">
                      Save it to <code className="bg-muted px-1 py-0.5 rounded font-mono text-xs">.cursor/rules/uor-trust-stamp.mdc</code> in your project.
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">3</span>
                    <p className="text-sm font-body text-foreground leading-relaxed">
                      Every response will now include a trust score — Grade D for unverified answers, Grade A for proven computations.
                    </p>
                  </li>
                </ol>
                <div className="relative bg-muted/50 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-sm font-mono text-foreground leading-relaxed pr-20">{CURSOR_RULES_SNIPPET}</pre>
                  <div className="absolute top-3 right-3">
                    <CopyButton text={CURSOR_RULES_SNIPPET} label="Copy" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Manual steps (no deep link) ── */}
        {!c.deepLink && (
          <>
            <ol className="space-y-2.5">
              {c.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm font-body text-foreground leading-relaxed">
                    {step}
                  </p>
                </li>
              ))}
            </ol>

            <div className="relative bg-muted/50 rounded-xl p-4 overflow-x-auto">
              <pre className="text-sm font-mono text-foreground leading-relaxed pr-20">
                {MCP_CONFIG}
              </pre>
              <div className="absolute top-3 right-3">
                <CopyButton text={MCP_CONFIG} label="Copy" />
              </div>
            </div>

            {c.configPath && (
              <p className="text-xs text-muted-foreground font-mono bg-muted/30 rounded-lg px-3 py-2">
                Save to: {c.configPath.mac}
              </p>
            )}
          </>
        )}

        {/* ── Verify ── */}
        <div className="border-t border-border pt-5">
          <p className="text-sm font-body text-foreground font-medium mb-2">
            Try it
          </p>
          <div className="flex items-center gap-2 mb-1.5">
            <code className="bg-muted px-2 py-1 rounded text-foreground font-mono text-sm">
              What is 6 × 7? Derive the answer.
            </code>
            <CopyButton text="What is 6 × 7? Derive the answer." label="Copy" />
          </div>
          <p className="text-sm font-body text-muted-foreground leading-relaxed">
            You'll get{" "}
            <code className="bg-muted px-1 py-0.5 rounded font-mono text-xs text-foreground">
              42
            </code>
            {" "}— plus a permanent ID and a proof trail. Anyone can verify this result independently, on any machine, without trusting the AI that produced it.
          </p>
        </div>

        {/* ── Merging FAQ ── */}
        <details className="text-sm font-body text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground transition-colors">
            Already have other MCP servers configured?
          </summary>
          <p className="mt-2 leading-relaxed pl-1">
            Merge the{" "}
            <code className="bg-muted px-1 py-0.5 rounded font-mono text-xs text-foreground">
              "uor"
            </code>{" "}
            key into your existing{" "}
            <code className="bg-muted px-1 py-0.5 rounded font-mono text-xs text-foreground">
              mcpServers
            </code>{" "}
            object. Don't replace the whole file.
          </p>
        </details>

        {/* ── Troubleshooting ── */}
        <details className="text-sm font-body text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground transition-colors">
            Troubleshooting
          </summary>
          <ul className="mt-2 space-y-1.5 pl-1">
            {TROUBLESHOOTING.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 shrink-0" />
                <span className="leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </details>

        {/* ── Docs link ── */}
        <a
          href={c.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-body text-primary hover:underline"
        >
          Full {c.name} guide <ExternalLink size={13} />
        </a>
      </div>

      <p className="text-sm font-body text-muted-foreground mt-4">
        No API keys. No accounts. No setup files to manage.
      </p>
    </div>
  );
};

export default SetupGuide;
