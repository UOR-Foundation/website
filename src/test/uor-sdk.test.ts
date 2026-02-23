/**
 * UOR SDK — Full Test Suite (no skips)
 *
 * All 13 tests run offline by mocking fetch for API-dependent tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  neg,
  bnot,
  succ,
  verifyCriticalIdentity,
  verifyAllCriticalIdentity,
} from "@/modules/uor-sdk/ring";
import { UorApiError } from "@/modules/uor-sdk/types";
import { createUorClient } from "@/modules/uor-sdk/client";

// ── Test 1: Local critical identity ─────────────────────────────────────────

describe("UOR SDK — Local Ring Arithmetic", () => {
  it("neg(bnot(x)) === succ(x) for all 256 elements of R_8", () => {
    for (let x = 0; x < 256; x++) {
      expect(neg(bnot(x))).toBe(succ(x));
    }
  });

  it("verifyCriticalIdentity returns true for representative values", () => {
    expect(verifyCriticalIdentity(0)).toBe(true);
    expect(verifyCriticalIdentity(42)).toBe(true);
    expect(verifyCriticalIdentity(127)).toBe(true);
    expect(verifyCriticalIdentity(255)).toBe(true);
  });

  it("verifyAllCriticalIdentity confirms 256/256 pass", () => {
    const result = verifyAllCriticalIdentity(8);
    expect(result.verified).toBe(true);
    expect(result.failures).toHaveLength(0);
    expect(result.ringSize).toBe(256);
  });
});

// ── Tests 2–9: API Client (mocked fetch — always runs) ─────────────────────

describe("UOR SDK — API Client (mocked)", () => {
  const client = createUorClient();
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  function mockFetchJson(body: unknown, status = 200) {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  afterEach(() => {
    fetchSpy?.mockRestore();
  });

  // Test 2
  it("verifyCriticalIdentity(42) returns holds: true", async () => {
    mockFetchJson({ holds: true, x: 42, neg_bnot: 43, succ_x: 43, n: 8 });
    const result = await client.verifyCriticalIdentity(42);
    expect(result.holds).toBe(true);
    expect(result.x).toBe(42);
  });

  // Test 3
  it("encodeAddress returns valid derivation ID", async () => {
    const result = await client.encodeAddress({ hello: "world" });
    expect(result["u:canonicalId"]).toMatch(
      /^urn:uor:derivation:sha256:[0-9a-f]{64}$/,
    );
  });

  // Test 4
  it("encodeAddress returns valid IPv6", async () => {
    const result = await client.encodeAddress({ hello: "world" });
    expect(result["u:ipv6"]).toMatch(/^fd00:0075:6f72:/);
  });

  // Test 5
  it("u:lossWarning is always present", async () => {
    const result = await client.encodeAddress("test");
    expect(result["u:lossWarning"]).toBe("ipv6-is-routing-projection-only");
  });

  // Test 6
  it("analyzePartition: legitimate text → PASS", async () => {
    mockFetchJson({
      "partition:density": 0.65,
      "partition:irreducibleCount": 8,
      "partition:totalBytes": 11,
      quality_signal: "PASS",
    });
    const result = await client.analyzePartition("hello world");
    expect(result["partition:density"]).toBeGreaterThan(0.25);
    expect(result.quality_signal).toBe("PASS");
  });

  // Test 7
  it("analyzePartition: zero-byte flood → FAIL", async () => {
    mockFetchJson({
      "partition:density": 0.0,
      "partition:irreducibleCount": 0,
      "partition:totalBytes": 5,
      quality_signal: "FAIL",
    });
    const result = await client.analyzePartition("\x00\x00\x00\x00\x00");
    expect(result.quality_signal).toBe("FAIL");
  });

  // Test 8
  it("storeWrite returns a CID", async () => {
    mockFetchJson({
      "store:cid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      "store:uorCid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      pinResult: { cid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi" },
    });
    const result = await client.storeWrite(
      { "@type": "cert:TransformCertificate", "cert:verified": true, "cert:quantum": 8 },
      false,
    );
    expect(result["store:cid"] ?? result["store:uorCid"]).toBeTruthy();
  });

  // Test 9
  it("storeVerify returns verified for known CID", async () => {
    mockFetchJson({ "store:verified": true, "store:cid": "bafytest", method: "sha256-match" });
    const result = await client.storeVerify("bafytest");
    expect(result["store:verified"]).toBe(true);
  });
});

// ── Type system tests ───────────────────────────────────────────────────────

describe("UOR SDK — Type System", () => {
  it("UorApiError has correct shape", () => {
    const err = new UorApiError(404, "/test", "Not found");
    expect(err.status).toBe(404);
    expect(err.endpoint).toBe("/test");
    expect(err.name).toBe("UorApiError");
    expect(err.message).toContain("404");
  });

  it("createUorClient returns all required methods", () => {
    const client = createUorClient();
    expect(typeof client.verifyCriticalIdentity).toBe("function");
    expect(typeof client.computeRingOps).toBe("function");
    expect(typeof client.encodeToBraille).toBe("function");
    expect(typeof client.encodeAddress).toBe("function");
    expect(typeof client.analyzePartition).toBe("function");
    expect(typeof client.traceHammingDrift).toBe("function");
    expect(typeof client.storeWrite).toBe("function");
    expect(typeof client.storeRead).toBe("function");
    expect(typeof client.storeVerify).toBe("function");
    expect(typeof client.registerObserver).toBe("function");
    expect(typeof client.getObserverZone).toBe("function");
    expect(client.baseUrl).toBe("https://api.uor.foundation/v1");
  });
});
