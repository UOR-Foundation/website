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
    id: "languages",
    label: "Programming Languages",
    description: "Python, JS, TS, Rust, Go, Solidity, SQL, Haskell, WASM, R, Julia, C++",
    color: "hsl(170, 50%, 45%)",
    projections: [
      "python-module", "js-module", "ts-module",
      "rust-crate", "go-module", "solidity-contract",
      "sql-query", "haskell-module", "wasm-module",
      "r-package", "julia-module", "cpp-translation-unit",
    ],
  },
  {
    id: "data-formats",
    label: "Data Formats",
    description: "CSV, Parquet, Avro, Protobuf, GraphQL, YAML, TOML, XML, LaTeX, Markdown",
    color: "hsl(190, 45%, 48%)",
    projections: [
      "csv-record", "parquet-schema", "avro-schema",
      "protobuf-message", "graphql-schema",
      "yaml-document", "toml-document", "xml-document",
      "latex-document", "markdown-document",
    ],
  },
  {
    id: "scientific",
    label: "Scientific & Music",
    description: "MIDI, CIF, FITS, SMILES, GeoJSON, HDF5, DICOM, FHIR",
    color: "hsl(300, 40%, 50%)",
    projections: [
      "midi-sequence", "cif-structure", "fits-observation",
      "smiles-molecule", "geojson-feature", "hdf5-dataset",
      "dicom-study", "fhir-resource",
    ],
  },
  {
    id: "hardware",
    label: "Hardware & IoT",
    description: "SPDX SBOM, SystemVerilog, GDSII, Gerber, Matter",
    color: "hsl(0, 50%, 55%)",
    projections: [
      "spdx-sbom", "systemverilog-module", "gdsii-cell",
      "gerber-layer", "matter-device",
    ],
  },
  {
    id: "tier16",
    label: "2024–2025 Standards",
    description: "WebAuthn, SD-JWT, C2PA, OpenTelemetry, CloudEvents, COSE, mDL, DIDComm, SCIM, WebTransport, Gordian, CBOR-LD, SSF, OpenID4VP, Token Status List",
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
