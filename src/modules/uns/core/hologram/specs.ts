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
]);
