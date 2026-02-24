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
]);
