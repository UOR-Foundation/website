import { useState } from "react";
import Layout from "@/modules/core/components/Layout";
import { Play, Copy, Loader2 } from "lucide-react";

const API = "https://api.uor.foundation/v1";

const ENDPOINTS = [
  { path: "/kernel/schema/datum", params: [{ name: "x", default: "42" }, { name: "n", default: "8" }], method: "GET" },
  { path: "/kernel/schema/triad", params: [{ name: "x", default: "42" }, { name: "n", default: "8" }], method: "GET" },
  { path: "/bridge/resolver", params: [{ name: "x", default: "42" }], method: "GET" },
  { path: "/bridge/trace", params: [{ name: "x", default: "42" }, { name: "ops", default: "neg,bnot" }], method: "GET" },
  { path: "/bridge/derivation", params: [{ name: "x", default: "42" }], method: "GET" },
  { path: "/bridge/emit", params: [{ name: "n", default: "8" }, { name: "limit", default: "4" }], method: "GET" },
];

const FORMATS = [
  { label: "JSON-LD", accept: "application/ld+json", ct: "application/json" },
  { label: "Turtle", accept: "text/turtle", ct: "text/turtle" },
  { label: "N-Triples", accept: "application/n-triples", ct: "application/n-triples" },
];

export default function FormatsPage() {
  const [endpoint, setEndpoint] = useState(0);
  const [format, setFormat] = useState(0);
  const [params, setParams] = useState<Record<string, string>>(
    Object.fromEntries(ENDPOINTS[0].params.map((p) => [p.name, p.default]))
  );
  const [result, setResult] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectEndpoint(i: number) {
    setEndpoint(i);
    setParams(Object.fromEntries(ENDPOINTS[i].params.map((p) => [p.name, p.default])));
    setResult(null);
    setContentType(null);
  }

  async function fetchData() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const ep = ENDPOINTS[endpoint];
      const qs = new URLSearchParams(params).toString();
      const url = `${API}${ep.path}?${qs}`;
      const res = await fetch(url, {
        headers: { Accept: FORMATS[format].accept },
      });
      const ct = res.headers.get("Content-Type") || "unknown";
      setContentType(ct);
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      setResult(text);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold text-foreground mb-3">Content Formats</h1>
          <p className="text-muted-foreground text-lg mb-10">
            Content-type negotiation via <code>Accept</code> header. 6 endpoints support JSON-LD, Turtle, and N-Triples.
          </p>

          <div className="bg-card border border-border rounded-lg p-5 mb-8">
            {/* Endpoint selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">Endpoint</label>
              <div className="flex flex-wrap gap-2">
                {ENDPOINTS.map((ep, i) => (
                  <button
                    key={i}
                    onClick={() => selectEndpoint(i)}
                    className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                      endpoint === i
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {ep.path}
                  </button>
                ))}
              </div>
            </div>

            {/* Params */}
            <div className="flex flex-wrap gap-3 mb-4">
              {ENDPOINTS[endpoint].params.map((p) => (
                <label key={p.name} className="text-sm text-foreground">
                  {p.name}
                  <input
                    value={params[p.name] || ""}
                    onChange={(e) => setParams({ ...params, [p.name]: e.target.value })}
                    className="ml-2 w-24 bg-background border border-border rounded px-2 py-1 text-sm text-foreground"
                  />
                </label>
              ))}
            </div>

            {/* Format toggle */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium text-foreground">Format:</span>
              {FORMATS.map((f, i) => (
                <label key={i} className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer">
                  <input
                    type="radio" name="format" checked={format === i}
                    onChange={() => setFormat(i)}
                    className="accent-primary"
                  />
                  {f.label}
                </label>
              ))}
            </div>

            {/* Fetch */}
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData} disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 text-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Fetch
              </button>
              <span className="text-xs text-muted-foreground font-mono">
                Accept: {FORMATS[format].accept}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm mb-6">
              {error}
            </div>
          )}

          {result && (
            <div className="relative">
              {contentType && (
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Content-Type received:</span>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded text-foreground">{contentType}</code>
                </div>
              )}
              <button
                onClick={() => navigator.clipboard.writeText(result)}
                className="absolute top-10 right-2 p-1.5 text-muted-foreground hover:text-foreground z-10"
                title="Copy"
              >
                <Copy className="w-4 h-4" />
              </button>
              <pre className="bg-card border border-border rounded-lg p-4 text-xs overflow-x-auto text-foreground max-h-[60vh] overflow-y-auto">
                {result}
              </pre>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
