import { describe, it, expect } from "vitest";
import {
  buildCartridge,
  buildCartridgeFromIdentity,
  serializeCartridge,
  cartridgeHashHex,
  buildQrPayload,
  CARTRIDGE_VERSION,
  CARTRIDGE_BASE_URL,
} from "@/modules/qr-cartridge";
import { decodeCartridgePayload } from "@/modules/qr-cartridge/decoder";
import { singleProofHash, bytesToHex } from "@/modules/uns/core";

// ═══════════════════════════════════════════════════════════════════════════
// QR Cartridge Module — Canonical Compliance Tests
// ═══════════════════════════════════════════════════════════════════════════

describe("QR Cartridge — Canonical Encoding", () => {
  const testObj = { "@type": "VideoObject", name: "Test Movie" };

  it("1. same object → same QR payload (determinism)", async () => {
    const id1 = await singleProofHash(testObj);
    const id2 = await singleProofHash(testObj);
    const p1 = buildQrPayload(id1);
    const p2 = buildQrPayload(id2);
    expect(p1.combined).toBe(p2.combined);
    expect(p1.hashHex).toBe(p2.hashHex);
  });

  it("2. key-order invariant: {a,b} and {b,a} produce same cartridge", async () => {
    const c1 = await buildCartridge({ alpha: 1, beta: 2 });
    const c2 = await buildCartridge({ beta: 2, alpha: 1 });
    expect(c1["u:canonicalId"]).toBe(c2["u:canonicalId"]);
  });

  it("3. QR payload URL starts with CARTRIDGE_BASE_URL", async () => {
    const id = await singleProofHash(testObj);
    const payload = buildQrPayload(id);
    expect(payload.combined).toContain(CARTRIDGE_BASE_URL);
  });

  it("4. QR payload contains #sha256= fragment with 64 hex chars", async () => {
    const id = await singleProofHash(testObj);
    const payload = buildQrPayload(id);
    const match = payload.combined.match(/#sha256=([0-9a-f]{64})$/);
    expect(match).toBeTruthy();
  });

  it("5. cartridge has correct @type and version", async () => {
    const c = await buildCartridge(testObj, { mediaType: "video/mp4" });
    expect(c["@type"]).toBe("uor:Cartridge");
    expect(c["cartridge:version"]).toBe(CARTRIDGE_VERSION);
    expect(c["cartridge:mediaType"]).toBe("video/mp4");
  });

  it("6. cartridge resolvers include HTTP, IPFS, and IPv6", async () => {
    const c = await buildCartridge(testObj);
    expect(c["cartridge:resolvers"].length).toBeGreaterThanOrEqual(3);
    expect(c["cartridge:resolvers"][0]).toContain("https://");
    expect(c["cartridge:resolvers"][1]).toContain("ipfs://");
    expect(c["cartridge:resolvers"][2]).toContain("ip6://");
  });

  it("7. u:lossWarning is always present", async () => {
    const c = await buildCartridge(testObj);
    expect(c["u:lossWarning"]).toBe("ipv6-is-routing-projection-only");
  });

  it("8. serializeCartridge strips hashBytes", async () => {
    const c = await buildCartridge(testObj);
    const json = serializeCartridge(c);
    expect(json).not.toContain("hashBytes");
    const parsed = JSON.parse(json);
    expect(parsed["u:canonicalId"]).toBe(c["u:canonicalId"]);
  });

  it("9. cartridgeHashHex matches identity hash", async () => {
    const id = await singleProofHash(testObj);
    const c = buildCartridgeFromIdentity(id);
    expect(cartridgeHashHex(c)).toBe(bytesToHex(id.hashBytes));
  });
});

describe("QR Cartridge — Decoder Round-Trip", () => {
  const testObj = { "@type": "MusicRecording", name: "Test Song" };

  it("10. full URL round-trip: encode → decode → same canonicalId", async () => {
    const id = await singleProofHash(testObj);
    const payload = buildQrPayload(id);
    const decoded = await decodeCartridgePayload(payload.combined);
    expect(decoded.valid).toBe(true);
    expect(decoded.identity!["u:canonicalId"]).toBe(id["u:canonicalId"]);
  });

  it("11. raw hex round-trip: 64-char hex → decode → valid identity", async () => {
    const id = await singleProofHash(testObj);
    const hex = bytesToHex(id.hashBytes);
    const decoded = await decodeCartridgePayload(hex);
    expect(decoded.valid).toBe(true);
    expect(decoded.identity!["u:glyph"]).toBe(id["u:glyph"]);
  });

  it("12. fragment-only round-trip: #sha256={hex} → decode → valid", async () => {
    const id = await singleProofHash(testObj);
    const hex = bytesToHex(id.hashBytes);
    const decoded = await decodeCartridgePayload(`#sha256=${hex}`);
    expect(decoded.valid).toBe(true);
    expect(decoded.identity!["u:ipv6"]).toBe(id["u:ipv6"]);
  });

  it("13. invalid payload returns valid=false with error", async () => {
    const decoded = await decodeCartridgePayload("not-a-valid-payload");
    expect(decoded.valid).toBe(false);
    expect(decoded.error).toBeTruthy();
  });

  it("14. different objects → different cartridge identities", async () => {
    const c1 = await buildCartridge({ type: "movie" });
    const c2 = await buildCartridge({ type: "music" });
    expect(c1["u:canonicalId"]).not.toBe(c2["u:canonicalId"]);
  });
});
