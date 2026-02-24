/**
 * Opportunity 6: POLYGLOT SUPPLY CHAIN
 * ═════════════════════════════════════
 *
 * Every language artifact across 75+ projections is content-addressed
 * from source to deployment — one hash bridges every language into
 * a unified trust layer.
 *
 * @module uns/core/hologram/opportunities/polyglot-supply-chain
 */

import { project, PROJECTIONS } from "../index";
import type { ProjectionInput, HologramProjection } from "../index";

/** A language artifact in the supply chain. */
export interface LanguageArtifact {
  readonly language: string;
  readonly projection: string;
  readonly uri: string;
  readonly category: string;
  /** The downstream projections this artifact chains into. */
  readonly chains: readonly LanguageChainLink[];
}

/** A chain link from one artifact to a downstream protocol. */
interface LanguageChainLink {
  readonly target: string;
  readonly targetUri: string;
  readonly relationship: string;
}

/** The complete polyglot supply chain for one identity. */
export interface PolyglotSupplyChain {
  readonly "@type": "opportunity:PolyglotSupplyChain";
  readonly threadHash: string;
  readonly artifacts: readonly LanguageArtifact[];
  readonly languageCount: number;
  readonly categories: readonly string[];
  /** Total chain links across all artifacts. */
  readonly totalChainLinks: number;
  /** Whether the chain covers all major language families. */
  readonly fullSpectrum: boolean;
}

/** Language → category mapping. */
const LANGUAGE_CATEGORIES: Record<string, string> = {
  "python-module": "ML/Scientific", "r-lang": "ML/Scientific", "julia": "ML/Scientific", "matlab": "ML/Scientific",
  "js-module": "Web Platform", "ts-module": "Web Platform", "html": "Web Platform", "css": "Web Platform", "wasm": "Web Platform", "wgsl": "Web Platform",
  "java-class": "Enterprise/JVM", "kotlin": "Enterprise/JVM", "scala": "Enterprise/JVM", "groovy": "Enterprise/JVM", "clojure": "Enterprise/JVM",
  "csharp-assembly": "Enterprise/.NET", "fsharp": "Enterprise/.NET",
  "go-module": "Cloud Native", "rust-crate": "Systems", "cpp-unit": "Systems", "c-unit": "Systems", "zig": "Systems", "nim": "Systems", "d-lang": "Systems",
  "swift": "Mobile", "dart": "Mobile", "kotlin-android": "Mobile", "objective-c": "Mobile",
  "haskell": "Functional", "ocaml": "Functional", "erlang": "Functional", "elixir": "Functional", "common-lisp": "Functional", "scheme": "Functional", "racket": "Functional",
  "ruby": "Scripting", "php": "Scripting", "perl": "Scripting", "lua": "Scripting", "bash": "Scripting", "powershell": "Scripting", "raku": "Scripting", "tcl": "Scripting",
  "solidity": "Smart Contract", "vyper": "Smart Contract", "move": "Smart Contract", "cairo": "Smart Contract",
  "vhdl": "Hardware", "verilog": "Hardware", "systemverilog": "Hardware",
  "coq": "Formal Verification", "lean": "Formal Verification", "agda": "Formal Verification", "tlaplus": "Formal Verification",
  "cuda": "GPU/Shader", "opencl": "GPU/Shader", "glsl": "GPU/Shader", "hlsl": "GPU/Shader",
  "hcl": "IaC/Build", "nix": "IaC/Build", "dockerfile": "IaC/Build", "makefile": "IaC/Build",
  "sql-schema": "Query/Data", "graphql": "Query/Data", "sparql": "Query/Data", "xquery": "Query/Data",
  "ada": "Safety-Critical", "fortran": "HPC/Legacy", "pascal": "Legacy", "assembly": "Machine Code",
  "apl": "Niche", "forth": "Niche", "prolog": "Niche", "smalltalk": "Niche", "crystal": "Niche", "pony": "Niche",
  // Tier 10: Markup/Config/Serialization
  "xml": "Markup/Document", "markdown": "Markup/Document", "latex": "Markup/Document", "asciidoc": "Markup/Document", "rst": "Markup/Document",
  "yaml": "Configuration", "toml": "Configuration", "json-schema": "Configuration", "ini": "Configuration", "dotenv": "Configuration",
  "protobuf": "Serialization/IDL", "thrift": "Serialization/IDL", "capnproto": "Serialization/IDL", "flatbuffers": "Serialization/IDL",
  "avro": "Serialization/IDL", "msgpack": "Serialization/IDL", "cbor": "Serialization/IDL",
  "openapi": "API Description", "asyncapi": "API Description", "wsdl": "API Description", "raml": "API Description",
  "xsd": "Schema/Ontology", "shacl": "Schema/Ontology", "shex": "Schema/Ontology", "owl": "Schema/Ontology", "rdfs": "Schema/Ontology",
  "mermaid": "Diagram/Visual", "plantuml": "Diagram/Visual", "dot": "Diagram/Visual", "svg": "Diagram/Visual",
};

/** Language → downstream chain targets. */
const CHAIN_MAP: Record<string, Array<[string, string]>> = {
  "python-module": [["onnx", "Training script → model"], ["skill-md", "Function → capability contract"], ["a2a", "Agent → discovery card"]],
  "ts-module": [["js-module", "Source → compiled JS"], ["skill-md", "Types → skill contract"], ["mcp-tool", "Function → tool"], ["a2a", "Agent → card"]],
  "js-module": [["mcp-tool", "Function → tool"], ["a2a", "Agent → card"]],
  "java-class": [["oasf", "Service → descriptor"], ["a2a", "Service → agent card"], ["cobol-copybook", "Modernization bridge"]],
  "go-module": [["oci", "Binary → container"], ["a2a", "Service → agent card"], ["mcp-tool", "CLI → tool"]],
  "rust-crate": [["oci", "Binary → container"], ["wasm", "Crate → WASM"], ["mcp-tool", "Tool → MCP"]],
  "c-unit": [["oci", "Binary → container"], ["cobol-program", "Modernization bridge"]],
  "cpp-unit": [["wasm", "Emscripten → WASM"], ["onnx", "Runtime → model"]],
  "solidity": [["erc8004", "Contract → on-chain identity"]],
  "vyper": [["erc8004", "Contract → on-chain identity"]],
  "move": [["erc8004", "Contract → on-chain identity"]],
  "cairo": [["erc8004", "Contract → on-chain identity"]],
  "kotlin": [["java-class", "Source → JVM bytecode"], ["a2a", "App → agent card"]],
  "scala": [["java-class", "Source → JVM bytecode"]],
  "swift": [["a2a", "App → agent card"]],
  "dart": [["js-module", "Flutter → web JS"]],
  "r-lang": [["onnx", "Model → ONNX"]],
  "julia": [["onnx", "Model → ONNX"]],
  "cuda": [["onnx", "Kernel → model execution"]],
  "vhdl": [["c-unit", "Design → firmware"]],
  "verilog": [["c-unit", "Design → firmware"]],
  "coq": [["vc", "Proof → credential"]],
  "lean": [["vc", "Proof → credential"]],
  "dockerfile": [["oci", "Build → container"]],
  "hcl": [["oci", "IaC → container"]],
  "nix": [["oci", "Derivation → container"]],
  "bash": [["mcp-tool", "Script → tool"]],
  "ruby": [["mcp-tool", "Script → tool"]],
  "php": [["mcp-tool", "Script → tool"]],
  "erlang": [["a2a", "Actor → agent"]],
  "elixir": [["a2a", "GenServer → agent"], ["erlang", "Source → BEAM"]],
  // Tier 10 chains
  "openapi": [["oasf", "Spec → service descriptor"], ["skill-md", "Endpoints → capabilities"], ["mcp-tool", "REST → tool"]],
  "asyncapi": [["a2a", "Event spec → agent card"], ["oasf", "Async → service"]],
  "protobuf": [["skill-md", "Schema → contract"], ["oasf", "gRPC → service"], ["mcp-tool", "RPC → tool"]],
  "json-schema": [["skill-md", "Types → contract"], ["openapi", "Schema → API"], ["mcp-tool", "Validation → tool"]],
  "yaml": [["hcl", "Config → IaC"], ["dockerfile", "Compose → build"], ["openapi", "Format → API spec"]],
  "toml": [["rust-crate", "Cargo.toml → crate"], ["nix", "Config → build"]],
  "xml": [["xsd", "Document → schema"], ["wsdl", "Data → service"]],
  "xsd": [["json-schema", "XML → JSON migration"], ["protobuf", "XML → binary migration"]],
  "markdown": [["skill-md", "Doc → contract"], ["nanda-agentfacts", "README → passport"]],
  "latex": [["vc", "Paper → credential"], ["cid", "Paper → IPFS"]],
  "shacl": [["vc", "Shape → credential"]],
  "owl": [["shacl", "Ontology → validation"]],
  "rdfs": [["owl", "Vocab → ontology"]],
  "mermaid": [["markdown", "Diagram → doc"], ["svg", "Source → render"]],
  "plantuml": [["svg", "UML → render"]],
  "dot": [["svg", "Graph → render"]],
  "wsdl": [["oasf", "SOAP → service"], ["cobol-program", "SOA → legacy"]],
  "cbor": [["cid", "Binary → content-address"]],
  "avro": [["sql-schema", "Schema → SQL"], ["nanda-agentfacts", "Data → agent"]],
  "thrift": [["oasf", "IDL → service"], ["java-class", "IDL → stub"]],
  "capnproto": [["rust-crate", "Schema → Rust code"]],
  "flatbuffers": [["cpp-unit", "Schema → C++ accessor"]],
  "raml": [["openapi", "RAML → OpenAPI migration"]],
  "msgpack": [["cbor", "Binary → binary format bridge"]],
  "svg": [["cid", "Graphic → content-address"]],
};

/**
 * Build the polyglot supply chain for a single identity.
 */
export function buildPolyglotSupplyChain(input: ProjectionInput): PolyglotSupplyChain {
  const artifacts: LanguageArtifact[] = [];
  const categorySet = new Set<string>();

  for (const [lang, category] of Object.entries(LANGUAGE_CATEGORIES)) {
    if (!PROJECTIONS.has(lang)) continue;

    const resolved = project(input, lang);
    const chainDefs = CHAIN_MAP[lang] || [];
    const chains: LanguageChainLink[] = [];

    for (const [target, relationship] of chainDefs) {
      if (!PROJECTIONS.has(target)) continue;
      const targetResolved = project(input, target);
      chains.push({ target, targetUri: targetResolved.value, relationship });
    }

    categorySet.add(category);
    artifacts.push({
      language: lang,
      projection: lang,
      uri: resolved.value,
      category,
      chains,
    });
  }

  const categories = [...categorySet].sort();
  const majorFamilies = ["ML/Scientific", "Web Platform", "Enterprise/JVM", "Systems", "Cloud Native", "Functional"];
  const fullSpectrum = majorFamilies.every(f => categories.includes(f));

  return {
    "@type": "opportunity:PolyglotSupplyChain",
    threadHash: input.hex,
    artifacts,
    languageCount: artifacts.length,
    categories,
    totalChainLinks: artifacts.reduce((sum, a) => sum + a.chains.length, 0),
    fullSpectrum,
  };
}
