import { describe, it, expect } from "vitest";
import {
  verifyCriticalIdentity,
  singleProofHash,
  verifyCanonical,
  verifyIpv6Routing,
  ipv6ToContentBytes,
} from "@/modules/uns/core";

// ═══════════════════════════════════════════════════════════════════════════
// Test 1: Critical identity holds for all 256 elements
// ═══════════════════════════════════════════════════════════════════════════

describe("UNS Core — Ring R_8", () => {
  it("1. verifyCriticalIdentity() returns true (256/256 elements)", () => {
    expect(verifyCriticalIdentity()).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tests 2–10: Canonical Identity Engine
// ═══════════════════════════════════════════════════════════════════════════

describe("UNS Core — Canonical Identity Engine", () => {
  const testObj = { hello: "world" };

  it("2. same object → same canonicalId on every call (determinism)", async () => {
    const id1 = await singleProofHash(testObj);
    const id2 = await singleProofHash(testObj);
    expect(id1["u:canonicalId"]).toBe(id2["u:canonicalId"]);
  });

  it("3. key-order does not affect canonicalId (URDNA2015 canonical)", async () => {
    const a = await singleProofHash({ alpha: 1, beta: 2 });
    const b = await singleProofHash({ beta: 2, alpha: 1 });
    expect(a["u:canonicalId"]).toBe(b["u:canonicalId"]);
  });

  it("4. IPv6 matches UOR ULA pattern", async () => {
    const id = await singleProofHash(testObj);
    expect(id["u:ipv6"]).toMatch(
      /^fd00:0075:6f72:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}$/
    );
  });

  it("5. u:lossWarning is always 'ipv6-is-routing-projection-only'", async () => {
    const id = await singleProofHash(testObj);
    expect(id["u:lossWarning"]).toBe("ipv6-is-routing-projection-only");
  });

  it("6. verifyCanonical returns true for same object, false for different", async () => {
    const id = await singleProofHash(testObj);
    expect(await verifyCanonical(testObj, id["u:canonicalId"])).toBe(true);
    expect(await verifyCanonical({ hello: "mars" }, id["u:canonicalId"])).toBe(false);
  });

  it("7. verifyIpv6Routing returns true for derived IPv6, false for tampered", async () => {
    const id = await singleProofHash(testObj);
    expect(verifyIpv6Routing(id["u:ipv6"], id.hashBytes)).toBe(true);
    expect(verifyIpv6Routing("fd00:0075:6f72:dead:beef:cafe:babe:1234", id.hashBytes)).toBe(false);
  });

  it("8. CID matches base32lower CIDv1 pattern", async () => {
    const id = await singleProofHash(testObj);
    expect(id["u:cid"]).toMatch(/^b[a-z2-7]+$/);
  });

  it("9. different content → different canonicalId AND different IPv6", async () => {
    const id1 = await singleProofHash({ content: "alpha" });
    const id2 = await singleProofHash({ content: "beta" });
    expect(id1["u:canonicalId"]).not.toBe(id2["u:canonicalId"]);
    expect(id1["u:ipv6"]).not.toBe(id2["u:ipv6"]);
  });

  it("10. round-trip: ipv6ToContentBytes(ipv6)[0..9] === hashBytes[0..9]", async () => {
    const id = await singleProofHash(testObj);
    const contentBytes = ipv6ToContentBytes(id["u:ipv6"]);
    const expectedBytes = id.hashBytes.slice(0, 10);
    expect(Array.from(contentBytes)).toEqual(Array.from(expectedBytes));
  });
});
