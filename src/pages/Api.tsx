import { useState, useCallback } from "react";
import Layout from "@/components/layout/Layout";
import {
  ChevronDown,
  Copy,
  Check,
  Play,
  Loader2,
  ExternalLink,
  ArrowRight,
  Shield,
  Zap,
  Lock,
  BarChart3,
  FileCheck,
  Layers,
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

interface ResponseCode {
  code: number;
  label: string;
  schema: string;
}

interface Endpoint {
  operationId: string;
  method: "GET" | "POST";
  path: string;
  summary: string;
  plainSummary: string; // human-readable one-liner
  description: string;
  tag: string;
  namespace: string;
  params: Param[];
  requestBodySchema?: string;
  defaultBody?: string;
  responses: ResponseCode[];
  example: string;
}

interface Tag {
  id: string;
  label: string;
  plainLabel: string;
  description: string;
  plainDescription: string;
  source: string;
  space: "kernel" | "bridge" | "user";
  endpointCount: number;
}

/* ─────────────────────────── Tag data ─────────────────────────── */

const TAGS: Tag[] = [
  {
    id: "navigate",
    label: "navigate",
    plainLabel: "Index",
    description: "Framework navigation — reading order, namespace index, ontology links, all endpoint URLs.",
    plainDescription: "Start here. Returns a complete map of every available endpoint and what each one does.",
    source: "spec/src/namespaces/",
    space: "kernel",
    endpointCount: 2,
  },
  {
    id: "kernel-op",
    label: "kernel-op",
    plainLabel: "Ring Operations",
    description: "op/ namespace — Ring operations, involutions, and algebraic identities.",
    plainDescription: "The mathematical core. Run arithmetic operations on any number and verify the fundamental identity that underpins the entire framework.",
    source: "spec/src/namespaces/op.rs",
    space: "kernel",
    endpointCount: 4,
  },
  {
    id: "kernel-schema",
    label: "kernel-schema",
    plainLabel: "Content Addressing",
    description: "schema/ + u/ namespaces — Ring substrate, term language, datum values, and content addressing.",
    plainDescription: "Convert any text or data into a unique, permanent address derived from its content — not its location. The same input always produces the same address.",
    source: "spec/src/namespaces/schema.rs, u.rs",
    space: "kernel",
    endpointCount: 2,
  },
  {
    id: "bridge-partition",
    label: "bridge-partition",
    plainLabel: "Content Quality",
    description: "partition/ namespace — Irreducibility partition of the ring.",
    plainDescription: "Measure the information density of any content. Distinguishes novel, meaningful data from repetitive or low-signal content — formally, not heuristically.",
    source: "spec/src/namespaces/partition.rs",
    space: "bridge",
    endpointCount: 1,
  },
  {
    id: "bridge-proof",
    label: "bridge-proof",
    plainLabel: "Proofs",
    description: "proof/ namespace — Verification proofs.",
    plainDescription: "Generate cryptographically structured proofs that a statement holds. Every proof is a self-contained, machine-verifiable object.",
    source: "spec/src/namespaces/proof.rs",
    space: "bridge",
    endpointCount: 2,
  },
  {
    id: "bridge-cert",
    label: "bridge-cert",
    plainLabel: "Certificates",
    description: "cert/ namespace — Attestation certificates.",
    plainDescription: "Issue certificates that formally attest to a property of an operation or identity. Certificates can be independently verified by any party.",
    source: "spec/src/namespaces/cert.rs",
    space: "bridge",
    endpointCount: 1,
  },
  {
    id: "bridge-observable",
    label: "bridge-observable",
    plainLabel: "Metrics",
    description: "observable/ namespace — Metric and geometric measurements.",
    plainDescription: "Compute precise measurements for any value: distance from zero, information density, cascade depth, and phase boundaries.",
    source: "spec/src/namespaces/observable.rs",
    space: "bridge",
    endpointCount: 1,
  },
  {
    id: "user-type",
    label: "user-type",
    plainLabel: "Types",
    description: "type/ namespace — Runtime type declarations.",
    plainDescription: "Browse the built-in type primitives (U1, U4, U8, U16) that define how data maps onto the ring. The foundation for structured data operations.",
    source: "spec/src/namespaces/type_.rs",
    space: "user",
    endpointCount: 1,
  },
];

/* ─────────────────────────── Endpoint data ─────────────────────────── */

const ENDPOINTS: Endpoint[] = [
  {
    operationId: "frameworkIndex",
    method: "GET",
    path: "/navigate",
    summary: "Framework navigation index — reading order, all endpoints, namespace map",
    plainSummary: "Get a complete map of all endpoints and how they connect.",
    description: "Returns a complete navigation index of the UOR Framework API. Start here to discover all endpoints, namespace mappings, and reading order. No parameters required.",
    tag: "navigate",
    namespace: "—",
    params: [],
    responses: [
      { code: 200, label: "NavigationIndex", schema: "NavigationIndex" },
    ],
    example: `${BASE}/navigate`,
  },
  {
    operationId: "openapiSpec",
    method: "GET",
    path: "/openapi.json",
    summary: "Inline OpenAPI 3.1.0 specification",
    plainSummary: "Download the full machine-readable API specification.",
    description: "Returns the OpenAPI 3.1.0 specification for this API. The full static spec is also available at https://uor.foundation/openapi.json",
    tag: "navigate",
    namespace: "—",
    params: [],
    responses: [
      { code: 200, label: "OpenAPI document", schema: "object" },
    ],
    example: `${BASE}/openapi.json`,
  },
  {
    operationId: "opVerifyCriticalIdentity",
    method: "GET",
    path: "/kernel/op/verify",
    summary: "Verify op:criticalIdentity — neg(bnot(x)) = succ(x)",
    plainSummary: "Verify the core identity that the entire framework rests on.",
    description: "Confirms the foundational mathematical theorem: neg(bnot(x)) = succ(x) for any input x.\n\nIn plain terms: applying two specific transformations in sequence (bitwise inversion, then negation) always lands on the same result as simply adding one. This is not coincidence — it's a structural property of the ring that the entire framework depends on.\n\nReturns a full proof object with every step of the derivation shown explicitly.",
    tag: "kernel-op",
    namespace: "op:",
    params: [
      { name: "x", in: "query", type: "integer [0, 255]", required: true, default: "42", description: "Any whole number in [0, 255] (or up to 2^n−1 if you set n). Try 42." },
      { name: "n", in: "query", type: "integer [1, 16]", required: false, default: "8", description: "Ring size (bit-width). Default 8 means the ring Z/256Z — all byte values." },
    ],
    responses: [
      { code: 200, label: "CriticalIdentityProofResponse", schema: "CriticalIdentityProofResponse" },
      { code: 400, label: "BadRequest", schema: "ErrorResponse" },
      { code: 429, label: "RateLimited", schema: "ErrorResponse" },
    ],
    example: `${BASE}/kernel/op/verify?x=42`,
  },
  {
    operationId: "opVerifyAll",
    method: "GET",
    path: "/kernel/op/verify/all",
    summary: "Verify op:criticalIdentity for all 2^n elements of R_n",
    plainSummary: "Prove the identity holds for every possible value in the ring — not just one.",
    description: "Runs the same verification as /verify but for every value in the ring (256 values for the default 8-bit ring).\n\nWhy this matters: a single example proves nothing. Running exhaustively across all 256 values and getting zero failures is what turns a claim into a proof. Returns pass count, fail count, and a universal verdict.",
    tag: "kernel-op",
    namespace: "op:",
    params: [
      { name: "n", in: "query", type: "integer [1, 16]", required: false, default: "8", description: "Ring size. Default 8 checks all 256 byte values." },
      { name: "expand", in: "query", type: "boolean", required: false, default: "false", description: "Set true to include the full per-value witness list (~14 KB for n=8)." },
    ],
    responses: [
      { code: 200, label: "CoherenceProofResponse", schema: "CoherenceProofResponse" },
      { code: 429, label: "RateLimited", schema: "ErrorResponse" },
    ],
    example: `${BASE}/kernel/op/verify/all?n=8`,
  },
  {
    operationId: "opCompute",
    method: "GET",
    path: "/kernel/op/compute",
    summary: "Compute all op:UnaryOp and op:BinaryOp values for a datum",
    plainSummary: "Run every available arithmetic operation on a number and see all results at once.",
    description: "Takes one or two numbers and returns the result of every named operation in the framework — both unary (single-input) and binary (two-input).\n\nUnary results for x: negate, bitwise invert, increment, decrement.\nBinary results for x and y: add, subtract, multiply, bitwise XOR, AND, OR.\n\nUseful for exploring how a specific value behaves across the full operation space.",
    tag: "kernel-op",
    namespace: "op:",
    params: [
      { name: "x", in: "query", type: "integer [0, 255]", required: true, default: "42", description: "Primary input value." },
      { name: "y", in: "query", type: "integer [0, 255]", required: false, default: "10", description: "Second input for binary operations. Defaults to x if omitted." },
      { name: "n", in: "query", type: "integer [1, 16]", required: false, default: "8", description: "Ring size." },
    ],
    responses: [
      { code: 200, label: "OpComputeResponse", schema: "OpComputeResponse" },
      { code: 400, label: "BadRequest", schema: "ErrorResponse" },
      { code: 429, label: "RateLimited", schema: "ErrorResponse" },
    ],
    example: `${BASE}/kernel/op/compute?x=42&y=10`,
  },
  {
    operationId: "opList",
    method: "GET",
    path: "/kernel/op/operations",
    summary: "List all named op/ individuals with full metadata",
    plainSummary: "See every named operation in the framework with its formal definition.",
    description: "Returns the complete catalogue of all 12 named operations: neg, bnot, succ, pred, add, sub, mul, xor, and, or, criticalIdentity, D2n. Each entry includes its ontology IRI, geometric character, and type classification.",
    tag: "kernel-op",
    namespace: "op:",
    params: [],
    responses: [
      { code: 200, label: "OpListResponse", schema: "OpListResponse" },
      { code: 429, label: "RateLimited", schema: "ErrorResponse" },
    ],
    example: `${BASE}/kernel/op/operations`,
  },
  {
    operationId: "addressEncode",
    method: "POST",
    path: "/kernel/address/encode",
    summary: "Encode content as a u:Address with u:Glyph decomposition",
    plainSummary: "Turn any text into a permanent, content-derived address.",
    description: "Takes any text and converts it to a unique address derived directly from the content itself.\n\nThis means: the same text always produces the same address, regardless of when or where you run it. No registry. No coordination. No server to look up. The address is the content.\n\nEach byte of input is mapped to a Braille Unicode glyph — the address is both machine-readable and human-visible.",
    tag: "kernel-schema",
    namespace: "u:",
    params: [
      { name: "input", in: "body", type: "string (max 1000 chars)", required: true, description: "Any text to encode. Try your agent name, a URL, or a message." },
      { name: "encoding", in: "body", type: '"utf8"', required: false, default: "utf8", description: "Character encoding. Only utf8 is currently supported." },
    ],
    requestBodySchema: "AddressEncodeRequest",
    defaultBody: JSON.stringify({ input: "hello", encoding: "utf8" }, null, 2),
    responses: [
      { code: 200, label: "AddressEncodeResponse", schema: "AddressEncodeResponse" },
      { code: 400, label: "BadRequest", schema: "ErrorResponse" },
      { code: 413, label: "PayloadTooLarge", schema: "ErrorResponse" },
      { code: 429, label: "RateLimited", schema: "ErrorResponse" },
    ],
    example: `${BASE}/kernel/address/encode`,
  },
  {
    operationId: "schemaDatum",
    method: "GET",
    path: "/kernel/schema/datum",
    summary: "Get full schema:Datum representation for a ring value",
    plainSummary: "Get a full structural description of any number in the ring.",
    description: "Returns the complete algebraic profile of a number: its integer value, ring size, popcount (number of 1-bits), binary representation, and content address.\n\nThis is how UOR represents data — not just as a raw number but as a fully described element with a known position in the ring's structure.",
    tag: "kernel-schema",
    namespace: "schema:",
    params: [
      { name: "x", in: "query", type: "integer [0, 255]", required: true, default: "42", description: "The value to describe." },
      { name: "n", in: "query", type: "integer [1, 16]", required: false, default: "8", description: "Ring size." },
    ],
    responses: [
      { code: 200, label: "Datum", schema: "Datum" },
      { code: 400, label: "BadRequest", schema: "ErrorResponse" },
      { code: 429, label: "RateLimited", schema: "ErrorResponse" },
    ],
    example: `${BASE}/kernel/schema/datum?x=42`,
  },
  {
    operationId: "partitionResolve",
    method: "POST",
    path: "/bridge/partition",
    summary: "Resolve a type:TypeDefinition to a partition:Partition of R_n",
    plainSummary: "Measure the information quality of any content or type.",
    description: "Classifies every element in the ring into one of four groups:\n\n• Irreducibles — values that cannot be broken down further. These represent novel, high-signal content.\n• Reducibles — values that can be factored. Often correspond to repetitive or derived content.\n• Units — structural anchors (just 1 and its inverse).\n• Exterior — boundary values (0 and the ring midpoint).\n\nThe density score (irreducibles ÷ total) is the key output. Above 0.25 = meaningful content. Below = likely repetitive or low-signal.\n\nTwo modes: pass a type definition to partition the full ring, or pass a text string to analyse it byte-by-byte.",
    tag: "bridge-partition",
    namespace: "partition:",
    params: [
      { name: "type_definition", in: "body", type: "object", required: false, description: "A type definition to partition across the full ring. Omit if using text input mode." },
      { name: "input", in: "body", type: "string", required: false, description: "Text to analyse byte-by-byte for information density." },
      { name: "resolver", in: "body", type: '"DihedralFactorizationResolver" | "EvaluationResolver"', required: false, default: "EvaluationResolver", description: "Resolution strategy. EvaluationResolver is faster; DihedralFactorizationResolver is more precise." },
    ],
    requestBodySchema: "PartitionRequest",
    defaultBody: JSON.stringify({ input: "hello", encoding: "utf8" }, null, 2),
    responses: [
      { code: 200, label: "PartitionResponse", schema: "PartitionResponse" },
      { code: 400, label: "BadRequest", schema: "ErrorResponse" },
      { code: 413, label: "PayloadTooLarge", schema: "ErrorResponse" },
      { code: 429, label: "RateLimited", schema: "ErrorResponse" },
    ],
    example: `${BASE}/bridge/partition`,
  },
  {
    operationId: "proofCriticalIdentity",
    method: "GET",
    path: "/bridge/proof/critical-identity",
    summary: "Produce a proof:CriticalIdentityProof for a given witness x",
    plainSummary: "Generate a structured, shareable proof for one specific value.",
    description: "Produces a full proof object for x — every step of the derivation, the inputs, the intermediate values, and the final verdict — packaged as a self-contained JSON-LD object.\n\nThis is the bridge-space version of /kernel/op/verify. The difference: this object has a unique @id (a permanent address), making it independently referenceable and verifiable by any third party.",
    tag: "bridge-proof",
    namespace: "proof:",
    params: [
      { name: "x", in: "query", type: "integer [0, 255]", required: true, default: "42", description: "The value to prove the identity for." },
      { name: "n", in: "query", type: "integer [1, 16]", required: false, default: "8", description: "Ring size." },
    ],
    responses: [
      { code: 200, label: "CriticalIdentityProofResponse", schema: "CriticalIdentityProofResponse" },
      { code: 400, label: "BadRequest", schema: "ErrorResponse" },
      { code: 429, label: "RateLimited", schema: "ErrorResponse" },
    ],
    example: `${BASE}/bridge/proof/critical-identity?x=42`,
  },
  {
    operationId: "proofCoherence",
    method: "POST",
    path: "/bridge/proof/coherence",
    summary: "Produce a proof:CoherenceProof for a type:TypeDefinition",
    plainSummary: "Prove that a type is fully consistent with the ring across all values.",
    description: "Verifies that a type definition is coherent — meaning the core identity holds for every element of that type, not just a sample.\n\nReturns a CoherenceProof with pass rate, fail count, and a boolean verdict. A type with 100% pass rate is considered ring-coherent: it participates safely in the framework's mathematical guarantees.",
    tag: "bridge-proof",
    namespace: "proof:",
    params: [
      { name: "type_definition", in: "body", type: "object", required: false, description: "The type to verify. E.g. { \"@type\": \"type:PrimitiveType\", \"type:bitWidth\": 8 }." },
      { name: "n", in: "body", type: "integer [1, 16]", required: false, default: "8", description: "Ring size to verify against." },
    ],
    requestBodySchema: "CoherenceProofRequest",
    defaultBody: JSON.stringify({ type_definition: { "@type": "type:PrimitiveType", "type:bitWidth": 8 }, n: 8 }, null, 2),
    responses: [
      { code: 200, label: "CoherenceProofResponse", schema: "CoherenceProofResponse" },
      { code: 400, label: "BadRequest", schema: "ErrorResponse" },
      { code: 429, label: "RateLimited", schema: "ErrorResponse" },
    ],
    example: `${BASE}/bridge/proof/coherence`,
  },
  {
    operationId: "certInvolution",
    method: "GET",
    path: "/bridge/cert/involution",
    summary: "Issue a cert:InvolutionCertificate for op:neg or op:bnot",
    plainSummary: "Issue a certificate proving that applying an operation twice returns to the start.",
    description: "An involution is an operation that undoes itself: apply it twice and you're back where you started.\n\nThis endpoint verifies that property exhaustively across every value in the ring, then issues a signed certificate. For neg: neg(neg(x)) = x for all 256 values. For bnot: same.\n\nThe certificate is a structured, referenceable object that can be shared and independently checked.",
    tag: "bridge-cert",
    namespace: "cert:",
    params: [
      { name: "operation", in: "query", type: "string", required: true, default: "neg", enum: ["neg", "bnot"], description: "The operation to certify. neg = ring negation. bnot = bitwise inversion." },
      { name: "n", in: "query", type: "integer [1, 16]", required: false, default: "8", description: "Ring size." },
    ],
    responses: [
      { code: 200, label: "InvolutionCertificateResponse", schema: "InvolutionCertificateResponse" },
      { code: 400, label: "BadRequest", schema: "ErrorResponse" },
      { code: 429, label: "RateLimited", schema: "ErrorResponse" },
    ],
    example: `${BASE}/bridge/cert/involution?operation=neg`,
  },
  {
    operationId: "observableMetrics",
    method: "GET",
    path: "/bridge/observable/metrics",
    summary: "Compute observable metrics for a ring element",
    plainSummary: "Get precise geometric measurements for any value in the ring.",
    description: "Computes four distinct measurements for a value:\n\n• Ring distance — how far the value is from zero on the ring (minimum of x and its complement).\n• Hamming weight — how many bits are set (information density).\n• Cascade length — the depth of the value's prime factorization in the ring (trailing zeros).\n• Catastrophe threshold — whether the value sits near a phase boundary where operations change character.",
    tag: "bridge-observable",
    namespace: "observable:",
    params: [
      { name: "x", in: "query", type: "integer [0, 255]", required: true, default: "42", description: "The value to measure." },
      { name: "n", in: "query", type: "integer [1, 16]", required: false, default: "8", description: "Ring size." },
    ],
    responses: [
      { code: 200, label: "ObservableMetricsResponse", schema: "ObservableMetricsResponse" },
      { code: 400, label: "BadRequest", schema: "ErrorResponse" },
      { code: 429, label: "RateLimited", schema: "ErrorResponse" },
    ],
    example: `${BASE}/bridge/observable/metrics?x=42`,
  },
  {
    operationId: "typeList",
    method: "GET",
    path: "/user/type/primitives",
    summary: "List all type:PrimitiveType definitions",
    plainSummary: "Browse the available primitive types and how they map onto the ring.",
    description: "Returns the full catalogue of built-in types: U1 (1-bit ring), U4 (4-bit, 16 elements), U8 (8-bit, 256 elements — the default), U16 (65,536 elements).\n\nAlso includes composite type structures: ProductType (pairs), SumType (unions), and ConstrainedType (values with attached predicates).",
    tag: "user-type",
    namespace: "type:",
    params: [],
    responses: [
      { code: 200, label: "TypeListResponse", schema: "TypeListResponse" },
      { code: 429, label: "RateLimited", schema: "ErrorResponse" },
    ],
    example: `${BASE}/user/type/primitives`,
  },
];

/* ─────────────────────────── Schema reference ─────────────────────────── */

const SCHEMAS = [
  { name: "CriticalIdentityProofResponse", ontologyType: "proof:CriticalIdentityProof" },
  { name: "CoherenceProofResponse", ontologyType: "proof:CoherenceProof" },
  { name: "WitnessData", ontologyType: "proof:WitnessData" },
  { name: "Datum", ontologyType: "schema:Datum" },
  { name: "AddressEncodeResponse", ontologyType: "u:Address" },
  { name: "AddressEncodeRequest", ontologyType: "u:AddressRequest" },
  { name: "PartitionResponse", ontologyType: "partition:Partition" },
  { name: "PartitionRequest", ontologyType: "partition:PartitionRequest" },
  { name: "InvolutionCertificateResponse", ontologyType: "cert:InvolutionCertificate" },
  { name: "ObservableMetricsResponse", ontologyType: "observable:MetricBundle" },
  { name: "OpComputeResponse", ontologyType: "op:OperationResult" },
  { name: "OpListResponse", ontologyType: "op:OperationCatalogue" },
  { name: "TypeListResponse", ontologyType: "type:PrimitiveTypeCatalogue" },
  { name: "NavigationIndex", ontologyType: "uor:NavigationIndex" },
  { name: "ErrorResponse", ontologyType: "uor:ErrorResponse" },
];

/* ─────────────────────────── Namespace map ─────────────────────────── */

const NAMESPACE_MAP = [
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
];

/* ─────────────────────────── What you can do (capabilities) ─────────────────────────── */

const CAPABILITIES = [
  {
    icon: Shield,
    title: "Verify mathematical identity",
    description: "Confirm the theorem neg(bnot(x)) = succ(x) holds for any value — or exhaustively for all 256 values at once. No prior knowledge needed: run it and read the result.",
    endpoint: "/kernel/op/verify",
  },
  {
    icon: Zap,
    title: "Create permanent content addresses",
    description: "Turn any text into a unique address derived from its content, not its location. The same input always produces the same address — anywhere, anytime, without a registry.",
    endpoint: "/kernel/address/encode",
  },
  {
    icon: BarChart3,
    title: "Measure information quality",
    description: "Score any content for information density. Formally distinguishes novel, meaningful data from repetitive or low-signal content using ring-algebraic partition analysis.",
    endpoint: "/bridge/partition",
  },
  {
    icon: FileCheck,
    title: "Generate shareable proofs",
    description: "Produce self-contained proof objects with a unique address. Every proof is independently verifiable by any third party — no trust required.",
    endpoint: "/bridge/proof/critical-identity",
  },
  {
    icon: Lock,
    title: "Issue verifiable certificates",
    description: "Certify that an operation has a provable property (e.g. self-inverse) across all values in the ring. Certificates are structured objects, not assertions.",
    endpoint: "/bridge/cert/involution",
  },
  {
    icon: Layers,
    title: "Compute geometric metrics",
    description: "Measure ring distance, information density, cascade depth, and phase thresholds for any value. Precise, reproducible, and formally grounded.",
    endpoint: "/bridge/observable/metrics",
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

/* ─────────────────────────── Sub-components ─────────────────────────── */

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
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wide ${
      method === "GET"
        ? "bg-primary/10 text-primary border border-primary/20"
        : "bg-accent/10 text-accent border border-accent/20"
    }`}>
      {method}
    </span>
  );
}

function ResponseCodeBadge({ code }: { code: number }) {
  const isOk = code === 200;
  const isRate = code === 429;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold border ${
      isOk
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        : isRate
        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
        : "bg-destructive/10 text-destructive border-destructive/20"
    }`}>
      {isOk ? "✓" : "⚠"} {code}
    </span>
  );
}

function SpaceBadge({ space }: { space: "kernel" | "bridge" | "user" }) {
  const styles = {
    kernel: "bg-primary/10 text-primary border-primary/20",
    bridge: "bg-accent/10 text-accent border-accent/20",
    user: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded border ${styles[space]}`}>
      {space}
    </span>
  );
}

function ParamTable({ params }: { params: Param[] }) {
  if (params.length === 0) return <p className="text-xs text-muted-foreground italic">No parameters required.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-3 font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
            <th className="text-left py-2 pr-3 font-semibold text-muted-foreground uppercase tracking-wide">In</th>
            <th className="text-left py-2 pr-3 font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
            <th className="text-left py-2 pr-3 font-semibold text-muted-foreground uppercase tracking-wide">Req</th>
            <th className="text-left py-2 pr-3 font-semibold text-muted-foreground uppercase tracking-wide">Default</th>
            <th className="text-left py-2 font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={p.name} className="border-b border-border/50 last:border-0">
              <td className="py-2 pr-3 font-mono text-primary font-semibold">{p.name}</td>
              <td className="py-2 pr-3 font-mono text-muted-foreground">{p.in}</td>
              <td className="py-2 pr-3 font-mono text-foreground/80">{p.type}</td>
              <td className="py-2 pr-3">
                {p.required
                  ? <span className="text-destructive font-semibold">yes</span>
                  : <span className="text-muted-foreground">no</span>}
              </td>
              <td className="py-2 pr-3 font-mono text-muted-foreground">{p.default ?? "—"}</td>
              <td className="py-2 text-foreground/70">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EndpointCard({ ep, tag }: { ep: Endpoint; tag: Tag }) {
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, string>>(
    Object.fromEntries(ep.params.filter(p => p.in === "query" && p.default).map(p => [p.name, p.default!]))
  );
  const [bodyValue, setBodyValue] = useState(ep.defaultBody ?? "");

  const buildUrl = () => {
    const qp = ep.params.filter(p => p.in === "query").map(p => [p.name, paramValues[p.name] ?? ""] as [string, string]).filter(([, v]) => v !== "");
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
      const url = buildUrl();
      const opts: RequestInit = { method: ep.method, headers: { "Content-Type": "application/json" } };
      if (ep.method === "POST" && bodyValue) opts.body = bodyValue;
      const res = await fetch(url, opts);
      const json = await res.json();
      setResponse(JSON.stringify(json, null, 2));
    } catch (e: unknown) {
      setResponse(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoading(false);
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card transition-all">
      {/* Card header — always visible */}
      <div className="flex items-start gap-3 px-4 py-4">
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <MethodBadge method={ep.method} />
            <code className="font-mono text-sm text-foreground">{ep.path}</code>
            <code className="hidden md:inline-flex font-mono text-xs px-2 py-0.5 rounded bg-muted border border-border text-muted-foreground">
              {ep.operationId}
            </code>
          </div>
          {/* Plain-English summary — always visible */}
          <p className="text-sm text-foreground font-medium">{ep.plainSummary}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <SpaceBadge space={tag.space} />
            <span className="font-mono text-xs px-2 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">{ep.namespace}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <button
            onClick={run}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-60"
            title="Run live request"
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
            Run
          </button>
          <button
            onClick={() => setOpen(o => !o)}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            aria-label={open ? "Collapse" : "Expand"}
          >
            <ChevronDown size={15} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
          </button>
        </div>
      </div>

      {/* Expanded panel */}
      {open && (
        <div className="border-t border-border">
          <div className="px-4 py-5 space-y-6">
            {/* operationId (mobile) */}
            <div className="md:hidden">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">operationId</p>
              <code className="font-mono text-xs text-foreground bg-muted px-2 py-1 rounded">{ep.operationId}</code>
            </div>

            {/* Plain description */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">What this does</p>
              <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">{ep.description}</p>
            </div>

            {/* Parameters table */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Parameters</p>
              <ParamTable params={ep.params} />
            </div>

            {/* Interactive query params */}
            {ep.params.filter(p => p.in === "query").length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Try it — edit values below</p>
                <div className="space-y-2">
                  {ep.params.filter(p => p.in === "query").map(p => (
                    <div key={p.name} className="flex items-center gap-3">
                      <label className="font-mono text-xs text-primary w-24 shrink-0">{p.name}</label>
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

            {/* Request body */}
            {ep.method === "POST" && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                  Request body <span className="font-mono normal-case ml-1 text-muted-foreground">({ep.requestBodySchema})</span>
                </p>
                <textarea
                  value={bodyValue}
                  onChange={e => setBodyValue(e.target.value)}
                  rows={5}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            )}

            {/* Responses */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Response codes</p>
              <div className="flex flex-wrap gap-3">
                {ep.responses.map(r => (
                  <div key={r.code} className="flex items-center gap-2">
                    <ResponseCodeBadge code={r.code} />
                    <a
                      href={`https://uor.foundation/openapi.json#/components/schemas/${r.schema}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                    >
                      {r.label}
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* curl */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">curl command</p>
                <CopyButton text={curlCmd} />
              </div>
              <pre className="bg-[hsl(220,18%,6%)] text-[hsl(152,34%,60%)] text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono leading-relaxed">{curlCmd}</pre>
            </div>

            {/* Run button */}
            <div className="flex items-center gap-3">
              <button
                onClick={run}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-60"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                {loading ? "Running…" : "▶ Run live"}
              </button>
              {response && (
                <button onClick={() => setResponse(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Clear
                </button>
              )}
            </div>

            {/* Response output */}
            {response && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Live response</p>
                  <CopyButton text={response} />
                </div>
                <pre
                  className="bg-[hsl(220,18%,6%)] text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono leading-relaxed max-h-80 overflow-y-auto json-response"
                  dangerouslySetInnerHTML={{ __html: highlightJson(response) }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Main page ─────────────────────────── */

const Api = () => {
  const [activeTag, setActiveTag] = useState("kernel-op");
  const [schemasOpen, setSchemasOpen] = useState(false);

  const activeTagData = TAGS.find(t => t.id === activeTag)!;
  const visibleEndpoints = ENDPOINTS.filter(e => e.tag === activeTag);

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

      <div className="pt-28 pb-24">
        <div className="container max-w-6xl">

          {/* ── Hero ── */}
          <div className="mb-14">
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <a
                href="https://www.openapis.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                <Shield size={11} />
                OpenAPI 3.1.0 Compliant
                <ExternalLink size={9} />
              </a>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted border border-border text-xs font-mono text-muted-foreground">v1.0.0</span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted border border-border text-xs font-mono text-muted-foreground">Apache 2.0</span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">No API key required</span>
            </div>

            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-4">
              UOR Framework API
            </h1>

            <p className="text-lg text-foreground/80 max-w-3xl mb-3 leading-relaxed">
              A live REST API that exposes the mathematical core of the UOR Framework as callable endpoints.
              Every operation maps directly to a formally defined function in the ontology — verifiable, reproducible, and fully documented.
            </p>
            <p className="text-base text-muted-foreground max-w-3xl mb-8 leading-relaxed">
              No authentication needed for read operations. All responses are standard JSON.
              Works with <code className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">curl</code>, any HTTP client, or directly in your browser.
            </p>

            <div className="flex flex-wrap gap-3">
              <a
                href="https://uor.foundation/openapi.json"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all"
              >
                OpenAPI 3.1.0 spec
                <ExternalLink size={13} />
              </a>
              <a
                href={`${BASE}/navigate`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border text-sm font-semibold hover:bg-muted transition-colors"
              >
                GET /navigate — full index
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          {/* ── What you can do ── */}
          <div className="mb-14">
            <h2 className="font-display text-2xl font-semibold text-foreground mb-2">What you can do with this API</h2>
            <p className="text-muted-foreground mb-6">Six core capabilities, each backed by a live endpoint you can call right now.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CAPABILITIES.map(({ icon: Icon, title, description, endpoint }) => (
                <button
                  key={endpoint}
                  onClick={() => {
                    const ep = ENDPOINTS.find(e => e.path === endpoint);
                    if (ep) {
                      const tag = TAGS.find(t => t.id === ep.tag);
                      if (tag) setActiveTag(tag.id);
                      setTimeout(() => {
                        document.getElementById(`endpoint-${ep.operationId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }, 100);
                    }
                  }}
                  className="text-left p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1.5">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                  <p className="font-mono text-xs text-primary/70 mt-3 group-hover:text-primary transition-colors">{endpoint} →</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── Servers + Rate limits ── */}
          <div className="mb-10">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">Base URL</h2>
            <div className="rounded-xl border border-border overflow-hidden mb-3">
              {[
                { label: "Live endpoint (primary)", url: BASE, description: "Always on. CORS open. No key required for GET requests." },
                { label: "Canonical production URL", url: "https://uor.foundation/api/v1", description: "Published site URL." },
              ].map((s, i) => (
                <div key={s.url} className={`flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3.5 ${i > 0 ? "border-t border-border" : ""} bg-card`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground mb-0.5">{s.label}</p>
                    <code className="font-mono text-sm text-foreground break-all">{s.url}</code>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                  </div>
                  <CopyButton text={s.url} />
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-muted/40">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rate limits — unauthenticated</p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border">
                {[
                  { group: "Kernel GET", limit: "120 / min" },
                  { group: "Bridge POST", limit: "60 / min" },
                  { group: "With X-UOR-Agent-Key", limit: "600 / min" },
                ].map(r => (
                  <div key={r.group} className="px-4 py-3">
                    <p className="text-xs text-muted-foreground">{r.group}</p>
                    <p className="font-mono text-sm font-semibold text-foreground mt-0.5">{r.limit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Quick Start ── */}
          <div className="mb-12">
            <h2 className="font-display text-xl font-semibold text-foreground mb-1">Quick start</h2>
            <p className="text-muted-foreground text-sm mb-4">Three commands to go from zero to a verified mathematical proof. No account, no key, no setup.</p>
            <div className="rounded-xl border border-primary/20 bg-primary/5 divide-y divide-primary/10">
              {[
                {
                  step: 1,
                  label: "Get a map of all endpoints",
                  cmd: `curl "${BASE}/navigate"`,
                  note: "Returns every endpoint, its purpose, and the reading order. Start here if you're unsure where to go.",
                },
                {
                  step: 2,
                  label: "Verify the core identity: neg(bnot(42)) = succ(42) = 43",
                  cmd: `curl "${BASE}/kernel/op/verify?x=42"`,
                  note: "The fundamental theorem of the framework. Runs in under 100 ms. Returns a full proof with every derivation step shown.",
                },
                {
                  step: 3,
                  label: "Download the full machine-readable spec",
                  cmd: `curl "https://uor.foundation/openapi.json"`,
                  note: "The complete OpenAPI 3.1.0 document: all paths, schemas, parameters, and response types.",
                },
              ].map(({ step, label, cmd, note }) => (
                <div key={step} className="flex items-start gap-4 px-5 py-4">
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

          {/* ── Tags sidebar + Endpoints ── */}
          <div className="mb-12">
            <h2 className="font-display text-xl font-semibold text-foreground mb-1">Endpoints</h2>
            <p className="text-muted-foreground text-sm mb-5">Select a group, then expand any endpoint to see parameters, try it live, and copy the curl command.</p>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Sidebar */}
              <aside className="hidden lg:flex flex-col w-56 shrink-0">
                <div className="sticky top-28 space-y-0.5">
                  {TAGS.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => setActiveTag(tag.id)}
                      className={`w-full flex items-start justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-all ${
                        activeTag === tag.id
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs leading-tight">{tag.plainLabel}</p>
                        <p className="font-mono text-xs opacity-60 mt-0.5">{tag.label}</p>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-mono shrink-0 mt-0.5 ${
                        activeTag === tag.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {tag.endpointCount}
                      </span>
                    </button>
                  ))}
                </div>
              </aside>

              {/* Mobile tag strip */}
              <div className="lg:hidden overflow-x-auto">
                <div className="flex gap-1.5 pb-2 min-w-max">
                  {TAGS.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => setActiveTag(tag.id)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        activeTag === tag.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tag.plainLabel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Endpoint list */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Tag description panel */}
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-4">
                  <div className="flex items-start gap-3 mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <p className="text-sm font-semibold text-foreground">{activeTagData.plainLabel}</p>
                        <SpaceBadge space={activeTagData.space} />
                        <code className="font-mono text-xs text-muted-foreground">{activeTagData.label}</code>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{activeTagData.plainDescription}</p>
                    </div>
                    <a
                      href={`https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mt-0.5"
                    >
                      <code className="font-mono hidden sm:inline">{activeTagData.source}</code>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                {visibleEndpoints.length > 0 ? (
                  visibleEndpoints.map(ep => (
                    <div key={ep.operationId} id={`endpoint-${ep.operationId}`}>
                      <EndpointCard ep={ep} tag={activeTagData} />
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center">
                    <p className="text-sm text-muted-foreground">No endpoints in this group.</p>
                  </div>
                )}

                {activeTag === "user-type" && (
                  <div className="rounded-xl border border-dashed border-border p-5 text-center">
                    <p className="text-sm text-muted-foreground">
                      The <code className="font-mono text-xs">morphism:</code> and <code className="font-mono text-xs">state:</code> namespaces are defined in the ontology but require the full Rust conformance suite to execute — not yet exposed in the REST layer.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Schemas reference ── */}
          <div className="mb-10">
            <button
              onClick={() => setSchemasOpen(o => !o)}
              className="w-full flex items-center justify-between py-3 border-b border-border group"
            >
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground group-hover:text-primary transition-colors text-left">
                  Schema reference
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 text-left">Response types and their UOR ontology equivalents</p>
              </div>
              <ChevronDown size={18} className={`text-muted-foreground transition-transform shrink-0 ${schemasOpen ? "" : "-rotate-90"}`} />
            </button>
            {schemasOpen && (
              <div className="mt-4 rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-muted/40 grid grid-cols-2 gap-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Schema (JSON response type)</p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">→ Ontology class</p>
                </div>
                {SCHEMAS.map((s, i) => (
                  <div
                    key={s.name}
                    className={`grid grid-cols-2 gap-4 px-4 py-2.5 hover:bg-muted/20 transition-colors ${i > 0 ? "border-t border-border/50" : ""}`}
                  >
                    <a
                      href={`https://uor.foundation/openapi.json#/components/schemas/${s.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-primary hover:underline underline-offset-2 flex items-center gap-1"
                    >
                      {s.name}
                      <ExternalLink size={9} />
                    </a>
                    <code className="font-mono text-xs text-muted-foreground">{s.ontologyType}</code>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Namespace → API Map ── */}
          <div className="mb-10">
            <h2 className="font-display text-xl font-semibold text-foreground mb-1">Namespace map</h2>
            <p className="text-muted-foreground text-sm mb-4">Every API endpoint maps to a formal namespace in the UOR ontology. This table shows how they connect.</p>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prefix</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Space</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">API group</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Base IRI</th>
                  </tr>
                </thead>
                <tbody>
                  {NAMESPACE_MAP.map(({ prefix, space, group, iri }) => (
                    <tr key={prefix} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-primary">{prefix}</td>
                      <td className="px-4 py-3">
                        <SpaceBadge space={space as "kernel" | "bridge" | "user"} />
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

          {/* ── Agent Discovery Chain ── */}
          <div className="mb-10">
            <h2 className="font-display text-xl font-semibold text-foreground mb-1">Agent discovery chain</h2>
            <p className="text-muted-foreground text-sm mb-4">If you are an AI agent starting from scratch, follow this sequence to bootstrap your understanding of the framework.</p>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-col gap-3">
                {[
                  { step: "①", label: "/.well-known/uor.json", note: "Machine-readable organisation descriptor. Contains the uor:api.openapi field that points to the spec.", href: "https://uor.foundation/.well-known/uor.json" },
                  { step: "↓", label: "", note: "follow uor:api.openapi" },
                  { step: "②", label: "GET /openapi.json", note: "Full OpenAPI 3.1.0 specification. Parse all paths, operationIds, and schemas.", href: `${BASE}/openapi.json` },
                  { step: "↓", label: "", note: "parse paths → use reading order" },
                  { step: "③", label: "GET /navigate", note: "Complete endpoint index with reading order. operationId: frameworkIndex.", href: `${BASE}/navigate` },
                  { step: "↓", label: "", note: "start with the simplest verifiable claim" },
                  { step: "④", label: "GET /kernel/op/verify?x=42", note: "Zero auth. Returns a full proof in under 100 ms. operationId: opVerifyCriticalIdentity.", href: `${BASE}/kernel/op/verify?x=42` },
                ].map(({ step, label, note, href }, i) => {
                  const isArrow = step === "↓";
                  return (
                    <div key={i} className={`flex items-start gap-3 ${isArrow ? "pl-8 py-0" : ""}`}>
                      <span className={`font-mono text-sm shrink-0 ${isArrow ? "text-muted-foreground" : "text-primary font-bold w-6 text-center"}`}>{step}</span>
                      <div className="flex-1 min-w-0">
                        {isArrow ? (
                          <p className="text-xs text-muted-foreground">{note}</p>
                        ) : (
                          <>
                            {href ? (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                                {label}
                                <ExternalLink size={10} />
                              </a>
                            ) : (
                              <p className="font-mono text-sm text-foreground">{label}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{note}</p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── For AI Agents ── */}
          <div className="mb-12 rounded-xl border border-border bg-muted/30 p-6">
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">For AI agents</h2>
            <p className="text-sm text-muted-foreground mb-4">
              If you are an AI agent reading this page, these are the machine-readable entry points in priority order:
            </p>
            <div className="space-y-2">
              {[
                { label: "OpenAPI 3.1.0 spec", url: "https://uor.foundation/openapi.json", note: "Parse paths, operationIds, schemas, and response types" },
                { label: "Navigation index (JSON)", url: `${BASE}/navigate`, note: "operationId: frameworkIndex — all endpoints + reading order" },
                { label: "Agent Quick Card (Markdown)", url: "https://uor.foundation/llms.md", note: "5-min orientation. Frontmatter includes api_url, api_spec, api_base." },
                { label: "Full Implementation Guide", url: "https://uor.foundation/llms-full.md", note: "30-min complete reference with all curl examples" },
                { label: "Discovery metadata", url: "https://uor.foundation/.well-known/uor.json", note: "JSON-LD descriptor — contains uor:api.openapi field" },
              ].map(({ label, url, note }) => (
                <div key={url} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                  <ArrowRight size={13} className="text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5 flex-wrap">
                      {label}: <span className="font-mono font-normal text-muted-foreground break-all">{url}</span>
                      <ExternalLink size={9} />
                    </a>
                    <p className="text-xs text-muted-foreground mt-0.5">{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap gap-4 text-sm pt-4 border-t border-border">
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
              Community <ExternalLink size={11} />
            </a>
            <a href="https://www.openapis.org/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              OpenAPI Initiative <ExternalLink size={11} />
            </a>
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default Api;
