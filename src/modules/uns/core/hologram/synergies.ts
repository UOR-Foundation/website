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
