/**
 * Ecosystem Taxonomy — Projection-to-Ecosystem Assignment
 * ════════════════════════════════════════════════════════
 *
 * Maps every hologram projection to its ecosystem for visual grouping
 * on the Interoperability Map. Derived from the Tier structure in specs.ts.
 */

export interface Ecosystem {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly color: string;         // HSL design-system color
  readonly projections: readonly string[];
}

export const ECOSYSTEMS: readonly Ecosystem[] = [
  {
    id: "foundational",
    label: "Foundational Standards",
    description: "W3C semantic web bedrock: CID, JSON-LD, DID, VC",
    color: "hsl(220, 60%, 55%)",
    projections: ["cid", "jsonld", "did", "vc"],
  },
  {
    id: "uor-native",
    label: "UOR Native",
    description: "Hash-derived identity: IPv6, Braille glyph",
    color: "hsl(152, 44%, 50%)",
    projections: ["ipv6", "glyph"],
  },
  {
    id: "federation",
    label: "Federation & Discovery",
    description: "WebFinger, ActivityPub, AT Protocol, Solid, OIDC",
    color: "hsl(200, 50%, 50%)",
    projections: ["webfinger", "activitypub", "atproto", "solid", "oidc", "schema-org", "openbadges"],
  },
  {
    id: "enterprise",
    label: "Enterprise & Industry",
    description: "SCITT, GS1, OCI, MLS, CBOR, CRDT",
    color: "hsl(35, 80%, 55%)",
    projections: ["scitt", "gs1", "oci", "mls", "cbor", "crdt"],
  },
  {
    id: "infrastructure",
    label: "Infrastructure & Emerging",
    description: "TSP, FPP, TRQP trust stack",
    color: "hsl(280, 55%, 55%)",
    projections: [
      "tsp-vid", "tsp-envelope", "tsp-relationship",
      "fpp-rdid", "fpp-mdid", "fpp-pdid", "fpp-phc", "fpp-vrc", "fpp-vec",
      "trqp",
    ],
  },
  {
    id: "bitcoin",
    label: "Bitcoin Protocol",
    description: "SHA-256 native: OP_RETURN, hashlock, Lightning, PQ",
    color: "hsl(28, 85%, 55%)",
    projections: [
      "bitcoin", "bitcoin-hashlock", "lightning",
      "pq-bridge", "pq-envelope", "eth-commitment",
    ],
  },
  {
    id: "zcash",
    label: "Zcash Privacy",
    description: "Transparent, shielded memo, zk-snarks",
    color: "hsl(45, 60%, 50%)",
    projections: ["zcash-transparent", "zcash-memo", "zcash-zsa", "zcash-frost"],
  },
  {
    id: "social",
    label: "Social Protocols",
    description: "Nostr, ENS, social federation",
    color: "hsl(340, 55%, 55%)",
    projections: ["nostr", "nostr-note", "nostr-profile", "nostr-zap", "ens"],
  },
  {
    id: "agentic",
    label: "Agentic AI",
    description: "MCP, A2A, ERC-8004, x402, ONNX, OASF, NANDA, skill.md",
    color: "hsl(260, 55%, 55%)",
    projections: [
      "erc8004", "x402", "mcp-tool", "mcp-context",
      "a2a", "a2a-task", "oasf", "onnx", "onnx-op",
      "skill-md", "nanda-index", "nanda-agentfacts", "nanda-resolver",
    ],
  },
  {
    id: "legacy",
    label: "Legacy Infrastructure",
    description: "COBOL copybook/program mainframe bridge",
    color: "hsl(210, 30%, 50%)",
    projections: ["cobol-copybook", "cobol-program"],
  },
  {
    id: "languages-core",
    label: "Programming Languages",
    description: "Python, JS, TS, Rust, Go, Java, C#, C++, C, SQL — core language projections",
    color: "hsl(170, 50%, 45%)",
    projections: [
      "python-module", "js-module", "ts-module",
      "rust-crate", "go-module", "java-class",
      "csharp-assembly", "cpp-unit", "c-unit",
      "sql-schema",
    ],
  },
  {
    id: "languages-jvm",
    label: "JVM Languages",
    description: "Kotlin, Scala, Groovy, Clojure — JVM bytecode targets",
    color: "hsl(175, 45%, 42%)",
    projections: ["kotlin", "scala", "groovy", "clojure"],
  },
  {
    id: "languages-functional",
    label: "Functional & Proof Languages",
    description: "Haskell, OCaml, F#, Erlang, Elixir, Lisp, Scheme, Racket, Coq, Lean, Agda, TLA+",
    color: "hsl(180, 42%, 40%)",
    projections: [
      "haskell", "ocaml", "fsharp", "erlang", "elixir",
      "common-lisp", "scheme", "racket",
      "coq", "lean", "agda", "tlaplus",
    ],
  },
  {
    id: "languages-scripting",
    label: "Scripting Languages",
    description: "Ruby, PHP, Perl, Lua, Bash, PowerShell, Raku, Tcl",
    color: "hsl(165, 40%, 44%)",
    projections: ["ruby", "php", "perl", "lua", "bash", "powershell", "raku", "tcl"],
  },
  {
    id: "languages-mobile",
    label: "Mobile Languages",
    description: "Swift, Objective-C, Kotlin, Dart — iOS/Android/Flutter",
    color: "hsl(160, 45%, 46%)",
    projections: ["swift", "objective-c", "dart"],
  },
  {
    id: "languages-scientific",
    label: "Scientific Computing",
    description: "R, Julia, MATLAB — data science & numerical analysis",
    color: "hsl(155, 40%, 48%)",
    projections: ["r-lang", "julia", "matlab"],
  },
  {
    id: "languages-systems",
    label: "Systems & Low-Level",
    description: "Zig, Nim, D, Ada, Fortran, Pascal, Assembly — native compilation",
    color: "hsl(185, 38%, 42%)",
    projections: ["zig", "nim", "d-lang", "ada", "fortran", "pascal", "assembly"],
  },
  {
    id: "languages-web",
    label: "Web Platform",
    description: "HTML, CSS, WASM, WGSL — browser-native languages",
    color: "hsl(190, 42%, 45%)",
    projections: ["html", "css", "wasm", "wgsl"],
  },
  {
    id: "languages-contracts",
    label: "Smart Contract Languages",
    description: "Solidity, Vyper, Move, Cairo — blockchain VM targets",
    color: "hsl(30, 70%, 50%)",
    projections: ["solidity", "vyper", "move", "cairo"],
  },
  {
    id: "languages-gpu",
    label: "GPU & Shader Languages",
    description: "CUDA, OpenCL, GLSL, HLSL — parallel compute",
    color: "hsl(195, 40%, 43%)",
    projections: ["cuda", "opencl", "glsl", "hlsl"],
  },
  {
    id: "languages-hdl",
    label: "Hardware Description",
    description: "VHDL, Verilog, SystemVerilog — RTL & synthesis",
    color: "hsl(0, 50%, 55%)",
    projections: ["vhdl", "verilog", "systemverilog"],
  },
  {
    id: "languages-niche",
    label: "Niche & Specialized",
    description: "APL, Forth, Prolog, Smalltalk, Crystal, Pony — unique paradigms",
    color: "hsl(205, 35%, 48%)",
    projections: ["apl", "forth", "prolog", "smalltalk", "crystal", "pony"],
  },
  {
    id: "languages-query",
    label: "Query & Data Languages",
    description: "GraphQL, SPARQL, XQuery — structured query projections",
    color: "hsl(200, 40%, 46%)",
    projections: ["graphql", "sparql", "xquery"],
  },
  {
    id: "languages-iac",
    label: "Infrastructure as Code",
    description: "HCL, Nix, Dockerfile, Makefile — build & deploy",
    color: "hsl(215, 38%, 44%)",
    projections: ["hcl", "nix", "dockerfile", "makefile"],
  },
  {
    id: "data-formats",
    label: "Data Formats",
    description: "Protobuf, Avro, Thrift, Cap'n Proto, FlatBuffers, MessagePack, CBOR, JSON Schema",
    color: "hsl(190, 45%, 48%)",
    projections: [
      "protobuf", "avro", "thrift", "capnproto", "flatbuffers",
      "msgpack", "cbor", "json-schema",
    ],
  },
  {
    id: "markup",
    label: "Markup & Documents",
    description: "XML, Markdown, LaTeX, AsciiDoc, RST, YAML, TOML, INI, dotenv",
    color: "hsl(210, 40%, 50%)",
    projections: [
      "xml", "markdown", "latex", "asciidoc", "rst",
      "yaml", "toml", "ini", "dotenv",
    ],
  },
  {
    id: "api-specs",
    label: "API Description",
    description: "OpenAPI, AsyncAPI, WSDL, RAML — API interface definitions",
    color: "hsl(225, 42%, 52%)",
    projections: ["openapi", "asyncapi", "wsdl", "raml"],
  },
  {
    id: "diagrams",
    label: "Diagram as Code",
    description: "Mermaid, PlantUML, DOT, SVG — visual representations",
    color: "hsl(240, 35%, 54%)",
    projections: ["mermaid", "plantuml", "dot", "svg"],
  },
  {
    id: "ontology",
    label: "Schema & Ontology",
    description: "OWL, RDFS, SHACL, ShEx, XSD — semantic type systems",
    color: "hsl(250, 40%, 52%)",
    projections: ["owl", "rdfs", "shacl", "shex", "xsd"],
  },
  {
    id: "tier16",
    label: "2024–2025 Standards",
    description: "WebAuthn, SD-JWT, C2PA, OpenTelemetry, CloudEvents, COSE, mDL, DIDComm, SCIM, WebTransport, Gordian, CBOR-LD, SSF, OpenID4VP",
    color: "hsl(15, 70%, 55%)",
    projections: [
      "webauthn", "sd-jwt", "openid4vp", "token-status-list",
      "c2pa", "opentelemetry", "cloudevents", "ssf",
      "cose", "mdl", "didcomm-v2", "scim",
      "webtransport", "gordian-envelope", "cbor-ld",
    ],
  },
];

/** Quick lookup: projection name → ecosystem id */
export const PROJECTION_ECOSYSTEM: ReadonlyMap<string, string> = (() => {
  const m = new Map<string, string>();
  for (const eco of ECOSYSTEMS) {
    for (const p of eco.projections) m.set(p, eco.id);
  }
  return m;
})();
