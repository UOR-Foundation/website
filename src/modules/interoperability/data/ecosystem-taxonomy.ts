/**
 * Ecosystem Taxonomy — 12 Canonical Projection Domains
 * ═════════════════════════════════════════════════════
 *
 * Consolidates 356+ projections into 12 clean, UOR-aligned categories.
 * Each category maps to one or more UOR framework layers:
 *
 *   L1 Foundation  → UOR Foundation
 *   L2 Identity    → Identity & Trust
 *   L3 Structure   → Languages, Data & Encoding, Media & Creative
 *   L4 Resolution  → Federation & Social, Network & Cloud
 *   L5 Verification → Web3 & Blockchain, Identity & Trust
 *   L6 Transformation → AI & Agents, Industry & Science, Quantum Computing
 *
 * @module interoperability/data/ecosystem-taxonomy
 */

export interface Ecosystem {
  readonly id: string;
  readonly label: string;
  /** What this category covers — accessible to any reader */
  readonly description: string;
  /** How this category is canonically expressed within the UOR framework */
  readonly uorExpression: string;
  readonly color: string;
  readonly projections: readonly string[];
}

export const ECOSYSTEMS: readonly Ecosystem[] = [
  /* ─── 1. UOR Foundation ─────────────────────────────────────────────── */
  {
    id: "uor-foundation",
    label: "UOR Foundation",
    description:
      "The core building blocks of the UOR framework itself: content identifiers, decentralized identity, verifiable credentials, and the address formats that anchor every other projection. These are the primitives from which all interoperability derives.",
    uorExpression:
      "Each primitive is a first-class UOR object. A CID is a self-certifying hash, a DID is a content-addressed identity, and a Verifiable Credential is a signed projection — all deterministically reproducible from the same canonical encoding pipeline.",
    color: "hsl(220, 70%, 55%)",
    projections: ["cid", "jsonld", "did", "vc", "ipv6", "glyph"],
  },

  /* ─── 2. Identity & Trust ───────────────────────────────────────────── */
  {
    id: "identity-trust",
    label: "Identity & Trust",
    description:
      "Standards that answer the questions: Who is this? Can I trust them? This includes authentication protocols (how you prove your identity), authorization systems (what you're allowed to do), digital certificates (who vouches for you), and trust frameworks that connect them all.",
    uorExpression:
      "Every trust artifact — an X.509 certificate, an OAuth token, a WebAuthn credential — becomes a content-addressed UOR object. Because its identity is derived from what it contains, any system can independently verify it without relying on a central authority.",
    color: "hsl(152, 50%, 45%)",
    projections: [
      "webauthn", "sd-jwt", "openid4vp", "token-status-list", "c2pa", "ssf",
      "cose", "mdl", "didcomm-v2", "scim", "gordian-envelope", "cbor-ld",
      "x509", "jose", "oauth2", "saml", "pgp", "pkcs", "kerberos", "acme",
      "openbadges", "mls",
      "tsp-vid", "tsp-envelope", "tsp-relationship",
      "fpp-rdid", "fpp-mdid", "fpp-pdid", "fpp-phc", "fpp-vrc", "fpp-vec",
      "trqp", "scitt", "spdx-sbom",
    ],
  },

  /* ─── 3. Web3 & Blockchain ──────────────────────────────────────────── */
  {
    id: "web3-blockchain",
    label: "Web3 & Blockchain",
    description:
      "Decentralized technologies that enable trustless transactions and programmable agreements without intermediaries. This covers blockchain networks (Bitcoin, Ethereum, Zcash), smart contract languages, payment channels (Lightning), on-chain identity (ENS), and decentralized social protocols (Nostr).",
    uorExpression:
      "Every on-chain object — a Bitcoin UTXO, an Ethereum commitment, a Zcash shielded note — maps to a deterministic UOR projection. The blockchain's own hash becomes a verifiable view of the same canonical identity, bridging on-chain and off-chain worlds through shared content addressing.",
    color: "hsl(38, 75%, 50%)",
    projections: [
      "bitcoin", "bitcoin-hashlock", "lightning",
      "zcash-transparent", "zcash-memo", "zcash-zsa", "zcash-frost",
      "eth-commitment", "erc8004", "x402",
      "pq-bridge", "pq-envelope",
      "solidity", "vyper", "move", "cairo",
      "ens",
      "nostr", "nostr-note", "nostr-profile", "nostr-zap",
    ],
  },

  /* ─── 4. Federation & Social ────────────────────────────────────────── */
  {
    id: "federation-social",
    label: "Federation & Social",
    description:
      "Protocols that let people and systems discover, follow, and interact with each other across independent networks. Instead of one company controlling the social graph, these standards enable federated communication — where anyone can run their own server and still connect with everyone else.",
    uorExpression:
      "A WebFinger lookup, an ActivityPub actor, or an AT Protocol identity each becomes a UOR projection. Because the same person or resource produces the same canonical hash regardless of which server hosts it, federated identity becomes truly portable and verifiable.",
    color: "hsl(280, 55%, 55%)",
    projections: [
      "webfinger", "activitypub", "atproto", "solid", "oidc", "schema-org",
      "dnssd", "vcard",
    ],
  },

  /* ─── 5. AI & Autonomous Agents ─────────────────────────────────────── */
  {
    id: "ai-agents",
    label: "AI & Autonomous Agents",
    description:
      "Frameworks for building, deploying, and connecting artificial intelligence. This includes agent-to-agent communication protocols (MCP, A2A), model serialization formats (ONNX, SafeTensors), and discovery registries — everything an AI system needs to operate, collaborate, and be audited.",
    uorExpression:
      "Every AI model, tool invocation, and agent response is a content-addressed UOR object. A model's weights, an inference result, or an agent's capability declaration all produce a unique canonical hash — enabling deterministic auditability and trustless interoperation between AI systems.",
    color: "hsl(340, 60%, 55%)",
    projections: [
      "mcp-tool", "mcp-context", "a2a", "a2a-task", "oasf",
      "onnx", "onnx-op", "skill-md",
      "nanda-index", "nanda-agentfacts", "nanda-resolver",
      "tf-savedmodel", "tflite", "torchscript", "mlflow",
      "coreml", "pmml", "modelcard", "safetensors", "gguf",
    ],
  },

  /* ─── 6. Programming Languages ──────────────────────────────────────── */
  {
    id: "languages",
    label: "Programming Languages",
    description:
      "The languages developers use to write software — from widely adopted ones like Python, JavaScript, and Rust, to specialized languages for formal verification (Coq, Lean), hardware design (VHDL), and GPU computing (CUDA). Each language defines its own way of structuring code into modules, classes, or crates.",
    uorExpression:
      "Every code module — a Python package, a Rust crate, a TypeScript module — is projected into UOR as a content-addressed object. Identical source code always produces the same canonical identity, regardless of which repository hosts it or what build system compiles it.",
    color: "hsl(200, 50%, 50%)",
    projections: [
      "python-module", "js-module", "ts-module", "rust-crate", "go-module",
      "java-class", "csharp-assembly", "cpp-unit", "c-unit", "sql-schema",
      "kotlin", "scala", "groovy", "clojure",
      "haskell", "ocaml", "fsharp", "erlang", "elixir",
      "common-lisp", "scheme", "racket", "coq", "lean", "agda", "tlaplus",
      "ruby", "php", "perl", "lua", "bash", "powershell", "raku", "tcl",
      "swift", "objective-c", "dart",
      "r-lang", "julia", "matlab",
      "zig", "nim", "d-lang", "ada", "fortran", "pascal", "assembly",
      "html", "css", "wasm", "wgsl",
      "cuda", "opencl", "glsl", "hlsl",
      "vhdl", "verilog", "systemverilog",
      "apl", "forth", "prolog", "smalltalk", "crystal", "pony",
      "cobol-copybook", "cobol-program",
    ],
  },

  /* ─── 7. Data & Encoding ────────────────────────────────────────────── */
  {
    id: "data-encoding",
    label: "Data & Encoding",
    description:
      "The formats and languages used to structure, serialize, query, and exchange information. This spans everything from common data formats (JSON, CSV, Protobuf) and query languages (SQL, GraphQL, SPARQL) to semantic web standards (RDF, OWL) and configuration files (YAML, TOML).",
    uorExpression:
      "Every data format is a projection lens: the same underlying information, encoded as Protobuf, Avro, or JSON-LD, maps to one canonical UOR identity. Format becomes a viewing angle rather than a silo — enabling lossless translation and verification across any encoding.",
    color: "hsl(35, 75%, 50%)",
    projections: [
      "protobuf", "avro", "thrift", "capnproto", "flatbuffers", "msgpack", "cbor", "json-schema",
      "csv", "tsv", "parquet", "arrow", "orc", "iceberg", "delta", "hudi", "ndjson",
      "graphql", "sql", "cql", "cypher", "sparql", "xquery",
      "base64", "asn1", "bson", "ion", "smile", "ubjson", "bencode", "pickle",
      "nquads", "turtle", "trig", "rdfxml", "shacl", "owl", "rdfs", "shex", "xsd",
      "yaml", "toml", "ini", "dotenv", "xml", "markdown", "latex", "asciidoc", "rst",
      "openapi", "asyncapi", "wsdl", "raml",
      "hcl", "nix", "dockerfile", "makefile",
      "zip", "tar", "sqlite", "zarr", "crdt",
    ],
  },

  /* ─── 8. Media & Creative ───────────────────────────────────────────── */
  {
    id: "media-creative",
    label: "Media & Creative",
    description:
      "Creative and multimedia content: documents (PDF, EPUB), images (JPEG, WebP), audio (FLAC, WAV), video (MP4, WebM), 3D models (glTF, USD), music notation (MIDI, MusicXML), and typography (WOFF2, OpenType). These are the formats that carry human expression and media.",
    uorExpression:
      "Every creative asset — an image, a video, a 3D model — becomes a content-addressed UOR object. Its identity is its fingerprint: the same file always resolves to the same canonical hash, enabling provenance tracking, attribution verification, and tamper-proof media distribution.",
    color: "hsl(320, 50%, 55%)",
    projections: [
      "pdf", "ooxml", "odf", "epub", "rtf", "docbook", "dita",
      "jpeg", "png", "webp", "avif", "tiff", "heif",
      "flac", "wav", "ogg",
      "mp4", "webm", "mkv",
      "gltf", "usd", "fbx", "obj", "stl", "3mf",
      "woff2", "opentype",
      "midi", "musicxml", "mei", "abc-notation", "aes67", "mpeg7-audio", "jams", "mpd",
      "svg", "mermaid", "plantuml", "dot",
    ],
  },

  /* ─── 9. Network & Cloud ────────────────────────────────────────────── */
  {
    id: "network-cloud",
    label: "Network & Cloud",
    description:
      "The infrastructure that connects systems together: network transport protocols (gRPC, QUIC, WebSocket), cloud orchestration (Kubernetes, Helm), monitoring and observability (OpenTelemetry, Prometheus), CI/CD pipelines, and messaging standards. This is the connective tissue of modern computing.",
    uorExpression:
      "Every infrastructure artifact — a Kubernetes manifest, a Prometheus metric, a CloudEvent — is projected as a UOR object. Content-addressing infrastructure configuration means deployments become verifiable, reproducible, and auditable across any cloud or network boundary.",
    color: "hsl(210, 55%, 50%)",
    projections: [
      "grpc", "quic", "websocket", "sip", "rtp", "dns", "bgp", "snmp", "webtransport",
      "mime", "icalendar", "jmap",
      "k8s", "helm", "tfstate", "prometheus", "compose", "gha",
      "opentelemetry", "cloudevents", "grafana-dashboard",
      "oci", "gs1",
    ],
  },

  /* ─── 10. IoT & Hardware ────────────────────────────────────────────── */
  {
    id: "iot-hardware",
    label: "IoT & Hardware",
    description:
      "Standards for the physical world: sensor networks (CoAP, MQTT, LwM2M), device communication protocols (Zigbee, Thread, Matter), chip design (GDSII, SPICE), PCB fabrication (Gerber), and chip-to-chip interconnects (UCIe, CXL). Where digital meets physical.",
    uorExpression:
      "Every device profile, sensor reading, and hardware design file maps to a UOR canonical identity. A chip layout, a firmware binary, or a sensor telemetry stream all produce deterministic hashes — enabling supply chain verification and device-level trust from silicon to cloud.",
    color: "hsl(15, 65%, 50%)",
    projections: [
      "lwm2m", "coap", "mqtt", "senml", "wot-td", "opcua", "ipso",
      "thread", "zigbee", "ble-gatt", "lorawan", "dtdl", "echonet", "matter",
      "gdsii", "gerber", "lefdef", "liberty", "edif", "spice",
      "step-cad", "ipc2581", "jtag", "ucie", "cxl", "st2110",
    ],
  },

  /* ─── 11. Quantum Computing ──────────────────────────────────────────── */
  {
    id: "quantum-computing",
    label: "Quantum Computing",
    description:
      "Standards, languages, and frameworks for quantum computation: circuit languages (OpenQASM 3, Quil, Q#), intermediate representations (QIR), pulse-level control (OpenPulse, QUA), gate-model SDKs (Qiskit, Cirq, PennyLane, Braket, pytket), quantum annealing (D-Wave Ocean), file formats (.qasm, .quil, .qs, QPY), and standards bodies (IEEE Quantum, IEC/ISO JTC 3). The emerging computational paradigm where information is processed through superposition, entanglement, and interference.",
    uorExpression:
      "Every quantum object — a circuit, a pulse schedule, a compiled IR, a model checkpoint — is content-addressed through UOR. The same quantum program always resolves to the same canonical identity, enabling reproducible experiments, verifiable compilation, and cross-platform circuit portability from simulators to real hardware.",
    color: "hsl(260, 60%, 50%)",
    projections: [
      // Gate/circuit-level languages
      "openqasm3", "openqasm2", "quil", "qsharp", "quipper", "blackbird",
      // Intermediate representations
      "qir",
      // Pulse-level specs
      "openpulse", "qua",
      // Binary serialization
      "qpy",
      // Gate-model SDKs
      "qiskit", "cirq", "braket-sdk", "pyquil", "pytket",
      // Hybrid / differentiable / quantum-ML
      "pennylane",
      // Quantum annealing
      "dwave-ocean",
    ],
  },

  /* ─── 12. Industry & Science ────────────────────────────────────────── */
  {
    id: "industry-science",
    label: "Industry & Science",
    description:
      "Domain-specific standards used in regulated, research-intensive, and spatial fields: automotive (AUTOSAR, CAN), aviation (ARINC 429), healthcare (FHIR, DICOM, HL7), financial reporting (XBRL, ISO 20022), scientific data (HDF5, FITS, SMILES), geospatial & mapping (GeoJSON, Shapefile, GeoTIFF, STAC), and BIM/construction (IFC, CityGML). Where precision, compliance, and spatial accuracy are non-negotiable.",
    uorExpression:
      "Every domain-specific record — a medical image, a financial transaction, a genomic sequence, a geospatial feature, a building model — becomes a verifiable UOR object. Content-addressing ensures that regulatory data, research datasets, spatial features, and compliance artifacts maintain integrity across systems, jurisdictions, and time.",
    color: "hsl(170, 45%, 45%)",
    projections: [
      "autosar", "can", "someip", "uds", "arinc429",
      "xbrl", "fix", "iso20022", "edi-x12", "edifact", "hl7v2",
      "fits", "cif", "smiles", "hdf5", "dicom", "fhir",
      "pdb", "netcdf", "nifti", "sbml", "mzml", "fastq", "vcf",
      // BIM & Construction (formerly Geospatial)
      "ifc", "citygml", "las", "gbxml",
      // Geospatial (absorbed into Industry & Science)
      "geojson", "shapefile", "geopackage", "kml", "geotiff", "wkt", "mvt", "stac",
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
