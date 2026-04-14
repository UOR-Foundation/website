import { useState, useCallback } from "react";
import { Play, Loader2, Copy, Check, ChevronDown } from "lucide-react";
import { MCP_URL, UOR_API_KEY } from "../data/clients";

/* ── Tool definitions with example inputs ─────────────────────────── */

interface ToolDef {
  name: string;
  label: string;
  fields: FieldDef[];
}

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "json";
  default: string;
  options?: string[];
  placeholder?: string;
}

const TOOLS: ToolDef[] = [
  {
    name: "uor_derive",
    label: "Derive",
    fields: [
      { key: "term", label: "Expression", type: "text", default: "neg(42)", placeholder: 'e.g. neg(42), add(10,20)' },
    ],
  },
  {
    name: "uor_verify",
    label: "Verify",
    fields: [
      { key: "derivation_id", label: "Derivation ID", type: "text", default: "", placeholder: "Paste a derivation_id from a derive result" },
    ],
  },
  {
    name: "uor_query",
    label: "Query",
    fields: [
      { key: "sparql", label: "SPARQL Query", type: "text", default: "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 5", placeholder: "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 5" },
    ],
  },
  {
    name: "uor_correlate",
    label: "Correlate",
    fields: [
      { key: "a", label: "Value A", type: "number", default: "7" },
      { key: "b", label: "Value B", type: "number", default: "13" },
    ],
  },
  {
    name: "uor_partition",
    label: "Partition",
    fields: [
      { key: "seed_set", label: "Seed set (comma-separated)", type: "text", default: "6,10,15", placeholder: "6,10,15" },
      { key: "closure_mode", label: "Closure mode", type: "select", default: "none", options: ["none", "oneStep", "full"] },
    ],
  },
  {
    name: "uor_resolve",
    label: "Resolve",
    fields: [
      { key: "value", label: "Value (0–255)", type: "number", default: "42", placeholder: "0–255" },
    ],
  },
  {
    name: "uor_certify",
    label: "Certify",
    fields: [
      { key: "derivation_id", label: "Derivation ID", type: "text", default: "", placeholder: "Paste a derivation_id to certify" },
    ],
  },
  {
    name: "uor_trace",
    label: "Trace",
    fields: [
      { key: "x", label: "Starting value", type: "number", default: "42" },
      { key: "ops", label: "Operations (comma-separated)", type: "text", default: "neg,bnot,succ", placeholder: "neg,bnot,succ" },
    ],
  },
  {
    name: "uor_grade",
    label: "Grade",
    fields: [
      { key: "claim", label: "Claim to grade", type: "text", default: "The sky is blue", placeholder: "Enter any claim" },
    ],
  },
  {
    name: "uor_schema_bridge",
    label: "Schema Bridge",
    fields: [
      { key: "schema_type", label: "Schema.org type", type: "text", default: "Person", placeholder: "e.g. Person, Event, Product" },
      { key: "mode", label: "Mode", type: "select", default: "type", options: ["type", "instance", "catalog"] },
    ],
  },
  {
    name: "uor_schema_coherence",
    label: "Schema Coherence",
    fields: [
      { key: "instances", label: "Instances (JSON array)", type: "json", default: '[{"@type":"Person","name":"Alice","worksFor":"Acme"},{"@type":"Organization","name":"Acme"}]', placeholder: '[{"@type":"Person",...},{"@type":"Organization",...}]' },
    ],
  },
];

/* ── Build the JSON-RPC arguments object from form values ─────────── */

function buildArgs(tool: ToolDef, values: Record<string, string>): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  for (const f of tool.fields) {
    const raw = values[f.key] ?? f.default;
    if (!raw) continue;

    if (f.key === "args") {
      args[f.key] = raw.split(",").map((s) => parseInt(s.trim(), 10));
    } else if (f.key === "seed_set") {
      args[f.key] = raw.split(",").map((s) => parseInt(s.trim(), 10));
    } else if (f.type === "number") {
      args[f.key] = parseInt(raw, 10);
    } else if (f.type === "json") {
      try { args[f.key] = JSON.parse(raw); } catch { args[f.key] = raw; }
    } else {
      args[f.key] = raw;
    }
  }
  return args;
}

/* ── Component ────────────────────────────────────────────────────── */

const McpPlayground = () => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const tool = TOOLS[selectedIdx];

  const handleSelect = useCallback((idx: number) => {
    setSelectedIdx(idx);
    setValues({});
    setResult(null);
    setError(null);
  }, []);

  const handleChange = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleRun = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const args = buildArgs(tool, values);

    const body = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name: tool.name, arguments: args },
    };

    try {
      const resp = await fetch(`${MCP_URL}/mcp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          apikey: UOR_API_KEY,
        },
        body: JSON.stringify(body),
      });

      const contentType = resp.headers.get("content-type") ?? "";

      if (contentType.includes("text/event-stream")) {
        // SSE — collect all data lines
        const text = await resp.text();
        const lines = text.split("\n").filter((l) => l.startsWith("data: "));
        const parsed = lines.map((l) => {
          try { return JSON.parse(l.slice(6)); } catch { return l.slice(6); }
        });
        setResult(JSON.stringify(parsed.length === 1 ? parsed[0] : parsed, null, 2));
      } else {
        const data = await resp.json();
        setResult(JSON.stringify(data, null, 2));
      }
    } catch (err: any) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }, [tool, values]);

  const handleCopy = useCallback(() => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [result]);

  return (
    <div className="space-y-6">
      {/* Tool selector + fields row */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Tool selector */}
        <div className="relative shrink-0">
          <label className="block text-xs font-medium text-muted-foreground font-body mb-1.5">Tool</label>
          <div className="relative">
            <select
              value={selectedIdx}
              onChange={(e) => handleSelect(Number(e.target.value))}
              className="appearance-none w-full md:w-48 rounded-lg border border-border bg-muted/40 px-3 py-2.5 pr-8 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {TOOLS.map((t, i) => (
                <option key={t.name} value={i}>{t.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Input fields */}
        <div className="flex flex-wrap gap-3 flex-1 items-end">
          {tool.fields.map((f) => (
            <div key={f.key} className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-muted-foreground font-body mb-1.5">
                {f.label}
              </label>
              {f.type === "select" ? (
                <div className="relative">
                  <select
                    value={values[f.key] ?? f.default}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    className="appearance-none w-full rounded-lg border border-border bg-muted/40 px-3 py-2.5 pr-8 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {f.options?.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              ) : (
                <input
                  type={f.type === "number" ? "number" : "text"}
                  value={values[f.key] ?? f.default}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              )}
            </div>
          ))}

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={loading}
            className="shrink-0 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-body disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" /> Running…</>
            ) : (
              <><Play size={14} /> Run</>
            )}
          </button>
        </div>
      </div>

      {/* Result / Error */}
      {(result || error) && (
        <div className="relative rounded-lg bg-muted/60 border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40">
            <span className="text-xs font-mono text-muted-foreground">
              {error ? "Error" : "Response"}
            </span>
            {result && (
              <button
                onClick={handleCopy}
                className="shrink-0 rounded text-muted-foreground hover:text-foreground transition-colors p-1.5"
                aria-label="Copy result"
              >
                {copied ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
              </button>
            )}
          </div>
          <pre className={`p-4 text-sm font-mono leading-relaxed overflow-x-auto max-h-[400px] overflow-y-auto ${
            error ? "text-destructive" : "text-foreground"
          }`}>
            {error || result}
          </pre>
        </div>
      )}
    </div>
  );
};

export default McpPlayground;
