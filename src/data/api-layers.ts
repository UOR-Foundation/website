/**
 * API layer and endpoint data — serializable for UOR certification.
 * Icons are mapped at the component level by iconKey.
 */
import type { Endpoint, V2Stub, DiscoveryEndpoint } from "@/modules/api-explorer/types";

/** Display URL used in curl snippets and documentation */
export const API_BASE_URL = "https://api.uor.foundation/v1";

const BASE = API_BASE_URL;

export interface LayerData {
  id: string;
  iconKey: string;
  layerNum: number;
  title: string;
  oneLiner: string;
  whyItMatters: string;
  solves: string;
  endpoints: Endpoint[];
  v2stubs?: V2Stub[];
}

export const DISCOVERY_ENDPOINTS: DiscoveryEndpoint[] = [
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

export const LAYERS: LayerData[] = [
  {
    id: "layer-0",
    iconKey: "Diamond",
    layerNum: 0,
    title: "The Foundation",
    oneLiner: "One mathematical rule. Provable in under 100ms. Everything above depends on it.",
    whyItMatters:
      "There is one rule at the bottom of the system. You can test it on any number, on any machine, and you will always get the same answer. Because the rule is checkable, not promised, any two systems can independently confirm they are working from the same foundation without ever talking to each other.",
    solves: "Trust between systems without prior contact. The proof is the math itself.",
    endpoints: [
      {
        operationId: "opVerifyCriticalIdentity",
        method: "GET",
        path: "/kernel/op/verify",
        label: "Check the core rule for any value",
        explanation:
          "Send a number, get back every step of the proof: input, bitwise inversion, negation, increment, and whether they match. The full derivation, not just pass/fail.",
        useCase:
          "Pick any number. If it passes, the framework is mathematically sound for that value.",
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
          "Runs the same check across every value in the ring (e.g. all 256 for 8-bit). Returns pass count, fail count, and a single verdict.",
        useCase:
          "Confirm the entire ring is consistent before relying on any operation.",
        params: [
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size. n=8 checks 256 values, n=4 checks 16." },
          { name: "expand", in: "query", type: "boolean", required: false, default: "false", description: "Include per-value detail." },
        ],
        responseCodes: [200, 405, 429, 500],
        example: `${BASE}/kernel/op/verify/all?n=8`,
      },
      {
        operationId: "opCorrelate",
        method: "GET",
        path: "/kernel/op/correlate",
        label: "Measure structural distance between two values",
        explanation:
          "Computes the Hamming distance and fidelity between two values. The XOR-stratum counts how many bits differ. High drift signals structural divergence.",
        useCase:
          "Compare an expected output with an actual output. Non-zero drift is a formal signal that something changed.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "First value." },
          { name: "y", in: "query", type: "integer", required: true, default: "10", description: "Second value." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/kernel/op/correlate?x=42&y=10`,
      },
    ],
  },
  {
    id: "layer-1",
    iconKey: "Hash",
    layerNum: 1,
    title: "Identity",
    oneLiner: "Permanent addresses derived from content. Same input, same address, every time.",
    whyItMatters:
      "URLs break when servers move. Content addresses are computed from the bytes themselves. The same text always produces the same address, on any machine, with no registry.",
    solves: "Names and tokens can be copied. Content addresses cannot. They are derived, not assigned.",
    endpoints: [
      {
        operationId: "addressEncode",
        method: "POST",
        path: "/kernel/address/encode",
        label: "Get the permanent address for any text",
        explanation:
          "Send text, receive its content address. Same input always produces the same output. No server, no registry. Change one character and the address changes completely.",
        useCase:
          "Hash your output, attach the address. Any recipient re-encodes the same text and checks the address matches.",
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
          "Returns the full structural profile of a number: decimal, binary representation, bits set, content address, and ring position.",
        useCase:
          "Inspect a value's full identity before using it in a proof or computation.",
        params: [
          { name: "x", in: "query", type: "integer", required: true, default: "42", description: "The number to describe." },
          { name: "n", in: "query", type: "integer [1–16]", required: false, default: "8", description: "Ring size. Default 8 = values 0–255." },
        ],
        responseCodes: [200, 400, 405, 429, 500],
        example: `${BASE}/kernel/schema/datum?x=42`,
      },
      {
        operationId: "kernelDerive",
        method: "POST",
        path: "/kernel/derive",
        label: "Derive a content-addressed certificate from a term tree",
        explanation:
          "Submit a syntax tree of operations and get a step-by-step derivation trace with a content-addressed certificate. The result is a portable, verifiable receipt anchored to a permanent address.",
        useCase:
          "Build a complex computation as a tree. Get an auditable receipt any peer can replay and verify independently.",
        params: [
          { name: "term", in: "body", type: "object", required: true, description: 'A term tree: { "op": "add", "args": [42, { "op": "neg", "args": [10] }] }' },
          { name: "n", in: "body", type: "integer [1–16]", required: false, default: "8", description: "Ring size." },
        ],
        defaultBody: JSON.stringify({ term: { op: "add", args: [42, { op: "neg", args: [10] }] }, n: 8 }, null, 2),
        responseCodes: [200, 400, 405, 415, 429, 500],
        example: `${BASE}/kernel/derive`,
      },
    ],
  },
  {
    id: "layer-2",
    iconKey: "Layers",
    layerNum: 2,
    title: "Structure",
    oneLiner: "12 named operations. Formally defined. Deterministic results.",
    whyItMatters:
      "UOR defines 12 operations (negate, invert, add, multiply, and more). Each has a formal name and formula. Two agents running the same operation on the same input always get the same result.",
    solves: "Every operation is named, defined, and verifiable. No room for misinterpretation.",
    endpoints: [
      {
        operationId: "opCompute",
        method: "GET",
        path: "/kernel/op/compute",
        label: "Run all operations on a value at once",
        explanation:
          "Pass one or two numbers. Get every operation result in one response: negate, invert, increment, decrement, add, subtract, multiply, XOR, AND, OR.",
        useCase:
          "See all possible outcomes for a value before committing to one.",
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
          "Returns every named operation with its formula and algebraic class. The shared reference agents and developers can point to.",
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
    iconKey: "Search",
    layerNum: 3,
    title: "Resolution",
    oneLiner: "Classify any value into its structural category before computing.",
    whyItMatters:
      "Every value belongs to one of four categories: building block, composed, anchor, or boundary. Knowing the category before operating prevents type errors and incorrect proofs.",
    solves: "A shared type system. No negotiation needed. Both parties know what kind of value they are working with.",
    endpoints: [
      {
        operationId: "typeList",
        method: "GET",
        path: "/user/type/primitives",
        label: "Browse the built-in types",
        explanation:
          "Returns the type catalogue: U1 through U16 (1 to 16 bits), plus composite types (pairs, unions, constrained values).",
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
          "Returns which of four categories a value belongs to: building block (odd, irreducible), composed (even, factorable), anchor (identity), or boundary (zero/midpoint). For composed values, shows the full factor breakdown.",
        useCase:
          "Before using a value in a proof, confirm its category. Building blocks and composed values behave differently.",
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
    iconKey: "ShieldCheck",
    layerNum: 4,
    title: "Verification",
    oneLiner: "Proof objects anyone can verify. No server contact needed.",
    whyItMatters:
      "A proof object shows every derivation step, has a permanent address, and can be verified by anyone independently. Certificates attest to properties across all values. Both are self-contained.",
    solves: "Proofs anchored to content addresses cannot be forged or replayed. The math is the trust chain.",
    endpoints: [
      {
        operationId: "proofCriticalIdentity",
        method: "GET",
        path: "/bridge/proof/critical-identity",
        label: "Generate a portable proof for one value",
        explanation:
          "Produces a proof object with a permanent address. Every step is explicit: input, intermediates, final comparison. Anyone can replay the steps and confirm correctness.",
        useCase:
          "Generate a proof, attach it to your message. The recipient verifies independently. No callbacks, no tokens.",
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
          "Checks the core rule for every element of a type. Not a sample: every value. Returns pass rate, fail count, and a single boolean verdict.",
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
          "Verifies that an operation is self-inverting (e.g. negate(negate(x)) = x) across every value, then issues a shareable certificate.",
        useCase:
          "Prove an operation is safely reversible. Share the certificate for one-call verification.",
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
          "Pass a starting value and a sequence of operations. Returns a formal record of every step: input, output, formula, and ontology reference.",
        useCase:
          "Run a sequence of operations and get an auditable receipt. Peers replay the steps to verify.",
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
          "Records the binary state after each operation: decimal value, binary form, bits set, which bits flipped, and the delta from the previous step. Useful for finding exactly where a computation diverged.",
        useCase:
          "Compare two traces side by side. If outputs differ, the trace shows exactly which step caused the divergence.",
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
    iconKey: "ArrowRightLeft",
    layerNum: 5,
    title: "Transformation",
    oneLiner: "Measure information density. Translate values between ring sizes.",
    whyItMatters:
      "Partition analysis measures how bytes distribute across four structural groups. This is a deterministic property of content, not a trained classifier. Morphisms translate values between ring sizes without losing structural properties.",
    solves: "Content quality measured by algebraic structure, not heuristics. Translations between contexts that preserve mathematical guarantees.",
    endpoints: [
      {
        operationId: "partitionResolve",
        method: "POST",
        path: "/bridge/partition",
        label: "Measure the algebraic density of any content",
        explanation:
          "Classifies every byte into one of four structural groups, then returns the fraction that are building blocks as a density score. Above 0.25: passes threshold. Below 0.1: structurally uniform or repetitive. Measures byte-class distribution, not semantic quality.",
        useCase:
          "Screen incoming content. A low density score is a formal, reproducible signal, deterministic across any system.",
        params: [
          { name: "input", in: "body", type: "string", required: false, description: "Text to analyse. Use this or type_definition, not both." },
          { name: "type_definition", in: "body", type: "object", required: false, description: "A type definition for full-ring analysis." },
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
          "Four measurements: distance from zero (ring position), bits set (information content), cascade depth (divisibility by 2), and phase boundary detection.",
        useCase:
          "Identify values near phase boundaries, which are often the source of unstable behaviour.",
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
          "Translates a value from one ring to another while preserving structural properties. Smaller target: strips high bits. Larger target: embeds unchanged. Returns the mapped value and which properties survive.",
        useCase:
          "Translate a value between contexts. Know exactly what is preserved and what is lost.",
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
          "Returns the full state description: category, whether it is a stable entry point, whether it is at a phase boundary, and for each operation, where it goes and whether the category changes.",
        useCase:
          "Before choosing an operation, check what it does to your current value.",
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
    iconKey: "HardDrive",
    layerNum: 6,
    title: "Persistence",
    oneLiner: "Store objects to IPFS. Retrieve and verify them. Dual-address integrity.",
    whyItMatters:
      "Every stored object carries two independent addresses: a UOR address (semantic identity) and an IPFS CID (storage identity). Verification checks both. Two write backends: Pinata (production) and Storacha (5GB free tier).",
    solves: "Permanent, decentralised, verifiable storage. Agents persist state across sessions and share verified artifacts.",
    endpoints: [
      {
        operationId: "storeResolve",
        method: "GET",
        path: "/store/resolve",
        label: "Preview the UOR address of any URL",
        explanation:
          "Fetches any URL and computes its UOR address without storing anything. Preview what address a resource would receive before committing to IPFS.",
        useCase:
          "Establish a verifiable reference for any web resource before deciding to persist it.",
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
          "Wraps any UOR object in a JSON-LD envelope, computes both addresses, pins it, and returns both. The CID is the storage address. The UOR address is the semantic address. Both are permanent and content-derived.",
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
          "Retrieves an object from IPFS by CID and performs dual verification: recomputes both addresses from the retrieved bytes. Returns store:verified:true only if both match.",
        useCase:
          "A peer shares a CID. Retrieve it, check store:verified, and only process if true.",
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
          "Stores a set of key-value bindings as a linked IPLD DAG. Each binding gets its own CID. The root block links to all of them. Designed for persisting agent state across sessions.",
        useCase:
          "Save working memory at session end. Share the root CID. Any agent restores and verifies the full context.",
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
          "Lightweight verification only. Checks both CID and UOR address integrity, returns a boolean verdict and proof metadata. No content in the response. Faster than /store/read when you only need the verdict.",
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
          "Returns all configured gateways with capabilities (read-only vs read-write) and live health status.",
        useCase:
          "Before a batch write, check which gateways are healthy.",
        params: [],
        responseCodes: [200],
        example: `${BASE}/store/gateways`,
      },
    ],
  },
];
