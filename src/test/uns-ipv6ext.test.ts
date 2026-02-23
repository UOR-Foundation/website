import { describe, it, expect } from "vitest";
import {
  encodeDestOptHeader,
  decodeDestOptHeader,
  verifyPacketIdentity,
  attachUorHeader,
  singleProofHash,
  UOR_OPTION_TYPE,
  sha256,
  bytesToHex,
} from "@/modules/uns/core";

// ── Fixtures ────────────────────────────────────────────────────────────────

/** A deterministic 32-byte hash for testing. */
const TEST_HASH = new Uint8Array(32);
for (let i = 0; i < 32; i++) TEST_HASH[i] = i;

const NEXT_HEADER_TCP = 6;

// ═══════════════════════════════════════════════════════════════════════════
// Phase 0-C Tests — 12/12
// ═══════════════════════════════════════════════════════════════════════════

describe("UNS Core — Phase 0-C: IPv6 Extension Header", () => {
  // Test 1
  it("1. encodeDestOptHeader produces exactly 40 bytes", () => {
    const buf = encodeDestOptHeader({
      nextHeader: NEXT_HEADER_TCP,
      hashBytes: TEST_HASH,
    });
    expect(buf.length).toBe(40);
  });

  // Test 2
  it("2. First byte is nextHeader value", () => {
    const buf = encodeDestOptHeader({
      nextHeader: NEXT_HEADER_TCP,
      hashBytes: TEST_HASH,
    });
    expect(buf[0]).toBe(NEXT_HEADER_TCP);
  });

  // Test 3
  it("3. Second byte is 4 (HdrExtLen: (4+1)*8=40 bytes total)", () => {
    const buf = encodeDestOptHeader({
      nextHeader: 59,
      hashBytes: TEST_HASH,
    });
    expect(buf[1]).toBe(4);
  });

  // Test 4
  it("4. Byte at offset 2 is 0x1E (UOR option type)", () => {
    const buf = encodeDestOptHeader({
      nextHeader: 59,
      hashBytes: TEST_HASH,
    });
    expect(buf[2]).toBe(UOR_OPTION_TYPE);
    expect(buf[2]).toBe(0x1e);
  });

  // Test 5
  it("5. Byte at offset 3 is 32 (option data length)", () => {
    const buf = encodeDestOptHeader({
      nextHeader: 59,
      hashBytes: TEST_HASH,
    });
    expect(buf[3]).toBe(32);
  });

  // Test 6
  it("6. Bytes 4..35 are the 32 SHA-256 hash bytes", () => {
    const buf = encodeDestOptHeader({
      nextHeader: 59,
      hashBytes: TEST_HASH,
    });
    const embedded = buf.slice(4, 36);
    expect(Array.from(embedded)).toEqual(Array.from(TEST_HASH));
  });

  // Test 7
  it("7. Bytes 36..39 are PadN: [0x01, 0x02, 0x00, 0x00]", () => {
    const buf = encodeDestOptHeader({
      nextHeader: 59,
      hashBytes: TEST_HASH,
    });
    expect(buf[36]).toBe(0x01);
    expect(buf[37]).toBe(0x02);
    expect(buf[38]).toBe(0x00);
    expect(buf[39]).toBe(0x00);
  });

  // Test 8
  it("8. decode(encode(opts)).hashBytes deep-equals opts.hashBytes", () => {
    const opts = { nextHeader: 17, hashBytes: TEST_HASH };
    const encoded = encodeDestOptHeader(opts);
    const decoded = decodeDestOptHeader(encoded);
    expect(decoded).not.toBeNull();
    expect(Array.from(decoded!.hashBytes)).toEqual(Array.from(TEST_HASH));
    expect(decoded!.nextHeader).toBe(17);
  });

  // Test 9
  it("9. decodeDestOptHeader returns null for buffer with no 0x1E option", () => {
    // A minimal valid header with only PadN options, no UOR option
    const buf = new Uint8Array(8);
    buf[0] = 59; // nextHeader
    buf[1] = 0; // hdrExtLen = 0 → (0+1)*8 = 8 bytes
    buf[2] = 0x01; // PadN type
    buf[3] = 0x04; // PadN len = 4
    // 4 bytes of zero padding
    expect(decodeDestOptHeader(buf)).toBeNull();
  });

  // Test 10
  it("10. verifyPacketIdentity returns true for matching payload+identity", async () => {
    const payload = new TextEncoder().encode("hello UNS");
    const hashBytes = await sha256(payload);
    const hex = bytesToHex(hashBytes);
    const canonicalId = `urn:uor:derivation:sha256:${hex}`;

    const header = encodeDestOptHeader({ nextHeader: 59, hashBytes });
    expect(await verifyPacketIdentity(header, payload, canonicalId)).toBe(true);
  });

  // Test 11
  it("11. verifyPacketIdentity returns false if payload is modified after header creation", async () => {
    const payload = new TextEncoder().encode("original data");
    const hashBytes = await sha256(payload);
    const hex = bytesToHex(hashBytes);
    const canonicalId = `urn:uor:derivation:sha256:${hex}`;

    const header = encodeDestOptHeader({ nextHeader: 59, hashBytes });
    const tamperedPayload = new TextEncoder().encode("tampered data");
    expect(
      await verifyPacketIdentity(header, tamperedPayload, canonicalId)
    ).toBe(false);
  });

  // Test 12
  it("12. attachUorHeader output length === 40 + payload.length", async () => {
    const payload = new TextEncoder().encode("test payload");
    const identity = await singleProofHash({ test: "data" });
    const result = attachUorHeader(payload, identity, 59);
    expect(result.length).toBe(40 + payload.length);
  });
});
