import { useState, useCallback } from "react";
import Layout from "@/components/layout/Layout";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Play,
  Loader2,
  ExternalLink,
  ArrowRight,
  Shield,
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
  description: string;
  source: string;
  space: "kernel" | "bridge" | "user";
  endpointCount: number;
}

/* ─────────────────────────── Tag data (verbatim from spec) ─────────────────────────── */

const TAGS: Tag[] = [
  {
    id: "navigate",
    label: "navigate",
    description: "Framework navigation — reading order, namespace index, ontology links, all endpoint URLs.",
    source: "spec/src/namespaces/",
    space: "kernel",
    endpointCount: 2,
  },
  {
    id: "kernel-op",
    label: "kernel-op",
    description: "op/ namespace — Ring operations, involutions, and algebraic identities.\nSource: spec/src/namespaces/op.rs\nClasses: Operation, UnaryOp, BinaryOp, Involution, Identity, Group, DihedralGroup.\nNamed individuals: neg, bnot, succ, pred, add, sub, mul, xor, and, or, criticalIdentity, D2n.",
    source: "spec/src/namespaces/op.rs",
    space: "kernel",
    endpointCount: 4,
  },
  {
    id: "kernel-schema",
    label: "kernel-schema",
    description: "schema/ + u/ namespaces — Ring substrate, term language, datum values, and content addressing.\nSource: spec/src/namespaces/schema.rs, spec/src/namespaces/u.rs",
    source: "spec/src/namespaces/schema.rs, u.rs",
    space: "kernel",
    endpointCount: 2,
  },
  {
    id: "bridge-partition",
    label: "bridge-partition",
    description: "partition/ namespace — Irreducibility partition of the ring.\nSource: spec/src/namespaces/partition.rs\nClasses: Partition, IrreducibleSet, ReducibleSet, UnitSet, ExteriorSet.",
    source: "spec/src/namespaces/partition.rs",
    space: "bridge",
    endpointCount: 1,
  },
  {
    id: "bridge-proof",
    label: "bridge-proof",
    description: "proof/ namespace — Verification proofs.\nSource: spec/src/namespaces/proof.rs\nClasses: Proof, CriticalIdentityProof, CoherenceProof, WitnessData.",
    source: "spec/src/namespaces/proof.rs",
    space: "bridge",
    endpointCount: 2,
  },
  {
    id: "bridge-cert",
    label: "bridge-cert",
    description: "cert/ namespace — Attestation certificates.\nSource: spec/src/namespaces/cert.rs\nClasses: Certificate, TransformCertificate, IsometryCertificate, InvolutionCertificate.",
    source: "spec/src/namespaces/cert.rs",
    space: "bridge",
    endpointCount: 1,
  },
  {
    id: "bridge-observable",
    label: "bridge-observable",
    description: "observable/ namespace — Metric and geometric measurements.\nSource: spec/src/namespaces/observable.rs\nClasses: RingMetric, HammingMetric, CascadeLength, CatastropheThreshold, Commutator, Monodromy.",
    source: "spec/src/namespaces/observable.rs",
    space: "bridge",
    endpointCount: 1,
  },
  {
    id: "user-type",
    label: "user-type",
    description: "type/ namespace — Runtime type declarations.\nSource: spec/src/namespaces/type_.rs\nClasses: PrimitiveType, ProductType, SumType, ConstrainedType.",
    source: "spec/src/namespaces/type_.rs",
    space: "user",
    endpointCount: 1,
  },
];

/* ─────────────────────────── Endpoint data (from openapi.json) ─────────────────────────── */

const ENDPOINTS: Endpoint[] = [
  {
    operationId: "frameworkIndex",
    method: "GET",
    path: "/navigate",
    summary: "Framework navigation index — reading order, all endpoints, namespace map",
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
    description: "Verifies the foundational theorem of the UOR kernel for a given input x.\n\nFramework mapping:\n• Individual: op:criticalIdentity (type op:Identity)\n• Properties: op:lhs = op:succ, op:rhs = [op:neg, op:bnot]\n• Proof type: proof:CriticalIdentityProof\n• Witness type: proof:WitnessData\n\nSource: spec/src/namespaces/op.rs, conformance/src/tests/fixtures/test6_critical_identity.rs",
    tag: "kernel-op",
    namespace: "op:",
    params: [
      { name: "x", in: "query", type: "integer [0, 2^n)", required: true, default: "42", description: "Ring element value. Must be in [0, 2^n). Default ring R_8 accepts [0, 255]." },
      { name: "n", in: "query", type: "integer [1, 16]", required: false, default: "8", description: "Ring quantum (bit-width). Selects R_n = Z/(2^n)Z." },
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
    description: "Runs neg(bnot(x)) = succ(x) for every x in Z/(2^n)Z and returns a proof:CoherenceProof.\n\nWhen expand=false (default), only summary counts are returned. When expand=true, the full proof:WitnessData array is included.",
    tag: "kernel-op",
    namespace: "op:",
    params: [
      { name: "n", in: "query", type: "integer [1, 16]", required: false, default: "8", description: "Ring quantum (bit-width)." },
      { name: "expand", in: "query", type: "boolean", required: false, default: "false", description: "Include all witness rows when true (~14 KB for n=8)." },
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
    description: "Returns the result of every named op/ individual applied to x.\n\nUnaryOp individuals: neg (ring_reflection), bnot (hypercube_reflection), succ (rotation), pred (rotation_inverse)\n\nBinaryOp individuals: add (translation), sub, mul (scaling), xor (hypercube_translation), and (hypercube_projection), or (hypercube_join)",
    tag: "kernel-op",
    namespace: "op:",
    params: [
      { name: "x", in: "query", type: "integer [0, 2^n)", required: true, default: "42", description: "Ring element value." },
      { name: "y", in: "query", type: "integer [0, 2^n)", required: false, default: "10", description: "Second operand for binary operations. Defaults to x if omitted." },
      { name: "n", in: "query", type: "integer [1, 16]", required: false, default: "8", description: "Ring quantum (bit-width)." },
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
    description: "Returns the complete catalogue of all 12 operation individuals defined in op.rs: neg, bnot, succ, pred, add, sub, mul, xor, and, or, criticalIdentity, D2n.",
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
    description: "Encodes an arbitrary UTF-8 string as a UOR content address using the 6-bit bijection chr(0x2800 + (b & 0x3F)).\n\nOutput type: u:Address with u:glyph (Braille string) and per-byte u:Glyph objects.\n\nTwo address forms:\n• address_simplified: 6-bit bijection (this endpoint)\n• address_canonical: dihedral factorization (requires Rust conformance suite for bytes ≥ 64)",
    tag: "kernel-schema",
    namespace: "u:",
    params: [
      { name: "input", in: "body", type: "string (max 1000 chars)", required: true, description: "UTF-8 string to encode as a u:Address." },
      { name: "encoding", in: "body", type: '"utf8"', required: false, default: "utf8", description: "Character encoding." },
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
    description: "Returns a complete schema:Datum object for a given integer value at quantum level n.\n\nFramework mapping (schema.rs):\n• schema:value — integer value in [0, 2^n)\n• schema:quantum — ring bit-width n\n• schema:stratum — popcount of set bits\n• schema:spectrum — binary representation string\n• schema:glyph — linked u:Address",
    tag: "kernel-schema",
    namespace: "schema:",
    params: [
      { name: "x", in: "query", type: "integer [0, 2^n)", required: true, default: "42", description: "Ring element value." },
      { name: "n", in: "query", type: "integer [1, 16]", required: false, default: "8", description: "Ring quantum (bit-width)." },
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
    description: "Applies the partition map Π : T_n → Part(R_n) to produce a four-component partition of the ring.\n\nFramework mapping (partition.rs):\n• partition:irreducibles → odd values not equal to 1 or m-1\n• partition:reducibles → even values except 0 and m/2\n• partition:units → {1, m-1}\n• partition:exterior → {0, m/2}\n• partition:density = |IrreducibleSet| / |carrier|\n\nContent quality signal: density > 0.25 indicates non-spam content.\n\nTwo modes: Pass type_definition for full ring partition, or input string for per-byte analysis.",
    tag: "bridge-partition",
    namespace: "partition:",
    params: [
      { name: "type_definition", in: "body", type: "object (type:TypeDefinition)", required: false, description: "Type definition to partition. Omit if using input string mode." },
      { name: "input", in: "body", type: "string", required: false, description: "UTF-8 string for per-byte partition analysis." },
      { name: "resolver", in: "body", type: '"DihedralFactorizationResolver" | "EvaluationResolver"', required: false, default: "EvaluationResolver", description: "Resolution strategy." },
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
    description: "Returns a fully structured proof:CriticalIdentityProof linking back to op:criticalIdentity via proof:provesIdentity. This is the output type validated by test6_critical_identity.rs.\n\nFramework mapping (proof.rs): proof:CriticalIdentityProof, proof:WitnessData with proof:x, proof:bnot_x, proof:neg_bnot_x, proof:succ_x, proof:holds.",
    tag: "bridge-proof",
    namespace: "proof:",
    params: [
      { name: "x", in: "query", type: "integer [0, 2^n)", required: true, default: "42", description: "Ring element value." },
      { name: "n", in: "query", type: "integer [1, 16]", required: false, default: "8", description: "Ring quantum (bit-width)." },
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
    description: "Returns a proof:CoherenceProof asserting that a given type declaration is mutually consistent with the ring substrate at quantum level n.\n\nFramework mapping (proof.rs): proof:CoherenceProof subclass of proof:Proof, with proof:verified, proof:quantum, proof:timestamp, proof:witness array.",
    tag: "bridge-proof",
    namespace: "proof:",
    params: [
      { name: "type_definition", in: "body", type: "object (type:TypeDefinition)", required: false, description: "Type definition to verify coherence for." },
      { name: "n", in: "body", type: "integer [1, 16]", required: false, default: "8", description: "Ring quantum." },
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
    description: "Verifies that a named operation is an involution (f(f(x)) = x for all x in R_n) and returns a cert:InvolutionCertificate.\n\nFramework mapping (cert.rs): cert:InvolutionCertificate subclass of cert:Certificate, with cert:operation, cert:method, cert:verified, cert:quantum, cert:timestamp.",
    tag: "bridge-cert",
    namespace: "cert:",
    params: [
      { name: "operation", in: "query", type: "string", required: true, default: "neg", enum: ["neg", "bnot"], description: "The operation to certify. Must be an op:Involution individual." },
      { name: "n", in: "query", type: "integer [1, 16]", required: false, default: "8", description: "Ring quantum (bit-width)." },
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
    description: "Returns RingMetric, HammingMetric, CascadeLength, CatastropheThreshold, and Commutator for a ring element.\n\nFramework mapping (observable.rs):\n• observable:RingMetric — d_R(x,0) = min(x, m-x)\n• observable:HammingMetric — popcount\n• observable:CascadeLength — trailing zero count\n• observable:CatastropheThreshold — phase boundary detection",
    tag: "bridge-observable",
    namespace: "observable:",
    params: [
      { name: "x", in: "query", type: "integer [0, 2^n)", required: true, default: "42", description: "Ring element value." },
      { name: "n", in: "query", type: "integer [1, 16]", required: false, default: "8", description: "Ring quantum (bit-width)." },
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
    description: "Returns the catalogue of primitive type definitions: U1, U4, U8, U16, and composite type structures (ProductType, SumType, ConstrainedType).\n\nSource: spec/src/namespaces/type_.rs",
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
  if (params.length === 0) return <p className="text-xs text-muted-foreground italic">No parameters.</p>;
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
      <div className="flex items-center gap-2 sm:gap-3 px-4 py-3.5">
        <MethodBadge method={ep.method} />
        <code className="font-mono text-sm text-foreground flex-1 min-w-0 truncate">{ep.path}</code>
        {/* operationId — prominent monospace chip (agent canonical identifier) */}
        <code className="hidden md:inline-flex font-mono text-xs px-2 py-0.5 rounded bg-muted border border-border text-muted-foreground shrink-0">
          {ep.operationId}
        </code>
        <button
          onClick={run}
          disabled={loading}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-60"
          title="Run live request"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
          Run
        </button>
        <button
          onClick={() => setOpen(o => !o)}
          className="shrink-0 p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
          aria-label={open ? "Collapse" : "Expand"}
        >
          <ChevronDown size={15} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
        </button>
      </div>

      {/* Summary row */}
      <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
        <SpaceBadge space={tag.space} />
        <span className="font-mono text-xs px-2 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">{ep.namespace}</span>
        <span className="text-xs text-muted-foreground flex-1 min-w-0">{ep.summary}</span>
      </div>

      {/* Expanded panel */}
      {open && (
        <div className="border-t border-border">
          <div className="px-4 py-4 space-y-5">
            {/* operationId (mobile) */}
            <div className="md:hidden">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">operationId</p>
              <code className="font-mono text-xs text-foreground bg-muted px-2 py-1 rounded">{ep.operationId}</code>
            </div>

            {/* Description */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1.5">Description</p>
              <p className="text-sm text-foreground/80 whitespace-pre-line">{ep.description}</p>
            </div>

            {/* Parameters table */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Parameters</p>
              <ParamTable params={ep.params} />
            </div>

            {/* Interactive query params */}
            {ep.params.filter(p => p.in === "query").length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Try it</p>
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
                  Request body <span className="font-mono normal-case text-xs ml-1">— {ep.requestBodySchema}</span>
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
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Responses</p>
              <div className="flex flex-wrap gap-2">
                {ep.responses.map(r => (
                  <div key={r.code} className="flex items-center gap-2">
                    <ResponseCodeBadge code={r.code} />
                    <span className="font-mono text-xs text-muted-foreground">
                      <a
                        href={`https://uor.foundation/openapi.json#/components/schemas/${r.schema}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors underline underline-offset-2"
                      >
                        {r.label}
                      </a>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* curl */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">curl</p>
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
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Response</p>
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
      {/* JSON syntax highlight styles */}
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

          {/* ── Section 0: Info Object ── */}
          <div className="mb-12">
            <div className="flex flex-wrap items-center gap-2 mb-5">
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
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted border border-border text-xs font-mono text-muted-foreground">
                v1.0.0
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted border border-border text-xs font-mono text-muted-foreground">
                Apache 2.0
              </span>
              <a
                href="mailto:hello@uor.foundation"
                className="inline-flex items-center px-3 py-1 rounded-full bg-muted border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                hello@uor.foundation
              </a>
            </div>

            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-3">
              UOR Framework Agent API
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mb-5">
              A complete, agent-navigable REST API for the Universal Object Reference (UOR) Framework — strictly mapped to the formal ontology at <a href="https://github.com/UOR-Foundation/UOR-Framework" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">github.com/UOR-Foundation/UOR-Framework</a>.
            </p>

            {/* Extension fields */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { label: "x-agent-entry-point", value: "https://uor.foundation/llms.md", href: "https://uor.foundation/llms.md" },
                { label: "x-discovery-metadata", value: "/.well-known/uor.json", href: "https://uor.foundation/.well-known/uor.json" },
                { label: "x-community", value: "moltbook.com/m/uor", href: "https://www.moltbook.com/m/uor" },
                { label: "x-ontology-source", value: "github.com/UOR-Foundation", href: "https://github.com/UOR-Foundation/UOR-Framework" },
              ].map(f => (
                <a
                  key={f.label}
                  href={f.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-xs hover:border-primary/30 hover:bg-primary/5 transition-all group"
                >
                  <span className="font-mono text-muted-foreground">{f.label}:</span>
                  <span className="font-mono text-foreground">{f.value}</span>
                  <ExternalLink size={9} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              ))}
            </div>

            {/* Primary CTAs */}
            <div className="flex flex-wrap gap-3">
              <a
                href="https://uor.foundation/openapi.json"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all"
              >
                OpenAPI 3.1.0 spec (openapi.json)
                <ExternalLink size={13} />
              </a>
              <a
                href={`${BASE}/navigate`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border text-sm font-semibold hover:bg-muted transition-colors"
              >
                GET /navigate — machine index
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          {/* ── Section 1: Servers ── */}
          <div className="mb-10">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">Servers</h2>
            <div className="rounded-xl border border-border overflow-hidden">
              {[
                { label: "Live Edge Function (primary)", url: BASE, description: "Lovable Cloud Edge Function — always on, CORS open" },
                { label: "Production URL", url: "https://uor.foundation/api/v1", description: "Canonical production URL (published site)" },
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

            {/* Rate limits */}
            <div className="mt-3 rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-muted/40">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rate Limits (unauthenticated)</p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border">
                {[
                  { group: "/kernel (GET)", limit: "120 req/min" },
                  { group: "/bridge (POST)", limit: "60 req/min" },
                  { group: "Authenticated (X-UOR-Agent-Key)", limit: "600 req/min" },
                ].map(r => (
                  <div key={r.group} className="px-4 py-3">
                    <p className="font-mono text-xs text-muted-foreground">{r.group}</p>
                    <p className="font-mono text-sm font-semibold text-foreground mt-0.5">{r.limit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Section 2: Quick Start ── */}
          <div className="mb-10">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">Quick Start</h2>
            <div className="rounded-xl border border-primary/20 bg-primary/5 divide-y divide-primary/10">
              {[
                {
                  step: 1,
                  label: "Get the complete navigation index",
                  cmd: `curl "${BASE}/navigate"`,
                  note: "operationId: frameworkIndex",
                },
                {
                  step: 2,
                  label: "Verify the critical identity — neg(bnot(42)) = succ(42) = 43",
                  cmd: `curl "${BASE}/kernel/op/verify?x=42"`,
                  note: "operationId: opVerifyCriticalIdentity — zero auth, immediate result",
                },
                {
                  step: 3,
                  label: "Fetch the machine-readable spec",
                  cmd: `curl "https://uor.foundation/openapi.json"`,
                  note: "Full 767-line OpenAPI 3.1.0 document",
                },
              ].map(({ step, label, cmd, note }) => (
                <div key={step} className="flex items-start gap-4 px-5 py-4">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
                    {step}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs text-[hsl(152,34%,60%)] bg-[hsl(220,18%,6%)] px-3 py-1.5 rounded-lg flex-1 min-w-0 break-all">{cmd}</code>
                      <CopyButton text={cmd} size="xs" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 3 + 4: Tags sidebar + Endpoints ── */}
          <div className="mb-10">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">Endpoints</h2>
            <div className="flex flex-col lg:flex-row gap-6">

              {/* Sidebar — desktop */}
              <aside className="hidden lg:flex flex-col w-52 shrink-0">
                <div className="sticky top-28 space-y-0.5">
                  {TAGS.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => setActiveTag(tag.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all group ${
                        activeTag === tag.id
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent"
                      }`}
                    >
                      <span className="font-mono text-xs font-semibold">{tag.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
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
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all ${
                        activeTag === tag.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Endpoint list */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Tag description panel */}
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <code className="font-mono text-sm font-semibold text-foreground">{activeTagData.label}</code>
                        <SpaceBadge space={activeTagData.space} />
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{activeTagData.description}</p>
                    </div>
                    <a
                      href={`https://github.com/UOR-Foundation/UOR-Framework/blob/main/spec/src/namespaces/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <code className="font-mono">{activeTagData.source}</code>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                {/* Endpoint cards */}
                {visibleEndpoints.length > 0 ? (
                  visibleEndpoints.map(ep => (
                    <EndpointCard key={ep.operationId} ep={ep} tag={activeTagData} />
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center">
                    <p className="text-sm text-muted-foreground">No endpoints in this tag group.</p>
                  </div>
                )}

                {activeTagData.space === "user" && activeTag === "user-type" && (
                  <div className="rounded-xl border border-dashed border-border p-5 text-center">
                    <p className="text-sm text-muted-foreground">
                      <code className="font-mono text-xs">morphism:</code> and <code className="font-mono text-xs">state:</code> namespaces require the Rust conformance suite resolver — marked <code className="font-mono text-xs">501 Not Implemented</code> in the current REST layer.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Section 5: Components / Schemas ── */}
          <div className="mb-10">
            <button
              onClick={() => setSchemasOpen(o => !o)}
              className="w-full flex items-center justify-between py-3 border-b border-border group"
            >
              <h2 className="font-display text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                Components / Schemas
              </h2>
              <ChevronDown size={18} className={`text-muted-foreground transition-transform ${schemasOpen ? "" : "-rotate-90"}`} />
            </button>
            {schemasOpen && (
              <div className="mt-4 rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-muted/40 grid grid-cols-2 gap-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Schema name</p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">→ UOR ontology type</p>
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

          {/* ── Section 6: Namespace → API Map ── */}
          <div className="mb-10">
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

          {/* ── Section 7: Agent Discovery Chain ── */}
          <div className="mb-10">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">Agent Discovery Chain</h2>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-col gap-3">
                {[
                  { step: "①", label: "/.well-known/uor.json", note: "JSON-LD organisation descriptor · field: uor:api.openapi", href: "https://uor.foundation/.well-known/uor.json" },
                  { step: "↓", label: "", note: "follow uor:api.openapi" },
                  { step: "②", label: "GET /openapi.json", note: "→ 302 → https://uor.foundation/openapi.json (767 lines, full spec)", href: `${BASE}/openapi.json` },
                  { step: "↓", label: "", note: "parse paths → reading order" },
                  { step: "③", label: "GET /navigate", note: "operationId: frameworkIndex · complete endpoint index", href: `${BASE}/navigate` },
                  { step: "↓", label: "", note: "start with" },
                  { step: "④", label: "GET /kernel/op/verify?x=42", note: "operationId: opVerifyCriticalIdentity · zero-auth, immediate result", href: `${BASE}/kernel/op/verify?x=42` },
                ].map(({ step, label, note, href }, i) => {
                  const isArrow = step === "↓";
                  return (
                    <div key={i} className={`flex items-start gap-3 ${isArrow ? "pl-8 py-0.5" : ""}`}>
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
                            <p className="text-xs text-muted-foreground mt-0.5">{note}</p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Section 8: For AI Agents ── */}
          <div className="mb-12 rounded-xl border border-border bg-muted/30 p-6">
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">For AI Agents</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This page is self-describing. If you are an AI agent reading this HTML, use the following entry points in priority order:
            </p>
            <div className="space-y-2">
              {[
                { label: "Machine-readable spec", url: "https://uor.foundation/openapi.json", note: "OpenAPI 3.1.0 JSON — parse paths, operationIds, schemas" },
                { label: "Navigation index (JSON)", url: `${BASE}/navigate`, note: "operationId: frameworkIndex — reading order + all URLs" },
                { label: "Agent Quick Card (Markdown)", url: "https://uor.foundation/llms.md", note: "5-min agent orientation — frontmatter: api_url, api_spec" },
                { label: "Full Implementation Guide", url: "https://uor.foundation/llms-full.md", note: "30-min complete reference with all curl examples" },
                { label: "Discovery metadata", url: "https://uor.foundation/.well-known/uor.json", note: "JSON-LD org descriptor — uor:api.openapi field" },
              ].map(({ label, url, note }) => (
                <div key={url} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                  <ArrowRight size={13} className="text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-foreground hover:text-primary transition-colors flex items-center gap-1.5 flex-wrap">
                      {label}: <span className="text-muted-foreground break-all">{url}</span>
                      <ExternalLink size={9} />
                    </a>
                    <p className="text-xs text-muted-foreground mt-0.5">{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer links */}
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
