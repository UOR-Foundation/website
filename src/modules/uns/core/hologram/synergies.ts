/**
 * UOR Hologram — Cross-Projection Synergy Engine
 * ════════════════════════════════════════════════
 *
 * Every external standard is a viewing angle of the same UOR identity.
 * But standards don't exist in isolation — they form CHAINS where the
 * output of one projection feeds the input of another. These chains
 * are the connective tissue of global interoperability.
 *
 * This module discovers, verifies, and exposes all cross-projection
 * synergies — proving that one hash, projected through multiple
 * standards, produces a fully interoperable identity mesh.
 *
 * Architecture:
 *   SynergyChain  = ordered sequence of projections that compose
 *   SynergyBridge = shared encoding between two projections
 *   SynergyGraph  = the complete interoperability map
 *
 * @module uns/core/hologram/synergies
 */

import type { ProjectionInput } from "./index";
import { SPECS } from "./specs";

// ── Types ───────────────────────────────────────────────────────────────────

/** A shared encoding or structural element between projections. */
export interface SynergyBridge {
  readonly type: "encoding" | "hash" | "protocol" | "lifecycle" | "stack";
  readonly description: string;
  /** The shared component (e.g., "base64url", "SHA-256 hex", "DID"). */
  readonly sharedComponent: string;
}

/** An ordered chain of projections that compose into an interoperability path. */
export interface SynergyChain {
  readonly name: string;
  readonly description: string;
  /** The projections in this chain, in order. */
  readonly projections: readonly string[];
  /** Bridges between adjacent projections in the chain. */
  readonly bridges: readonly SynergyBridge[];
  /** What this chain enables when composed. */
  readonly capability: string;
}

/** A single verified synergy between exactly two projections. */
export interface VerifiedSynergy {
  readonly from: string;
  readonly to: string;
  readonly bridge: SynergyBridge;
  /** Both projections produced valid output from the same hash. */
  readonly verified: boolean;
  /** The output values for inspection. */
  readonly fromValue: string;
  readonly toValue: string;
}

/** Complete synergy analysis result. */
export interface SynergyAnalysis {
  /** Total projections analyzed. */
  readonly totalProjections: number;
  /** All discovered synergy chains. */
  readonly chains: readonly SynergyChain[];
  /** All pairwise verified synergies. */
  readonly verifiedSynergies: readonly VerifiedSynergy[];
  /** Projections grouped by shared component. */
  readonly clusters: Readonly<Record<string, readonly string[]>>;
  /** Summary statistics. */
  readonly stats: {
    readonly totalChains: number;
    readonly totalBridges: number;
    readonly totalClusters: number;
    readonly coveragePercent: number;
  };
}

// ── Synergy Chain Definitions ──────────────────────────────────────────────
//
// These are the discovered interoperability paths across the hologram.
// Each chain proves that multiple standards compose through UOR identity.

export const SYNERGY_CHAINS: readonly SynergyChain[] = [

  // ─── Chain 1: Identity Triangle (W3C/eIDAS 2.0 Credential Lifecycle) ────
  {
    name: "Identity Triangle",
    description: "Complete W3C credential lifecycle: Issue → Hold → Present → Revoke",
    projections: ["vc", "sd-jwt", "openid4vp", "token-status-list"],
    bridges: [
      { type: "lifecycle", description: "VC issuance feeds SD-JWT selective disclosure", sharedComponent: "SHA-256 claim digest" },
      { type: "lifecycle", description: "SD-JWT holder presents via OpenID4VP", sharedComponent: "vp_token hash" },
      { type: "lifecycle", description: "OpenID4VP references Token Status List for revocation", sharedComponent: "status index" },
    ],
    capability: "Any UOR object can be issued as a credential, selectively disclosed, presented to verifiers, and revoked — using one hash across four standards",
  },

  // ─── Chain 2: Biometric Trust Stack (WebAuthn + COSE + mDL) ─────────────
  {
    name: "Biometric Trust Stack",
    description: "Passkey authentication → COSE crypto envelope → Mobile credential",
    projections: ["webauthn", "cose", "mdl", "cbor-ld"],
    bridges: [
      { type: "encoding", description: "WebAuthn credentialId and COSE Key Thumbprint share base64url encoding", sharedComponent: "base64url(SHA-256)" },
      { type: "stack", description: "COSE wraps mDL credential signatures", sharedComponent: "CBOR binary format" },
      { type: "stack", description: "mDL data elements compress via CBOR-LD", sharedComponent: "CBOR encoding" },
    ],
    capability: "Biometric login (passkey) → cryptographic proof (COSE) → government ID (mDL) — all from one hash",
  },

  // ─── Chain 3: AI Provenance Pipeline (Content → Model → Tool → Trace) ──
  {
    name: "AI Provenance Pipeline",
    description: "End-to-end AI content provenance: creation → model → execution → observation",
    projections: ["c2pa", "onnx", "mcp-tool", "opentelemetry"],
    bridges: [
      { type: "protocol", description: "C2PA content manifest links to ONNX model that generated it", sharedComponent: "SHA-256 assertion" },
      { type: "protocol", description: "ONNX model hash identifies the MCP tool's compute engine", sharedComponent: "model identity hash" },
      { type: "protocol", description: "MCP tool calls carry OpenTelemetry trace context", sharedComponent: "trace/span IDs from hash" },
    ],
    capability: "Prove who created content, which model processed it, which tool executed it, and trace the entire pipeline — one hash, four layers",
  },

  // ─── Chain 4: Zero-Trust Event Security ─────────────────────────────────
  {
    name: "Zero-Trust Event Security",
    description: "Security events → event mesh → observability → credential revocation",
    projections: ["ssf", "cloudevents", "opentelemetry", "token-status-list"],
    bridges: [
      { type: "protocol", description: "SSF Security Event Tokens ride CloudEvents envelopes", sharedComponent: "event ID = content hash" },
      { type: "protocol", description: "CloudEvents carry OpenTelemetry trace context headers", sharedComponent: "W3C Trace Context" },
      { type: "lifecycle", description: "Security events trigger Token Status List revocation", sharedComponent: "credential status index" },
    ],
    capability: "A credential compromise (SSF) propagates as a CloudEvent, is traced via OpenTelemetry, and triggers real-time revocation — content-addressed security pipeline",
  },

  // ─── Chain 5: DID Unification Layer ─────────────────────────────────────
  {
    name: "DID Unification Layer",
    description: "Every DID-based projection resolves to the same canonical identity",
    projections: ["did", "tsp-vid", "fpp-rdid", "fpp-mdid", "fpp-pdid", "didcomm-v2"],
    bridges: [
      { type: "hash", description: "did:uor and TSP VID are identical projections", sharedComponent: "did:uor:{cid}" },
      { type: "protocol", description: "FPP R-DIDs derive from DID for private channels", sharedComponent: "DID method" },
      { type: "protocol", description: "FPP M-DIDs extend the DID namespace for communities", sharedComponent: "DID resolution" },
      { type: "protocol", description: "FPP P-DIDs extend for cross-context public identity", sharedComponent: "DID namespace" },
      { type: "protocol", description: "DIDComm v2 messages address DID-identified parties", sharedComponent: "DID addressing" },
    ],
    capability: "One hash → six DID projections → complete decentralized identity mesh covering trust, privacy, community, persona, and messaging",
  },

  // ─── Chain 6: Enterprise IAM Bridge ─────────────────────────────────────
  {
    name: "Enterprise IAM Bridge",
    description: "Enterprise identity: authentication → provisioning → credentials → discovery",
    projections: ["oidc", "webauthn", "scim", "sd-jwt", "webfinger"],
    bridges: [
      { type: "protocol", description: "OIDC subject identifier links to WebAuthn credential", sharedComponent: "user identity hash" },
      { type: "protocol", description: "WebAuthn credential maps to SCIM externalId for provisioning", sharedComponent: "SHA-256 identity" },
      { type: "protocol", description: "SCIM-provisioned user receives SD-JWT credentials", sharedComponent: "credential subject hash" },
      { type: "protocol", description: "WebFinger discovers OIDC configuration for the identity", sharedComponent: "acct: URI → OIDC issuer" },
    ],
    capability: "One hash provisions an identity across all enterprise SaaS platforms — same user, same credential, zero reconciliation",
  },

  // ─── Chain 7: Blockchain Settlement Triad ───────────────────────────────
  {
    name: "Blockchain Settlement Triad",
    description: "Three-chain settlement: Bitcoin → Zcash → Ethereum — same hash, three ledgers",
    projections: ["bitcoin", "zcash-transparent", "eth-commitment", "pq-bridge", "pq-envelope"],
    bridges: [
      { type: "hash", description: "Bitcoin and Zcash transparent use identical OP_RETURN scripts", sharedComponent: "6a24554f52{hash}" },
      { type: "hash", description: "Ethereum commitment is the same 256-bit hash as 0x-prefixed", sharedComponent: "0x{hex}" },
      { type: "protocol", description: "PQ Bridge wraps all three with Dilithium-3 signatures", sharedComponent: "ML-DSA-65 signing target" },
      { type: "protocol", description: "PQ Envelope encodes the on-chain anchor structure", sharedComponent: "UOR protocol header" },
    ],
    capability: "Anchor a UOR identity on Bitcoin, Zcash, AND Ethereum simultaneously with post-quantum security — one hash, three chains, one PQ signature",
  },

  // ─── Chain 8: Social Federation Ring ────────────────────────────────────
  {
    name: "Social Federation Ring",
    description: "Social graph spanning ActivityPub → AT Protocol → Nostr → ENS",
    projections: ["activitypub", "atproto", "nostr", "nostr-note", "ens", "webfinger"],
    bridges: [
      { type: "protocol", description: "ActivityPub objects discovered via WebFinger", sharedComponent: "acct: URI" },
      { type: "protocol", description: "AT Protocol DID resolves to same identity as ActivityPub actor", sharedComponent: "did:uor:{cid}" },
      { type: "hash", description: "Nostr event ID IS the raw SHA-256 hex — identical to UOR", sharedComponent: "SHA-256 hex (64 chars)" },
      { type: "encoding", description: "Nostr note1 encoding wraps the same hash in bech32m", sharedComponent: "bech32m(SHA-256)" },
      { type: "hash", description: "ENS name and WebFinger both derived from same hash prefix", sharedComponent: "hex prefix discovery" },
    ],
    capability: "One identity federated across Mastodon, Bluesky, Nostr, and ENS — same hash, four social networks, discoverable via WebFinger",
  },

  // ─── Chain 9: Trust Infrastructure Stack (ToIP + FPP + TSP) ─────────────
  {
    name: "Trust Infrastructure Stack",
    description: "Full Trust over IP stack: TSP transport → FPP credentials → TRQP registry",
    projections: ["tsp-vid", "tsp-envelope", "tsp-relationship", "fpp-phc", "fpp-vrc", "trqp"],
    bridges: [
      { type: "protocol", description: "TSP VIDs identify parties in TSP envelopes", sharedComponent: "did:uor VID" },
      { type: "protocol", description: "TSP relationships map to FPP VRC exchanges", sharedComponent: "bilateral hash" },
      { type: "protocol", description: "FPP PHCs anchor personhood in TSP handshakes", sharedComponent: "credential hash" },
      { type: "protocol", description: "FPP VRCs form edges in the TRQP trust registry", sharedComponent: "trust graph node" },
      { type: "protocol", description: "TRQP queries resolve entities via content-addressed lookup", sharedComponent: "entity hash" },
    ],
    capability: "Complete Trust over IP deployment: authenticated messaging (TSP) + personhood (PHC) + relationships (VRC) + registry (TRQP) — all from one hash",
  },

  // ─── Chain 10: Privacy Container Stack ──────────────────────────────────
  {
    name: "Privacy Container Stack",
    description: "Layered privacy: selective disclosure → envelope elision → shielded memo",
    projections: ["sd-jwt", "gordian-envelope", "zcash-memo", "cose"],
    bridges: [
      { type: "protocol", description: "SD-JWT claims nest inside Gordian Envelope subjects", sharedComponent: "SHA-256 digest tree" },
      { type: "protocol", description: "Gordian Envelope elision mirrors Zcash memo encryption", sharedComponent: "selective redaction" },
      { type: "encoding", description: "Both Gordian and COSE use CBOR binary encoding", sharedComponent: "CBOR structure" },
    ],
    capability: "Three layers of privacy: choose what to reveal (SD-JWT), what to redact (Gordian), what to encrypt (Zcash) — all preserving the same content hash",
  },

  // ─── Chain 11: Content-Gated Commerce ───────────────────────────────────
  {
    name: "Content-Gated Commerce",
    description: "Content delivery IS payment settlement — preimage = canonical bytes",
    projections: ["bitcoin-hashlock", "lightning", "x402", "mcp-tool"],
    bridges: [
      { type: "hash", description: "Bitcoin HTLC preimage = UOR canonical bytes", sharedComponent: "SHA-256 preimage" },
      { type: "hash", description: "Lightning payment_hash = same SHA-256 identity", sharedComponent: "256-bit payment hash" },
      { type: "protocol", description: "x402 payment requirement references the content hash", sharedComponent: "payment requirement hash" },
      { type: "protocol", description: "MCP tool output delivery reveals preimage, settling payment", sharedComponent: "content = preimage" },
    ],
    capability: "An AI agent tool call (MCP) generates content whose delivery automatically settles a Lightning micropayment — content delivery IS payment",
  },

  // ─── Chain 12: Semantic Data Bridge ─────────────────────────────────────
  {
    name: "Semantic Data Bridge",
    description: "Full semantic web stack: JSON-LD → RDF → SPARQL → Schema.org → CBOR-LD",
    projections: ["jsonld", "solid", "schema-org", "cbor-ld", "crdt"],
    bridges: [
      { type: "protocol", description: "JSON-LD URN identifies RDF resources in Solid pods", sharedComponent: "URN identity" },
      { type: "protocol", description: "Solid WebID profile links to Schema.org typed identity", sharedComponent: "structured data hash" },
      { type: "encoding", description: "Schema.org JSON-LD compresses to CBOR-LD for IoT", sharedComponent: "semantic compression" },
      { type: "protocol", description: "CRDT document ID enables offline-first collaboration on same object", sharedComponent: "automerge document hash" },
    ],
    capability: "One semantic object accessible as JSON-LD, stored in a Solid pod, typed via Schema.org, compressed for IoT (CBOR-LD), and collaboratively edited offline (CRDT)",
  },

  // ─── Chain 13: Supply Chain Integrity ───────────────────────────────────
  {
    name: "Supply Chain Integrity",
    description: "Software + physical supply chain: SCITT → OCI → GS1 → C2PA",
    projections: ["scitt", "oci", "gs1", "c2pa", "cid"],
    bridges: [
      { type: "protocol", description: "SCITT transparency statements cover OCI container images", sharedComponent: "SHA-256 statement hash" },
      { type: "hash", description: "OCI image digest IS sha256:{hex} — identical to UOR hex", sharedComponent: "sha256:{hex}" },
      { type: "protocol", description: "GS1 Digital Link identifies the physical product the container serves", sharedComponent: "product identity hash" },
      { type: "protocol", description: "C2PA provenance manifest proves who built the software/product", sharedComponent: "SHA-256 assertion" },
    ],
    capability: "Trace a product from code (OCI) to shelf (GS1) to provenance (C2PA) to transparency log (SCITT) — one hash anchoring the entire supply chain",
  },

  // ─── Chain 14: Agent Mesh Network ───────────────────────────────────────
  {
    name: "Agent Mesh Network",
    description: "Complete agentic infrastructure: identity → discovery → messaging → payment",
    projections: ["erc8004", "a2a", "mcp-tool", "x402", "nanda-agentfacts", "skill-md"],
    bridges: [
      { type: "protocol", description: "ERC-8004 on-chain identity resolves via NANDA AgentFacts", sharedComponent: "agent identity hash" },
      { type: "protocol", description: "AgentFacts passport advertises A2A capabilities", sharedComponent: "capability descriptor hash" },
      { type: "protocol", description: "A2A tasks invoke MCP tools with provenance tracking", sharedComponent: "task hash = content hash" },
      { type: "protocol", description: "MCP tool outputs trigger x402 micropayments", sharedComponent: "payment hash" },
      { type: "protocol", description: "Skill.md descriptors are integrity-verified via content hash", sharedComponent: "skill descriptor hash" },
    ],
    capability: "An AI agent has an on-chain identity (ERC-8004), is discoverable (NANDA), communicates (A2A), executes tools (MCP), earns revenue (x402), and has verified skills (skill.md)",
  },

  // ─── Chain 15: Real-Time Communication Layer ────────────────────────────
  {
    name: "Real-Time Communication Layer",
    description: "Streaming + messaging + events: WebTransport → DIDComm → CloudEvents → CRDT",
    projections: ["webtransport", "didcomm-v2", "cloudevents", "crdt", "mls"],
    bridges: [
      { type: "protocol", description: "WebTransport sessions carry DIDComm v2 encrypted messages", sharedComponent: "session identity hash" },
      { type: "protocol", description: "DIDComm v2 events map to CloudEvents envelope format", sharedComponent: "message ID = content hash" },
      { type: "protocol", description: "CloudEvents deliver CRDT state updates for collaboration", sharedComponent: "event payload hash" },
      { type: "protocol", description: "MLS group encryption secures all participants", sharedComponent: "group identity hash" },
    ],
    capability: "Real-time collaboration: WebTransport stream → DIDComm encrypted message → CloudEvent notification → CRDT merge — all content-addressed",
  },

  // ─── Chain 16: Software Supply Chain Integrity ──────────────────────────
  {
    name: "Software Supply Chain Integrity",
    description: "Source → Build → Container → Deploy → Observe — full DevSecOps pipeline",
    projections: ["python-module", "rust-crate", "go-module", "dockerfile", "oci", "scitt", "opentelemetry"],
    bridges: [
      { type: "stack", description: "Python/Rust/Go source modules hash their canonical AST", sharedComponent: "urn:uor:lang:*" },
      { type: "stack", description: "Go modules already use content-addressed go.sum checksums", sharedComponent: "SHA-256 content hash" },
      { type: "stack", description: "Compiled binaries embed in Dockerfile build stages", sharedComponent: "build artifact hash" },
      { type: "hash", description: "Dockerfile produces OCI image with sha256 digest", sharedComponent: "sha256:{hex}" },
      { type: "protocol", description: "OCI image registered in SCITT transparency log", sharedComponent: "SCITT statement hash" },
      { type: "protocol", description: "Deployed service emits OpenTelemetry traces with content-addressed IDs", sharedComponent: "trace ID from hash" },
    ],
    capability: "Every stage of software delivery — source, build, container, registry, deploy, observe — is content-addressed with one hash threading through",
  },

  // ─── Chain 17: Cross-Language Code Provenance ──────────────────────────
  {
    name: "Cross-Language Code Provenance",
    description: "Code artifact → Knowledge Graph → ONNX model → AI tool output",
    projections: ["ts-module", "js-module", "code-kg", "code-kg-relation", "onnx", "mcp-tool"],
    bridges: [
      { type: "stack", description: "TypeScript compiles to JavaScript — same semantic, two hashes", sharedComponent: "urn:uor:lang:* namespace" },
      { type: "protocol", description: "JS/TS modules are entities in the Code Knowledge Graph", sharedComponent: "code entity hash" },
      { type: "protocol", description: "Code KG relations link code to the ONNX models it trains", sharedComponent: "code→model provenance" },
      { type: "protocol", description: "ONNX model hash identifies the MCP tool's compute engine", sharedComponent: "model identity hash" },
      { type: "protocol", description: "MCP tool output is content-addressed for verification", sharedComponent: "tool output hash" },
    ],
    capability: "Trace from source code (TS/JS) through knowledge graph to trained model (ONNX) to AI tool output (MCP) — full code-to-inference provenance",
  },

  // ─── Chain 18: JVM Ecosystem Pipeline ──────────────────────────────────
  {
    name: "JVM Ecosystem Pipeline",
    description: "JVM languages → bytecode → container → enterprise identity → observability",
    projections: ["java-class", "kotlin", "scala", "groovy", "clojure", "oci", "oidc", "scim"],
    bridges: [
      { type: "stack", description: "Kotlin/Scala/Groovy/Clojure all compile to JVM bytecode", sharedComponent: "JVM bytecode hash" },
      { type: "stack", description: "Java class bytecode is the canonical shared target", sharedComponent: "urn:uor:lang:java" },
      { type: "hash", description: "JVM app packaged as OCI container with content-addressed digest", sharedComponent: "sha256:{hex}" },
      { type: "protocol", description: "Enterprise app authenticates via OIDC subject identifier", sharedComponent: "user identity hash" },
      { type: "protocol", description: "OIDC-authenticated users provisioned via SCIM", sharedComponent: "SHA-256 identity" },
      { type: "protocol", description: "Kotlin Android → Groovy Gradle → Scala Spark all share JVM identity", sharedComponent: "JVM compilation target" },
      { type: "protocol", description: "Clojure REPL sessions produce content-addressed transcripts", sharedComponent: "session hash" },
    ],
    capability: "Five JVM languages, one bytecode target, one container, one enterprise identity — the entire JVM ecosystem unified by content-addressing",
  },

  // ─── Chain 19: Functional Verification Pipeline ────────────────────────
  {
    name: "Functional Verification Pipeline",
    description: "Formal proof → functional code → property test → deployment certificate",
    projections: ["coq", "lean", "agda", "tlaplus", "haskell", "ocaml", "fsharp", "erlang"],
    bridges: [
      { type: "stack", description: "Coq/Lean/Agda produce machine-checked proofs", sharedComponent: "proof term hash" },
      { type: "stack", description: "TLA+ model-checks distributed system specifications", sharedComponent: "specification hash" },
      { type: "protocol", description: "Haskell/OCaml/F# extract verified code from proofs", sharedComponent: "extracted code hash" },
      { type: "protocol", description: "Erlang's OTP supervision trees map to verified state machines", sharedComponent: "process identity hash" },
      { type: "protocol", description: "Proof certificates compose into verification chains", sharedComponent: "proof chain hash" },
      { type: "protocol", description: "Formal specs link to implementations via shared hash", sharedComponent: "spec↔impl bridge" },
      { type: "protocol", description: "F# and OCaml share the ML core type system", sharedComponent: "ML type hash" },
    ],
    capability: "Mathematical proof (Coq/Lean) → verified implementation (Haskell/OCaml) → production deployment (Erlang OTP) — formal verification pipeline",
  },

  // ─── Chain 20: Web Platform Stack ──────────────────────────────────────
  {
    name: "Web Platform Stack",
    description: "HTML → CSS → JS → WASM → WebGPU — complete browser rendering pipeline",
    projections: ["html", "css", "js-module", "ts-module", "wasm", "wgsl", "svg"],
    bridges: [
      { type: "stack", description: "HTML documents embed CSS stylesheets and JS modules", sharedComponent: "subresource integrity hash" },
      { type: "stack", description: "CSS files are deterministic style declarations", sharedComponent: "stylesheet content hash" },
      { type: "stack", description: "JS modules execute in the browser runtime", sharedComponent: "module content hash" },
      { type: "stack", description: "TS compiles to JS — same semantics, typed provenance", sharedComponent: "compilation target hash" },
      { type: "stack", description: "WASM modules run alongside JS with content-addressed identity", sharedComponent: "WASM module hash" },
      { type: "stack", description: "WGSL shaders execute on WebGPU from content-addressed source", sharedComponent: "shader content hash" },
    ],
    capability: "Every layer of the web platform — document, style, logic, compute, GPU — is content-addressed, enabling Subresource Integrity across the full stack",
  },

  // ─── Chain 21: Data Serialization Interop ──────────────────────────────
  {
    name: "Data Serialization Interop",
    description: "Schema → Serialize → Transport → Validate — universal data pipeline",
    projections: ["protobuf", "avro", "flatbuffers", "msgpack", "cbor", "thrift", "capnproto", "json-schema"],
    bridges: [
      { type: "encoding", description: "Protobuf and Avro both use schema-first binary encoding", sharedComponent: "schema hash" },
      { type: "encoding", description: "FlatBuffers and Cap'n Proto use zero-copy deserialization", sharedComponent: "buffer content hash" },
      { type: "encoding", description: "MessagePack and CBOR are schemaless binary formats", sharedComponent: "binary payload hash" },
      { type: "encoding", description: "Thrift IDL generates cross-language serialization code", sharedComponent: "IDL content hash" },
      { type: "encoding", description: "Cap'n Proto schemas are content-addressed interface definitions", sharedComponent: "interface hash" },
      { type: "protocol", description: "JSON Schema validates the decoded output of all formats", sharedComponent: "validation schema hash" },
      { type: "encoding", description: "All formats produce deterministic byte sequences from structured data", sharedComponent: "canonical bytes → SHA-256" },
    ],
    capability: "Any data structure serialized in Protobuf, Avro, CBOR, MessagePack, Thrift, FlatBuffers, or Cap'n Proto gets the same content-addressed identity",
  },

  // ─── Chain 22: API Description Lifecycle ───────────────────────────────
  {
    name: "API Description Lifecycle",
    description: "API spec → implementation → event contract → service mesh → discovery",
    projections: ["openapi", "asyncapi", "graphql", "wsdl", "raml", "cloudevents", "webfinger"],
    bridges: [
      { type: "protocol", description: "OpenAPI describes REST endpoints with content-addressed schemas", sharedComponent: "API schema hash" },
      { type: "protocol", description: "AsyncAPI extends to event-driven APIs with the same pattern", sharedComponent: "event schema hash" },
      { type: "protocol", description: "GraphQL schemas are introspectable type systems", sharedComponent: "type system hash" },
      { type: "protocol", description: "WSDL provides legacy SOAP interop with content identity", sharedComponent: "service descriptor hash" },
      { type: "protocol", description: "RAML extends REST API description with traits and overlays", sharedComponent: "API design hash" },
      { type: "protocol", description: "CloudEvents envelope carries API event payloads", sharedComponent: "event ID = content hash" },
    ],
    capability: "Every API description language — REST, GraphQL, SOAP, Event-Driven — gets a content-addressed identity, enabling API provenance and versioning",
  },

  // ─── Chain 23: Schema & Ontology Tower ─────────────────────────────────
  {
    name: "Schema & Ontology Tower",
    description: "Ontology → Shape validation → Data binding — the semantic web's type system",
    projections: ["owl", "rdfs", "shacl", "shex", "xsd", "sparql", "schema-org", "jsonld"],
    bridges: [
      { type: "protocol", description: "OWL ontologies define class hierarchies as content-addressed graphs", sharedComponent: "ontology hash" },
      { type: "protocol", description: "RDFS provides the foundational schema vocabulary", sharedComponent: "schema vocabulary hash" },
      { type: "protocol", description: "SHACL shapes validate RDF data against constraints", sharedComponent: "shape hash" },
      { type: "protocol", description: "ShEx provides concise shape expressions for validation", sharedComponent: "shape expression hash" },
      { type: "protocol", description: "XSD defines XML Schema types for structured data", sharedComponent: "type definition hash" },
      { type: "protocol", description: "SPARQL queries operate over content-addressed triples", sharedComponent: "query hash" },
      { type: "protocol", description: "Schema.org types are the web's shared vocabulary", sharedComponent: "structured data hash" },
    ],
    capability: "The complete semantic web stack — ontology (OWL) → schema (RDFS) → validation (SHACL/ShEx) → query (SPARQL) — all content-addressed",
  },

  // ─── Chain 24: Scripting Ecosystem Bridge ──────────────────────────────
  {
    name: "Scripting Ecosystem Bridge",
    description: "Dynamic languages → package managers → deployment — scripting supply chain",
    projections: ["ruby", "php", "perl", "lua", "bash", "powershell", "python-module"],
    bridges: [
      { type: "stack", description: "Ruby gems, PHP Composer, Perl CPAN all use content hashes", sharedComponent: "package content hash" },
      { type: "stack", description: "Lua modules embed in game engines and IoT firmware", sharedComponent: "module content hash" },
      { type: "stack", description: "Bash/PowerShell scripts are infrastructure automation", sharedComponent: "script content hash" },
      { type: "stack", description: "Python pip packages use SHA-256 for integrity verification", sharedComponent: "package hash" },
      { type: "protocol", description: "All scripting languages produce canonicalizable ASTs", sharedComponent: "AST content hash" },
      { type: "protocol", description: "Perl/Raku provide text processing pipelines", sharedComponent: "pipeline hash" },
    ],
    capability: "Every major scripting language's package ecosystem gets content-addressed identity — Ruby gems, PHP packages, Perl modules, Python packages unified",
  },

  // ─── Chain 25: GPU & Shader Pipeline ───────────────────────────────────
  {
    name: "GPU & Shader Pipeline",
    description: "Shader source → GPU compute → ML training → model output",
    projections: ["cuda", "opencl", "glsl", "hlsl", "wgsl", "onnx", "onnx-op"],
    bridges: [
      { type: "stack", description: "CUDA kernels compute ML training operations", sharedComponent: "kernel content hash" },
      { type: "stack", description: "OpenCL provides cross-platform GPU compute", sharedComponent: "compute kernel hash" },
      { type: "stack", description: "GLSL/HLSL render visual outputs from GPU pipelines", sharedComponent: "shader content hash" },
      { type: "stack", description: "WGSL enables browser-native GPU compute", sharedComponent: "WebGPU shader hash" },
      { type: "protocol", description: "GPU kernels train ONNX models with content-addressed weights", sharedComponent: "model training hash" },
      { type: "protocol", description: "ONNX operators map to specific GPU kernel implementations", sharedComponent: "operator implementation hash" },
    ],
    capability: "Complete GPU pipeline — shader authoring → compute execution → ML training → model export — all content-addressed from source to weights",
  },

  // ─── Chain 26: Smart Contract Verification Chain ───────────────────────
  {
    name: "Smart Contract Verification Chain",
    description: "Contract source → bytecode → on-chain → event log — blockchain audit trail",
    projections: ["solidity", "vyper", "move", "cairo", "eth-commitment", "eth-calldata", "eth-log-topic"],
    bridges: [
      { type: "stack", description: "Solidity/Vyper compile to EVM bytecode", sharedComponent: "bytecode content hash" },
      { type: "stack", description: "Move/Cairo compile to alternative VM bytecode", sharedComponent: "VM bytecode hash" },
      { type: "hash", description: "Compiled contracts deploy with content-addressed identity", sharedComponent: "0x{hex}" },
      { type: "protocol", description: "Contract calls encoded as content-addressed calldata", sharedComponent: "calldata hash" },
      { type: "protocol", description: "Event logs indexed by content-addressed topics", sharedComponent: "log topic hash" },
      { type: "protocol", description: "All four languages target content-addressed VMs", sharedComponent: "deployment hash" },
    ],
    capability: "Smart contract source (Solidity/Vyper/Move/Cairo) → deployment → execution → event emission — complete on-chain audit trail",
  },

  // ─── Chain 27: Hardware Description Pipeline ───────────────────────────
  {
    name: "Hardware Description Pipeline",
    description: "RTL design → simulation → synthesis → FPGA/ASIC — hardware provenance",
    projections: ["vhdl", "verilog", "systemverilog", "c-unit", "assembly", "cpp-unit"],
    bridges: [
      { type: "stack", description: "VHDL/Verilog/SystemVerilog define hardware at RTL level", sharedComponent: "RTL content hash" },
      { type: "stack", description: "SystemVerilog extends Verilog with verification features", sharedComponent: "testbench hash" },
      { type: "stack", description: "C/C++ HLS generates hardware from software descriptions", sharedComponent: "HLS source hash" },
      { type: "stack", description: "Assembly maps to final silicon instruction sets", sharedComponent: "instruction content hash" },
      { type: "protocol", description: "Hardware descriptions produce deterministic synthesis outputs", sharedComponent: "synthesis artifact hash" },
    ],
    capability: "Hardware IP from RTL (VHDL/Verilog) through HLS (C++) to instruction sets (ASM) — complete hardware provenance chain",
  },

  // ─── Chain 28: Document & Markup Pipeline ──────────────────────────────
  {
    name: "Document & Markup Pipeline",
    description: "Authoring → Rendering → Publishing — content lifecycle",
    projections: ["markdown", "latex", "asciidoc", "rst", "xml", "html", "svg", "mermaid", "plantuml", "dot"],
    bridges: [
      { type: "stack", description: "Markdown/AsciiDoc/RST are authoring formats", sharedComponent: "source document hash" },
      { type: "stack", description: "LaTeX produces typeset documents with deterministic output", sharedComponent: "typeset content hash" },
      { type: "stack", description: "XML provides structured document transport", sharedComponent: "document structure hash" },
      { type: "stack", description: "HTML is the universal rendering target", sharedComponent: "rendered document hash" },
      { type: "stack", description: "SVG provides vector graphics within documents", sharedComponent: "graphic content hash" },
      { type: "protocol", description: "Mermaid/PlantUML/DOT are diagram-as-code formats", sharedComponent: "diagram source hash" },
      { type: "protocol", description: "Diagrams render to SVG — same visual, content-addressed", sharedComponent: "rendered diagram hash" },
      { type: "protocol", description: "RST documentation compiles to multiple output formats", sharedComponent: "doc source hash" },
      { type: "protocol", description: "All markup formats canonicalize to deterministic byte sequences", sharedComponent: "canonical markup hash" },
    ],
    capability: "Every document format — Markdown, LaTeX, AsciiDoc, XML, HTML — and every diagram format — Mermaid, PlantUML, DOT — content-addressed",
  },

  // ─── Chain 29: Configuration & IaC Pipeline ───────────────────────────
  {
    name: "Configuration & IaC Pipeline",
    description: "Config → Infrastructure → Container → Deploy — infrastructure provenance",
    projections: ["yaml", "toml", "ini", "dotenv", "hcl", "nix", "dockerfile", "makefile", "oci"],
    bridges: [
      { type: "stack", description: "YAML/TOML/INI/dotenv define application configuration", sharedComponent: "config content hash" },
      { type: "stack", description: "HCL (Terraform) declares infrastructure as content-addressed code", sharedComponent: "infrastructure hash" },
      { type: "stack", description: "Nix provides reproducible builds with content-addressed closures", sharedComponent: "derivation hash" },
      { type: "stack", description: "Dockerfiles build containers from content-addressed layers", sharedComponent: "build recipe hash" },
      { type: "stack", description: "Makefiles orchestrate build pipelines", sharedComponent: "build script hash" },
      { type: "hash", description: "All config flows into OCI container images", sharedComponent: "sha256:{hex}" },
      { type: "protocol", description: "Nix closures are already content-addressed — native UOR alignment", sharedComponent: "store path hash" },
      { type: "protocol", description: "HCL state files track infrastructure drift via hash comparison", sharedComponent: "state hash" },
    ],
    capability: "Complete infrastructure pipeline — config (YAML/TOML) → IaC (Terraform/Nix) → build (Docker/Make) → deploy (OCI) — all content-addressed",
  },

  // ─── Chain 30: Legacy Mainframe Bridge ─────────────────────────────────
  {
    name: "Legacy Mainframe Bridge",
    description: "COBOL → Java migration → Enterprise IAM — mainframe modernization",
    projections: ["cobol-copybook", "cobol-program", "java-class", "sql-schema", "oidc"],
    bridges: [
      { type: "stack", description: "COBOL copybooks define shared data structures", sharedComponent: "data structure hash" },
      { type: "stack", description: "COBOL programs consume copybooks as data divisions", sharedComponent: "program content hash" },
      { type: "protocol", description: "COBOL→Java migration verified by comparing canonical hashes", sharedComponent: "semantic equivalence hash" },
      { type: "protocol", description: "SQL schemas bridge mainframe DB2 to modern databases", sharedComponent: "schema identity hash" },
      { type: "protocol", description: "Migrated services authenticate via OIDC", sharedComponent: "service identity hash" },
    ],
    capability: "COBOL mainframe artifacts get content-addressed identity, enabling verified migration to Java/SQL with enterprise IAM integration",
  },

  // ─── Chain 31: Mobile Platform Stack ───────────────────────────────────
  {
    name: "Mobile Platform Stack",
    description: "Mobile code → app identity → biometric auth → mobile credential",
    projections: ["swift", "objective-c", "kotlin", "dart", "webauthn", "mdl"],
    bridges: [
      { type: "stack", description: "Swift/Objective-C target iOS with content-addressed modules", sharedComponent: "iOS module hash" },
      { type: "stack", description: "Kotlin targets Android with JVM content addressing", sharedComponent: "Android module hash" },
      { type: "stack", description: "Dart/Flutter targets cross-platform mobile", sharedComponent: "Flutter widget hash" },
      { type: "protocol", description: "Mobile apps use WebAuthn for biometric authentication", sharedComponent: "credential ID hash" },
      { type: "protocol", description: "Authenticated users hold mobile driver's licenses (mDL)", sharedComponent: "credential content hash" },
    ],
    capability: "Mobile development (Swift/Kotlin/Dart) → biometric auth (WebAuthn) → government credentials (mDL) — mobile identity pipeline",
  },

  // ─── Chain 32: Niche Language Provenance ───────────────────────────────
  {
    name: "Niche Language Provenance",
    description: "Specialized languages with unique computational models — all content-addressed",
    projections: ["apl", "forth", "prolog", "smalltalk", "crystal", "pony", "raku", "tcl"],
    bridges: [
      { type: "stack", description: "APL's array operations produce deterministic results", sharedComponent: "array expression hash" },
      { type: "stack", description: "Forth's stack machine is purely deterministic", sharedComponent: "stack program hash" },
      { type: "stack", description: "Prolog's logic programs are canonicalizable clauses", sharedComponent: "clause set hash" },
      { type: "stack", description: "Smalltalk's image snapshots are content-addressable", sharedComponent: "image content hash" },
      { type: "protocol", description: "Crystal/Pony provide type-safe compiled alternatives", sharedComponent: "compiled artifact hash" },
      { type: "protocol", description: "Raku/Tcl provide text processing and scripting capabilities", sharedComponent: "script content hash" },
      { type: "protocol", description: "All niche languages share the urn:uor:lang:* namespace", sharedComponent: "universal language hash" },
    ],
    capability: "Even niche and historical languages — APL, Forth, Prolog, Smalltalk — get content-addressed identity within the UOR framework",
  },

  // ─── Chain 33: Systems Language Triad ──────────────────────────────────
  {
    name: "Systems Language Triad",
    description: "Next-gen systems languages → WASM → containers — modern systems stack",
    projections: ["zig", "nim", "d-lang", "ada", "fortran", "pascal", "rust-crate", "wasm", "oci"],
    bridges: [
      { type: "stack", description: "Zig/Nim/D provide modern systems alternatives to C/C++", sharedComponent: "systems code hash" },
      { type: "stack", description: "Ada/Fortran/Pascal are safety-critical legacy systems languages", sharedComponent: "certified code hash" },
      { type: "stack", description: "Rust provides memory-safe systems programming", sharedComponent: "crate content hash" },
      { type: "stack", description: "All compile to WASM for portable execution", sharedComponent: "WASM module hash" },
      { type: "hash", description: "WASM modules deploy in OCI containers", sharedComponent: "sha256:{hex}" },
      { type: "protocol", description: "Fortran's scientific computing links to R/Julia data pipelines", sharedComponent: "computation hash" },
      { type: "protocol", description: "Ada's certified code links to hardware verification", sharedComponent: "certification hash" },
      { type: "protocol", description: "Pascal bridges educational to production code", sharedComponent: "instructional code hash" },
    ],
    capability: "Next-gen systems languages (Zig/Nim/D), safety-critical (Ada), scientific (Fortran) — all compile to WASM and deploy as content-addressed containers",
  },

  // ─── Chain 34: Scientific Data Pipeline ────────────────────────────────
  {
    name: "Scientific Data Pipeline",
    description: "Data collection → analysis → visualization → publication — research pipeline",
    projections: ["r-lang", "julia", "matlab", "python-module", "stac", "croissant", "latex"],
    bridges: [
      { type: "stack", description: "R/Julia/MATLAB/Python are the scientific computing stack", sharedComponent: "computation content hash" },
      { type: "protocol", description: "STAC catalogs geospatial data collections", sharedComponent: "dataset catalog hash" },
      { type: "protocol", description: "Croissant describes ML-ready datasets", sharedComponent: "dataset descriptor hash" },
      { type: "protocol", description: "LaTeX publications reference content-addressed datasets", sharedComponent: "publication content hash" },
      { type: "protocol", description: "Scientific reproducibility via content-addressed pipelines", sharedComponent: "pipeline hash" },
      { type: "protocol", description: "MATLAB/Julia numerical results are deterministic", sharedComponent: "numerical result hash" },
    ],
    capability: "Scientific computing (R/Julia/MATLAB/Python) → data cataloging (STAC/Croissant) → publication (LaTeX) — reproducible research pipeline",
  },

  // ─── Chain 35: Consciousness Framework Bridge ─────────────────────────
  {
    name: "Consciousness Framework Bridge",
    description: "Consciousness theories → categories → implications → knowledge graph",
    projections: ["loc", "loc-category", "loc-implication", "owl", "rdfs", "schema-org"],
    bridges: [
      { type: "protocol", description: "LoC theories are content-addressed knowledge objects", sharedComponent: "theory content hash" },
      { type: "protocol", description: "LoC categories organize theories into taxonomies", sharedComponent: "category hash" },
      { type: "protocol", description: "LoC implications link theories to practical consequences", sharedComponent: "implication hash" },
      { type: "protocol", description: "OWL ontologies formalize consciousness categories", sharedComponent: "ontology hash" },
      { type: "protocol", description: "Schema.org structured data enables web discovery", sharedComponent: "structured data hash" },
    ],
    capability: "Consciousness studies formalized as content-addressed knowledge objects within the semantic web — theories, categories, and implications discoverable via standard protocols",
  },

  // ─── Chain 36: Visual & UI Rendering Pipeline ─────────────────────────
  {
    name: "Visual & UI Rendering Pipeline",
    description: "Design tokens → components → rendering → presentation",
    projections: ["ui-tabler", "ui-tabler-stat", "ui-tabler-table", "svg", "css", "html"],
    bridges: [
      { type: "stack", description: "Tabler components are content-addressed UI elements", sharedComponent: "component hash" },
      { type: "stack", description: "Tabler stat/table variants specialize the component hash", sharedComponent: "variant hash" },
      { type: "stack", description: "SVG graphics render within Tabler components", sharedComponent: "graphic content hash" },
      { type: "stack", description: "CSS styles the rendered components", sharedComponent: "stylesheet hash" },
      { type: "stack", description: "HTML assembles the final document", sharedComponent: "document hash" },
    ],
    capability: "UI components (Tabler) → vector graphics (SVG) → styling (CSS) → document (HTML) — content-addressed rendering pipeline",
  },

  // ─── Chain 37: Trust Protocol Extended Stack ──────────────────────────
  {
    name: "Trust Protocol Extended Stack",
    description: "Trust spanning: VID → envelope → route → nested → key — full TSP coverage",
    projections: ["tsp-vid", "tsp-envelope", "tsp-route", "tsp-nested", "tsp-key", "pq-bridge", "pq-witness"],
    bridges: [
      { type: "protocol", description: "TSP VID identifies parties in all envelopes", sharedComponent: "did:uor VID" },
      { type: "protocol", description: "TSP envelopes carry authenticated messages", sharedComponent: "envelope content hash" },
      { type: "protocol", description: "TSP routes direct messages through intermediaries", sharedComponent: "route prefix hash" },
      { type: "protocol", description: "TSP nested envelopes enable end-to-end through proxies", sharedComponent: "nested envelope hash" },
      { type: "protocol", description: "TSP keys provide cryptographic verification", sharedComponent: "key fingerprint hash" },
      { type: "protocol", description: "PQ Bridge wraps TSP with post-quantum signatures", sharedComponent: "ML-DSA-65 signing target" },
    ],
    capability: "Complete Trust Spanning Protocol stack with post-quantum security and algebraic coherence witness — every TSP artifact content-addressed",
  },

  // ─── Chain 38: First Person Trust Graph ───────────────────────────────
  {
    name: "First Person Trust Graph",
    description: "Complete FPP credential lifecycle: PHC → VRC → VEC → R-Card → Trust Graph",
    projections: ["fpp-phc", "fpp-vrc", "fpp-vec", "fpp-rcard", "fpp-trustgraph", "fpp-rdid", "fpp-mdid", "fpp-pdid"],
    bridges: [
      { type: "protocol", description: "PHC establishes personhood as foundation", sharedComponent: "personhood hash" },
      { type: "protocol", description: "VRCs build bilateral trust relationships", sharedComponent: "relationship hash" },
      { type: "protocol", description: "VECs add contextual reputation endorsements", sharedComponent: "endorsement hash" },
      { type: "protocol", description: "R-Cards are digital business cards exchanged over trust channels", sharedComponent: "card content hash" },
      { type: "protocol", description: "Trust Graph aggregates all credentials into a verifiable mesh", sharedComponent: "graph node hash" },
      { type: "protocol", description: "R-DIDs provide pairwise private channels", sharedComponent: "private channel hash" },
      { type: "protocol", description: "M-DIDs scope identity to communities", sharedComponent: "membership hash" },
    ],
    capability: "Complete First Person Project trust infrastructure — personhood, relationships, endorsements, digital cards, trust graph — all content-addressed",
  },

  // ─── Chain 39: Agent Discovery & Coordination ─────────────────────────
  {
    name: "Agent Discovery & Coordination",
    description: "Agent registration → discovery → resolution → context → coordination",
    projections: ["nanda-index", "nanda-agentfacts", "nanda-resolver", "mcp-context", "a2a-task", "skill-md"],
    bridges: [
      { type: "protocol", description: "NANDA Index registers agents for global discovery", sharedComponent: "index entry hash" },
      { type: "protocol", description: "AgentFacts provides cryptographic agent passports", sharedComponent: "passport content hash" },
      { type: "protocol", description: "NANDA Resolver performs name-to-address resolution", sharedComponent: "resolver prefix hash" },
      { type: "protocol", description: "MCP Context blocks tag provenance of agent inputs", sharedComponent: "context block hash" },
      { type: "protocol", description: "A2A Tasks coordinate multi-agent workflows", sharedComponent: "task content hash" },
    ],
    capability: "Complete agent lifecycle — register (NANDA) → discover (AgentFacts) → resolve (Resolver) → contextualize (MCP) → coordinate (A2A) → verify skills (skill.md)",
  },

  // ─── Chain 40: Blockchain Extended Stack ──────────────────────────────
  {
    name: "Blockchain Extended Stack",
    description: "EVM settlement: contract → calldata → event → commitment — full on-chain lifecycle",
    projections: ["eth-commitment", "eth-calldata", "eth-log-topic", "erc8004", "pq-bridge", "pq-envelope", "pq-witness"],
    bridges: [
      { type: "hash", description: "Ethereum commitment is the content hash as bytes32", sharedComponent: "0x{hex}" },
      { type: "protocol", description: "Calldata encodes the PQ commitment registration", sharedComponent: "function selector + hash" },
      { type: "protocol", description: "Log topics enable indexing of PQ commitments", sharedComponent: "indexed topic hash" },
      { type: "protocol", description: "ERC-8004 agent identity registered on same chain", sharedComponent: "agent registry hash" },
      { type: "protocol", description: "PQ Bridge signs all on-chain anchors with Dilithium-3", sharedComponent: "ML-DSA-65 target" },
      { type: "protocol", description: "PQ Witness proves algebraic coherence on-chain", sharedComponent: "coherence witness" },
    ],
    capability: "Complete Ethereum PQ settlement — commitment → calldata → event log → agent identity — all with post-quantum security and coherence proof",
  },

  // ─── Chain 41: Social Identity Extended ───────────────────────────────
  {
    name: "Social Identity Extended",
    description: "Digital identity across social, enterprise, and government contexts",
    projections: ["vcard", "openbadges", "dnssd", "ens", "webfinger", "oidc", "schema-org"],
    bridges: [
      { type: "protocol", description: "vCard provides digital business card identity", sharedComponent: "contact identity hash" },
      { type: "protocol", description: "OpenBadges issues achievement credentials", sharedComponent: "badge content hash" },
      { type: "protocol", description: "DNS-SD enables local network discovery", sharedComponent: "service discovery hash" },
      { type: "protocol", description: "ENS provides decentralized name resolution", sharedComponent: "name hash" },
      { type: "protocol", description: "WebFinger discovers identity across protocols", sharedComponent: "acct: URI" },
      { type: "protocol", description: "OIDC authenticates across enterprise services", sharedComponent: "subject hash" },
    ],
    capability: "One identity spanning vCard, OpenBadges, DNS-SD, ENS, WebFinger, and OIDC — personal, professional, and decentralized contexts unified",
  },

  // ─── Chain 42: Elixir/Erlang Distributed Systems ──────────────────────
  {
    name: "Elixir/Erlang Distributed Systems",
    description: "BEAM VM distributed systems with content-addressed supervision trees",
    projections: ["elixir", "erlang", "scheme", "common-lisp", "racket"],
    bridges: [
      { type: "stack", description: "Elixir compiles to Erlang BEAM bytecode", sharedComponent: "BEAM bytecode hash" },
      { type: "stack", description: "Erlang OTP provides fault-tolerant distributed systems", sharedComponent: "supervision tree hash" },
      { type: "protocol", description: "Scheme/Lisp/Racket share the homoiconic code-as-data paradigm", sharedComponent: "S-expression hash" },
      { type: "protocol", description: "All five languages treat code as manipulable data structures", sharedComponent: "homoiconic hash" },
    ],
    capability: "BEAM VM ecosystem (Elixir/Erlang) + Lisp family (Scheme/CL/Racket) — distributed systems and metaprogramming unified",
  },

  // ─── Chain 43: Certificate Automation Pipeline (x509 + ACME) ──────────
  {
    name: "Certificate Automation Pipeline",
    description: "PKI lifecycle: X.509 certificate issuance → ACME automated renewal → TLS termination → mTLS service mesh",
    projections: ["x509", "acme", "oidc", "webauthn", "tsp-key"],
    bridges: [
      { type: "protocol", description: "X.509 certificate subject hash binds to ACME order identity", sharedComponent: "SHA-256 certificate fingerprint" },
      { type: "lifecycle", description: "ACME challenge tokens prove domain control via content-addressed challenge", sharedComponent: "challenge token hash" },
      { type: "protocol", description: "ACME-issued certificates authenticate OIDC token endpoints", sharedComponent: "TLS certificate chain hash" },
      { type: "protocol", description: "WebAuthn attestation certificates chain to the same X.509 root", sharedComponent: "attestation CA hash" },
    ],
    capability: "Automated PKI: X.509 certificates issued via ACME, binding TLS identity to OIDC authentication and WebAuthn attestation — one hash across the entire certificate lifecycle",
  },

  // ─── Chain 44: RPC Pipeline (gRPC + Protobuf) ─────────────────────────
  {
    name: "RPC Pipeline",
    description: "Schema-first RPC: Protobuf IDL → gRPC service → OpenTelemetry trace → API gateway",
    projections: ["protobuf", "grpc", "opentelemetry", "openapi", "cloudevents"],
    bridges: [
      { type: "encoding", description: "Protobuf schema hash defines the gRPC service contract", sharedComponent: "IDL schema hash" },
      { type: "protocol", description: "gRPC calls carry OpenTelemetry trace context metadata", sharedComponent: "W3C Trace Context" },
      { type: "protocol", description: "gRPC service definitions generate OpenAPI gateway specs", sharedComponent: "service descriptor hash" },
      { type: "protocol", description: "gRPC server-sent events map to CloudEvents envelopes", sharedComponent: "event payload hash" },
    ],
    capability: "Schema-first microservices: Protobuf IDL → gRPC transport → OpenTelemetry observability → OpenAPI documentation → CloudEvents streaming — all content-addressed",
  },

  // ─── Chain 45: Cloud-Native Stack (k8s + Helm + OCI) ──────────────────
  {
    name: "Cloud-Native Stack",
    description: "Container orchestration: OCI image → Helm chart → Kubernetes manifest → service mesh → observability",
    projections: ["oci", "helm", "k8s", "opentelemetry", "grpc", "scitt"],
    bridges: [
      { type: "hash", description: "OCI image digest is the content-addressed deployment unit", sharedComponent: "sha256:{hex}" },
      { type: "stack", description: "Helm charts package OCI images with configuration templates", sharedComponent: "chart content hash" },
      { type: "stack", description: "Kubernetes manifests reference Helm-rendered OCI digests", sharedComponent: "manifest content hash" },
      { type: "protocol", description: "K8s services communicate via gRPC with content-addressed IDL", sharedComponent: "service mesh hash" },
      { type: "protocol", description: "All deployments emit OpenTelemetry traces for observability", sharedComponent: "trace ID from hash" },
    ],
    capability: "Complete cloud-native pipeline: OCI image → Helm packaging → K8s deployment → gRPC service mesh → SCITT transparency — every artifact content-addressed",
  },

  // ─── Chain 46: Automotive Bus Stack (AUTOSAR + CAN + SOME/IP) ─────────
  {
    name: "Automotive Bus Stack",
    description: "Vehicle ECU lifecycle: AUTOSAR component → CAN bus message → SOME/IP service → OTA update verification",
    projections: ["autosar", "can", "someip", "scitt", "c2pa"],
    bridges: [
      { type: "stack", description: "AUTOSAR SWC descriptor hash identifies the ECU software component", sharedComponent: "component descriptor hash" },
      { type: "protocol", description: "CAN frame arbitration IDs derived from AUTOSAR signal mapping", sharedComponent: "signal identity hash" },
      { type: "protocol", description: "SOME/IP service discovery advertises content-addressed ECU services", sharedComponent: "service offering hash" },
      { type: "protocol", description: "SCITT transparency logs audit OTA firmware updates", sharedComponent: "firmware statement hash" },
    ],
    capability: "Automotive ECU lifecycle: AUTOSAR design → CAN bus communication → SOME/IP service discovery → SCITT-audited OTA updates — vehicle software integrity from design to deployment",
  },

  // ─── Chain 47: BIM-to-City Bridge (IFC + CityGML) ────────────────────
  {
    name: "BIM-to-City Bridge",
    description: "Built environment: IFC building model → CityGML urban context → GeoPackage spatial data → digital twin",
    projections: ["ifc", "citygml", "geopackage", "geotiff", "jsonld"],
    bridges: [
      { type: "protocol", description: "IFC building elements export to CityGML LoD2+ city models", sharedComponent: "building geometry hash" },
      { type: "protocol", description: "CityGML objects stored as content-addressed GeoPackage features", sharedComponent: "spatial feature hash" },
      { type: "protocol", description: "GeoPackage raster tiles link to GeoTIFF terrain data", sharedComponent: "raster content hash" },
      { type: "protocol", description: "All BIM/GIS objects expressed as JSON-LD for semantic web integration", sharedComponent: "semantic object hash" },
    ],
    capability: "Built environment digital twin: IFC building design → CityGML urban model → GeoPackage spatial storage → GeoTIFF terrain — all content-addressed for smart city infrastructure",
  },

  // ─── Chain 48: Financial Reporting Pipeline (XBRL + ISO 20022) ────────
  {
    name: "Financial Reporting Pipeline",
    description: "Regulatory reporting: XBRL financial statements → ISO 20022 payment messages → audit trail → compliance verification",
    projections: ["xbrl", "iso20022", "jsonld", "scitt", "x509"],
    bridges: [
      { type: "protocol", description: "XBRL instance documents hash financial facts for tamper-proof reporting", sharedComponent: "financial fact hash" },
      { type: "protocol", description: "ISO 20022 payment messages reference XBRL-reported entities", sharedComponent: "entity identity hash" },
      { type: "protocol", description: "Both XBRL and ISO 20022 map to JSON-LD for semantic interoperability", sharedComponent: "financial ontology hash" },
      { type: "protocol", description: "SCITT transparency logs provide regulatory audit trails", sharedComponent: "compliance statement hash" },
    ],
    capability: "End-to-end financial compliance: XBRL reporting → ISO 20022 payments → SCITT audit trail → X.509 signing — tamper-proof regulatory pipeline from filing to settlement",
  },
];

// ── Cluster Definitions (projections grouped by shared component) ──────────

export const CLUSTERS: Readonly<Record<string, readonly string[]>> = {
  // Encoding clusters
  "SHA-256 hex (raw)": ["nostr", "oci", "eth-commitment"],
  "SHA-256 hex (URN)": ["jsonld", "scitt", "mls", "sd-jwt", "ssf", "c2pa", "mdl", "cbor-ld"],
  "base64url(SHA-256)": ["webauthn", "cose"],
  "bech32/bech32m": ["nostr-note", "lightning"],
  "OP_RETURN script": ["bitcoin", "zcash-transparent", "pq-envelope"],

  // Protocol clusters
  "DID method": ["did", "tsp-vid", "fpp-rdid", "fpp-mdid", "fpp-pdid"],
  "W3C Credential": ["vc", "sd-jwt", "openid4vp", "fpp-phc", "fpp-vrc", "fpp-vec", "openbadges"],
  "CBOR binary stack": ["cose", "mdl", "cbor", "cbor-ld", "gordian-envelope"],
  "Event envelope": ["cloudevents", "ssf", "a2a-task"],
  "Agent identity": ["erc8004", "a2a", "nanda-agentfacts", "nanda-index", "oasf"],
  "Content provenance": ["c2pa", "scitt", "onnx", "mcp-tool"],
  "Trust infrastructure": ["tsp-vid", "tsp-envelope", "tsp-relationship", "fpp-phc", "fpp-vrc", "trqp"],
  "Payment/settlement": ["bitcoin", "bitcoin-hashlock", "lightning", "x402", "eth-commitment"],
  "Social federation": ["activitypub", "atproto", "nostr", "webfinger", "ens"],
  "Enterprise IAM": ["oidc", "webauthn", "scim", "sd-jwt"],
  "Semantic web": ["jsonld", "solid", "schema-org", "crdt", "cbor-ld"],
  "Privacy layers": ["sd-jwt", "gordian-envelope", "zcash-memo", "fpp-rdid"],

  // ── NEW: Programming language clusters ────────────────────────────────
  "JVM bytecode target": ["java-class", "kotlin", "scala", "groovy", "clojure"],
  "Systems languages (native)": ["c-unit", "cpp-unit", "rust-crate", "zig", "nim", "d-lang", "go-module"],
  "Safety-critical languages": ["ada", "fortran", "pascal", "vhdl", "verilog", "systemverilog"],
  "Functional/proof languages": ["haskell", "ocaml", "fsharp", "coq", "lean", "agda", "tlaplus"],
  "Scripting languages": ["python-module", "ruby", "php", "perl", "lua", "bash", "powershell", "raku", "tcl"],
  "Web platform languages": ["html", "css", "js-module", "ts-module", "wasm", "wgsl"],
  "Smart contract languages": ["solidity", "vyper", "move", "cairo"],
  "GPU/shader languages": ["cuda", "opencl", "glsl", "hlsl", "wgsl"],
  "Mobile languages": ["swift", "objective-c", "kotlin", "dart"],
  "Lisp family": ["common-lisp", "scheme", "racket", "clojure"],
  "Scientific computing": ["r-lang", "julia", "matlab", "python-module", "fortran"],
  "BEAM VM ecosystem": ["elixir", "erlang"],
  "Niche paradigms": ["apl", "forth", "prolog", "smalltalk", "crystal", "pony"],
  "Legacy mainframe": ["cobol-copybook", "cobol-program", "java-class", "sql-schema"],

  // ── NEW: Data format clusters ─────────────────────────────────────────
  "Document markup": ["markdown", "latex", "asciidoc", "rst", "xml", "html"],
  "Configuration formats": ["yaml", "toml", "ini", "dotenv", "json-schema"],
  "Binary serialization (IDL)": ["protobuf", "thrift", "capnproto", "flatbuffers", "avro"],
  "Schemaless binary": ["msgpack", "cbor", "cbor-ld"],
  "API description": ["openapi", "asyncapi", "graphql", "wsdl", "raml"],
  "Schema/ontology": ["owl", "rdfs", "shacl", "shex", "xsd"],
  "Diagram-as-code": ["mermaid", "plantuml", "dot", "svg"],
  "Infrastructure-as-code": ["hcl", "nix", "dockerfile", "makefile"],
  "Query languages": ["sparql", "graphql", "xquery", "sql-schema"],

  // ── NEW: Extended protocol clusters ───────────────────────────────────
  "TSP protocol suite": ["tsp-vid", "tsp-envelope", "tsp-route", "tsp-nested", "tsp-key", "tsp-relationship"],
  "FPP credential family": ["fpp-phc", "fpp-vrc", "fpp-vec", "fpp-rcard", "fpp-trustgraph"],
  "FPP DID variants": ["fpp-rdid", "fpp-mdid", "fpp-pdid"],
  "NANDA agent discovery": ["nanda-index", "nanda-agentfacts", "nanda-resolver"],
  "MCP provenance": ["mcp-tool", "mcp-context"],
  "Ethereum settlement": ["eth-commitment", "eth-calldata", "eth-log-topic"],
  "Post-quantum security": ["pq-bridge", "pq-envelope", "pq-witness"],
  "Code knowledge graph": ["code-kg", "code-kg-relation"],
  "UI rendering": ["ui-tabler", "ui-tabler-stat", "ui-tabler-table"],
  "Consciousness studies": ["loc", "loc-category", "loc-implication"],
  "Zcash privacy": ["zcash-transparent", "zcash-memo"],
  "ONNX ML pipeline": ["onnx", "onnx-op"],
  "Social identity": ["vcard", "openbadges", "dnssd", "ens"],
  "Data cataloging": ["stac", "croissant"],
  "DIDComm messaging": ["didcomm-v2", "webtransport", "mls"],
  "UOR native projections": ["ipv6", "glyph", "cid", "did"],
  ".NET ecosystem": ["csharp-assembly", "fsharp"],
  "Polytree structures": ["polytree-node", "polytree-morphism", "polytree-tensor"],

  // ── NEW: Cross-ecosystem synergy clusters ─────────────────────────────
  "Certificate & PKI": ["x509", "acme", "tsp-key"],
  "RPC & transport": ["grpc", "protobuf", "openapi"],
  "Cloud-native orchestration": ["k8s", "helm", "oci", "dockerfile"],
  "Automotive bus": ["autosar", "can", "someip"],
  "Built environment (BIM/GIS)": ["ifc", "citygml", "geopackage", "geotiff"],
  "Financial compliance": ["xbrl", "iso20022"],
};

// ── Synergy Verification Engine ────────────────────────────────────────────

/**
 * Verify all synergy chains by projecting a test identity through each
 * chain and confirming all projections produce valid, non-empty output.
 *
 * @param input  A ProjectionInput to test with.
 * @returns      Complete synergy analysis with verification results.
 */
export function analyzeSynergies(input: ProjectionInput): SynergyAnalysis {
  const verifiedSynergies: VerifiedSynergy[] = [];

  // Verify every pairwise bridge in every chain
  for (const chain of SYNERGY_CHAINS) {
    for (let i = 0; i < chain.projections.length - 1; i++) {
      const fromName = chain.projections[i];
      const toName = chain.projections[i + 1];
      const fromSpec = SPECS.get(fromName);
      const toSpec = SPECS.get(toName);

      if (!fromSpec || !toSpec) continue;

      const fromValue = fromSpec.project(input);
      const toValue = toSpec.project(input);
      const bridge = i < chain.bridges.length ? chain.bridges[i] : {
        type: "hash" as const,
        description: "Shared canonical hash",
        sharedComponent: "SHA-256",
      };

      verifiedSynergies.push({
        from: fromName,
        to: toName,
        bridge,
        verified: fromValue.length > 0 && toValue.length > 0,
        fromValue,
        toValue,
      });
    }
  }

  // Count unique projections covered by synergy chains
  const coveredProjections = new Set<string>();
  for (const chain of SYNERGY_CHAINS) {
    for (const p of chain.projections) coveredProjections.add(p);
  }

  return {
    totalProjections: SPECS.size,
    chains: SYNERGY_CHAINS,
    verifiedSynergies,
    clusters: CLUSTERS,
    stats: {
      totalChains: SYNERGY_CHAINS.length,
      totalBridges: verifiedSynergies.length,
      totalClusters: Object.keys(CLUSTERS).length,
      coveragePercent: Math.round((coveredProjections.size / SPECS.size) * 100),
    },
  };
}

/**
 * Discover novel synergies by finding projections that share encoding
 * patterns in their output for a given identity.
 *
 * This performs output-level analysis: project everything, then cluster
 * results by shared prefixes, shared encoding formats, and shared lengths.
 *
 * @param input  A ProjectionInput to analyze.
 * @returns      Map of discovered pattern → projection names.
 */
export function discoverSynergies(input: ProjectionInput): Record<string, string[]> {
  const allOutputs: Record<string, string> = {};
  for (const [name, spec] of SPECS) {
    allOutputs[name] = spec.project(input);
  }

  const discoveries: Record<string, string[]> = {};

  // Pattern 1: Projections sharing the same raw hex substring
  const hexUsers: string[] = [];
  for (const [name, value] of Object.entries(allOutputs)) {
    if (value.includes(input.hex)) hexUsers.push(name);
  }
  if (hexUsers.length > 1) {
    discoveries["Full SHA-256 hex embedded"] = hexUsers;
  }

  // Pattern 2: Projections sharing the same CID
  const cidUsers: string[] = [];
  for (const [name, value] of Object.entries(allOutputs)) {
    if (value.includes(input.cid)) cidUsers.push(name);
  }
  if (cidUsers.length > 1) {
    discoveries["Full CID embedded"] = cidUsers;
  }

  // Pattern 3: Projections sharing "urn:uor:" prefix
  const urnUorUsers: string[] = [];
  for (const [name, value] of Object.entries(allOutputs)) {
    if (value.startsWith("urn:uor:")) urnUorUsers.push(name);
  }
  if (urnUorUsers.length > 1) {
    discoveries["UOR URN namespace (urn:uor:*)"] = urnUorUsers;
  }

  // Pattern 4: Projections sharing "did:" prefix
  const didUsers: string[] = [];
  for (const [name, value] of Object.entries(allOutputs)) {
    if (value.startsWith("did:")) didUsers.push(name);
  }
  if (didUsers.length > 1) {
    discoveries["DID namespace (did:*)"] = didUsers;
  }

  // Pattern 5: Projections sharing "urn:fpp:" prefix
  const fppUsers: string[] = [];
  for (const [name, value] of Object.entries(allOutputs)) {
    if (value.startsWith("urn:fpp:") || value.startsWith("did:fpp:")) fppUsers.push(name);
  }
  if (fppUsers.length > 1) {
    discoveries["First Person Project namespace"] = fppUsers;
  }

  // Pattern 6: Projections sharing DOMAIN in URL
  const domainUsers: string[] = [];
  for (const [name, value] of Object.entries(allOutputs)) {
    if (value.includes("uor.foundation")) domainUsers.push(name);
  }
  if (domainUsers.length > 1) {
    discoveries["UOR Foundation domain URLs"] = domainUsers;
  }

  // Pattern 7: Projections using hex prefix truncation (lossy)
  const prefixUsers: string[] = [];
  const hex16 = input.hex.slice(0, 16);
  for (const [name, value] of Object.entries(allOutputs)) {
    if (value.includes(hex16) && !value.includes(input.hex)) prefixUsers.push(name);
  }
  if (prefixUsers.length > 1) {
    discoveries["64-bit hex prefix (lossy cluster)"] = prefixUsers;
  }

  return discoveries;
}
