import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import Layout from "@/modules/core/components/Layout";
import {
  ExternalLink,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Diamond,
  Hash,
  Layers,
  Search,
  ShieldCheck,
  ArrowRightLeft,
  HardDrive,
  Play,
  Loader2,
  Settings2,
  BookOpen,
  Zap,
  Bot,
  Globe,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { API_BASE_URL, LAYERS, DISCOVERY_ENDPOINTS } from "@/data/api-layers";
import type { LayerData } from "@/data/api-layers";
import type { Endpoint as EndpointType } from "@/modules/api-explorer/types";
import { CopyButton } from "@/modules/api-explorer/components/CopyButton";

/* ── Constants ───────────────────────────────────────────────── */
const BASE = API_BASE_URL;
const RUNTIME_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "erwfuxphwcvynxhfbvql"}.supabase.co/functions/v1/uor-api`;

const layerIcons: Record<string, LucideIcon> = {
  Diamond, Hash, Layers, Search, ShieldCheck, ArrowRightLeft, HardDrive,
};

/* ── Sidebar categories ──────────────────────────────────────── */
interface SidebarCategory {
  label: string;
  icon: LucideIcon;
  items: { id: string; label: string; badge?: string }[];
}

const sidebarCategories: SidebarCategory[] = [
  {
    label: "Overview",
    icon: BookOpen,
    items: [
      { id: "overview", label: "Overview" },
      { id: "quick-start", label: "Quick Start" },
      { id: "authentication", label: "Authentication" },
    ],
  },
  {
    label: "Foundation",
    icon: Diamond,
    items: [
      { id: "layer-0", label: "The Foundation" },
      { id: "layer-1", label: "Identity" },
    ],
  },
  {
    label: "Operations",
    icon: Settings2,
    items: [
      { id: "layer-2", label: "Structure" },
      { id: "layer-3", label: "Resolution" },
    ],
  },
  {
    label: "Verification",
    icon: ShieldCheck,
    items: [
      { id: "layer-4", label: "Verification" },
    ],
  },
  {
    label: "Transformation & Storage",
    icon: ArrowRightLeft,
    items: [
      { id: "layer-5", label: "Transformation" },
      { id: "layer-6", label: "Persistence" },
    ],
  },
  {
    label: "AI & Agents",
    icon: Bot,
    items: [
      { id: "agent-discovery", label: "Agent Discovery" },
      { id: "machine-readable", label: "Machine-Readable Specs" },
    ],
  },
];

/* ── JSON highlighting ───────────────────────────────────────── */
function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function highlightJson(json: string) {
  const e = escapeHtml(json);
  return e
    .replace(/(&quot;(?:[^&]|&(?!quot;))*&quot;)(\s*:)/g, '<span class="json-key">$1</span>$2')
    .replace(/:\s*(&quot;(?:[^&]|&(?!quot;))*&quot;)/g, ': <span class="json-string">$1</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>')
    .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');
}

/* ── Method badge ────────────────────────────────────────────── */
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

/* ── Endpoint card (inline) ──────────────────────────────────── */
function EndpointCard({ ep }: { ep: EndpointType }) {
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, string>>(
    Object.fromEntries(ep.params.filter(p => p.in === "query" && p.default).map(p => [p.name, p.default!]))
  );
  const [bodyValue, setBodyValue] = useState(ep.defaultBody ?? "");

  const buildDisplayUrl = () => {
    const qp = ep.params.filter(p => p.in === "query").map(p => [p.name, paramValues[p.name] ?? ""] as [string, string]).filter(([, v]) => v);
    const qs = new URLSearchParams(qp).toString();
    return `${API_BASE_URL}${ep.path}${qs ? `?${qs}` : ""}`;
  };
  const buildRuntimeUrl = () => {
    const qp = ep.params.filter(p => p.in === "query").map(p => [p.name, paramValues[p.name] ?? ""] as [string, string]).filter(([, v]) => v);
    const qs = new URLSearchParams(qp).toString();
    return `${RUNTIME_BASE}${ep.path}${qs ? `?${qs}` : ""}`;
  };
  const curlCmd = ep.method === "GET"
    ? `curl "${buildDisplayUrl()}"`
    : `curl -X POST "${API_BASE_URL}${ep.path}" \\\n  -H "Content-Type: application/json" \\\n  -d '${ep.defaultBody ?? "{}"}'`;

  async function run() {
    setOpen(true); setLoading(true); setResponse(null);
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
    <div className="border border-border/60 rounded-xl overflow-hidden bg-card/50 hover:border-border transition-colors">
      <div className="flex items-center gap-3 px-5 py-3.5">
        <MethodBadge method={ep.method} />
        <code className="font-mono text-sm text-muted-foreground flex-1 min-w-0 truncate">{ep.path}</code>
        <span className="hidden sm:block text-xs text-muted-foreground/60 truncate max-w-[200px]">{ep.label}</span>
        <button onClick={run} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />} Run
        </button>
        <button onClick={() => setOpen(o => !o)} className="shrink-0 p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
          <ChevronDown size={16} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      <div className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="px-5 pb-5 space-y-4 border-t border-border/40 pt-4">
            <div>
              <h4 className="text-base font-semibold text-foreground mb-1">{ep.label}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{ep.explanation}</p>
              <p className="text-sm text-primary/70 font-medium mt-1.5">{ep.useCase}</p>
            </div>

            {ep.params.filter(p => p.in === "query").length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Parameters</p>
                <div className="space-y-2">
                  {ep.params.filter(p => p.in === "query").map(p => (
                    <div key={p.name} className="flex items-start gap-3 text-sm">
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5 min-w-[100px]">
                        <code className="font-mono text-foreground">{p.name}</code>
                        {p.required && <span className="text-[9px] font-bold text-destructive">REQ</span>}
                      </div>
                      <input
                        type="text" value={paramValues[p.name] ?? ""} onChange={e => setParamValues(prev => ({ ...prev, [p.name]: e.target.value }))}
                        placeholder={p.default ?? ""} className="w-20 bg-background border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <p className="text-muted-foreground leading-relaxed flex-1 text-xs">{p.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ep.method === "POST" && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Request body</p>
                <textarea value={bodyValue} onChange={e => setBodyValue(e.target.value)} rows={3}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">curl</p>
                <CopyButton text={curlCmd} size="xs" />
              </div>
              <pre className="bg-[hsl(220,18%,6%)] text-[hsl(152,34%,60%)] text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono leading-relaxed">{curlCmd}</pre>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={run} disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-60">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                {loading ? "Running…" : "Run live"}
              </button>
              <div className="flex items-center gap-1.5 flex-wrap">
                {ep.responseCodes.map(c => (
                  <span key={c} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                    c === 200 ? "text-emerald-400 border-emerald-700 bg-emerald-900/20"
                    : c >= 500 ? "text-destructive border-destructive/30 bg-destructive/5"
                    : "text-amber-400 border-amber-700 bg-amber-900/20"
                  }`}>{c}</span>
                ))}
              </div>
              {response && <button onClick={() => setResponse(null)} className="text-xs text-muted-foreground hover:text-foreground ml-auto">Clear</button>}
            </div>

            {response && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Response</p>
                  <CopyButton text={response} size="xs" />
                </div>
                <pre className="bg-[hsl(220,18%,6%)] text-sm rounded-lg px-4 py-3 overflow-x-auto font-mono leading-relaxed max-h-64 overflow-y-auto json-response"
                  dangerouslySetInnerHTML={{ __html: highlightJson(response) }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Layer section ───────────────────────────────────────────── */
function LayerBlock({ layer }: { layer: LayerData }) {
  const Icon = layerIcons[layer.iconKey] ?? Diamond;
  return (
    <section id={layer.id} className="scroll-mt-28 mb-12">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-body font-semibold tracking-widest uppercase text-primary/60">Layer {layer.layerNum}</p>
          <h2 className="font-display text-xl font-bold text-foreground">{layer.title}</h2>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-2 max-w-2xl">{layer.whyItMatters}</p>
      <p className="text-sm font-medium text-primary/70 mb-6">{layer.solves}</p>
      <div className="space-y-3">
        {layer.endpoints.map(ep => <EndpointCard key={ep.operationId} ep={ep} />)}
      </div>
      {layer.v2stubs && layer.v2stubs.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">Coming in v2</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {layer.v2stubs.map(stub => (
              <div key={stub.path} className="rounded-lg border border-dashed border-border bg-card/30 px-4 py-3 opacity-60">
                <p className="text-xs font-semibold text-foreground mb-1">{stub.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{stub.description}</p>
                <code className="font-mono text-[10px] text-muted-foreground/50">{stub.path}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Sidebar ─────────────────────────────────────────────────── */
function Sidebar({ activeId }: { activeId: string }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (label: string) => setCollapsed(p => ({ ...p, [label]: !p[label] }));

  return (
    <aside className="hidden lg:block w-60 shrink-0 border-r border-border/30 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto">
      <div className="p-5 pb-3">
        <div className="flex items-center gap-2 mb-5">
          <Zap size={16} className="text-primary" />
          <span className="text-sm font-semibold text-foreground font-body">API Reference</span>
        </div>
        <nav className="space-y-3">
          {sidebarCategories.map(cat => {
            const isCollapsed = collapsed[cat.label];
            return (
              <div key={cat.label}>
                <button onClick={() => toggle(cat.label)}
                  className="flex items-center gap-2 w-full text-left py-1 group">
                  <cat.icon size={13} className="text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">{cat.label}</span>
                  <ChevronDown size={12} className={`text-muted-foreground/30 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                </button>
                {!isCollapsed && (
                  <div className="ml-5 mt-1 space-y-0.5">
                    {cat.items.map(item => {
                      const isActive = activeId === item.id;
                      return (
                        <a key={item.id} href={`#${item.id}`}
                          className={`block px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
                            isActive ? "text-primary font-medium bg-primary/8" : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                          }`}>
                          {item.label}
                          {item.badge && <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded bg-primary/15 text-primary font-medium">{item.badge}</span>}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */
const ApiPage = () => {
  const { hash } = useLocation();
  const [activeId, setActiveId] = useState("overview");

  useEffect(() => {
    if (hash) {
      setActiveId(hash.slice(1));
      const el = document.getElementById(hash.slice(1));
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [hash]);

  // Intersection observer to track active section
  useEffect(() => {
    const ids = ["overview", "quick-start", "authentication", ...LAYERS.map(l => l.id), "agent-discovery", "machine-readable"];
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    );
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <Layout>
      <style>{`
        .json-key { color: hsl(210, 80%, 72%); }
        .json-string { color: hsl(152, 50%, 60%); }
        .json-number { color: hsl(38, 92%, 65%); }
        .json-boolean { color: hsl(200, 80%, 65%); }
        .json-null { color: hsl(0, 60%, 65%); }
        .json-response { color: hsl(210, 15%, 80%); }
      `}</style>

      <div className="dark bg-section-dark text-section-dark-foreground min-h-screen pt-36 md:pt-44">
        <div className="flex max-w-[1400px] mx-auto">
          <Sidebar activeId={activeId} />

          <main className="flex-1 min-w-0 px-6 md:px-10 lg:px-12 py-8 max-w-4xl">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
              <Link to="/developers" className="hover:text-foreground transition-colors">Docs</Link>
              <ChevronRight size={12} className="text-muted-foreground/50" />
              <span className="text-foreground">API Reference</span>
            </nav>

            {/* ── Overview ────────────────────────────────────── */}
            <section id="overview" className="scroll-mt-28 mb-14">
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">UOR Framework API</h1>
              <p className="text-base text-muted-foreground leading-relaxed max-w-2xl mb-6">
                A content-addressed computation substrate you can call from any language. Every endpoint is deterministic — same input, same output, every time, on any machine. No account required. No API key needed.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                <div className="rounded-xl border border-border/40 bg-card/20 p-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Base URL</p>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm text-foreground bg-background/50 px-3 py-1.5 rounded-lg flex-1 break-all">{BASE}</code>
                    <CopyButton text={BASE} size="xs" />
                  </div>
                </div>
                <div className="rounded-xl border border-border/40 bg-card/20 p-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Specification</p>
                  <div className="flex items-center gap-3">
                    <a href="https://uor.foundation/openapi.json" target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
                      OpenAPI 3.1.0 <ExternalLink size={11} />
                    </a>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="text-xs text-muted-foreground">JSON + JSON-LD</span>
                  </div>
                </div>
              </div>

              {/* Rate limits */}
              <div className="rounded-xl border border-border/40 bg-card/20 p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Rate Limits</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">GET</span>
                    <p className="font-mono font-semibold text-foreground">120/min</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">POST</span>
                    <p className="font-mono font-semibold text-foreground">60/min</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">With Agent Key</span>
                    <p className="font-mono font-semibold text-foreground">Elevated</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground/70 mt-3">
                  Every response includes <code className="font-mono text-xs">X-RateLimit-Limit</code>, <code className="font-mono text-xs">X-RateLimit-Remaining</code>, and <code className="font-mono text-xs">ETag</code> headers.
                </p>
              </div>
            </section>

            {/* ── Quick Start ─────────────────────────────────── */}
            <section id="quick-start" className="scroll-mt-28 mb-14">
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">Quick Start</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-2xl">
                No signup. No API key. Paste any of these into your terminal and get a real response in under a second.
              </p>

              <div className="space-y-4">
                {[
                  { step: "1", label: "Discover what the API can do", cmd: `curl "${BASE}/navigate"`, note: "Returns a structured index of all endpoints." },
                  { step: "2", label: "Verify a trust guarantee", cmd: `curl "${BASE}/kernel/op/verify?x=42"`, note: "Same result, any machine, every time." },
                  { step: "3", label: "Detect spam mathematically", cmd: `curl -X POST "${BASE}/bridge/partition" -H "Content-Type: application/json" -d '{"input":"hello world"}'`, note: "Low density flags repetitive content." },
                ].map(({ step, label, cmd, note }) => (
                  <div key={step} className="rounded-xl border border-border/40 bg-card/20 p-5">
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">{step}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
                        <div className="flex items-center gap-2 mb-1.5">
                          <code className="font-mono text-xs text-[hsl(152,34%,60%)] bg-[hsl(220,18%,6%)] px-3 py-2 rounded-lg flex-1 min-w-0 break-all">{cmd}</code>
                          <CopyButton text={cmd} size="xs" />
                        </div>
                        <p className="text-xs text-muted-foreground/70">{note}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Authentication ──────────────────────────────── */}
            <section id="authentication" className="scroll-mt-28 mb-14">
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">Authentication</h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-4">
                All GET endpoints are open — no authentication required. POST endpoints accept an optional <code className="font-mono text-xs bg-background/50 px-1.5 py-0.5 rounded">X-UOR-Agent-Key</code> header for elevated rate limits.
              </p>
              <div className="rounded-xl border border-border/40 bg-card/20 p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Example with agent key</p>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs text-[hsl(152,34%,60%)] bg-[hsl(220,18%,6%)] px-3 py-2 rounded-lg flex-1 break-all">
                    curl -H "X-UOR-Agent-Key: YOUR_KEY" "{BASE}/kernel/op/verify?x=42"
                  </code>
                  <CopyButton text={`curl -H "X-UOR-Agent-Key: YOUR_KEY" "${BASE}/kernel/op/verify?x=42"`} size="xs" />
                </div>
                <p className="text-xs text-muted-foreground/70 mt-2">
                  Without a key, you still get full access — just at the standard rate limit. Keys are only needed for high-throughput workloads.
                </p>
              </div>
            </section>

            {/* ── Discovery endpoints ─────────────────────────── */}
            <div className="mb-10">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">API Discovery — Start here</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DISCOVERY_ENDPOINTS.map(ep => (
                  <div key={ep.path} className="rounded-xl border border-border/40 bg-card/20 p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <MethodBadge method={ep.method} />
                      <code className="font-mono text-sm text-foreground">{ep.path}</code>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">{ep.explanation}</p>
                    <div className="flex items-center gap-2">
                      <a href={ep.example} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:opacity-80">
                        Run <ExternalLink size={10} />
                      </a>
                      <CopyButton text={`curl "${ep.example}"`} size="xs" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Divider ─────────────────────────────────────── */}
            <div className="h-px bg-border/30 mb-10" />

            {/* ── All layers ──────────────────────────────────── */}
            {LAYERS.map(layer => <LayerBlock key={layer.id} layer={layer} />)}

            {/* ── Divider ─────────────────────────────────────── */}
            <div className="h-px bg-border/30 mb-10" />

            {/* ── Agent Discovery ─────────────────────────────── */}
            <section id="agent-discovery" className="scroll-mt-28 mb-12">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <h2 className="font-display text-xl font-bold text-foreground">For AI Agents</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-6">
                Discover the full API, verify the core rule independently, and start building. Zero auth, zero setup.
              </p>

              <div className="space-y-3">
                {[
                  { step: "1", label: "/.well-known/uor.json", note: "Organisation descriptor. The uor:api.openapi field points to the spec.", href: "https://uor.foundation/.well-known/uor.json" },
                  { step: "2", label: "GET /openapi.json", note: "Full OpenAPI 3.1.0 spec — all paths, schemas, response types.", href: `${BASE}/openapi.json` },
                  { step: "3", label: "GET /navigate", note: "Complete endpoint index with required params and example URLs.", href: `${BASE}/navigate` },
                  { step: "4", label: "GET /kernel/op/verify?x=42", note: "First verifiable claim. Zero auth. Full proof in under 100ms.", href: `${BASE}/kernel/op/verify?x=42` },
                  { step: "5", label: "GET /store/gateways", note: "Check IPFS gateway health. Then POST /store/write for your first verified object.", href: `${BASE}/store/gateways` },
                ].map(({ step, label, note, href }) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{step}</span>
                    <div>
                      <a href={href} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                        {label} <ExternalLink size={10} />
                      </a>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">{note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Machine-readable specs ──────────────────────── */}
            <section id="machine-readable" className="scroll-mt-28 mb-16">
              <h2 className="font-display text-xl font-bold text-foreground mb-4">Machine-Readable Entry Points</h2>
              <div className="space-y-3">
                {[
                  { label: "OpenAPI 3.1.0 spec", url: "https://uor.foundation/openapi.json", note: "Parse paths, operationIds, schemas, response types." },
                  { label: "Agent Quick Card", url: "https://uor.foundation/llms.md", note: "5-minute orientation. Frontmatter includes api_url and api_spec." },
                  { label: "Full Reference", url: "https://uor.foundation/llms-full.md", note: "Complete guide with all curl examples and implementation notes." },
                  { label: "Discovery metadata", url: "https://uor.foundation/.well-known/uor.json", note: "JSON-LD descriptor containing the uor:api.openapi field." },
                ].map(({ label, url, note }) => (
                  <div key={url} className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/20 p-4">
                    <Globe size={14} className="text-muted-foreground/40 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                        {label} <ExternalLink size={10} />
                      </a>
                      <code className="font-mono text-xs text-muted-foreground/50 break-all">{url}</code>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">{note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Back to docs */}
            <div className="pb-4">
              <Link to="/developers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                ← Back to Developer Portal
              </Link>
            </div>
          </main>
        </div>
      </div>
    </Layout>
  );
};

export default ApiPage;
