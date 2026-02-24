import { describe, it, expect } from "vitest";
import { project, PROJECTIONS } from "../hologram";
import { coherenceGate } from "../hologram/coherence-gate";

const MOCK_INPUT = {
  hashBytes: new Uint8Array(32).fill(0xcd),
  cid: "bafylangtest5678",
  hex: "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
};

/** All 75 language projections with expected URN format. */
const ALL_LANGUAGE_PROJECTIONS = [
  // Original 10
  { name: "python-module", urn: `urn:uor:lang:python:${MOCK_INPUT.hex}` },
  { name: "js-module",     urn: `urn:uor:lang:js:${MOCK_INPUT.hex}` },
  { name: "java-class",    urn: `urn:uor:lang:java:${MOCK_INPUT.hex}` },
  { name: "csharp-assembly", urn: `urn:uor:lang:csharp:${MOCK_INPUT.hex}` },
  { name: "cpp-unit",      urn: `urn:uor:lang:cpp:${MOCK_INPUT.hex}` },
  { name: "c-unit",        urn: `urn:uor:lang:c:${MOCK_INPUT.hex}` },
  { name: "go-module",     urn: `urn:uor:lang:go:${MOCK_INPUT.hex}` },
  { name: "rust-crate",    urn: `urn:uor:lang:rust:${MOCK_INPUT.hex}` },
  { name: "ts-module",     urn: `urn:uor:lang:ts:${MOCK_INPUT.hex}` },
  { name: "sql-schema",    urn: `urn:uor:lang:sql:${MOCK_INPUT.hex}` },
  // 9a Systems
  { name: "zig",           urn: `urn:uor:lang:zig:${MOCK_INPUT.hex}` },
  { name: "nim",           urn: `urn:uor:lang:nim:${MOCK_INPUT.hex}` },
  { name: "d-lang",        urn: `urn:uor:lang:d:${MOCK_INPUT.hex}` },
  { name: "ada",           urn: `urn:uor:lang:ada:${MOCK_INPUT.hex}` },
  { name: "fortran",       urn: `urn:uor:lang:fortran:${MOCK_INPUT.hex}` },
  { name: "pascal",        urn: `urn:uor:lang:pascal:${MOCK_INPUT.hex}` },
  { name: "assembly",      urn: `urn:uor:lang:asm:${MOCK_INPUT.hex}` },
  // 9b JVM
  { name: "kotlin",        urn: `urn:uor:lang:kotlin:${MOCK_INPUT.hex}` },
  { name: "scala",         urn: `urn:uor:lang:scala:${MOCK_INPUT.hex}` },
  { name: "groovy",        urn: `urn:uor:lang:groovy:${MOCK_INPUT.hex}` },
  { name: "clojure",       urn: `urn:uor:lang:clojure:${MOCK_INPUT.hex}` },
  // 9c Functional
  { name: "haskell",       urn: `urn:uor:lang:haskell:${MOCK_INPUT.hex}` },
  { name: "ocaml",         urn: `urn:uor:lang:ocaml:${MOCK_INPUT.hex}` },
  { name: "fsharp",        urn: `urn:uor:lang:fsharp:${MOCK_INPUT.hex}` },
  { name: "erlang",        urn: `urn:uor:lang:erlang:${MOCK_INPUT.hex}` },
  { name: "elixir",        urn: `urn:uor:lang:elixir:${MOCK_INPUT.hex}` },
  { name: "common-lisp",   urn: `urn:uor:lang:lisp:${MOCK_INPUT.hex}` },
  { name: "scheme",        urn: `urn:uor:lang:scheme:${MOCK_INPUT.hex}` },
  { name: "racket",        urn: `urn:uor:lang:racket:${MOCK_INPUT.hex}` },
  // 9d Scripting
  { name: "ruby",          urn: `urn:uor:lang:ruby:${MOCK_INPUT.hex}` },
  { name: "php",           urn: `urn:uor:lang:php:${MOCK_INPUT.hex}` },
  { name: "perl",          urn: `urn:uor:lang:perl:${MOCK_INPUT.hex}` },
  { name: "lua",           urn: `urn:uor:lang:lua:${MOCK_INPUT.hex}` },
  { name: "bash",          urn: `urn:uor:lang:bash:${MOCK_INPUT.hex}` },
  { name: "powershell",    urn: `urn:uor:lang:powershell:${MOCK_INPUT.hex}` },
  { name: "raku",          urn: `urn:uor:lang:raku:${MOCK_INPUT.hex}` },
  { name: "tcl",           urn: `urn:uor:lang:tcl:${MOCK_INPUT.hex}` },
  // 9e Mobile
  { name: "swift",         urn: `urn:uor:lang:swift:${MOCK_INPUT.hex}` },
  { name: "objective-c",   urn: `urn:uor:lang:objc:${MOCK_INPUT.hex}` },
  { name: "dart",          urn: `urn:uor:lang:dart:${MOCK_INPUT.hex}` },
  // 9f Data/Scientific
  { name: "r-lang",        urn: `urn:uor:lang:r:${MOCK_INPUT.hex}` },
  { name: "julia",         urn: `urn:uor:lang:julia:${MOCK_INPUT.hex}` },
  { name: "matlab",        urn: `urn:uor:lang:matlab:${MOCK_INPUT.hex}` },
  // 9g Web Platform
  { name: "html",          urn: `urn:uor:lang:html:${MOCK_INPUT.hex}` },
  { name: "css",           urn: `urn:uor:lang:css:${MOCK_INPUT.hex}` },
  { name: "wasm",          urn: `urn:uor:lang:wasm:${MOCK_INPUT.hex}` },
  { name: "wgsl",          urn: `urn:uor:lang:wgsl:${MOCK_INPUT.hex}` },
  // 9h Query/Data
  { name: "graphql",       urn: `urn:uor:lang:graphql:${MOCK_INPUT.hex}` },
  { name: "sparql",        urn: `urn:uor:lang:sparql:${MOCK_INPUT.hex}` },
  { name: "xquery",        urn: `urn:uor:lang:xquery:${MOCK_INPUT.hex}` },
  // 9i Smart Contract
  { name: "solidity",      urn: `urn:uor:lang:solidity:${MOCK_INPUT.hex}` },
  { name: "vyper",         urn: `urn:uor:lang:vyper:${MOCK_INPUT.hex}` },
  { name: "move",          urn: `urn:uor:lang:move:${MOCK_INPUT.hex}` },
  { name: "cairo",         urn: `urn:uor:lang:cairo:${MOCK_INPUT.hex}` },
  // 9j Hardware
  { name: "vhdl",          urn: `urn:uor:lang:vhdl:${MOCK_INPUT.hex}` },
  { name: "verilog",       urn: `urn:uor:lang:verilog:${MOCK_INPUT.hex}` },
  { name: "systemverilog", urn: `urn:uor:lang:systemverilog:${MOCK_INPUT.hex}` },
  // 9k Formal Verification
  { name: "coq",           urn: `urn:uor:lang:coq:${MOCK_INPUT.hex}` },
  { name: "lean",          urn: `urn:uor:lang:lean:${MOCK_INPUT.hex}` },
  { name: "agda",          urn: `urn:uor:lang:agda:${MOCK_INPUT.hex}` },
  { name: "tlaplus",       urn: `urn:uor:lang:tlaplus:${MOCK_INPUT.hex}` },
  // 9l IaC/Build
  { name: "hcl",           urn: `urn:uor:lang:hcl:${MOCK_INPUT.hex}` },
  { name: "nix",           urn: `urn:uor:lang:nix:${MOCK_INPUT.hex}` },
  { name: "dockerfile",    urn: `urn:uor:lang:dockerfile:${MOCK_INPUT.hex}` },
  { name: "makefile",      urn: `urn:uor:lang:makefile:${MOCK_INPUT.hex}` },
  // 9m GPU/Shader
  { name: "cuda",          urn: `urn:uor:lang:cuda:${MOCK_INPUT.hex}` },
  { name: "opencl",        urn: `urn:uor:lang:opencl:${MOCK_INPUT.hex}` },
  { name: "glsl",          urn: `urn:uor:lang:glsl:${MOCK_INPUT.hex}` },
  { name: "hlsl",          urn: `urn:uor:lang:hlsl:${MOCK_INPUT.hex}` },
  // 9n Niche
  { name: "apl",           urn: `urn:uor:lang:apl:${MOCK_INPUT.hex}` },
  { name: "forth",         urn: `urn:uor:lang:forth:${MOCK_INPUT.hex}` },
  { name: "prolog",        urn: `urn:uor:lang:prolog:${MOCK_INPUT.hex}` },
  { name: "smalltalk",     urn: `urn:uor:lang:smalltalk:${MOCK_INPUT.hex}` },
  { name: "crystal",       urn: `urn:uor:lang:crystal:${MOCK_INPUT.hex}` },
  { name: "pony",          urn: `urn:uor:lang:pony:${MOCK_INPUT.hex}` },
] as const;

/** All 30 Tier 10 markup/config/serialization projections. */
const ALL_MARKUP_PROJECTIONS = [
  // 10a Document/Markup
  { name: "xml",          urn: `urn:uor:markup:xml:${MOCK_INPUT.hex}` },
  { name: "markdown",     urn: `urn:uor:markup:md:${MOCK_INPUT.hex}` },
  { name: "latex",        urn: `urn:uor:markup:latex:${MOCK_INPUT.hex}` },
  { name: "asciidoc",     urn: `urn:uor:markup:asciidoc:${MOCK_INPUT.hex}` },
  { name: "rst",          urn: `urn:uor:markup:rst:${MOCK_INPUT.hex}` },
  // 10b Configuration
  { name: "yaml",         urn: `urn:uor:config:yaml:${MOCK_INPUT.hex}` },
  { name: "toml",         urn: `urn:uor:config:toml:${MOCK_INPUT.hex}` },
  { name: "json-schema",  urn: `urn:uor:config:jsonschema:${MOCK_INPUT.hex}` },
  { name: "ini",          urn: `urn:uor:config:ini:${MOCK_INPUT.hex}` },
  { name: "dotenv",       urn: `urn:uor:config:dotenv:${MOCK_INPUT.hex}` },
  // 10c Serialization/IDL
  { name: "protobuf",     urn: `urn:uor:idl:protobuf:${MOCK_INPUT.hex}` },
  { name: "thrift",       urn: `urn:uor:idl:thrift:${MOCK_INPUT.hex}` },
  { name: "capnproto",    urn: `urn:uor:idl:capnproto:${MOCK_INPUT.hex}` },
  { name: "flatbuffers",  urn: `urn:uor:idl:flatbuffers:${MOCK_INPUT.hex}` },
  { name: "avro",         urn: `urn:uor:idl:avro:${MOCK_INPUT.hex}` },
  { name: "msgpack",      urn: `urn:uor:idl:msgpack:${MOCK_INPUT.hex}` },
  { name: "cbor",         urn: `urn:uor:idl:cbor:${MOCK_INPUT.hex}` },
  // 10d API Description
  { name: "openapi",      urn: `urn:uor:api:openapi:${MOCK_INPUT.hex}` },
  { name: "asyncapi",     urn: `urn:uor:api:asyncapi:${MOCK_INPUT.hex}` },
  { name: "wsdl",         urn: `urn:uor:api:wsdl:${MOCK_INPUT.hex}` },
  { name: "raml",         urn: `urn:uor:api:raml:${MOCK_INPUT.hex}` },
  // 10e Schema/Ontology
  { name: "xsd",          urn: `urn:uor:schema:xsd:${MOCK_INPUT.hex}` },
  { name: "shacl",        urn: `urn:uor:schema:shacl:${MOCK_INPUT.hex}` },
  { name: "shex",         urn: `urn:uor:schema:shex:${MOCK_INPUT.hex}` },
  { name: "owl",          urn: `urn:uor:schema:owl:${MOCK_INPUT.hex}` },
  { name: "rdfs",         urn: `urn:uor:schema:rdfs:${MOCK_INPUT.hex}` },
  // 10f Diagram/Visual
  { name: "mermaid",      urn: `urn:uor:diagram:mermaid:${MOCK_INPUT.hex}` },
  { name: "plantuml",     urn: `urn:uor:diagram:plantuml:${MOCK_INPUT.hex}` },
  { name: "dot",          urn: `urn:uor:diagram:dot:${MOCK_INPUT.hex}` },
  { name: "svg",          urn: `urn:uor:diagram:svg:${MOCK_INPUT.hex}` },
] as const;

describe("Complete Language Hologram Projections (75 languages + 30 markup/config)", () => {

  // ── Registration ──────────────────────────────────────────────────────

  it("all 75 language projections are registered in the hologram", () => {
    for (const { name } of ALL_LANGUAGE_PROJECTIONS) {
      expect(PROJECTIONS.has(name), `Missing projection: ${name}`).toBe(true);
    }
  });

  // ── URN correctness for every language ────────────────────────────────

  for (const { name, urn } of ALL_LANGUAGE_PROJECTIONS) {
    it(`${name} → correct URN`, () => {
      const p = project(MOCK_INPUT, name);
      expect(p.value).toBe(urn);
    });
  }

  // ── Fidelity: all lossless ────────────────────────────────────────────

  it("all 75 language projections are lossless", () => {
    for (const { name } of ALL_LANGUAGE_PROJECTIONS) {
      expect(project(MOCK_INPUT, name).fidelity).toBe("lossless");
    }
  });

  // ── Full hex identity embedded ────────────────────────────────────────

  it("all 75 projections embed the full 256-bit hex hash", () => {
    for (const { name } of ALL_LANGUAGE_PROJECTIONS) {
      expect(project(MOCK_INPUT, name).value).toContain(MOCK_INPUT.hex);
    }
  });

  // ── Tier classification ───────────────────────────────────────────────

  it("all 75 language projections classified in language tier", () => {
    const report = coherenceGate();
    const cluster = report.clusters.find(c => c.name === "language");
    expect(cluster).toBeDefined();
    expect(cluster!.members.length).toBe(75);
    for (const { name } of ALL_LANGUAGE_PROJECTIONS) {
      expect(cluster!.members, `${name} missing from language cluster`).toContain(name);
    }
  });

  // ── Total projection count ────────────────────────────────────────────

  it("total projections ≥ 147 (42 protocol + 75 language + 30 markup/config)", () => {
    const report = coherenceGate();
    expect(report.totalProjections).toBeGreaterThanOrEqual(147);
  });

  // ── Markup/Config Registration ──────────────────────────────────────

  it("all 30 markup/config projections are registered", () => {
    for (const { name } of ALL_MARKUP_PROJECTIONS) {
      expect(PROJECTIONS.has(name), `Missing projection: ${name}`).toBe(true);
    }
  });

  for (const { name, urn } of ALL_MARKUP_PROJECTIONS) {
    it(`${name} → correct URN`, () => {
      const p = project(MOCK_INPUT, name);
      expect(p.value).toBe(urn);
    });
  }

  it("all 30 markup/config projections are lossless", () => {
    for (const { name } of ALL_MARKUP_PROJECTIONS) {
      expect(project(MOCK_INPUT, name).fidelity).toBe("lossless");
    }
  });

  it("markup/config projections classified in markup-config tier", () => {
    const report = coherenceGate();
    const cluster = report.clusters.find(c => c.name === "markup-config");
    expect(cluster).toBeDefined();
    expect(cluster!.members.length).toBe(30);
  });

  // ── Markup provenance chains ────────────────────────────────────────

  it("discovers OpenAPI → OASF chain", () => {
    const report = coherenceGate();
    const chain = report.synergies.find(
      s => s.type === "provenance-chain" &&
        s.projections[0] === "openapi" && s.projections[1] === "oasf",
    );
    expect(chain).toBeDefined();
  });

  it("discovers Protobuf → skill-md chain", () => {
    const report = coherenceGate();
    const chain = report.synergies.find(
      s => s.type === "provenance-chain" &&
        s.projections[0] === "protobuf" && s.projections[1] === "skill-md",
    );
    expect(chain).toBeDefined();
  });

  it("discovers LaTeX → VC chain", () => {
    const report = coherenceGate();
    const chain = report.synergies.find(
      s => s.type === "provenance-chain" &&
        s.projections[0] === "latex" && s.projections[1] === "vc",
    );
    expect(chain).toBeDefined();
  });

  it("discovers UNIVERSAL SCHEMA BRIDGE opportunity", () => {
    const report = coherenceGate();
    expect(report.opportunities.some(o => o.includes("UNIVERSAL SCHEMA BRIDGE"))).toBe(true);
  });

  // ── Synergy categories ────────────────────────────────────────────────

  it("discovers JVM compilation chains (Kotlin/Scala/Groovy/Clojure → Java)", () => {
    const report = coherenceGate();
    for (const lang of ["kotlin", "scala", "groovy", "clojure"]) {
      const chain = report.synergies.find(
        s => s.type === "provenance-chain" &&
          s.projections[0] === lang && s.projections[1] === "java-class",
      );
      expect(chain, `${lang} → java-class chain missing`).toBeDefined();
    }
  });

  it("discovers smart contract → ERC-8004 chains", () => {
    const report = coherenceGate();
    for (const lang of ["solidity", "vyper", "move", "cairo"]) {
      const chain = report.synergies.find(
        s => s.type === "provenance-chain" &&
          s.projections[0] === lang && s.projections[1] === "erc8004",
      );
      expect(chain, `${lang} → erc8004 chain missing`).toBeDefined();
    }
  });

  it("discovers hardware → firmware chains (VHDL/Verilog → C)", () => {
    const report = coherenceGate();
    for (const lang of ["vhdl", "verilog"]) {
      const chain = report.synergies.find(
        s => s.type === "provenance-chain" &&
          s.projections[0] === lang && s.projections[1] === "c-unit",
      );
      expect(chain, `${lang} → c-unit chain missing`).toBeDefined();
    }
  });

  it("discovers formal proof → VC chains", () => {
    const report = coherenceGate();
    for (const lang of ["coq", "lean", "agda", "tlaplus", "ada"]) {
      const chain = report.synergies.find(
        s => s.type === "provenance-chain" &&
          s.projections[0] === lang && s.projections[1] === "vc",
      );
      expect(chain, `${lang} → vc chain missing`).toBeDefined();
    }
  });

  it("discovers GPU → ONNX chains", () => {
    const report = coherenceGate();
    for (const lang of ["cuda", "opencl"]) {
      const chain = report.synergies.find(
        s => s.type === "provenance-chain" &&
          s.projections[0] === lang && s.projections[1] === "onnx",
      );
      expect(chain, `${lang} → onnx chain missing`).toBeDefined();
    }
  });

  it("discovers IaC → OCI chains", () => {
    const report = coherenceGate();
    for (const lang of ["hcl", "dockerfile", "nix"]) {
      const chain = report.synergies.find(
        s => s.type === "provenance-chain" &&
          s.projections[0] === lang && s.projections[1] === "oci",
      );
      expect(chain, `${lang} → oci chain missing`).toBeDefined();
    }
  });

  it("discovers scripting → MCP tool chains", () => {
    const report = coherenceGate();
    for (const lang of ["ruby", "php", "perl", "lua", "bash", "powershell"]) {
      const chain = report.synergies.find(
        s => s.type === "provenance-chain" &&
          s.projections[0] === lang && s.projections[1] === "mcp-tool",
      );
      expect(chain, `${lang} → mcp-tool chain missing`).toBeDefined();
    }
  });

  it("discovers actor/agent model chains (Erlang/Elixir → A2A)", () => {
    const report = coherenceGate();
    for (const lang of ["erlang", "elixir"]) {
      const chain = report.synergies.find(
        s => s.type === "provenance-chain" &&
          s.projections[0] === lang && s.projections[1] === "a2a",
      );
      expect(chain, `${lang} → a2a chain missing`).toBeDefined();
    }
  });

  it("discovers scientific → ONNX chains", () => {
    const report = coherenceGate();
    for (const lang of ["r-lang", "julia", "matlab", "fortran"]) {
      const chain = report.synergies.find(
        s => s.type === "provenance-chain" &&
          s.projections[0] === lang && s.projections[1] === "onnx",
      );
      expect(chain, `${lang} → onnx chain missing`).toBeDefined();
    }
  });

  it("discovers WASM compilation chains", () => {
    const report = coherenceGate();
    for (const [src, tgt] of [["rust-crate", "wasm"], ["cpp-unit", "wasm"]]) {
      const chain = report.synergies.find(
        s => s.type === "provenance-chain" &&
          s.projections[0] === src && s.projections[1] === tgt,
      );
      expect(chain, `${src} → ${tgt} chain missing`).toBeDefined();
    }
  });

  // ── Settlement bridges ────────────────────────────────────────────────

  it("all 75 language projections have settlement bridges", () => {
    const report = coherenceGate();
    const langSettlement = report.synergies.filter(
      s => s.type === "settlement-bridge" &&
        ALL_LANGUAGE_PROJECTIONS.some(l => s.projections.includes(l.name)),
    );
    expect(langSettlement.length).toBe(75);
  });

  // ── Opportunity synthesis ─────────────────────────────────────────────

  it("generates POLYGLOT SUPPLY CHAIN opportunity", () => {
    const report = coherenceGate();
    expect(report.opportunities.find(o => o.includes("POLYGLOT"))).toBeDefined();
  });

  it("generates SMART CONTRACT INTEGRITY opportunity", () => {
    const report = coherenceGate();
    expect(report.opportunities.find(o => o.includes("SMART CONTRACT"))).toBeDefined();
  });

  it("generates PROOF-CERTIFIED SOFTWARE opportunity", () => {
    const report = coherenceGate();
    expect(report.opportunities.find(o => o.includes("PROOF-CERTIFIED"))).toBeDefined();
  });

  it("generates SILICON-TO-CLOUD PROVENANCE opportunity", () => {
    const report = coherenceGate();
    expect(report.opportunities.find(o => o.includes("SILICON-TO-CLOUD"))).toBeDefined();
  });

  // ── Cross-language identity equivalence ───────────────────────────────

  it("all 75 projections share the same canonical identity", () => {
    const values = ALL_LANGUAGE_PROJECTIONS.map(
      ({ name }) => project(MOCK_INPUT, name).value,
    );
    for (const v of values) {
      expect(v).toContain(MOCK_INPUT.hex);
    }
  });

  // ── Total synergy count is substantial ────────────────────────────────

  it("discovers > 150 total language synergies", () => {
    const report = coherenceGate();
    const langNames = new Set<string>(ALL_LANGUAGE_PROJECTIONS.map(l => l.name));
    const langSynergies = report.synergies.filter(
      s => langNames.has(s.projections[0] as string) || langNames.has(s.projections[1] as string),
    );
    expect(langSynergies.length).toBeGreaterThan(150);
  });

  // ── Coherence gate purity ─────────────────────────────────────────────

  it("coherence gate is pure — two calls produce identical counts", () => {
    const a = coherenceGate();
    const b = coherenceGate();
    expect(a.totalProjections).toBe(b.totalProjections);
    expect(a.synergies.length).toBe(b.synergies.length);
    expect(a.clusters.length).toBe(b.clusters.length);
    expect(a.opportunities.length).toBe(b.opportunities.length);
  });
});
