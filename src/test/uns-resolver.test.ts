import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  UnsDht,
  UnsResolver,
  clearPeerRegistry,
  generateKeypair,
  createRecord,
  signRecord,
  clearRecordStore,
} from "@/modules/uns/core";
import type {
  UnsTarget,
  CreateRecordOpts,
  ResolutionResult,
  ResolutionError,
  VerificationResult,
  PublishResult,
  ResolverInfo,
} from "@/modules/uns/core";

// ── Fixtures ────────────────────────────────────────────────────────────────

const TARGET: UnsTarget = {
  "u:canonicalId":
    "urn:uor:derivation:sha256:0000000000000000000000000000000000000000000000000000000000000001",
  "u:ipv6": "fd00:0075:6f72:0000:0000:0000:0000:0001",
  "u:cid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
};

const RESOLVER_ID =
  "urn:uor:derivation:sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function makeOpts(
  signerCanonicalId: string,
  overrides?: Partial<CreateRecordOpts>
): CreateRecordOpts {
  return {
    name: "example.uor",
    target: TARGET,
    services: [
      { "uns:serviceType": "https", "uns:port": 443, "uns:priority": 1 },
    ],
    signerCanonicalId,
    validFrom: "2025-01-01T00:00:00.000Z",
    validUntil: "2030-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 1-B Tests — 10/10
// ═══════════════════════════════════════════════════════════════════════════

describe("UNS Core — Phase 1-B: Resolver API", () => {
  let dht: UnsDht;
  let resolver: UnsResolver;

  beforeEach(async () => {
    clearPeerRegistry();
    clearRecordStore();
    dht = new UnsDht({ nodeId: "resolver-node", port: 8053 });
    await dht.start(8053);
    resolver = new UnsResolver(dht, RESOLVER_ID);
  });

  afterEach(async () => {
    await dht.stop();
  });

  // Helper: seed a signed record into the DHT
  async function seedRecord(overrides?: Partial<CreateRecordOpts>) {
    const kp = await generateKeypair();
    const opts = makeOpts(kp.canonicalId, overrides);
    const record = await createRecord(opts);
    const signed = await signRecord(record, kp);
    await dht.put(record["u:canonicalId"]!, signed);
    return { kp, record, signed };
  }

  // Test 1
  it("1. POST /uns/resolve with known name → 200 with u:canonicalId, u:ipv6, proof", async () => {
    await seedRecord();

    const result = await resolver.resolve({
      "uns:query": "example.uor",
      "uns:queryType": "canonical-id",
    });

    expect("status" in result).toBe(false);
    const res = result as ResolutionResult;
    expect(res["@type"]).toBe("uns:ResolutionResult");
    expect(res["u:canonicalId"]).toBeDefined();
    expect(res["u:ipv6"]).toBeDefined();
    expect(res["proof:coherenceProof"]).toBeDefined();
    expect(res["uns:record"]).toBeDefined();
  });

  // Test 2
  it("2. proof:coherenceProof.proof:verified === true", async () => {
    await seedRecord();

    const result = (await resolver.resolve({
      "uns:query": "example.uor",
    })) as ResolutionResult;

    expect(result["proof:coherenceProof"]["proof:verified"]).toBe(true);
  });

  // Test 3
  it("3. proof:criticalIdentityCheck.proof:holds === true", async () => {
    await seedRecord();

    const result = (await resolver.resolve({
      "uns:query": "example.uor",
    })) as ResolutionResult;

    const check = result["proof:coherenceProof"]["proof:criticalIdentityCheck"];
    expect(check["proof:holds"]).toBe(true);
    expect(check["proof:neg_bnot_42"]).toBe(43);
    expect(check["proof:succ_42"]).toBe(43);
  });

  // Test 4
  it("4. u:lossWarning === 'ipv6-is-routing-projection-only'", async () => {
    await seedRecord();

    const result = (await resolver.resolve({
      "uns:query": "example.uor",
    })) as ResolutionResult;

    expect(result["u:lossWarning"]).toBe("ipv6-is-routing-projection-only");
  });

  // Test 5
  it("5. POST /uns/resolve with unknown name → 404", async () => {
    const result = await resolver.resolve({
      "uns:query": "nonexistent.uor",
    });

    expect("status" in result).toBe(true);
    expect((result as ResolutionError).status).toBe(404);
  });

  // Test 6
  it("6. POST /uns/resolve with revoked record name → 410", async () => {
    await seedRecord({ revoked: true });

    const result = await resolver.resolve({
      "uns:query": "example.uor",
    });

    expect("status" in result).toBe(true);
    expect((result as ResolutionError).status).toBe(410);
  });

  // Test 7
  it("7. POST /uns/record with invalid signature → 422", async () => {
    const kp = await generateKeypair();
    const record = await createRecord(makeOpts(kp.canonicalId));
    const signed = await signRecord(record, kp);

    // Tamper after signing
    const tampered = { ...signed, "uns:name": "evil.uor" };

    const result = await resolver.publishRecord(tampered);
    expect("status" in result).toBe(true);
    expect((result as ResolutionError).status).toBe(422);
  });

  // Test 8
  it("8. POST /uns/record with density < 0.15 → 422 (anti-spam)", async () => {
    const kp = await generateKeypair();
    // Create record with no services, no time window, minimal target → low density
    const record = await createRecord({
      name: "spam.uor",
      target: {
        "u:canonicalId": "",
        "u:ipv6": "",
        "u:cid": "",
      },
      signerCanonicalId: kp.canonicalId,
    });
    // Force density to 0 for testing
    record["partition:irreducibleDensity"] = 0;
    // Re-sign with forced low density (need to recompute identity)
    const signed = await signRecord(record, kp);

    const result = await resolver.publishRecord(signed);
    expect("status" in result).toBe(true);
    expect((result as ResolutionError).status).toBe(422);
    expect((result as ResolutionError).error).toContain("anti-spam");
  });

  // Test 9
  it("9. GET /uns/record/{id}/verify → all four boolean fields present", async () => {
    const { record } = await seedRecord();

    const result = await resolver.verifyRecord(record["u:canonicalId"]!);
    expect("status" in result).toBe(false);

    const v = result as VerificationResult;
    expect(typeof v["proof:verified"]).toBe("boolean");
    expect(typeof v["proof:signatureValid"]).toBe("boolean");
    expect(typeof v["proof:recordNotExpired"]).toBe("boolean");
    expect(typeof v["proof:notRevoked"]).toBe("boolean");
  });

  // Test 10
  it("10. GET /uns/resolver/info → resolverCanonicalId matches pattern", () => {
    const info = resolver.getInfo() as ResolverInfo;

    expect(info["uns:resolverCanonicalId"]).toMatch(
      /^urn:uor:derivation:sha256:[0-9a-f]{64}$/
    );
    expect(info["uns:version"]).toBe("1.0.0");
    expect(typeof info["uns:dhtPeers"]).toBe("number");
    expect(typeof info["uns:uptimeSeconds"]).toBe("number");
  });
});
