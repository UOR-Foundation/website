import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { ChevronRight, Terminal, Zap, Shield, BookOpen, ExternalLink, Copy, Check, Play, Loader2 } from "lucide-react";

const BASE = "https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api";

type SpaceKey = "kernel" | "bridge" | "user";

interface Endpoint {
  operationId: string;
  method: "GET" | "POST";
  path: string;
  summary: string;
  description: string;
  namespace: string;
  params?: Record<string, string>;
  defaultParams?: Record<string, string>;
  body?: string;
  defaultBody?: string;
  example?: string;
}

const SPACES: Record<SpaceKey, { label: string; color: string; badge: string; description: string; namespaces: string[] }> = {
  kernel: {
    label: "Kernel",
    color: "text-primary",
    badge: "bg-primary/10 text-primary border-primary/20",
    description: "Core ring algebra — R_n = Z/(2^n)Z. Verifiable mathematics with no external dependencies.",
    namespaces: ["u:", "schema:", "op:"],
  },
  bridge: {
    label: "Bridge",
    color: "text-accent",
    badge: "bg-accent/10 text-accent border-accent/20",
    description: "Verification, proof, and certification layers. Structural guarantees across all 2^n elements.",
    namespaces: ["partition:", "proof:", "cert:", "observable:", "derivation:", "trace:", "resolver:"],
  },
  user: {
    label: "User",
    color: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground border-border",
    description: "Type system and application layer. Runtime type declarations mapped to ring operations.",
    namespaces: ["type:", "morphism:", "state:"],
  },
};

const ENDPOINTS: Record<SpaceKey, Endpoint[]> = {
  kernel: [
    {
      operationId: "opVerifyCriticalIdentity",
      method: "GET",
      path: "/kernel/op/verify",
      summary: "Verify critical identity",
      description: "Verify the canonical UOR identity: neg(bnot(x)) = succ(x) for any x in R_n. The mathematical foundation of the entire framework.",
      namespace: "op:",
      params: { x: "integer [0-255]", n: "ring quantum (default 8)" },
      defaultParams: { x: "42" },
      example: `${BASE}/kernel/op/verify?x=42`,
    },
    {
      operationId: "opVerifyAll",
      method: "GET",
      path: "/kernel/op/verify/all",
      summary: "Universal coherence proof",
      description: "Verify neg(bnot(x)) = succ(x) exhaustively for all 2^n elements of R_n. Returns pass count and optional witness data.",
      namespace: "op:",
      params: { n: "ring quantum (default 8)", expand: "true = include witnesses" },
      defaultParams: { n: "8" },
      example: `${BASE}/kernel/op/verify/all?n=8`,
    },
    {
      operationId: "opCompute",
      method: "GET",
      path: "/kernel/op/compute",
      summary: "All ring operations",
      description: "Compute all unary and binary op: operations for x (and y). Returns neg, bnot, succ, pred, add, sub, mul, xor, and, or.",
      namespace: "op:",
      params: { x: "integer [0-255]", y: "integer [0-255]", n: "ring quantum (default 8)" },
      defaultParams: { x: "42", y: "10" },
      example: `${BASE}/kernel/op/compute?x=42&y=10`,
    },
    {
      operationId: "opList",
      method: "GET",
      path: "/kernel/op/operations",
      summary: "All 12 op: named individuals",
      description: "Returns the complete catalogue of all 12 named op: individuals — unary (neg, bnot, succ, pred) and binary (add, sub, mul, xor, and, or) — with their ontology IRIs.",
      namespace: "op:",
      example: `${BASE}/kernel/op/operations`,
    },
    {
      operationId: "addressEncode",
      method: "POST",
      path: "/kernel/address/encode",
      summary: "Encode u:Address",
      description: "Encode a UTF-8 string as a content-derived u:Address using Braille Unicode glyph mapping. Implements u.rs from the kernel namespace.",
      namespace: "u:",
      body: "{ input: string, encoding?: string }",
      defaultBody: JSON.stringify({ input: "hello" }, null, 2),
      example: `${BASE}/kernel/address/encode`,
    },
    {
      operationId: "schemaDatum",
      method: "GET",
      path: "/kernel/schema/datum",
      summary: "Construct schema:Datum",
      description: "Construct the full schema:Datum for any ring value x. Returns value, quantum, stratum (popcount), spectrum (binary), and glyph.",
      namespace: "schema:",
      params: { x: "integer [0-255]", n: "ring quantum (default 8)" },
      defaultParams: { x: "42" },
      example: `${BASE}/kernel/schema/datum?x=42`,
    },
  ],
  bridge: [
    {
      operationId: "partitionResolve",
      method: "POST",
      path: "/bridge/partition",
      summary: "Resolve partition:Partition",
      description: "Classify an input into the four-component partition of R_n: IrreducibleSet, ReducibleSet, UnitSet, ExteriorSet. Cardinalities always sum to 2^n.",
      namespace: "partition:",
      body: '{ type_definition?: string, input?: string, n?: number }',
      defaultBody: JSON.stringify({ input: "hello" }, null, 2),
      example: `${BASE}/bridge/partition`,
    },
    {
      operationId: "proofCriticalIdentity",
      method: "GET",
      path: "/bridge/proof/critical-identity",
      summary: "proof:CriticalIdentityProof",
      description: "Returns a fully structured proof:CriticalIdentityProof with derivation:DerivationTrace — step-by-step algebraic derivation of neg(bnot(x)) = succ(x).",
      namespace: "proof:",
      params: { x: "integer [0-255]", n: "ring quantum (default 8)" },
      defaultParams: { x: "42" },
      example: `${BASE}/bridge/proof/critical-identity?x=42`,
    },
    {
      operationId: "proofCoherence",
      method: "POST",
      path: "/bridge/proof/coherence",
      summary: "proof:CoherenceProof",
      description: "Verify the critical identity exhaustively for a type definition. Returns proof:CoherenceProof with pass rate and witness set.",
      namespace: "proof:",
      body: "{ type_definition?: string, n?: number }",
      defaultBody: JSON.stringify({ type_definition: "U8", n: 8 }, null, 2),
      example: `${BASE}/bridge/proof/coherence`,
    },
    {
      operationId: "certInvolution",
      method: "GET",
      path: "/bridge/cert/involution",
      summary: "cert:InvolutionCertificate",
      description: "Issue a cert:InvolutionCertificate proving that neg or bnot is a self-inverse operation: op(op(x)) = x for all x in R_n.",
      namespace: "cert:",
      params: { operation: "neg | bnot", n: "ring quantum (default 8)" },
      defaultParams: { operation: "neg" },
      example: `${BASE}/bridge/cert/involution?operation=neg`,
    },
    {
      operationId: "observableMetrics",
      method: "GET",
      path: "/bridge/observable/metrics",
      summary: "observable: metrics",
      description: "Compute RingMetric (2-adic valuation), HammingMetric (popcount distance), CascadeLength, and CatastropheThreshold for any x in R_n.",
      namespace: "observable:",
      params: { x: "integer [0-255]", n: "ring quantum (default 8)" },
      defaultParams: { x: "42" },
      example: `${BASE}/bridge/observable/metrics?x=42`,
    },
  ],
  user: [
    {
      operationId: "typeList",
      method: "GET",
      path: "/user/type/primitives",
      summary: "type:PrimitiveType catalogue",
      description: "Returns the complete catalogue of type:PrimitiveType definitions: U1, U4, U8, U16 — plus ProductType, SumType, and ConstrainedType composites.",
      namespace: "type:",
      example: `${BASE}/user/type/primitives`,
    },
  ],
};

const DISCOVERY_CHAIN = [
  { step: 1, label: "Discovery metadata", url: "https://uor.foundation/.well-known/uor.json", note: "JSON-LD org descriptor" },
  { step: 2, label: "Navigation index", url: `${BASE}/navigate`, note: "All endpoints + reading order" },
  { step: 3, label: "OpenAPI 3.1.0 spec", url: "https://uor.foundation/openapi.json", note: "Full machine-readable spec" },
  { step: 4, label: "Quick Card", url: "https://uor.foundation/llms.md", note: "Agent entry point" },
];

function MethodBadge({ method }: { method: "GET" | "POST" }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold ${
      method === "GET"
        ? "bg-primary/10 text-primary border border-primary/20"
        : "bg-accent/10 text-accent border border-accent/20"
    }`}>
      {method}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Copy"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function EndpointCard({ ep, spaceKey }: { ep: Endpoint; spaceKey: SpaceKey }) {
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, string>>(ep.defaultParams ?? {});
  const [bodyValue, setBodyValue] = useState<string>(ep.defaultBody ?? "");
  const space = SPACES[spaceKey];

  async function run() {
    setLoading(true);
    setResponse(null);
    try {
      let url = `${BASE}${ep.path}`;
      if (ep.method === "GET" && Object.keys(paramValues).length > 0) {
        const qs = new URLSearchParams(paramValues).toString();
        if (qs) url += `?${qs}`;
      }
      const opts: RequestInit = {
        method: ep.method,
        headers: { "Content-Type": "application/json" },
      };
      if (ep.method === "POST" && bodyValue) {
        opts.body = bodyValue;
      }
      const res = await fetch(url, opts);
      const json = await res.json();
      setResponse(JSON.stringify(json, null, 2));
    } catch (e: unknown) {
      setResponse(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoading(false);
  }

  const curlCmd = ep.method === "GET"
    ? `curl "${ep.example ?? `${BASE}${ep.path}`}"`
    : `curl -X POST "${BASE}${ep.path}" \\\n  -H "Content-Type: application/json" \\\n  -d '${ep.defaultBody ?? "{}"}'`;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <MethodBadge method={ep.method} />
        <span className="font-mono text-sm text-foreground">{ep.path}</span>
        <span className={`text-xs font-mono px-2 py-0.5 rounded border ${space.badge}`}>{ep.namespace}</span>
        <span className="ml-auto text-sm text-muted-foreground hidden sm:block">{ep.summary}</span>
        <ChevronRight size={16} className={`text-muted-foreground ml-2 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-border">
          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-muted-foreground">{ep.description}</p>

            {/* Parameters */}
            {ep.params && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Parameters</p>
                <div className="space-y-2">
                  {Object.entries(ep.params).map(([key, hint]) => (
                    <div key={key} className="flex items-center gap-3">
                      <label className="font-mono text-xs text-primary w-20 shrink-0">{key}</label>
                      <input
                        value={paramValues[key] ?? ""}
                        onChange={e => setParamValues(p => ({ ...p, [key]: e.target.value }))}
                        placeholder={hint}
                        className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Body */}
            {ep.body && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Request Body</p>
                <p className="font-mono text-xs text-muted-foreground mb-2">{ep.body}</p>
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
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">curl</p>
                <CopyButton text={curlCmd} />
              </div>
              <pre className="bg-[hsl(220,18%,8%)] text-[hsl(152,34%,60%)] text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono leading-relaxed">{curlCmd}</pre>
            </div>

            {/* Run button */}
            <div className="flex items-center gap-3">
              <button
                onClick={run}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all disabled:opacity-60"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                {loading ? "Running…" : "Run live"}
              </button>
              {response && (
                <button onClick={() => setResponse(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Clear
                </button>
              )}
            </div>

            {/* Response */}
            {response && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Response</p>
                  <CopyButton text={response} />
                </div>
                <pre className="bg-[hsl(220,18%,8%)] text-[hsl(210,15%,85%)] text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono leading-relaxed max-h-80 overflow-y-auto">{response}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const Api = () => {
  const [activeSpace, setActiveSpace] = useState<SpaceKey>("kernel");

  return (
    <Layout>
      <div className="pt-32 pb-24">
        <div className="container max-w-5xl">

          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                <Terminal size={12} />
                REST API v1.0.0 · OpenAPI 3.1.0
              </span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-4">
              UOR Framework API
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Every endpoint maps 1:1 to a named class, property, or individual in the UOR ontology. No authentication required for GET requests.
            </p>

            <div className="flex flex-wrap gap-3 mt-6">
              <a
                href="https://uor.foundation/openapi.json"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm text-foreground hover:bg-muted transition-colors"
              >
                <BookOpen size={14} />
                OpenAPI 3.1.0 spec
                <ExternalLink size={11} className="text-muted-foreground" />
              </a>
              <a
                href={`${BASE}/navigate`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Zap size={14} />
                /navigate index
                <ExternalLink size={11} className="text-muted-foreground" />
              </a>
            </div>
          </div>

          {/* Base URL */}
          <div className="mb-10 rounded-xl bg-[hsl(220,18%,8%)] border border-border p-4">
            <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Base URL</p>
            <div className="flex items-center gap-2">
              <code className="text-[hsl(152,34%,60%)] font-mono text-sm break-all">{BASE}</code>
              <CopyButton text={BASE} />
            </div>
          </div>

          {/* Agent Discovery Chain */}
          <div className="mb-10">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">Agent Discovery Chain</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {DISCOVERY_CHAIN.map(({ step, label, url, note }) => (
                <a
                  key={step}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-1.5 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary">Step {step}</span>
                    <ExternalLink size={11} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{note}</p>
                </a>
              ))}
            </div>
          </div>

          {/* Quick verify */}
          <div className="mb-10 rounded-xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-start gap-3">
              <Shield size={18} className="text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground mb-1">Quick Start — verify in 30 seconds</p>
                <p className="text-xs text-muted-foreground mb-3">
                  The canonical UOR identity: <code className="font-mono text-primary">neg(bnot(42)) = succ(42) = 43</code>
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-[hsl(152,34%,60%)] bg-[hsl(220,18%,8%)] px-3 py-1.5 rounded-lg flex-1 break-all">
                    curl "{BASE}/kernel/op/verify?x=42"
                  </code>
                  <CopyButton text={`curl "${BASE}/kernel/op/verify?x=42"`} />
                </div>
              </div>
            </div>
          </div>

          {/* Space tabs */}
          <div className="mb-6">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">Endpoints</h2>
            <div className="flex gap-2 border-b border-border pb-4">
              {(Object.keys(SPACES) as SpaceKey[]).map(key => (
                <button
                  key={key}
                  onClick={() => setActiveSpace(key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeSpace === key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {SPACES[key].label} Space
                </button>
              ))}
            </div>
          </div>

          {/* Space description + namespace tags */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-sm text-muted-foreground flex-1">{SPACES[activeSpace].description}</p>
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {SPACES[activeSpace].namespaces.map(ns => (
                <span key={ns} className={`text-xs font-mono px-2 py-0.5 rounded border ${SPACES[activeSpace].badge}`}>{ns}</span>
              ))}
            </div>
          </div>

          {/* Endpoint list */}
          <div className="space-y-3">
            {ENDPOINTS[activeSpace].map(ep => (
              <EndpointCard key={ep.operationId} ep={ep} spaceKey={activeSpace} />
            ))}
            {activeSpace === "user" && (
              <div className="rounded-xl border border-dashed border-border p-5 text-center">
                <p className="text-sm text-muted-foreground">
                  <span className="font-mono text-xs">morphism:</span> and <span className="font-mono text-xs">state:</span> namespaces require the Rust conformance suite resolver — marked <span className="font-mono text-xs">501 Not Implemented</span> in the current REST layer.
                </p>
              </div>
            )}
          </div>

          {/* Namespace map */}
          <div className="mt-14">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">Namespace → API Map</h2>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prefix</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Space</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">API group</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">IRI</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { prefix: "u:", space: "kernel", group: "/kernel/address", iri: "https://uor.foundation/u/" },
                    { prefix: "schema:", space: "kernel", group: "/kernel/schema", iri: "https://uor.foundation/schema/" },
                    { prefix: "op:", space: "kernel", group: "/kernel/op", iri: "https://uor.foundation/op/" },
                    { prefix: "partition:", space: "bridge", group: "/bridge/partition", iri: "https://uor.foundation/partition/" },
                    { prefix: "proof:", space: "bridge", group: "/bridge/proof", iri: "https://uor.foundation/proof/" },
                    { prefix: "cert:", space: "bridge", group: "/bridge/cert", iri: "https://uor.foundation/cert/" },
                    { prefix: "observable:", space: "bridge", group: "/bridge/observable", iri: "https://uor.foundation/observable/" },
                    { prefix: "derivation:", space: "bridge", group: "/bridge/proof", iri: "https://uor.foundation/derivation/" },
                    { prefix: "trace:", space: "bridge", group: "/bridge/proof", iri: "https://uor.foundation/trace/" },
                    { prefix: "resolver:", space: "bridge", group: "/bridge/partition", iri: "https://uor.foundation/resolver/" },
                    { prefix: "type:", space: "user", group: "/user/type", iri: "https://uor.foundation/type/" },
                    { prefix: "morphism:", space: "user", group: "—", iri: "https://uor.foundation/morphism/" },
                    { prefix: "state:", space: "user", group: "—", iri: "https://uor.foundation/state/" },
                  ].map(({ prefix, space, group, iri }) => (
                    <tr key={prefix} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-primary">{prefix}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${
                          space === "kernel" ? SPACES.kernel.badge :
                          space === "bridge" ? SPACES.bridge.badge : SPACES.user.badge
                        }`}>{space}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden sm:table-cell">{group}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <a href={iri} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">
                          {iri}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer links */}
          <div className="mt-12 flex flex-wrap gap-4 text-sm">
            <a href="https://github.com/UOR-Foundation/UOR-Framework" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              GitHub source <ExternalLink size={11} />
            </a>
            <a href="https://uor.foundation/llms.md" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              Agent Quick Card <ExternalLink size={11} />
            </a>
            <a href="https://uor.foundation/llms-full.md" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              Full implementation guide <ExternalLink size={11} />
            </a>
            <a href="https://www.moltbook.com/m/uor" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              Community (Moltbook) <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Api;
