/**
 * Hologram Coherence Gate
 * ═══════════════════════
 *
 * A single invocation discovers all cross-framework synergies
 * in the hologram projection registry. The gate treats the registry
 * itself as a UOR object — analyzing structural relationships
 * between projections to surface implementation opportunities.
 *
 * Usage:
 *   const report = coherenceGate();
 *   report.synergies     → discovered cross-framework pairs
 *   report.clusters      → projections grouped by shared properties
 *   report.opportunities → actionable implementation paths
 *
 * @module uns/core/hologram/coherence-gate
 */

import { SPECS } from "./specs";
import type { HologramSpec } from "./index";

// ── Types ─────────────────────────────────────────────────────────────────

export type SynergyType =
  | "identity-equivalence"    // Same hash → same object across protocols
  | "settlement-bridge"       // Can anchor on immutable ledgers
  | "discovery-channel"       // Enables cross-protocol discovery
  | "provenance-chain"        // Output of one certifies input of another
  | "complementary-pair"      // Structurally complementary (e.g., what vs how)
  | "trust-amplification";    // Combined verification stronger than either alone

export interface Synergy {
  readonly type: SynergyType;
  readonly projections: readonly [string, string];
  readonly insight: string;
  readonly useCase: string;
  readonly implementation: string;
}

export interface Cluster {
  readonly name: string;
  readonly members: readonly string[];
  readonly property: string;
}

export interface CoherenceReport {
  readonly timestamp: string;
  readonly totalProjections: number;
  readonly losslessCount: number;
  readonly lossyCount: number;
  readonly clusters: readonly Cluster[];
  readonly synergies: readonly Synergy[];
  readonly opportunities: readonly string[];
}

// ── Classification ────────────────────────────────────────────────────────

/** All registered language projection names for O(1) tier lookup. */
const LANGUAGE_PROJECTION_NAMES = new Set([
  // Tier 9 original
  "python-module", "js-module", "java-class", "csharp-assembly", "cpp-unit",
  "c-unit", "go-module", "rust-crate", "ts-module", "sql-schema",
  // 9a Systems
  "zig", "nim", "d-lang", "ada", "fortran", "pascal", "assembly",
  // 9b JVM
  "kotlin", "scala", "groovy", "clojure",
  // 9c Functional
  "haskell", "ocaml", "fsharp", "erlang", "elixir", "common-lisp", "scheme", "racket",
  // 9d Scripting
  "ruby", "php", "perl", "lua", "bash", "powershell", "raku", "tcl",
  // 9e Mobile
  "swift", "objective-c", "dart",
  // 9f Data/Scientific
  "r-lang", "julia", "matlab",
  // 9g Web Platform
  "html", "css", "wasm", "wgsl",
  // 9h Query/Data
  "graphql", "sparql", "xquery",
  // 9i Smart Contract
  "solidity", "vyper", "move", "cairo",
  // 9j Hardware
  "vhdl", "verilog", "systemverilog",
  // 9k Formal Verification
  "coq", "lean", "agda", "tlaplus",
  // 9l IaC/Build
  "hcl", "nix", "dockerfile", "makefile",
  // 9m GPU/Shader
  "cuda", "opencl", "glsl", "hlsl",
  // 9n Niche
  "apl", "forth", "prolog", "smalltalk", "crystal", "pony",
]);

/** All Tier 10 markup/config/serialization projection names. */
const MARKUP_PROJECTION_NAMES = new Set([
  // 10a Document/Markup
  "xml", "markdown", "latex", "asciidoc", "rst",
  // 10b Configuration
  "yaml", "toml", "json-schema", "ini", "dotenv",
  // 10c Serialization/IDL
  "protobuf", "thrift", "capnproto", "flatbuffers", "avro", "msgpack", "cbor",
  // 10d API Description
  "openapi", "asyncapi", "wsdl", "raml",
  // 10e Schema/Ontology
  "xsd", "shacl", "shex", "owl", "rdfs",
  // 10f Diagram/Visual
  "mermaid", "plantuml", "dot", "svg",
]);

/** Tier classification derived from spec URL patterns. */
function classifyTier(name: string, spec: HologramSpec): string {
  // Language projections checked FIRST — they may reference w3.org specs (CSS, WGSL, SPARQL)
  if (LANGUAGE_PROJECTION_NAMES.has(name)) return "language";
  // Markup/config/serialization tier
  if (MARKUP_PROJECTION_NAMES.has(name)) return "markup-config";
  const s = spec.spec;
  if (s.includes("w3.org")) return "semantic-web";
  if (s.includes("rfc-editor") || name === "ipv6" || name === "braille") return "native";
  if (s.includes("schema.org") || s.includes("solidproject") || name === "webfinger") return "social-web";
  if (name.startsWith("gs1") || name === "oci" || name === "doi" || name.startsWith("cobol")) return "industry";
  if (["bitcoin", "lightning", "nostr"].includes(name) || name.startsWith("zcash")) return "settlement";
  if (["erc8004", "x402", "a2a", "a2a-task", "mcp-tool", "mcp-context", "skill-md", "oasf", "onnx", "onnx-op", "nanda-index", "nanda-agentfacts", "nanda-resolver"].includes(name)) return "agentic";
  if (name === "activitypub" || name === "atproto") return "federation";
  if (name.startsWith("tsp-")) return "trust-spanning";
  if (name.startsWith("fpp-") || name === "trqp") return "first-person";
  return "other";
}

/** Hash usage pattern — what part of the identity does the projection consume? */
function hashUsage(name: string, spec: HologramSpec): "hex" | "cid" | "bytes" | "mixed" {
  const src = spec.project.toString();
  if (src.includes("hashBytes")) return "bytes";
  if (src.includes("cid") && src.includes("hex")) return "mixed";
  if (src.includes("cid")) return "cid";
  return "hex";
}

// ── Synergy Discovery Engine ──────────────────────────────────────────────

/** O(1) existence check — replaces ~30 linear scans. */
function buildNameSet(entries: [string, HologramSpec][]): Set<string> {
  return new Set(entries.map(([n]) => n));
}

/** Emit a synergy only if both projections exist in the registry. */
function emitIf(
  has: Set<string>,
  synergies: Synergy[],
  a: string, b: string,
  type: SynergyType,
  insight: string,
  useCase: string,
  implementation: string,
): void {
  if (has.has(a) && has.has(b)) {
    synergies.push({ type, projections: [a, b], insight, useCase, implementation });
  }
}

function discoverSynergies(entries: [string, HologramSpec][]): Synergy[] {
  const synergies: Synergy[] = [];
  const has = buildNameSet(entries);
  const tiers = new Map<string, string[]>();

  // Build tier index
  for (const [name, spec] of entries) {
    const tier = classifyTier(name, spec);
    if (!tiers.has(tier)) tiers.set(tier, []);
    tiers.get(tier)!.push(name);
  }

  // Rule 1: Cross-tier identity equivalence
  const losslessSet = new Set(entries.filter(([, s]) => s.fidelity === "lossless").map(([n]) => n));
  const tierPairs = [...tiers.entries()];
  for (let i = 0; i < tierPairs.length; i++) {
    for (let j = i + 1; j < tierPairs.length; j++) {
      const [tierA, membersA] = tierPairs[i];
      const [tierB, membersB] = tierPairs[j];
      const a = membersA.find(m => losslessSet.has(m));
      const b = membersB.find(m => losslessSet.has(m));
      if (a && b) {
        synergies.push({
          type: "identity-equivalence",
          projections: [a, b],
          insight: `${tierA} ↔ ${tierB}: same 256-bit identity bridges both ecosystems`,
          useCase: `Objects verified in ${tierA} are automatically verified in ${tierB} — zero translation`,
          implementation: `project(identity, "${a}") === project(identity, "${b}").hash — already implemented`,
        });
      }
    }
  }

  // Rule 2: Settlement bridges
  const settlementNames = tiers.get("settlement") || [];
  const anchor = settlementNames[0];
  if (anchor) {
    for (const [name, spec] of entries) {
      if (spec.fidelity === "lossy" || settlementNames.includes(name)) continue;
      synergies.push({
        type: "settlement-bridge",
        projections: [name, anchor],
        insight: `${name} can be immutably anchored via ${anchor}`,
        useCase: `Publish ${name} identifier, anchor hash on ${anchor} — tamper-evident forever`,
        implementation: `Emit both projections: project(id, "${name}") + project(id, "${anchor}")`,
      });
    }
  }

  // Rule 3: Discovery channels
  const discoveryNames = [...(tiers.get("federation") || []), ...(tiers.get("social-web") || [])];
  for (const d of discoveryNames) {
    for (const id of ["did", "erc8004", "cid"]) {
      emitIf(has, synergies, id, d, "discovery-channel",
        `${id} identity discoverable via ${d} social graph`,
        `Search for UOR objects via ${d}, resolve to verified ${id} identity`,
        `Publish ${d} projection with ${id} in metadata`);
    }
  }

  // Rule 4: Provenance chains — declarative pairs
  const chains: [string, string, string][] = [
    ["skill-md", "mcp-tool", "Skill definition → tool execution output"],
    ["mcp-tool", "mcp-context", "Tool output → context entry with provenance tag"],
    ["a2a", "a2a-task", "Agent identity → task execution receipt"],
    ["onnx", "mcp-tool", "Model identity → inference output certification"],
    ["onnx-op", "onnx", "Operator identity → model composition provenance"],
    ["skill-md", "a2a", "Skill descriptor → agent discovery card"],
    ["erc8004", "x402", "Agent identity → payment authorization"],
    ["x402", "oasf", "Payment receipt → service descriptor fulfillment"],
    ["skill-md", "onnx", "What agent CAN do → HOW it does it (model)"],
    ["nanda-index", "nanda-agentfacts", "Index lookup → full AgentFacts passport retrieval"],
    ["nanda-agentfacts", "a2a", "AgentFacts passport → A2A Agent Card (superset)"],
    ["nanda-agentfacts", "skill-md", "AgentFacts capabilities[] → skill.md contracts"],
    ["nanda-index", "nanda-resolver", "Index entry → recursive resolution endpoint"],
    ["nanda-agentfacts", "oasf", "AgentFacts service descriptor → OASF service entry"],
    ["nanda-agentfacts", "mcp-tool", "AgentFacts endpoint → MCP tool registration"],
    ["cobol-copybook", "skill-md", "COBOL data definitions → skill.md interface contract"],
    ["cobol-program", "onnx", "COBOL business rules → ONNX model provenance chain"],
    ["cobol-program", "a2a", "COBOL transaction processor → A2A discoverable agent"],
    ["cobol-copybook", "nanda-agentfacts", "COBOL service → AgentFacts passport for agent discovery"],
    // Language projection provenance chains
    ["python-module", "onnx", "Training script → ONNX model — proves WHICH code produced WHICH weights"],
    ["python-module", "skill-md", "Python function → skill contract — advertises what the code does"],
    ["python-module", "mcp-tool", "Python tool implementation → MCP tool output provenance"],
    ["js-module", "mcp-tool", "JS function → MCP tool output with browser-native provenance"],
    ["js-module", "a2a", "JS agent code → A2A AgentCard — browser agents self-describe"],
    ["ts-module", "js-module", "TypeScript source → compiled JS — type-checked provenance chain"],
    ["ts-module", "skill-md", ".d.ts type declarations ARE skill contracts — same structure"],
    ["ts-module", "mcp-tool", "TS function → MCP tool — the Virtual OS's native tool format"],
    ["ts-module", "a2a", "TS agent → A2A card — browser agents are TypeScript-native"],
    ["java-class", "oasf", "Java microservice → OASF service descriptor — enterprise services become agent-accessible"],
    ["java-class", "cobol-copybook", "COBOL modernization: Java replacement proves behavioral equivalence"],
    ["java-class", "a2a", "Java service → A2A AgentCard — enterprise agent discovery"],
    ["csharp-assembly", "onnx", "Unity ML-Agents → ONNX model — game AI provenance"],
    ["csharp-assembly", "skill-md", ".NET API → skill contract — microservices self-describe"],
    ["csharp-assembly", "oasf", ".NET service → OASF descriptor — enterprise services registered"],
    ["cpp-unit", "onnx", "C++ inference engine → ONNX runtime — execution provenance"],
    ["cpp-unit", "cobol-program", "C++ replacement of COBOL — hash proves behavioral equivalence"],
    ["c-unit", "oci", "C binary → OCI container image — OS to container provenance"],
    ["c-unit", "cobol-program", "C replacement of COBOL — mainframe modernization provenance"],
    ["go-module", "oci", "Go binary → OCI container — cloud-native provenance chain"],
    ["go-module", "a2a", "Go service → A2A AgentCard — Kubernetes services self-describe"],
    ["go-module", "mcp-tool", "Go CLI tool → MCP tool registration — DevOps enters agent ecosystem"],
    ["go-module", "nanda-agentfacts", "Go microservice → NANDA passport — cloud services become agents"],
    ["rust-crate", "oci", "Rust WASM → OCI image — browser-native secure compute"],
    ["rust-crate", "onnx", "Rust inference runtime → ONNX model execution provenance"],
    ["rust-crate", "mcp-tool", "Rust tool → MCP tool — systems-level agent tooling"],
    ["sql-schema", "nanda-agentfacts", "SQL service → AgentFacts — databases become queryable agents"],
    ["sql-schema", "skill-md", "SQL schema → skill contract — database API self-describes"],
    ["python-module", "a2a", "Python AI agent → A2A AgentCard — ML agents become discoverable"],
    // JVM compilation chains
    ["kotlin", "java-class", "Kotlin source → JVM bytecode — cross-JVM provenance"],
    ["scala", "java-class", "Scala source → JVM bytecode — functional→enterprise bridge"],
    ["groovy", "java-class", "Groovy script → JVM bytecode — scripted enterprise provenance"],
    ["clojure", "java-class", "Clojure form → JVM bytecode — Lisp→enterprise bridge"],
    // CLR compilation chain
    ["fsharp", "csharp-assembly", "F# source → CLR IL — functional .NET provenance"],
    // Mobile → agent chains
    ["swift", "a2a", "Swift app → A2A AgentCard — iOS agents self-describe"],
    ["dart", "js-module", "Dart source → JS compilation — Flutter web provenance"],
    ["kotlin", "a2a", "Kotlin Android → A2A AgentCard — mobile agents discoverable"],
    // ML/Scientific → model chains
    ["r-lang", "onnx", "R statistical model → ONNX — reproducible science provenance"],
    ["julia", "onnx", "Julia model → ONNX — high-performance scientific provenance"],
    ["matlab", "onnx", "MATLAB model → ONNX — engineering simulation provenance"],
    ["fortran", "onnx", "Fortran numerical code → ONNX — legacy HPC provenance"],
    // GPU → model chains
    ["cuda", "onnx", "CUDA kernel → ONNX model execution — GPU compute provenance"],
    ["opencl", "onnx", "OpenCL kernel → ONNX model execution — cross-platform GPU"],
    ["wgsl", "wasm", "WebGPU shader → WASM compute — browser GPU provenance"],
    ["glsl", "wgsl", "GLSL shader → WGSL shader — OpenGL→WebGPU migration"],
    // Hardware → firmware chains
    ["vhdl", "c-unit", "VHDL design → C firmware — hardware→software provenance"],
    ["verilog", "c-unit", "Verilog design → C firmware — silicon→code provenance"],
    ["systemverilog", "verilog", "SystemVerilog → Verilog — verification→synthesis chain"],
    // Smart contract → on-chain identity chains
    ["solidity", "erc8004", "Solidity contract → ERC-8004 on-chain identity"],
    ["vyper", "erc8004", "Vyper contract → ERC-8004 on-chain identity"],
    ["move", "erc8004", "Move contract → ERC-8004 on-chain identity"],
    ["cairo", "erc8004", "Cairo program → ERC-8004 on-chain identity (StarkNet)"],
    // Actor/agent model chains
    ["erlang", "a2a", "Erlang actor → A2A AgentCard — OTP actors become agents"],
    ["elixir", "a2a", "Elixir GenServer → A2A AgentCard — BEAM agents discoverable"],
    ["elixir", "erlang", "Elixir source → BEAM bytecode — Elixir→Erlang compilation"],
    // Scripting → tool chains
    ["ruby", "mcp-tool", "Ruby script → MCP tool — scripted automation with provenance"],
    ["php", "mcp-tool", "PHP script → MCP tool — web backend tool provenance"],
    ["perl", "mcp-tool", "Perl script → MCP tool — text processing tool provenance"],
    ["lua", "mcp-tool", "Lua script → MCP tool — embedded scripting tool provenance"],
    ["bash", "mcp-tool", "Bash script → MCP tool — shell automation with provenance"],
    ["powershell", "mcp-tool", "PowerShell → MCP tool — Windows automation provenance"],
    // Formal verification → credential chains
    ["coq", "vc", "Coq proof → VC — mathematical proof becomes verifiable credential"],
    ["lean", "vc", "Lean proof → VC — formal verification becomes VC-certified"],
    ["agda", "vc", "Agda proof → VC — dependent types become verifiable claims"],
    ["tlaplus", "vc", "TLA+ spec → VC — system specification becomes VC-certified"],
    ["ada", "vc", "Ada/SPARK → VC — safety-critical code gets provable credential"],
    // IaC → container chains
    ["hcl", "oci", "Terraform config → OCI container — infrastructure provenance"],
    ["dockerfile", "oci", "Dockerfile → OCI image — build definition→artifact chain"],
    ["nix", "oci", "Nix derivation → OCI image — reproducible build provenance"],
    ["makefile", "c-unit", "Makefile → C compilation — build system→artifact chain"],
    // Cross-era legacy chains
    ["fortran", "cobol-program", "Fortran numerical + COBOL business — legacy HPC bridge"],
    ["ada", "cobol-program", "Ada safety-critical + COBOL business — mission-critical bridge"],
    ["pascal", "cobol-program", "Pascal structured → COBOL — structured programming era bridge"],
    // API/query chains
    ["graphql", "skill-md", "GraphQL schema → skill contract — API self-describes"],
    ["graphql", "oasf", "GraphQL schema → OASF service descriptor — API→agent bridge"],
    ["sparql", "sql-schema", "SPARQL query → SQL schema — semantic↔relational bridge"],
    // WASM compilation targets
    ["rust-crate", "wasm", "Rust crate → WASM module — systems→browser compilation"],
    ["cpp-unit", "wasm", "C++ unit → WASM module — native→browser via Emscripten"],
    // Niche → tool chains
    ["prolog", "onnx", "Prolog logic program → ONNX — symbolic AI provenance"],
    ["apl", "onnx", "APL array computation → ONNX — array programming provenance"],
    ["crystal", "oci", "Crystal binary → OCI container — Ruby-speed→container chain"],
    ["pony", "a2a", "Pony actor → A2A AgentCard — reference-capability agents"],
    // ── Tier 10: Markup/Config/Serialization provenance chains ──
    ["openapi", "oasf", "OpenAPI spec → OASF service descriptor — REST API→agent bridge"],
    ["openapi", "skill-md", "OpenAPI spec → skill contract — API endpoints become capabilities"],
    ["openapi", "mcp-tool", "OpenAPI spec → MCP tool registration — REST→agent tool"],
    ["asyncapi", "a2a", "AsyncAPI spec → A2A AgentCard — event-driven services become agents"],
    ["asyncapi", "oasf", "AsyncAPI spec → OASF service descriptor — async services registered"],
    ["wsdl", "oasf", "WSDL definition → OASF descriptor — SOAP→agent bridge"],
    ["wsdl", "cobol-program", "WSDL → COBOL service — enterprise SOA legacy chain"],
    ["protobuf", "skill-md", "Protobuf schema → skill contract — gRPC services self-describe"],
    ["protobuf", "oasf", "Protobuf schema → OASF descriptor — gRPC→agent bridge"],
    ["protobuf", "mcp-tool", "Protobuf message → MCP tool — typed RPC becomes agent tool"],
    ["thrift", "oasf", "Thrift IDL → OASF descriptor — cross-language RPC→agent bridge"],
    ["thrift", "java-class", "Thrift IDL → Java stub — IDL→implementation provenance"],
    ["capnproto", "rust-crate", "Cap'n Proto schema → Rust code — zero-copy serialization chain"],
    ["flatbuffers", "cpp-unit", "FlatBuffers schema → C++ accessor — game engine serialization chain"],
    ["avro", "sql-schema", "Avro schema → SQL schema — data pipeline schema evolution chain"],
    ["avro", "nanda-agentfacts", "Avro schema → AgentFacts — data services become agents"],
    ["cbor", "cid", "CBOR encoding → CID — IPLD native encoding chain"],
    ["json-schema", "skill-md", "JSON Schema → skill contract — type definitions ARE capabilities"],
    ["json-schema", "openapi", "JSON Schema → OpenAPI spec — schema→API definition chain"],
    ["json-schema", "mcp-tool", "JSON Schema → MCP tool input schema — validation→tool bridge"],
    ["yaml", "hcl", "YAML config → Terraform — Kubernetes→infrastructure chain"],
    ["yaml", "dockerfile", "YAML (docker-compose) → Dockerfile — orchestration→build chain"],
    ["yaml", "openapi", "YAML → OpenAPI spec — YAML IS the serialization format for APIs"],
    ["toml", "rust-crate", "TOML (Cargo.toml) → Rust crate — build config→artifact chain"],
    ["toml", "nix", "TOML config → Nix derivation — config→reproducible build chain"],
    ["xml", "xsd", "XML document → XSD schema — instance→schema provenance"],
    ["xml", "wsdl", "XML → WSDL — data→service definition chain"],
    ["xsd", "json-schema", "XSD → JSON Schema — XML schema→JSON schema migration"],
    ["xsd", "protobuf", "XSD → Protobuf — XML schema→binary schema migration"],
    ["markdown", "skill-md", "Markdown doc → skill contract — documentation IS the contract"],
    ["markdown", "nanda-agentfacts", "Markdown README → AgentFacts — documentation→discovery"],
    ["latex", "vc", "LaTeX paper → VC — academic publication gets verifiable credential"],
    ["latex", "cid", "LaTeX document → CID — academic papers become content-addressed"],
    ["shacl", "vc", "SHACL shape → VC — validation rules become verifiable claims"],
    ["shacl", "did", "SHACL shape → DID — validation constraint gets permanent identity"],
    ["owl", "did", "OWL ontology → DID — knowledge model gets permanent identity"],
    ["owl", "vc", "OWL ontology → VC — ontology integrity becomes verifiable"],
    ["rdfs", "owl", "RDFS vocabulary → OWL ontology — simple→rich schema chain"],
    ["mermaid", "markdown", "Mermaid diagram → Markdown doc — visual→textual documentation"],
    ["mermaid", "svg", "Mermaid diagram → SVG render — source→visual chain"],
    ["plantuml", "svg", "PlantUML diagram → SVG render — UML→visual chain"],
    ["dot", "svg", "Graphviz DOT → SVG render — graph→visual chain"],
    ["svg", "cid", "SVG image → CID — vector graphics become content-addressed"],
    ["raml", "openapi", "RAML spec → OpenAPI spec — API description migration chain"],
    ["msgpack", "cbor", "MessagePack → CBOR — binary serialization format bridge"],
    // ── TSP (Trust Spanning Protocol) provenance chains ──
    ["tsp-vid", "tsp-envelope", "VID identity → authenticated envelope — sender identity proves message origin"],
    ["tsp-envelope", "tsp-nested", "Outer envelope → nested inner — intermediary routing preserves end-to-end trust"],
    ["tsp-vid", "tsp-relationship", "VID identity → bilateral relationship — trust channel from content-addressed handshake"],
    ["tsp-relationship", "tsp-envelope", "Formed relationship → authenticated messaging — relationship gates message exchange"],
    ["tsp-key", "tsp-vid", "Verification key → VID resolution — key fingerprint anchors VID to crypto material"],
    ["tsp-route", "tsp-nested", "Route hop → nested delivery — intermediary routing to final recipient"],
    ["tsp-envelope", "mcp-tool", "TSP envelope → MCP tool output — authenticated delivery of agent tool results"],
    ["tsp-envelope", "a2a-task", "TSP envelope → A2A task — agent tasks ride on authenticated channels"],
    ["tsp-relationship", "nanda-agentfacts", "TSP relationship → AgentFacts — bilateral trust registered in agent passport"],
    ["tsp-vid", "erc8004", "TSP VID → ERC-8004 on-chain identity — trust channel identity anchored on-chain"],
    // ── FPP (First Person Project) provenance chains ──
    ["fpp-phc", "fpp-vrc", "PHC → VRC: personhood credential anchors relationship credential — Sybil-resistant trust edges"],
    ["fpp-vrc", "fpp-trustgraph", "VRC → trust graph: each VRC adds an edge to the decentralized trust graph"],
    ["fpp-phc", "fpp-trustgraph", "PHC → trust graph: personhood credential creates a trust graph node"],
    ["fpp-phc", "fpp-mdid", "PHC issuance → M-DID: joining a VTC requires personhood verification first"],
    ["fpp-mdid", "fpp-vrc", "M-DID → VRC: membership identity enables relationship credential exchange"],
    ["fpp-pdid", "fpp-vec", "P-DID → VEC: persona identity enables contextual endorsement vouching"],
    ["fpp-vec", "fpp-trustgraph", "VEC → trust graph: endorsements strengthen trust graph edges"],
    ["fpp-rdid", "fpp-rcard", "R-DID → r-card: relationship DID context determines r-card exchange scope"],
    ["fpp-rcard", "fpp-vrc", "R-card → VRC: digital business card exchange precedes relationship credentialing"],
    ["fpp-phc", "tsp-vid", "PHC → TSP VID: personhood credential holder becomes TSP-addressable entity"],
    ["fpp-vrc", "tsp-envelope", "VRC → TSP envelope: relationship credentials ride on authenticated channels"],
    ["fpp-vrc", "tsp-relationship", "VRC → TSP relationship: VRC exchange IS a TSP relationship forming handshake"],
    ["fpp-trustgraph", "trqp", "Trust graph → TRQP: trust graph node queryable via Trust Registry Query Protocol"],
    ["fpp-phc", "trqp", "PHC → TRQP: personhood credential status queryable via trust registry"],
    ["fpp-mdid", "tsp-vid", "M-DID → TSP VID: community membership DID resolves to TSP transport endpoint"],
    ["fpp-pdid", "activitypub", "P-DID → ActivityPub: public persona discoverable via federated social web"],
  ];
  for (const [a, b, insight] of chains) {
    emitIf(has, synergies, a, b, "provenance-chain", insight,
      `Chain: ${a} → ${b} creates verifiable provenance link`,
      `Both derive from same hash — link is structural, not asserted`);
  }

  // Rule 5: Complementary pairs
  const pairs: [string, string, string, string][] = [
    ["did", "vc", "Identity + credential: DID says WHO, VC says WHAT they're trusted for", "Issue VCs against DID — both from same UOR hash"],
    ["activitypub", "atproto", "Federation + protocol: discover via ActivityPub, resolve via AT Protocol", "Dual social presence from single identity"],
    ["onnx", "skill-md", "Model + interface: ONNX is the engine, skill.md is the API contract", "Verify both from one hash — model matches its advertised capabilities"],
    ["erc8004", "oasf", "On-chain identity + off-chain descriptor: ERC-8004 proves ownership, OASF describes capability", "Register agent on-chain, publish descriptor off-chain, same hash"],
    ["nanda-index", "did", "Discovery + identity: NANDA finds the agent, DID proves who it is", "NANDA Index resolves to DID — agent discovery with self-sovereign identity"],
    ["nanda-agentfacts", "vc", "Passport + credential: AgentFacts describes capabilities, VC certifies them", "AgentFacts capabilities become verifiable claims via VC projection"],
    ["nanda-resolver", "webfinger", "Agent resolution + web discovery: NANDA resolves agents, WebFinger resolves identities", "Both resolve names to typed links — convergent discovery protocols"],
    ["cobol-copybook", "vc", "Legacy data + credential: copybook defines DATA structure, VC certifies its INTEGRITY", "Hash copybook, issue VC against same identity — compliance becomes structural"],
    ["cobol-program", "did", "Legacy program + identity: COBOL program gets a self-sovereign DID — permanent, portable", "Program hash IS the DID — identity survives platform migrations"],
    // Language projection complementary pairs
    ["python-module", "nanda-agentfacts", "Python agent + discovery passport: AI agents become NANDA-discoverable", "Python agent hash → AgentFacts passport — ML agents enter agent network"],
    ["python-module", "vc", "Code identity + credential: VC certifies the code passed audit/review", "Hash module, issue VC — reproducible research gets cryptographic proof"],
    ["js-module", "cid", "npm package + content address: npm package CID = UOR CID = IPFS CID", "npm supply chain integrity via native content addressing"],
    ["java-class", "vc", "Enterprise JAR + compliance credential: VC certifies the build", "Java artifact hash → VC — enterprise audit trail becomes structural"],
    ["java-class", "erc8004", "Java service + on-chain identity: enterprise meets blockchain", "Java service hash → ERC-8004 token — enterprise identity on-chain"],
    ["csharp-assembly", "did", "Assembly gets permanent DID — survives .NET version migrations", "Assembly hash IS the DID — identity portable across .NET versions"],
    ["csharp-assembly", "x402", ".NET service + payment: content-gated APIs via x402", ".NET service hash → x402 payment requirement — monetized APIs"],
    ["cpp-unit", "vc", "Firmware binary + safety credential: VC certifies build passed tests", "C++ binary hash → VC — safety certification becomes content-addressed"],
    ["c-unit", "did", "Embedded firmware gets self-sovereign DID — IoT devices get identity", "Firmware hash IS the DID — IoT identity survives vendor changes"],
    ["go-module", "did", "Go service + permanent identity: DID survives Kubernetes redeployments", "Go module hash → DID — cloud service identity is content-derived"],
    ["rust-crate", "did", "WASM module gets DID — browser compute units get self-sovereign identity", "Crate hash IS the DID — identity verified before execution"],
    ["rust-crate", "vc", "Crate + credential: VC certifies memory-safety audit", "Rust crate hash → VC — safety guarantees become verifiable claims"],
    ["ts-module", "cid", "TypeScript module = content-addressed npm artifact", "TS module hash → CID — Virtual OS modules are IPFS-native"],
    ["sql-schema", "vc", "Schema identity + compliance: GDPR/SOX audit via VC", "Schema hash → VC — regulatory compliance becomes content-addressed"],
    ["sql-schema", "did", "Database gets a DID — schema identity survives migrations", "Schema hash IS the DID — database identity is permanent"],
    ["sql-schema", "cobol-copybook", "SQL schema + COBOL copybook: both describe DATA, different eras", "Same data structure, two projections — legacy↔modern bridge"],
    // Extended language complementary pairs
    ["solidity", "did", "Smart contract + identity: Solidity contract gets self-sovereign DID", "Contract hash IS the DID — immutable identity on any chain"],
    ["swift", "did", "iOS app + identity: Swift module gets permanent DID", "App hash IS the DID — identity survives App Store updates"],
    ["dart", "did", "Flutter app + identity: Dart module gets permanent DID", "Cross-platform app identity via content hash"],
    ["wasm", "did", "WASM module + identity: browser compute unit gets DID", "WASM hash IS the DID — verified before execution"],
    ["haskell", "vc", "Pure function + credential: referential transparency is VC-certifiable", "Haskell module hash → VC — purity becomes verifiable claim"],
    ["r-lang", "vc", "Statistical analysis + credential: R script gets VC certification", "R analysis hash → VC — reproducible research is structural"],
    ["julia", "vc", "Scientific computation + credential: Julia gets VC certification", "Julia computation hash → VC — scientific integrity verified"],
    ["vhdl", "vc", "Hardware design + safety credential: VHDL gets VC certification", "VHDL design hash → VC — chip safety becomes verifiable"],
    ["ada", "did", "Safety-critical code + identity: Ada gets permanent DID", "Ada module hash IS the DID — avionics identity is permanent"],
    ["fortran", "did", "HPC code + identity: Fortran gets permanent DID", "Fortran module hash IS the DID — scientific code identity persists"],
    ["assembly", "did", "Machine code + identity: Assembly gets permanent DID", "Assembly hash IS the DID — lowest-level code has identity"],
    ["graphql", "oasf", "API schema + service: GraphQL IS the service descriptor", "GraphQL schema hash → OASF — API description is content-addressed"],
    ["kotlin", "did", "Kotlin app + identity: Android/JVM code gets permanent DID", "Kotlin hash IS the DID — app identity survives platform changes"],
    ["zig", "oci", "Zig binary + container: zero-overhead systems in OCI images", "Zig hash → OCI — systems programming meets cloud-native"],
    ["nim", "oci", "Nim binary + container: meta-programming in OCI images", "Nim hash → OCI — efficient systems in containers"],
    ["cuda", "vc", "GPU kernel + credential: CUDA code gets safety VC", "CUDA kernel hash → VC — GPU computation integrity verified"],
    ["dockerfile", "did", "Container definition + identity: Dockerfile gets DID", "Dockerfile hash IS the DID — build recipe has permanent identity"],
    ["nix", "did", "Reproducible build + identity: Nix derivation gets DID", "Nix hash IS the DID — reproducibility is structural identity"],
    ["coq", "did", "Mathematical proof + identity: Coq proof gets permanent DID", "Coq proof hash IS the DID — theorems have identity"],
    ["lean", "did", "Formal proof + identity: Lean proof gets permanent DID", "Lean proof hash IS the DID — mathematics gets content-addressed"],
    // ── Tier 10: Markup/Config/Serialization complementary pairs ──
    ["openapi", "did", "API spec + identity: OpenAPI spec gets permanent DID", "API spec hash IS the DID — API identity survives version changes"],
    ["openapi", "vc", "API spec + credential: OpenAPI spec gets VC certification", "API spec hash → VC — API compliance becomes verifiable"],
    ["protobuf", "did", "Schema + identity: Protobuf schema gets permanent DID", "Protobuf hash IS the DID — message format has permanent identity"],
    ["protobuf", "vc", "Schema + credential: Protobuf gets backward-compat VC", "Protobuf hash → VC — schema compatibility is certifiable"],
    ["json-schema", "did", "Type system + identity: JSON Schema gets permanent DID", "Schema hash IS the DID — type definitions have identity"],
    ["json-schema", "vc", "Type system + credential: JSON Schema gets validation VC", "Schema hash → VC — data shape compliance is certifiable"],
    ["yaml", "did", "Config + identity: YAML config file gets permanent DID", "Config hash IS the DID — configuration has content-derived identity"],
    ["toml", "did", "Config + identity: TOML config gets permanent DID", "Config hash IS the DID — build configuration has identity"],
    ["xml", "did", "Document + identity: XML document gets permanent DID", "XML hash IS the DID — structured document has identity"],
    ["markdown", "did", "Documentation + identity: Markdown gets permanent DID", "Markdown hash IS the DID — documentation has content identity"],
    ["markdown", "cid", "Documentation + IPFS: Markdown → content-addressed doc", "Markdown hash → CID — docs are IPFS-native"],
    ["latex", "did", "Paper + identity: LaTeX document gets permanent DID", "LaTeX hash IS the DID — academic papers have permanent identity"],
    ["shacl", "json-schema", "RDF validation + JSON validation: complementary constraint systems", "Same data shape, two validation ecosystems — SHACL↔JSON Schema bridge"],
    ["owl", "shacl", "Ontology + validation: OWL defines semantics, SHACL enforces shape", "OWL says WHAT exists, SHACL says WHAT'S VALID — complementary"],
    ["svg", "did", "Vector graphic + identity: SVG gets permanent DID", "SVG hash IS the DID — visual assets have permanent identity"],
    ["cbor", "did", "Binary encoding + identity: CBOR document gets DID", "CBOR hash IS the DID — IoT payloads have identity"],
    ["avro", "did", "Data schema + identity: Avro schema gets permanent DID", "Avro hash IS the DID — data pipeline schemas have identity"],
    ["mermaid", "did", "Diagram + identity: Mermaid diagram gets permanent DID", "Diagram hash IS the DID — architecture docs have identity"],
    ["wsdl", "did", "Service definition + identity: WSDL gets permanent DID", "WSDL hash IS the DID — SOAP services have permanent identity"],
    ["asyncapi", "did", "Event spec + identity: AsyncAPI gets permanent DID", "AsyncAPI hash IS the DID — event-driven APIs have identity"],
    // ── TSP complementary pairs ──
    ["tsp-vid", "did", "TSP VID + DID: TSP proves TRUST, DID proves IDENTITY — same URI, dual semantics", "tsp-vid IS did:uor — trust and identity are the same projection"],
    ["tsp-envelope", "vc", "TSP envelope + VC: envelope authenticates DELIVERY, VC authenticates CLAIMS", "Wrap VC in TSP envelope — trusted delivery of verified claims"],
    ["tsp-relationship", "vc", "TSP relationship + VC: relationship proves BILATERAL trust, VC proves UNILATERAL claims", "Issue VCs within formed TSP relationships — trust channel gates credential exchange"],
    ["tsp-key", "did", "TSP key + DID: key proves CRYPTO capability, DID proves IDENTITY", "DID document references TSP verification key — identity resolves to crypto material"],
    ["tsp-route", "ipv6", "TSP route + IPv6: TSP routes messages, IPv6 routes packets — convergent routing", "TSP intermediary VID maps to IPv6 ULA — message routing meets network routing"],
    ["tsp-envelope", "bitcoin", "TSP envelope + Bitcoin: envelope authenticates message, Bitcoin timestamps it", "Hash TSP envelope, anchor on Bitcoin — authenticated messages become immutable"],
    ["tsp-nested", "mls", "TSP nested + MLS: nested envelope for 1:1, MLS for group — complementary scopes", "TSP handles bilateral, MLS handles multilateral — same identity, different scale"],
    ["tsp-vid", "a2a", "TSP VID + A2A: TSP provides trust channel, A2A provides agent protocol", "A2A messages ride on TSP envelopes — agent communication gets trust substrate"],
    ["tsp-vid", "nanda-index", "TSP VID + NANDA: TSP VID is discoverable via NANDA agent index", "NANDA finds the agent, TSP authenticates the channel — discovery meets trust"],
    // ── FPP (First Person Project) complementary pairs ──
    ["fpp-phc", "vc", "PHC + VC: PHC proves PERSONHOOD, VC proves CLAIMS — same object, dual semantics", "PHC IS a VC — personhood is a verifiable credential about uniqueness"],
    ["fpp-phc", "did", "PHC + DID: PHC proves UNIQUE PERSON, DID proves IDENTITY — PHC anchors DID to real human", "PHC-anchored DID prevents Sybil attacks — identity requires personhood proof"],
    ["fpp-vrc", "tsp-relationship", "VRC + TSP relationship: VRC attests TRUST, TSP relationship provides CHANNEL — structurally identical", "VRC exchange IS TSP handshake — trust assertion and trust channel are the same act"],
    ["fpp-vrc", "vc", "VRC + VC: VRC proves RELATIONSHIP, VC proves CLAIMS — peer-to-peer trust is credential-native", "VRC IS a VC — relationships are verifiable claims about bilateral trust"],
    ["fpp-rdid", "tsp-vid", "R-DID + TSP VID: R-DID scopes PRIVACY, TSP VID enables TRANSPORT — private channel identity", "R-DID becomes TSP VID for private channel — pairwise privacy meets authenticated messaging"],
    ["fpp-mdid", "did", "M-DID + DID: M-DID scopes COMMUNITY, DID proves IDENTITY — community membership is self-sovereign", "M-DID IS a did:fpp — community identity without centralized directory"],
    ["fpp-pdid", "activitypub", "P-DID + ActivityPub: P-DID proves PERSONA, ActivityPub enables DISCOVERY — federated identity", "P-DID resolves via FedID/ActivityPub — public personas discoverable without centralized platform"],
    ["fpp-pdid", "webfinger", "P-DID + WebFinger: P-DID is the identity, WebFinger is the resolution — standards convergence", "P-DID resolves via WebFinger acct: URI — persona discovery uses existing web infrastructure"],
    ["fpp-vec", "vc", "VEC + VC: VEC proves ENDORSEMENT, VC proves CLAIMS — social vouching is credential-native", "VEC IS a VC — contextual reputation becomes verifiable claims"],
    ["fpp-rcard", "cid", "R-card + CID: r-card is the CONTENT, CID is the ADDRESS — digital business cards on IPFS", "R-card content-addressed via CID — business cards survive platform migration"],
    ["fpp-trustgraph", "trqp", "Trust graph + TRQP: trust graph stores RELATIONSHIPS, TRQP enables QUERIES — infrastructure pair", "Trust graph nodes queryable via TRQP — decentralized trust registry resolution"],
    ["fpp-trustgraph", "did", "Trust graph + DID: trust graph maps CONNECTIONS, DID identifies NODES — graph + identity", "Every trust graph node IS a DID — the graph is self-sovereign"],
    ["trqp", "did", "TRQP + DID: TRQP resolves ROLES, DID resolves IDENTITY — complementary resolution", "TRQP queries trust status of DID holders — registry meets identity"],
  ];
  for (const [a, b, insight, impl] of pairs) {
    emitIf(has, synergies, a, b, "complementary-pair", insight,
      `Combined: ${a} + ${b} is more powerful than either alone`, impl);
  }

  // Rule 6: Trust amplification
  const trustSources = ["bitcoin", "zcash-transparent", "cid", "did", "tsp-relationship", "fpp-phc", "fpp-trustgraph"];
  for (let i = 0; i < trustSources.length; i++) {
    for (let j = i + 1; j < trustSources.length; j++) {
      const [a, b] = [trustSources[i], trustSources[j]];
      emitIf(has, synergies, a, b, "trust-amplification",
        `${a} + ${b}: independent verification of same hash amplifies trust`,
        `Verify via ${a}, cross-check via ${b} — two independent trust anchors`,
        `Both projections emit same hash — comparison is trivial`);
    }
  }

  return synergies;
}

// ── Cluster Discovery ─────────────────────────────────────────────────────

function discoverClusters(entries: [string, HologramSpec][]): Cluster[] {
  const clusters: Cluster[] = [];

  // By tier
  const tiers = new Map<string, string[]>();
  for (const [name, spec] of entries) {
    const tier = classifyTier(name, spec);
    if (!tiers.has(tier)) tiers.set(tier, []);
    tiers.get(tier)!.push(name);
  }
  for (const [tier, members] of tiers) {
    if (members.length > 1) {
      clusters.push({ name: tier, members, property: "shared architectural tier" });
    }
  }

  // By fidelity
  const lossless = entries.filter(([, s]) => s.fidelity === "lossless").map(([n]) => n);
  const lossy = entries.filter(([, s]) => s.fidelity === "lossy").map(([n]) => n);
  clusters.push({ name: "lossless", members: lossless, property: "full 256-bit identity preservation" });
  if (lossy.length) {
    clusters.push({ name: "lossy", members: lossy, property: "truncated projection (routing/display only)" });
  }

  // By hash usage
  const usages = new Map<string, string[]>();
  for (const [name, spec] of entries) {
    const usage = hashUsage(name, spec);
    if (!usages.has(usage)) usages.set(usage, []);
    usages.get(usage)!.push(name);
  }
  for (const [usage, members] of usages) {
    if (members.length > 1) {
      clusters.push({ name: `hash-${usage}`, members, property: `consumes ${usage} from identity` });
    }
  }

  return clusters;
}

// ── Opportunity Synthesis ─────────────────────────────────────────────────

function synthesizeOpportunities(synergies: readonly Synergy[]): string[] {
  const opportunities: string[] = [];
  const types = new Set(synergies.map(s => s.type));

  if (types.has("provenance-chain")) {
    opportunities.push(
      "PIPELINE: Chain all provenance pairs into an end-to-end agent lifecycle — " +
      "skill.md → ONNX model → ERC-8004 identity → A2A discovery → MCP execution → x402 payment → Bitcoin settlement"
    );
  }

  if (types.has("complementary-pair")) {
    opportunities.push(
      "UNIFIED AGENT CARD: Merge complementary pairs into a single composite descriptor — " +
      "one JSON-LD object that projects simultaneously into DID, VC, ONNX, skill.md, and OASF"
    );
  }

  if (types.has("trust-amplification")) {
    opportunities.push(
      "MULTI-LEDGER ANCHOR: Publish every high-value identity to Bitcoin + Zcash + IPFS + TSP simultaneously — " +
      "four independent trust anchors from one hash, verifiable by any"
    );
  }

  // TSP-specific opportunity
  const tspSynergies = synergies.filter(s =>
    s.projections.some(p => p.startsWith("tsp-"))
  );
  if (tspSynergies.length > 0) {
    opportunities.push(
      "TRUST SPANNING LAYER: TSP provides the authenticated messaging substrate beneath all agent protocols — " +
      "A2A tasks ride on TSP envelopes, MCP tool outputs are TSP-authenticated, NANDA discovery resolves to " +
      "TSP VIDs, and bilateral relationships (RFI/RFA) create content-addressed trust channels. " +
      "The TSP VID IS the did:uor projection — trust and identity are structurally identical."
    );
  }

  // FPP-specific opportunity
  const fppSynergies = synergies.filter(s =>
    s.projections.some(p => p.startsWith("fpp-") || p === "trqp")
  );
  if (fppSynergies.length > 0) {
    opportunities.push(
      "FIRST PERSON TRUST LAYER: The First Person Project builds the Internet's missing trust layer — " +
      "Personhood Credentials (PHCs) anchor real humans to the trust graph, Verifiable Relationship " +
      "Credentials (VRCs) create Sybil-resistant trust edges over TSP private channels, Persona DIDs " +
      "(R-DID/M-DID/P-DID) enable privacy-preserving identity management, and the Trust Registry " +
      "Query Protocol (TRQP) enables decentralized trust verification. The entire decentralized trust " +
      "graph IS a hologram — each person, credential, and relationship is one canonical hash projected " +
      "through every standard simultaneously."
    );
  }

  if (types.has("discovery-channel")) {
    opportunities.push(
      "SOCIAL DISCOVERY MESH: Every UOR object automatically discoverable via ActivityPub, AT Protocol, " +
      "and WebFinger — the social web becomes a resolution layer for content-addressed objects"
    );
  }

  if (types.has("settlement-bridge")) {
    opportunities.push(
      "UNIVERSAL NOTARIZATION: Any projection (DID, VC, ONNX model, skill.md, AgentCard) can be " +
      "notarized on Bitcoin with zero additional code — the settlement bridge is structural"
    );
  }

  // Language-specific pipeline opportunities
  const languageSynergies = synergies.filter(s =>
    [...LANGUAGE_PROJECTION_NAMES].some(lang => s.projections.includes(lang))
  );
  if (languageSynergies.length > 0) {
    opportunities.push(
      "POLYGLOT SUPPLY CHAIN: Every language artifact across 75 projections (Python→ONNX→MCP, " +
      "Go→OCI→NANDA, Rust→WASM→DID, TS→skill.md→A2A, SQL→VC→compliance, Kotlin→Java→OASF, " +
      "Solidity→ERC-8004, CUDA→ONNX, Coq→VC, Dockerfile→OCI) is content-addressed from " +
      "source to deployment — one hash bridges every language into a unified trust layer"
    );

    // Smart contract opportunity
    const contractChains = synergies.filter(s =>
      ["solidity", "vyper", "move", "cairo"].some(c => s.projections.includes(c))
    );
    if (contractChains.length > 0) {
      opportunities.push(
        "SMART CONTRACT INTEGRITY: Every smart contract (Solidity, Vyper, Move, Cairo) gets " +
        "a content-addressed identity that bridges source code → bytecode → on-chain ERC-8004 " +
        "registration — the audit trail is mathematical, not institutional"
      );
    }

    // Formal verification opportunity
    const formalChains = synergies.filter(s =>
      ["coq", "lean", "agda", "tlaplus", "ada"].some(f => s.projections.includes(f))
    );
    if (formalChains.length > 0) {
      opportunities.push(
        "PROOF-CERTIFIED SOFTWARE: Formal proofs (Coq, Lean, Agda, TLA+, Ada/SPARK) become " +
        "Verifiable Credentials — mathematical certainty is projectable into the trust layer"
      );
    }

    // Hardware → software provenance
    const hwChains = synergies.filter(s =>
      ["vhdl", "verilog", "systemverilog"].some(h => s.projections.includes(h))
    );
    if (hwChains.length > 0) {
      opportunities.push(
        "SILICON-TO-CLOUD PROVENANCE: Hardware description (VHDL/Verilog) → firmware (C) → " +
        "container (OCI) → agent (A2A) — the entire stack from transistor to agent is " +
        "content-addressed with a single identity"
      );
    }

    // Markup/Config/Serialization opportunity
    const markupSynergies = synergies.filter(s =>
      [...MARKUP_PROJECTION_NAMES].some(m => s.projections.includes(m))
    );
    if (markupSynergies.length > 0) {
      opportunities.push(
        "UNIVERSAL SCHEMA BRIDGE: Every configuration format (YAML, TOML, JSON Schema, Protobuf, " +
        "Avro, Thrift, Cap'n Proto, FlatBuffers), every API description (OpenAPI, AsyncAPI, WSDL, RAML), " +
        "every ontology (OWL, SHACL, ShEx, RDFS, XSD), and every documentation format (Markdown, LaTeX, " +
        "AsciiDoc, Mermaid, PlantUML, SVG) is content-addressed — schemas ARE identity, " +
        "documentation IS provenance, configuration IS trust"
      );
    }
  }

  return opportunities;
}

// ── The Gate ──────────────────────────────────────────────────────────────

/**
 * Coherence Gate — invoke once, discover everything.
 *
 * Analyzes the entire hologram projection registry for cross-framework
 * synergies, structural clusters, and implementation opportunities.
 * Pure function — no side effects, no network calls, no state.
 */
export function coherenceGate(): CoherenceReport {
  const entries = [...SPECS.entries()];
  const losslessCount = entries.filter(([, s]) => s.fidelity === "lossless").length;

  const clusters = discoverClusters(entries);
  const synergies = discoverSynergies(entries);
  const opportunities = synthesizeOpportunities(synergies);

  return {
    timestamp: new Date().toISOString(),
    totalProjections: entries.length,
    losslessCount,
    lossyCount: entries.length - losslessCount,
    clusters,
    synergies,
    opportunities,
  };
}

// ── What-If Simulator ─────────────────────────────────────────────────────

export interface WhatIfResult {
  readonly name: string;
  readonly newSynergies: readonly Synergy[];
  readonly totalSynergiesBefore: number;
  readonly totalSynergiesAfter: number;
  readonly delta: number;
}

/**
 * What-If Simulator — preview synergies before adding a projection.
 *
 * Pass a candidate projection spec. The simulator runs the coherence
 * gate with and without it, then returns only the NEW synergies.
 */
export function whatIf(
  name: string,
  spec: HologramSpec,
): WhatIfResult {
  const before = discoverSynergies([...SPECS.entries()]);
  const after = discoverSynergies([...SPECS.entries(), [name, spec]]);

  // New synergies = those involving the new projection
  const newSynergies = after.filter(
    s => s.projections.includes(name),
  );

  return {
    name,
    newSynergies,
    totalSynergiesBefore: before.length,
    totalSynergiesAfter: after.length,
    delta: after.length - before.length,
  };
}
