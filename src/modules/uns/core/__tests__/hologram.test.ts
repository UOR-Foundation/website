/**
 * Hologram Projection Registry — Tests
 * ═════════════════════════════════════
 *
 * Verifies that every registered projection produces deterministic,
 * spec-compliant identifiers from the same canonical identity.
 */

import { describe, it, expect } from "vitest";
import { project, PROJECTIONS } from "../hologram";
import type { UorCanonicalIdentity } from "../address";

// ── Test fixture: a deterministic identity ──────────────────────────────────

function makeIdentity(): UorCanonicalIdentity {
  // 32 bytes: 0x00..0x1f
  const hashBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) hashBytes[i] = i;
  const hex = Array.from(hashBytes).map(b => b.toString(16).padStart(2, "0")).join("");

  return {
    "u:canonicalId": `urn:uor:derivation:sha256:${hex}`,
    "u:ipv6": "fd00:0075:6f72:0001:0203:0405:0607:0809",
    "u:ipv6PrefixLength": 48,
    "u:contentBits": 80,
    "u:lossWarning": "ipv6-is-routing-projection-only",
    "u:cid": "bafyreitest123",
    "u:glyph": Array.from(hashBytes).map(b => String.fromCodePoint(0x2800 + b)).join(""),
    "u:length": 32,
    hashBytes,
  };
}

const IDENTITY = makeIdentity();
const HEX = IDENTITY["u:canonicalId"].split(":").pop()!;

// ── Core contract ───────────────────────────────────────────────────────────

describe("Hologram Projection Registry", () => {
  it("registers at least 33 projections", () => {
    expect(PROJECTIONS.size).toBeGreaterThanOrEqual(33);
  });

  // ── Tier 0: Foundational Standards ──────────────────────────────────────

  it("jsonld projection returns canonical URN", () => {
    expect(project(IDENTITY, "jsonld").value).toBe(`urn:uor:derivation:sha256:${HEX}`);
    expect(project(IDENTITY, "jsonld").fidelity).toBe("lossless");
  });

  it("vc projection returns VC URN", () => {
    expect(project(IDENTITY, "vc").value).toBe(`urn:uor:vc:bafyreitest123`);
    expect(project(IDENTITY, "vc").fidelity).toBe("lossless");
  });

  it("every spec has project function, fidelity, and spec URL", () => {
    for (const [name, spec] of PROJECTIONS) {
      expect(typeof spec.project).toBe("function");
      expect(["lossless", "lossy"]).toContain(spec.fidelity);
      expect(spec.spec).toMatch(/^https?:\/\//);
      if (spec.fidelity === "lossy") {
        expect(spec.lossWarning).toBeTruthy();
      }
    }
  });

  it("project() returns all projections when no target specified", () => {
    const hologram = project(IDENTITY);
    expect(hologram.source.hex).toBe(HEX);
    expect(hologram.source.cid).toBe("bafyreitest123");
    expect(Object.keys(hologram.projections).length).toBe(PROJECTIONS.size);
  });

  it("project(identity, target) returns single projection", () => {
    const p = project(IDENTITY, "did");
    expect(p.value).toBe(`did:uor:bafyreitest123`);
    expect(p.fidelity).toBe("lossless");
  });

  it("project() throws on unknown target", () => {
    expect(() => project(IDENTITY, "nonexistent")).toThrow("Unknown projection");
  });

  // ── Determinism: same input → same output ─────────────────────────────

  it("all projections are deterministic", () => {
    const a = project(IDENTITY);
    const b = project(IDENTITY);
    for (const key of Object.keys(a.projections)) {
      expect(a.projections[key].value).toBe(b.projections[key].value);
    }
  });

  // ── Individual projection correctness ─────────────────────────────────

  it("cid projection returns identity CID", () => {
    expect(project(IDENTITY, "cid").value).toBe("bafyreitest123");
  });

  it("did projection prefixes with did:uor:", () => {
    expect(project(IDENTITY, "did").value).toBe("did:uor:bafyreitest123");
  });

  it("ipv6 projection uses fd00:0075:6f72 prefix", () => {
    expect(project(IDENTITY, "ipv6").value).toMatch(/^fd00:0075:6f72:/);
  });

  it("webfinger uses acct: scheme with 16-char hex prefix", () => {
    const wf = project(IDENTITY, "webfinger").value;
    expect(wf).toMatch(/^acct:[0-9a-f]{16}@uor\.foundation$/);
  });

  it("activitypub uses full hex for lossless resolution", () => {
    const ap = project(IDENTITY, "activitypub").value;
    expect(ap).toBe(`https://uor.foundation/ap/objects/${HEX}`);
    expect(project(IDENTITY, "activitypub").fidelity).toBe("lossless");
  });

  it("atproto uses AT URI scheme with did:uor authority", () => {
    const at = project(IDENTITY, "atproto").value;
    expect(at).toMatch(/^at:\/\/did:uor:.+\/app\.uor\.object\//);
  });

  it("oidc uses URN with full hex for lossless sub claim", () => {
    expect(project(IDENTITY, "oidc").value).toBe(`urn:uor:oidc:${HEX}`);
  });

  it("gs1 uses GS1 Digital Link with GIAI path", () => {
    expect(project(IDENTITY, "gs1").value).toMatch(/^https:\/\/id\.gs1\.org\/8004\//);
  });

  it("oci uses standard docker/OCI digest format", () => {
    expect(project(IDENTITY, "oci").value).toBe(`sha256:${HEX}`);
  });

  it("solid uses WebID profile URL with #me fragment", () => {
    expect(project(IDENTITY, "solid").value).toMatch(/^https:\/\/uor\.foundation\/profile\/[0-9a-f]+#me$/);
  });

  it("openbadges uses UUIDv4 format", () => {
    const v = project(IDENTITY, "openbadges").value;
    expect(v).toMatch(/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("scitt uses IETF SCITT statement URN with full hex", () => {
    expect(project(IDENTITY, "scitt").value).toBe(`urn:ietf:params:scitt:statement:sha256:${HEX}`);
    expect(project(IDENTITY, "scitt").fidelity).toBe("lossless");
  });

  it("mls uses IETF MLS group URN with full hex", () => {
    expect(project(IDENTITY, "mls").value).toBe(`urn:ietf:params:mls:group:${HEX}`);
  });

  it("dnssd uses _tcp.local service name", () => {
    expect(project(IDENTITY, "dnssd").value).toMatch(/^_uor-[0-9a-f]{12}\._tcp\.local$/);
  });

  it("stac uses STAC item URL with full hex", () => {
    expect(project(IDENTITY, "stac").value).toBe(`https://uor.foundation/stac/items/${HEX}`);
  });

  it("croissant uses Croissant dataset URL with full hex", () => {
    expect(project(IDENTITY, "croissant").value).toBe(`https://uor.foundation/croissant/${HEX}`);
  });

  it("crdt uses deterministic Automerge document ID with full hex", () => {
    expect(project(IDENTITY, "crdt").value).toBe(`crdt:automerge:${HEX}`);
    expect(project(IDENTITY, "crdt").fidelity).toBe("lossless");
  });

  // ── Bitcoin Protocol — SHA-256 Native Alignment ───────────────────────

  it("bitcoin projection produces valid OP_RETURN script (6a24 + UOR magic + hash)", () => {
    const p = project(IDENTITY, "bitcoin");
    // 6a = OP_RETURN, 24 = push 36 bytes, 554f52 = "UOR", then 64 hex chars
    expect(p.value).toMatch(/^6a24554f52[0-9a-f]{64}$/);
    expect(p.value.length).toBe(10 + 64); // prefix + full hash
    expect(p.fidelity).toBe("lossless");
    // Verify the embedded hash matches the source identity
    expect(p.value.slice(10)).toBe(HEX);
  });

  it("bitcoin-hashlock projection produces valid OP_SHA256 script", () => {
    const p = project(IDENTITY, "bitcoin-hashlock");
    // a8 = OP_SHA256, 20 = push 32 bytes, {hash}, 87 = OP_EQUAL
    expect(p.value).toMatch(/^a820[0-9a-f]{64}87$/);
    expect(p.value.length).toBe(4 + 64 + 2); // opcodes + hash + OP_EQUAL
    expect(p.fidelity).toBe("lossless");
    // Verify the embedded hash matches the source identity
    expect(p.value.slice(4, 68)).toBe(HEX);
  });

  it("bitcoin projections are deterministic and hash-preserving", () => {
    const opreturn = project(IDENTITY, "bitcoin");
    const hashlock = project(IDENTITY, "bitcoin-hashlock");
    // Both embed the same hash
    expect(opreturn.value.slice(10)).toBe(hashlock.value.slice(4, 68));
    // Both are lossless
    expect(opreturn.fidelity).toBe("lossless");
    expect(hashlock.fidelity).toBe("lossless");
  });

  // ── Lightning BOLT-11 — Payment Hash Projection ───────────────────────

  it("lightning projection produces valid BOLT-11 p tagged field", () => {
    const p = project(IDENTITY, "lightning");
    // pp5 prefix (tag=1, length=52) + 52 bech32 chars
    expect(p.value).toMatch(/^pp5[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{52}$/);
    expect(p.value.length).toBe(3 + 52); // "pp5" + 52 data chars
    expect(p.fidelity).toBe("lossless");
  });

  it("lightning projection is deterministic", () => {
    const a = project(IDENTITY, "lightning").value;
    const b = project(IDENTITY, "lightning").value;
    expect(a).toBe(b);
  });

  it("lightning payment_hash encodes the same identity as bitcoin projections", () => {
    const ln = project(IDENTITY, "lightning");
    const btc = project(IDENTITY, "bitcoin");
    // Both are lossless projections of the same 256-bit identity
    expect(ln.fidelity).toBe("lossless");
    expect(btc.fidelity).toBe("lossless");
    // Decode the bech32 data back to verify round-trip integrity
    const A = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
    const data5bit = ln.value.slice(3).split("").map(c => A.indexOf(c));
    // Convert 5-bit groups back to 8-bit bytes
    let bits = 0, value = 0;
    const bytes: number[] = [];
    for (const group of data5bit) {
      value = (value << 5) | group;
      bits += 5;
      while (bits >= 8) {
        bits -= 8;
        bytes.push((value >> bits) & 0xff);
      }
    }
    // The decoded bytes should match the original hashBytes (first 32)
    expect(bytes.length).toBe(32);
    for (let i = 0; i < 32; i++) {
      expect(bytes[i]).toBe(i); // Our test fixture uses 0x00..0x1f
    }
  });

  // ── Nostr NIP-01/NIP-19 — Social Protocol Projection ───────────────────

  it("nostr projection returns raw 64-char lowercase hex event ID", () => {
    const p = project(IDENTITY, "nostr");
    expect(p.value).toBe(HEX);
    expect(p.value).toMatch(/^[0-9a-f]{64}$/);
    expect(p.fidelity).toBe("lossless");
  });

  it("nostr-note projection returns bech32m-encoded note1... identifier", () => {
    const p = project(IDENTITY, "nostr-note");
    expect(p.value).toMatch(/^note1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/);
    expect(p.fidelity).toBe("lossless");
    // note1 + 52 data chars + 6 checksum chars = 59+ chars
    expect(p.value.length).toBeGreaterThanOrEqual(59);
  });

  it("nostr projection is deterministic", () => {
    const a = project(IDENTITY, "nostr").value;
    const b = project(IDENTITY, "nostr").value;
    expect(a).toBe(b);
  });

  it("nostr-note projection is deterministic", () => {
    const a = project(IDENTITY, "nostr-note").value;
    const b = project(IDENTITY, "nostr-note").value;
    expect(a).toBe(b);
  });

  it("nostr event ID matches bitcoin OP_RETURN embedded hash", () => {
    const nostrId = project(IDENTITY, "nostr").value;
    const btcScript = project(IDENTITY, "bitcoin").value;
    expect(btcScript.slice(10)).toBe(nostrId);
  });

  // ── Zcash — Bitcoin-Compatible Privacy Duality ─────────────────────────

  it("zcash-transparent produces identical script to bitcoin projection", () => {
    const btc = project(IDENTITY, "bitcoin").value;
    const zec = project(IDENTITY, "zcash-transparent").value;
    // Zcash transparent IS Bitcoin script — outputs must be byte-identical
    expect(zec).toBe(btc);
    expect(project(IDENTITY, "zcash-transparent").fidelity).toBe("lossless");
  });

  it("zcash-memo produces valid ZIP-302 typed memo (512 bytes)", () => {
    const p = project(IDENTITY, "zcash-memo");
    // 512 bytes = 1024 hex chars
    expect(p.value.length).toBe(1024);
    // Header: f5 (no particular meaning), 01 (UOR v1), 01 (SHA-256 type)
    expect(p.value.slice(0, 6)).toBe("f50101");
    // Embedded hash matches source identity (bytes 3-34 = chars 6-70)
    expect(p.value.slice(6, 70)).toBe(HEX);
    // Remaining 477 bytes are zero-padded
    expect(p.value.slice(70)).toBe("00".repeat(477));
    expect(p.fidelity).toBe("lossless");
  });

  it("zcash-transparent and zcash-memo embed the same 256-bit identity", () => {
    const transparent = project(IDENTITY, "zcash-transparent").value;
    const memo = project(IDENTITY, "zcash-memo").value;
    // Extract hash from both projections
    const hashFromTransparent = transparent.slice(10); // after 6a24554f52
    const hashFromMemo = memo.slice(6, 70);            // after f50101
    expect(hashFromTransparent).toBe(hashFromMemo);
    expect(hashFromTransparent).toBe(HEX);
  });

  it("zcash-transparent matches bitcoin OP_RETURN — cross-chain identity proof", () => {
    const btcHash = project(IDENTITY, "bitcoin").value.slice(10);
    const zecHash = project(IDENTITY, "zcash-transparent").value.slice(10);
    const nostrId = project(IDENTITY, "nostr").value;
    // All three protocols see the same 256-bit identity
    expect(btcHash).toBe(zecHash);
    expect(btcHash).toBe(nostrId);
  });

  it("zcash projections are deterministic", () => {
    expect(project(IDENTITY, "zcash-transparent").value).toBe(project(IDENTITY, "zcash-transparent").value);
    expect(project(IDENTITY, "zcash-memo").value).toBe(project(IDENTITY, "zcash-memo").value);
  });

  it("lossy projections always carry a lossWarning", () => {
    const hologram = project(IDENTITY);
    for (const [, p] of Object.entries(hologram.projections)) {
      if (p.fidelity === "lossy") {
        expect(p.lossWarning).toBeTruthy();
      }
    }
  });

  it("lossless projections never carry a lossWarning", () => {
    const hologram = project(IDENTITY);
    for (const [, p] of Object.entries(hologram.projections)) {
      if (p.fidelity === "lossless") {
        expect(p.lossWarning).toBeUndefined();
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 7 — AGENTIC AI INFRASTRUCTURE (Moltbook Agent Stack)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── ERC-8004 — On-Chain Agent Identity ────────────────────────────────

  it("erc8004 projection embeds full hex as on-chain tokenId", () => {
    const p = project(IDENTITY, "erc8004");
    expect(p.value).toBe(`erc8004:1:agent-registry:${HEX}`);
    expect(p.fidelity).toBe("lossless");
  });

  it("erc8004 identity matches bitcoin OP_RETURN — cross-ledger proof", () => {
    const erc = project(IDENTITY, "erc8004").value.split(":").pop()!;
    const btc = project(IDENTITY, "bitcoin").value.slice(10);
    expect(erc).toBe(btc);
  });

  // ── x402 — Agent Payment Protocol ────────────────────────────────────

  it("x402 projection produces payment hash with full identity", () => {
    const p = project(IDENTITY, "x402");
    expect(p.value).toBe(`x402:sha256:${HEX}`);
    expect(p.fidelity).toBe("lossless");
  });

  it("x402 payment hash enables content-gated commerce via bitcoin-hashlock", () => {
    const x402Hash = project(IDENTITY, "x402").value.split(":").pop()!;
    const hashlockHash = project(IDENTITY, "bitcoin-hashlock").value.slice(4, 68);
    // Same identity gates the payment and identifies the service
    expect(x402Hash).toBe(hashlockHash);
  });

  // ── MCP Tool Provenance ──────────────────────────────────────────────

  it("mcp-tool projection produces URN with full hash", () => {
    const p = project(IDENTITY, "mcp-tool");
    expect(p.value).toBe(`urn:uor:mcp:tool:${HEX}`);
    expect(p.fidelity).toBe("lossless");
  });

  // ── skill.md — Supply Chain Integrity ────────────────────────────────

  it("skill-md projection produces URN with full hash", () => {
    const p = project(IDENTITY, "skill-md");
    expect(p.value).toBe(`urn:uor:skill:${HEX}`);
    expect(p.fidelity).toBe("lossless");
  });

  it("skill-md hash can be verified via bitcoin timestamp", () => {
    const skillHash = project(IDENTITY, "skill-md").value.split(":").pop()!;
    const btcEmbedded = project(IDENTITY, "bitcoin").value.slice(10);
    expect(skillHash).toBe(btcEmbedded);
  });

  // ── A2A — Agent-to-Agent Communication ───────────────────────────────

  it("a2a projection produces URN with full hash", () => {
    const p = project(IDENTITY, "a2a");
    expect(p.value).toBe(`urn:uor:a2a:agent:${HEX}`);
    expect(p.fidelity).toBe("lossless");
  });

  // ── OASF — Open Agent Service Framework ──────────────────────────────

  it("oasf projection uses CID for native IPFS alignment", () => {
    const p = project(IDENTITY, "oasf");
    expect(p.value).toBe(`urn:uor:oasf:bafyreitest123`);
    expect(p.fidelity).toBe("lossless");
  });

  // ── Cross-Framework Identity Equivalence ─────────────────────────────

  it("all agent infrastructure projections share the same 256-bit identity", () => {
    const erc = project(IDENTITY, "erc8004").value.split(":").pop()!;
    const x402 = project(IDENTITY, "x402").value.split(":").pop()!;
    const mcp = project(IDENTITY, "mcp-tool").value.split(":").pop()!;
    const skill = project(IDENTITY, "skill-md").value.split(":").pop()!;
    const a2a = project(IDENTITY, "a2a").value.split(":").pop()!;
    const nostr = project(IDENTITY, "nostr").value;
    const btc = project(IDENTITY, "bitcoin").value.slice(10);
    // One hash, seven protocols
    expect(erc).toBe(x402);
    expect(x402).toBe(mcp);
    expect(mcp).toBe(skill);
    expect(skill).toBe(a2a);
    expect(a2a).toBe(nostr);
    expect(nostr).toBe(btc);
  });

  it("agent infrastructure projections are all deterministic", () => {
    for (const name of ["erc8004", "x402", "mcp-tool", "skill-md", "a2a", "oasf"]) {
      expect(project(IDENTITY, name).value).toBe(project(IDENTITY, name).value);
    }
  });

  it("all agent infrastructure projections are lossless", () => {
    for (const name of ["erc8004", "x402", "mcp-tool", "skill-md", "a2a", "oasf"]) {
      expect(project(IDENTITY, name).fidelity).toBe("lossless");
    }
  });
});
