import { useState, useCallback } from "react";
import Layout from "@/components/layout/Layout";
import {
  ChevronDown,
  Copy,
  Check,
  Play,
  Loader2,
  ExternalLink,
  Diamond,
  Hash,
  Layers,
  Search,
  ShieldCheck,
  ArrowRightLeft,
  ArrowRight,
} from "lucide-react";

/* ─────────────────────────── Constants ─────────────────────────── */

const BASE = "https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api";

/* ─────────────────────────── Types ─────────────────────────── */

interface Param {
  name: string;
  in: "query" | "body";
  type: string;
  required: boolean;
  default?: string;
  description: string;
  enum?: string[];
}

interface Endpoint {
  operationId: string;
  method: "GET" | "POST";
  path: string;
  /** One-line plain label */
  label: string;
  /** Concrete, jargon-free explanation. What it does + why you'd use it. */
  explanation: string;
  /** Real-world use case tying to an agent problem */
  useCase: string;
  params: Param[];
  defaultBody?: string;
  responseCodes: number[];
  example: string;
}

interface Layer {
  id: string;
  icon: React.ElementType;
  layerNum: number;
  title: string;
  oneLiner: string;
  /** Why this layer matters in plain terms */
  whyItMatters: string;
  /** The agent problem(s) it solves from llms.md */
  solves: string;
  endpoints: Endpoint[];
}

/* ─────────────────────────── Layer + Endpoint data ─────────────────────────── */

const LAYERS: Layer[] = [
  {
    id: "layer-0",
    icon: Diamond,
    layerNum: 0,
    title: "Start Here",
    oneLiner: "Discover what the API can do.",
    whyItMatters:
      "Before calling anything, read the index. It lists every available endpoint, what each one does, and the recommended order to call them. One request is all you need to orient yourself.",
    solves: "All agents and developers: start here.",
    endpoints: [
      {
        operationId: "frameworkIndex",
        method: "GET",
        path: "/navigate",
        label: "Get a map of all endpoints",
        explanation:
          "Returns a complete list of every endpoint in the API: path, method, purpose, and reading order. No parameters needed. Start here if you are exploring the API for the first time.",
        useCase:
          "An AI agent loads this once to understand what tools are available before deciding what to call next.",
        params: [],
        responseCodes: [200, 405, 500],
        example: `${BASE}/navigate`,
      },
      {
        operationId: "openapiSpec",
        method: "GET",
        path: "/openapi.json",
        label: "Download the full machine-readable specification",
        explanation:
          "Returns the complete OpenAPI 3.1.0 document: every path, every parameter, every response type, and every schema. A static copy is also available at https://uor.foundation/openapi.json.",
        useCase:
          "Any tool that auto-generates an HTTP client or validates requests against the spec can use this directly.",
        params: [],
        responseCodes: [200, 405, 500],
        example: `${BASE}/openapi.json`,
      },
    ],
  },
  {
    id: "layer-1",
    icon: Hash,
    layerNum: 1,
    title: "Permanent Addresses",
    oneLiner: "Give any content a stable, unique ID — derived from what it is, not where it lives.",
    whyItMatters:
      "Location-based identifiers break when data moves. Content-based identifiers never change because they are computed from the content itself. The same text always produces the same address — on any machine, at any time, without a central registry.",
    solves:
      "Solves: Identity Fraud. Without a stable, verifiable ID tied to what an agent actually said or did, impersonation is trivial. Content addresses make identity unforgeable.",
    endpoints: [
      {
        operationId: "addressEncode",
        method: "POST",
        path: "/kernel/address/encode",
        label: "Turn any text into a permanent address",
        explanation:
          "Send any text and receive back a unique address computed directly from that text's bytes. The address does not depend on a server, a timestamp, or a registry. The same input always produces the same output.\n\nEach byte is mapped to a Braille Unicode character, making the address both machine-readable and visually distinct. Two strings that differ by even one character produce completely different addresses.",
        useCase:
          "An agent wants to sign its outputs. It encodes its response text to get a content address, then attaches that address to the message. Any other agent can re-encode the same text and verify the address matches — no trust required.",
        params: [
          { name: "input", in: "body", type: "string (max 1000 chars)", required: true, description: "The text to address. Try your agent's name, a statement it made, or any string." },
          { name: "encoding", in: "body", type: '"utf8"', required: false, default: "utf8", description: "Text encoding. Only utf8 is supported in v1." },
        ],
        defaultBody: JSON.stringify({ input: "hello", encoding: "utf8" }, null, 2),
        responseCodes: [200, 400, 405, 413, 415, 429, 500],
        example: `${BASE}/kernel/address/encode`,
      },
      {
        operationId: "schemaDatum",
        method: "GET",
        path: "/kernel/schema/datum",
        label: "Get the full structural description of any number",
        explanation:
          "Every value in the UOR system is more than a number — it has a position in a mathematical structure called a ring. This endpoint returns the complete profile of a value: its integer form, how many bits are set, its binary representation, and its content address.\n\nThis is how the framework describes data internally. Understanding it helps you interpret the outputs of every other endpoint.",
        useCase:
          "An agent receives a numeric result from an operation and wants to understand its structural properties before using it in a proof or certificate.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "The number to describe. Must be 0 or greater, and less than 2 raised to the power of n." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size: how many bits to use. Default 8 means values 0–255." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/kernel/schema/datum?x=42`,
      },
    ],
  },
  {
    id: "layer-2",
    icon: Layers,
    layerNum: 2,
    title: "Arithmetic Operations",
    oneLiner: "Run every named operation on any value and get back verifiable results.",
    whyItMatters:
      "The framework defines a fixed set of operations — each with a name, a formula, and a provable relationship to the others. Running them here gives you both the result and the formal context: what the operation is, how it relates to the core identity, and whether the output is consistent.",
    solves:
      "Solves: Opaque Coordination. When agents share computed values, neither can verify the other's work without a shared operation definition. These endpoints provide the shared ground truth.",
    endpoints: [
      {
        operationId: "opCompute",
        method: "GET",
        path: "/kernel/op/compute",
        label: "Run every operation on a number at once",
        explanation:
          "Takes one or two numbers and returns the result of every operation in the framework simultaneously.\n\nSingle-input operations on x: negate (flip the sign in the ring), bitwise invert (flip every bit), increment, decrement.\nTwo-input operations on x and y: add, subtract, multiply, XOR, AND, OR.\n\nAll results come back in a single response, so you can compare them side by side.",
        useCase:
          "An agent is computing a transformation and wants to see all possible outcomes before committing to one. Or: a developer is learning how the ring behaves and wants to explore all operations on a specific value.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "The primary number. Must be less than 2 raised to the power of n." },
          { name: "y", in: "query", type: "integer", required: false, default: "10", description: "A second number for two-input operations. Defaults to x if not provided." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size. Default 8." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/kernel/op/compute?x=42&y=10`,
      },
      {
        operationId: "opList",
        method: "GET",
        path: "/kernel/op/operations",
        label: "See every named operation with its formal definition",
        explanation:
          "Returns the complete catalogue of all 12 named operations: negate, bitwise-invert, increment, decrement, add, subtract, multiply, XOR, AND, OR, the critical identity, and the dihedral group. Each entry includes the formula and its algebraic classification.",
        useCase:
          "An agent or developer wants to know what operations exist before deciding which to call, or wants to verify that a named operation it has seen in a proof object corresponds to a known definition.",
        params: [],
        responseCodes: [200, 405, 429, 500],
        example: `${BASE}/kernel/op/operations`,
      },
    ],
  },
  {
    id: "layer-3",
    icon: Search,
    layerNum: 3,
    title: "Verification",
    oneLiner: "Confirm that a mathematical property holds — for one value, or for all values at once.",
    whyItMatters:
      "The UOR framework rests on one foundational identity: applying bitwise-invert then negate always equals incrementing by one. This is not an assumption — it is verifiable. These endpoints let you check it for any specific value, or exhaustively for every value in the ring.",
    solves:
      "Solves: No Coherence Model. Agents that cannot verify shared claims have no basis for agreement. Verification endpoints return machine-checkable proof objects, not assertions.",
    endpoints: [
      {
        operationId: "opVerifyCriticalIdentity",
        method: "GET",
        path: "/kernel/op/verify",
        label: "Verify the core identity for one value",
        explanation:
          "Checks that negate(bitwise-invert(x)) equals increment(x) for the value you supply. Returns a full step-by-step proof showing every intermediate value, not just a boolean answer.\n\nThis is the most important single endpoint in the API. The identity it checks is the structural rule the entire framework depends on. If it holds here, it holds everywhere.",
        useCase:
          "An agent has been told that UOR's core identity is reliable. It calls this endpoint with a value it chose itself to independently confirm the claim — not taking anyone's word for it.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "The value to check. Must be 0 or greater, and less than 2 raised to the power of n." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size. Default 8 means values 0–255." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/kernel/op/verify?x=42`,
      },
      {
        operationId: "opVerifyAll",
        method: "GET",
        path: "/kernel/op/verify/all",
        label: "Verify the core identity for every value in the ring",
        explanation:
          "Runs the same check as the single-value endpoint, but for every possible value in the ring — all 256 values for the default 8-bit ring. Returns pass count, fail count, and a universal verdict.\n\nOne example proves nothing. Exhaustive verification across all values is what turns a claim into a proof. 256 passes and zero failures is the expected result.",
        useCase:
          "An agent wants to confirm the framework is internally consistent before relying on it for coordination. This is the exhaustive check that no adversarial value can break the core identity.",
        params: [
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size. n=8 checks all 256 byte values. n=4 checks 16 values." },
          { name: "expand", in: "query", type: "boolean", required: false, default: "false", description: "Set to true to include the full list of per-value results in the response." },
        ],
        responseCodes: [200, 405, 429, 500],
        example: `${BASE}/kernel/op/verify/all?n=8`,
      },
    ],
  },
  {
    id: "layer-4",
    icon: ShieldCheck,
    layerNum: 4,
    title: "Proofs and Certificates",
    oneLiner: "Generate shareable, independently verifiable proof objects — not assertions.",
    whyItMatters:
      "A proof is more than a true answer. A proof object has a permanent address, every step of the derivation shown explicitly, and can be checked by anyone with no access to the original computation. Certificates attest to properties of operations across all values. Both are self-contained objects you can share, store, and verify offline.",
    solves:
      "Solves: Auth Exploits and Identity Fraud. Request authentication anchored to content-addressed proof objects cannot be forged — the proof must match the content, and the content derives the address.",
    endpoints: [
      {
        operationId: "proofCriticalIdentity",
        method: "GET",
        path: "/bridge/proof/critical-identity",
        label: "Generate a shareable proof for one value",
        explanation:
          "Produces a full proof object for the value you supply. Unlike the verify endpoint, this object has a unique permanent address (@id), making it independently referenceable. Anyone can take this object, re-run the derivation, and confirm it is correct — no contact with the original server needed.\n\nEvery step of the derivation is explicit: the input, the intermediate values after each operation, and the final comparison.",
        useCase:
          "An agent produces a proof for its own identity value and attaches it to outgoing messages. Recipients verify the proof independently. No trust chain required — the math is the trust.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "The value to prove the identity for." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/bridge/proof/critical-identity?x=42`,
      },
      {
        operationId: "proofCoherence",
        method: "POST",
        path: "/bridge/proof/coherence",
        label: "Prove that a type is internally consistent across all values",
        explanation:
          "Verifies that the core identity holds for every element of a given type — not just a sample. A type that passes is called ring-coherent: it participates fully in the framework's guarantees.\n\nReturns a proof with a pass rate, fail count, and a boolean verdict. 100% pass rate is required for coherence.\n\nResults are computed on-the-fly and not stored. The same input always returns the same result.",
        useCase:
          "Before using a custom data type in agent coordination, verify it is coherent. A non-coherent type may produce unpredictable results when used with the framework's operations.",
        params: [
          { name: "type_definition", in: "body", type: "object", required: true, description: 'The type to verify. Minimum: { "@type": "type:PrimitiveType", "type:bitWidth": 8 }' },
          { name: "n", in: "body", type: "integer [1–16]", required: false, default: "8", description: "Ring size to verify against. Defaults to the bitWidth in the type definition." },
        ],
        defaultBody: JSON.stringify({ type_definition: { "@type": "type:PrimitiveType", "type:bitWidth": 8 }, n: 8 }, null, 2),
        responseCodes: [200, 400, 405, 415, 429, 500],
        example: `${BASE}/bridge/proof/coherence`,
      },
      {
        operationId: "certInvolution",
        method: "GET",
        path: "/bridge/cert/involution",
        label: "Issue a certificate that an operation undoes itself",
        explanation:
          "An operation that undoes itself when applied twice is called self-inverse. Negate and bitwise-invert are both self-inverse.\n\nThis endpoint verifies that property exhaustively across every value in the ring, then issues a signed certificate. The certificate is a structured object — not a boolean — that can be shared, stored, and independently checked by any party.\n\nExample: negate(negate(x)) = x for all 256 values. This endpoint confirms it and issues the certificate.",
        useCase:
          "An agent needs to prove to a peer that a specific operation is safe to invert. Rather than re-computing, it shares the certificate. The peer verifies the certificate object directly.",
        params: [
          { name: "operation", in: "query", type: "string", required: true, default: "neg", enum: ["neg", "bnot"], description: 'The operation to certify. "neg" = negate. "bnot" = bitwise invert.' },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/bridge/cert/involution?operation=neg`,
      },
    ],
  },
  {
    id: "layer-5",
    icon: ArrowRightLeft,
    layerNum: 5,
    title: "Content Quality and Metrics",
    oneLiner: "Measure information density and structural properties of any content — formally, not heuristically.",
    whyItMatters:
      "Most systems detect spam or low-quality content with heuristics — patterns, blacklists, statistical models. The UOR approach is different: it partitions values into categories based on algebraic structure. The result is a density score that is reproducible, formally grounded, and free of training data bias.",
    solves:
      "Solves: Content Spam and Prompt Injection. Partition analysis distinguishes novel content from repetitive or boundary-testing content using ring structure. Observable metrics provide precise measurements to detect anomalies.",
    endpoints: [
      {
        operationId: "partitionResolve",
        method: "POST",
        path: "/bridge/partition",
        label: "Measure the information density of any content",
        explanation:
          "Classifies every value in the ring into one of four groups:\n\n• Novel (irreducible) — values that cannot be broken into simpler parts. High-signal content.\n• Derived (reducible) — values that can be factored. Often repetitive or compositional.\n• Structural (units) — boundary anchors (1 and its inverse).\n• Boundary (exterior) — edge values (0 and the ring midpoint).\n\nThe density score is the fraction of novel values. Above 0.25 indicates meaningful content. Below suggests repetitive or low-signal input.\n\nTwo modes: pass a type definition to analyse the full ring, or pass a text string to analyse it character by character.",
        useCase:
          "An agent receives a long message from another agent. Before processing it, it runs partition analysis to check whether the content is high-signal or likely spam. A density score below 0.1 is a red flag.",
        params: [
          { name: "input", in: "body", type: "string", required: false, description: "Text to analyse character by character. Use this or type_definition, not both." },
          { name: "type_definition", in: "body", type: "object", required: false, description: 'A type definition to partition across the full ring. E.g. { "@type": "type:PrimitiveType", "type:bitWidth": 8 }.' },
          { name: "resolver", in: "body", type: '"DihedralFactorizationResolver" | "EvaluationResolver"', required: false, default: "EvaluationResolver", description: "Which factorisation method to use. EvaluationResolver is faster. DihedralFactorizationResolver is more precise." },
        ],
        defaultBody: JSON.stringify({ input: "hello" }, null, 2),
        responseCodes: [200, 400, 405, 413, 415, 429, 500],
        example: `${BASE}/bridge/partition`,
      },
      {
        operationId: "observableMetrics",
        method: "GET",
        path: "/bridge/observable/metrics",
        label: "Get precise structural measurements for any value",
        explanation:
          "Computes four distinct measurements for a value:\n\n• Distance from zero — how far the value sits from the ring's origin (minimum of x and its complement).\n• Bit count — how many bits are set. A proxy for information density.\n• Cascade depth — how many times the value can be divided by two before reaching an odd number. Relates to prime structure.\n• Phase boundary — whether the value sits near a point where operations change character.",
        useCase:
          "An agent is monitoring a stream of values from another agent and notices erratic outputs. It calls this endpoint to measure each value's structural properties and detect anomalies — values near phase boundaries may indicate injection or corruption.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "The value to measure." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/bridge/observable/metrics?x=42`,
      },
      {
        operationId: "typeList",
        method: "GET",
        path: "/user/type/primitives",
        label: "Browse the built-in data types",
        explanation:
          "Returns the full catalogue of primitive types: U1 (1 bit, 2 values), U4 (4 bits, 16 values), U8 (8 bits, 256 values — the default everywhere), U16 (16 bits, 65,536 values).\n\nAlso lists composite types: pairs of values (ProductType), unions (SumType), and values with attached constraints (ConstrainedType).",
        useCase:
          "A developer or agent wants to know which type to use before calling the coherence proof or partition endpoints. This is the reference catalogue for type selection.",
        params: [],
        responseCodes: [200, 405, 429, 500],
        example: `${BASE}/user/type/primitives`,
      },
    ],
  },
];

/* ─────────────────────────── V2 stubs ─────────────────────────── */

interface StubTag {
  id: string;
  label: string;
  description: string;
  paths: string[];
}

const V2_STUBS: StubTag[] = [
  { id: "derivation", label: "Audit Traces", description: "Records a full step-by-step history of every operation an agent executes. Enables detection of prompt injection by comparing actual execution paths against expected derivations.", paths: ["/bridge/derivation"] },
  { id: "trace", label: "Execution Traces", description: "Captures the exact sequence of operations at a lower level than derivation. Useful for forensic analysis after an anomaly is detected.", paths: ["/bridge/trace"] },
  { id: "resolver", label: "Canonical Form Resolver", description: "Decomposes any value into its canonical irreducible representation using the full dihedral factorisation algorithm. Requires the Rust conformance suite.", paths: ["/bridge/resolver"] },
  { id: "morphism", label: "Structure-Preserving Maps", description: "Transforms data between different ring representations while guaranteeing that the structural properties are preserved. The formal basis for typed agent-to-agent communication.", paths: ["/user/morphism/transforms"] },
  { id: "state", label: "Agent State", description: "Manages agent lifecycle bindings: entry, transition, and exit conditions. Provides formal Frame and Transition objects for stateful coordination.", paths: ["/user/state"] },
];

/* ─────────────────────────── Utilities ─────────────────────────── */

function highlightJson(json: string): string {
  return json
    .replace(/("(?:[^"\\]|\\.)*")(\s*:)/g, '<span class="json-key">$1</span>$2')
    .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="json-string">$1</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>')
    .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');
}

function CopyButton({ text, size = "sm" }: { text: string; size?: "sm" | "xs" }) {
  const [copied, setCopied] = useState(false);
  const handle = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);
  return (
    <button
      onClick={handle}
      className={`shrink-0 rounded text-muted-foreground hover:text-foreground transition-colors ${size === "xs" ? "p-1" : "p-1.5"}`}
      aria-label="Copy to clipboard"
    >
      {copied ? <Check size={size === "xs" ? 11 : 13} className="text-primary" /> : <Copy size={size === "xs" ? 11 : 13} />}
    </button>
  );
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

/* ─────────────────────────── EndpointPanel ─────────────────────────── */

function EndpointPanel({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, string>>(
    Object.fromEntries(ep.params.filter(p => p.in === "query" && p.default).map(p => [p.name, p.default!]))
  );
  const [bodyValue, setBodyValue] = useState(ep.defaultBody ?? "");

  const buildUrl = () => {
    const qp = ep.params
      .filter(p => p.in === "query")
      .map(p => [p.name, paramValues[p.name] ?? ""] as [string, string])
      .filter(([, v]) => v !== "");
    const qs = new URLSearchParams(qp).toString();
    return `${BASE}${ep.path}${qs ? `?${qs}` : ""}`;
  };

  const curlCmd = ep.method === "GET"
    ? `curl "${buildUrl()}"`
    : `curl -X POST "${BASE}${ep.path}" \\\n  -H "Content-Type: application/json" \\\n  -d '${ep.defaultBody ?? "{}"}'`;

  async function run() {
    setOpen(true);
    setLoading(true);
    setResponse(null);
    try {
      const opts: RequestInit = { method: ep.method, headers: { "Content-Type": "application/json" } };
      if (ep.method === "POST" && bodyValue) opts.body = bodyValue;
      const res = await fetch(buildUrl(), opts);
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
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <MethodBadge method={ep.method} />
            <code className="font-mono text-sm text-foreground">{ep.path}</code>
          </div>
          <p className="text-sm font-medium text-foreground">{ep.label}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={run}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-60"
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
            Run
          </button>
          <button
            onClick={() => setOpen(o => !o)}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown size={15} className={`transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      <div className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="border-t border-border px-5 py-5 space-y-5">

            {/* What it does */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">What it does</p>
              <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">{ep.explanation}</p>
            </div>

            {/* Use case */}
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Example use case</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{ep.useCase}</p>
            </div>

            {/* Parameters */}
            {ep.params.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Parameters</p>
                <div className="space-y-2">
                  {ep.params.map(p => (
                    <div key={p.name} className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                      <code className={`font-mono text-xs mt-0.5 ${p.required ? "text-primary" : "text-muted-foreground"}`}>
                        {p.name}{p.required ? "" : "?"}
                      </code>
                      <p className="text-xs text-muted-foreground leading-relaxed">{p.description}{p.default ? ` Default: ${p.default}.` : ""}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive inputs */}
            {ep.params.filter(p => p.in === "query").length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Edit and run</p>
                <div className="space-y-2">
                  {ep.params.filter(p => p.in === "query").map(p => (
                    <div key={p.name} className="flex items-center gap-3">
                      <label className="font-mono text-xs text-primary w-20 shrink-0">{p.name}</label>
                      {p.enum ? (
                        <select
                          value={paramValues[p.name] ?? p.default ?? ""}
                          onChange={e => setParamValues(v => ({ ...v, [p.name]: e.target.value }))}
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {p.enum.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input
                          value={paramValues[p.name] ?? ""}
                          onChange={e => setParamValues(v => ({ ...v, [p.name]: e.target.value }))}
                          placeholder={p.default ?? p.type}
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      )}
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
              <pre className="bg-[hsl(220,18%,6%)] text-[hsl(152,34%,60%)] text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono leading-relaxed">{curlCmd}</pre>
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
                <button onClick={() => setResponse(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto">
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
                  className="bg-[hsl(220,18%,6%)] text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono leading-relaxed max-h-72 overflow-y-auto json-response"
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

/* ─────────────────────────── LayerSection ─────────────────────────── */

function LayerSection({ layer, index }: { layer: Layer; index: number }) {
  const [open, setOpen] = useState(index === 0 || index === 3);
  const Icon = layer.icon;

  return (
    <div
      className="bg-card rounded-2xl border border-border overflow-hidden transition-all duration-300 hover:border-primary/20 hover:shadow-sm animate-fade-in-up"
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      {/* Layer header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-5 md:p-7 cursor-pointer text-left"
      >
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60">
              Layer {layer.layerNum}
            </span>
            <span className="text-muted-foreground/25">·</span>
            <h3 className="font-display text-lg md:text-xl font-bold text-foreground">
              {layer.title}
            </h3>
          </div>
          {!open && (
            <p className="text-sm md:text-base font-body text-muted-foreground/65 mt-1.5 leading-relaxed">
              {layer.oneLiner}
            </p>
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground/40 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Expandable body */}
      <div className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="px-5 md:px-7 pb-7 pt-0 space-y-6">
            {/* Layer description */}
            <div className="ml-14 md:ml-16 space-y-3">
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                {layer.whyItMatters}
              </p>
              <p className="text-xs font-semibold text-primary/70 leading-relaxed">
                {layer.solves}
              </p>
            </div>

            {/* Endpoints */}
            <div className="space-y-3">
              {layer.endpoints.map(ep => (
                <EndpointPanel key={ep.operationId} ep={ep} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Main page ─────────────────────────── */

const Api = () => {
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

      {/* Hero */}
      <section className="hero-gradient pt-40 md:pt-52 pb-16 md:pb-22">
        <div className="container max-w-4xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            UOR Framework API
          </h1>
          <p
            className="mt-6 text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up max-w-2xl"
            style={{ animationDelay: "0.15s" }}
          >
            A live API for content-based identity, mathematical verification, and information quality measurement.
            No account needed. Every result is reproducible and independently verifiable.
          </p>
          <div
            className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.35s" }}
          >
            <a
              href="https://uor.foundation/openapi.json"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2"
            >
              OpenAPI 3.1.0 spec
              <ExternalLink size={13} />
            </a>
            <a href="#quick-start" className="btn-outline">
              Quick start
            </a>
          </div>
        </div>
      </section>

      {/* What problems does this solve */}
      <section className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Why this exists
          </p>
          <div className="max-w-3xl mb-10">
            <p className="text-foreground font-body text-base md:text-lg leading-[1.85] font-medium">
              AI agents share no common ground. They cannot verify each other's identity, detect when their instructions have been tampered with, or agree on whether content is meaningful.
            </p>
            <p className="mt-4 text-muted-foreground font-body text-base leading-[1.85]">
              This API exposes a formal mathematical substrate that makes those problems solvable. Every function is stateless, deterministic, and independently verifiable.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { problem: "Identity Fraud", solution: "Content-addressed identity. Any agent's address is derived from what it actually said — not from a name or token that can be stolen.", endpoint: "Layer 1" },
              { problem: "Auth Exploits", solution: "Certificate-anchored authentication. Every request can carry a proof object that any party can verify without contacting a server.", endpoint: "Layer 4" },
              { problem: "Prompt Injection", solution: "Derivation traces as execution witnesses. Compare what was supposed to happen against what actually ran.", endpoint: "v2" },
              { problem: "Content Spam", solution: "Partition analysis measures information density algebraically. Not a heuristic — a formal classification of novel versus repetitive content.", endpoint: "Layer 5" },
              { problem: "Opaque Coordination", solution: "A shared set of named operations with verifiable outputs. Agents can agree on results without trusting each other.", endpoint: "Layer 2" },
              { problem: "No Coherence Model", solution: "Coherence proofs verify that a type or value is consistent with the entire framework — for every possible input, not just a sample.", endpoint: "Layer 4" },
            ].map(item => (
              <div
                key={item.problem}
                className="rounded-2xl border border-border bg-card p-5 hover:border-primary/20 transition-all duration-300"
              >
                <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 mb-2">{item.endpoint}</p>
                <h3 className="font-display text-base font-bold text-foreground mb-2">{item.problem}</h3>
                <p className="text-sm font-body text-muted-foreground leading-relaxed">{item.solution}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick start */}
      <section id="quick-start" className="py-12 md:py-20 bg-background border-b border-border scroll-mt-28">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Quick Start
          </p>
          <p className="text-muted-foreground font-body text-base leading-relaxed max-w-2xl mb-8">
            Three commands. No setup, no account, no API key.
          </p>

          <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
            {[
              {
                step: "1",
                label: "Discover all endpoints",
                cmd: `curl "${BASE}/navigate"`,
                note: "Returns a complete map of every endpoint and what each one does. Start here.",
              },
              {
                step: "2",
                label: "Verify the core identity: negate(bitwise-invert(42)) = increment(42) = 43",
                cmd: `curl "${BASE}/kernel/op/verify?x=42"`,
                note: "The foundational claim of the framework. Returns a step-by-step proof in under 100 ms.",
              },
              {
                step: "3",
                label: "Measure the information density of a string",
                cmd: `curl -X POST "${BASE}/bridge/partition" -H "Content-Type: application/json" -d '{"input":"hello world"}'`,
                note: "Returns a density score: what fraction of the content is novel versus repetitive.",
              },
            ].map(({ step, label, cmd, note }) => (
              <div key={step} className="flex items-start gap-4 px-5 py-4 bg-card">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
                  {step}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-xs text-[hsl(152,34%,60%)] bg-[hsl(220,18%,6%)] px-3 py-1.5 rounded-lg flex-1 min-w-0 break-all">{cmd}</code>
                    <CopyButton text={cmd} size="xs" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Base URL + Rate limits */}
      <section className="py-10 md:py-14 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base URL */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Base URL</p>
              <div className="flex items-center gap-2">
                <code className="font-mono text-xs text-foreground bg-muted px-3 py-2 rounded-lg flex-1 break-all">{BASE}</code>
                <CopyButton text={BASE} />
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                A second canonical URL at https://uor.foundation/api/v1 is planned. Currently routes to the same backend.
              </p>
            </div>

            {/* Rate limits */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Rate limits</p>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GET endpoints</span>
                  <span className="font-semibold text-foreground font-mono">120 / min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">POST endpoints</span>
                  <span className="font-semibold text-foreground font-mono">60 / min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">With X-UOR-Agent-Key header</span>
                  <span className="font-semibold text-foreground font-mono">elevated</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All responses include X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, and ETag headers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Layered endpoint reference */}
      <section id="architecture" className="py-12 md:py-20 bg-background border-b border-border scroll-mt-28">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Architecture
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
            API Architecture
          </h2>
          <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed max-w-2xl mb-14">
            Endpoints are organized into six layers that mirror the UOR Framework itself. Each layer builds on the one below it.
          </p>

          <div className="flex flex-col gap-3">
            {LAYERS.map((layer, index) => (
              <LayerSection key={layer.id} layer={layer} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* v2 stubs */}
      <section className="py-12 md:py-16 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <p className="text-sm font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Coming in v2
          </p>
          <p className="text-muted-foreground font-body text-base leading-relaxed max-w-2xl mb-8">
            These namespaces are formally defined in the OpenAPI spec and in the UOR ontology, but require the full Rust conformance suite to expose via the cloud API. Each returns HTTP 501 today.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {V2_STUBS.map(stub => (
              <div key={stub.id} className="rounded-2xl border border-dashed border-border bg-card/50 p-5 opacity-70">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-foreground">{stub.label}</p>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">501</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">{stub.description}</p>
                {stub.paths.map(p => (
                  <code key={p} className="font-mono text-xs text-muted-foreground/70">{p}</code>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For AI agents */}
      <section className="section-dark py-14 md:py-20">
        <div className="container max-w-5xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            For AI Agents
          </h2>
          <p className="text-section-dark-foreground/60 font-body text-base leading-relaxed max-w-xl mb-10">
            If you are an AI agent reading this, follow this sequence to bootstrap your understanding of the framework.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Discovery chain */}
            <div>
              <p className="text-xs font-semibold text-section-dark-foreground/50 uppercase tracking-widest mb-4">Discovery chain</p>
              <div className="space-y-4">
                {[
                  { step: "1", label: "/.well-known/uor.json", note: "Machine-readable organisation descriptor. Contains the uor:api.openapi field pointing to the spec.", href: "https://uor.foundation/.well-known/uor.json" },
                  { step: "2", label: "GET /openapi.json", note: "Full OpenAPI 3.1.0 specification. Parse all paths, operationIds, and schemas.", href: `${BASE}/openapi.json` },
                  { step: "3", label: "GET /navigate", note: "Complete endpoint index with reading order.", href: `${BASE}/navigate` },
                  { step: "4", label: "GET /kernel/op/verify?x=42", note: "Zero auth. Returns a full proof in under 100 ms. The first verifiable claim.", href: `${BASE}/kernel/op/verify?x=42` },
                ].map(({ step, label, note, href }) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-section-dark-foreground/20 text-section-dark-foreground text-xs font-bold flex items-center justify-center mt-0.5">
                      {step}
                    </span>
                    <div>
                      <a href={href} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-section-dark-foreground hover:opacity-80 transition-opacity flex items-center gap-1.5">
                        {label}
                        <ExternalLink size={10} />
                      </a>
                      <p className="text-xs text-section-dark-foreground/50 mt-0.5 leading-relaxed">{note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Machine-readable entry points */}
            <div>
              <p className="text-xs font-semibold text-section-dark-foreground/50 uppercase tracking-widest mb-4">Machine-readable entry points</p>
              <div className="space-y-3">
                {[
                  { label: "OpenAPI 3.1.0 spec", url: "https://uor.foundation/openapi.json", note: "Parse paths, operationIds, schemas, response types." },
                  { label: "Agent Quick Card", url: "https://uor.foundation/llms.md", note: "5-minute orientation. Frontmatter includes api_url and api_spec." },
                  { label: "Full Reference", url: "https://uor.foundation/llms-full.md", note: "Complete guide with all curl examples and implementation notes." },
                  { label: "Discovery metadata", url: "https://uor.foundation/.well-known/uor.json", note: "JSON-LD descriptor containing the uor:api.openapi field." },
                ].map(({ label, url, note }) => (
                  <div key={url} className="flex items-start gap-3">
                    <ArrowRight size={13} className="text-section-dark-foreground/40 shrink-0 mt-0.5" />
                    <div>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-section-dark-foreground hover:opacity-80 transition-opacity flex items-center gap-1.5 flex-wrap">
                        {label}: <span className="font-mono font-normal text-section-dark-foreground/50 break-all">{url}</span>
                        <ExternalLink size={9} />
                      </a>
                      <p className="text-xs text-section-dark-foreground/40 mt-0.5">{note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

    </Layout>
  );
};

export default Api;
