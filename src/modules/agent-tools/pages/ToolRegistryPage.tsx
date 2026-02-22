import { useState } from "react";
import Layout from "@/modules/core/components/Layout";
import { Copy, Play, CheckCircle2, ArrowRight, ExternalLink } from "lucide-react";

/* ── tool definitions (inline to avoid fetch on mount) ── */
const TOOLS = [
  {
    name: "uor_derive",
    morphism_type: "morphism:Transform",
    badge: "Transform",
    badgeColor: "bg-primary/15 text-primary",
    description:
      "Apply a ring operation to input values. Returns a cert:TransformCertificate (Grade A) with SHA-256 derivation_id. Maps source→target via the UOR kernel. All 10 operations available: neg, bnot, succ, pred, add, sub, mul, xor, and, or.",
    params: [
      { name: "op", type: "string", desc: 'One of: neg, bnot, succ, pred, add, sub, mul, xor, and, or' },
      { name: "args", type: "integer[]", desc: "1–2 values in [0,255]" },
    ],
    api: "POST /v1/kernel/derive",
    returns: "cert:TransformCertificate with derivation_id",
    schemaUrl: "/tools/uor_derive.json",
  },
  {
    name: "uor_verify",
    morphism_type: "proof:CoherenceProof",
    badge: "CoherenceProof",
    badgeColor: "bg-green-500/15 text-green-700 dark:text-green-400",
    description:
      "Verify the UOR critical identity neg(bnot(x)) = succ(x). Optionally verify for all 256 elements. Returns proof:CriticalIdentityProof or proof:CoherenceProof (universal).",
    params: [
      { name: "x", type: "integer", desc: "Value in [0,255]" },
      { name: "verify_all", type: "boolean", desc: "Check all 256 elements" },
      { name: "n", type: "integer", desc: "Bit width (8=Q0, 16=Q1, …)" },
    ],
    api: "GET /v1/kernel/op/verify",
    returns: "proof:CriticalIdentityProof or proof:CoherenceProof",
    schemaUrl: "/tools/uor_verify.json",
  },
  {
    name: "uor_resolve",
    morphism_type: "morphism:Isometry",
    badge: "Isometry",
    badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    description:
      "Execute the full PRISM pipeline (Polymorphic Resolution and Isometric Symmetry Machine, §4). Resolves a type declaration through all 8 stages: Type→Query→Resolve→Partition→Observe→Certify→Trace→State. Returns a certified Partition with four components summing to 2ⁿ.",
    params: [
      { name: "x", type: "integer", desc: "Value in [0,255]" },
      { name: "resolver", type: "string", desc: "DihedralFactorizationResolver | CanonicalFormResolver | EvaluationResolver" },
      { name: "n", type: "integer", desc: "Bit width (default 8)" },
    ],
    api: "GET /v1/bridge/resolver",
    returns: "resolver:Resolution with canonical_form and partition:Component",
    schemaUrl: "/tools/uor_resolve.json",
  },
  {
    name: "uor_certify",
    morphism_type: "cert:Certificate",
    badge: "Certificate",
    badgeColor: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
    description:
      "Issue a UOR certificate. Three whitepaper-defined types: TransformCertificate (Grade A), IsometryCertificate (Grade B), InvolutionCertificate (Grade A). Two extensions: EmpiricalAttestation (Grade C), UnverifiedAssertion (Grade D).",
    params: [
      { name: "cert_type", type: "string", desc: "TransformCertificate | IsometryCertificate | InvolutionCertificate | EmpiricalAttestation | UnverifiedAssertion" },
      { name: "claim", type: "string", desc: "The claim to certify" },
      { name: "derivation_id", type: "string", desc: "For TransformCertificate" },
      { name: "operation", type: "string", desc: "neg | bnot (for InvolutionCertificate)" },
      { name: "source_url", type: "string", desc: "For EmpiricalAttestation" },
    ],
    api: "POST /v1/grade/assess",
    returns: "cert:Certificate subclass per cert_type",
    schemaUrl: "/tools/uor_certify.json",
  },
] as const;

const API = "https://api.uor.foundation/v1";

/* ── helpers ── */
function copyText(t: string) {
  navigator.clipboard.writeText(t);
}

/* ── Section 1: Morphism Hierarchy ── */
function MorphismHierarchy() {
  return (
    <section className="mb-16">
      <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-foreground mb-2">Morphism Hierarchy</h2>
      <p className="text-muted-foreground text-sm mb-6">Whitepaper §3.4 — exact ontological structure</p>
      <div className="bg-card border border-border rounded-lg p-6 font-mono text-sm leading-relaxed">
        <div className="text-foreground">
          <span className="text-primary font-bold">morphism:Transform</span> <span className="text-muted-foreground">(root — maps between UOR objects)</span>
        </div>
        <div className="ml-4 border-l-2 border-border pl-4 mt-1 space-y-1">
          <div>
            <span className="text-amber-600 dark:text-amber-400 font-bold">├── morphism:Isometry</span>{" "}
            <span className="text-muted-foreground">(preservesMetric: ring | hamming)</span>
          </div>
          <div>
            <span className="text-blue-600 dark:text-blue-400 font-bold">└── morphism:Embedding</span>{" "}
            <span className="text-muted-foreground">(sourceQuantum → targetQuantum)</span>
          </div>
        </div>
        <div className="mt-4 text-foreground">
          <span className="text-green-600 dark:text-green-400 font-bold">morphism:Action</span>{" "}
          <span className="bg-destructive/15 text-destructive text-xs px-1.5 py-0.5 rounded font-sans font-medium">SIBLING</span>{" "}
          <span className="text-muted-foreground">(group action; actionIsometry=true for D<sub>2ⁿ</sub>)</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground font-sans">
          Action is not a subclass of Transform. Both are rooted at owl:Thing. (§3.4)
        </p>
      </div>
    </section>
  );
}

/* ── Section 2: Tool Cards ── */
function ToolCards({ onTry }: { onTry: (name: string) => void }) {
  return (
    <section className="mb-16">
      <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-foreground mb-2">Agent Tools</h2>
      <p className="text-muted-foreground text-sm mb-6">Four LLM-callable tools mapped to the morphism hierarchy</p>
      <div className="grid md:grid-cols-2 gap-4">
        {TOOLS.map((t) => (
          <div key={t.name} className="bg-card border border-border rounded-lg p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <code className="text-base font-bold text-foreground">{t.name}</code>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.badgeColor}`}>{t.badge}</span>
            </div>
            <p className="text-muted-foreground text-sm mb-3 flex-1">{t.description}</p>
            <div className="mb-3">
              <p className="text-xs font-semibold text-foreground mb-1">Parameters</p>
              <div className="space-y-0.5">
                {t.params.map((p) => (
                  <div key={p.name} className="text-xs">
                    <code className="text-primary">{p.name}</code>{" "}
                    <span className="text-muted-foreground">({p.type})</span>{" "}
                    <span className="text-muted-foreground">— {p.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-xs text-muted-foreground mb-3">
              <span className="font-semibold text-foreground">API:</span> <code>{t.api}</code>
            </div>
            <div className="flex gap-2 mt-auto">
              <button
                onClick={() => onTry(t.name)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
              >
                <Play className="w-3 h-3" /> Try it
              </button>
              <button
                onClick={() => copyText(t.schemaUrl)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 border border-border text-foreground rounded hover:bg-muted transition-colors"
              >
                <Copy className="w-3 h-3" /> Copy JSON Schema
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Section 3: Interactive Tester ── */
type TabKey = "derive" | "verify" | "resolve" | "certify";

function InteractiveTester({ activeTab, setActiveTab }: { activeTab: TabKey; setActiveTab: (t: TabKey) => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);

  // derive state
  const [op, setOp] = useState("neg");
  const [arg1, setArg1] = useState("42");
  const [arg2, setArg2] = useState("");
  // verify state
  const [vx, setVx] = useState("42");
  const [verifyAll, setVerifyAll] = useState(false);
  // resolve state
  const [rx, setRx] = useState("42");
  const [resolver, setResolver] = useState("CanonicalFormResolver");
  // certify state
  const [certType, setCertType] = useState("TransformCertificate");
  const [claim, setClaim] = useState("neg(42) = 214 in R₈");
  const [derivId, setDerivId] = useState("");
  const [certOp, setCertOp] = useState("neg");
  const [srcUrl, setSrcUrl] = useState("");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "derive", label: "derive" },
    { key: "verify", label: "verify" },
    { key: "resolve", label: "resolve" },
    { key: "certify", label: "certify" },
  ];

  const unaryOps = ["neg", "bnot", "succ", "pred"];
  const allOps = ["neg", "bnot", "succ", "pred", "add", "sub", "mul", "xor", "and", "or"];

  async function execute() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      let res: Response;
      if (activeTab === "derive") {
        const args = unaryOps.includes(op) ? [Number(arg1)] : [Number(arg1), Number(arg2 || "0")];
        res = await fetch(`${API}/kernel/derive`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ term: { op, args } }),
        });
      } else if (activeTab === "verify") {
        const url = verifyAll
          ? `${API}/kernel/op/verify/all?n=8`
          : `${API}/kernel/op/verify?x=${vx}&n=8`;
        res = await fetch(url);
      } else if (activeTab === "resolve") {
        res = await fetch(`${API}/bridge/resolver?x=${rx}`);
      } else {
        // certify → grade/assess
        const evidence: Record<string, unknown> = {};
        let evidenceType = "none";
        if (certType === "TransformCertificate") {
          evidenceType = "algebraic";
          evidence.derivation_id = derivId;
        } else if (certType === "IsometryCertificate") {
          evidenceType = "isometric";
          evidence.operation = certOp;
        } else if (certType === "InvolutionCertificate") {
          evidenceType = "isometric";
          evidence.operation = certOp;
        } else if (certType === "EmpiricalAttestation") {
          evidenceType = "empirical";
          evidence.source_url = srcUrl;
        }
        res = await fetch(`${API}/grade/assess`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ claim, evidence_type: evidenceType, evidence }),
        });
      }
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setResult(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-16">
      <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-foreground mb-2">Interactive Tester</h2>
      <p className="text-muted-foreground text-sm mb-4">Execute tools against the live API</p>

      {/* tabs */}
      <div className="flex gap-1 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setResult(null); setError(null); }}
            className={`px-4 py-1.5 text-sm rounded-t font-mono transition-colors ${
              activeTab === t.key
                ? "bg-card text-foreground border border-b-0 border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        {/* derive */}
        {activeTab === "derive" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <label className="text-sm text-foreground">
                op
                <select value={op} onChange={(e) => setOp(e.target.value)} className="ml-2 bg-background border border-border rounded px-2 py-1 text-sm text-foreground">
                  {allOps.map((o) => <option key={o}>{o}</option>)}
                </select>
              </label>
              <label className="text-sm text-foreground">
                arg1
                <input value={arg1} onChange={(e) => setArg1(e.target.value)} className="ml-2 w-20 bg-background border border-border rounded px-2 py-1 text-sm text-foreground" />
              </label>
              {!unaryOps.includes(op) && (
                <label className="text-sm text-foreground">
                  arg2
                  <input value={arg2} onChange={(e) => setArg2(e.target.value)} className="ml-2 w-20 bg-background border border-border rounded px-2 py-1 text-sm text-foreground" />
                </label>
              )}
            </div>
          </div>
        )}

        {/* verify */}
        {activeTab === "verify" && (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={verifyAll} onChange={(e) => setVerifyAll(e.target.checked)} className="accent-primary" />
              Verify all 256 elements
            </label>
            {!verifyAll && (
              <label className="text-sm text-foreground">
                x
                <input value={vx} onChange={(e) => setVx(e.target.value)} className="ml-2 w-20 bg-background border border-border rounded px-2 py-1 text-sm text-foreground" />
              </label>
            )}
          </div>
        )}

        {/* resolve */}
        {activeTab === "resolve" && (
          <div className="space-y-3">
            <label className="text-sm text-foreground">
              x
              <input value={rx} onChange={(e) => setRx(e.target.value)} className="ml-2 w-20 bg-background border border-border rounded px-2 py-1 text-sm text-foreground" />
            </label>
            <label className="text-sm text-foreground">
              Resolver
              <select value={resolver} onChange={(e) => setResolver(e.target.value)} className="ml-2 bg-background border border-border rounded px-2 py-1 text-sm text-foreground">
                <option>DihedralFactorizationResolver</option>
                <option>CanonicalFormResolver</option>
                <option>EvaluationResolver</option>
              </select>
            </label>
            <p className="text-xs text-muted-foreground">Executes the full PRISM pipeline (Polymorphic Resolution and Isometric Symmetry Machine, §4)</p>
          </div>
        )}

        {/* certify */}
        {activeTab === "certify" && (
          <div className="space-y-3">
            <label className="text-sm text-foreground">
              cert_type
              <select value={certType} onChange={(e) => setCertType(e.target.value)} className="ml-2 bg-background border border-border rounded px-2 py-1 text-sm text-foreground">
                <option>TransformCertificate</option>
                <option>IsometryCertificate</option>
                <option>InvolutionCertificate</option>
                <option>EmpiricalAttestation</option>
                <option>UnverifiedAssertion</option>
              </select>
            </label>
            <label className="text-sm text-foreground block">
              claim
              <input value={claim} onChange={(e) => setClaim(e.target.value)} className="ml-2 w-full max-w-md bg-background border border-border rounded px-2 py-1 text-sm text-foreground" />
            </label>
            {certType === "TransformCertificate" && (
              <label className="text-sm text-foreground block">
                derivation_id
                <input value={derivId} onChange={(e) => setDerivId(e.target.value)} placeholder="urn:uor:derivation:sha256:..." className="ml-2 w-full max-w-lg bg-background border border-border rounded px-2 py-1 text-sm text-foreground" />
              </label>
            )}
            {(certType === "IsometryCertificate" || certType === "InvolutionCertificate") && (
              <label className="text-sm text-foreground">
                operation
                <select value={certOp} onChange={(e) => setCertOp(e.target.value)} className="ml-2 bg-background border border-border rounded px-2 py-1 text-sm text-foreground">
                  <option>neg</option>
                  <option>bnot</option>
                </select>
              </label>
            )}
            {certType === "EmpiricalAttestation" && (
              <label className="text-sm text-foreground block">
                source_url
                <input value={srcUrl} onChange={(e) => setSrcUrl(e.target.value)} placeholder="https://..." className="ml-2 w-full max-w-lg bg-background border border-border rounded px-2 py-1 text-sm text-foreground" />
              </label>
            )}
          </div>
        )}

        <button
          onClick={execute}
          disabled={loading}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
        >
          {loading ? (
            <span className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          Execute
        </button>

        {error && <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded text-destructive text-sm">{error}</div>}
        {result && (
          <div className="mt-4 relative">
            <button
              onClick={() => copyText(JSON.stringify(result, null, 2))}
              className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              title="Copy"
            >
              <Copy className="w-4 h-4" />
            </button>
            <pre className="bg-background border border-border rounded p-4 text-xs overflow-x-auto text-foreground max-h-80 overflow-y-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Section 4: Integration Guide ── */
function IntegrationGuide() {
  const claudeCode = `{
  "name": "uor_derive",
  "description": "Apply a ring operation to input values via UOR kernel",
  "input_schema": {
    "type": "object",
    "properties": {
      "op": {"type": "string", "enum": ["neg","bnot","succ","pred","add","sub","mul","xor","and","or"]},
      "args": {"type": "array", "items": {"type": "integer"}, "minItems": 1, "maxItems": 2}
    },
    "required": ["op","args"]
  }
}`;

  const openaiCode = `{
  "type": "function",
  "function": {
    "name": "uor_derive",
    "description": "Apply a ring operation to input values via UOR kernel",
    "parameters": {
      "type": "object",
      "properties": {
        "op": {"type": "string", "enum": ["neg","bnot","succ","pred","add","sub","mul","xor","and","or"]},
        "args": {"type": "array", "items": {"type": "integer"}, "minItems": 1, "maxItems": 2}
      },
      "required": ["op","args"]
    }
  }
}`;

  const fetchCode = `const res = await fetch("https://api.uor.foundation/v1/kernel/derive", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ term: { op: "neg", args: [42] } })
});
const cert = await res.json();
// cert["@type"] = "cert:TransformCertificate"
// cert["derivation_id"] = "urn:uor:derivation:sha256:..."`;

  const blocks = [
    { label: "Anthropic Claude tool_use", code: claudeCode },
    { label: "OpenAI function calling", code: openaiCode },
    { label: "Raw fetch", code: fetchCode },
  ];

  return (
    <section className="mb-16">
      <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-foreground mb-2">Integration Guide</h2>
      <p className="text-muted-foreground text-sm mb-6">Drop these schemas into your LLM tool configuration</p>
      <div className="space-y-4">
        {blocks.map((b) => (
          <div key={b.label} className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
              <span className="text-sm font-medium text-foreground">{b.label}</span>
              <button onClick={() => copyText(b.code)} className="text-muted-foreground hover:text-foreground transition-colors" title="Copy">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <pre className="p-4 text-xs overflow-x-auto text-foreground">{b.code}</pre>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Full JSON schemas at{" "}
        <a href="/tools/uor_derive.json" target="_blank" className="text-primary hover:underline">/tools/uor_derive.json</a>,{" "}
        <a href="/tools/uor_verify.json" target="_blank" className="text-primary hover:underline">/tools/uor_verify.json</a>,{" "}
        <a href="/tools/uor_resolve.json" target="_blank" className="text-primary hover:underline">/tools/uor_resolve.json</a>,{" "}
        <a href="/tools/uor_certify.json" target="_blank" className="text-primary hover:underline">/tools/uor_certify.json</a>
      </p>
    </section>
  );
}

/* ── Main Page ── */
export default function ToolRegistryPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("derive");

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold text-foreground mb-3">
            Agent Tool Registry
          </h1>
          <p className="text-muted-foreground text-lg mb-12">
            Four LLM-callable tools grounded in the UOR morphism hierarchy (§3.4).
            Each tool maps to a whitepaper-defined type and returns JSON-LD certificates.
          </p>

          <MorphismHierarchy />
          <ToolCards onTry={(name) => {
            const map: Record<string, TabKey> = { uor_derive: "derive", uor_verify: "verify", uor_resolve: "resolve", uor_certify: "certify" };
            setActiveTab(map[name] || "derive");
            document.getElementById("tester")?.scrollIntoView({ behavior: "smooth" });
          }} />
          <div id="tester">
            <InteractiveTester activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
          <IntegrationGuide />
        </div>
      </div>
    </Layout>
  );
}
