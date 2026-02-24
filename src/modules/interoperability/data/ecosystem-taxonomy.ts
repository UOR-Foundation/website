/**
 * Ecosystem Taxonomy — 10 Canonical Projection Domains
 * ═════════════════════════════════════════════════════
 *
 * Consolidates 356+ projections into 10 clean, UOR-aligned categories.
 * Each category maps to one or more UOR framework layers:
 *
 *   L1 Foundation  → UOR Foundation
 *   L2 Identity    → Identity & Trust
 *   L3 Structure   → Languages, Data & Encoding, Media & Creative
 *   L4 Resolution  → Federation & Social, Network & Cloud
 *   L5 Verification → Identity & Trust (blockchain, attestation)
 *   L6 Transformation → AI & Agents, Industry & Science
 *
 * @module interoperability/data/ecosystem-taxonomy
 */

export interface Ecosystem {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly color: string;
  readonly projections: readonly string[];
}

export const ECOSYSTEMS: readonly Ecosystem[] = [
  /* ─── 1. UOR Foundation ─────────────────────────────────────────────── */
  {
    id: "uor-foundation",
    label: "UOR Foundation",
    description:
      "The canonical primitives — content identifiers, decentralized identity, verifiable credentials, and the IPv6/Braille address pair that anchor every projection.",
    color: "hsl(220, 70%, 55%)",
    projections: ["cid", "jsonld", "did", "vc", "ipv6", "glyph"],
  },

  /* ─── 2. Identity & Trust ───────────────────────────────────────────── */
  {
    id: "identity-trust",
    label: "Identity & Trust",
    description:
      "Authentication, authorization, certificates, blockchain ledgers, and trust protocols — every mechanism that proves who, what, and when.",
    color: "hsl(152, 50%, 45%)",
    projections: [
      // Auth & credentials
      "webauthn", "sd-jwt", "openid4vp", "token-status-list", "c2pa", "ssf",
      "cose", "mdl", "didcomm-v2", "scim", "gordian-envelope", "cbor-ld",
      "x509", "jose", "oauth2", "saml", "pgp", "pkcs", "kerberos", "acme",
      "openbadges", "mls",
      // Trust infrastructure
      "tsp-vid", "tsp-envelope", "tsp-relationship",
      "fpp-rdid", "fpp-mdid", "fpp-pdid", "fpp-phc", "fpp-vrc", "fpp-vec",
      "trqp", "scitt", "spdx-sbom",
      // Blockchain & ledger
      "bitcoin", "bitcoin-hashlock", "lightning", "pq-bridge", "pq-envelope",
      "eth-commitment", "zcash-transparent", "zcash-memo", "zcash-zsa", "zcash-frost",
      "erc8004", "x402",
    ],
  },

  /* ─── 3. Federation & Social ────────────────────────────────────────── */
  {
    id: "federation-social",
    label: "Federation & Social",
    description:
      "Discovery and social protocols — how identities find, follow, and interact across decentralized networks.",
    color: "hsl(280, 55%, 55%)",
    projections: [
      "webfinger", "activitypub", "atproto", "solid", "oidc", "schema-org",
      "nostr", "nostr-note", "nostr-profile", "nostr-zap", "ens",
      "dnssd", "vcard",
    ],
  },

  /* ─── 4. AI & Autonomous Agents ─────────────────────────────────────── */
  {
    id: "ai-agents",
    label: "AI & Autonomous Agents",
    description:
      "Agent communication, model serialization, and inference frameworks — the projection layer for autonomous AI.",
    color: "hsl(340, 60%, 55%)",
    projections: [
      "mcp-tool", "mcp-context", "a2a", "a2a-task", "oasf",
      "onnx", "onnx-op", "skill-md",
      "nanda-index", "nanda-agentfacts", "nanda-resolver",
      "tf-savedmodel", "tflite", "torchscript", "mlflow",
      "coreml", "pmml", "modelcard", "safetensors", "gguf",
    ],
  },

  /* ─── 5. Programming Languages ──────────────────────────────────────── */
  {
    id: "languages",
    label: "Programming Languages",
    description:
      "Every programming language as a deterministic projection — from systems to scripting, functional to formal proof.",
    color: "hsl(200, 50%, 50%)",
    projections: [
      // Core
      "python-module", "js-module", "ts-module", "rust-crate", "go-module",
      "java-class", "csharp-assembly", "cpp-unit", "c-unit", "sql-schema",
      // JVM
      "kotlin", "scala", "groovy", "clojure",
      // Functional & proof
      "haskell", "ocaml", "fsharp", "erlang", "elixir",
      "common-lisp", "scheme", "racket", "coq", "lean", "agda", "tlaplus",
      // Scripting
      "ruby", "php", "perl", "lua", "bash", "powershell", "raku", "tcl",
      // Mobile
      "swift", "objective-c", "dart",
      // Scientific
      "r-lang", "julia", "matlab",
      // Systems
      "zig", "nim", "d-lang", "ada", "fortran", "pascal", "assembly",
      // Web platform
      "html", "css", "wasm", "wgsl",
      // Smart contracts
      "solidity", "vyper", "move", "cairo",
      // GPU & shader
      "cuda", "opencl", "glsl", "hlsl",
      // HDL
      "vhdl", "verilog", "systemverilog",
      // Niche
      "apl", "forth", "prolog", "smalltalk", "crystal", "pony",
      // Legacy
      "cobol-copybook", "cobol-program",
    ],
  },

  /* ─── 6. Data & Encoding ────────────────────────────────────────────── */
  {
    id: "data-encoding",
    label: "Data & Encoding",
    description:
      "Serialization formats, query languages, schema definitions, and semantic web — how information is structured and exchanged.",
    color: "hsl(35, 75%, 50%)",
    projections: [
      // Serialization & IDL
      "protobuf", "avro", "thrift", "capnproto", "flatbuffers", "msgpack", "cbor", "json-schema",
      // Tabular & columnar
      "csv", "tsv", "parquet", "arrow", "orc", "iceberg", "delta", "hudi", "ndjson",
      // Query languages
      "graphql", "sql", "cql", "cypher", "sparql", "xquery",
      // Binary encoding
      "base64", "asn1", "bson", "ion", "smile", "ubjson", "bencode", "pickle",
      // Semantic & RDF
      "nquads", "turtle", "trig", "rdfxml", "shacl", "owl", "rdfs", "shex", "xsd",
      // Markup & config
      "yaml", "toml", "ini", "dotenv", "xml", "markdown", "latex", "asciidoc", "rst",
      // API description
      "openapi", "asyncapi", "wsdl", "raml",
      // Infrastructure as code
      "hcl", "nix", "dockerfile", "makefile",
      // Archives & storage
      "zip", "tar", "sqlite", "zarr", "crdt",
    ],
  },

  /* ─── 7. Media & Creative ───────────────────────────────────────────── */
  {
    id: "media-creative",
    label: "Media & Creative",
    description:
      "Documents, images, video, audio, 3D assets, music notation, and typography — creative content as content-addressed objects.",
    color: "hsl(320, 50%, 55%)",
    projections: [
      // Documents
      "pdf", "ooxml", "odf", "epub", "rtf", "docbook", "dita",
      // Images
      "jpeg", "png", "webp", "avif", "tiff", "heif",
      // Audio
      "flac", "wav", "ogg",
      // Video
      "mp4", "webm", "mkv",
      // 3D
      "gltf", "usd", "fbx", "obj", "stl", "3mf",
      // Typography
      "woff2", "opentype",
      // Music & audio standards
      "midi", "musicxml", "mei", "abc-notation", "aes67", "mpeg7-audio", "jams", "mpd",
      // Diagrams
      "svg", "mermaid", "plantuml", "dot",
    ],
  },

  /* ─── 8. Network & Cloud ────────────────────────────────────────────── */
  {
    id: "network-cloud",
    label: "Network & Cloud",
    description:
      "Transport protocols, infrastructure as code, CI/CD, monitoring, and messaging — the connective tissue of modern systems.",
    color: "hsl(210, 55%, 50%)",
    projections: [
      // Network protocols
      "grpc", "quic", "websocket", "sip", "rtp", "dns", "bgp", "snmp", "webtransport",
      // PIM
      "mime", "icalendar", "jmap",
      // Cloud & DevOps
      "k8s", "helm", "tfstate", "prometheus", "compose", "gha",
      // Observability
      "opentelemetry", "cloudevents",
      // Container
      "oci", "gs1",
    ],
  },

  /* ─── 9. IoT & Hardware ─────────────────────────────────────────────── */
  {
    id: "iot-hardware",
    label: "IoT & Hardware",
    description:
      "Sensors, device protocols, chip design, PCB fabrication, and chip-to-chip interconnects — the physical layer.",
    color: "hsl(15, 65%, 50%)",
    projections: [
      // IoT protocols
      "lwm2m", "coap", "mqtt", "senml", "wot-td", "opcua", "ipso",
      "thread", "zigbee", "ble-gatt", "lorawan", "dtdl", "echonet", "matter",
      // Hardware design
      "gdsii", "gerber", "lefdef", "liberty", "edif", "spice",
      "step-cad", "ipc2581", "jtag", "ucie", "cxl", "st2110",
    ],
  },

  /* ─── 10. Industry & Science ────────────────────────────────────────── */
  {
    id: "industry-science",
    label: "Industry & Science",
    description:
      "Automotive, aviation, healthcare, finance, geospatial, construction, and scientific data — domain-specific standards unified by content addressing.",
    color: "hsl(170, 45%, 45%)",
    projections: [
      // Automotive & aviation
      "autosar", "can", "someip", "uds", "arinc429",
      // BIM & construction
      "ifc", "citygml", "las", "gbxml",
      // Financial & compliance
      "xbrl", "fix", "iso20022", "edi-x12", "edifact", "hl7v2",
      // Scientific
      "fits", "cif", "smiles", "geojson", "hdf5", "dicom", "fhir",
      "pdb", "netcdf", "nifti", "sbml", "mzml", "fastq", "vcf",
      // Geospatial
      "shapefile", "geopackage", "kml", "geotiff", "wkt", "mvt",
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
