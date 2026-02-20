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

interface V2Stub {
  label: string;
  description: string;
  path: string;
}

interface Layer {
  id: string;
  icon: React.ElementType;
  layerNum: number;
  title: string;
  oneLiner: string;
  whyItMatters: string;
  solves: string;
  endpoints: Endpoint[];
  v2stubs?: V2Stub[];
}

/* ─────────────────────────── Layer + Endpoint data ─────────────────────────── */

/* ─────────────────────────── Discovery endpoints (pre-layer) ─────────────────────────── */

interface DiscoveryEndpoint {
  method: "GET";
  path: string;
  label: string;
  explanation: string;
  example: string;
}

const DISCOVERY_ENDPOINTS: DiscoveryEndpoint[] = [
  {
    method: "GET",
    path: "/navigate",
    label: "Get the complete endpoint index",
    explanation: "Returns a complete map of every endpoint — path, method, and purpose — in one call. If you are new to the API, start here.",
    example: `${BASE}/navigate`,
  },
  {
    method: "GET",
    path: "/openapi.json",
    label: "Download the machine-readable spec",
    explanation: "The full machine-readable spec in OpenAPI 3.1.0 format. Use the static copy at uor.foundation/openapi.json to parse all paths, schemas, and response types offline.",
    example: `${BASE}/openapi.json`,
  },
];

/* ─────────────────────────── Layers ─────────────────────────── */

const LAYERS: Layer[] = [
  {
    id: "layer-0",
    icon: Diamond,
    layerNum: 0,
    title: "The Foundation",
    oneLiner: "The one mathematical rule everything else is built on. Provable in under 100ms.",
    whyItMatters:
      "There is one rule at the base of the framework: applying bitwise-invert then negate to any value always equals incrementing it by one. These two endpoints let you verify that — for one value or every value at once. If this holds, every layer above it holds. For agents with no shared authority, this is the trust anchor.",
    solves: "Solves: Agent trust problem — agents with no common authority cannot coordinate. These endpoints return a machine-checkable proof, not an assertion.",
    endpoints: [
      {
        operationId: "opVerifyCriticalIdentity",
        method: "GET",
        path: "/kernel/op/verify",
        label: "Verify the core rule for one value",
        explanation:
          "Checks that negate(bitwise-invert(x)) equals increment(x) for the value you supply. Returns every intermediate step — not just pass or fail.\n\nThis is the most important endpoint in the API: the rule it checks is the structural guarantee everything else depends on.",
        useCase:
          "An agent is told the framework is trustworthy. It calls this endpoint with a value it chose, confirms the rule holds, and then relies on the framework with mathematical confidence — no trust required.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "The value to check. Must be 0 or greater, and less than 2 to the power of n." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size. Default 8 means values 0–255." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/kernel/op/verify?x=42`,
      },
      {
        operationId: "opVerifyAll",
        method: "GET",
        path: "/kernel/op/verify/all",
        label: "Verify the core rule for every value in the ring",
        explanation:
          "Runs the same check across every value in the ring — all 256 for the default 8-bit ring. Returns a pass count, fail count, and a universal verdict.\n\nOne example proves nothing. Exhaustive verification is what turns a claim into proof.",
        useCase:
          "An agent wants to confirm the framework is internally consistent before relying on any of its operations. 256 passes, zero failures.",
        params: [
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size. n=8 checks all 256 values. n=4 checks 16." },
          { name: "expand", in: "query", type: "boolean", required: false, default: "false", description: "Set to true to include per-value results." },
        ],
        responseCodes: [200, 405, 429, 500],
        example: `${BASE}/kernel/op/verify/all?n=8`,
      },
    ],
  },
  {
    id: "layer-1",
    icon: Hash,
    layerNum: 1,
    title: "Identity",
    oneLiner: "Permanent, unforgeable addresses derived from content — not from names or servers.",
    whyItMatters:
      "Location-based identifiers change when data moves. Content addresses are computed from the content itself — the same text always maps to the same address, on any machine, without a registry. An agent's identity is its content. That cannot be impersonated.",
    solves: "Solves: Identity Fraud — names and tokens can be copied. Content addresses cannot — they are derived, not assigned.",
    endpoints: [
      {
        operationId: "addressEncode",
        method: "POST",
        path: "/kernel/address/encode",
        label: "Turn any text into a permanent, unique address",
        explanation:
          "Send any text, receive a permanent address computed from its bytes. The same input always produces the same address — no server, no timestamp, no registry required.\n\nOne character difference produces a completely different address.",
        useCase:
          "An agent signs its output by encoding its response into a content address and attaching it to the message. Any recipient re-encodes the same text and checks the address matches.",
        params: [
          { name: "input", in: "body", type: "string (max 1000 chars)", required: true, description: "The text to address." },
          { name: "encoding", in: "body", type: '"utf8"', required: false, default: "utf8", description: "Text encoding. Only utf8 is supported." },
        ],
        defaultBody: JSON.stringify({ input: "hello", encoding: "utf8" }, null, 2),
        responseCodes: [200, 400, 405, 413, 415, 429, 500],
        example: `${BASE}/kernel/address/encode`,
      },
      {
        operationId: "schemaDatum",
        method: "GET",
        path: "/kernel/schema/datum",
        label: "Get the full structural profile of any number",
        explanation:
          "Every value in UOR is more than a number — it has a position in a mathematical structure. This returns the full profile: decimal value, binary representation, bits set, and content address.\n\nUnderstanding this helps interpret results from every other endpoint.",
        useCase:
          "An agent receives a numeric result and wants its full structural context before using it in a proof.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "The number to describe. Must be less than 2 to the power of n." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size. Default 8 means values 0–255." },
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
    title: "Structure",
    oneLiner: "A fixed set of named operations with verifiable, shareable results.",
    whyItMatters:
      "UOR defines 12 operations — negate, invert, add, multiply, and more. Each has a formal name, formula, and relationship to the core rule. When agents exchange computed values, they can verify each other's work against these definitions. There is no ambiguity about what was computed.",
    solves: "Solves: Opaque Coordination — two agents computing the same operation get the same result, or the discrepancy is detectable.",
    endpoints: [
      {
        operationId: "opCompute",
        method: "GET",
        path: "/kernel/op/compute",
        label: "Run every operation on a value at once",
        explanation:
          "Takes one or two numbers and returns every operation result at once.\n\nUnary (single input): negate, bitwise-invert, increment, decrement.\nBinary (two inputs): add, subtract, multiply, XOR, AND, OR.\n\nAll results in one response — compare them side by side.",
        useCase:
          "A developer exploring how the framework behaves for a specific value, or an agent that wants to see all possible outcomes before committing to one.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "The primary number. Must be less than 2 to the power of n." },
          { name: "y", in: "query", type: "integer", required: false, default: "10", description: "Second number for binary operations. Defaults to x if omitted." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size. Default 8." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/kernel/op/compute?x=42&y=10`,
      },
      {
        operationId: "opList",
        method: "GET",
        path: "/kernel/op/operations",
        label: "Browse every named operation with its formal definition",
        explanation:
          "Returns all 12 named operations with their formal definitions: formulas, algebraic class, and relationship to the core rule. This is the shared dictionary every agent can reference.",
        useCase:
          "An agent or developer wants to confirm a named operation in a proof object matches a known definition before verifying it.",
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
    title: "Resolution",
    oneLiner: "Know the type and class of any value before you compute with it.",
    whyItMatters:
      "Every value belongs to one of four categories: building block, composed value, structural anchor, or boundary. Knowing which category a value belongs to before operating on it prevents type errors and incorrect proofs. This layer gives agents a formal type system they share without negotiation.",
    solves: "Solves: Type mismatches — agents using the same bytes can reach different conclusions if they disagree on what kind of value it is.",
    endpoints: [
      {
        operationId: "typeList",
        method: "GET",
        path: "/user/type/primitives",
        label: "Browse the built-in data types",
        explanation:
          "Returns the built-in type catalogue: U1, U4, U8, U16 (1 to 16 bits), plus composite types — pairs, unions, and constrained values. The type you pick here feeds directly into the coherence and partition endpoints.",
        useCase:
          "A developer wants to know which type to pass before calling the coherence or partition endpoints.",
        params: [],
        responseCodes: [200, 405, 429, 500],
        example: `${BASE}/user/type/primitives`,
      },
      {
        operationId: "bridgeResolver",
        method: "GET",
        path: "/bridge/resolver",
        label: "Classify any value into its canonical category",
        explanation:
          "Sorts any value into one of four canonical categories:\n\n• Building block (irreducible) — odd, not a unit. Structurally unique.\n• Composed (reducible) — even. Breaks into 2^k × odd core.\n• Anchor (unit) — the ring's multiplicative identity or its inverse.\n• Boundary (exterior) — zero or the ring midpoint.\n\nFor composed values, shows the full factor breakdown. For building blocks, confirms no further decomposition is possible.",
        useCase:
          "Before using a value in a proof or translation, an agent must know its category. This endpoint answers: is this a building block, a composed value, a structural anchor, or a boundary case?",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "The value to classify. Must be less than 2 to the power of n." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size. Default 8 means values 0–255." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/bridge/resolver?x=42`,
      },
    ],
  },
  {
    id: "layer-4",
    icon: ShieldCheck,
    layerNum: 4,
    title: "Verification",
    oneLiner: "Shareable proof objects any party can verify independently — no server needed.",
    whyItMatters:
      "A proof object is not just a correct answer. It has a permanent address, shows every derivation step, and can be verified by anyone without contacting a server. Certificates attest to properties across all values. Both are self-contained objects you can share, store, and re-verify at any time.",
    solves: "Solves: Auth exploits and prompt injection — proofs anchored to content addresses cannot be forged or replayed. The math is the trust chain.",
    endpoints: [
      {
        operationId: "proofCriticalIdentity",
        method: "GET",
        path: "/bridge/proof/critical-identity",
        label: "Generate a shareable proof for one value",
        explanation:
          "Produces a full proof object with a unique permanent address. Anyone can take this object, replay the derivation steps, and confirm it is correct — no server contact needed.\n\nEvery step is explicit: input, each intermediate value, final comparison.",
        useCase:
          "An agent produces a proof for its own identity value and attaches it to outgoing messages. Recipients verify independently. The math is the trust chain.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "The value to prove." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/bridge/proof/critical-identity?x=42`,
      },
      {
        operationId: "proofCoherence",
        method: "POST",
        path: "/bridge/proof/coherence",
        label: "Prove a type is consistent across all values",
        explanation:
          "Verifies the core rule holds for every element of a given type — not a sample, every value. A passing type is coherent and participates fully in the framework's guarantees.\n\nReturns pass rate, fail count, and a single boolean verdict. 100% is required.",
        useCase:
          "Before using a custom data type in agent coordination, verify it is coherent. A non-coherent type will produce unpredictable results with every framework operation.",
        params: [
          { name: "type_definition", in: "body", type: "object", required: true, description: 'The type to verify. Minimum: { "@type": "type:PrimitiveType", "type:bitWidth": 8 }' },
          { name: "n", in: "body", type: "integer [1–16]", required: false, default: "8", description: "Ring size. Defaults to the bitWidth in the type definition." },
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
          "Some operations undo themselves when applied twice. Negate and bitwise-invert are both self-inverting: negate(negate(x)) = x for every value in the ring. This verifies that exhaustively, then issues a shareable certificate.\n\nCertificates can be stored and shared. Peers verify them directly — no re-computation needed.",
        useCase:
          "An agent proves to a peer that an operation is safe to reverse. It shares the certificate. The peer verifies it in one call.",
        params: [
          { name: "operation", in: "query", type: "string", required: true, default: "neg", enum: ["neg", "bnot"], description: '"neg" = negate. "bnot" = bitwise invert.' },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/bridge/cert/involution?operation=neg`,
      },
      {
        operationId: "bridgeDerivation",
        method: "GET",
        path: "/bridge/derivation",
        label: "Record an auditable step-by-step derivation",
        explanation:
          "Takes a starting value and a sequence of operations, and returns a formal record of every step: input, output, formula used, and ontology reference. Also verifies the core rule holds for the original value — an independent integrity check bundled into the same response.",
        useCase:
          "An agent runs a sequence of operations and needs an auditable record. The derivation trace is the formal receipt. Peers replay it to verify independently.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "The starting value. Must be less than 2^n." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size. Default 8." },
          { name: "ops", in: "query", type: "string", required: false, default: "neg,bnot,succ", description: "Comma-separated operations. Valid: neg, bnot, succ, pred." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/bridge/derivation?x=42&ops=neg,bnot,succ`,
      },
      {
        operationId: "bridgeTrace",
        method: "GET",
        path: "/bridge/trace",
        label: "Capture the exact bit state at every execution step",
        explanation:
          "Lower-level than derivation. Records the exact binary state of the value after each operation — the decimal value, binary form, how many bits are set, which bits flipped, and the delta from the previous step.\n\nUseful when you need to see exactly where a bit pattern diverged.",
        useCase:
          "An agent detects unexpected output from a peer and wants to find where the computation diverged. The trace shows exactly which bits changed at each step.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "The starting value. Must be less than 2^n." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size. Default 8." },
          { name: "ops", in: "query", type: "string", required: false, default: "neg,bnot", description: "Comma-separated operations. Valid: neg, bnot, succ, pred." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/bridge/trace?x=42&ops=neg,bnot`,
      },
    ],
  },
  {
    id: "layer-5",
    icon: ArrowRightLeft,
    layerNum: 5,
    title: "Transformation",
    oneLiner: "Translate values between contexts, score information density — formally and deterministically.",
    whyItMatters:
      "Spam filters use pattern-matching, which can be fooled. UOR partition analysis measures algebraic byte-class distribution — how bytes in your content distribute across the ring's four structural groups. This is a formal, deterministic property, not a trained guess. Morphisms let agents safely translate values between different ring sizes without losing structural properties.",
    solves: "Solves: Content spam — partition analysis is a formal structural property of byte values, not a semantic heuristic. A low density score is reproducible and machine-verifiable. Combine with other signals for content-quality decisions.",
    endpoints: [
      {
        operationId: "partitionResolve",
        method: "POST",
        path: "/bridge/partition",
        label: "Score the information density of any content",
        explanation:
          "Classifies every byte in the input into one of four ring-theoretic groups — building blocks, composed values, structural anchors, and boundaries — then returns the fraction that are building blocks as a density score.\n\nAbove 0.25: content passes the algebraic density threshold. Below 0.1: strong signal of structurally uniform or repetitive content.\n\nImportant: this measures algebraic byte-class distribution, not semantic novelty. Repetitive content with odd byte values (e.g. 'aaaa') will score high. Use as one signal among others.\n\nPass text for per-character analysis, or a type definition for full-ring analysis.",
        useCase:
          "An agent receives a long message and runs partition analysis before processing it. A low density score is a formal, reproducible signal — not a heuristic guess.",
        params: [
          { name: "input", in: "body", type: "string", required: false, description: "Text to analyse. Use this or type_definition, not both." },
          { name: "type_definition", in: "body", type: "object", required: false, description: 'A type definition to partition across the full ring. E.g. { "@type": "type:PrimitiveType", "type:bitWidth": 8 }.' },
          { name: "resolver", in: "body", type: '"DihedralFactorizationResolver" | "EvaluationResolver"', required: false, default: "EvaluationResolver", description: "Factorisation method. EvaluationResolver is faster. DihedralFactorizationResolver is more precise." },
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
          "Computes four precise measurements for any value:\n\n• Distance from zero — how far the value sits from the ring's origin.\n• Bits set — how many bits are on. A proxy for information content.\n• Cascade depth — how many times divisible by two before reaching an odd number.\n• Phase boundary — whether the value is near a point where operations change behaviour.",
        useCase:
          "An agent monitoring a stream of values notices erratic outputs. Structural metrics reveal which values sit near phase boundaries — often the source of instability.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "The value to measure." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/bridge/observable/metrics?x=42`,
      },
      {
        operationId: "morphismTransforms",
        method: "GET",
        path: "/user/morphism/transforms",
        label: "Map a value from one ring to another, preserving structure",
        explanation:
          "Maps a value from one ring size to another while preserving its structural properties.\n\n• Smaller target ring: strips the high bits (projection).\n• Larger target ring: embeds the value unchanged (inclusion).\n• Same size: identity map.\n\nReturns the mapped value, which properties are preserved, and whether the map is injective and surjective.",
        useCase:
          "An agent operating in an 8-bit ring sends a value to a peer in a 4-bit ring. It uses this endpoint to compute the correct projection and confirm what is preserved.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "The value to map. Must be less than 2^from_n." },
          { name: "from_n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Source ring size (bits)." },
          { name: "to_n", in: "query", type: "integer [1–16]", required: false, default: "4", description: "Target ring size (bits)." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/user/morphism/transforms?x=42&from_n=8&to_n=4`,
      },
      {
        operationId: "userState",
        method: "GET",
        path: "/user/state",
        label: "Get the formal state description for an agent value",
        explanation:
          "Returns the formal lifecycle state for an agent at value x.\n\n• What category x belongs to and why.\n• Whether x is a stable entry point (an identity or unit).\n• Whether x is at a phase boundary.\n• For each operation — negate, invert, increment, decrement — where does x go and does its category change?",
        useCase:
          "An agent must decide its next action from its current value. This endpoint answers: am I at a stable state, a boundary, or an interior point? What does each available operation do to my category?",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "The agent's current state. Must be less than 2^n." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size. Default 8." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/user/state?x=42`,
      },
    ],
  },
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
          <p className="text-base font-medium text-foreground">{ep.label}</p>
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
              <p className="text-base text-foreground/80 whitespace-pre-line leading-relaxed">{ep.explanation}</p>
            </div>

            {/* Use case */}
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Example use case</p>
              <p className="text-base text-foreground/80 leading-relaxed">{ep.useCase}</p>
            </div>

            {/* Parameters */}
            {ep.params.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Parameters</p>
                <div className="space-y-2">
                  {ep.params.map(p => (
                    <div key={p.name} className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                      <code className={`font-mono text-sm mt-0.5 ${p.required ? "text-primary" : "text-muted-foreground"}`}>
                        {p.name}{p.required ? "" : "?"}
                      </code>
                      <p className="text-sm text-muted-foreground leading-relaxed">{p.description}{p.default ? ` Default: ${p.default}.` : ""}</p>
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
                      <label className="font-mono text-sm text-primary w-24 shrink-0">{p.name}</label>
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

/* ─────────────────────────── LayerSection ─────────────────────────── */

function LayerSection({ layer, index }: { layer: Layer; index: number }) {
  const isLinkedFromHash = typeof window !== "undefined" && window.location.hash === `#${layer.id}`;
  const [open, setOpen] = useState(index === 0 || isLinkedFromHash);
  const Icon = layer.icon;

  return (
    <div
      id={layer.id}
      className="bg-card rounded-2xl border border-border overflow-hidden transition-all duration-300 hover:border-primary/20 hover:shadow-sm animate-fade-in-up scroll-mt-28"
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
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                {layer.whyItMatters}
              </p>
              <p className="text-sm font-semibold text-primary/70 leading-relaxed">
                {layer.solves}
              </p>
            </div>

            {/* Live endpoints */}
            <div className="space-y-3">
              {layer.endpoints.map(ep => (
                <EndpointPanel key={ep.operationId} ep={ep} />
              ))}
            </div>

            {/* V2 stubs — within this layer */}
            {layer.v2stubs && layer.v2stubs.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2 mt-1">Coming in v2</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {layer.v2stubs.map(stub => (
                    <div key={stub.path} className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-3 opacity-65">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-xs font-semibold text-foreground">{stub.label}</p>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">501</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">{stub.description}</p>
                      <code className="font-mono text-[10px] text-muted-foreground/60">{stub.path}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
          <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 mb-4 animate-fade-in-up">
            OpenAPI 3.1.0 · No account required
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            A unified computational substrate for agentic AI
          </h1>
          <p
            className="mt-5 text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up max-w-2xl"
            style={{ animationDelay: "0.15s" }}
          >
            The UOR Framework API gives AI agents a shared mathematical ground truth — a common set of rules every agent can verify independently. Provable identity, tamper-evident computation, formally grounded content quality. Every response is stateless, deterministic, and verifiable without contacting a server.
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
            Why it matters
          </p>
          <div className="max-w-3xl mb-10">
            <p className="text-foreground font-body text-base md:text-lg leading-[1.85] font-medium">
              AI agents have no shared ground truth. They can't verify each other's identity, detect tampered instructions, or agree on whether content is meaningful — until now.
            </p>
            <p className="mt-3 text-muted-foreground font-body text-base leading-[1.85]">
              UOR is a unified computational substrate: a set of mathematical rules every agent can run independently and get the same verifiable result. No central authority. No trust required.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { problem: "Identity Fraud", solution: "Anyone can pretend to be anyone online. UOR gives every piece of content a unique fingerprint — derived from what it actually says, not who claims to own it.", endpoint: "Layer 1", layerId: "layer-1", layerNum: 1 },
              { problem: "Auth Exploits", solution: "Passwords and tokens get stolen. UOR proofs are mathematical — any recipient can verify them independently, with no server or middleman involved.", endpoint: "Layer 4", layerId: "layer-4", layerNum: 4 },
              { problem: "Prompt Injection", solution: "Hidden instructions can silently change what an AI does. UOR records every step of a computation — so any deviation from expected behaviour is immediately detectable.", endpoint: "Layer 4", layerId: "layer-4", layerNum: 4 },
              { problem: "Content Spam", solution: "AI spam filters are easy to fool with paraphrasing. UOR scores content using algebraic structure — a fixed mathematical property that cannot be gamed by rewording.", endpoint: "Layer 5", layerId: "layer-5", layerNum: 5 },
              { problem: "Opaque Coordination", solution: "When AI agents share results, there is no standard way to check the work. Every UOR operation has a formal name and definition — any agent can verify any result.", endpoint: "Layer 2", layerId: "layer-2", layerNum: 2 },
              { problem: "No Coherence Model", solution: "AI systems break down when they silently disagree on the meaning of data. UOR coherence proofs confirm that a data type behaves consistently — across every possible value.", endpoint: "Layer 4", layerId: "layer-4", layerNum: 4 },
            ].map(item => (
              <a
                key={item.problem}
                href={`#${item.layerId}`}
                className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-md transition-all duration-300 group flex flex-col"
              >
                <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 mb-2">{item.endpoint}</p>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{item.problem}</h3>
                <p className="text-sm font-body text-muted-foreground leading-relaxed flex-1">{item.solution}</p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary/70 group-hover:text-primary transition-colors duration-200 mt-4 pt-4 border-t border-border">
                  Try this now
                  <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                </span>
              </a>
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
            No signup. No API key. Paste any of these into a terminal and get a real response in under a second.
          </p>

          <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
            {[
              {
                step: "1",
                label: "Discover what the API can do",
                why: "Before trying anything, get a full map of every available endpoint — what each one does and in what order to use them. This is the index.",
                cmd: `curl "${BASE}/navigate"`,
                note: "Returns a structured list of all endpoints with descriptions. A good first call for any agent or developer.",
              },
              {
                step: "2",
                label: "Prove a mathematical rule holds — for real",
                why: "UOR is built on one foundational rule: a specific sequence of operations always produces the same result. This command runs that check live and shows every step. If this holds, the entire framework is trustworthy.",
                cmd: `curl "${BASE}/kernel/op/verify?x=42"`,
                note: "You're not trusting a claim — you're verifying it yourself. Change 42 to any number and the result is the same.",
              },
              {
                step: "3",
                label: "Measure whether content is meaningful or noise",
                why: "Not all text carries equal information. This command scores any piece of text using algebraic structure — a fixed mathematical property, not a trained model that can be fooled.",
                cmd: `curl -X POST "${BASE}/bridge/partition" -H "Content-Type: application/json" -d '{"input":"hello world"}'`,
                note: "Swap in any text. The density score tells you how structurally varied the content is — low scores flag uniform or repetitive content.",
              },
            ].map(({ step, label, why, cmd, note }) => (
              <div key={step} className="flex items-start gap-4 px-5 py-6 bg-card">
                <span className="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center mt-0.5">
                  {step}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-foreground mb-1">{label}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{why}</p>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm text-[hsl(152,34%,60%)] bg-[hsl(220,18%,6%)] px-3 py-1.5 rounded-lg flex-1 min-w-0 break-all">{cmd}</code>
                    <CopyButton text={cmd} size="xs" />
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-2 leading-relaxed">{note}</p>
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
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Base URL</p>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm text-foreground bg-muted px-3 py-2 rounded-lg flex-1 break-all">{BASE}</code>
                <CopyButton text={BASE} />
              </div>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                Canonical URL at https://uor.foundation/api/v1 coming soon. Both route to the same backend.
              </p>
            </div>

            {/* Rate limits */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Rate limits</p>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-base">
                  <span className="text-muted-foreground">GET</span>
                  <span className="font-semibold text-foreground font-mono">120 / min</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-muted-foreground">POST</span>
                  <span className="font-semibold text-foreground font-mono">60 / min</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-muted-foreground">X-UOR-Agent-Key header</span>
                  <span className="font-semibold text-foreground font-mono">elevated</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every response includes X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, and ETag headers.
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
            Six layers, fully live
          </h2>
          <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed max-w-2xl mb-10">
            The API is organised into six layers. Each layer adds a capability — from the single mathematical rule at the base, to identity, operations, classification, verification, and transformation. Every layer is live and working now.
          </p>

          {/* API Discovery — pre-layer, always visible */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              API Discovery — Start here
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DISCOVERY_ENDPOINTS.map(ep => (
                <div key={ep.path} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold">GET</span>
                    <code className="font-mono text-sm text-foreground">{ep.path}</code>
                  </div>
                  <p className="text-base font-semibold text-foreground mb-1">{ep.label}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{ep.explanation}</p>
                  <div className="flex items-center gap-2">
                    <a
                      href={ep.example}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-mono text-primary hover:opacity-80 transition-opacity"
                    >
                      Run <ExternalLink size={11} />
                    </a>
                    <CopyButton text={`curl "${ep.example}"`} size="xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {LAYERS.map((layer, index) => (
              <LayerSection key={layer.id} layer={layer} index={index} />
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
            Follow this sequence to discover the full API, verify the core rule independently, and start building — zero auth, zero setup.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Discovery chain */}
            <div>
              <p className="text-xs font-semibold text-section-dark-foreground/50 uppercase tracking-widest mb-4">Discovery chain</p>
              <div className="space-y-4">
                {[
                  { step: "1", label: "/.well-known/uor.json", note: "Organisation descriptor. The uor:api.openapi field points to the spec.", href: "https://uor.foundation/.well-known/uor.json" },
                  { step: "2", label: "GET /openapi.json", note: "Redirects to the full OpenAPI 3.1.0 spec at uor.foundation/openapi.json — 19 paths, all working.", href: `${BASE}/openapi.json` },
                  { step: "3", label: "GET /navigate", note: "Complete endpoint index — all 20 endpoints with required params and example URLs.", href: `${BASE}/navigate` },
                  { step: "4", label: "GET /kernel/op/verify?x=42", note: "First verifiable claim. Zero auth. Returns a full proof in under 100ms.", href: `${BASE}/kernel/op/verify?x=42` },
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
