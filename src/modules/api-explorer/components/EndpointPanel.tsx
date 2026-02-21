import { useState, useCallback } from "react";
import { ChevronDown, Play, Loader2 } from "lucide-react";
import type { Endpoint } from "@/modules/api-explorer/types";
import { CopyButton } from "./CopyButton";
import { API_BASE_URL } from "@/data/api-layers";

const RUNTIME_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "erwfuxphwcvynxhfbvql"}.supabase.co/functions/v1/uor-api`;

function highlightJson(json: string): string {
  return json
    .replace(/("(?:[^"\\]|\\.)*")(\s*:)/g, '<span class="json-key">$1</span>$2')
    .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="json-string">$1</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>')
    .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');
}

function MethodBadge({ method }: { method: "GET" | "POST" }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wide ${
      method === "GET"
        ? "bg-primary/10 text-primary border border-primary/20"
        : "bg-accent/10 text-accent border border-accent/20"
    }`}>
      {method}
    </span>
  );
}

function ResponseBadge({ code }: { code: number }) {
  const color =
    code === 200 ? "text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20"
    : code === 429 || code === 413 || code === 415 ? "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20"
    : code >= 500 ? "text-destructive border-destructive/30 bg-destructive/5"
    : "text-destructive border-destructive/20 bg-destructive/5";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${color}`}>
      {code}
    </span>
  );
}

export function EndpointPanel({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, string>>(
    Object.fromEntries(ep.params.filter(p => p.in === "query" && p.default).map(p => [p.name, p.default!]))
  );
  const [bodyValue, setBodyValue] = useState(ep.defaultBody ?? "");

  const buildUrl = useCallback(() => {
    const qp = ep.params
      .filter(p => p.in === "query")
      .map(p => [p.name, paramValues[p.name] ?? ""] as [string, string])
      .filter(([, v]) => v !== "");
    const qs = new URLSearchParams(qp).toString();
    return `${API_BASE_URL}${ep.path}${qs ? `?${qs}` : ""}`;
  }, [ep, paramValues]);

  const buildRuntimeUrl = useCallback(() => {
    const qp = ep.params
      .filter(p => p.in === "query")
      .map(p => [p.name, paramValues[p.name] ?? ""] as [string, string])
      .filter(([, v]) => v !== "");
    const qs = new URLSearchParams(qp).toString();
    return `${RUNTIME_BASE}${ep.path}${qs ? `?${qs}` : ""}`;
  }, [ep, paramValues]);

  const curlCmd = ep.method === "GET"
    ? `curl "${buildUrl()}"`
    : `curl -X POST "${API_BASE_URL}${ep.path}" \\\n  -H "Content-Type: application/json" \\\n  -d '${ep.defaultBody ?? "{}"}'`;

  async function run() {
    setOpen(true);
    setLoading(true);
    setResponse(null);
    try {
      const opts: RequestInit = { method: ep.method, headers: { "Content-Type": "application/json" } };
      if (ep.method === "POST" && bodyValue) opts.body = bodyValue;
      const res = await fetch(buildRuntimeUrl(), opts);
      const json = await res.json();
      setResponse(JSON.stringify(json, null, 2));
    } catch (e: unknown) {
      setResponse(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoading(false);
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Header row */}
      <div className="flex items-center gap-3 px-5 py-4">
        <MethodBadge method={ep.method} />
        <code className="font-mono text-sm text-muted-foreground">{ep.path}</code>
        <button
          onClick={run}
          className="ml-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
          Run
        </button>
        <button
          onClick={() => setOpen(o => !o)}
          className="shrink-0 p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          <ChevronDown size={16} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Expandable body */}
      <div className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="px-5 pb-5 space-y-5 border-t border-border pt-5">
            {/* Label + explanation */}
            <div>
              <h4 className="text-base font-semibold text-foreground mb-1.5">{ep.label}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{ep.explanation}</p>
              <p className="text-sm text-primary/70 font-medium mt-2 leading-relaxed">{ep.useCase}</p>
            </div>

            {/* Query params */}
            {ep.params.filter(p => p.in === "query").length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Parameters</p>
                <div className="space-y-2">
                  {ep.params.filter(p => p.in === "query").map(p => (
                    <div key={p.name} className="flex items-start gap-3 text-sm">
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5 min-w-[120px]">
                        <code className="font-mono text-foreground">{p.name}</code>
                        {p.required && <span className="text-[9px] font-bold text-destructive">REQ</span>}
                      </div>
                      <input
                        type="text"
                        value={paramValues[p.name] ?? ""}
                        onChange={e => setParamValues(prev => ({ ...prev, [p.name]: e.target.value }))}
                        placeholder={p.default ?? ""}
                        className="w-24 bg-background border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <p className="text-muted-foreground leading-relaxed flex-1">{p.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* POST body editor */}
            {ep.method === "POST" && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Request body (JSON)</p>
                <textarea
                  value={bodyValue}
                  onChange={e => setBodyValue(e.target.value)}
                  rows={4}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            )}

            {/* curl */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">curl</p>
                <CopyButton text={curlCmd} />
              </div>
              <pre className="bg-[hsl(220,18%,6%)] text-[hsl(152,34%,60%)] text-sm rounded-lg px-4 py-3 overflow-x-auto font-mono leading-relaxed">{curlCmd}</pre>
            </div>

            {/* Run + response codes */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={run}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-60"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                {loading ? "Running…" : "Run live"}
              </button>
              <div className="flex items-center gap-1.5 flex-wrap">
                {ep.responseCodes.map(c => <ResponseBadge key={c} code={c} />)}
              </div>
              {response && (
                <button onClick={() => setResponse(null)} className="text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto">
                  Clear
                </button>
              )}
            </div>

            {/* Live response */}
            {response && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Response</p>
                  <CopyButton text={response} />
                </div>
                <pre
                  className="bg-[hsl(220,18%,6%)] text-sm rounded-lg px-4 py-3 overflow-x-auto font-mono leading-relaxed max-h-72 overflow-y-auto json-response"
                  dangerouslySetInnerHTML={{ __html: highlightJson(response) }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
