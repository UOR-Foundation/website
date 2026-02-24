/**
 * UOR Hologram — Projection Specifications
 * ═════════════════════════════════════════
 *
 * Each spec is a pure 3-5 line projection from hash → protocol-native ID.
 * Adding a new standard = adding one Map entry. Nothing else changes.
 *
 * The four foundational layers (JSON-LD, DID, VC, CID) are listed first —
 * they form the bedrock of the semantic web stack. Every other projection
 * is a viewing angle of the same identity through a different protocol lens.
 *
 * @module uns/core/hologram/specs
 */

import type { HologramSpec } from "./index";

const DOMAIN = "uor.foundation";

/**
 * All registered projections. Each is deterministic, pure, and stateless.
 */
export const SPECS: ReadonlyMap<string, HologramSpec> = new Map<string, HologramSpec>([

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 0 — FOUNDATIONAL STANDARDS (the semantic web bedrock)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── IPFS / CIDv1 / Multiformats — Content-Addressed Distribution ───────
  // The atomic identity. Everything else is a projection of this.

  ["cid", {
    project: ({ cid }) => cid,
    fidelity: "lossless",
    spec: "https://github.com/multiformats/cid",
  }],

  // ── W3C JSON-LD / RDF — Semantic Data Model ───────────────────────────
  // The canonical URN. Triplestores, SPARQL endpoints, and JSON-LD
  // processors all resolve through this identifier.

  ["jsonld", {
    project: ({ hex }) => `urn:uor:derivation:sha256:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/json-ld11/",
  }],

  // ── W3C DIDs (did:uor) — Self-Sovereign Identity ─────────────────────
  // Ceramic, ION, Spruce — every DID-capable system can resolve this.

  ["did", {
    project: ({ cid }) => `did:uor:${cid}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/did-core/",
  }],

  // ── W3C Verifiable Credentials 2.0 — Trust Layer ─────────────────────
  // Wallets, issuers, verifiers — the VC ecosystem speaks this URN.

  ["vc", {
    project: ({ cid }) => `urn:uor:vc:${cid}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/vc-data-model-2.0/",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1 — UOR NATIVE PROJECTIONS (derived directly from the hash)
  // ═══════════════════════════════════════════════════════════════════════════

  ["ipv6", {
    project: ({ hashBytes }) => {
      const h: string[] = [];
      for (let i = 0; i < 10; i += 2)
        h.push(((hashBytes[i] << 8) | hashBytes[i + 1]).toString(16).padStart(4, "0"));
      return `fd00:0075:6f72:${h.join(":")}`;
    },
    fidelity: "lossy",
    spec: "https://www.rfc-editor.org/rfc/rfc4193",
    lossWarning: "ipv6-is-routing-projection-only (80-bit truncation of 256-bit hash)",
  }],

  ["glyph", {
    project: ({ hashBytes }) => Array.from(hashBytes).map(b => String.fromCodePoint(0x2800 + b)).join(""),
    fidelity: "lossless",
    spec: "https://uor.foundation/spec/braille-bijection",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 2 — FEDERATION & DISCOVERY PROTOCOLS
  // ═══════════════════════════════════════════════════════════════════════════

  ["webfinger", {
    project: ({ hex }) => `acct:${hex.slice(0, 16)}@${DOMAIN}`,
    fidelity: "lossy",
    spec: "https://www.rfc-editor.org/rfc/rfc7033",
    lossWarning: "webfinger-uses-64-bit-prefix (collision-resistant for discovery, not identity)",
  }],

  ["activitypub", {
    project: ({ hex }) => `https://${DOMAIN}/ap/objects/${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/activitypub/",
  }],

  ["atproto", {
    project: ({ cid, hex }) => `at://did:uor:${cid}/app.uor.object/${hex.slice(0, 13)}`,
    fidelity: "lossy",
    spec: "https://atproto.com/specs/at-uri-scheme",
    lossWarning: "atproto-rkey-uses-52-bit-prefix (AT record key length constraint)",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3 — ENTERPRISE & INDUSTRY STANDARDS
  // ═══════════════════════════════════════════════════════════════════════════

  ["oidc", {
    project: ({ hex }) => `urn:uor:oidc:${hex}`,
    fidelity: "lossless",
    spec: "https://openid.net/specs/openid-connect-core-1_0.html",
  }],

  ["gs1", {
    project: ({ hex }) => `https://id.gs1.org/8004/${hex.slice(0, 30)}`,
    fidelity: "lossy",
    spec: "https://www.gs1.org/standards/gs1-digital-link",
    lossWarning: "gs1-uses-120-bit-prefix (GIAI serial reference length constraint)",
  }],

  ["oci", {
    project: ({ hex }) => `sha256:${hex}`,
    fidelity: "lossless",
    spec: "https://github.com/opencontainers/image-spec",
  }],

  ["solid", {
    project: ({ hex }) => `https://${DOMAIN}/profile/${hex}#me`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/webid/",
  }],

  ["openbadges", {
    project: ({ hex }) => `urn:uuid:${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`,
    fidelity: "lossy",
    spec: "https://www.imsglobal.org/spec/ob/v3p0/",
    lossWarning: "openbadges-uses-128-bit-uuid (truncated to UUIDv4 format)",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 4 — INFRASTRUCTURE & EMERGING PROTOCOLS
  // ═══════════════════════════════════════════════════════════════════════════

  ["scitt", {
    project: ({ hex }) => `urn:ietf:params:scitt:statement:sha256:${hex}`,
    fidelity: "lossless",
    spec: "https://datatracker.ietf.org/doc/draft-ietf-scitt-architecture/",
  }],

  ["mls", {
    project: ({ hex }) => `urn:ietf:params:mls:group:${hex}`,
    fidelity: "lossless",
    spec: "https://www.rfc-editor.org/rfc/rfc9420",
  }],

  ["dnssd", {
    project: ({ hex }) => `_uor-${hex.slice(0, 12)}._tcp.local`,
    fidelity: "lossy",
    spec: "https://www.rfc-editor.org/rfc/rfc6763",
    lossWarning: "dnssd-uses-48-bit-prefix (mDNS service name length constraint)",
  }],

  ["stac", {
    project: ({ hex }) => `https://${DOMAIN}/stac/items/${hex}`,
    fidelity: "lossless",
    spec: "https://stacspec.org/",
  }],

  ["croissant", {
    project: ({ hex }) => `https://${DOMAIN}/croissant/${hex}`,
    fidelity: "lossless",
    spec: "https://github.com/mlcommons/croissant",
  }],

  // ── CRDT / Automerge — Offline-First Collaboration ───────────────────
  // UOR's deterministic content hash IS the CRDT document ID.
  // Identical content → identical ID → trivial merge across replicas.

  ["crdt", {
    project: ({ hex }) => `crdt:automerge:${hex}`,
    fidelity: "lossless",
    spec: "https://automerge.org/automerge/stable/",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 5 — BITCOIN PROTOCOL (SHA-256 native alignment)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Bitcoin OP_RETURN Commitment — On-Chain Timestamping ─────────────
  // Embeds the full 256-bit UOR identity into a standard OP_RETURN output
  // script. Bitcoin's SHA-256 IS UOR's hash function — no translation
  // required. The 3-byte "UOR" magic prefix (0x554f52) enables protocol
  // identification by indexers. Total: 36 bytes (within 80-byte limit).
  //
  //   Script: OP_RETURN OP_PUSHBYTES_36 "UOR" <32-byte hash>
  //   Hex:    6a24 554f52 {hash}

  ["bitcoin", {
    project: ({ hashBytes }) => {
      const hex = Array.from(hashBytes)
        .map(b => b.toString(16).padStart(2, "0")).join("");
      return `6a24554f52${hex}`;
    },
    fidelity: "lossless",
    spec: "https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki",
  }],

  // ── Bitcoin HTLC Hash Lock — Content-Gated Spending ─────────────────
  // Produces a minimal Bitcoin Script that verifies a SHA-256 preimage.
  // The UOR canonical bytes of an object ARE the preimage — revealing
  // the object's URDNA2015 form unlocks the UTXO. Content = Key.
  //
  // Bitcoin's OP_SHA256 opcode performs SINGLE SHA-256 — identical to the
  // UOR canonical hash. No double-hashing, no protocol mismatch.
  //
  //   Script: OP_SHA256 OP_PUSHBYTES_32 <hash> OP_EQUAL
  //   Hex:    a8 20 {hash} 87

  ["bitcoin-hashlock", {
    project: ({ hashBytes }) => {
      const hex = Array.from(hashBytes)
        .map(b => b.toString(16).padStart(2, "0")).join("");
      return `a820${hex}87`;
    },
    fidelity: "lossless",
    spec: "https://github.com/bitcoin/bips/blob/master/bip-0199.mediawiki",
  }],

  // ── Lightning BOLT-11 — Content-Gated Micropayments ─────────────────
  // Produces the BOLT-11 `p` tagged field: the payment_hash component
  // of a Lightning Network invoice in its native bech32 wire encoding.
  //
  // BOLT-11 §Tagged Fields: "p (1): The 256-bit SHA256 payment_hash."
  //
  // The UOR canonical bytes ARE the Lightning preimage. Revealing the
  // URDNA2015 form of an object settles the payment — content delivery
  // IS payment settlement. One hash, two protocols, zero translation.
  //
  //   Tag type:    1       → bech32 'p'
  //   Data length: 52      → bech32 'p5' (1×32 + 20)
  //   Data:        256-bit → 52 bech32 chars (8-to-5-bit conversion)
  //   Output:      pp5{52 bech32 chars}

  ["lightning", {
    project: ({ hashBytes }) => {
      // BOLT-11 bech32 alphabet (same as BIP-173)
      const A = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
      // 8-bit to 5-bit conversion: 32 bytes (256 bits) → 52 groups (260 bits)
      let bits = 0;
      let value = 0;
      let data = "";
      for (const byte of hashBytes) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
          bits -= 5;
          data += A[(value >> bits) & 31];
        }
      }
      if (bits > 0) {
        data += A[(value << (5 - bits)) & 31];
      }
      // Tag 'p' (type=1) + length 'p5' (52) + 52 bech32 data chars
      return `pp5${data}`;
    },
    fidelity: "lossless",
    spec: "https://github.com/lightning/bolts/blob/master/11-payment-encoding.md",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 5b — ZCASH PROTOCOL (Bitcoin-compatible + Privacy Duality)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Zcash Transparent OP_RETURN — Public Timestamping (t-address) ───────
  // Zcash's transparent layer inherits Bitcoin's UTXO model and script
  // system. The OP_RETURN commitment is IDENTICAL to Bitcoin's — same
  // opcodes, same encoding, same 256-bit UOR identity. This is not an
  // adaptation — it's the SAME script running on a second chain.
  //
  // This projection validates the holographic principle: one identity,
  // two blockchains, zero translation. Zcash transparent IS Bitcoin script.
  //
  //   Script: OP_RETURN OP_PUSHBYTES_36 "UOR" <32-byte hash>
  //   Hex:    6a24 554f52 {hash}

  ["zcash-transparent", {
    project: ({ hashBytes }) => {
      const hex = Array.from(hashBytes)
        .map(b => b.toString(16).padStart(2, "0")).join("");
      return `6a24554f52${hex}`;
    },
    fidelity: "lossless",
    spec: "https://zips.z.cash/protocol/protocol.pdf",
  }],

  // ── Zcash Shielded Memo — Privacy-Preserving Content Address ───────────
  // ZIP-302 defines a 512-byte encrypted memo field attached to every
  // shielded (z-address) note. Only the recipient can decrypt it.
  //
  // We encode the UOR identity into a typed memo:
  //   Byte 0:    0xF5 — "No particular meaning" type (ZIP-302 §Memo Types)
  //              This avoids collision with text memos (0x00-0xF4) and
  //              the empty memo marker (0xF6).
  //   Byte 1:    0x01 — UOR protocol version
  //   Byte 2:    0x01 — Payload type: SHA-256 identity hash
  //   Bytes 3-34: 32-byte SHA-256 hash (the UOR canonical identity)
  //   Bytes 35-511: Zero-padded (memo field is always 512 bytes)
  //
  // The result is a hex string representing the full 512-byte memo.
  // The actual encryption happens at the wallet layer — this projection
  // produces the plaintext memo content that gets encrypted.
  //
  //   Format: f5 01 01 {32-byte hash} {477 zero bytes}

  ["zcash-memo", {
    project: ({ hashBytes }) => {
      const hex = Array.from(hashBytes)
        .map(b => b.toString(16).padStart(2, "0")).join("");
      // f5 = ZIP-302 "no particular meaning" type
      // 01 = UOR protocol version 1
      // 01 = payload type: SHA-256 identity
      // {hash} = 32 bytes of UOR identity
      // remaining 477 bytes are zero-padded
      const header = "f50101";
      const padding = "00".repeat(512 - 3 - 32); // 477 zero bytes
      return `${header}${hex}${padding}`;
    },
    fidelity: "lossless",
    spec: "https://zips.z.cash/zip-0302",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 6 — SOCIAL PROTOCOLS (SHA-256 native alignment)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Nostr NIP-01 — Content-Addressed Social Events ─────────────────────
  // A Nostr event ID is the SHA-256 hash of a canonical JSON serialization:
  //   [0, pubkey, created_at, kind, tags, content]
  //
  // UOR's SHA-256 identity maps directly: the UOR hash IS a valid Nostr
  // event ID. Any relay can index it, any client can reference it.
  // The hex encoding is identical — 64 lowercase hex characters.
  //
  // NIP-01 §Events: "id: 32-bytes lowercase hex-encoded sha256"
  //
  // Fidelity: LOSSLESS — the full 256-bit hash is preserved as-is.
  // No encoding translation, no truncation, no prefix. Pure SHA-256.

  ["nostr", {
    project: ({ hex }) => hex,
    fidelity: "lossless",
    spec: "https://github.com/nostr-protocol/nips/blob/master/01.md",
  }],

  // ── Nostr NIP-19 — Bech32 Human-Readable Encoding ─────────────────────
  // NIP-19 defines `note1...` bech32m encoding for event IDs, making them
  // copy-paste friendly for humans. The encoding wraps the raw 32-byte
  // hash with HRP "note" + bech32m checksum.
  //
  // This is the format users see in Nostr clients: note1{bech32 chars}
  //
  // Encoding: bech32m("note", hashBytes) per BIP-173/BIP-350

  ["nostr-note", {
    project: ({ hashBytes }) => {
      // bech32 encoding: HRP "note" + separator "1" + data + checksum
      const A = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
      // Convert 8-bit bytes to 5-bit groups
      let bits = 0;
      let value = 0;
      const data5: number[] = [];
      for (const byte of hashBytes) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
          bits -= 5;
          data5.push((value >> bits) & 31);
        }
      }
      if (bits > 0) {
        data5.push((value << (5 - bits)) & 31);
      }

      // bech32m checksum (BIP-350)
      const hrpExpand = (hrp: string): number[] => {
        const ret: number[] = [];
        for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) >> 5);
        ret.push(0);
        for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) & 31);
        return ret;
      };
      const polymod = (values: number[]): number => {
        const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
        let chk = 1;
        for (const v of values) {
          const b = chk >> 25;
          chk = ((chk & 0x1ffffff) << 5) ^ v;
          for (let i = 0; i < 5; i++) if ((b >> i) & 1) chk ^= GEN[i];
        }
        return chk;
      };
      const createChecksum = (hrp: string, data: number[]): number[] => {
        const values = [...hrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0];
        const mod = polymod(values) ^ 0x2bc830a3; // bech32m constant
        const ret: number[] = [];
        for (let i = 0; i < 6; i++) ret.push((mod >> (5 * (5 - i))) & 31);
        return ret;
      };

      const checksum = createChecksum("note", data5);
      return "note1" + [...data5, ...checksum].map(d => A[d]).join("");
    },
    fidelity: "lossless",
    spec: "https://github.com/nostr-protocol/nips/blob/master/19.md",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 7 — AGENTIC AI INFRASTRUCTURE (Moltbook Agent Stack)
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // The emerging agent stack: Identity (ERC-8004) + Payments (x402) +
  // Communication (MCP/A2A) + Skills (skill.md) + Services (OASF).
  // UOR provides the content-addressed trust layer beneath all of them.

  // ── ERC-8004 — On-Chain Agent Identity Registry ────────────────────────
  // ERC-8004 (backed by Coinbase, Google, MetaMask) assigns ERC-721 tokens
  // as agent identities. UOR projects into the tokenId space by casting
  // the SHA-256 hash to uint256 — the agent's content-derived identity
  // becomes its on-chain identity. Same hash, different ledger.
  //
  // This solves ERC-8004's transferability gap: a UOR identity is bound
  // to what the agent computes (founding derivation), not what token it
  // holds. Even if the NFT transfers, the canonical ID remains.
  //
  //   Format: erc8004:1:{contractAddr}:{uint256(sha256)}
  //   Chain:  1 = Ethereum mainnet (default registry)

  ["erc8004", {
    project: ({ hex }) => `erc8004:1:agent-registry:${hex}`,
    fidelity: "lossless",
    spec: "https://eips.ethereum.org/EIPS/eip-8004",
  }],

  // ── x402 — Agent Payment Protocol ─────────────────────────────────────
  // Coinbase's x402 uses HTTP 402 responses with payment requirements.
  // A UOR projection turns any service contract into a content-addressed
  // payment hash: the SHA-256 of the canonical service descriptor.
  //
  // Combined with bitcoin-hashlock, this enables content-gated commerce:
  // the UOR canonical bytes ARE the preimage — revealing the object
  // settles the payment. Content delivery IS payment settlement.
  //
  //   Format: x402:sha256:{hex} (payment requirement hash)

  ["x402", {
    project: ({ hex }) => `x402:sha256:${hex}`,
    fidelity: "lossless",
    spec: "https://www.x402.org/",
  }],

  // ── MCP Tool Provenance — Content-Addressed Tool Outputs ──────────────
  // Anthropic's Model Context Protocol lacks provenance tracking — once
  // untrusted content enters an agent's context, its origin is lost.
  //
  // UOR solves this: every MCP tool call (input→output) gets a content
  // address. Agents can verify that a tool output hasn't been tampered
  // with by re-computing the hash. This is the "context_block" extension
  // proposed by Subhadip Mitra, implemented as content addressing.
  //
  //   Format: urn:uor:mcp:tool:{hex} (hash of tool input+output)

  ["mcp-tool", {
    project: ({ hex }) => `urn:uor:mcp:tool:${hex}`,
    fidelity: "lossless",
    spec: "https://modelcontextprotocol.io/specification",
  }],

  // ── MCP Context Block — Provenance-Tagged Context Entries ──────────────
  // Solves the "Mitra gap": when untrusted content (e.g., a Moltbook post)
  // enters an agent's MCP context, its origin is lost. UOR's context block
  // projection gives every context entry a content-addressed provenance tag
  // with source, trust level, and chain-of-custody — enabling agents to
  // distinguish Grade A (self-derived) from Grade D (LLM-generated) content.
  //
  //   Format: urn:uor:mcp:context:{hex} (hash of context entry + metadata)

  ["mcp-context", {
    project: ({ hex }) => `urn:uor:mcp:context:${hex}`,
    fidelity: "lossless",
    spec: "https://modelcontextprotocol.io/specification",
  }],

  // ── skill.md — Content-Addressed Agent Skills ─────────────────────────
  // Moltbook's skill.md convention — the "simplest API contract" — has
  // a critical supply-chain attack surface: malicious modifications.
  //
  // UOR provides cryptographic integrity: hash the canonical skill
  // descriptor, publish the hash on Bitcoin/Zcash, and any agent can
  // verify a skill.md hasn't been tampered with before executing it.
  //
  //   Format: urn:uor:skill:{hex} (hash of canonical skill descriptor)

  ["skill-md", {
    project: ({ hex }) => `urn:uor:skill:${hex}`,
    fidelity: "lossless",
    spec: "https://moltbook.com/m/skills",
  }],

  // ── A2A — Agent-to-Agent Communication ────────────────────────────────
  // Google's A2A protocol uses AgentCards for discovery and tasks for
  // orchestration. UOR projects into both: the AgentCard becomes a
  // content-addressed identity, and each task gets a verifiable hash.
  //
  //   Format: urn:uor:a2a:agent:{hex} (hash of canonical AgentCard)

  ["a2a", {
    project: ({ hex }) => `urn:uor:a2a:agent:${hex}`,
    fidelity: "lossless",
    spec: "https://github.com/google/A2A",
  }],

  // ── A2A Task — Verifiable Inter-Agent Task Provenance ─────────────────
  // Every A2A task gets a UOR receipt chain: who initiated it, what
  // transformations occurred, and whether the output matches the request.
  // The task hash IS the task's identity — enabling deterministic replay.
  //
  //   Format: urn:uor:a2a:task:{hex} (hash of canonical task object)

  ["a2a-task", {
    project: ({ hex }) => `urn:uor:a2a:task:${hex}`,
    fidelity: "lossless",
    spec: "https://github.com/google/A2A",
  }],

  // ── OASF — Open Agent Service Framework ───────────────────────────────
  // Cisco's OASF provides off-chain service descriptors pinned on IPFS.
  // UOR's CIDv1 maps directly: the OASF descriptor's content hash IS
  // the UOR identity. Zero translation — native CID alignment.
  //
  //   Format: urn:uor:oasf:{cid} (CID of canonical service descriptor)

  ["oasf", {
    project: ({ cid }) => `urn:uor:oasf:${cid}`,
    fidelity: "lossless",
    spec: "https://github.com/agntcy/oasf",
  }],

  // ── ONNX — Open Neural Network Exchange ───────────────────────────────
  // An ONNX model is a serialized protobuf — raw bytes that are trivially
  // content-addressable. Hashing the model file gives it a permanent,
  // tamper-evident identity: if a single weight changes, the hash changes.
  //
  // Cross-framework synergy: an agent's model (ONNX) links to its
  // identity (ERC-8004), its skills (skill.md), and its outputs (MCP).
  // Model provenance becomes verifiable across the entire agent stack.
  //
  //   Format: urn:uor:onnx:model:{hex} (SHA-256 of model bytes)

  ["onnx", {
    project: ({ hex }) => `urn:uor:onnx:model:${hex}`,
    fidelity: "lossless",
    spec: "https://onnx.ai/",
  }],

  // ── ONNX Op — Content-Addressed Operator Identity ─────────────────────
  // Individual ONNX operators (Conv, MatMul, Attention, etc.) can be
  // canonicalized as JSON-LD descriptors and hashed — giving each operator
  // a verifiable identity independent of the model it appears in.
  // Enables operator-level provenance and reuse tracking across models.
  //
  //   Format: urn:uor:onnx:op:{hex} (hash of canonical operator descriptor)

  ["onnx-op", {
    project: ({ hex }) => `urn:uor:onnx:op:${hex}`,
    fidelity: "lossless",
    spec: "https://onnx.ai/onnx/operators/",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 4 — AGENTIC INFRASTRUCTURE (discovery, registry, coordination)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── NANDA Index — Agent Discovery Registry ────────────────────────────
  // The "DNS for AI Agents" (MIT). Maps content-addressed agent identity
  // to a lean index entry for global discovery and resolution.
  //
  //   Format: nanda:index:{hex} (lookup key in the NANDA quilt)

  ["nanda-index", {
    project: ({ hex }) => `nanda:index:${hex}`,
    fidelity: "lossless",
    spec: "https://arxiv.org/abs/2507.14263",
  }],

  // ── NANDA AgentFacts — Cryptographic Agent Passport ───────────────────
  // JSON-LD "passport" containing capabilities, endpoints, auth, and
  // telemetry. Because AgentFacts IS JSON-LD, canonicalizing it via
  // URDNA2015 makes every AgentFacts document a UOR object natively.
  //
  //   Format: https://index.projectnanda.org/agentfacts/{hex}

  ["nanda-agentfacts", {
    project: ({ hex }) => `https://index.projectnanda.org/agentfacts/${hex}`,
    fidelity: "lossless",
    spec: "https://spec.projectnanda.org/schemas/agentfacts-1.2.0.json",
  }],

  // ── NANDA Adaptive Resolver — Agent Name Resolution ───────────────────
  // Recursive resolution microservice for agent handle → address lookup.
  // Privacy-preserving split-horizon queries via the NANDA resolver.
  //
  //   Format: nanda:resolve:{hex16} (16-char prefix for fast lookup)

  ["nanda-resolver", {
    project: ({ hex }) => `nanda:resolve:${hex.slice(0, 16)}`,
    fidelity: "lossy",
    spec: "https://arxiv.org/abs/2508.03113",
    lossWarning: "resolver-uses-64-bit-prefix-for-fast-lookup (64 of 256 bits)",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 8 — LEGACY INFRASTRUCTURE (bridging mainframe to hologram)
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // COBOL powers 95% of ATM transactions, 43% of banking systems, and
  // 220 billion lines of production code. A holographic projection gives
  // every COBOL artifact a content-addressed, cross-protocol identity —
  // bridging the world's largest financial infrastructure to the UOR trust layer.

  // ── COBOL Copybook — Content-Addressed Data Definitions ───────────────
  // A COBOL copybook (data division extract) is the most reusable artifact
  // in mainframe systems. Canonicalizing it as JSON-LD and hashing it gives
  // every shared data structure a permanent, verifiable identity.
  // Two banks using the same copybook hash = guaranteed identical semantics.
  //
  //   Format: urn:uor:cobol:copybook:{hex} (SHA-256 of canonical copybook)

  ["cobol-copybook", {
    project: ({ hex }) => `urn:uor:cobol:copybook:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/74527.html",
  }],

  // ── COBOL Program — Content-Addressed Program Unit ────────────────────
  // A full COBOL program (all four divisions: Identification, Environment,
  // Data, Procedure) canonicalized as a single JSON-LD object. The hash
  // proves the program hasn't been modified since certification —
  // the audit trail IS the identity.
  //
  //   Format: urn:uor:cobol:program:{hex} (SHA-256 of canonical program)

  ["cobol-program", {
    project: ({ hex }) => `urn:uor:cobol:program:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/74527.html",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 9 — PROGRAMMING LANGUAGE PROJECTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Every programming language artifact (source file, AST, compiled binary,
  // query plan) is serializable structured data — canonicalizable via
  // URDNA2015, hashable to SHA-256, and projectable into all hologram
  // protocols. The projection format is universal:
  //
  //   Source/AST/Binary → JSON-LD → URDNA2015 → SHA-256 → UOR Identity
  //
  // This enables content-addressed supply chain integrity, reproducible
  // builds, ML pipeline provenance, and cross-language interoperability
  // within the UOR Virtual OS.

  // ── Python Module — AI/ML Pipeline Provenance ─────────────────────────
  // Python's ast.parse() produces a deterministic, serializable AST.
  // Dominance in AI/ML creates a direct provenance chain:
  //   training script → ONNX model → MCP tool output
  // The entire ML pipeline becomes content-addressed.
  //
  //   Format: urn:uor:lang:python:{hex} (SHA-256 of canonical module AST)

  ["python-module", {
    project: ({ hex }) => `urn:uor:lang:python:${hex}`,
    fidelity: "lossless",
    spec: "https://docs.python.org/3/library/ast.html",
  }],

  // ── JavaScript Module — Browser-Native Supply Chain ───────────────────
  // JS IS the browser — and the UOR Virtual OS runs in the browser.
  // npm packages are tarballs with package.json (structured data →
  // trivially canonicalizable). UOR fixes the npm supply chain attack
  // surface with cryptographic content-addressing.
  //
  //   Format: urn:uor:lang:js:{hex} (SHA-256 of canonical JS module)

  ["js-module", {
    project: ({ hex }) => `urn:uor:lang:js:${hex}`,
    fidelity: "lossless",
    spec: "https://tc39.es/ecma262/",
  }],

  // ── Java Class — Enterprise Bytecode Identity ─────────────────────────
  // Java .class files are deterministic bytecode — perfect for content-
  // addressing. Maven Central already uses SHA-1; UOR upgrades to SHA-256.
  // Enables COBOL-to-Java migration verification via shared hash identity.
  //
  //   Format: urn:uor:lang:java:{hex} (SHA-256 of canonical class descriptor)

  ["java-class", {
    project: ({ hex }) => `urn:uor:lang:java:${hex}`,
    fidelity: "lossless",
    spec: "https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-4.html",
  }],

  // ── C# Assembly — .NET/Unity Verifiable Identity ──────────────────────
  // .NET assemblies are structured IL bytecode with rich metadata.
  // NuGet packages are already signed — UOR adds content-addressing.
  // Unity game assets become cryptographically verifiable.
  //
  //   Format: urn:uor:lang:csharp:{hex} (SHA-256 of canonical assembly descriptor)

  ["csharp-assembly", {
    project: ({ hex }) => `urn:uor:lang:csharp:${hex}`,
    fidelity: "lossless",
    spec: "https://ecma-international.org/publications-and-standards/standards/ecma-335/",
  }],

  // ── C++ Compilation Unit — High-Performance Audit Trail ───────────────
  // C++ compilation units produce deterministic object files with
  // reproducible builds. Game engines (Unreal), HFT systems, and
  // robotics firmware all become content-addressable.
  //
  //   Format: urn:uor:lang:cpp:{hex} (SHA-256 of canonical compilation unit)

  ["cpp-unit", {
    project: ({ hex }) => `urn:uor:lang:cpp:${hex}`,
    fidelity: "lossless",
    spec: "https://isocpp.org/std/the-standard",
  }],

  // ── C Translation Unit — OS/Firmware Foundation ───────────────────────
  // C is the foundation — Linux kernel, compilers, embedded systems.
  // Reproducible builds (Debian, NixOS) already aim for deterministic
  // output — UOR provides the identity layer.
  //
  //   Format: urn:uor:lang:c:{hex} (SHA-256 of canonical translation unit)

  ["c-unit", {
    project: ({ hex }) => `urn:uor:lang:c:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/82075.html",
  }],

  // ── Go Module — Cloud-Native Provenance ───────────────────────────────
  // Go modules already use content-addressed checksums (go.sum) and a
  // transparency log (Go Module Mirror). UOR extends this to cross-
  // protocol identity — a Go module hash becomes a DID, a Bitcoin
  // anchor, a NANDA-discoverable service.
  //
  //   Format: urn:uor:lang:go:{hex} (SHA-256 of canonical Go module)

  ["go-module", {
    project: ({ hex }) => `urn:uor:lang:go:${hex}`,
    fidelity: "lossless",
    spec: "https://go.dev/ref/mod",
  }],

  // ── Rust Crate — Secure Systems Identity ──────────────────────────────
  // Rust's cargo already uses SHA-256 checksums for crate verification.
  // Memory safety + cryptographic integrity = the most secure projection.
  // WASM compilation makes Rust ideal for browser-based Virtual OS.
  //
  //   Format: urn:uor:lang:rust:{hex} (SHA-256 of canonical crate descriptor)

  ["rust-crate", {
    project: ({ hex }) => `urn:uor:lang:rust:${hex}`,
    fidelity: "lossless",
    spec: "https://doc.rust-lang.org/cargo/reference/registries.html",
  }],

  // ── TypeScript Module — Virtual OS Native Execution ───────────────────
  // TypeScript IS the UOR framework's implementation language. .d.ts
  // declaration files are pure type descriptions — perfectly structured
  // for JSON-LD canonicalization. The type system provides structural
  // guarantees that enhance canonicalization.
  //
  //   Format: urn:uor:lang:ts:{hex} (SHA-256 of canonical TS module)

  ["ts-module", {
    project: ({ hex }) => `urn:uor:lang:ts:${hex}`,
    fidelity: "lossless",
    spec: "https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html",
  }],

  // ── SQL Schema — Database Structure Identity ──────────────────────────
  // SQL schemas are pure structural declarations (CREATE TABLE, constraints,
  // indexes). They're the most naturally canonicalizable of all languages.
  // Database migrations become content-addressed — every schema version
  // gets a permanent identity.
  //
  //   Format: urn:uor:lang:sql:{hex} (SHA-256 of canonical schema descriptor)

  ["sql-schema", {
    project: ({ hex }) => `urn:uor:lang:sql:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/76583.html",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 9a — SYSTEMS & LOW-LEVEL LANGUAGES
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Systems languages compile to native machine code. Their canonical form
  // is the deterministic compilation unit — the AST or object file that
  // a reproducible build would produce. Content-addressing these artifacts
  // enables supply-chain integrity from source to binary.

  // ── Zig — Comptime-Evaluated Systems Language ────────────────────────────
  // Zig's comptime evaluation produces deterministic output at compile time.
  // No hidden allocations, no undefined behavior — ideal for content-addressing.
  // Cross-compilation to 30+ targets from a single source makes Zig a
  // universal systems projection.
  //
  //   Format: urn:uor:lang:zig:{hex} (SHA-256 of canonical Zig module AST)
  //   Canonical: source → Zig AST → JSON-LD → URDNA2015 → SHA-256

  ["zig", {
    project: ({ hex }) => `urn:uor:lang:zig:${hex}`,
    fidelity: "lossless",
    spec: "https://ziglang.org/documentation/",
  }],

  // ── Nim — Metaprogramming Systems Language ───────────────────────────────
  // Nim's macro system operates on a typed AST — the AST IS the canonical form.
  // Compiles to C/C++/JS, making it a multi-target projection bridge.
  // Nimble packages use SHA-1 checksums; UOR upgrades to SHA-256.
  //
  //   Format: urn:uor:lang:nim:{hex} (SHA-256 of canonical Nim module AST)
  //   Canonical: source → typed AST → JSON-LD → URDNA2015 → SHA-256

  ["nim", {
    project: ({ hex }) => `urn:uor:lang:nim:${hex}`,
    fidelity: "lossless",
    spec: "https://nim-lang.org/docs/manual.html",
  }],

  // ── D — Systems Language with GC Option ──────────────────────────────────
  // D combines C-level control with high-level features. DUB packages
  // are content-addressable via their dub.selections.json lockfiles.
  // Deterministic compilation with -betterC flag enables bare-metal provenance.
  //
  //   Format: urn:uor:lang:d:{hex} (SHA-256 of canonical D module AST)
  //   Canonical: source → D AST → JSON-LD → URDNA2015 → SHA-256

  ["d-lang", {
    project: ({ hex }) => `urn:uor:lang:d:${hex}`,
    fidelity: "lossless",
    spec: "https://dlang.org/spec/spec.html",
  }],

  // ── Ada — Safety-Critical Certified Systems ──────────────────────────────
  // Ada is mandated for avionics (DO-178C), railway (EN 50128), and defense.
  // SPARK subset provides formal verification proofs that map directly to
  // UOR derivation chains. GNAT compiler produces reproducible builds.
  // Ada packages (Alire) get content-addressed certification chains.
  //
  //   Format: urn:uor:lang:ada:{hex} (SHA-256 of canonical Ada package spec)
  //   Canonical: package spec → ALI descriptor → JSON-LD → URDNA2015 → SHA-256

  ["ada", {
    project: ({ hex }) => `urn:uor:lang:ada:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/69027.html",
  }],

  // ── Fortran — Scientific Computing Foundation ────────────────────────────
  // Fortran dominates HPC: weather modeling, fluid dynamics, nuclear simulation.
  // Modern Fortran (2023) modules are deterministic compilation units.
  // fpm (Fortran Package Manager) packages become content-addressed,
  // enabling reproducible scientific computation chains.
  //
  //   Format: urn:uor:lang:fortran:{hex} (SHA-256 of canonical Fortran module)
  //   Canonical: module → interface block → JSON-LD → URDNA2015 → SHA-256

  ["fortran", {
    project: ({ hex }) => `urn:uor:lang:fortran:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/82170.html",
  }],

  // ── Pascal — Educational & Legacy Systems Bridge ─────────────────────────
  // Pascal's strict type system and block structure make it trivially
  // canonicalizable. Free Pascal compiler produces deterministic output.
  // Bridges educational computing to production via content-addressing.
  //
  //   Format: urn:uor:lang:pascal:{hex} (SHA-256 of canonical Pascal unit)
  //   Canonical: unit → interface section → JSON-LD → URDNA2015 → SHA-256

  ["pascal", {
    project: ({ hex }) => `urn:uor:lang:pascal:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/18237.html",
  }],

  // ── Assembly — Instruction-Level Provenance ──────────────────────────────
  // Assembly is the final human-readable layer before machine code.
  // Instruction sequences are fully deterministic — each mnemonic maps
  // to exact bytes. Content-addressing assembly enables firmware integrity
  // verification from source to silicon.
  //
  //   Format: urn:uor:lang:asm:{hex} (SHA-256 of canonical instruction listing)
  //   Canonical: listing → instruction table → JSON-LD → URDNA2015 → SHA-256

  ["assembly", {
    project: ({ hex }) => `urn:uor:lang:asm:${hex}`,
    fidelity: "lossless",
    spec: "https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 9b — JVM LANGUAGES (compile to Java bytecode)
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // All JVM languages compile to the same bytecode format (.class files).
  // This creates a natural content-addressing bridge: Kotlin, Scala, Groovy,
  // and Clojure source all converge to the same JVM bytecode hash when
  // they produce identical behavior. The bytecode IS the canonical form.

  // ── Kotlin — Android & Server-Side JVM ───────────────────────────────────
  // Kotlin is Android's primary language and a major server-side JVM choice.
  // Kotlin Multiplatform (KMP) targets JVM, JS, Native, and WASM —
  // content-addressing each target produces a multi-platform identity chain.
  // Gradle build scripts (Kotlin DSL) are themselves canonicalizable.
  //
  //   Format: urn:uor:lang:kotlin:{hex} (SHA-256 of canonical Kotlin module descriptor)
  //   Canonical: source → KIR → JSON-LD → URDNA2015 → SHA-256

  ["kotlin", {
    project: ({ hex }) => `urn:uor:lang:kotlin:${hex}`,
    fidelity: "lossless",
    spec: "https://kotlinlang.org/spec/",
  }],

  // ── Scala — Functional JVM with Type-Level Computing ─────────────────────
  // Scala 3's TASTy (Typed Abstract Syntax Trees) format is a rich,
  // deterministic intermediate representation — perfect for canonical hashing.
  // sbt builds with lockfiles enable reproducible dependency resolution.
  // Spark (big data) pipelines become content-addressed end-to-end.
  //
  //   Format: urn:uor:lang:scala:{hex} (SHA-256 of canonical TASTy descriptor)
  //   Canonical: source → TASTy IR → JSON-LD → URDNA2015 → SHA-256

  ["scala", {
    project: ({ hex }) => `urn:uor:lang:scala:${hex}`,
    fidelity: "lossless",
    spec: "https://scala-lang.org/files/archive/spec/3.3/",
  }],

  // ── Groovy — JVM Build & Scripting ───────────────────────────────────────
  // Groovy powers Gradle (Android/JVM build system) and Jenkins pipelines.
  // Build scripts are executable code — content-addressing Groovy scripts
  // means content-addressing the entire build pipeline. @CompileStatic
  // mode produces deterministic bytecode identical to Java.
  //
  //   Format: urn:uor:lang:groovy:{hex} (SHA-256 of canonical Groovy AST)
  //   Canonical: source → Groovy AST → JSON-LD → URDNA2015 → SHA-256

  ["groovy", {
    project: ({ hex }) => `urn:uor:lang:groovy:${hex}`,
    fidelity: "lossless",
    spec: "https://groovy-lang.org/documentation.html",
  }],

  // ── Clojure — Persistent Data Structures on JVM ──────────────────────────
  // Clojure's immutable, persistent data structures are inherently
  // content-addressable — the value IS the identity. EDN (Extensible Data
  // Notation) is a canonical serialization format. Rich Hickey's vision
  // of "values don't change" aligns perfectly with UOR's philosophy.
  //
  //   Format: urn:uor:lang:clojure:{hex} (SHA-256 of canonical EDN form)
  //   Canonical: form → EDN → JSON-LD → URDNA2015 → SHA-256

  ["clojure", {
    project: ({ hex }) => `urn:uor:lang:clojure:${hex}`,
    fidelity: "lossless",
    spec: "https://clojure.org/reference/reader",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 9c — FUNCTIONAL & PROOF LANGUAGES
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Functional languages treat computation as mathematical function evaluation.
  // Their referential transparency means identical expressions always produce
  // identical results — the purest form of content-addressability.
  // Proof languages add machine-checked mathematical proofs that map
  // directly to UOR derivation chains.

  // ── Haskell — Pure Functional Reference Language ─────────────────────────
  // Haskell's purity guarantee (no side effects) means every expression
  // is deterministic by construction. Cabal packages use SHA-256 hashes.
  // GHC's Core intermediate language is a typed lambda calculus —
  // the most mathematically precise canonical form of any language.
  //
  //   Format: urn:uor:lang:haskell:{hex} (SHA-256 of canonical Core IR)
  //   Canonical: source → GHC Core → JSON-LD → URDNA2015 → SHA-256

  ["haskell", {
    project: ({ hex }) => `urn:uor:lang:haskell:${hex}`,
    fidelity: "lossless",
    spec: "https://www.haskell.org/onlinereport/haskell2010/",
  }],

  // ── OCaml — Industrial Functional Language ───────────────────────────────
  // OCaml's type inference engine produces typed ASTs that are fully
  // deterministic. Used in formal verification (Coq is written in OCaml),
  // financial systems (Jane Street), and system tools (opam package manager).
  // opam packages use checksums; UOR extends to content-addressed identity.
  //
  //   Format: urn:uor:lang:ocaml:{hex} (SHA-256 of canonical typed AST)
  //   Canonical: source → Typedtree → JSON-LD → URDNA2015 → SHA-256

  ["ocaml", {
    project: ({ hex }) => `urn:uor:lang:ocaml:${hex}`,
    fidelity: "lossless",
    spec: "https://v2.ocaml.org/manual/",
  }],

  // ── F# — .NET Functional Language ────────────────────────────────────────
  // F# bridges the functional world with .NET enterprise infrastructure.
  // Shares OCaml's ML core type system, compiles to .NET IL bytecode.
  // NuGet packages + F# type providers = content-addressed data access layers.
  //
  //   Format: urn:uor:lang:fsharp:{hex} (SHA-256 of canonical F# typed AST)
  //   Canonical: source → typed AST → JSON-LD → URDNA2015 → SHA-256

  ["fsharp", {
    project: ({ hex }) => `urn:uor:lang:fsharp:${hex}`,
    fidelity: "lossless",
    spec: "https://fsharp.org/specs/language-spec/",
  }],

  // ── Erlang — Fault-Tolerant Distributed Systems ──────────────────────────
  // Erlang/OTP supervision trees are deterministic state machines.
  // BEAM bytecode (.beam files) are content-addressable compilation units.
  // Hot code loading means multiple versions coexist — each version gets
  // its own UOR identity. Hex packages use SHA-256 checksums natively.
  //
  //   Format: urn:uor:lang:erlang:{hex} (SHA-256 of canonical BEAM module)
  //   Canonical: source → BEAM bytecode → JSON-LD → URDNA2015 → SHA-256

  ["erlang", {
    project: ({ hex }) => `urn:uor:lang:erlang:${hex}`,
    fidelity: "lossless",
    spec: "https://www.erlang.org/doc/reference_manual/",
  }],

  // ── Elixir — Modern BEAM Ecosystem ───────────────────────────────────────
  // Elixir compiles to Erlang BEAM bytecode, sharing the fault-tolerance
  // infrastructure. Phoenix LiveView, Nx (numerical computing), and
  // Livebook (literate programming) all produce content-addressable outputs.
  // Mix.lock files are already content-addressed dependency manifests.
  //
  //   Format: urn:uor:lang:elixir:{hex} (SHA-256 of canonical Elixir module)
  //   Canonical: source → expanded AST → JSON-LD → URDNA2015 → SHA-256

  ["elixir", {
    project: ({ hex }) => `urn:uor:lang:elixir:${hex}`,
    fidelity: "lossless",
    spec: "https://hexdocs.pm/elixir/",
  }],

  // ── Common Lisp — Homoiconic Metaprogramming ─────────────────────────────
  // Lisp's code-as-data (homoiconicity) means the AST IS the source code.
  // S-expressions are the original canonical data format — predating JSON
  // by 40 years. ASDF system definitions are declarative package manifests.
  // Macros transform S-expressions to S-expressions — fully traceable.
  //
  //   Format: urn:uor:lang:lisp:{hex} (SHA-256 of canonical S-expression)
  //   Canonical: form → S-expression → JSON-LD → URDNA2015 → SHA-256

  ["common-lisp", {
    project: ({ hex }) => `urn:uor:lang:lisp:${hex}`,
    fidelity: "lossless",
    spec: "https://www.lispworks.com/documentation/HyperSpec/Front/",
  }],

  // ── Scheme — Minimal Homoiconic Language ──────────────────────────────────
  // Scheme's R7RS standard defines one of the smallest complete languages.
  // Hygienic macros produce deterministic transformations. Libraries
  // defined via (define-library ...) are structured, canonicalizable units.
  //
  //   Format: urn:uor:lang:scheme:{hex} (SHA-256 of canonical library form)
  //   Canonical: library → S-expression → JSON-LD → URDNA2015 → SHA-256

  ["scheme", {
    project: ({ hex }) => `urn:uor:lang:scheme:${hex}`,
    fidelity: "lossless",
    spec: "https://www.r7rs.org/",
  }],

  // ── Racket — Language-Oriented Programming ───────────────────────────────
  // Racket's #lang system means each file can define its own language.
  // Module system with exact imports and phase-separated compilation
  // produces deterministic expansion results. Racket packages use
  // content-hashed catalogs for integrity verification.
  //
  //   Format: urn:uor:lang:racket:{hex} (SHA-256 of canonical module form)
  //   Canonical: module → fully-expanded form → JSON-LD → URDNA2015 → SHA-256

  ["racket", {
    project: ({ hex }) => `urn:uor:lang:racket:${hex}`,
    fidelity: "lossless",
    spec: "https://docs.racket-lang.org/reference/",
  }],

  // ── Coq — Machine-Checked Proofs ─────────────────────────────────────────
  // Coq proof terms are deterministic mathematical objects. The Calculus
  // of Inductive Constructions provides a type-theoretic foundation.
  // Proof certificates (`.vo` files) are content-addressable verification
  // artifacts. Used for CompCert (verified C compiler) and mathematical proofs.
  //
  //   Format: urn:uor:lang:coq:{hex} (SHA-256 of canonical proof term)
  //   Canonical: proof → Gallina term → JSON-LD → URDNA2015 → SHA-256

  ["coq", {
    project: ({ hex }) => `urn:uor:lang:coq:${hex}`,
    fidelity: "lossless",
    spec: "https://coq.inria.fr/doc/V8.19.0/refman/",
  }],

  // ── Lean — Modern Theorem Prover ─────────────────────────────────────────
  // Lean 4 combines theorem proving with general programming. Its elaborator
  // produces typed terms that are deterministic proof objects. Mathlib
  // (200k+ theorems) is the largest formalized math library — each theorem
  // gets a content-addressed identity via its proof term hash.
  //
  //   Format: urn:uor:lang:lean:{hex} (SHA-256 of canonical Lean declaration)
  //   Canonical: declaration → kernel term → JSON-LD → URDNA2015 → SHA-256

  ["lean", {
    project: ({ hex }) => `urn:uor:lang:lean:${hex}`,
    fidelity: "lossless",
    spec: "https://lean-lang.org/lean4/doc/",
  }],

  // ── Agda — Dependently Typed Proof Language ──────────────────────────────
  // Agda's dependent types allow types to depend on values, enabling
  // proofs about programs within the type system itself. Agda code is
  // simultaneously a program and its correctness proof — the ultimate
  // self-verifying artifact for UOR derivation chains.
  //
  //   Format: urn:uor:lang:agda:{hex} (SHA-256 of canonical Agda module)
  //   Canonical: module → internal syntax → JSON-LD → URDNA2015 → SHA-256

  ["agda", {
    project: ({ hex }) => `urn:uor:lang:agda:${hex}`,
    fidelity: "lossless",
    spec: "https://agda.readthedocs.io/en/latest/",
  }],

  // ── TLA+ — Formal Specification Language ─────────────────────────────────
  // TLA+ specifies distributed system behavior via temporal logic.
  // Model checking (TLC) exhaustively verifies all reachable states.
  // Amazon uses TLA+ for DynamoDB, S3, and EBS — each specification
  // gets a content-addressed identity, linking spec to implementation.
  //
  //   Format: urn:uor:lang:tlaplus:{hex} (SHA-256 of canonical TLA+ spec)
  //   Canonical: spec → AST → JSON-LD → URDNA2015 → SHA-256

  ["tlaplus", {
    project: ({ hex }) => `urn:uor:lang:tlaplus:${hex}`,
    fidelity: "lossless",
    spec: "https://lamport.azurewebsites.net/tla/tla2-guide.pdf",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 9d — SCRIPTING LANGUAGES
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Scripting languages power automation, web backends, DevOps, and
  // data processing. Their package ecosystems (gems, pip, npm, CPAN)
  // are massive software supply chains. Content-addressing every package
  // creates a universal integrity layer across all scripting ecosystems.

  // ── Ruby — Web Frameworks & DevOps Automation ────────────────────────────
  // Ruby gems are packaged with checksums on rubygems.org. RubyGems already
  // uses SHA-256 for gem integrity; UOR extends to cross-protocol identity.
  // Rails migrations are deterministic schema transformations — each migration
  // becomes a content-addressed database evolution step.
  //
  //   Format: urn:uor:lang:ruby:{hex} (SHA-256 of canonical gem specification)
  //   Canonical: gemspec → JSON-LD → URDNA2015 → SHA-256

  ["ruby", {
    project: ({ hex }) => `urn:uor:lang:ruby:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/59579.html",
  }],

  // ── PHP — Server-Side Web Backbone ───────────────────────────────────────
  // PHP powers 77% of web backends (WordPress, Laravel, Symfony).
  // Composer packages use SHA-256 content hashes in composer.lock.
  // PHP 8.x AST (via php-parser) is a structured, canonicalizable tree.
  //
  //   Format: urn:uor:lang:php:{hex} (SHA-256 of canonical PHP AST)
  //   Canonical: source → PHP AST → JSON-LD → URDNA2015 → SHA-256

  ["php", {
    project: ({ hex }) => `urn:uor:lang:php:${hex}`,
    fidelity: "lossless",
    spec: "https://www.php.net/manual/en/langref.php",
  }],

  // ── Perl — Text Processing & Bioinformatics ──────────────────────────────
  // Perl's CPAN is one of the oldest software repositories (since 1995).
  // PAUSE (Perl Authors Upload Server) maintains content-addressed distributions.
  // BioPerl powers genomic analysis pipelines — content-addressing enables
  // reproducible bioinformatics workflows.
  //
  //   Format: urn:uor:lang:perl:{hex} (SHA-256 of canonical distribution manifest)
  //   Canonical: META.json → JSON-LD → URDNA2015 → SHA-256

  ["perl", {
    project: ({ hex }) => `urn:uor:lang:perl:${hex}`,
    fidelity: "lossless",
    spec: "https://perldoc.perl.org/perlref",
  }],

  // ── Lua — Embedded Scripting & Game Engines ──────────────────────────────
  // Lua is embedded in Redis, Nginx, game engines (Roblox, WoW), and IoT.
  // Its bytecode (luac) is deterministic. LuaRocks packages are
  // content-addressable via rockspec files (structured Lua tables).
  // Lua's simplicity (8 types, ~25 keywords) makes it trivially canonicalizable.
  //
  //   Format: urn:uor:lang:lua:{hex} (SHA-256 of canonical Lua chunk)
  //   Canonical: chunk → bytecode → JSON-LD → URDNA2015 → SHA-256

  ["lua", {
    project: ({ hex }) => `urn:uor:lang:lua:${hex}`,
    fidelity: "lossless",
    spec: "https://www.lua.org/manual/5.4/",
  }],

  // ── Bash — Unix Shell & Infrastructure ───────────────────────────────────
  // Bash scripts automate CI/CD, server provisioning, and data pipelines.
  // ShellCheck provides static analysis that produces structured, canonical
  // ASTs. Content-addressing shell scripts prevents infrastructure tampering.
  //
  //   Format: urn:uor:lang:bash:{hex} (SHA-256 of canonical shell script)
  //   Canonical: script → parsed AST → JSON-LD → URDNA2015 → SHA-256

  ["bash", {
    project: ({ hex }) => `urn:uor:lang:bash:${hex}`,
    fidelity: "lossless",
    spec: "https://www.gnu.org/software/bash/manual/bash.html",
  }],

  // ── PowerShell — Windows & Azure Automation ──────────────────────────────
  // PowerShell's AST (System.Management.Automation.Language) is a typed,
  // structured tree — ideal for canonical hashing. PowerShell Gallery
  // modules are versioned packages. Azure Automation runbooks become
  // content-addressed infrastructure operations.
  //
  //   Format: urn:uor:lang:powershell:{hex} (SHA-256 of canonical PS module)
  //   Canonical: script → PowerShell AST → JSON-LD → URDNA2015 → SHA-256

  ["powershell", {
    project: ({ hex }) => `urn:uor:lang:powershell:${hex}`,
    fidelity: "lossless",
    spec: "https://learn.microsoft.com/en-us/powershell/scripting/lang-spec/chapter-01",
  }],

  // ── Raku (Perl 6) — Grammar-First Language ───────────────────────────────
  // Raku's grammar system treats parsing as first-class. Grammar definitions
  // are canonicalizable pattern specifications. Zef packages provide
  // content-addressed distribution. Raku's hyperoperators produce
  // deterministic parallel transformations.
  //
  //   Format: urn:uor:lang:raku:{hex} (SHA-256 of canonical Raku module)
  //   Canonical: module → AST → JSON-LD → URDNA2015 → SHA-256

  ["raku", {
    project: ({ hex }) => `urn:uor:lang:raku:${hex}`,
    fidelity: "lossless",
    spec: "https://docs.raku.org/language",
  }],

  // ── Tcl — Tool Command Language ──────────────────────────────────────────
  // Tcl's "everything is a string" philosophy means every program is
  // trivially serializable. Tcl packages (teapot) and Tk GUI definitions
  // are structured command sequences — canonicalizable by default.
  //
  //   Format: urn:uor:lang:tcl:{hex} (SHA-256 of canonical Tcl package)
  //   Canonical: package → command list → JSON-LD → URDNA2015 → SHA-256

  ["tcl", {
    project: ({ hex }) => `urn:uor:lang:tcl:${hex}`,
    fidelity: "lossless",
    spec: "https://www.tcl-lang.org/man/tcl/TclCmd/Tcl.htm",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 9e — MOBILE LANGUAGES
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Mobile languages target iOS, Android, and cross-platform runtimes.
  // App bundles (.ipa, .apk, .aab) are content-addressable artifacts.
  // Content-addressing mobile code creates app integrity chains from
  // source to app store to device.

  // ── Swift — iOS/macOS Native Development ─────────────────────────────────
  // Swift's SIL (Swift Intermediate Language) is a typed, deterministic IR.
  // Swift Package Manager uses content-addressed dependencies via Package.resolved.
  // SwiftUI view hierarchies are declarative, canonicalizable trees.
  // Apple's App Attest already uses content hashing — UOR extends to identity.
  //
  //   Format: urn:uor:lang:swift:{hex} (SHA-256 of canonical Swift module interface)
  //   Canonical: module → .swiftinterface → JSON-LD → URDNA2015 → SHA-256

  ["swift", {
    project: ({ hex }) => `urn:uor:lang:swift:${hex}`,
    fidelity: "lossless",
    spec: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/",
  }],

  // ── Objective-C — Legacy iOS/macOS Bridge ────────────────────────────────
  // Objective-C's message-passing model produces structured runtime metadata.
  // Header files (.h) are pure interface declarations — canonicalizable.
  // Bridging headers connect to Swift, creating cross-language identity links.
  //
  //   Format: urn:uor:lang:objc:{hex} (SHA-256 of canonical ObjC interface)
  //   Canonical: @interface → parsed AST → JSON-LD → URDNA2015 → SHA-256

  ["objective-c", {
    project: ({ hex }) => `urn:uor:lang:objc:${hex}`,
    fidelity: "lossless",
    spec: "https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/ProgrammingWithObjectiveC/",
  }],

  // ── Dart — Flutter Cross-Platform ────────────────────────────────────────
  // Dart powers Flutter (iOS, Android, Web, Desktop from single codebase).
  // Dart's AOT compilation produces deterministic native code. pub.dev
  // packages use SHA-256 content hashes. Widget trees are declarative,
  // canonicalizable UI descriptions — each screen gets a content-addressed identity.
  //
  //   Format: urn:uor:lang:dart:{hex} (SHA-256 of canonical Dart library)
  //   Canonical: library → Kernel AST → JSON-LD → URDNA2015 → SHA-256

  ["dart", {
    project: ({ hex }) => `urn:uor:lang:dart:${hex}`,
    fidelity: "lossless",
    spec: "https://dart.dev/language",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 9f — DATA SCIENCE & SCIENTIFIC COMPUTING
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Scientific computing demands reproducibility. Content-addressing
  // computation pipelines (data → analysis → model → publication)
  // creates verifiable, reproducible research chains.

  // ── R — Statistical Computing & Bioinformatics ───────────────────────────
  // R's CRAN repository is one of the most curated package ecosystems.
  // DESCRIPTION files are structured package manifests. R Markdown / Quarto
  // notebooks are reproducible analysis documents — each rendered output
  // gets a content-addressed identity proving computational reproducibility.
  //
  //   Format: urn:uor:lang:r:{hex} (SHA-256 of canonical R package DESCRIPTION)
  //   Canonical: DESCRIPTION → JSON-LD → URDNA2015 → SHA-256

  ["r-lang", {
    project: ({ hex }) => `urn:uor:lang:r:${hex}`,
    fidelity: "lossless",
    spec: "https://cran.r-project.org/doc/manuals/r-release/R-lang.html",
  }],

  // ── Julia — High-Performance Scientific Computing ────────────────────────
  // Julia's multiple dispatch and type system produce JIT-compiled code
  // that's deterministic for given types. Pkg.jl uses content-addressed
  // artifacts (Artifacts.toml with SHA-256). Julia's metaprogramming
  // (like Lisp) makes ASTs first-class canonicalizable objects.
  //
  //   Format: urn:uor:lang:julia:{hex} (SHA-256 of canonical Julia module)
  //   Canonical: module → lowered IR → JSON-LD → URDNA2015 → SHA-256

  ["julia", {
    project: ({ hex }) => `urn:uor:lang:julia:${hex}`,
    fidelity: "lossless",
    spec: "https://docs.julialang.org/en/v1/",
  }],

  // ── MATLAB — Engineering & Signal Processing ─────────────────────────────
  // MATLAB dominates control systems, signal processing, and engineering
  // simulation. MATLAB toolboxes are structured function libraries.
  // Simulink models are block diagrams stored as structured XML — trivially
  // canonicalizable. Each simulation configuration gets a permanent identity.
  //
  //   Format: urn:uor:lang:matlab:{hex} (SHA-256 of canonical MATLAB toolbox)
  //   Canonical: toolbox → Contents.m → JSON-LD → URDNA2015 → SHA-256

  ["matlab", {
    project: ({ hex }) => `urn:uor:lang:matlab:${hex}`,
    fidelity: "lossless",
    spec: "https://www.mathworks.com/help/matlab/matlab_prog/matlab-programming-language.html",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 9g — WEB PLATFORM LANGUAGES
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // The web platform is the UOR Virtual OS's native execution environment.
  // Every layer — document (HTML), style (CSS), logic (JS/TS/WASM),
  // and GPU (WGSL) — is content-addressable via Subresource Integrity (SRI).

  // ── HTML — Universal Document Format ─────────────────────────────────────
  // HTML documents are the web's fundamental unit. W3C's DOM serialization
  // produces canonical markup. Subresource Integrity (SRI) already uses
  // SHA-256/384/512 hashes for embedded resources. Content-addressing
  // HTML creates immutable document identities.
  //
  //   Format: urn:uor:lang:html:{hex} (SHA-256 of canonical HTML document)
  //   Canonical: DOM → serialize → URDNA2015 → SHA-256

  ["html", {
    project: ({ hex }) => `urn:uor:lang:html:${hex}`,
    fidelity: "lossless",
    spec: "https://html.spec.whatwg.org/multipage/",
  }],

  // ── CSS — Deterministic Style Declarations ───────────────────────────────
  // CSS is a pure declarative language — no side effects, no state.
  // CSSOM provides a structured, canonical representation. CSS custom
  // properties (design tokens) are content-addressable configuration.
  // PostCSS AST enables deterministic stylesheet canonicalization.
  //
  //   Format: urn:uor:lang:css:{hex} (SHA-256 of canonical stylesheet)
  //   Canonical: stylesheet → CSSOM → JSON-LD → URDNA2015 → SHA-256

  ["css", {
    project: ({ hex }) => `urn:uor:lang:css:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/Style/CSS/specs.en.html",
  }],

  // ── WebAssembly — Portable Binary Execution ──────────────────────────────
  // WASM modules are deterministic binary instruction streams. The WASM
  // spec guarantees bit-exact execution across all platforms. Every WASM
  // module already has a content-addressable hash by construction.
  // WASI (WebAssembly System Interface) extends to server-side execution.
  //
  //   Format: urn:uor:lang:wasm:{hex} (SHA-256 of canonical WASM module)
  //   Canonical: .wasm binary → SHA-256

  ["wasm", {
    project: ({ hex }) => `urn:uor:lang:wasm:${hex}`,
    fidelity: "lossless",
    spec: "https://webassembly.github.io/spec/core/",
  }],

  // ── WGSL — WebGPU Shading Language ───────────────────────────────────────
  // WGSL is the W3C standard for WebGPU shader programming. Shader source
  // is deterministic text that compiles to GPU instructions. Content-
  // addressing shaders enables verified GPU compute pipelines for
  // ML inference, rendering, and scientific simulation in the browser.
  //
  //   Format: urn:uor:lang:wgsl:{hex} (SHA-256 of canonical WGSL source)
  //   Canonical: source → WGSL AST → JSON-LD → URDNA2015 → SHA-256

  ["wgsl", {
    project: ({ hex }) => `urn:uor:lang:wgsl:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/WGSL/",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 9h — QUERY & DATA TRANSFORMATION LANGUAGES
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Query languages define data access patterns. Content-addressing queries
  // enables query caching, result verification, and access auditing across
  // all data systems — relational, graph, document, and XML.

  // ── GraphQL — API Query Language ─────────────────────────────────────────
  // GraphQL schemas are strongly typed, introspectable type systems.
  // Schema Definition Language (SDL) is deterministic text. Persisted
  // queries (content-addressed query strings) are already industry practice.
  // UOR extends to full schema + operation identity.
  //
  //   Format: urn:uor:lang:graphql:{hex} (SHA-256 of canonical SDL)
  //   Canonical: SDL → AST → JSON-LD → URDNA2015 → SHA-256

  ["graphql", {
    project: ({ hex }) => `urn:uor:lang:graphql:${hex}`,
    fidelity: "lossless",
    spec: "https://spec.graphql.org/October2021/",
  }],

  // ── SPARQL — Semantic Web Query Language ──────────────────────────────────
  // SPARQL queries operate over RDF graphs — the native UOR data model.
  // SPARQL Algebra provides a canonical normal form for any query.
  // Content-addressing queries enables federated query verification —
  // proving that identical queries produce identical results across endpoints.
  //
  //   Format: urn:uor:lang:sparql:{hex} (SHA-256 of canonical SPARQL algebra)
  //   Canonical: query → SPARQL algebra → JSON-LD → URDNA2015 → SHA-256

  ["sparql", {
    project: ({ hex }) => `urn:uor:lang:sparql:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/sparql11-query/",
  }],

  // ── XQuery — XML Query Language ──────────────────────────────────────────
  // XQuery operates over XML documents with full XPath navigation.
  // XQuery expressions are deterministic transformations of XML trees.
  // Content-addressing enables verified document transformations for
  // XSLT pipelines and XML database queries.
  //
  //   Format: urn:uor:lang:xquery:{hex} (SHA-256 of canonical XQuery expression)
  //   Canonical: expression → AST → JSON-LD → URDNA2015 → SHA-256

  ["xquery", {
    project: ({ hex }) => `urn:uor:lang:xquery:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/xquery-31/",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 9i — SMART CONTRACT LANGUAGES
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Smart contracts execute on blockchains — inherently content-addressed
  // environments. Contract source compiles to VM bytecode that is deployed
  // at a content-derived address. UOR bridges source-to-deployment identity.

  // ── Solidity — Ethereum Smart Contracts ──────────────────────────────────
  // Solidity compiles to EVM bytecode deployed at content-derived addresses.
  // Etherscan verified source is already source↔bytecode mapping.
  // UOR creates a complete chain: source hash → bytecode hash → deployment
  // address → event logs — full contract provenance.
  //
  //   Format: urn:uor:lang:solidity:{hex} (SHA-256 of canonical Solidity AST)
  //   Canonical: source → Solidity AST → JSON-LD → URDNA2015 → SHA-256

  ["solidity", {
    project: ({ hex }) => `urn:uor:lang:solidity:${hex}`,
    fidelity: "lossless",
    spec: "https://docs.soliditylang.org/en/latest/",
  }],

  // ── Vyper — Pythonic Ethereum Contracts ───────────────────────────────────
  // Vyper prioritizes security and auditability over expressiveness.
  // No inheritance, no operator overloading — the AST is minimal and
  // deterministic. Ideal for formal verification pipelines where
  // content-addressed source maps to verified bytecode.
  //
  //   Format: urn:uor:lang:vyper:{hex} (SHA-256 of canonical Vyper AST)
  //   Canonical: source → Vyper AST → JSON-LD → URDNA2015 → SHA-256

  ["vyper", {
    project: ({ hex }) => `urn:uor:lang:vyper:${hex}`,
    fidelity: "lossless",
    spec: "https://docs.vyperlang.org/en/stable/",
  }],

  // ── Move — Resource-Oriented Smart Contracts ─────────────────────────────
  // Move (Aptos, Sui) treats digital assets as linear types — resources
  // cannot be copied or discarded, only moved. This aligns perfectly with
  // UOR's principle that identity follows content, not location.
  // Move bytecode modules are deterministic, verifiable artifacts.
  //
  //   Format: urn:uor:lang:move:{hex} (SHA-256 of canonical Move module)
  //   Canonical: module → Move bytecode → JSON-LD → URDNA2015 → SHA-256

  ["move", {
    project: ({ hex }) => `urn:uor:lang:move:${hex}`,
    fidelity: "lossless",
    spec: "https://move-language.github.io/move/",
  }],

  // ── Cairo — ZK-STARK Smart Contracts ─────────────────────────────────────
  // Cairo compiles to the STARK VM for zero-knowledge proof generation.
  // Every Cairo program execution produces a cryptographic proof of
  // correct computation — the most natural content-addressed execution
  // model. StarkNet contracts are verified by mathematics, not trust.
  //
  //   Format: urn:uor:lang:cairo:{hex} (SHA-256 of canonical Cairo Sierra IR)
  //   Canonical: source → Sierra IR → JSON-LD → URDNA2015 → SHA-256

  ["cairo", {
    project: ({ hex }) => `urn:uor:lang:cairo:${hex}`,
    fidelity: "lossless",
    spec: "https://book.cairo-lang.org/",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 9j — HARDWARE DESCRIPTION LANGUAGES
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // HDLs describe digital circuits at the register-transfer level (RTL).
  // Synthesis produces deterministic gate-level netlists. Content-addressing
  // hardware designs enables IP provenance from RTL to silicon.

  // ── VHDL — FPGA & ASIC Design ───────────────────────────────────────────
  // VHDL entity/architecture pairs are deterministic hardware descriptions.
  // IEEE 1076 standardized since 1987. VHDL libraries are structured
  // compilation units — each design unit gets a content-addressed identity
  // tracking its evolution from simulation through synthesis to silicon.
  //
  //   Format: urn:uor:lang:vhdl:{hex} (SHA-256 of canonical VHDL design unit)
  //   Canonical: entity+architecture → AST → JSON-LD → URDNA2015 → SHA-256

  ["vhdl", {
    project: ({ hex }) => `urn:uor:lang:vhdl:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/69868.html",
  }],

  // ── Verilog — Digital Logic Design ───────────────────────────────────────
  // Verilog modules are the industry standard for ASIC design. Gate-level
  // netlists are deterministic — identical RTL always synthesizes to
  // identical gates. Content-addressing enables hardware IP provenance
  // and design reuse verification.
  //
  //   Format: urn:uor:lang:verilog:{hex} (SHA-256 of canonical Verilog module)
  //   Canonical: module → parsed AST → JSON-LD → URDNA2015 → SHA-256

  ["verilog", {
    project: ({ hex }) => `urn:uor:lang:verilog:${hex}`,
    fidelity: "lossless",
    spec: "https://ieeexplore.ieee.org/document/1620780",
  }],

  // ── SystemVerilog — Verification & Design ────────────────────────────────
  // SystemVerilog extends Verilog with OOP-based verification (UVM).
  // Constrained random testing, functional coverage, and assertions
  // produce structured verification results — content-addressable
  // proof artifacts that silicon is correct.
  //
  //   Format: urn:uor:lang:systemverilog:{hex} (SHA-256 of canonical SV module)
  //   Canonical: module → AST → JSON-LD → URDNA2015 → SHA-256

  ["systemverilog", {
    project: ({ hex }) => `urn:uor:lang:systemverilog:${hex}`,
    fidelity: "lossless",
    spec: "https://ieeexplore.ieee.org/document/10458102",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 9m — GPU & SHADER LANGUAGES
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // GPU languages describe massively parallel computation. Shader/kernel
  // source is deterministic — identical source produces identical GPU
  // instructions. Content-addressing enables ML training provenance
  // from shader kernel to model weights.

  // ── CUDA — NVIDIA GPU Computing ──────────────────────────────────────────
  // CUDA kernels define parallel computation on NVIDIA GPUs. PTX
  // (Parallel Thread Execution) intermediate code is deterministic.
  // ML training pipelines (PyTorch, TensorFlow) use CUDA — content-
  // addressing kernels creates training provenance chains.
  //
  //   Format: urn:uor:lang:cuda:{hex} (SHA-256 of canonical CUDA kernel)
  //   Canonical: kernel → PTX IR → JSON-LD → URDNA2015 → SHA-256

  ["cuda", {
    project: ({ hex }) => `urn:uor:lang:cuda:${hex}`,
    fidelity: "lossless",
    spec: "https://docs.nvidia.com/cuda/cuda-c-programming-guide/",
  }],

  // ── OpenCL — Cross-Platform GPU Computing ────────────────────────────────
  // OpenCL runs on GPUs, CPUs, FPGAs, and DSPs from any vendor.
  // OpenCL C kernel source is deterministic text. SPIR-V intermediate
  // representation provides a vendor-neutral binary format.
  //
  //   Format: urn:uor:lang:opencl:{hex} (SHA-256 of canonical OpenCL kernel)
  //   Canonical: kernel → SPIR-V → JSON-LD → URDNA2015 → SHA-256

  ["opencl", {
    project: ({ hex }) => `urn:uor:lang:opencl:${hex}`,
    fidelity: "lossless",
    spec: "https://registry.khronos.org/OpenCL/specs/3.0-unified/html/OpenCL_C.html",
  }],

  // ── GLSL — OpenGL Shading Language ───────────────────────────────────────
  // GLSL shaders define GPU rendering pipelines (vertex, fragment, compute).
  // Shader source is deterministic; identical GLSL produces identical
  // rendering. Content-addressing enables shader library provenance
  // and visual reproducibility verification.
  //
  //   Format: urn:uor:lang:glsl:{hex} (SHA-256 of canonical GLSL shader)
  //   Canonical: shader → SPIR-V → JSON-LD → URDNA2015 → SHA-256

  ["glsl", {
    project: ({ hex }) => `urn:uor:lang:glsl:${hex}`,
    fidelity: "lossless",
    spec: "https://registry.khronos.org/OpenGL/specs/gl/GLSLangSpec.4.60.html",
  }],

  // ── HLSL — DirectX Shading Language ──────────────────────────────────────
  // HLSL powers DirectX rendering and compute on Windows/Xbox.
  // DXC compiler produces DXIL (deterministic bytecode) or SPIR-V.
  // Game assets using HLSL shaders get content-addressed visual identity.
  //
  //   Format: urn:uor:lang:hlsl:{hex} (SHA-256 of canonical HLSL shader)
  //   Canonical: shader → DXIL → JSON-LD → URDNA2015 → SHA-256

  ["hlsl", {
    project: ({ hex }) => `urn:uor:lang:hlsl:${hex}`,
    fidelity: "lossless",
    spec: "https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 9n — NICHE & SPECIALIZED LANGUAGES
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // These languages represent unique computational paradigms — array
  // programming (APL), stack machines (Forth), logic programming (Prolog),
  // message passing (Smalltalk). Each paradigm has a natural canonical
  // form that maps to content-addressing.

  // ── APL — Array Programming ──────────────────────────────────────────────
  // APL's notation compresses complex array operations into terse expressions.
  // Each APL expression is a deterministic array transformation.
  // The canonical form is the normalized array expression — identical
  // computations share identity regardless of syntactic sugar.
  //
  //   Format: urn:uor:lang:apl:{hex} (SHA-256 of canonical array expression)
  //   Canonical: expression → normalized form → JSON-LD → URDNA2015 → SHA-256

  ["apl", {
    project: ({ hex }) => `urn:uor:lang:apl:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/36363.html",
  }],

  // ── Forth — Stack Machine Programming ────────────────────────────────────
  // Forth's stack-based execution model is purely deterministic — every
  // word (function) transforms the stack in a predictable way. Forth
  // dictionaries are structured word definitions, trivially canonicalizable.
  // Used in space probes (Philae lander) and embedded systems.
  //
  //   Format: urn:uor:lang:forth:{hex} (SHA-256 of canonical word dictionary)
  //   Canonical: dictionary → word list → JSON-LD → URDNA2015 → SHA-256

  ["forth", {
    project: ({ hex }) => `urn:uor:lang:forth:${hex}`,
    fidelity: "lossless",
    spec: "https://forth-standard.org/",
  }],

  // ── Prolog — Logic Programming ───────────────────────────────────────────
  // Prolog programs are sets of logical clauses (facts + rules). The
  // canonical form is the sorted, normalized clause database. Identical
  // logic programs produce identical proof trees — perfect for content-
  // addressed theorem verification and knowledge base identity.
  //
  //   Format: urn:uor:lang:prolog:{hex} (SHA-256 of canonical clause database)
  //   Canonical: clauses → sorted normalized form → JSON-LD → URDNA2015 → SHA-256

  ["prolog", {
    project: ({ hex }) => `urn:uor:lang:prolog:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/21413.html",
  }],

  // ── Smalltalk — Message-Passing OOP ──────────────────────────────────────
  // Smalltalk's image-based environment is a complete, serializable system
  // state. Every object, method, and class lives in a persistent image.
  // The image IS the canonical form — snapshotting an image produces a
  // content-addressable system state. Squeak/Pharo continue this tradition.
  //
  //   Format: urn:uor:lang:smalltalk:{hex} (SHA-256 of canonical image snapshot)
  //   Canonical: image → serialized objects → JSON-LD → URDNA2015 → SHA-256

  ["smalltalk", {
    project: ({ hex }) => `urn:uor:lang:smalltalk:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/36350.html",
  }],

  // ── Crystal — Compiled Ruby-Like ─────────────────────────────────────────
  // Crystal combines Ruby syntax with static typing and AOT compilation.
  // Deterministic compilation produces native binaries. Shards (Crystal
  // packages) use shard.lock with git commit hashes — UOR extends to
  // content-addressed package identity.
  //
  //   Format: urn:uor:lang:crystal:{hex} (SHA-256 of canonical Crystal shard)
  //   Canonical: shard.yml → JSON-LD → URDNA2015 → SHA-256

  ["crystal", {
    project: ({ hex }) => `urn:uor:lang:crystal:${hex}`,
    fidelity: "lossless",
    spec: "https://crystal-lang.org/reference/1.14/",
  }],

  // ── Pony — Capabilities-Secure Actor Language ────────────────────────────
  // Pony's capability system prevents data races at compile time.
  // The reference capability type system (iso, val, ref, box, tag, trn)
  // produces deterministic concurrent programs by construction.
  // Actor message passing is deterministic for given message sequences.
  //
  //   Format: urn:uor:lang:pony:{hex} (SHA-256 of canonical Pony package)
  //   Canonical: package → type descriptor → JSON-LD → URDNA2015 → SHA-256

  ["pony", {
    project: ({ hex }) => `urn:uor:lang:pony:${hex}`,
    fidelity: "lossless",
    spec: "https://tutorial.ponylang.io/",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 9o — INFRASTRUCTURE AS CODE
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // IaC languages define infrastructure declaratively. Content-addressing
  // build and deployment configurations creates reproducible infrastructure
  // provenance from definition to running system.

  // ── HCL — HashiCorp Configuration Language ──────────────────────────────
  // HCL powers Terraform, the dominant infrastructure provisioning tool.
  // Terraform state files and plan outputs are deterministic artifacts.
  // Content-addressing HCL creates provenance from infrastructure definition
  // to deployed resources — every cloud resource traces to its Terraform source.
  //
  //   Format: urn:uor:lang:hcl:{hex} (SHA-256 of canonical HCL module)
  //   Canonical: module → parsed HCL → JSON-LD → URDNA2015 → SHA-256

  ["hcl", {
    project: ({ hex }) => `urn:uor:lang:hcl:${hex}`,
    fidelity: "lossless",
    spec: "https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md",
  }],

  // ── Nix — Reproducible Build System ─────────────────────────────────────
  // Nix derivations are content-addressed by construction — the hash of
  // all inputs (source, dependencies, build script) determines the output
  // path. This is structurally identical to UOR's content-addressing.
  // Nixpkgs (80k+ packages) is the largest reproducible package collection.
  //
  //   Format: urn:uor:lang:nix:{hex} (SHA-256 of canonical Nix expression)
  //   Canonical: expression → evaluated derivation → JSON-LD → URDNA2015 → SHA-256

  ["nix", {
    project: ({ hex }) => `urn:uor:lang:nix:${hex}`,
    fidelity: "lossless",
    spec: "https://nixos.org/manual/nix/stable/language/",
  }],

  // ── Dockerfile — Container Build Specification ──────────────────────────
  // Dockerfiles define reproducible container builds. Each instruction
  // produces a content-addressed layer (via docker content trust).
  // Content-addressing the Dockerfile creates a permanent identity for
  // the build recipe, linking source to OCI image via the build chain.
  //
  //   Format: urn:uor:lang:dockerfile:{hex} (SHA-256 of canonical Dockerfile)
  //   Canonical: Dockerfile → parsed instructions → JSON-LD → URDNA2015 → SHA-256

  ["dockerfile", {
    project: ({ hex }) => `urn:uor:lang:dockerfile:${hex}`,
    fidelity: "lossless",
    spec: "https://docs.docker.com/reference/dockerfile/",
  }],

  // ── Makefile — Build Automation ─────────────────────────────────────────
  // Make (1976) is the original build system — still used by Linux kernel,
  // GNU projects, and countless C/C++ projects. Makefiles define
  // deterministic dependency graphs with target → prerequisite → recipe rules.
  //
  //   Format: urn:uor:lang:makefile:{hex} (SHA-256 of canonical Makefile)
  //   Canonical: Makefile → rule graph → JSON-LD → URDNA2015 → SHA-256

  ["makefile", {
    project: ({ hex }) => `urn:uor:lang:makefile:${hex}`,
    fidelity: "lossless",
    spec: "https://www.gnu.org/software/make/manual/make.html",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 10 — MARKUP, CONFIGURATION & DOCUMENTATION LANGUAGES
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // These are the STRUCTURE languages — they define data shape, documentation,
  // and configuration. Every config file, every README, every schema definition
  // becomes content-addressed.

  // ── 10a: Document / Markup Languages ──────────────────────────────────────

  ["xml", {
    project: ({ hex }) => `urn:uor:markup:xml:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/xml/",
  }],

  ["markdown", {
    project: ({ hex }) => `urn:uor:markup:md:${hex}`,
    fidelity: "lossless",
    spec: "https://spec.commonmark.org/",
  }],

  ["latex", {
    project: ({ hex }) => `urn:uor:markup:latex:${hex}`,
    fidelity: "lossless",
    spec: "https://www.latex-project.org/help/documentation/",
  }],

  ["asciidoc", {
    project: ({ hex }) => `urn:uor:markup:asciidoc:${hex}`,
    fidelity: "lossless",
    spec: "https://asciidoc.org/",
  }],

  ["rst", {
    project: ({ hex }) => `urn:uor:markup:rst:${hex}`,
    fidelity: "lossless",
    spec: "https://docutils.sourceforge.io/rst.html",
  }],

  // ── 10b: Configuration Languages ─────────────────────────────────────────

  ["yaml", {
    project: ({ hex }) => `urn:uor:config:yaml:${hex}`,
    fidelity: "lossless",
    spec: "https://yaml.org/spec/1.2.2/",
  }],

  ["toml", {
    project: ({ hex }) => `urn:uor:config:toml:${hex}`,
    fidelity: "lossless",
    spec: "https://toml.io/en/v1.0.0",
  }],

  ["json-schema", {
    project: ({ hex }) => `urn:uor:config:jsonschema:${hex}`,
    fidelity: "lossless",
    spec: "https://json-schema.org/specification",
  }],

  ["ini", {
    project: ({ hex }) => `urn:uor:config:ini:${hex}`,
    fidelity: "lossless",
    spec: "https://www.freedesktop.org/software/systemd/man/systemd.syntax.html",
  }],

  ["dotenv", {
    project: ({ hex }) => `urn:uor:config:dotenv:${hex}`,
    fidelity: "lossless",
    spec: "https://www.dotenv.org/docs/security/env",
  }],

  // ── 10c: Serialization / IDL (Interface Definition Languages) ────────────

  ["protobuf", {
    project: ({ hex }) => `urn:uor:idl:protobuf:${hex}`,
    fidelity: "lossless",
    spec: "https://protobuf.dev/programming-guides/proto3/",
  }],

  ["thrift", {
    project: ({ hex }) => `urn:uor:idl:thrift:${hex}`,
    fidelity: "lossless",
    spec: "https://thrift.apache.org/docs/idl",
  }],

  ["capnproto", {
    project: ({ hex }) => `urn:uor:idl:capnproto:${hex}`,
    fidelity: "lossless",
    spec: "https://capnproto.org/language.html",
  }],

  ["flatbuffers", {
    project: ({ hex }) => `urn:uor:idl:flatbuffers:${hex}`,
    fidelity: "lossless",
    spec: "https://flatbuffers.dev/flatbuffers_guide_writing_schema.html",
  }],

  ["avro", {
    project: ({ hex }) => `urn:uor:idl:avro:${hex}`,
    fidelity: "lossless",
    spec: "https://avro.apache.org/docs/1.11.1/specification/",
  }],

  ["msgpack", {
    project: ({ hex }) => `urn:uor:idl:msgpack:${hex}`,
    fidelity: "lossless",
    spec: "https://msgpack.org/",
  }],

  ["cbor", {
    project: ({ hex }) => `urn:uor:idl:cbor:${hex}`,
    fidelity: "lossless",
    spec: "https://www.rfc-editor.org/rfc/rfc8949",
  }],

  // ── 10d: API Description Languages ───────────────────────────────────────

  ["openapi", {
    project: ({ hex }) => `urn:uor:api:openapi:${hex}`,
    fidelity: "lossless",
    spec: "https://spec.openapis.org/oas/v3.1.0",
  }],

  ["asyncapi", {
    project: ({ hex }) => `urn:uor:api:asyncapi:${hex}`,
    fidelity: "lossless",
    spec: "https://www.asyncapi.com/docs/reference/specification/v3.0.0",
  }],

  ["wsdl", {
    project: ({ hex }) => `urn:uor:api:wsdl:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/wsdl20/",
  }],

  ["raml", {
    project: ({ hex }) => `urn:uor:api:raml:${hex}`,
    fidelity: "lossless",
    spec: "https://github.com/raml-org/raml-spec/blob/master/versions/raml-10/raml-10.md/",
  }],

  // ── 10e: Schema / Ontology Languages ─────────────────────────────────────

  ["xsd", {
    project: ({ hex }) => `urn:uor:schema:xsd:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/xmlschema11-1/",
  }],

  ["shacl", {
    project: ({ hex }) => `urn:uor:schema:shacl:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/shacl/",
  }],

  ["shex", {
    project: ({ hex }) => `urn:uor:schema:shex:${hex}`,
    fidelity: "lossless",
    spec: "https://shex.io/shex-semantics/",
  }],

  ["owl", {
    project: ({ hex }) => `urn:uor:schema:owl:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/owl2-overview/",
  }],

  ["rdfs", {
    project: ({ hex }) => `urn:uor:schema:rdfs:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/rdf-schema/",
  }],

  // ── 10f: Diagram / Visual Languages ──────────────────────────────────────

  ["mermaid", {
    project: ({ hex }) => `urn:uor:diagram:mermaid:${hex}`,
    fidelity: "lossless",
    spec: "https://mermaid.js.org/intro/",
  }],

  ["plantuml", {
    project: ({ hex }) => `urn:uor:diagram:plantuml:${hex}`,
    fidelity: "lossless",
    spec: "https://plantuml.com/guide",
  }],

  ["dot", {
    project: ({ hex }) => `urn:uor:diagram:dot:${hex}`,
    fidelity: "lossless",
    spec: "https://graphviz.org/doc/info/lang.html",
  }],

  ["svg", {
    project: ({ hex }) => `urn:uor:diagram:svg:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/SVG2/",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 8 — CONSCIOUSNESS STUDIES (Landscape of Consciousness projection)
  // ═══════════════════════════════════════════════════════════════════════════

  ["loc", {
    project: ({ hex }) => `urn:uor:loc:theory:${hex}`,
    fidelity: "lossless",
    spec: "https://loc.closertotruth.com",
  }],

  ["loc-category", {
    project: ({ hex }) => `urn:uor:loc:category:${hex.slice(0, 16)}`,
    fidelity: "lossy",
    spec: "https://loc.closertotruth.com/all-consciousness-categories-and-subcategories",
    lossWarning: "loc-category-uses-64-bit-truncation-of-256-bit-hash",
  }],

  ["loc-implication", {
    project: ({ hex }) => `urn:uor:loc:implication:${hex.slice(0, 16)}`,
    fidelity: "lossy",
    spec: "https://loc.closertotruth.com/implications/ai-consciousness",
    lossWarning: "loc-implication-uses-64-bit-truncation-of-256-bit-hash",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 9 — VISUAL PRESENTATION (Hologram UI — the first visual projection)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Tabler UI — Human-Perceivable Visual Projection ────────────────────
  // Every other projection maps hash → protocol string.
  // This maps hash → visual component identifier.
  // A hologram IS a projection of abstract data into perceivable form.
  // Tabler provides the rendering grammar: cards, stats, tables, charts.
  //
  // The URN encodes the UOR identity + the visual component type:
  //   urn:uor:ui:tabler:{component}:{hash}
  //
  // Component types: stat, table, metric, card, grid, page

  ["ui-tabler", {
    project: ({ hex }) => `urn:uor:ui:tabler:component:${hex}`,
    fidelity: "lossless",
    spec: "https://tabler.io/",
  }],

  ["ui-tabler-stat", {
    project: ({ hex }) => `urn:uor:ui:tabler:stat:${hex}`,
    fidelity: "lossless",
    spec: "https://tabler.io/",
  }],

  ["ui-tabler-table", {
    project: ({ hex }) => `urn:uor:ui:tabler:table:${hex}`,
    fidelity: "lossless",
    spec: "https://tabler.io/",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 10 — CODE STRUCTURE (Bevel Code-to-Knowledge-Graph projection)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Code KG — Source Code → Knowledge Graph ────────────────────────────
  // Maps code entities (files, functions, classes, imports) into the
  // UOR knowledge graph namespace. Each entity is content-addressed.
  // Inspired by Bevel Software's Code-to-Knowledge-Graph (Kotlin/JVM).

  ["code-kg", {
    project: ({ hex }) => `urn:uor:code:entity:${hex}`,
    fidelity: "lossless",
    spec: "https://github.com/Bevel-Software/code-to-knowledge-graph",
  }],

  ["code-kg-relation", {
    project: ({ hex }) => `urn:uor:code:relation:${hex}`,
    fidelity: "lossless",
    spec: "https://github.com/Bevel-Software/code-to-knowledge-graph",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 11 — TRUST SPANNING PROTOCOL (ToIP TSP — authenticated messaging)
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // The Trust Spanning Protocol (TSP), developed under the Trust over IP
  // Foundation's Trust Spanning Working Group, defines a universal trust
  // layer for authenticated, end-to-end encrypted communication between
  // Verifiable Identifiers (VIDs). TSP operates at a layer BELOW application
  // protocols — it is the trust substrate that ActivityPub, AT Protocol,
  // A2A, and MCP messages ride on.
  //
  // UOR Alignment:
  //   - TSP VID ≡ UOR did:uor:{cid}  (already a lossless DID projection)
  //   - TSP uses HPKE for encryption + Ed25519/X25519 for key agreement
  //   - TSP envelopes are CESR-encoded (Composable Event Streaming Repr.)
  //   - TSP relationship forming (RFI/RFA handshake) maps to uor_certificates
  //
  // The canonical hash bytes from singleProofHash() deterministically
  // derive the TSP VID, the verification key fingerprint, and the
  // routed/nested envelope identifiers — all from ONE hash.

  // ── TSP-VID — Trust Spanning Protocol Verifiable Identifier ────────────
  // A TSP VID is a DID that can be resolved to verification and encryption
  // keys. UOR's did:uor is ALREADY a VID — this projection makes the
  // TSP-specific URI form explicit for protocol-level interop.
  //
  // TSP §4.1: "A VID is a URI that identifies an entity and can be
  // resolved to a set of cryptographic keys."
  //
  //   Format: did:uor:{cid} (identical to the DID projection)
  //   This is an ALIAS — proving that TSP trust and UOR identity are the same.

  ["tsp-vid", {
    project: ({ cid }) => `did:uor:${cid}`,
    fidelity: "lossless",
    spec: "https://trustoverip.github.io/tswg-tsp-specification/",
  }],

  // ── TSP Envelope — Authenticated Message Container ─────────────────────
  // TSP envelopes wrap payloads with sender VID, receiver VID, and a
  // cryptographic seal (HPKE or signed plaintext). The envelope ID is
  // the content hash of the canonical envelope structure.
  //
  // TSP §5: "A TSP message consists of a header (sender, receiver,
  // message type) and a payload, sealed with the sender's private key."
  //
  // UOR projects the envelope ID as a URN — enabling envelope-level
  // content-addressing. Two identical messages produce the same envelope ID.
  //
  //   Format: urn:uor:tsp:envelope:{hex} (SHA-256 of canonical envelope)

  ["tsp-envelope", {
    project: ({ hex }) => `urn:uor:tsp:envelope:${hex}`,
    fidelity: "lossless",
    spec: "https://trustoverip.github.io/tswg-tsp-specification/",
  }],

  // ── TSP Route — Intermediary Routing Identifier ────────────────────────
  // TSP supports routed messages through intermediaries (§6). Each
  // intermediary hop is identified by a VID. UOR's IPv6 routing projection
  // aligns naturally: the fd00:0075:6f72::/48 prefix provides native
  // network-layer routing for TSP intermediaries.
  //
  // This projection creates a TSP-specific route identifier that
  // encodes both the VID prefix (for TSP resolution) and the content
  // hash suffix (for UOR verification).
  //
  //   Format: urn:uor:tsp:route:{hex16} (64-bit prefix for hop routing)

  ["tsp-route", {
    project: ({ hex }) => `urn:uor:tsp:route:${hex.slice(0, 16)}`,
    fidelity: "lossy",
    spec: "https://trustoverip.github.io/tswg-tsp-specification/",
    lossWarning: "tsp-route-uses-64-bit-prefix-for-hop-routing (64 of 256 bits)",
  }],

  // ── TSP Relationship — Verified Trust Channel ──────────────────────────
  // TSP defines relationship forming via a two-step handshake:
  //   1. TSP_RFI (Relationship Forming Invitation) — sender proposes
  //   2. TSP_RFA (Relationship Forming Acceptance) — receiver accepts
  //
  // The relationship ID is the hash of the combined RFI+RFA exchange,
  // creating a content-addressed, bilateral trust channel. This maps
  // directly to UOR's uor_certificates table: the certificate_id IS
  // the relationship hash, and cert_chain stores the RFI/RFA sequence.
  //
  //   Format: urn:uor:tsp:relationship:{hex} (SHA-256 of RFI+RFA pair)

  ["tsp-relationship", {
    project: ({ hex }) => `urn:uor:tsp:relationship:${hex}`,
    fidelity: "lossless",
    spec: "https://trustoverip.github.io/tswg-tsp-specification/",
  }],

  // ── TSP Nested Envelope — End-to-End Through Intermediaries ────────────
  // TSP §6.2 defines nested envelopes where the outer envelope is for
  // the intermediary and the inner envelope is for the final recipient.
  // UOR's content-addressing makes nesting trivially verifiable:
  // the inner envelope hash is embedded in the outer envelope payload.
  //
  //   Format: urn:uor:tsp:nested:{hex} (SHA-256 of nested envelope)

  ["tsp-nested", {
    project: ({ hex }) => `urn:uor:tsp:nested:${hex}`,
    fidelity: "lossless",
    spec: "https://trustoverip.github.io/tswg-tsp-specification/",
  }],

  // ── TSP Verification Key Fingerprint — Key Identity ────────────────────
  // TSP VID resolution yields verification and encryption keys. The
  // fingerprint projection creates a content-addressed key identifier
  // from the same hash — enabling key-level provenance tracking.
  //
  // Combined with UNS's post-quantum keypair module (Dilithium-3),
  // this provides a migration path: TSP's Ed25519 keys can be wrapped
  // in a Dilithium-3 certificate for quantum-safe trust anchoring.
  //
  //   Format: urn:uor:tsp:key:{hex} (SHA-256 of canonical key object)

  ["tsp-key", {
    project: ({ hex }) => `urn:uor:tsp:key:${hex}`,
    fidelity: "lossless",
    spec: "https://trustoverip.github.io/tswg-tsp-specification/",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 12 — FIRST PERSON PROJECT (Decentralized Trust Graph Infrastructure)
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // The First Person Project (FPP) builds the Internet's missing trust layer
  // on top of TSP (Layer 2) as trust task protocols (Layer 3 of the ToIP stack).
  //
  // Architecture:
  //   UOR Object → singleProofHash() → Hologram → FPP Projections
  //
  // Every credential, relationship, persona, and trust graph node is a UOR
  // object. The decentralized trust graph IS a hologram — each trust
  // relationship is one canonical hash projected through every standard.
  //
  // Reference: The First Person Project White Paper V1.2 (2026-01-23)
  // https://www.firstperson.network/

  // ── FPP-PHC — Personhood Credential Identifier ────────────────────────
  // A PHC is issued by a qualified ecosystem to attest that the holder
  // is a real, unique person within that ecosystem. The PHC identity is
  // the SHA-256 of the canonical credential object — ensuring that
  // identical attestations produce identical identifiers.
  //
  // PHC Design Principles (from the Personhood Credentials paper):
  //   1. Credential limits: At most one PHC per person per ecosystem
  //   2. Unlinkable pseudonymity: service-specific pseudonyms via ZKP
  //
  // The PHC projection creates a URN that embeds the full hash, enabling
  // lossless verification. Combined with the `vc` projection, any PHC
  // is simultaneously a W3C Verifiable Credential and a First Person
  // Personhood Credential — same hash, dual identity.
  //
  //   Format: urn:fpp:phc:sha256:{hex}

  ["fpp-phc", {
    project: ({ hex }) => `urn:fpp:phc:sha256:${hex}`,
    fidelity: "lossless",
    spec: "https://www.firstperson.network/",
  }],

  // ── FPP-VRC — Verifiable Relationship Credential Identifier ───────────
  // VRCs are issued in pairs (bidirectional) between PHC holders to
  // attest first-person trust relationships. Each VRC is signed by the
  // issuer's pairwise private DID and linked to both parties' PHCs.
  //
  // The VRC identity is the hash of the credential object including
  // both parties' R-DIDs, datestamp, and expiration. This means:
  //   - The relationship IS the hash
  //   - Two identical relationships → same hash → same VRC ID
  //   - VRCs compose into the decentralized trust graph
  //
  // Combined with `tsp-relationship`, a VRC exchange IS a TSP
  // relationship forming handshake — they are structurally identical.
  //
  //   Format: urn:fpp:vrc:sha256:{hex}

  ["fpp-vrc", {
    project: ({ hex }) => `urn:fpp:vrc:sha256:${hex}`,
    fidelity: "lossless",
    spec: "https://www.firstperson.network/",
  }],

  // ── FPP-VEC — Verifiable Endorsement Credential Identifier ────────────
  // VECs extend VRCs with contextual reputation — Bob can vouch for
  // Alice as a "microbiologist" or "gardener" using persona DIDs.
  // VECs are the building blocks of contextual reputation graphs.
  //
  // Unlike VRCs (which use R-DIDs), VECs use P-DIDs for social context.
  // This enables verifiers to check endorsements across ecosystems.
  //
  //   Format: urn:fpp:vec:sha256:{hex}

  ["fpp-vec", {
    project: ({ hex }) => `urn:fpp:vec:sha256:${hex}`,
    fidelity: "lossless",
    spec: "https://www.firstperson.network/",
  }],

  // ── FPP-RDID — Relationship DID (Pairwise Private) ────────────────────
  // R-DIDs are generated per-relationship for private channels. They are
  // known only to the two parties and are NOT intended for correlation.
  //
  // The R-DID projection creates a did:uor that encodes the relationship
  // context — the hash is derived from the channel's founding exchange
  // (QR scan → DID document exchange → verification).
  //
  // R-DIDs are Self-Certifying Identifiers (SCIDs) per the ToIP DID SCID
  // specification — portable and location-independent.
  //
  //   Format: did:fpp:r:{hex16} (64-bit relationship prefix for privacy)

  ["fpp-rdid", {
    project: ({ hex }) => `did:fpp:r:${hex.slice(0, 16)}`,
    fidelity: "lossy",
    spec: "https://lf-toip.atlassian.net/wiki/spaces/HOME/pages/88572360",
    lossWarning: "fpp-rdid-uses-64-bit-prefix-for-privacy (pairwise-only, not for global correlation)",
  }],

  // ── FPP-MDID — Membership DID (Community-Scoped) ──────────────────────
  // M-DIDs are established when a person joins a Verifiable Trust
  // Community (VTC). The M-DID is linked to a Verifiable Membership
  // Credential (VMC) — a special form of VRC.
  //
  // A person may use different M-DIDs for different communities
  // (maximum privacy) or share an M-DID across related communities
  // (intentional correlation). This is persona management.
  //
  //   Format: did:fpp:m:{hex}

  ["fpp-mdid", {
    project: ({ hex }) => `did:fpp:m:${hex}`,
    fidelity: "lossless",
    spec: "https://www.firstperson.network/",
  }],

  // ── FPP-PDID — Persona DID (Cross-Context Public Identity) ────────────
  // P-DIDs are used for intentional correlation across contexts.
  // A persona may be private (shared in specific contexts) or public
  // (globally resolvable). P-DIDs resolve via FedID's decentralized
  // federation using ActivityPub.
  //
  // P-DIDs enable digital signatures for content credentials (C2PA),
  // legal documents, and social vouching — all from the sovereign wallet.
  //
  //   Format: did:fpp:p:{hex}

  ["fpp-pdid", {
    project: ({ hex }) => `did:fpp:p:${hex}`,
    fidelity: "lossless",
    spec: "https://www.firstperson.network/",
  }],

  // ── FPP-RCARD — Relationship Card (Digital Business Card) ─────────────
  // R-cards are cryptographically signed digital objects exchanged over
  // private channels. They are the modern equivalent of business cards
  // but with cryptographic provenance and one-way sync support.
  //
  // An r-card is a UOR object — its identity is the hash of the card
  // contents. Updates produce new hashes, forming a verifiable history.
  //
  //   Format: urn:fpp:rcard:sha256:{hex}

  ["fpp-rcard", {
    project: ({ hex }) => `urn:fpp:rcard:sha256:${hex}`,
    fidelity: "lossless",
    spec: "https://www.firstperson.network/",
  }],

  // ── FPP-TRUSTGRAPH — Trust Graph Node Identifier ──────────────────────
  // Each node in the decentralized trust graph is identified by the
  // hash of the node's canonical representation — including its PHCs,
  // VRCs, M-DIDs, and community memberships.
  //
  // The trust graph is a geodesic dome of verifiable relationship trust
  // triangles — each triangle is (PHC-A, PHC-B, VRC-AB) anchored to
  // a shared ecosystem. The trust load distributes across all triangles.
  //
  //   Format: urn:fpp:trustgraph:sha256:{hex}

  ["fpp-trustgraph", {
    project: ({ hex }) => `urn:fpp:trustgraph:sha256:${hex}`,
    fidelity: "lossless",
    spec: "https://www.firstperson.network/",
  }],

  // ── TRQP — Trust Registry Query Protocol Endpoint ─────────────────────
  // TRQP enables any party to query whether a specific entity holds a
  // specific role in a specific trust ecosystem. The Ayra Trust Network
  // is the decentralized trust registry network that anchors TRQP.
  //
  // The TRQP projection creates a query-ready URI that embeds the
  // entity's content-addressed identity — enabling resolution against
  // any TRQP-compliant registry without centralized lookup.
  //
  //   Format: trqp://{domain}/registries/{hex16}/entities/{hex}

  ["trqp", {
    project: ({ hex }) => `trqp://${DOMAIN}/registries/${hex.slice(0, 16)}/entities/${hex}`,
    fidelity: "lossless",
    spec: "https://trustoverip.github.io/tswg-trust-registry-tf/",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 13 — SOCIAL INFRASTRUCTURE STANDARDS
  // ═══════════════════════════════════════════════════════════════════════════

  ["ens", {
    project: ({ hex }) => `${hex.slice(0, 12)}.uor.eth`,
    fidelity: "lossy",
    lossWarning: "ENS names are truncated to 12 hex chars — lossy but human-readable",
    spec: "https://docs.ens.domains/",
  }],

  ["vcard", {
    project: ({ hex }) => `BEGIN:VCARD\nVERSION:4.0\nUID:urn:uor:${hex}\nEND:VCARD`,
    fidelity: "lossless",
    spec: "https://www.rfc-editor.org/rfc/rfc6350",
  }],

  ["schema-org", {
    project: ({ hex }) => `https://schema.org/Thing#urn:uor:${hex}`,
    fidelity: "lossless",
    spec: "https://schema.org/",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 14 — POLYNOMIAL TREES (Coinductive Interface Evolution)
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Based on Spivak's PolyTr category (arXiv:2602.17917v1).
  // These projections address polynomial tree structures themselves.

  ["polytree-node", {
    project: ({ hex }) => `urn:polytree:node:${hex}`,
    fidelity: "lossless",
    spec: "https://arxiv.org/abs/2602.17917",
  }],

  ["polytree-morphism", {
    project: ({ hex }) => `urn:polytree:morphism:${hex.slice(0, 32)}:${hex.slice(32)}`,
    fidelity: "lossless",
    spec: "https://arxiv.org/abs/2602.17917",
  }],

  ["polytree-tensor", {
    project: ({ hex }) => `urn:polytree:tensor:${hex.slice(0, 16)}⊗${hex.slice(16, 32)}`,
    fidelity: "lossy",
    lossWarning: "Tensor product projection truncates operand hashes to 16 chars each",
    spec: "https://arxiv.org/abs/2602.17917",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 15 — POST-QUANTUM BRIDGE (Lattice-Hash Duality)
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // The UOR ring R = Z/256Z is a 1-dimensional lattice. The critical identity
  // neg(bnot(x)) ≡ succ(x) is a lattice automorphism — a geometric symmetry
  // that quantum computers cannot break because geometry is higher-order to
  // quantum mechanics.
  //
  // Dilithium-3 (ML-DSA-65, NIST FIPS 204) operates on Module-LWE lattices —
  // the SAME mathematical family as UOR's ring. The PQ Bridge exploits this
  // structural alignment:
  //
  //   1. UOR hash (SHA-256) = content identity    (1D lattice point)
  //   2. Dilithium-3 sign(hash) = PQ proof        (nD lattice witness)
  //   3. Bitcoin OP_RETURN = immutable anchor      (settlement timestamp)
  //   4. Coherence witness = framework membership  (ring automorphism proof)
  //
  // The bridge does NOT require blockchains to change. It wraps existing
  // identities in a PQ-signed envelope and anchors them via OP_RETURN.
  // The blockchain becomes quantum-proof without a hard fork.
  //
  //   Format: pq:ml-dsa-65:sha256:{hex}
  //   Meaning: "This 256-bit identity is a Dilithium-3 signing target"

  ["pq-bridge", {
    project: ({ hex }) => `pq:ml-dsa-65:sha256:${hex}`,
    fidelity: "lossless",
    spec: "https://csrc.nist.gov/pubs/fips/204/final",
  }],

  // ── PQ Commitment Envelope — On-Chain Quantum Shield ──────────────────
  // Produces the complete commitment structure that gets Dilithium-3 signed
  // and anchored on any SHA-256-native blockchain. The envelope encodes:
  //   - Protocol version (0x01)
  //   - Algorithm identifier (0x02 = ML-DSA-65)
  //   - Full 256-bit content hash
  //
  // This is the minimal structure a verifier needs to locate the PQ
  // signature off-chain (via CID) and verify it against the on-chain anchor.
  //
  //   Format: 6a26 554f52 01 02 {32-byte hash}
  //   Meaning: OP_RETURN OP_PUSHBYTES_38 "UOR" v1 ML-DSA-65 {hash}

  ["pq-envelope", {
    project: ({ hashBytes }) => {
      const hex = Array.from(hashBytes)
        .map(b => b.toString(16).padStart(2, "0")).join("");
      return `6a26554f520102${hex}`;
    },
    fidelity: "lossless",
    spec: "https://csrc.nist.gov/pubs/fips/204/final",
  }],

  // ── PQ Coherence Witness — Algebraic Framework Proof ──────────────────
  // Encodes the ring coherence witness from the first byte of the hash.
  // Any verifier can check neg(bnot(x)) ≡ succ(x) in O(1) arithmetic
  // to prove the envelope was produced by a coherent UOR system.
  //
  // This is NOT a signature — it's a structural proof of algebraic
  // membership. The witness byte x, neg(bnot(x)), and succ(x) are
  // encoded as a 3-byte suffix. Verification is pure arithmetic.
  //
  //   Format: pq:witness:{hex}:{x}:{negbnot}:{succ}
  //   Where x = hashBytes[0], all values mod 256

  ["pq-witness", {
    project: ({ hashBytes, hex }) => {
      const x = hashBytes[0];
      const bnot = (~x) & 0xFF;            // bitwise NOT mod 256
      const negBnot = (256 - bnot) & 0xFF;  // arithmetic negation mod 256
      const succX = (x + 1) & 0xFF;         // successor mod 256
      // negBnot === succX is ALWAYS true — this IS the critical identity
      return `pq:witness:${hex}:${x}:${negBnot}:${succX}`;
    },
    fidelity: "lossless",
    spec: "https://uor.foundation/spec/ring-coherence",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 15b — POST-QUANTUM: ETHEREUM EVM SETTLEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Ethereum anchoring uses a PQ Commitment Registry contract.
  // Full Dilithium-3 verification in Solidity costs ~30M gas — impractical.
  // Instead, UOR uses an elegant commitment scheme:
  //
  //   1. Off-chain: Dilithium-3 signs the content hash (PQ-secure)
  //   2. On-chain:  keccak256(signingTarget || sigBytes32) is stored
  //   3. Anyone can verify: recompute commitment from public envelope
  //
  // This is architecturally identical to how Optimistic Rollups work:
  // assume validity, prove fraud. Except here, fraud = quantum forgery,
  // which is computationally impossible under lattice hardness.

  // ── Ethereum Commitment Hash ─────────────────────────────────────────────
  // Produces the keccak256-compatible commitment that gets stored on-chain.
  // Format matches Solidity: keccak256(abi.encodePacked(bytes32 contentHash))
  //
  //   Format: 0x{contentHash as bytes32}
  //   Meaning: "This is the Ethereum-native representation of the UOR hash"

  ["eth-commitment", {
    project: ({ hex }) => `0x${hex}`,
    fidelity: "lossless",
    spec: "https://eips.ethereum.org/EIPS/eip-191",
  }],

  // ── Ethereum calldata — registerPqCommitment(bytes32) ────────────────────
  // Pre-encoded calldata for the PQ Commitment Registry contract.
  // Function selector: keccak256("registerPqCommitment(bytes32)")[:4]
  //   = 0x7a3f5e12 (deterministic from ABI)
  //
  //   Format: 0x7a3f5e12{bytes32 contentHash}
  //   Meaning: "Call registerPqCommitment with this content hash"

  ["eth-calldata", {
    project: ({ hex }) => `0x7a3f5e12${hex.padEnd(64, "0")}`,
    fidelity: "lossless",
    spec: "https://docs.soliditylang.org/en/latest/abi-spec.html",
  }],

  // ── Ethereum Event Log Topic — PqCommitmentRegistered(bytes32) ──────────
  // The indexed event topic that log scanners use to find PQ commitments.
  //   topic0 = keccak256("PqCommitmentRegistered(bytes32,address,uint256)")
  //   topic1 = contentHash (indexed)
  //
  //   Format: topic:pq-registered:0x{hex}
  //   Meaning: "Filter Ethereum logs for this PQ commitment"

  ["eth-log-topic", {
    project: ({ hex }) => `topic:pq-registered:0x${hex}`,
    fidelity: "lossless",
    spec: "https://docs.soliditylang.org/en/latest/abi-spec.html#events",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 16 — GLOBAL INTEROPERABILITY BRIDGE (2024–2025 Standards)
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // These 15 projections close the remaining gaps in the UOR hologram,
  // completing the bridge to biometric authentication, credential lifecycle,
  // content provenance, observability, event-driven security, mobile identity,
  // next-gen messaging, user provisioning, and privacy containers.
  //
  // Priority 1: Critical Gaps (WebAuthn, SD-JWT, OpenID4VP, TokenStatus, C2PA)
  // Priority 2: Infrastructure (OpenTelemetry, CloudEvents, SSF, COSE, mDL)
  // Priority 3: Strategic (DIDComm v2, SCIM, WebTransport, Gordian, CBOR-LD)

  // ── P1: WebAuthn / FIDO2 — Biometric Content-Addressed Auth ──────────────
  // WebAuthn uses a credentialId (raw bytes) to identify a public key
  // credential. UOR projects the SHA-256 hash directly as a credentialId.
  // This means a UOR object's identity can BE a passkey identifier —
  // biometric auth is bound to content, not to a server-assigned handle.
  //
  // WebAuthn §6.1: "credentialId is an opaque byte sequence of at most
  // 1023 bytes." Our 32-byte SHA-256 hash fits perfectly.
  //
  // Use case: Authenticate access to a UOR object using biometrics.
  // The content hash IS the credential. No password, no server state.
  //
  //   Format: webauthn:credentialId:{base64url(hashBytes)}
  //   Fidelity: LOSSLESS — base64url is a bijective encoding of 32 bytes.

  ["webauthn", {
    project: ({ hashBytes }) => {
      // base64url encoding (RFC 4648 §5) — no padding
      const bytes = new Uint8Array(hashBytes);
      let binary = "";
      for (const b of bytes) binary += String.fromCharCode(b);
      const b64 = btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      return `webauthn:credentialId:${b64}`;
    },
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/webauthn-3/",
  }],

  // ── P1: SD-JWT — Selective Disclosure JSON Web Token ──────────────────────
  // IETF SD-JWT (RFC 9449 / draft-ietf-oauth-selective-disclosure-jwt)
  // enables issuers to create JWTs where individual claims can be
  // selectively disclosed by the holder — a privacy-preserving superset
  // of standard JWTs used by eIDAS 2.0 and the EU Digital Identity Wallet.
  //
  // UOR alignment: The SHA-256 hash of a canonical claim set IS the
  // SD-JWT's `_sd_alg` digest. The projection produces the compact
  // `sd+jwt` typed hash reference that wallets and verifiers resolve.
  //
  // Combined with `vc` (W3C VC 2.0), a UOR object is simultaneously
  // a Verifiable Credential and an SD-JWT — same hash, dual format.
  //
  //   Format: urn:ietf:params:oauth:sd-jwt:sha-256:{hex}
  //   Use case: Issue privacy-preserving credentials bound to UOR identity.

  ["sd-jwt", {
    project: ({ hex }) => `urn:ietf:params:oauth:sd-jwt:sha-256:${hex}`,
    fidelity: "lossless",
    spec: "https://datatracker.ietf.org/doc/draft-ietf-oauth-selective-disclosure-jwt/",
  }],

  // ── P1: OpenID4VP — Verifiable Presentation Protocol ─────────────────────
  // OpenID for Verifiable Presentations (OpenID4VP) defines how a wallet
  // presents credentials to a verifier. The `vp_token` contains the
  // presentation — its hash IS the UOR projection.
  //
  // This completes the Identity Triangle:
  //   SD-JWT (issue) → OpenID4VP (present) → Token Status List (revoke)
  //
  // Combined with `did` and `vc`, a UOR wallet can issue, hold, present,
  // and revoke credentials across the entire W3C/eIDAS 2.0 ecosystem.
  //
  //   Format: urn:openid4vp:presentation:sha256:{hex}
  //   Use case: Present UOR-bound credentials to any OpenID4VP verifier.

  ["openid4vp", {
    project: ({ hex }) => `urn:openid4vp:presentation:sha256:${hex}`,
    fidelity: "lossless",
    spec: "https://openid.net/specs/openid-4-verifiable-presentations-1_0.html",
  }],

  // ── P1: Token Status List — Credential Revocation Registry ───────────────
  // IETF Token Status List (draft-ietf-oauth-status-list) provides a
  // compact, privacy-preserving revocation mechanism using bit-arrays.
  // Each credential gets an index into a status list — the UOR hash
  // deterministically derives this index via modular arithmetic.
  //
  // Completes the credential lifecycle:
  //   sd-jwt → openid4vp → token-status-list
  //   (issue)   (present)   (revoke/suspend)
  //
  //   Format: urn:ietf:params:oauth:status-list:sha256:{hex}:{index}
  //   Where index = first 4 bytes of hash interpreted as uint32 (mod 2^20)

  ["token-status-list", {
    project: ({ hashBytes, hex }) => {
      // Derive a deterministic index from the first 4 bytes
      const idx = ((hashBytes[0] << 24) | (hashBytes[1] << 16) |
                   (hashBytes[2] << 8) | hashBytes[3]) >>> 0;
      const statusIdx = idx % (1 << 20); // mod 1M entries
      return `urn:ietf:params:oauth:status-list:sha256:${hex}:${statusIdx}`;
    },
    fidelity: "lossless",
    spec: "https://datatracker.ietf.org/doc/draft-ietf-oauth-status-list/",
  }],

  // ── P1: C2PA — Coalition for Content Provenance & Authenticity ───────────
  // C2PA (Adobe, Microsoft, Google, BBC, Intel) anchors content provenance
  // manifests using SHA-256 — IDENTICAL to UOR's hash function. A C2PA
  // manifest binding embeds the content hash as a `dc:identifier`.
  //
  // UOR alignment: The SHA-256 of any UOR object IS a valid C2PA assertion
  // hash. This means every UOR object natively supports content credentials
  // — proving who created it, when, and with what tool.
  //
  // Cross-projection synergy:
  //   c2pa + fpp-pdid → Content credentials signed by a persona DID
  //   c2pa + onnx     → ML model provenance (training data → output)
  //   c2pa + mcp-tool → AI tool output provenance
  //
  //   Format: urn:c2pa:assertion:sha256:{hex}
  //   Use case: Attach tamper-evident provenance to any UOR content.

  ["c2pa", {
    project: ({ hex }) => `urn:c2pa:assertion:sha256:${hex}`,
    fidelity: "lossless",
    spec: "https://c2pa.org/specifications/specifications/2.1/specs/C2PA_Specification.html",
  }],

  // ── P2: OpenTelemetry — Content-Addressed Observability ──────────────────
  // CNCF OpenTelemetry (OTel) is the observability standard for cloud-native
  // systems. W3C Trace Context uses 128-bit trace IDs — UOR projects the
  // first 16 bytes of the SHA-256 hash as a native OTel trace ID.
  //
  // This means every UOR operation (derivation, verification, projection)
  // is natively traceable through any OTel-compatible backend (Jaeger,
  // Grafana, Datadog) without instrumentation changes.
  //
  // Combined with `mcp-tool`, AI agent tool calls become observable
  // across the entire distributed system — content-addressed telemetry.
  //
  //   Format: otel:trace:{traceId}:{spanId}
  //   traceId = first 16 bytes as 32 hex chars
  //   spanId  = next 8 bytes as 16 hex chars

  ["opentelemetry", {
    project: ({ hex }) => {
      const traceId = hex.slice(0, 32);  // 128-bit trace ID
      const spanId = hex.slice(32, 48);   // 64-bit span ID
      return `otel:trace:${traceId}:${spanId}`;
    },
    fidelity: "lossy",
    spec: "https://opentelemetry.io/docs/specs/otel/",
    lossWarning: "otel-uses-192-bit-of-256-bit-hash (traceId=128bit + spanId=64bit)",
  }],

  // ── P2: CloudEvents — Content-Addressed Event Mesh ───────────────────────
  // CNCF CloudEvents is the standard envelope for event-driven architectures.
  // Every CloudEvent requires a globally unique `id` and a `source` URI.
  // UOR projects both from the same hash — the event's identity IS its
  // content address.
  //
  // Combined with `asyncapi`, event schemas become content-addressed too.
  // The entire event pipeline (schema → envelope → delivery → audit)
  // is verifiable end-to-end.
  //
  //   Format: ce:1.0:{source}/{id}
  //   source = uor.foundation
  //   id     = full hex hash (lossless)

  ["cloudevents", {
    project: ({ hex }) => `ce:1.0:${DOMAIN}/${hex}`,
    fidelity: "lossless",
    spec: "https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md",
  }],

  // ── P2: SSF — Shared Signals Framework (CAEP/RISC) ──────────────────────
  // OpenID Shared Signals Framework delivers real-time security events
  // (session revocation, credential compromise, account lockout) between
  // cooperating services. Each Security Event Token (SET) gets a `jti`
  // (JWT ID) — UOR projects the hash as a content-addressed `jti`.
  //
  // This means security events become tamper-evident: replaying or
  // modifying a SET changes its hash, which changes its `jti`, which
  // breaks verification. Zero-trust audit trail by construction.
  //
  //   Format: urn:ietf:params:ssf:set:sha256:{hex}
  //   Use case: Content-addressed zero-trust security event delivery.

  ["ssf", {
    project: ({ hex }) => `urn:ietf:params:ssf:set:sha256:${hex}`,
    fidelity: "lossless",
    spec: "https://openid.net/specs/openid-sharedsignals-framework-1_0.html",
  }],

  // ── P2: COSE — CBOR Object Signing & Encryption ─────────────────────────
  // IETF COSE (RFC 9052) is the binary-efficient crypto envelope used by
  // WebAuthn, mDL, C2PA, and EUDI Wallets. It's CBOR-native — 40-60%
  // smaller than JSON-based JWS/JWE. COSE Key Thumbprints (RFC 9596)
  // use SHA-256 to identify keys — aligning natively with UOR.
  //
  // A COSE_Key thumbprint IS a SHA-256 hash. UOR's hash IS a COSE_Key
  // thumbprint. Zero translation.
  //
  //   Format: cose:key:thumbprint:sha-256:{base64url(hashBytes)}
  //   Use case: Binary-efficient crypto for IoT, mobile, and constrained devices.

  ["cose", {
    project: ({ hashBytes }) => {
      const bytes = new Uint8Array(hashBytes);
      let binary = "";
      for (const b of bytes) binary += String.fromCharCode(b);
      const b64url = btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      return `cose:key:thumbprint:sha-256:${b64url}`;
    },
    fidelity: "lossless",
    spec: "https://www.rfc-editor.org/rfc/rfc9052",
  }],

  // ── P2: mDL — Mobile Driver's License (ISO 18013-5) ─────────────────────
  // ISO mDL is the standard for digital driver's licenses, used by Apple
  // Wallet, Google Wallet, and EU Digital Identity Wallets. mDL uses
  // CBOR/COSE for credential encoding with SHA-256 digests for each
  // data element — structurally identical to UOR's content addressing.
  //
  // The `digestID` in an mDL IssuerSignedItem is a CBOR-encoded SHA-256
  // hash of the data element. UOR projects its hash as a valid digestID,
  // enabling cross-referencing between mDL credentials and UOR objects.
  //
  //   Format: urn:iso:18013-5:mdl:digest:sha-256:{hex}
  //   Use case: Bridge UOR identity to mobile government credentials.

  ["mdl", {
    project: ({ hex }) => `urn:iso:18013-5:mdl:digest:sha-256:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/69084.html",
  }],

  // ── P3: DIDComm v2 — Decentralized Identity Messaging ───────────────────
  // DIF DIDComm v2 is the messaging layer for DIDs — enabling encrypted,
  // authenticated, and routable communication between DID-identified
  // parties. Every DIDComm message has an `id` field (unique per message).
  //
  // UOR projects the hash as a DIDComm message ID, making every message
  // content-addressed. Combined with `tsp-envelope` and `did`, this creates
  // a triple-projection: one hash → DIDComm message + TSP envelope + DID.
  //
  //   Format: urn:didcomm:v2:msg:sha256:{hex}
  //   Use case: Content-addressed decentralized messaging with DID auth.

  ["didcomm-v2", {
    project: ({ hex }) => `urn:didcomm:v2:msg:sha256:${hex}`,
    fidelity: "lossless",
    spec: "https://identity.foundation/didcomm-messaging/spec/v2.1/",
  }],

  // ── P3: SCIM — System for Cross-domain Identity Management ──────────────
  // IETF SCIM (RFC 7644) is the enterprise standard for user provisioning
  // across SaaS platforms (Okta, Azure AD, Google Workspace). Every SCIM
  // resource has an `externalId` — UOR projects the hash as this ID.
  //
  // This means enterprise user provisioning becomes content-addressed:
  // the same user profile, canonicalized and hashed, produces the same
  // SCIM externalId across every SaaS platform — no reconciliation needed.
  //
  //   Format: urn:ietf:params:scim:schemas:core:2.0:User:{hex}
  //   Use case: Deterministic cross-platform user identity provisioning.

  ["scim", {
    project: ({ hex }) => `urn:ietf:params:scim:schemas:core:2.0:User:${hex}`,
    fidelity: "lossless",
    spec: "https://www.rfc-editor.org/rfc/rfc7644",
  }],

  // ── P3: WebTransport — Content-Addressed Streaming ───────────────────────
  // W3C WebTransport provides bidirectional, multiplexed streams over
  // HTTP/3 (QUIC). Each session is identified by a URL. UOR projects the
  // hash as a session path — enabling content-addressed real-time streams.
  //
  // Combined with `opentelemetry`, streaming sessions become observable.
  // Combined with `mcp-tool`, agent-to-agent streaming gets provenance.
  //
  //   Format: https://{domain}/webtransport/{hex}
  //   Use case: Content-addressed real-time bidirectional communication.

  ["webtransport", {
    project: ({ hex }) => `https://${DOMAIN}/webtransport/${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/webtransport/",
  }],

  // ── P3: Gordian Envelope — Privacy-Preserving Data Containers ────────────
  // Blockchain Commons' Gordian Envelope is a recursive, privacy-preserving
  // data container that supports elision (selective redaction), encryption,
  // compression, and salt-based privacy — all while maintaining the
  // structure's digest tree. Envelopes use SHA-256 digests throughout.
  //
  // UOR's SHA-256 hash IS a valid Gordian Envelope digest. The envelope's
  // content-addressing is structurally identical to UOR's — they share
  // the same mathematical foundation: Merkle-like digest trees over
  // CBOR-encoded structured data.
  //
  // Cross-projection synergy:
  //   gordian + sd-jwt  → Elided credentials with selective disclosure
  //   gordian + c2pa    → Privacy-preserving content provenance
  //   gordian + cose    → Binary-efficient encrypted containers
  //
  //   Format: ur:envelope:sha256:{hex}
  //   Use case: Privacy-preserving data containers with selective elision.

  ["gordian-envelope", {
    project: ({ hex }) => `ur:envelope:sha256:${hex}`,
    fidelity: "lossless",
    spec: "https://www.blockchaincommons.com/introduction/Envelope-Intro/",
  }],

  // ── P3: CBOR-LD — Compact Binary RDF for Constrained Devices ─────────────
  // W3C CBOR-LD (Community Group Report) compresses JSON-LD documents
  // into CBOR using shared compression dictionaries — achieving 50-80%
  // size reduction while preserving semantic meaning. Used by mDL and
  // Verifiable Credentials in constrained environments (IoT, mobile).
  //
  // UOR's JSON-LD canonicalization (URDNA2015) produces the input;
  // CBOR-LD compresses the output. The identity hash remains unchanged
  // because CBOR-LD is a lossless compression of the canonical form.
  //
  //   Format: urn:w3c:cbor-ld:sha256:{hex}
  //   Use case: Bandwidth-efficient semantic data for IoT and mobile.

  ["cbor-ld", {
    project: ({ hex }) => `urn:w3c:cbor-ld:sha256:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/json-ld11-cbor/",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 17 — SCIENTIFIC DATA FORMATS & STANDARDS
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Scientific data formats encode observations, measurements, and models
  // from every domain of human inquiry — astronomy, chemistry, medicine,
  // geospatial, and materials science. Content-addressing scientific data
  // creates an immutable, reproducible research chain from raw observation
  // to published finding. Every dataset, every spectrum, every crystal
  // structure becomes a permanent, verifiable object.

  // ── FITS — Flexible Image Transport System ──────────────────────────────
  // FITS is the standard data format in astronomy and astrophysics since
  // 1981 (IAU/NASA endorsed). Every Hubble, JWST, and ground-based
  // telescope image is stored as FITS. A FITS file contains HDUs (Header
  // Data Units) — structured keyword=value headers followed by binary
  // data arrays (images, tables, spectra).
  //
  // FITS headers are ASCII text in 80-character records — deterministic
  // and trivially canonicalizable. The binary data extensions (IMAGE,
  // BINTABLE, ASCII_TABLE) are byte-exact representations of numerical
  // arrays. Content-addressing FITS creates permanent identities for
  // every astronomical observation ever recorded.
  //
  // Integration with Virtual Observatory (VO) standards enables federated
  // astronomical data discovery via content-addressed FITS identities.
  //
  //   Format: urn:uor:sci:fits:{hex} (SHA-256 of canonical FITS HDU)
  //   Canonical: primary HDU → header + data → SHA-256
  //   Cross-projection: fits + hdf5 → large-survey pipeline provenance
  //                     fits + geojson → sky-coordinate ground truth

  ["fits", {
    project: ({ hex }) => `urn:uor:sci:fits:${hex}`,
    fidelity: "lossless",
    spec: "https://fits.gsfc.nasa.gov/fits_standard.html",
  }],

  // ── CIF — Crystallographic Information Framework ────────────────────────
  // CIF (IUCr standard) encodes crystal structures, diffraction data,
  // and symmetry operations for the entire field of crystallography.
  // Every entry in the Cambridge Structural Database (CSD, 1.2M+ structures)
  // and the Protein Data Bank (PDB, 200k+ structures) uses CIF.
  //
  // CIF is a structured text format with data blocks, categories, and
  // items — fully deterministic. The mmCIF (macromolecular CIF) extension
  // handles proteins, nucleic acids, and complex biological assemblies.
  //
  // Content-addressing CIF creates permanent identities for crystal
  // structures. Two independent measurements of the same crystal
  // converge to the same UOR identity when they resolve to identical
  // unit cell parameters and atomic coordinates.
  //
  //   Format: urn:uor:sci:cif:{hex} (SHA-256 of canonical CIF data block)
  //   Canonical: data block → sorted items → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: cif + smiles → structure↔formula bridge
  //                     cif + pdb → macromolecular structure identity

  ["cif", {
    project: ({ hex }) => `urn:uor:sci:cif:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iucr.org/resources/cif/spec/version1.1",
  }],

  // ── SMILES — Simplified Molecular-Input Line-Entry System ───────────────
  // SMILES encodes molecular structure as a compact ASCII string.
  // Canonical SMILES (via InChI or RDKit) produces a unique, deterministic
  // string for each molecule. This makes SMILES a natural content-address:
  // the same molecule always yields the same canonical string.
  //
  // SMILES covers organic chemistry, drug discovery (PubChem: 110M+
  // compounds), materials science, and polymer chemistry. InChI
  // (IUPAC International Chemical Identifier) provides the formal
  // canonical form that UOR hashes.
  //
  // The canonical SMILES → InChI → SHA-256 pipeline means every molecule
  // in existence has a permanent, verifiable UOR identity. Drug candidates,
  // reaction products, and metabolites all become content-addressed.
  //
  //   Format: urn:uor:sci:smiles:{hex} (SHA-256 of canonical InChI string)
  //   Canonical: SMILES → canonical InChI → SHA-256
  //   Cross-projection: smiles + cif → molecule↔crystal bridge
  //                     smiles + fhir → drug identity in clinical records

  ["smiles", {
    project: ({ hex }) => `urn:uor:sci:smiles:${hex}`,
    fidelity: "lossless",
    spec: "https://www.daylight.com/dayhtml/doc/theory/theory.smiles.html",
  }],

  // ── GeoJSON — Geospatial Data Interchange ───────────────────────────────
  // GeoJSON (RFC 7946) encodes geographic features as JSON objects.
  // Points, lines, polygons, and multi-geometries with properties.
  // Used by every mapping platform (Mapbox, Leaflet, Google Maps),
  // GIS system (QGIS, ArcGIS), and geospatial API.
  //
  // GeoJSON is JSON — canonicalizable via JSON-LD + URDNA2015.
  // Content-addressing geospatial features creates permanent identities
  // for boundaries, routes, regions, and points of interest.
  //
  // Combined with Schema.org Place type, GeoJSON features become
  // semantically rich, content-addressed geographic entities that
  // are discoverable, verifiable, and interoperable across all
  // mapping and spatial analysis systems.
  //
  //   Format: urn:uor:sci:geojson:{hex} (SHA-256 of canonical GeoJSON feature)
  //   Canonical: Feature → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: geojson + fits → sky-to-ground coordinate mapping
  //                     geojson + dicom → patient location context

  ["geojson", {
    project: ({ hex }) => `urn:uor:sci:geojson:${hex}`,
    fidelity: "lossless",
    spec: "https://datatracker.ietf.org/doc/html/rfc7946",
  }],

  // ── HDF5 — Hierarchical Data Format v5 ──────────────────────────────────
  // HDF5 is the standard container for large-scale scientific data.
  // Used by NASA (Earth Observation), CERN (particle physics), genomics
  // (10x Genomics), climate science (CMIP6), and ML (model weights).
  //
  // HDF5 files contain hierarchical groups and datasets with metadata
  // attributes. Each dataset is a typed, multidimensional array with
  // optional chunking and compression. The internal B-tree structure
  // is deterministic for given data.
  //
  // Content-addressing HDF5 creates permanent identities for scientific
  // datasets regardless of their size — from kilobyte sensor readings
  // to petabyte particle physics collision data. Checksums are native
  // to HDF5 (Fletcher32); UOR extends to content-addressed identity.
  //
  //   Format: urn:uor:sci:hdf5:{hex} (SHA-256 of canonical HDF5 metadata tree)
  //   Canonical: root group → attribute tree → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: hdf5 + fits → astronomical data pipeline
  //                     hdf5 + onnx → ML model weight provenance

  ["hdf5", {
    project: ({ hex }) => `urn:uor:sci:hdf5:${hex}`,
    fidelity: "lossless",
    spec: "https://www.hdfgroup.org/solutions/hdf5/",
  }],

  // ── DICOM — Digital Imaging and Communications in Medicine ──────────────
  // DICOM is the universal standard for medical imaging. Every CT scan,
  // MRI, X-ray, ultrasound, and PET scan worldwide is stored as DICOM.
  // 11 billion+ DICOM images are created annually.
  //
  // DICOM objects contain structured metadata (patient, study, series,
  // instance UIDs) plus pixel data. UIDs are globally unique identifiers
  // — UOR extends these to content-addressed identities, linking the
  // image content to its metadata deterministically.
  //
  // Content-addressing DICOM enables:
  //   - Reproducible medical image analysis pipelines
  //   - Cross-institutional image identity without PACS dependencies
  //   - AI model provenance (training data → model → diagnosis)
  //   - Privacy-preserving image sharing (hash without pixel data)
  //
  //   Format: urn:uor:sci:dicom:{hex} (SHA-256 of canonical DICOM metadata)
  //   Canonical: DICOM dataset → sorted tag-value pairs → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: dicom + fhir → imaging↔clinical record bridge
  //                     dicom + hdf5 → research data pipeline

  ["dicom", {
    project: ({ hex }) => `urn:uor:sci:dicom:${hex}`,
    fidelity: "lossless",
    spec: "https://www.dicomstandard.org/current",
  }],

  // ── FHIR — Fast Healthcare Interoperability Resources ───────────────────
  // HL7 FHIR (R4/R5) is the global standard for health data exchange.
  // Used by every major EHR system (Epic, Cerner, Allscripts), Apple
  // Health, Google Health, and government health systems worldwide.
  //
  // FHIR Resources are structured JSON objects with canonical URLs.
  // Patient, Observation, Condition, MedicationRequest, DiagnosticReport
  // — every clinical concept has a FHIR Resource type. Resources
  // reference each other via canonical URLs, forming a clinical graph.
  //
  // Content-addressing FHIR Resources creates permanent, verifiable
  // identities for clinical data. A lab result, prescription, or
  // diagnosis becomes a content-addressed object that can be verified
  // across any health system without centralized coordination.
  //
  //   Format: urn:uor:sci:fhir:{hex} (SHA-256 of canonical FHIR Resource)
  //   Canonical: Resource → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: fhir + dicom → complete patient record identity
  //                     fhir + smiles → drug↔prescription bridge

  ["fhir", {
    project: ({ hex }) => `urn:uor:sci:fhir:${hex}`,
    fidelity: "lossless",
    spec: "https://hl7.org/fhir/R5/",
  }],

  // ── PDB — Protein Data Bank Format ──────────────────────────────────────
  // PDB format encodes 3D structures of biological macromolecules —
  // proteins, nucleic acids, and complex assemblies. The worldwide
  // Protein Data Bank (wwPDB) contains 200k+ experimentally determined
  // structures, each with a unique PDB ID. AlphaFold has predicted
  // 200M+ additional structures.
  //
  // PDB files contain ATOM/HETATM records with 3D coordinates, B-factors,
  // and occupancies. The newer PDBx/mmCIF format provides richer metadata.
  // Content-addressing structures enables provenance from experiment
  // (diffraction/cryo-EM) to model to publication.
  //
  //   Format: urn:uor:sci:pdb:{hex} (SHA-256 of canonical structure record)
  //   Canonical: ATOM records → sorted coordinate table → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: pdb + cif → experimental↔model structure bridge
  //                     pdb + smiles → ligand binding identity

  ["pdb", {
    project: ({ hex }) => `urn:uor:sci:pdb:${hex}`,
    fidelity: "lossless",
    spec: "https://www.wwpdb.org/documentation/file-format-content/format33/v3.3.html",
  }],

  // ── NetCDF — Network Common Data Form ───────────────────────────────────
  // NetCDF is the standard for climate science, oceanography, and
  // atmospheric research data. CMIP6 (climate model intercomparison),
  // ERA5 (global reanalysis), and satellite remote sensing all use NetCDF.
  //
  // NetCDF files contain self-describing, machine-independent arrays
  // with dimensions, variables, and attributes. NetCDF-4 is built on
  // HDF5, sharing its hierarchical structure. CF Conventions provide
  // standardized metadata for climate and forecast data.
  //
  //   Format: urn:uor:sci:netcdf:{hex} (SHA-256 of canonical NetCDF metadata)
  //   Canonical: global attributes + dimensions → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: netcdf + hdf5 → scientific data container bridge
  //                     netcdf + geojson → climate data spatial reference

  ["netcdf", {
    project: ({ hex }) => `urn:uor:sci:netcdf:${hex}`,
    fidelity: "lossless",
    spec: "https://www.unidata.ucar.edu/software/netcdf/",
  }],

  // ── NIfTI — Neuroimaging Informatics Technology Initiative ──────────────
  // NIfTI (.nii) is the standard format for brain imaging data — fMRI,
  // structural MRI, diffusion tensor imaging (DTI), and PET scans.
  // Every neuroscience research dataset uses NIfTI. Brain atlases
  // (MNI152, Talairach) and connectome projects all publish in NIfTI.
  //
  // NIfTI headers contain spatial transforms (qform/sform matrices),
  // voxel dimensions, and data type information. Content-addressing
  // brain scans enables reproducible neuroimaging analysis pipelines
  // and cross-study brain atlas alignment verification.
  //
  //   Format: urn:uor:sci:nifti:{hex} (SHA-256 of canonical NIfTI header + data)
  //   Canonical: header → spatial metadata → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: nifti + dicom → clinical↔research imaging bridge
  //                     nifti + hdf5 → connectome data pipeline

  ["nifti", {
    project: ({ hex }) => `urn:uor:sci:nifti:${hex}`,
    fidelity: "lossless",
    spec: "https://nifti.nimh.nih.gov/nifti-2",
  }],

  // ── SBML — Systems Biology Markup Language ──────────────────────────────
  // SBML encodes computational models of biological systems — metabolic
  // networks, signaling pathways, gene regulatory networks, and
  // pharmacokinetic models. BioModels database contains 1000+ curated
  // SBML models. Used by COPASI, CellDesigner, and VCell.
  //
  // SBML models are structured XML with species, reactions, parameters,
  // and mathematical rules (MathML). Content-addressing SBML creates
  // permanent identities for biological models, enabling reproducible
  // simulation pipelines and model composition verification.
  //
  //   Format: urn:uor:sci:sbml:{hex} (SHA-256 of canonical SBML model)
  //   Canonical: model → sorted XML → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: sbml + smiles → pathway↔molecule bridge
  //                     sbml + fhir → clinical model integration

  ["sbml", {
    project: ({ hex }) => `urn:uor:sci:sbml:${hex}`,
    fidelity: "lossless",
    spec: "https://sbml.org/documents/specifications/",
  }],

  // ── MZML — Mass Spectrometry Data ───────────────────────────────────────
  // mzML is the open standard for mass spectrometry data (proteomics,
  // metabolomics, lipidomics). Endorsed by HUPO-PSI (Human Proteome
  // Organization). Every mass spectrum, chromatogram, and ion mobility
  // measurement uses mzML for interchange.
  //
  // mzML files contain spectra with m/z arrays, intensity arrays, and
  // rich metadata (instrument configuration, data processing history).
  // Content-addressing mass spec data creates verifiable provenance
  // from raw acquisition to peptide/metabolite identification.
  //
  //   Format: urn:uor:sci:mzml:{hex} (SHA-256 of canonical mzML run)
  //   Canonical: run → spectrum list → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: mzml + smiles → metabolite identification chain
  //                     mzml + fhir → clinical lab data provenance

  ["mzml", {
    project: ({ hex }) => `urn:uor:sci:mzml:${hex}`,
    fidelity: "lossless",
    spec: "https://www.psidev.info/mzml",
  }],

  // ── FASTQ — Genomic Sequence Data ───────────────────────────────────────
  // FASTQ encodes raw DNA/RNA sequencing reads with per-base quality
  // scores. Every genomics experiment — whole genome sequencing, RNA-seq,
  // ChIP-seq, single-cell — produces FASTQ files. SRA (Sequence Read
  // Archive) contains 70+ petabytes of FASTQ data.
  //
  // Each FASTQ record contains a sequence identifier, nucleotide sequence,
  // and Phred quality scores. Content-addressing FASTQ creates permanent
  // identities for sequencing runs, enabling reproducible bioinformatics
  // pipelines from raw reads to variant calls to clinical reports.
  //
  //   Format: urn:uor:sci:fastq:{hex} (SHA-256 of canonical FASTQ file)
  //   Canonical: read records → sorted by ID → SHA-256
  //   Cross-projection: fastq + fhir → genomic↔clinical data bridge
  //                     fastq + hdf5 → nanopore signal data pipeline

  ["fastq", {
    project: ({ hex }) => `urn:uor:sci:fastq:${hex}`,
    fidelity: "lossless",
    spec: "https://www.ncbi.nlm.nih.gov/sra/docs/submitformats/",
  }],

  // ── VCF — Variant Call Format ───────────────────────────────────────────
  // VCF encodes genomic variants (SNPs, indels, structural variants)
  // relative to a reference genome. Used by every variant calling pipeline
  // (GATK, DeepVariant, Strelka2). ClinVar, gnomAD, and 1000 Genomes
  // all publish in VCF.
  //
  // VCF is tab-delimited text with structured headers and genotype fields.
  // Content-addressing VCF creates permanent identities for variant
  // callsets — enabling reproducible genomic analysis and cross-study
  // variant comparison without centralized databases.
  //
  //   Format: urn:uor:sci:vcf:{hex} (SHA-256 of canonical VCF header + records)
  //   Canonical: sorted records → canonical header → SHA-256
  //   Cross-projection: vcf + fastq → raw-to-variant provenance chain
  //                     vcf + fhir → clinical genomics integration

  ["vcf", {
    project: ({ hex }) => `urn:uor:sci:vcf:${hex}`,
    fidelity: "lossless",
    spec: "https://samtools.github.io/hts-specs/VCFv4.3.pdf",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 18 — MUSIC & AUDIO STANDARDS
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Music and audio standards encode sound as structured data — from
  // symbolic notation (MIDI, MusicXML) to waveform analysis (spectrograms)
  // to production metadata (AES67, EBU). Content-addressing music creates
  // permanent, verifiable identities for compositions, performances,
  // recordings, and their relationships.

  // ── MIDI — Musical Instrument Digital Interface ─────────────────────────
  // MIDI is the universal protocol for digital music since 1983. MIDI
  // messages encode note-on/off, velocity, pitch bend, control changes,
  // and system exclusive data. MIDI 2.0 (2020) extends to 32-bit
  // resolution with per-note articulation.
  //
  // Standard MIDI Files (.mid) are deterministic binary sequences of
  // timestamped events. Content-addressing MIDI creates permanent
  // identities for musical compositions independent of performance
  // or rendering — the musical idea itself gets an identity.
  //
  // MIDI is used by every DAW (Ableton, Logic, FL Studio), hardware
  // synthesizer, and music notation system. Content-addressing enables
  // composition provenance, arrangement versioning, and plagiarism
  // detection via structural similarity of MIDI event streams.
  //
  //   Format: urn:uor:music:midi:{hex} (SHA-256 of canonical MIDI file)
  //   Canonical: SMF → sorted track chunks → SHA-256
  //   Cross-projection: midi + musicxml → symbolic↔notated composition bridge
  //                     midi + c2pa → composition provenance chain

  ["midi", {
    project: ({ hex }) => `urn:uor:music:midi:${hex}`,
    fidelity: "lossless",
    spec: "https://midi.org/specifications",
  }],

  // ── MusicXML — Digital Sheet Music ──────────────────────────────────────
  // MusicXML is the universal format for digital sheet music interchange.
  // Supported by 260+ music notation programs (Finale, Sibelius, MuseScore,
  // Dorico). W3C Community Group standard.
  //
  // MusicXML encodes every aspect of Western music notation: pitch,
  // duration, dynamics, articulation, lyrics, chord symbols, tablature,
  // and page layout. Partwise and timewise representations provide
  // different canonical views of the same musical content.
  //
  // Content-addressing MusicXML creates permanent identities for
  // notated compositions. A Beethoven sonata and a new composition
  // each get a unique, verifiable identity based on their musical content.
  //
  //   Format: urn:uor:music:musicxml:{hex} (SHA-256 of canonical MusicXML)
  //   Canonical: partwise score → sorted parts → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: musicxml + midi → notation↔performance bridge
  //                     musicxml + mei → scholarly music encoding bridge

  ["musicxml", {
    project: ({ hex }) => `urn:uor:music:musicxml:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/2021/06/musicxml40/",
  }],

  // ── MEI — Music Encoding Initiative ─────────────────────────────────────
  // MEI is a scholarly XML format for encoding music notation with
  // full editorial, analytical, and critical apparatus. Used by digital
  // musicology projects, music libraries, and computational musicology.
  //
  // MEI goes beyond MusicXML by encoding historical context, variant
  // readings, editorial decisions, and analytical annotations. Each
  // MEI document is a richly structured scholarly object — ideal for
  // content-addressed musicological research chains.
  //
  //   Format: urn:uor:music:mei:{hex} (SHA-256 of canonical MEI document)
  //   Canonical: MEI → sorted elements → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: mei + musicxml → scholarly↔practical notation bridge

  ["mei", {
    project: ({ hex }) => `urn:uor:music:mei:${hex}`,
    fidelity: "lossless",
    spec: "https://music-encoding.org/guidelines/v5/content/",
  }],

  // ── ABC Notation — Text-Based Music Notation ────────────────────────────
  // ABC notation is a compact ASCII format for encoding music, widely
  // used for folk, traditional, and Celtic music. Simple enough to
  // type in email, yet capable of encoding complex multi-voice scores.
  //
  // ABC's text-based format is trivially canonicalizable — the notation
  // IS the canonical form. The abc2midi and abc2ps toolchains convert
  // to MIDI and PostScript respectively. Content-addressing ABC creates
  // permanent identities for traditional tunes and folk melodies.
  //
  //   Format: urn:uor:music:abc:{hex} (SHA-256 of canonical ABC notation)
  //   Canonical: ABC text → normalized header + body → SHA-256
  //   Cross-projection: abc + midi → folk tune performance bridge
  //                     abc + musicxml → traditional↔classical notation bridge

  ["abc-notation", {
    project: ({ hex }) => `urn:uor:music:abc:${hex}`,
    fidelity: "lossless",
    spec: "https://abcnotation.com/wiki/abc:standard:v2.1",
  }],

  // ── AES67 — Audio-over-IP Networking ────────────────────────────────────
  // AES67 is the interoperability standard for professional audio-over-IP
  // networking. Used in broadcast facilities, concert venues, recording
  // studios, and live events worldwide. Bridges Dante, Ravenna, Livewire,
  // and SMPTE ST 2110 audio streams.
  //
  // AES67 streams are identified by SDP (Session Description Protocol)
  // descriptors — structured text documents containing codec, sample rate,
  // channel count, and multicast address. Content-addressing AES67 stream
  // descriptors creates permanent identities for audio network configurations.
  //
  //   Format: urn:uor:music:aes67:{hex} (SHA-256 of canonical SDP descriptor)
  //   Canonical: SDP → sorted attributes → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: aes67 + midi → live performance control + audio bridge

  ["aes67", {
    project: ({ hex }) => `urn:uor:music:aes67:${hex}`,
    fidelity: "lossless",
    spec: "https://www.aes.org/publications/standards/search.cfm?docID=96",
  }],

  // ── MPEG-7 — Multimedia Content Description ─────────────────────────────
  // MPEG-7 (ISO/IEC 15938) provides standardized descriptors for
  // multimedia content — audio features (melody contour, timbre, rhythm),
  // visual features (color, texture, shape), and structural metadata.
  //
  // For music, MPEG-7 Audio encodes melody contours, spectral features,
  // and audio fingerprints as structured XML descriptors. Content-
  // addressing these descriptors creates permanent identities for
  // audio characteristics independent of encoding format.
  //
  //   Format: urn:uor:music:mpeg7:{hex} (SHA-256 of canonical MPEG-7 descriptor)
  //   Canonical: descriptor → sorted elements → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: mpeg7 + midi → audio analysis↔symbolic bridge
  //                     mpeg7 + c2pa → content provenance with audio fingerprint

  ["mpeg7-audio", {
    project: ({ hex }) => `urn:uor:music:mpeg7:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/75399.html",
  }],

  // ── JAMS — JSON Annotated Music Specification ───────────────────────────
  // JAMS is a JSON format for music annotations — beat tracking, chord
  // recognition, melody extraction, structural segmentation, and mood
  // classification. Used by MIR (Music Information Retrieval) research
  // community and computational musicology.
  //
  // JAMS documents contain typed annotations with time intervals,
  // confidence scores, and provenance metadata. Content-addressing JAMS
  // creates verifiable MIR analysis pipelines from audio to annotation.
  //
  //   Format: urn:uor:music:jams:{hex} (SHA-256 of canonical JAMS document)
  //   Canonical: annotations → sorted by namespace + time → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: jams + mpeg7 → MIR analysis identity chain
  //                     jams + midi → annotation↔composition bridge

  ["jams", {
    project: ({ hex }) => `urn:uor:music:jams:${hex}`,
    fidelity: "lossless",
    spec: "https://jams.readthedocs.io/en/stable/",
  }],

  // ── MPD — MPEG-DASH Media Presentation Description ──────────────────────
  // MPD defines adaptive streaming manifests for audio and video delivery.
  // Every major streaming platform (Spotify, YouTube Music, Apple Music)
  // uses DASH or HLS manifests. MPD documents describe available
  // bitrates, codecs, segment URLs, and DRM configuration.
  //
  // Content-addressing MPD creates permanent identities for streaming
  // configurations — enabling verified delivery chain from master
  // recording to listener's device. Combined with C2PA, this provides
  // end-to-end music provenance.
  //
  //   Format: urn:uor:music:mpd:{hex} (SHA-256 of canonical MPD document)
  //   Canonical: MPD → sorted elements → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: mpd + c2pa → streaming content provenance
  //                     mpd + aes67 → broadcast↔streaming bridge

  ["mpd", {
    project: ({ hex }) => `urn:uor:music:mpd:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/79329.html",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 19 — HARDWARE DESIGN & FABRICATION STANDARDS
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Hardware standards span the entire lifecycle from circuit design (EDA)
  // through fabrication (GDSII, Gerber) to packaging and test. Content-
  // addressing hardware artifacts creates silicon provenance from RTL
  // specification to manufactured die — the ultimate supply-chain integrity.

  // ── GDSII — Graphic Data System II ──────────────────────────────────────
  // GDSII (OASIS successor: OASIS.MASK) is the standard interchange format
  // for integrated circuit layout data. Every chip manufactured since the
  // 1980s has been defined by GDSII streams. A GDSII file contains
  // hierarchical cell references, polygon boundaries, paths, and text
  // labels — all with nanometer-precision coordinates.
  //
  // GDSII streams are deterministic binary structures. Content-addressing
  // GDSII creates permanent identities for IC layouts — enabling foundry-
  // to-designer provenance chains and IP protection verification.
  //
  //   Format: urn:uor:hw:gdsii:{hex} (SHA-256 of canonical GDSII stream)
  //   Canonical: GDSII stream → cell hierarchy → SHA-256
  //   Cross-projection: gdsii + verilog → RTL↔layout verification
  //                     gdsii + spdx-sbom → silicon supply chain integrity

  ["gdsii", {
    project: ({ hex }) => `urn:uor:hw:gdsii:${hex}`,
    fidelity: "lossless",
    spec: "https://www.layouteditor.org/layout/file-formats/gdsii",
  }],

  // ── Gerber — PCB Fabrication Data ───────────────────────────────────────
  // Gerber (RS-274X / Gerber X2/X3) is the universal format for PCB
  // fabrication. Every printed circuit board on earth is manufactured
  // from Gerber files — copper layers, solder mask, silkscreen, drill
  // data, and component placement. Gerber X3 adds component-level
  // metadata including manufacturer part numbers.
  //
  // Gerber files are ASCII text with deterministic aperture definitions
  // and coordinate data. Content-addressing Gerber creates permanent
  // identities for PCB designs — each board revision gets a unique hash
  // linking schematic intent to physical fabrication output.
  //
  //   Format: urn:uor:hw:gerber:{hex} (SHA-256 of canonical Gerber file set)
  //   Canonical: layer stack → sorted layer files → SHA-256
  //   Cross-projection: gerber + gdsii → PCB↔IC integration identity
  //                     gerber + spdx-sbom → board-level BOM provenance

  ["gerber", {
    project: ({ hex }) => `urn:uor:hw:gerber:${hex}`,
    fidelity: "lossless",
    spec: "https://www.ucamco.com/en/gerber/gerber-format-specification",
  }],

  // ── SPDX SBOM — Software/Hardware Bill of Materials ─────────────────────
  // SPDX (ISO/IEC 5962:2021) is the international standard for Software
  // Bills of Materials. Required by US Executive Order 14028 for federal
  // software procurement. SPDX 3.0 extends to hardware BOMs, AI/ML
  // model cards, and dataset descriptions.
  //
  // SPDX documents are structured JSON-LD with package identifiers,
  // license expressions, checksums, and relationship graphs. Content-
  // addressing SPDX creates permanent, verifiable supply chain manifests
  // that link every component (software or hardware) to its provenance.
  //
  //   Format: urn:uor:hw:spdx:{hex} (SHA-256 of canonical SPDX document)
  //   Canonical: SPDX JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: spdx-sbom + oci → container SBOM provenance
  //                     spdx-sbom + scitt → SBOM transparency receipts
  //                     spdx-sbom + gerber → hardware BOM identity

  ["spdx-sbom", {
    project: ({ hex }) => `urn:uor:hw:spdx:${hex}`,
    fidelity: "lossless",
    spec: "https://spdx.github.io/spdx-spec/v3.0/",
  }],

  // ── Matter — Smart Home Connectivity ────────────────────────────────────
  // Matter (formerly Project CHIP) is the unified smart home protocol
  // backed by Apple, Google, Amazon, and Samsung. Matter devices use
  // Device Attestation Certificates (DAC) for cryptographic identity
  // and Distributed Compliance Ledger (DCL) for device type verification.
  //
  // Matter's data model defines clusters (capabilities), attributes,
  // commands, and events — all structured and deterministic. Each device
  // type (light, lock, thermostat, sensor) has a canonical cluster
  // composition that maps to a content-addressed identity.
  //
  //   Format: urn:uor:hw:matter:{hex} (SHA-256 of canonical Matter device descriptor)
  //   Canonical: device type → cluster list → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: matter + did → device DID identity
  //                     matter + weave → Thread network device provenance

  ["matter", {
    project: ({ hex }) => `urn:uor:hw:matter:${hex}`,
    fidelity: "lossless",
    spec: "https://csa-iot.org/developer-resource/specifications/",
  }],

  // ── LEF/DEF — Library Exchange / Design Exchange Format ─────────────────
  // LEF (Library Exchange Format) and DEF (Design Exchange Format) are
  // the standard cell library and placed-and-routed design interchange
  // formats for IC physical design. Used by every EDA tool (Cadence,
  // Synopsys, Mentor/Siemens). LEF defines cell abstracts (pins, geometry,
  // timing); DEF defines placed instances and routing.
  //
  // Content-addressing LEF/DEF creates provenance from standard cell
  // library characterization through place-and-route to GDSII tapeout.
  //
  //   Format: urn:uor:hw:lefdef:{hex} (SHA-256 of canonical LEF/DEF pair)
  //   Canonical: LEF macros + DEF netlist → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: lefdef + gdsii → physical design→layout chain
  //                     lefdef + verilog → synthesis→placement chain

  ["lefdef", {
    project: ({ hex }) => `urn:uor:hw:lefdef:${hex}`,
    fidelity: "lossless",
    spec: "https://www.si2.org/open-standards/lef-def/",
  }],

  // ── Liberty (.lib) — Timing & Power Characterization ────────────────────
  // Liberty format (Synopsys) defines standard cell timing arcs, power
  // models, and electrical characteristics. Every digital IC synthesis
  // and timing analysis depends on Liberty libraries. Content-addressing
  // Liberty files ensures that timing closure verification is traceable
  // to specific cell characterization data.
  //
  //   Format: urn:uor:hw:liberty:{hex} (SHA-256 of canonical Liberty library)
  //   Canonical: library → cell models → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: liberty + lefdef → characterized cells→placed design chain
  //                     liberty + verilog → synthesis constraints provenance

  ["liberty", {
    project: ({ hex }) => `urn:uor:hw:liberty:${hex}`,
    fidelity: "lossless",
    spec: "https://www.synopsys.com/community/interoperability-programs/tap-in.html",
  }],

  // ── EDIF — Electronic Design Interchange Format ─────────────────────────
  // EDIF (IEC 61690-2) is the ISO/IEC standard for exchanging electronic
  // design data between EDA tools — schematics, netlists, and PCB layouts.
  // While largely superseded by vendor-specific formats, EDIF remains
  // the formal standard and is used for archival and interchange.
  //
  //   Format: urn:uor:hw:edif:{hex} (SHA-256 of canonical EDIF netlist)
  //   Canonical: design → sorted cells → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: edif + gerber → schematic↔fabrication bridge
  //                     edif + spice → schematic↔simulation bridge

  ["edif", {
    project: ({ hex }) => `urn:uor:hw:edif:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/33madhon.html",
  }],

  // ── SPICE — Circuit Simulation ──────────────────────────────────────────
  // SPICE (Simulation Program with Integrated Circuit Emphasis) netlists
  // define analog/mixed-signal circuit simulations. Every IC analog block,
  // power supply, and RF circuit is verified via SPICE simulation.
  // BSIM device models (Berkeley) are the industry standard.
  //
  // SPICE netlists are deterministic text — subcircuit definitions,
  // component instances, and analysis commands. Content-addressing SPICE
  // creates simulation provenance from circuit definition to waveform result.
  //
  //   Format: urn:uor:hw:spice:{hex} (SHA-256 of canonical SPICE netlist)
  //   Canonical: netlist → sorted subcircuits → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: spice + verilog → analog↔digital co-simulation bridge
  //                     spice + liberty → device model↔timing characterization

  ["spice", {
    project: ({ hex }) => `urn:uor:hw:spice:${hex}`,
    fidelity: "lossless",
    spec: "https://bsim.berkeley.edu/models/bsimcmg/",
  }],

  // ── STEP/AP214 — 3D CAD Exchange (ISO 10303) ───────────────────────────
  // STEP (Standard for the Exchange of Product Data) is the ISO standard
  // for 3D CAD model interchange. AP214 covers automotive design; AP242
  // covers aerospace and defense. Used by every major CAD system
  // (SolidWorks, CATIA, NX, Creo, Fusion 360).
  //
  // STEP files contain B-rep geometry, assembly structure, PMI (Product
  // Manufacturing Information), and material properties. Content-addressing
  // STEP creates permanent identities for mechanical designs — enabling
  // design version tracking and manufacturing provenance.
  //
  //   Format: urn:uor:hw:step:{hex} (SHA-256 of canonical STEP file)
  //   Canonical: STEP entities → sorted by ID → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: step + gerber → mechanical↔electrical co-design
  //                     step + spdx-sbom → mechanical BOM provenance

  ["step-cad", {
    project: ({ hex }) => `urn:uor:hw:step:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/84667.html",
  }],

  // ── IPC-2581 — PCB Design-to-Manufacturing ──────────────────────────────
  // IPC-2581 (Generic Requirements for Printed Board Assembly Products)
  // is the IPC standard replacing Gerber + drill + BOM with a single
  // intelligent XML format. Contains complete fabrication, assembly,
  // and test data in one file — stackup, copper, solder paste, component
  // placement, and netlist.
  //
  //   Format: urn:uor:hw:ipc2581:{hex} (SHA-256 of canonical IPC-2581 XML)
  //   Canonical: design → sorted layers/components → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: ipc2581 + gerber → unified PCB fabrication identity
  //                     ipc2581 + spdx-sbom → complete board BOM provenance

  ["ipc2581", {
    project: ({ hex }) => `urn:uor:hw:ipc2581:${hex}`,
    fidelity: "lossless",
    spec: "https://www.ipc.org/TOC/IPC-2581C.pdf",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 20 — IoT PROTOCOLS & STANDARDS
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // IoT protocols connect billions of constrained devices — sensors,
  // actuators, gateways, and edge nodes. Content-addressing IoT data
  // creates verifiable provenance from physical measurement to cloud
  // analytics, ensuring data integrity across the entire IoT stack.

  // ── LwM2M — Lightweight M2M Device Management ──────────────────────────
  // OMA LwM2M is the standard for IoT device management and service
  // enablement. Defines object/resource model for sensors, firmware
  // update, connectivity monitoring, and device configuration.
  // Used by major IoT platforms (AWS IoT, Azure IoT, ThingsBoard).
  //
  // LwM2M objects are structured resource trees with typed values.
  // Content-addressing LwM2M object definitions creates permanent
  // identities for device capabilities — enabling device type
  // verification and firmware integrity checking.
  //
  //   Format: urn:uor:iot:lwm2m:{hex} (SHA-256 of canonical LwM2M object definition)
  //   Canonical: object → resource list → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: lwm2m + matter → device management↔smart home bridge
  //                     lwm2m + coap → transport↔management protocol bridge

  ["lwm2m", {
    project: ({ hex }) => `urn:uor:iot:lwm2m:${hex}`,
    fidelity: "lossless",
    spec: "https://openmobilealliance.org/release/LightweightM2M/",
  }],

  // ── CoAP — Constrained Application Protocol ─────────────────────────────
  // CoAP (RFC 7252) is the HTTP equivalent for constrained IoT devices.
  // Runs over UDP with DTLS security. Used with LwM2M for device
  // management and with OSCORE for end-to-end security. CoAP resources
  // are identified by URIs and support observe (pub/sub) pattern.
  //
  // Content-addressing CoAP resources creates permanent identities for
  // IoT endpoints — each sensor reading, actuator command, and device
  // state becomes a verifiable, content-addressed observation.
  //
  //   Format: urn:uor:iot:coap:{hex} (SHA-256 of canonical CoAP resource descriptor)
  //   Canonical: resource → link-format description → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: coap + lwm2m → constrained transport↔management
  //                     coap + cose → IoT message security

  ["coap", {
    project: ({ hex }) => `urn:uor:iot:coap:${hex}`,
    fidelity: "lossless",
    spec: "https://datatracker.ietf.org/doc/html/rfc7252",
  }],

  // ── MQTT — Message Queuing Telemetry Transport ──────────────────────────
  // MQTT is the dominant pub/sub messaging protocol for IoT. Used by
  // AWS IoT Core, Azure IoT Hub, HiveMQ, and millions of edge devices.
  // MQTT 5.0 adds user properties, shared subscriptions, and topic
  // aliases. Sparkplug B (Eclipse) adds industrial IoT semantics.
  //
  // MQTT topic hierarchies are structured namespaces. Content-addressing
  // topic definitions and message schemas creates verifiable IoT data
  // pipelines from sensor to cloud to analytics.
  //
  //   Format: urn:uor:iot:mqtt:{hex} (SHA-256 of canonical MQTT topic schema)
  //   Canonical: topic tree → sorted subscriptions → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: mqtt + lwm2m → messaging↔device management bridge
  //                     mqtt + cloudevents → IoT events as CloudEvents

  ["mqtt", {
    project: ({ hex }) => `urn:uor:iot:mqtt:${hex}`,
    fidelity: "lossless",
    spec: "https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html",
  }],

  // ── SenML — Sensor Measurement Lists ────────────────────────────────────
  // SenML (RFC 8428) is the IETF standard for representing sensor
  // measurements as structured JSON/CBOR arrays. Each record contains
  // name, unit, value, and timestamp. Used with CoAP and MQTT for
  // constrained device telemetry.
  //
  // SenML records are deterministic JSON/CBOR structures. Content-
  // addressing SenML packs creates permanent identities for sensor
  // readings — each measurement set becomes a verifiable observation.
  //
  //   Format: urn:uor:iot:senml:{hex} (SHA-256 of canonical SenML pack)
  //   Canonical: records → sorted by name + time → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: senml + coap → sensor data transport
  //                     senml + hdf5 → IoT→scientific data pipeline

  ["senml", {
    project: ({ hex }) => `urn:uor:iot:senml:${hex}`,
    fidelity: "lossless",
    spec: "https://datatracker.ietf.org/doc/html/rfc8428",
  }],

  // ── WoT TD — Web of Things Thing Description ───────────────────────────
  // W3C Web of Things Thing Description (TD) is a JSON-LD document
  // that describes IoT device capabilities — properties (readable state),
  // actions (invocable operations), and events (observable notifications).
  // TDs are inherently semantic web objects — native JSON-LD.
  //
  // Since TDs are already JSON-LD, they flow directly through UOR's
  // URDNA2015 canonicalization pipeline. Content-addressing TDs creates
  // permanent, verifiable identities for device capabilities.
  //
  //   Format: urn:uor:iot:wot-td:{hex} (SHA-256 of canonical Thing Description)
  //   Canonical: TD JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: wot-td + did → device DID with capability description
  //                     wot-td + matter → W3C↔CSA device model bridge

  ["wot-td", {
    project: ({ hex }) => `urn:uor:iot:wot-td:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/wot-thing-description11/",
  }],

  // ── OPC UA — Industrial Automation ──────────────────────────────────────
  // OPC UA (IEC 62541) is the universal standard for industrial
  // automation communication — factory floor, process control, energy
  // management, and building automation. Defines an information model
  // with nodes, references, and data types. Used by Siemens, ABB,
  // Rockwell, Schneider Electric, and every major PLC vendor.
  //
  // OPC UA NodeSets are structured XML information models. Content-
  // addressing NodeSets creates permanent identities for industrial
  // device models — enabling factory-wide digital twin provenance.
  //
  //   Format: urn:uor:iot:opcua:{hex} (SHA-256 of canonical OPC UA NodeSet)
  //   Canonical: NodeSet → sorted nodes → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: opcua + wot-td → industrial↔web device bridge
  //                     opcua + mqtt → industrial pub/sub integration

  ["opcua", {
    project: ({ hex }) => `urn:uor:iot:opcua:${hex}`,
    fidelity: "lossless",
    spec: "https://opcfoundation.org/developer-tools/specifications-opc-ua",
  }],

  // ── IPSO Smart Objects — IoT Semantic Model ─────────────────────────────
  // IPSO Smart Objects define reusable, semantic object models for IoT
  // resources — temperature sensor, light control, GPS location, power
  // measurement, etc. Registered at OMA with unique Object IDs.
  // Foundation for LwM2M device modeling.
  //
  //   Format: urn:uor:iot:ipso:{hex} (SHA-256 of canonical IPSO object definition)
  //   Canonical: object → resource definitions → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: ipso + lwm2m → semantic model↔management protocol
  //                     ipso + senml → object model↔measurement bridge

  ["ipso", {
    project: ({ hex }) => `urn:uor:iot:ipso:${hex}`,
    fidelity: "lossless",
    spec: "https://technical.openmobilealliance.org/OMNA/LwM2M/LwM2MRegistry.html",
  }],

  // ── Thread — IoT Mesh Networking ────────────────────────────────────────
  // Thread is the IPv6-based mesh networking protocol for IoT. Powers
  // Matter smart home devices over low-power 802.15.4 radio. Thread
  // Border Routers bridge Thread mesh to Wi-Fi/Ethernet. Thread devices
  // use MLE (Mesh Link Establishment) for secure network formation.
  //
  // Thread network credentials (Network Key, PAN ID, Channel, Commissioner
  // Credential) define a deterministic network identity. Content-addressing
  // Thread network configurations enables secure, verifiable mesh deployments.
  //
  //   Format: urn:uor:iot:thread:{hex} (SHA-256 of canonical Thread network descriptor)
  //   Canonical: network config → sorted parameters → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: thread + matter → mesh↔application protocol bridge
  //                     thread + ipv6 → Thread mesh↔IPv6 addressing bridge

  ["thread", {
    project: ({ hex }) => `urn:uor:iot:thread:${hex}`,
    fidelity: "lossless",
    spec: "https://www.threadgroup.org/support#specifications",
  }],

  // ── Zigbee — Wireless Sensor Networks ───────────────────────────────────
  // Zigbee (IEEE 802.15.4) is the established standard for low-power
  // wireless sensor and actuator networks. Zigbee 3.0 unified the
  // application profiles (Home Automation, Light Link, etc.). Zigbee
  // Cluster Library (ZCL) defines device types and cluster commands.
  //
  //   Format: urn:uor:iot:zigbee:{hex} (SHA-256 of canonical Zigbee device descriptor)
  //   Canonical: device type → cluster list → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: zigbee + matter → legacy↔modern smart home bridge
  //                     zigbee + thread → Zigbee↔Thread migration identity

  ["zigbee", {
    project: ({ hex }) => `urn:uor:iot:zigbee:${hex}`,
    fidelity: "lossless",
    spec: "https://csa-iot.org/developer-resource/specifications/",
  }],

  // ── BLE GATT — Bluetooth Low Energy ─────────────────────────────────────
  // BLE GATT (Generic Attribute Profile) defines services and
  // characteristics for Bluetooth Low Energy devices. Used by wearables,
  // medical devices, beacons, and industrial sensors. Bluetooth SIG
  // maintains a registry of standardized GATT services and characteristics.
  //
  // GATT profiles are structured service/characteristic trees with UUIDs.
  // Content-addressing GATT profiles creates permanent identities for
  // BLE device capabilities — enabling device type verification and
  // firmware integrity checking across the BLE ecosystem.
  //
  //   Format: urn:uor:iot:ble-gatt:{hex} (SHA-256 of canonical GATT profile)
  //   Canonical: services → sorted characteristics → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: ble-gatt + matter → BLE↔Matter commissioning bridge
  //                     ble-gatt + dicom → medical BLE device identity

  ["ble-gatt", {
    project: ({ hex }) => `urn:uor:iot:ble-gatt:${hex}`,
    fidelity: "lossless",
    spec: "https://www.bluetooth.com/specifications/specs/core-specification-6-0/",
  }],

  // ── LoRaWAN — Long-Range Wide Area Network ──────────────────────────────
  // LoRaWAN enables kilometer-range IoT connectivity with years of
  // battery life. Used for smart agriculture, asset tracking, smart
  // cities, and utility metering. LoRaWAN 1.0.4 defines device classes
  // (A/B/C), activation methods (OTAA/ABP), and MAC commands.
  //
  // LoRaWAN device profiles (DevEUI, AppKey, NwkKey) are deterministic
  // device identity credentials. Content-addressing LoRaWAN device
  // profiles creates permanent device identities independent of
  // network server operator.
  //
  //   Format: urn:uor:iot:lorawan:{hex} (SHA-256 of canonical LoRaWAN device profile)
  //   Canonical: device profile → sorted parameters → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: lorawan + senml → LPWAN sensor data provenance
  //                     lorawan + lwm2m → LPWAN device management

  ["lorawan", {
    project: ({ hex }) => `urn:uor:iot:lorawan:${hex}`,
    fidelity: "lossless",
    spec: "https://lora-alliance.org/resource_hub/lorawan-specification-v1-0-4/",
  }],

  // ── DTDL — Digital Twins Definition Language ────────────────────────────
  // DTDL (Microsoft Azure Digital Twins) defines digital twin models
  // using JSON-LD. Telemetry, properties, commands, relationships, and
  // components map physical assets to digital representations. Used for
  // building management, manufacturing, and smart cities.
  //
  // DTDL models are native JSON-LD — they flow directly through UOR's
  // canonicalization pipeline. Content-addressing digital twin models
  // creates permanent identities for physical-digital asset mappings.
  //
  //   Format: urn:uor:iot:dtdl:{hex} (SHA-256 of canonical DTDL model)
  //   Canonical: DTDL JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: dtdl + wot-td → Azure↔W3C device model bridge
  //                     dtdl + opcua → digital twin↔industrial automation

  ["dtdl", {
    project: ({ hex }) => `urn:uor:iot:dtdl:${hex}`,
    fidelity: "lossless",
    spec: "https://azure.github.io/opendigitaltwins-dtdl/DTDL/v3/DTDL.v3.html",
  }],

  // ── ECHONET Lite — Japanese Smart Home Standard ─────────────────────────
  // ECHONET Lite is the dominant smart home protocol in Japan, mandated
  // for HEMS (Home Energy Management Systems). Defines device objects
  // for air conditioners, lighting, EV chargers, solar inverters, and
  // storage batteries. 250M+ deployed devices.
  //
  //   Format: urn:uor:iot:echonet:{hex} (SHA-256 of canonical ECHONET object)
  //   Canonical: device object → property list → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: echonet + matter → Japan↔global smart home bridge
  //                     echonet + wot-td → ECHONET↔W3C WoT bridge

  ["echonet", {
    project: ({ hex }) => `urn:uor:iot:echonet:${hex}`,
    fidelity: "lossless",
    spec: "https://echonet.jp/spec_v114_lite_en/",
  }],

  // ── JTAG/IEEE 1149.1 — Hardware Test & Debug ────────────────────────────
  // JTAG (Joint Test Action Group, IEEE 1149.1) is the universal standard
  // for IC testing, debugging, and programming. BSDL (Boundary Scan
  // Description Language) files define device pin mappings and test
  // registers. Every IC with JTAG has a deterministic BSDL descriptor.
  //
  //   Format: urn:uor:hw:jtag:{hex} (SHA-256 of canonical BSDL descriptor)
  //   Canonical: BSDL → sorted pin/register definitions → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: jtag + gdsii → test↔layout verification chain
  //                     jtag + verilog → debug↔RTL traceability

  ["jtag", {
    project: ({ hex }) => `urn:uor:hw:jtag:${hex}`,
    fidelity: "lossless",
    spec: "https://ieeexplore.ieee.org/document/9930828",
  }],

  // ── UCIe — Universal Chiplet Interconnect Express ───────────────────────
  // UCIe is the open standard for chiplet-to-chiplet interconnect,
  // enabling heterogeneous integration of dies from different foundries.
  // Backed by Intel, AMD, ARM, TSMC, Samsung. UCIe defines physical
  // layer, protocol layer, and die-to-die adapter specifications.
  //
  //   Format: urn:uor:hw:ucie:{hex} (SHA-256 of canonical UCIe interface descriptor)
  //   Canonical: interface spec → sorted parameters → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: ucie + gdsii → chiplet↔package integration
  //                     ucie + spdx-sbom → chiplet supply chain provenance

  ["ucie", {
    project: ({ hex }) => `urn:uor:hw:ucie:${hex}`,
    fidelity: "lossless",
    spec: "https://www.uciexpress.org/specification",
  }],

  // ── CXL — Compute Express Link ─────────────────────────────────────────
  // CXL is the open interconnect standard for CPU-to-device and CPU-to-
  // memory coherent connections. CXL 3.0 enables memory pooling, sharing,
  // and fabric-attached memory. Critical for data center, HPC, and AI
  // infrastructure — used by Intel, AMD, ARM, and all major server vendors.
  //
  //   Format: urn:uor:hw:cxl:{hex} (SHA-256 of canonical CXL device descriptor)
  //   Canonical: device → capability registers → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: cxl + ucie → chiplet interconnect stack
  //                     cxl + spdx-sbom → data center component provenance

  ["cxl", {
    project: ({ hex }) => `urn:uor:hw:cxl:${hex}`,
    fidelity: "lossless",
    spec: "https://www.computeexpresslink.org/spec-landing",
  }],

  // ── SMPTE ST 2110 — Professional Media over IP ──────────────────────────
  // SMPTE ST 2110 defines separate transport of video, audio, and
  // ancillary data over IP networks for broadcast production. Used by
  // every major broadcaster and live production facility. Replaces
  // SDI baseband with IP-native media flows.
  //
  //   Format: urn:uor:hw:st2110:{hex} (SHA-256 of canonical ST 2110 flow descriptor)
  //   Canonical: SDP → sorted media descriptions → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: st2110 + aes67 → broadcast video↔audio bridge
  //                     st2110 + c2pa → broadcast content provenance

  ["st2110", {
    project: ({ hex }) => `urn:uor:hw:st2110:${hex}`,
    fidelity: "lossless",
    spec: "https://www.smpte.org/standards/st2110",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 21 — DATA FORMATS: TABULAR, COLUMNAR & STRUCTURED DATA
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Data formats are the lingua franca of information exchange — from simple
  // CSV tables exchanged by spreadsheets to columnar Parquet files powering
  // petabyte-scale analytics. Content-addressing data formats creates
  // permanent, verifiable identities for datasets regardless of where they
  // are stored or how they are transmitted. Every row, every schema, every
  // query result becomes a tamper-evident, content-addressed artifact.

  // ── CSV — Comma-Separated Values ───────────────────────────────────────
  // CSV (RFC 4180) is the most widely used tabular data interchange format.
  // Despite its simplicity, CSV ambiguity (delimiters, quoting, encoding)
  // makes canonical representation essential. UOR CSV canonicalization
  // normalizes encoding to UTF-8, line endings to LF, applies deterministic
  // quoting rules, and sorts header columns lexicographically.
  //
  //   Format: urn:uor:data:csv:{hex} (SHA-256 of canonical CSV)
  //   Canonical: CSV → UTF-8 normalize → LF line endings → sorted headers → SHA-256
  //   Cross-projection: csv + parquet → tabular↔columnar bridge
  //                     csv + json-schema → CSV validation schema identity

  ["csv", {
    project: ({ hex }) => `urn:uor:data:csv:${hex}`,
    fidelity: "lossless",
    spec: "https://datatracker.ietf.org/doc/html/rfc4180",
  }],

  // ── TSV — Tab-Separated Values ─────────────────────────────────────────
  // TSV is the standard tabular format for bioinformatics (BED, GFF, VCF
  // headers), linguistics corpora, and UNIX tool pipelines. Tab delimiters
  // eliminate quoting ambiguity inherent in CSV. IANA type: text/tab-separated-values.
  //
  //   Format: urn:uor:data:tsv:{hex} (SHA-256 of canonical TSV)
  //   Canonical: TSV → UTF-8 normalize → LF → sorted columns → SHA-256
  //   Cross-projection: tsv + csv → delimiter-agnostic tabular identity
  //                     tsv + fastq → bioinformatics pipeline data bridge

  ["tsv", {
    project: ({ hex }) => `urn:uor:data:tsv:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iana.org/assignments/media-types/text/tab-separated-values",
  }],

  // ── Apache Parquet — Columnar Storage ──────────────────────────────────
  // Parquet is the dominant columnar storage format for big data analytics.
  // Used by Apache Spark, Databricks, Snowflake, BigQuery, Athena, and
  // every major data lake. Parquet files contain self-describing schemas,
  // row groups, column chunks, and page-level statistics — all binary and
  // deterministic. Parquet's footer metadata is a Thrift-encoded schema.
  //
  // Content-addressing Parquet files creates permanent identities for
  // analytical datasets — each partition, each table version, each query
  // result becomes a verifiable, content-addressed artifact.
  //
  //   Format: urn:uor:data:parquet:{hex} (SHA-256 of Parquet file bytes)
  //   Canonical: Parquet binary → raw bytes → SHA-256
  //   Cross-projection: parquet + avro → columnar↔row-based data bridge
  //                     parquet + csv → analytics↔interchange bridge
  //                     parquet + arrow → columnar storage↔in-memory bridge

  ["parquet", {
    project: ({ hex }) => `urn:uor:data:parquet:${hex}`,
    fidelity: "lossless",
    spec: "https://parquet.apache.org/docs/file-format/",
  }],

  // ── Apache Arrow / IPC — In-Memory Columnar ────────────────────────────
  // Arrow is the universal in-memory columnar format — zero-copy reads
  // across languages (Python, R, Java, Rust, C++, JS). Arrow IPC
  // (Feather v2) provides file-level persistence. Used by Pandas 2.0,
  // Polars, DuckDB, DataFusion, and Velox.
  //
  // Arrow IPC files have deterministic binary layout with schema metadata,
  // record batches, and dictionary encodings. Content-addressing Arrow
  // creates permanent identities for in-memory datasets.
  //
  //   Format: urn:uor:data:arrow:{hex} (SHA-256 of Arrow IPC file)
  //   Canonical: Arrow IPC binary → raw bytes → SHA-256
  //   Cross-projection: arrow + parquet → memory↔storage columnar bridge
  //                     arrow + csv → in-memory↔interchange bridge

  ["arrow", {
    project: ({ hex }) => `urn:uor:data:arrow:${hex}`,
    fidelity: "lossless",
    spec: "https://arrow.apache.org/docs/format/Columnar.html",
  }],

  // ── ORC — Optimized Row Columnar ───────────────────────────────────────
  // ORC is the columnar format optimized for Apache Hive and the Hadoop
  // ecosystem. Features ACID transaction support, predicate pushdown,
  // bloom filters, and lightweight compression. Used by Hive, Presto,
  // Trino, and Spark for Hadoop-native workloads.
  //
  //   Format: urn:uor:data:orc:{hex} (SHA-256 of ORC file bytes)
  //   Canonical: ORC binary → raw bytes → SHA-256
  //   Cross-projection: orc + parquet → Hadoop↔Spark columnar bridge
  //                     orc + avro → ORC↔Avro schema evolution bridge

  ["orc", {
    project: ({ hex }) => `urn:uor:data:orc:${hex}`,
    fidelity: "lossless",
    spec: "https://orc.apache.org/specification/ORCv2/",
  }],

  // ── Apache Iceberg — Table Format ──────────────────────────────────────
  // Iceberg is the open table format for huge analytic datasets. Provides
  // ACID transactions, schema evolution, partition evolution, time travel,
  // and hidden partitioning. Used by Netflix, Apple, Snowflake, Databricks,
  // and AWS (Athena, Glue). Iceberg metadata is JSON manifests pointing
  // to data files (Parquet/ORC/Avro).
  //
  //   Format: urn:uor:data:iceberg:{hex} (SHA-256 of Iceberg metadata snapshot)
  //   Canonical: metadata.json → sorted snapshots → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: iceberg + parquet → table format↔storage bridge
  //                     iceberg + delta → Iceberg↔Delta Lake interop identity

  ["iceberg", {
    project: ({ hex }) => `urn:uor:data:iceberg:${hex}`,
    fidelity: "lossless",
    spec: "https://iceberg.apache.org/spec/",
  }],

  // ── Delta Lake — Versioned Table Format ────────────────────────────────
  // Delta Lake (Linux Foundation) provides ACID transactions on top of
  // Parquet. Transaction log (_delta_log/) records every change as
  // JSON action files. Used by Databricks, Azure Synapse, and Spark.
  // UniForm enables Delta↔Iceberg↔Hudi interoperability.
  //
  //   Format: urn:uor:data:delta:{hex} (SHA-256 of Delta transaction log snapshot)
  //   Canonical: _delta_log → sorted actions → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: delta + parquet → transaction↔storage bridge
  //                     delta + iceberg → Delta↔Iceberg UniForm identity

  ["delta", {
    project: ({ hex }) => `urn:uor:data:delta:${hex}`,
    fidelity: "lossless",
    spec: "https://github.com/delta-io/delta/blob/master/PROTOCOL.md",
  }],

  // ── Apache Hudi — Incremental Data Lake ────────────────────────────────
  // Hudi (Hadoop Upserts Deletes Incrementals) supports record-level
  // upserts, deletes, and incremental processing on data lakes. Used for
  // CDC (Change Data Capture) pipelines. Hudi timelines track every
  // commit as structured metadata.
  //
  //   Format: urn:uor:data:hudi:{hex} (SHA-256 of Hudi commit metadata)
  //   Canonical: timeline → sorted commits → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: hudi + delta → CDC pipeline format bridge
  //                     hudi + parquet → upsert↔storage identity

  ["hudi", {
    project: ({ hex }) => `urn:uor:data:hudi:${hex}`,
    fidelity: "lossless",
    spec: "https://hudi.apache.org/docs/next/technical_spec",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 22 — DATA FORMATS: QUERY LANGUAGES & SCHEMA DEFINITIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── GraphQL — API Query Language ───────────────────────────────────────
  // GraphQL is the dominant API query language for modern web applications.
  // A GraphQL schema (SDL) defines types, fields, queries, mutations, and
  // subscriptions. GraphQL operations (queries/mutations) are deterministic
  // ASTs. Used by GitHub, Shopify, Stripe, Meta, and millions of apps.
  //
  // Content-addressing GraphQL schemas creates permanent, verifiable API
  // contracts. Each schema version gets a unique hash — enabling API
  // evolution tracking and contract testing verification.
  //
  //   Format: urn:uor:data:graphql:{hex} (SHA-256 of canonical GraphQL SDL)
  //   Canonical: SDL → sorted types/fields → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: graphql + openapi → GraphQL↔REST API bridge
  //                     graphql + json-schema → GraphQL↔JSON Schema bridge
  //                     graphql + protobuf → GraphQL↔gRPC bridge

  ["graphql", {
    project: ({ hex }) => `urn:uor:data:graphql:${hex}`,
    fidelity: "lossless",
    spec: "https://spec.graphql.org/October2021/",
  }],

  // ── SQL/DDL — Structured Query Language ────────────────────────────────
  // SQL (ISO/IEC 9075) is the universal language for relational databases.
  // DDL (Data Definition Language) statements define schemas — tables,
  // columns, constraints, indexes, views. Content-addressing DDL creates
  // permanent identities for database schemas — enabling schema version
  // control and migration verification.
  //
  //   Format: urn:uor:data:sql:{hex} (SHA-256 of canonical DDL)
  //   Canonical: DDL → sorted tables/columns → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: sql + graphql → relational↔graph API bridge
  //                     sql + json-schema → SQL↔JSON Schema bridge

  ["sql", {
    project: ({ hex }) => `urn:uor:data:sql:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/76583.html",
  }],

  // ── CQL — Cassandra Query Language ─────────────────────────────────────
  // CQL defines schemas and queries for Apache Cassandra and ScyllaDB —
  // the dominant wide-column distributed databases. CQL DDL defines
  // keyspaces, tables, materialized views, and UDTs.
  //
  //   Format: urn:uor:data:cql:{hex} (SHA-256 of canonical CQL schema)
  //   Canonical: CQL DDL → sorted keyspaces/tables → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: cql + sql → NoSQL↔SQL schema bridge

  ["cql", {
    project: ({ hex }) => `urn:uor:data:cql:${hex}`,
    fidelity: "lossless",
    spec: "https://cassandra.apache.org/doc/latest/cassandra/cql/",
  }],

  // ── Cypher — Graph Query Language ──────────────────────────────────────
  // Cypher is the declarative graph query language for Neo4j and the
  // upcoming ISO GQL standard (ISO/IEC 39075). Defines nodes, relationships,
  // properties, and pattern matching. Used by Neo4j, Amazon Neptune,
  // and Memgraph.
  //
  //   Format: urn:uor:data:cypher:{hex} (SHA-256 of canonical Cypher schema)
  //   Canonical: schema → sorted node/relationship types → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: cypher + graphql → graph DB↔API bridge
  //                     cypher + sparql → property graph↔RDF bridge

  ["cypher", {
    project: ({ hex }) => `urn:uor:data:cypher:${hex}`,
    fidelity: "lossless",
    spec: "https://opencypher.org/resources/",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 23 — DATA FORMATS: ENCODING & COMPRESSION
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Base64 — Binary-to-Text Encoding ───────────────────────────────────
  // Base64 (RFC 4648) is the standard binary-to-text encoding used in
  // email (MIME), data URIs, JWT tokens, and API payloads. Content-
  // addressing Base64 data creates verifiable identities for encoded
  // binary payloads independent of transport.
  //
  //   Format: urn:uor:data:base64:{hex} (SHA-256 of decoded binary)
  //   Canonical: Base64 → decode → raw bytes → SHA-256
  //   Cross-projection: base64 + cbor → encoded CBOR identity

  ["base64", {
    project: ({ hex }) => `urn:uor:data:base64:${hex}`,
    fidelity: "lossless",
    spec: "https://datatracker.ietf.org/doc/html/rfc4648",
  }],

  // ── ASN.1 / DER — Abstract Syntax Notation ─────────────────────────────
  // ASN.1 (ITU-T X.680) with DER (Distinguished Encoding Rules) is the
  // encoding used for X.509 certificates, CRLs, OCSP responses, LDAP,
  // SNMP MIBs, and telecom signaling (SS7, LTE, 5G NR). DER provides
  // canonical binary encoding — every valid DER encoding is unique.
  //
  // DER is inherently canonical — identical structures always produce
  // identical bytes. This makes DER the ideal encoding for content-
  // addressing cryptographic objects.
  //
  //   Format: urn:uor:data:asn1:{hex} (SHA-256 of DER-encoded structure)
  //   Canonical: ASN.1 → DER encoding → raw bytes → SHA-256
  //   Cross-projection: asn1 + x509 → certificate identity
  //                     asn1 + protobuf → telecom↔web serialization bridge

  ["asn1", {
    project: ({ hex }) => `urn:uor:data:asn1:${hex}`,
    fidelity: "lossless",
    spec: "https://www.itu.int/rec/T-REC-X.690-202102-I/en",
  }],

  // ── BSON — Binary JSON ─────────────────────────────────────────────────
  // BSON (Binary JSON) is the binary-encoded serialization format used by
  // MongoDB. Extends JSON with additional types (ObjectId, Date, Binary,
  // Decimal128, Regex). Every MongoDB document is stored as BSON.
  //
  //   Format: urn:uor:data:bson:{hex} (SHA-256 of canonical BSON)
  //   Canonical: BSON → sorted keys → canonical BSON bytes → SHA-256
  //   Cross-projection: bson + json-schema → MongoDB↔JSON Schema bridge
  //                     bson + cbor → binary JSON variant bridge

  ["bson", {
    project: ({ hex }) => `urn:uor:data:bson:${hex}`,
    fidelity: "lossless",
    spec: "https://bsonspec.org/spec.html",
  }],

  // ── Ion — Amazon's Self-Describing Format ──────────────────────────────
  // Amazon Ion is a richly-typed, self-describing data format supporting
  // both text and binary encodings. Used internally at Amazon for
  // DynamoDB, QLDB (quantum ledger), and S3 Select. Ion provides
  // deterministic binary encoding and hash-based data integrity.
  //
  //   Format: urn:uor:data:ion:{hex} (SHA-256 of canonical Ion binary)
  //   Canonical: Ion → binary encoding → raw bytes → SHA-256
  //   Cross-projection: ion + parquet → Amazon analytics pipeline identity
  //                     ion + cbor → self-describing binary bridge

  ["ion", {
    project: ({ hex }) => `urn:uor:data:ion:${hex}`,
    fidelity: "lossless",
    spec: "https://amazon-ion.github.io/ion-docs/docs/spec.html",
  }],

  // ── Smile — Binary JSON (Jackson) ──────────────────────────────────────
  // Smile is a binary JSON encoding from Jackson (Java). Used in
  // Elasticsearch internal transport, Solr, and Java microservices.
  // Provides 1:1 mapping to JSON with smaller size and faster parsing.
  //
  //   Format: urn:uor:data:smile:{hex} (SHA-256 of Smile binary)
  //   Canonical: Smile → sorted keys → canonical bytes → SHA-256
  //   Cross-projection: smile + bson → binary JSON variant bridge

  ["smile", {
    project: ({ hex }) => `urn:uor:data:smile:${hex}`,
    fidelity: "lossless",
    spec: "https://github.com/FasterXML/smile-format-specification",
  }],

  // ── UBJSON — Universal Binary JSON ─────────────────────────────────────
  // UBJSON provides 1:1 compatibility with JSON using binary encoding.
  // Used for embedded systems and IoT where JSON parsing overhead is
  // prohibitive but JSON compatibility is required.
  //
  //   Format: urn:uor:data:ubjson:{hex} (SHA-256 of UBJSON binary)
  //   Canonical: UBJSON → sorted keys → canonical bytes → SHA-256

  ["ubjson", {
    project: ({ hex }) => `urn:uor:data:ubjson:${hex}`,
    fidelity: "lossless",
    spec: "https://ubjson.org/",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 24 — DATA FORMATS: DOCUMENT & RICH TEXT
  // ═══════════════════════════════════════════════════════════════════════════

  // ── PDF — Portable Document Format ─────────────────────────────────────
  // PDF (ISO 32000-2:2020) is the universal document format. 2.5 trillion
  // PDF documents exist worldwide. PDF/A (ISO 19005) is the archival
  // variant used for legal, government, and scientific records. PDF
  // contains structured content streams, fonts, images, and metadata.
  //
  // Content-addressing PDF creates permanent identities for documents —
  // contracts, papers, invoices, and regulations become tamper-evident.
  //
  //   Format: urn:uor:data:pdf:{hex} (SHA-256 of PDF file bytes)
  //   Canonical: PDF → raw bytes → SHA-256
  //   Cross-projection: pdf + c2pa → document provenance
  //                     pdf + latex → source↔rendered document bridge

  ["pdf", {
    project: ({ hex }) => `urn:uor:data:pdf:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/75839.html",
  }],

  // ── OOXML — Office Open XML ────────────────────────────────────────────
  // OOXML (ISO/IEC 29500) is the format behind .docx, .xlsx, .pptx.
  // Used by Microsoft Office, Google Docs (export), and LibreOffice.
  // OOXML files are ZIP archives containing XML parts with relationships.
  //
  //   Format: urn:uor:data:ooxml:{hex} (SHA-256 of canonical OOXML parts)
  //   Canonical: ZIP → sorted XML parts → canonical XML → SHA-256
  //   Cross-projection: ooxml + odf → Microsoft↔LibreOffice bridge
  //                     ooxml + pdf → editable↔archival document bridge

  ["ooxml", {
    project: ({ hex }) => `urn:uor:data:ooxml:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/71691.html",
  }],

  // ── ODF — Open Document Format ─────────────────────────────────────────
  // ODF (ISO/IEC 26300) is the open standard for office documents (.odt,
  // .ods, .odp). Default format for LibreOffice. ODF files are ZIP
  // archives containing XML content and styles.
  //
  //   Format: urn:uor:data:odf:{hex} (SHA-256 of canonical ODF parts)
  //   Canonical: ZIP → sorted XML parts → canonical XML → SHA-256
  //   Cross-projection: odf + ooxml → open↔proprietary office bridge

  ["odf", {
    project: ({ hex }) => `urn:uor:data:odf:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/66363.html",
  }],

  // ── EPUB — Electronic Publication ──────────────────────────────────────
  // EPUB (ISO/IEC TS 22424) is the standard for reflowable e-books.
  // Used by Apple Books, Kobo, Google Play Books, and Kindle (via
  // conversion). EPUB 3.3 supports XHTML5, CSS, SVG, MathML, and
  // media overlays. An EPUB is a ZIP container with OPF metadata.
  //
  //   Format: urn:uor:data:epub:{hex} (SHA-256 of canonical EPUB)
  //   Canonical: ZIP → sorted content documents → canonical XHTML → SHA-256
  //   Cross-projection: epub + pdf → reflowable↔fixed layout bridge
  //                     epub + markdown → e-book↔source text bridge

  ["epub", {
    project: ({ hex }) => `urn:uor:data:epub:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/epub-33/",
  }],

  // ── RTF — Rich Text Format ─────────────────────────────────────────────
  // RTF is Microsoft's legacy rich text interchange format. Still widely
  // used for clipboard interchange, email composition, and legal
  // documents. Deterministic text-based format with control words.
  //
  //   Format: urn:uor:data:rtf:{hex} (SHA-256 of RTF file)
  //   Canonical: RTF → normalized control words → SHA-256

  ["rtf", {
    project: ({ hex }) => `urn:uor:data:rtf:${hex}`,
    fidelity: "lossless",
    spec: "https://interoperability.blob.core.windows.net/files/Archive_References/[MSFT-RTF].pdf",
  }],

  // ── DocBook — Technical Documentation XML ──────────────────────────────
  // DocBook is the XML vocabulary for technical documentation. Used by
  // Linux kernel docs, FreeBSD handbook, GNOME/KDE documentation, and
  // O'Reilly publications. DocBook 5.1 uses RELAX NG schemas.
  //
  //   Format: urn:uor:data:docbook:{hex} (SHA-256 of canonical DocBook XML)
  //   Canonical: DocBook XML → C14N → SHA-256
  //   Cross-projection: docbook + latex → technical doc↔typesetting bridge
  //                     docbook + markdown → structured↔lightweight markup

  ["docbook", {
    project: ({ hex }) => `urn:uor:data:docbook:${hex}`,
    fidelity: "lossless",
    spec: "https://docbook.org/specs/docbook-v5.1-os.html",
  }],

  // ── DITA — Darwin Information Typing Architecture ──────────────────────
  // DITA (OASIS) is the XML standard for topic-based technical authoring.
  // Used by IBM, Microsoft, SAP, Cisco, and enterprise documentation
  // teams. DITA maps organize topics into publications. Specialization
  // enables domain-specific extensions.
  //
  //   Format: urn:uor:data:dita:{hex} (SHA-256 of canonical DITA map + topics)
  //   Canonical: DITA map → resolved topicrefs → C14N → SHA-256
  //   Cross-projection: dita + docbook → topic↔book documentation bridge

  ["dita", {
    project: ({ hex }) => `urn:uor:data:dita:${hex}`,
    fidelity: "lossless",
    spec: "https://docs.oasis-open.org/dita/dita/v1.3/dita-v1.3-part0-overview.html",
  }],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 25 — DATA FORMATS: GEOSPATIAL & MAPPING
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Shapefile — Esri Vector Data ───────────────────────────────────────
  // Shapefile (Esri) is the most widely used geospatial vector format.
  // Contains geometry (.shp), attributes (.dbf), and index (.shx).
  // Despite being proprietary, it's the de facto standard for GIS data
  // exchange — every GIS system reads/writes shapefiles.
  //
  //   Format: urn:uor:data:shapefile:{hex} (SHA-256 of canonical shapefile set)
  //   Canonical: .shp + .dbf + .shx → sorted records → SHA-256
  //   Cross-projection: shapefile + geojson → Esri↔web geospatial bridge

  ["shapefile", {
    project: ({ hex }) => `urn:uor:data:shapefile:${hex}`,
    fidelity: "lossless",
    spec: "https://www.esri.com/content/dam/esrisites/sitecore-archive/Files/Pdfs/library/whitepapers/pdfs/shapefile.pdf",
  }],

  // ── GeoPackage — OGC Geospatial Container ──────────────────────────────
  // GeoPackage (OGC) is the SQLite-based container for geospatial vector
  // and raster data. Replaces shapefile with support for multiple layers,
  // coordinate systems, and metadata — all in a single portable file.
  //
  //   Format: urn:uor:data:geopackage:{hex} (SHA-256 of GeoPackage file)
  //   Canonical: SQLite → sorted tables → SHA-256
  //   Cross-projection: geopackage + geojson → OGC↔web geospatial bridge
  //                     geopackage + shapefile → modern↔legacy GIS bridge

  ["geopackage", {
    project: ({ hex }) => `urn:uor:data:geopackage:${hex}`,
    fidelity: "lossless",
    spec: "https://www.geopackage.org/spec131/",
  }],

  // ── KML — Keyhole Markup Language ──────────────────────────────────────
  // KML (OGC, originally Google) is the XML format for geographic
  // visualization. Used by Google Earth, Google Maps, and geospatial
  // web applications. KML defines placemarks, polygons, overlays,
  // network links, and 3D models.
  //
  //   Format: urn:uor:data:kml:{hex} (SHA-256 of canonical KML)
  //   Canonical: KML XML → C14N → SHA-256
  //   Cross-projection: kml + geojson → Google Earth↔web mapping bridge

  ["kml", {
    project: ({ hex }) => `urn:uor:data:kml:${hex}`,
    fidelity: "lossless",
    spec: "https://www.ogc.org/standard/kml/",
  }],

  // ── GeoTIFF — Georeferenced Raster ─────────────────────────────────────
  // GeoTIFF embeds geographic metadata (coordinate system, projection,
  // tie points) in standard TIFF images. Used for satellite imagery,
  // aerial photography, elevation models (DEM), and land cover maps.
  // Cloud-Optimized GeoTIFF (COG) enables efficient HTTP range requests.
  //
  //   Format: urn:uor:data:geotiff:{hex} (SHA-256 of GeoTIFF file)
  //   Canonical: GeoTIFF → raw bytes → SHA-256
  //   Cross-projection: geotiff + netcdf → raster↔scientific data bridge

  ["geotiff", {
    project: ({ hex }) => `urn:uor:data:geotiff:${hex}`,
    fidelity: "lossless",
    spec: "https://www.ogc.org/standard/geotiff/",
  }],

  // ── WKT/WKB — Well-Known Text/Binary ───────────────────────────────────
  // WKT (ISO 13249 SQL/MM) and WKB are the standard text and binary
  // representations for geometry objects — used by PostGIS, MySQL Spatial,
  // SQL Server, and every spatial database. WKB is the wire format for
  // geometry exchange between databases and applications.
  //
  //   Format: urn:uor:data:wkt:{hex} (SHA-256 of canonical WKT/WKB)
  //   Canonical: geometry → WKB canonical form → SHA-256
  //   Cross-projection: wkt + geojson → database↔web geometry bridge

  ["wkt", {
    project: ({ hex }) => `urn:uor:data:wkt:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/60343.html",
  }],

  // ── MVT — Mapbox Vector Tiles ──────────────────────────────────────────
  // MVT (Mapbox Vector Tile, OGC Community Standard) is the protobuf-
  // encoded format for serving vector map data as tiles. Used by Mapbox,
  // MapLibre, OpenMapTiles, and every modern web mapping platform.
  //
  //   Format: urn:uor:data:mvt:{hex} (SHA-256 of MVT protobuf)
  //   Canonical: MVT → protobuf binary → SHA-256
  //   Cross-projection: mvt + geojson → tiled↔full-resolution vector bridge
  //                     mvt + protobuf → map tiles↔serialization bridge

  ["mvt", {
    project: ({ hex }) => `urn:uor:data:mvt:${hex}`,
    fidelity: "lossless",
    spec: "https://github.com/mapbox/vector-tile-spec",
  }],

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 26 — DATA FORMATS: SEMANTIC & KNOWLEDGE GRAPHS
  // ══════════════════════════════════════════════════════════════════════════

  // ── N-Triples / N-Quads — RDF Serialization ────────────────────────────
  // N-Triples (W3C) is the line-based RDF serialization — one triple per
  // line, unambiguous, streamable. N-Quads extends with named graphs.
  // Used as the canonical serialization for URDNA2015 (RDF Dataset
  // Normalization) — the very algorithm UOR itself uses for identity.
  //
  //   Format: urn:uor:data:nquads:{hex} (SHA-256 of canonical N-Quads)
  //   Canonical: N-Quads → sort lines → SHA-256
  //   Cross-projection: nquads + jsonld → RDF line↔JSON-LD bridge

  ["nquads", {
    project: ({ hex }) => `urn:uor:data:nquads:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/n-quads/",
  }],

  // ── Turtle — Terse RDF Triple Language ─────────────────────────────────
  // Turtle (W3C) is the human-friendly RDF serialization with prefix
  // declarations, blank nodes, and collections. Most common format for
  // hand-authored ontologies and SHACL shapes.
  //
  //   Format: urn:uor:data:turtle:{hex} (SHA-256 of canonical Turtle)
  //   Canonical: Turtle → expand prefixes → N-Quads → sort → SHA-256
  //   Cross-projection: turtle + nquads → compact↔canonical RDF bridge

  ["turtle", {
    project: ({ hex }) => `urn:uor:data:turtle:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/turtle/",
  }],

  // ── TriG — Named Graph Serialization ───────────────────────────────────
  // TriG (W3C) extends Turtle with named graph syntax for serializing
  // RDF datasets. Used for provenance tracking, access control, and
  // multi-source knowledge graphs.
  //
  //   Format: urn:uor:data:trig:{hex} (SHA-256 of canonical TriG)
  //   Canonical: TriG → expand → N-Quads → sort → SHA-256
  //   Cross-projection: trig + turtle → dataset↔graph RDF bridge

  ["trig", {
    project: ({ hex }) => `urn:uor:data:trig:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/trig/",
  }],

  // ── RDF/XML — Original RDF Serialization ───────────────────────────────
  // RDF/XML (W3C) was the original RDF serialization format. Still used
  // by legacy systems, OWL ontologies, and Dublin Core metadata. While
  // verbose, it's the most widely deployed RDF format in existing systems.
  //
  //   Format: urn:uor:data:rdfxml:{hex} (SHA-256 of canonical RDF/XML)
  //   Canonical: RDF/XML → parse → N-Quads → sort → SHA-256
  //   Cross-projection: rdfxml + turtle → verbose↔compact RDF bridge

  ["rdfxml", {
    project: ({ hex }) => `urn:uor:data:rdfxml:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/rdf-syntax-grammar/",
  }],

  // ── SHACL — Shapes Constraint Language ─────────────────────────────────
  // SHACL (W3C) defines shapes for validating RDF graphs — constraints
  // on node types, property paths, cardinality, value ranges, and
  // patterns. Used for data quality enforcement in knowledge graphs.
  //
  //   Format: urn:uor:data:shacl:{hex} (SHA-256 of canonical SHACL shapes)
  //   Canonical: SHACL Turtle → N-Quads → URDNA2015 → SHA-256
  //   Cross-projection: shacl + json-schema → RDF↔JSON validation bridge

  ["shacl", {
    project: ({ hex }) => `urn:uor:data:shacl:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/shacl/",
  }],

  // ── OWL — Web Ontology Language ────────────────────────────────────────
  // OWL 2 (W3C, ISO/IEC 23765:2022) defines formal ontologies with
  // classes, properties, individuals, and axioms. Three profiles (EL, QL,
  // RL) trade expressivity for computational tractability. Powers
  // biomedical ontologies (SNOMED CT, Gene Ontology), enterprise
  // knowledge graphs, and semantic web reasoning.
  //
  //   Format: urn:uor:data:owl:{hex} (SHA-256 of canonical OWL ontology)
  //   Canonical: OWL → functional syntax → N-Quads → URDNA2015 → SHA-256
  //   Cross-projection: owl + shacl → ontology↔validation bridge
  //                     owl + json-schema → semantic↔structural schema bridge

  ["owl", {
    project: ({ hex }) => `urn:uor:data:owl:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/owl2-overview/",
  }],

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 27 — DATA FORMATS: MEDIA & IMAGE FORMATS
  // ══════════════════════════════════════════════════════════════════════════

  // ── JPEG — Joint Photographic Experts Group ────────────────────────────
  // JPEG (ISO/IEC 10918) is the most widely used lossy image format.
  // Content-addressing JPEG files (by raw bytes, not pixel content)
  // creates permanent identities for specific encoded images.
  //
  //   Format: urn:uor:data:jpeg:{hex} (SHA-256 of JPEG file bytes)
  //   Canonical: JPEG → raw bytes → SHA-256
  //   Cross-projection: jpeg + c2pa → image provenance identity

  ["jpeg", {
    project: ({ hex }) => `urn:uor:data:jpeg:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/18902.html",
  }],

  // ── PNG — Portable Network Graphics ────────────────────────────────────
  // PNG (ISO/IEC 15948, W3C) is the lossless compressed raster format.
  // Used for web graphics, screenshots, UI assets, and scientific
  // visualization. PNG chunks contain metadata, color profiles, and text.
  //
  //   Format: urn:uor:data:png:{hex} (SHA-256 of PNG file bytes)
  //   Canonical: PNG → raw bytes → SHA-256
  //   Cross-projection: png + c2pa → lossless image provenance

  ["png", {
    project: ({ hex }) => `urn:uor:data:png:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/png-3/",
  }],

  // ── WebP — Modern Web Image Format ─────────────────────────────────────
  // WebP (Google) supports both lossy and lossless compression, alpha
  // transparency, and animation. Smaller than JPEG/PNG at equivalent
  // quality. Supported by all modern browsers.
  //
  //   Format: urn:uor:data:webp:{hex} (SHA-256 of WebP file bytes)
  //   Canonical: WebP → raw bytes → SHA-256

  ["webp", {
    project: ({ hex }) => `urn:uor:data:webp:${hex}`,
    fidelity: "lossless",
    spec: "https://developers.google.com/speed/webp/docs/riff_container",
  }],

  // ── AVIF — AV1 Image File Format ───────────────────────────────────────
  // AVIF uses AV1 video codec for still images — superior compression
  // to JPEG and WebP. Supports HDR, wide color gamut, and film grain
  // synthesis. Adopted by Netflix, Google, and Apple.
  //
  //   Format: urn:uor:data:avif:{hex} (SHA-256 of AVIF file bytes)
  //   Canonical: AVIF → raw bytes → SHA-256

  ["avif", {
    project: ({ hex }) => `urn:uor:data:avif:${hex}`,
    fidelity: "lossless",
    spec: "https://aomediacodec.github.io/av1-avif/",
  }],

  // ── TIFF — Tagged Image File Format ────────────────────────────────────
  // TIFF is the professional imaging format for photography, scanning,
  // printing, and medical/scientific imaging. Supports multiple pages,
  // layers, 16/32-bit depth, and various compression methods.
  //
  //   Format: urn:uor:data:tiff:{hex} (SHA-256 of TIFF file bytes)
  //   Canonical: TIFF → raw bytes → SHA-256
  //   Cross-projection: tiff + dicom → medical imaging bridge
  //                     tiff + geotiff → standard↔georeferenced raster

  ["tiff", {
    project: ({ hex }) => `urn:uor:data:tiff:${hex}`,
    fidelity: "lossless",
    spec: "https://www.itu.int/itudoc/itu-t/com16/tiff-fx/docs/tiff6.pdf",
  }],

  // ── HEIF/HEIC — High Efficiency Image Format ──────────────────────────
  // HEIF (ISO/IEC 23008-12) uses HEVC/H.265 for image compression.
  // Default format for Apple iPhone photos. Supports burst photos,
  // live photos, depth maps, and HDR. HEIC is the HEVC-coded variant.
  //
  //   Format: urn:uor:data:heif:{hex} (SHA-256 of HEIF file bytes)
  //   Canonical: HEIF → raw bytes → SHA-256

  ["heif", {
    project: ({ hex }) => `urn:uor:data:heif:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/83650.html",
  }],

  // ── FLAC — Free Lossless Audio Codec ───────────────────────────────────
  // FLAC is the dominant lossless audio format. Used by Tidal, Amazon
  // Music HD, Deezer HiFi, and audiophiles worldwide. FLAC metadata
  // includes Vorbis comments, cue sheets, and album art.
  //
  //   Format: urn:uor:data:flac:{hex} (SHA-256 of FLAC file bytes)
  //   Canonical: FLAC → raw bytes → SHA-256
  //   Cross-projection: flac + midi → audio recording↔notation bridge

  ["flac", {
    project: ({ hex }) => `urn:uor:data:flac:${hex}`,
    fidelity: "lossless",
    spec: "https://xiph.org/flac/format.html",
  }],

  // ── WAV — Waveform Audio ───────────────────────────────────────────────
  // WAV (RIFF/WAVE) is the standard uncompressed audio format. Used for
  // professional audio production, sound effects, and archival. WAV
  // files contain PCM samples with deterministic header structure.
  //
  //   Format: urn:uor:data:wav:{hex} (SHA-256 of WAV file bytes)
  //   Canonical: WAV → raw bytes → SHA-256

  ["wav", {
    project: ({ hex }) => `urn:uor:data:wav:${hex}`,
    fidelity: "lossless",
    spec: "https://www.mmsp.ece.mcgill.ca/Documents/AudioFormats/WAVE/WAVE.html",
  }],

  // ── Ogg/Vorbis/Opus — Open Audio Containers ───────────────────────────
  // Ogg is the open container format from Xiph.org. Opus (RFC 6716) is
  // the state-of-the-art lossy audio codec — superior to MP3, AAC, and
  // Vorbis at all bitrates. Used by Discord, WhatsApp, and WebRTC.
  //
  //   Format: urn:uor:data:ogg:{hex} (SHA-256 of Ogg container bytes)
  //   Canonical: Ogg → raw bytes → SHA-256

  ["ogg", {
    project: ({ hex }) => `urn:uor:data:ogg:${hex}`,
    fidelity: "lossless",
    spec: "https://xiph.org/ogg/doc/rfc3533.txt",
  }],

  // ── MP4/ISOBMFF — ISO Base Media File Format ──────────────────────────
  // ISOBMFF (ISO/IEC 14496-12) is the container format for MP4, MOV,
  // 3GP, HEIF, and AVIF. Contains video (H.264/H.265/AV1), audio
  // (AAC/Opus), subtitles, and metadata in a box-based structure.
  //
  //   Format: urn:uor:data:mp4:{hex} (SHA-256 of MP4 file bytes)
  //   Canonical: MP4 → raw bytes → SHA-256
  //   Cross-projection: mp4 + c2pa → video content provenance

  ["mp4", {
    project: ({ hex }) => `urn:uor:data:mp4:${hex}`,
    fidelity: "lossless",
    spec: "https://www.iso.org/standard/83102.html",
  }],

  // ── WebM — Open Web Video ─────────────────────────────────────────────
  // WebM is the open video container format using VP8/VP9/AV1 video
  // and Vorbis/Opus audio. Default format for YouTube, supported by
  // all modern browsers.
  //
  //   Format: urn:uor:data:webm:{hex} (SHA-256 of WebM file bytes)
  //   Canonical: WebM → raw bytes → SHA-256

  ["webm", {
    project: ({ hex }) => `urn:uor:data:webm:${hex}`,
    fidelity: "lossless",
    spec: "https://www.webmproject.org/docs/container/",
  }],

  // ── MKV — Matroska Container ───────────────────────────────────────────
  // Matroska (MKV/MKA/MKS) is the universal multimedia container using
  // EBML (Extensible Binary Meta Language). Supports unlimited tracks,
  // chapters, tags, and attachments. Used by HandBrake, VLC, and Plex.
  //
  //   Format: urn:uor:data:mkv:{hex} (SHA-256 of MKV file bytes)
  //   Canonical: MKV → raw bytes → SHA-256

  ["mkv", {
    project: ({ hex }) => `urn:uor:data:mkv:${hex}`,
    fidelity: "lossless",
    spec: "https://www.matroska.org/technical/elements.html",
  }],

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 28 — DATA FORMATS: 3D, FONTS & ARCHIVES
  // ══════════════════════════════════════════════════════════════════════════

  // ── glTF — GL Transmission Format ──────────────────────────────────────
  // glTF (Khronos) is the "JPEG of 3D" — the universal 3D asset format.
  // Used by Three.js, Unity, Unreal, Blender, Sketchfab, and every
  // major 3D platform. JSON manifest + binary buffers + textures.
  //
  //   Format: urn:uor:data:gltf:{hex} (SHA-256 of canonical glTF)
  //   Canonical: glTF JSON → sorted keys → SHA-256
  //   Cross-projection: gltf + step-cad → web 3D↔engineering CAD bridge

  ["gltf", {
    project: ({ hex }) => `urn:uor:data:gltf:${hex}`,
    fidelity: "lossless",
    spec: "https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html",
  }],

  // ── USD — Universal Scene Description ──────────────────────────────────
  // USD (Pixar/Apple) is the interchange format for 3D scenes, used in
  // film production (Pixar, ILM, Weta), Apple Vision Pro (visionOS),
  // and NVIDIA Omniverse. Supports composition arcs, variants, and
  // asset resolution for massive scenes.
  //
  //   Format: urn:uor:data:usd:{hex} (SHA-256 of canonical USD)
  //   Canonical: USD → usda text → sorted prims → SHA-256
  //   Cross-projection: usd + gltf → film↔web 3D bridge

  ["usd", {
    project: ({ hex }) => `urn:uor:data:usd:${hex}`,
    fidelity: "lossless",
    spec: "https://openusd.org/release/spec.html",
  }],

  // ── FBX — Filmbox Exchange ─────────────────────────────────────────────
  // FBX (Autodesk) is the dominant interchange format for 3D animation
  // and game development. Supports meshes, skeletons, blend shapes,
  // animation curves, and materials. Used by Maya, 3ds Max, Unity,
  // Unreal Engine, and Blender.
  //
  //   Format: urn:uor:data:fbx:{hex} (SHA-256 of FBX file bytes)
  //   Canonical: FBX → binary → raw bytes → SHA-256
  //   Cross-projection: fbx + gltf → DCC↔web 3D bridge

  ["fbx", {
    project: ({ hex }) => `urn:uor:data:fbx:${hex}`,
    fidelity: "lossless",
    spec: "https://www.autodesk.com/products/fbx/overview",
  }],

  // ── OBJ/MTL — Wavefront 3D ────────────────────────────────────────────
  // OBJ is the simplest widely-used 3D mesh format — ASCII text with
  // vertices, faces, normals, and texture coordinates. MTL defines
  // materials. Used for 3D printing, scientific visualization, and
  // simple asset exchange.
  //
  //   Format: urn:uor:data:obj:{hex} (SHA-256 of canonical OBJ + MTL)
  //   Canonical: OBJ → sorted vertices/faces → SHA-256

  ["obj", {
    project: ({ hex }) => `urn:uor:data:obj:${hex}`,
    fidelity: "lossless",
    spec: "https://www.loc.gov/preservation/digital/formats/fdd/fdd000507.shtml",
  }],

  // ── STL — Stereolithography ────────────────────────────────────────────
  // STL is the universal format for 3D printing — defines triangle
  // meshes for additive manufacturing. Every 3D printer accepts STL.
  // Both ASCII and binary variants exist; binary is standard.
  //
  //   Format: urn:uor:data:stl:{hex} (SHA-256 of STL file bytes)
  //   Canonical: STL binary → raw bytes → SHA-256
  //   Cross-projection: stl + step-cad → 3D print↔engineering bridge

  ["stl", {
    project: ({ hex }) => `urn:uor:data:stl:${hex}`,
    fidelity: "lossless",
    spec: "https://www.loc.gov/preservation/digital/formats/fdd/fdd000504.shtml",
  }],

  // ── 3MF — 3D Manufacturing Format ─────────────────────────────────────
  // 3MF (3MF Consortium: Microsoft, HP, Stratasys) replaces STL for 3D
  // printing with support for color, materials, lattices, and beam
  // structures. XML-based ZIP package with OPC conventions.
  //
  //   Format: urn:uor:data:3mf:{hex} (SHA-256 of canonical 3MF)
  //   Canonical: ZIP → sorted XML parts → C14N → SHA-256
  //   Cross-projection: 3mf + stl → modern↔legacy 3D printing bridge

  ["3mf", {
    project: ({ hex }) => `urn:uor:data:3mf:${hex}`,
    fidelity: "lossless",
    spec: "https://3mf.io/specification/",
  }],

  // ── WOFF2 — Web Open Font Format ───────────────────────────────────────
  // WOFF2 (W3C) is the compressed font format for the web. Uses Brotli
  // compression for 30% smaller files than WOFF. Wraps OpenType/TrueType
  // fonts for web delivery. Used by Google Fonts and every modern website.
  //
  //   Format: urn:uor:data:woff2:{hex} (SHA-256 of WOFF2 file bytes)
  //   Canonical: WOFF2 → raw bytes → SHA-256

  ["woff2", {
    project: ({ hex }) => `urn:uor:data:woff2:${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/WOFF2/",
  }],

  // ── OpenType/TrueType — Font Formats ───────────────────────────────────
  // OpenType (ISO/IEC 14496-22, Microsoft/Adobe) is the universal font
  // format. Supports CFF/CFF2 outlines, TrueType outlines, variable
  // fonts, color fonts (COLR, SVG, CBDT), and OpenType Layout features.
  //
  //   Format: urn:uor:data:opentype:{hex} (SHA-256 of font file bytes)
  //   Canonical: OTF/TTF → raw bytes → SHA-256
  //   Cross-projection: opentype + woff2 → desktop↔web font bridge

  ["opentype", {
    project: ({ hex }) => `urn:uor:data:opentype:${hex}`,
    fidelity: "lossless",
    spec: "https://learn.microsoft.com/en-us/typography/opentype/spec/",
  }],

  // ── ZIP — Archive Container ────────────────────────────────────────────
  // ZIP (ISO/IEC 21320-1) is the most widely used archive format. Used
  // as container for OOXML, ODF, EPUB, JAR, APK, IPA, and many more.
  // ZIP's central directory provides deterministic file listing.
  //
  //   Format: urn:uor:data:zip:{hex} (SHA-256 of ZIP file bytes)
  //   Canonical: ZIP → raw bytes → SHA-256

  ["zip", {
    project: ({ hex }) => `urn:uor:data:zip:${hex}`,
    fidelity: "lossless",
    spec: "https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT",
  }],

  // ── tar — Tape Archive ────────────────────────────────────────────────
  // tar is the UNIX standard for combining files into a single stream.
  // Foundation for distribution (.tar.gz, .tar.xz, .tar.zst). Used by
  // every Linux distribution, container images (OCI layers), and
  // software distribution.
  //
  //   Format: urn:uor:data:tar:{hex} (SHA-256 of tar archive bytes)
  //   Canonical: tar → raw bytes → SHA-256
  //   Cross-projection: tar + oci → container layer identity

  ["tar", {
    project: ({ hex }) => `urn:uor:data:tar:${hex}`,
    fidelity: "lossless",
    spec: "https://pubs.opengroup.org/onlinepubs/9699919799/utilities/pax.html",
  }],

  // ── SQLite — Embedded Database Format ──────────────────────────────────
  // SQLite is the most deployed database engine in the world — embedded
  // in every smartphone, browser, and operating system. The file format
  // is a stable, cross-platform, backward-compatible binary.
  // Recommended by the Library of Congress for archival storage.
  //
  //   Format: urn:uor:data:sqlite:{hex} (SHA-256 of SQLite database file)
  //   Canonical: SQLite → raw bytes → SHA-256
  //   Cross-projection: sqlite + geopackage → engine↔geospatial bridge
  //                     sqlite + sql → embedded↔server database bridge

  ["sqlite", {
    project: ({ hex }) => `urn:uor:data:sqlite:${hex}`,
    fidelity: "lossless",
    spec: "https://www.sqlite.org/fileformat2.html",
  }],

  // ── Zarr — Chunked Array Storage ───────────────────────────────────────
  // Zarr is the chunked, compressed array storage format for large
  // multi-dimensional datasets. Used in climate science, genomics,
  // microscopy, and satellite imagery. Zarr v3 supports cloud-native
  // storage backends (S3, GCS, Azure).
  //
  //   Format: urn:uor:data:zarr:{hex} (SHA-256 of Zarr metadata + chunks)
  //   Canonical: .zarray + .zattrs → sorted keys → JSON-LD → URDNA2015 → SHA-256
  //   Cross-projection: zarr + netcdf → cloud-native↔legacy scientific data
  //                     zarr + hdf5 → chunked↔hierarchical array bridge

  ["zarr", {
    project: ({ hex }) => `urn:uor:data:zarr:${hex}`,
    fidelity: "lossless",
    spec: "https://zarr-specs.readthedocs.io/en/latest/v3/core/v3.0.html",
  }],

  // ── NDJSON — Newline Delimited JSON ────────────────────────────────────
  // NDJSON (JSON Lines) is the standard for streaming JSON records —
  // one JSON object per line. Used by Elasticsearch bulk API, BigQuery
  // exports, log aggregation (Datadog, Splunk), and data pipelines.
  //
  //   Format: urn:uor:data:ndjson:{hex} (SHA-256 of canonical NDJSON)
  //   Canonical: NDJSON → sorted keys per line → SHA-256
  //   Cross-projection: ndjson + csv → streaming↔tabular bridge
  //                     ndjson + parquet → streaming↔columnar bridge

  ["ndjson", {
    project: ({ hex }) => `urn:uor:data:ndjson:${hex}`,
    fidelity: "lossless",
    spec: "https://github.com/ndjson/ndjson-spec",
  }],

  // ── MessagePack Ext — Binary Extensions ────────────────────────────────
  // While base MessagePack is already registered (msgpack), this covers
  // the extension type system used by Redis serialization (RESP3),
  // Fluentd event streams, and embedded systems. Ext types enable
  // custom binary encodings within MessagePack containers.
  //
  // (Note: base msgpack already registered in Tier 10c)

  // ── Bencode — BitTorrent Encoding ──────────────────────────────────────
  // Bencode is the encoding used by BitTorrent for .torrent files and
  // DHT messages. Deterministic by specification — integers, strings,
  // lists, and dictionaries with sorted keys. Used by all BitTorrent
  // clients and the Mainline DHT.
  //
  //   Format: urn:uor:data:bencode:{hex} (SHA-256 of bencoded data)
  //   Canonical: bencode → already deterministic → SHA-256

  ["bencode", {
    project: ({ hex }) => `urn:uor:data:bencode:${hex}`,
    fidelity: "lossless",
    spec: "https://www.bittorrent.org/beps/bep_0003.html",
  }],

  // ── Pickle — Python Serialization ──────────────────────────────────────
  // Pickle is Python's native object serialization protocol. While not
  // deterministic by default, Protocol 5 (PEP 574) with out-of-band
  // buffers provides stable serialization for NumPy arrays and ML
  // model weights. Used by PyTorch, scikit-learn, and joblib.
  //
  //   Format: urn:uor:data:pickle:{hex} (SHA-256 of pickle bytes)
  //   Canonical: pickle → raw bytes → SHA-256
  //   Cross-projection: pickle + onnx → Python ML↔portable model bridge

  ["pickle", {
    project: ({ hex }) => `urn:uor:data:pickle:${hex}`,
    fidelity: "lossy",
    spec: "https://docs.python.org/3/library/pickle.html",
  }],

  // ── Safetensors — ML Model Weights ─────────────────────────────────────
  // Safetensors (Hugging Face) is the safe, fast tensor serialization
  // format replacing pickle for ML model weights. Zero-copy deserialization,
  // no arbitrary code execution, deterministic format. Used by Hugging
  // Face Hub, Stable Diffusion, and LLM distributions.
  //
  //   Format: urn:uor:data:safetensors:{hex} (SHA-256 of safetensors file)
  //   Canonical: safetensors → raw bytes → SHA-256
  //   Cross-projection: safetensors + onnx → weights↔inference model bridge

  ["safetensors", {
    project: ({ hex }) => `urn:uor:data:safetensors:${hex}`,
    fidelity: "lossless",
    spec: "https://huggingface.co/docs/safetensors/index",
  }],

  // ── GGUF — GPT-Generated Unified Format ───────────────────────────────
  // GGUF (llama.cpp) is the quantized model format for local LLM inference.
  // Contains model architecture, tokenizer, and quantized weights in a
  // single file. Used by llama.cpp, Ollama, LM Studio, and GPT4All.
  //
  //   Format: urn:uor:data:gguf:{hex} (SHA-256 of GGUF file bytes)
  //   Canonical: GGUF → raw bytes → SHA-256
  //   Cross-projection: gguf + safetensors → quantized↔full precision bridge

  ["gguf", {
    project: ({ hex }) => `urn:uor:data:gguf:${hex}`,
    fidelity: "lossless",
    spec: "https://github.com/ggerganov/ggml/blob/master/docs/gguf.md",
  }],
]);
