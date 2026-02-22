import { useState } from "react";
import { ExternalLink, ChevronDown, ShieldCheck } from "lucide-react";
import CopyButton from "./CopyButton";
import { MCP_CLIENTS, MCP_CONFIG, MCP_URL } from "../data/clients";

const RULES_BASE = "https://uor.foundation";

const CLIENT_RULES: Record<string, { url: string; filename: string; installPath: string; instructions: string[] }> = {
  "Cursor": {
    url: `${RULES_BASE}/cursor-rules/uor-trust-stamp.mdc`,
    filename: "uor-trust-stamp.mdc",
    installPath: ".cursor/rules/uor-trust-stamp.mdc",
    instructions: [
      "Download the rule file below.",
      "Save it to <code>.cursor/rules/uor-trust-stamp.mdc</code> in your project.",
      "Every response will now include a trust score — Grade D for unverified answers, Grade A–B for proven computations.",
    ],
  },
  "Windsurf": {
    url: `${RULES_BASE}/rules/uor-trust-stamp-windsurf.md`,
    filename: "uor-trust-stamp-windsurf.md",
    installPath: ".windsurfrules (project root)",
    instructions: [
      "Download the rule file below.",
      "Copy the contents into your project's <code>.windsurfrules</code> file at the root (create it if it doesn't exist).",
      "Every Windsurf response will now include a trust score.",
    ],
  },
  "VS Code": {
    url: `${RULES_BASE}/rules/uor-trust-stamp-vscode.md`,
    filename: "uor-trust-stamp-vscode.md",
    installPath: ".github/copilot-instructions.md",
    instructions: [
      "Download the rule file below.",
      "Copy the contents into <code>.github/copilot-instructions.md</code> in your project (create it if it doesn't exist).",
      "VS Code Copilot Chat will now include a trust score on every response.",
    ],
  },
  "Claude Desktop": {
    url: `${RULES_BASE}/cursor-rules/uor-trust-stamp.mdc`,
    filename: "uor-trust-stamp.mdc",
    installPath: "Loaded automatically via MCP instructions",
    instructions: [
      "Claude Desktop reads the MCP server instructions automatically — <strong>no extra file needed</strong>.",
      "If you don't see trust stamps, restart Claude Desktop after adding the UOR MCP server.",
      "Every response will include a trust score as long as the UOR MCP server is connected.",
    ],
  },
};

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

            {/* ── Trust Stamp Enforcement (all clients) ── */}
            {CLIENT_RULES[c.name] && (
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-primary" />
                  <p className="text-sm font-body font-medium text-foreground">
                    Enforce trust stamps on every response
                  </p>
                </div>
                <p className="text-sm font-body text-muted-foreground leading-relaxed">
                  By default, {c.name} may only show the UOR Trust Score when a UOR tool is called.
                  To ensure <strong>every</strong> response ends with a trust scorecard:
                </p>
                <ol className="space-y-2">
                  {CLIENT_RULES[c.name].instructions.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                      <p className="text-sm font-body text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: step }} />
                    </li>
                  ))}
                </ol>
                {c.name !== "Claude Desktop" && (
                  <div className="flex items-center gap-3">
                    <a
                      href={CLIENT_RULES[c.name].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors border border-border"
                    >
                      Download {CLIENT_RULES[c.name].filename}
                      <ExternalLink size={13} />
                    </a>
                  </div>
                )}
                <p className="text-xs text-muted-foreground font-mono bg-muted/30 rounded-lg px-3 py-2">
                  Install to: {CLIENT_RULES[c.name].installPath}
                </p>
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


            {/* ── Trust Stamp Enforcement (non-deep-link clients) ── */}
            {CLIENT_RULES[c.name] && (
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-primary" />
                  <p className="text-sm font-body font-medium text-foreground">
                    Enforce trust stamps on every response
                  </p>
                </div>
                <p className="text-sm font-body text-muted-foreground leading-relaxed">
                  By default, {c.name} may only show the UOR Trust Score when a UOR tool is called.
                  To ensure <strong>every</strong> response ends with a trust scorecard:
                </p>
                <ol className="space-y-2">
                  {CLIENT_RULES[c.name].instructions.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                      <p className="text-sm font-body text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: step }} />
                    </li>
                  ))}
                </ol>
                {c.name !== "Claude Desktop" && (
                  <div className="flex items-center gap-3">
                    <a
                      href={CLIENT_RULES[c.name].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors border border-border"
                    >
                      Download {CLIENT_RULES[c.name].filename}
                      <ExternalLink size={13} />
                    </a>
                  </div>
                )}
                <p className="text-xs text-muted-foreground font-mono bg-muted/30 rounded-lg px-3 py-2">
                  Install to: {CLIENT_RULES[c.name].installPath}
                </p>
              </div>
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
