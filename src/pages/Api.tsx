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
  HardDrive,
} from "lucide-react";

/* ─────────────────────────── Constants ─────────────────────────── */

/** Display URL used in curl snippets and documentation */
const BASE = "https://api.uor.foundation/v1";

/** Runtime URL used for actual fetch calls from the browser.
 *  The custom domain api.uor.foundation may not resolve from all origins
 *  (e.g. preview/localhost), so we route through the Supabase edge function URL. */
const RUNTIME_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "erwfuxphwcvynxhfbvql"}.supabase.co/functions/v1/uor-api`;

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
    label: "Get the full endpoint index",
    explanation: "Returns every endpoint in one call: path, method, and purpose. Start here.",
    example: `${BASE}/navigate`,
  },
  {
    method: "GET",
    path: "/openapi.json",
    label: "Download the OpenAPI 3.1.0 spec",
    explanation: "Machine-readable spec with all paths, schemas, and response types. Also available at uor.foundation/openapi.json.",
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
    oneLiner: "One mathematical rule. Provable in under 100ms. Everything above depends on it.",
    whyItMatters:
      "The framework rests on a single verifiable rule: for any value x, negate(bitwise-invert(x)) always equals x + 1. If this holds, every layer above it holds. These endpoints let you check it yourself.",
    solves: "Value: Agents that share no common authority can establish trust through a mathematical proof, not a handshake.",
    endpoints: [
      {
        operationId: "opVerifyCriticalIdentity",
        method: "GET",
        path: "/kernel/op/verify",
        label: "Check the core rule for any value",
        explanation:
          "Send a number, get back every step of the proof: input, bitwise inversion, negation, increment, and whether they match. Not just pass/fail. The full derivation.\n\nThis is the trust anchor. If this passes, the framework's guarantees hold for that value.",
        useCase:
          "Pick any number. Call this endpoint. If it passes, the framework is mathematically sound for that value. No trust required.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "Any value from 0 to 2^n - 1." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size in bits. Default 8 = values 0–255." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/kernel/op/verify?x=42`,
      },
      {
        operationId: "opVerifyAll",
        method: "GET",
        path: "/kernel/op/verify/all",
        label: "Check the core rule for every value in the ring",
        explanation:
          "Runs the same check across every value: all 256 for the default 8-bit ring. Returns pass count, fail count, and a single verdict.\n\nOne value proves nothing. Exhaustive verification turns a claim into proof.",
        useCase:
          "Confirm the entire ring is consistent before relying on any operation. 256 passes, zero failures.",
        params: [
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size. n=8 checks 256 values, n=4 checks 16." },
          { name: "expand", in: "query", type: "boolean", required: false, default: "false", description: "Include per-value detail." },
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
    oneLiner: "Permanent addresses derived from content. Same input, same address, every time.",
    whyItMatters:
      "URLs break when servers move. Content addresses are computed from the bytes themselves. The same text always produces the same address, on any machine, with no registry. Identity comes from what it is, not where it lives.",
    solves: "Value: Names and tokens can be copied. Content addresses cannot. They are derived, not assigned.",
    endpoints: [
      {
        operationId: "addressEncode",
        method: "POST",
        path: "/kernel/address/encode",
        label: "Get the permanent address for any text",
        explanation:
          "Send text, receive its content address. Same input always produces the same output. No server, no timestamp, no registry.\n\nChange one character and the address changes completely.",
        useCase:
          "Hash your output, attach the address to your message. Any recipient re-encodes the same text and checks the address matches. Tamper-proof by construction.",
        params: [
          { name: "input", in: "body", type: "string (max 1000 chars)", required: true, description: "The text to address." },
          { name: "encoding", in: "body", type: '"utf8"', required: false, default: "utf8", description: "Text encoding." },
        ],
        defaultBody: JSON.stringify({ input: "hello", encoding: "utf8" }, null, 2),
        responseCodes: [200, 400, 405, 413, 415, 429, 500],
        example: `${BASE}/kernel/address/encode`,
      },
      {
        operationId: "schemaDatum",
        method: "GET",
        path: "/kernel/schema/datum",
        label: "Get the structural profile of any number",
        explanation:
          "Returns everything about a value: decimal, binary representation, bits set, content address, and position in the ring.\n\nUseful context before feeding a value into any other endpoint.",
        useCase:
          "Inspect a number's full structural identity before using it in a proof or computation.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "The number to describe." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size. Default 8 = values 0–255." },
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
    oneLiner: "12 named operations. Formally defined. Deterministic results.",
    whyItMatters:
      "UOR defines 12 operations: negate, invert, add, multiply, and more. Each has a formal name, formula, and relationship to the core rule. Two agents running the same operation on the same input always get the same result.",
    solves: "Value: Eliminates ambiguity. Every operation is named, defined, and verifiable. No room for misinterpretation.",
    endpoints: [
      {
        operationId: "opCompute",
        method: "GET",
        path: "/kernel/op/compute",
        label: "Run all operations on a value at once",
        explanation:
          "Pass one or two numbers. Get every operation result in a single response.\n\nUnary: negate, bitwise-invert, increment, decrement.\nBinary: add, subtract, multiply, XOR, AND, OR.",
        useCase:
          "See all possible outcomes for a value before committing to one. Useful for exploration and debugging.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "Primary value." },
          { name: "y", in: "query", type: "integer", required: false, default: "10", description: "Second value for binary operations." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/kernel/op/compute?x=42&y=10`,
      },
      {
        operationId: "opList",
        method: "GET",
        path: "/kernel/op/operations",
        label: "List all 12 operations with their definitions",
        explanation:
          "Returns every named operation with its formula, algebraic class, and relationship to the core rule. The shared reference both agents and developers can point to.",
        useCase:
          "Look up an operation's formal definition before verifying a proof that references it.",
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
    oneLiner: "Classify any value into its structural category before computing with it.",
    whyItMatters:
      "Every value belongs to one of four categories: building block, composed, anchor, or boundary. Knowing the category before operating on a value prevents type errors and incorrect proofs.",
    solves: "Value: A shared type system. No negotiation needed. Both parties know what kind of value they are working with.",
    endpoints: [
      {
        operationId: "typeList",
        method: "GET",
        path: "/user/type/primitives",
        label: "Browse the built-in types",
        explanation:
          "Returns the type catalogue: U1, U4, U8, U16 (1 to 16 bits), plus composite types (pairs, unions, constrained values). The type you pick here feeds into the coherence and partition endpoints.",
        useCase:
          "Check which types are available before calling coherence or partition.",
        params: [],
        responseCodes: [200, 405, 429, 500],
        example: `${BASE}/user/type/primitives`,
      },
      {
        operationId: "bridgeResolver",
        method: "GET",
        path: "/bridge/resolver",
        label: "Classify a value into its canonical category",
        explanation:
          "Returns which of four categories a value belongs to:\n\n• Building block: odd, irreducible. Cannot be decomposed further.\n• Composed: even. Factors into 2^k × odd core.\n• Anchor: the ring's multiplicative identity (1 or 255).\n• Boundary: zero or the ring midpoint (128).\n\nFor composed values, shows the full factor breakdown.",
        useCase:
          "Before using a value in a proof, confirm its category. Building blocks and composed values behave differently under every operation.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "The value to classify." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size." },
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
    oneLiner: "Proof objects anyone can verify. No server contact needed.",
    whyItMatters:
      "A proof object shows every derivation step, has a permanent address, and can be verified by anyone independently. Certificates attest to properties across all values. Both are self-contained: share them, store them, re-verify them anytime.",
    solves: "Value: Proofs anchored to content addresses cannot be forged or replayed. The math is the trust chain.",
    endpoints: [
      {
        operationId: "proofCriticalIdentity",
        method: "GET",
        path: "/bridge/proof/critical-identity",
        label: "Generate a portable proof for one value",
        explanation:
          "Produces a proof object with a permanent address. Every step is explicit: input, intermediates, final comparison. Anyone can replay the steps and confirm correctness without contacting any server.",
        useCase:
          "Generate a proof, attach it to your message. The recipient verifies independently. No callbacks, no tokens, no trust.",
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
        label: "Verify a type is consistent across all values",
        explanation:
          "Checks the core rule for every element of a type. Not a sample: every value. Returns pass rate, fail count, and a single boolean verdict. 100% is required for coherence.",
        useCase:
          "Before using a custom type in coordination, verify it is coherent. A non-coherent type produces unpredictable results.",
        params: [
          { name: "type_definition", in: "body", type: "object", required: true, description: 'The type to verify. E.g. { "@type": "type:PrimitiveType", "type:bitWidth": 8 }' },
          { name: "n", in: "body", type: "integer [1–16]", required: false, default: "8", description: "Ring size." },
        ],
        defaultBody: JSON.stringify({ type_definition: { "@type": "type:PrimitiveType", "type:bitWidth": 8 }, n: 8 }, null, 2),
        responseCodes: [200, 400, 405, 415, 429, 500],
        example: `${BASE}/bridge/proof/coherence`,
      },
      {
        operationId: "certInvolution",
        method: "GET",
        path: "/bridge/cert/involution",
        label: "Certify that an operation undoes itself",
        explanation:
          "Some operations are self-inverting: negate(negate(x)) = x for every value. This verifies that exhaustively and issues a shareable certificate. Peers verify it directly without re-running the computation.",
        useCase:
          "Prove to a peer that an operation is safely reversible. Share the certificate. One verification call confirms it.",
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
        label: "Get a step-by-step audit trail for any computation",
        explanation:
          "Pass a starting value and a sequence of operations. Returns a formal record of every step: input, output, formula, and ontology reference. Also verifies the core rule for the starting value as an integrity check.",
        useCase:
          "Run a sequence of operations and get an auditable receipt. Peers replay the steps to verify independently.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "Starting value." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size." },
          { name: "ops", in: "query", type: "string", required: false, default: "neg,bnot,succ", description: "Comma-separated operations: neg, bnot, succ, pred." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/bridge/derivation?x=42&ops=neg,bnot,succ`,
      },
      {
        operationId: "bridgeTrace",
        method: "GET",
        path: "/bridge/trace",
        label: "Capture the exact binary state at every step",
        explanation:
          "Lower-level than derivation. Records the binary state after each operation: decimal value, binary form, bits set, which bits flipped, and the delta from the previous step.\n\nUseful for finding exactly where a computation diverged.",
        useCase:
          "Compare two traces side by side. If the output differs, the trace shows exactly which step and which bits caused the divergence.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "Starting value." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size." },
          { name: "ops", in: "query", type: "string", required: false, default: "neg,bnot", description: "Comma-separated operations: neg, bnot, succ, pred." },
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
    oneLiner: "Measure information density. Translate values between ring sizes. Inspect state.",
    whyItMatters:
      "Partition analysis measures how bytes distribute across four structural groups. This is a deterministic property of content, not a trained classifier. Morphisms translate values between ring sizes without losing structural properties. State inspection shows what each operation does from any position.",
    solves: "Value: Content quality measured by algebraic structure, not heuristics. Translations between contexts that preserve mathematical guarantees.",
    endpoints: [
      {
        operationId: "partitionResolve",
        method: "POST",
        path: "/bridge/partition",
        label: "Measure the algebraic density of any content",
        explanation:
          "Classifies every byte into one of four structural groups, then returns the fraction that are building blocks as a density score.\n\nAbove 0.25: passes the density threshold. Below 0.1: structurally uniform or repetitive.\n\nNote: this measures byte-class distribution, not semantic quality. Use as one signal among others.",
        useCase:
          "Screen incoming content before processing. A low density score is a formal, reproducible signal. Deterministic across any system.",
        params: [
          { name: "input", in: "body", type: "string", required: false, description: "Text to analyse. Use this or type_definition, not both." },
          { name: "type_definition", in: "body", type: "object", required: false, description: 'A type definition for full-ring analysis.' },
          { name: "resolver", in: "body", type: '"DihedralFactorizationResolver" | "EvaluationResolver"', required: false, default: "EvaluationResolver", description: "EvaluationResolver is faster. DihedralFactorizationResolver is more precise." },
        ],
        defaultBody: JSON.stringify({ input: "hello" }, null, 2),
        responseCodes: [200, 400, 405, 413, 415, 429, 500],
        example: `${BASE}/bridge/partition`,
      },
      {
        operationId: "observableMetrics",
        method: "GET",
        path: "/bridge/observable/metrics",
        label: "Get structural measurements for any value",
        explanation:
          "Four measurements for any value:\n\n• Distance from zero: position in the ring.\n• Bits set: proxy for information content.\n• Cascade depth: how many times divisible by 2.\n• Phase boundary: whether the value is near a behavioural transition point.",
        useCase:
          "Identify values near phase boundaries, which are often the source of unstable or unexpected behaviour.",
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
        label: "Map a value between ring sizes",
        explanation:
          "Translates a value from one ring to another while preserving structural properties.\n\n• Smaller target: strips high bits (projection).\n• Larger target: embeds unchanged (inclusion).\n• Same size: identity.\n\nReturns the mapped value and which properties survive the translation.",
        useCase:
          "Translate a value from 8-bit to 4-bit context. Know exactly what is preserved and what is lost.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "Value to map." },
          { name: "from_n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Source ring size." },
          { name: "to_n", in: "query", type: "integer [1–16]", required: false, default: "4", description: "Target ring size." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/user/morphism/transforms?x=42&from_n=8&to_n=4`,
      },
      {
        operationId: "userState",
        method: "GET",
        path: "/user/state",
        label: "Inspect the state and transitions for any value",
        explanation:
          "Returns the full state description for a value:\n\n• Category and why.\n• Whether it is a stable entry point (identity or unit).\n• Whether it is at a phase boundary.\n• For each operation: where it goes and whether its category changes.",
        useCase:
          "Before choosing an operation, check what it does to your current value. Is the result stable, a boundary case, or a category change?",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "Current state value." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/user/state?x=42`,
      },
    ],
  },
  {
    id: "layer-6",
    icon: HardDrive,
    layerNum: 6,
    title: "Persistence",
    oneLiner: "Store objects to IPFS. Retrieve and verify them. Dual-address integrity.",
    whyItMatters:
      "AI agents have no persistent, verifiable memory across sessions. UOR × IPFS gives every agent a decentralised, dual-verified, permanent store. Two write backends: Pinata (dedicated gateway, production) and Storacha (UCAN-based, Filecoin-backed, 5GB free tier, web3.storage successor). Every stored object carries two independent addresses — a UOR address (semantic identity) and an IPFS CID (storage identity). Verification checks both independently.",
    solves: "Value: Permanent, decentralised, verifiable storage. Agents can persist state across sessions and share verified artifacts.",
    endpoints: [
      {
        operationId: "storeResolve",
        method: "GET",
        path: "/store/resolve",
        label: "Preview the UOR address of any URL",
        explanation:
          "Fetches any URL and computes its UOR address without storing anything. Preview what address a resource would receive before committing to IPFS.",
        useCase:
          "Establish a verifiable reference for any web resource before deciding whether to persist it.",
        params: [
          { name: "url", in: "query", type: "string (URL)", required: true, description: "The URL to fetch and address." },
          { name: "n", in: "query", type: "integer", required: false, default: "8", description: "Ring size: 4, 8, or 16." },
          { name: "include_partition", in: "query", type: "boolean", required: false, default: "false", description: "Include density analysis." },
          { name: "include_metrics", in: "query", type: "boolean", required: false, default: "false", description: "Include structural metrics." },
        ],
        responseCodes: [200, 400, 413, 429, 502, 504],
        example: `${BASE}/store/resolve?url=https://uor.foundation/llms.md`,
      },
      {
        operationId: "storeWrite",
        method: "POST",
        path: "/store/write",
        label: "Store an object to IPFS with dual addressing",
        explanation:
          "Wraps any UOR object in a JSON-LD envelope, computes both the UOR address and IPFS CID, pins it, and returns both. The CID is the storage address. The UOR address is the semantic address. Both are permanent and content-derived.\n\nNote: use the CIDv0 (Qm...) returned by the pin service for subsequent reads.",
        useCase:
          "Persist a proof or certificate to IPFS. Share both addresses. Any peer retrieves and verifies independently.",
        params: [
          { name: "object", in: "body", type: "object (JSON-LD with @type)", required: true, description: "The UOR object to store. Must be User-space or Bridge-space." },
          { name: "pin", in: "body", type: "boolean", required: false, default: "true", description: "false = dry run (compute addresses only)." },
          { name: "gateway", in: "body", type: "string", required: false, default: "pinata", description: "Write gateway. 'pinata' = Pinata dedicated (requires PINATA_JWT). 'storacha' = Storacha Network, web3.storage successor (requires STORACHA_KEY + STORACHA_PROOF, 5GB free). 'web3.storage' = legacy/degraded." },
          { name: "label", in: "body", type: "string", required: false, description: "Optional human-readable label." },
        ],
        defaultBody: JSON.stringify({ object: { "@type": "cert:TransformCertificate", "cert:verified": true, "cert:quantum": 8 }, pin: false }, null, 2),
        responseCodes: [200, 400, 422, 502, 503],
        example: `${BASE}/store/write`,
      },
      {
        operationId: "storeRead",
        method: "GET",
        path: "/store/read/:cid",
        label: "Retrieve and verify a stored object",
        explanation:
          "Retrieves an object from IPFS by CID and performs dual verification: recomputes both the CID and UOR address from the retrieved bytes. Returns store:verified:true only if both match.\n\nUse CIDv0 (Qm...) for reliable retrieval.",
        useCase:
          "A peer shares a CID. Retrieve it, check store:verified, and only process if true. Verification is mathematical.",
        params: [
          { name: "cid", in: "query", type: "string", required: true, description: "CIDv0 (Qm...) or CIDv1 (bafy...)." },
          { name: "gateway", in: "query", type: "string", required: false, default: "https://uor.mypinata.cloud", description: "IPFS read gateway." },
          { name: "strict", in: "query", type: "boolean", required: false, default: "true", description: "HTTP 409 on verification failure." },
        ],
        responseCodes: [200, 400, 404, 409, 502, 504],
        example: `${BASE}/store/read/bafyreiYOUR_CID_HERE`,
      },
      {
        operationId: "storeWriteContext",
        method: "POST",
        path: "/store/write-context",
        label: "Persist a full agent context to IPFS",
        explanation:
          "Stores a set of key-value bindings as a linked IPLD DAG. Each binding gets its own CID. The root block links to all of them. Returns root CID and per-binding CIDs.\n\nDesigned for persisting agent state across sessions.",
        useCase:
          "Save your working memory at session end. Share the root CID. Any agent restores the full context and verifies each binding.",
        params: [
          { name: "context.name", in: "body", type: "string", required: false, description: "Context label." },
          { name: "context.quantum", in: "body", type: "integer", required: false, default: "8", description: "Ring size." },
          { name: "context.bindings", in: "body", type: "array", required: true, description: "Array of {address, value, type} objects." },
          { name: "pin", in: "body", type: "boolean", required: false, default: "true", description: "false = dry run." },
          { name: "gateway", in: "body", type: "string", required: false, default: "pinata", description: "Write gateway." },
        ],
        defaultBody: JSON.stringify({ context: { name: "session-001", quantum: 8, bindings: [{ address: "hello", value: 42 }] }, pin: false }, null, 2),
        responseCodes: [200, 400, 502],
        example: `${BASE}/store/write-context`,
      },
      {
        operationId: "storeVerify",
        method: "GET",
        path: "/store/verify/:cid",
        label: "Verify integrity without retrieving content",
        explanation:
          "Lightweight verification only. Checks both CID and UOR address integrity, returns the boolean verdict and proof metadata. No content in the response. Faster and cheaper than /store/read when you only need the verdict.",
        useCase:
          "Received a CID from a peer? Verify first, process later. One call, one boolean.",
        params: [
          { name: "cid", in: "query", type: "string", required: true, description: "The CID to verify." },
          { name: "gateway", in: "query", type: "string", required: false, default: "https://uor.mypinata.cloud", description: "Read gateway." },
          { name: "expected_uor", in: "query", type: "string", required: false, description: "Expected UOR address to compare against." },
        ],
        responseCodes: [200, 400, 404, 409],
        example: `${BASE}/store/verify/bafyreiYOUR_CID_HERE`,
      },
      {
        operationId: "storeGateways",
        method: "GET",
        path: "/store/gateways",
        label: "List available IPFS gateways and their status",
        explanation:
          "Returns all configured gateways with capabilities (read-only vs read-write) and live health status. Check before a batch operation to select the healthiest gateway.",
        useCase:
          "Before a batch write, check which gateways are healthy. Avoid wasted attempts to degraded endpoints.",
        params: [],
        responseCodes: [200],
        example: `${BASE}/store/gateways`,
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

  /** URL used for actual fetch calls (goes through Supabase edge function) */
  const buildRuntimeUrl = () => {
    const qp = ep.params
      .filter(p => p.in === "query")
      .map(p => [p.name, paramValues[p.name] ?? ""] as [string, string])
      .filter(([, v]) => v !== "");
    const qs = new URLSearchParams(qp).toString();
    return `${RUNTIME_BASE}${ep.path}${qs ? `?${qs}` : ""}`;
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
            A Unified Computational Substrate for Agentic AI
          </h1>
          <p
            className="mt-5 text-base md:text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up max-w-2xl"
            style={{ animationDelay: "0.15s" }}
          >
            AI systems today cannot verify each other's identity, confirm each other's outputs, or agree on whether data is trustworthy. The UOR Framework API gives every agent a common mathematical foundation to check any of this independently — no account, no server, no central authority required.
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
              { problem: "No Persistent Memory", solution: "Agents lose state between sessions. UOR × IPFS stores agent memory as dual-verified, content-addressed objects — retrievable and verifiable by any agent, any time.", endpoint: "Layer 6", layerId: "layer-6", layerNum: 6 },
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
          <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed max-w-2xl mb-8">
            No signup. No API key. Paste any of these into a terminal and get a real response in under a second.
          </p>

          <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
            {[
              {
                step: "1",
                label: "Discover what the API can do",
                why: "Get a full map of every endpoint — what each does, what it returns, and in what order to use them.",
                cmd: `curl "${BASE}/navigate"`,
                note: "Returns a structured index of all endpoints with descriptions and example URLs.",
              },
              {
                step: "2",
                label: "Verify a trust guarantee — independently",
                why: "Like checking a scale is accurate before weighing anything. UOR runs one core mathematical check on any value you choose — same result, any machine, every time. That shared guarantee lets AI systems coordinate without needing to trust each other.",
                cmd: `curl "${BASE}/kernel/op/verify?x=42"`,
                note: "Try any number in place of 42. The result is always the same — that determinism is the foundation.",
              },
              {
                step: "3",
                label: "Detect spam and noise — mathematically",
                why: "AI spam is easy to paraphrase past keyword filters. This scores any text by algebraic byte structure — a fixed mathematical property no language model can mimic. Low scores flag repetitive filler; high scores confirm structural variety.",
                cmd: `curl -X POST "${BASE}/bridge/partition" -H "Content-Type: application/json" -d '{"input":"hello world"}'`,
                note: "Swap in any text. Low density flags uniform or repetitive content — a formal signal, not a heuristic.",
              },
            ].map(({ step, label, why, cmd, note }) => (
              <div key={step} className="flex items-start gap-5 px-6 py-7 bg-card">
                <span className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center mt-0.5">
                  {step}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-base md:text-lg font-semibold text-foreground mb-2">{label}</p>
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-4">{why}</p>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm text-[hsl(152,34%,60%)] bg-[hsl(220,18%,6%)] px-3 py-2 rounded-lg flex-1 min-w-0 break-all">{cmd}</code>
                    <CopyButton text={cmd} size="xs" />
                  </div>
                  <p className="text-sm text-muted-foreground/70 mt-2.5 leading-relaxed">{note}</p>
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
            Seven layers, fully live
          </h2>
          <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed max-w-2xl mb-10">
            The API is organised into seven layers. Each layer adds a capability — from the single mathematical rule at the base, to identity, operations, classification, verification, transformation, and persistent storage. Every layer is live and working now.
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
                  { step: "2", label: "GET /openapi.json", note: "Redirects to the full OpenAPI 3.1.0 spec at uor.foundation/openapi.json — includes all store/ paths.", href: `${BASE}/openapi.json` },
                  { step: "3", label: "GET /navigate", note: "Complete endpoint index — all endpoints with required params and example URLs.", href: `${BASE}/navigate` },
                  { step: "4", label: "GET /kernel/op/verify?x=42", note: "First verifiable claim. Zero auth. Returns a full proof in under 100ms.", href: `${BASE}/kernel/op/verify?x=42` },
                  { step: "5", label: "GET /store/gateways", note: "Check IPFS gateway health. Then POST /store/write (pin:false) for your first dry-run dual address. Then POST /store/write (pin:true) to store your first verified object to IPFS.", href: `${BASE}/store/gateways` },
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
