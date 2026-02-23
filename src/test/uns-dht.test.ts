import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  UnsDht,
  clearPeerRegistry,
  generateKeypair,
  createRecord,
  signRecord,
  clearRecordStore,
} from "@/modules/uns/core";
import type { UnsTarget, CreateRecordOpts } from "@/modules/uns/core";

// ── Fixtures ────────────────────────────────────────────────────────────────

const TARGET: UnsTarget = {
  "u:canonicalId":
    "urn:uor:derivation:sha256:0000000000000000000000000000000000000000000000000000000000000000",
  "u:ipv6": "fd00:0075:6f72:0000:0000:0000:0000:0000",
  "u:cid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
};

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
// Phase 1-A Tests — 9/9
// ═══════════════════════════════════════════════════════════════════════════

describe("UNS Core — Phase 1-A: DHT", () => {
  let nodeA: UnsDht;
  let nodeB: UnsDht;

  beforeEach(() => {
    clearPeerRegistry();
    clearRecordStore();
    nodeA = new UnsDht({ nodeId: "nodeA", port: 7001 });
    nodeB = new UnsDht({ nodeId: "nodeB", port: 7002 });
  });

  afterEach(async () => {
    await nodeA.stop();
    await nodeB.stop();
  });

  // Test 1
  it("1. Node A starts on port 7001; Node B starts on 7002 bootstrapped to A", async () => {
    await nodeA.start(7001);
    const addrs = nodeA.getMultiaddrs();
    expect(addrs.length).toBeGreaterThanOrEqual(1);

    await nodeB.start(7002, addrs);
    expect(nodeB.getMultiaddrs().length).toBeGreaterThanOrEqual(1);
  });

  // Test 2
  it("2. Node A puts a signed record; Node B retrieves it by canonicalId", async () => {
    await nodeA.start(7001);
    await nodeB.start(7002, nodeA.getMultiaddrs());

    const kp = await generateKeypair();
    const record = await createRecord(makeOpts(kp.canonicalId));
    const signed = await signRecord(record, kp);
    const canonicalId = record["u:canonicalId"]!;

    await nodeA.put(canonicalId, signed);

    const retrieved = await nodeB.get(canonicalId);
    expect(retrieved).not.toBeNull();
    expect(retrieved!["uns:name"]).toBe("example.uor");
  });

  // Test 3
  it("3. Retrieved record passes verifyRecord (Dilithium-3 verification)", async () => {
    await nodeA.start(7001);
    await nodeB.start(7002, nodeA.getMultiaddrs());

    const kp = await generateKeypair();
    const record = await createRecord(makeOpts(kp.canonicalId));
    const signed = await signRecord(record, kp);

    await nodeA.put(record["u:canonicalId"]!, signed);

    // get() internally verifies — if it returns non-null, it's verified
    const retrieved = await nodeB.get(record["u:canonicalId"]!);
    expect(retrieved).not.toBeNull();
    expect(retrieved!["cert:signature"]["@type"]).toBe("cert:Signature");
  });

  // Test 4
  it("4. Tampered record is rejected on get() → returns null", async () => {
    await nodeA.start(7001);
    await nodeB.start(7002, nodeA.getMultiaddrs());

    const kp = await generateKeypair();
    const record = await createRecord(makeOpts(kp.canonicalId));
    const signed = await signRecord(record, kp);
    const canonicalId = record["u:canonicalId"]!;

    // Tamper AFTER signing
    const tampered = {
      ...signed,
      "uns:name": "evil.uor",
    };
    // Force-store the tampered record (bypass put verification)
    // by using a raw JSON store override
    (nodeA as any).store.set(canonicalId, JSON.stringify(tampered));

    // Node B retrieves — should fail verification
    const retrieved = await nodeB.get(canonicalId);
    expect(retrieved).toBeNull();
  });

  // Test 5
  it("5. queryByName returns array sorted by validFrom descending", async () => {
    await nodeA.start(7001);
    await nodeB.start(7002, nodeA.getMultiaddrs());

    const kp = await generateKeypair();

    const r1 = await createRecord(
      makeOpts(kp.canonicalId, { validFrom: "2025-01-01T00:00:00.000Z" })
    );
    const s1 = await signRecord(r1, kp);
    await nodeA.put(r1["u:canonicalId"]!, s1);

    const r2 = await createRecord(
      makeOpts(kp.canonicalId, { validFrom: "2025-06-01T00:00:00.000Z" })
    );
    const s2 = await signRecord(r2, kp);
    await nodeA.put(r2["u:canonicalId"]!, s2);

    const results = await nodeB.queryByName("example.uor");
    expect(results.length).toBe(2);
    // Newest first
    expect(results[0]["uns:validFrom"]).toBe("2025-06-01T00:00:00.000Z");
    expect(results[1]["uns:validFrom"]).toBe("2025-01-01T00:00:00.000Z");
  });

  // Test 6
  it("6. Revoked record is stored but excluded from queryByName", async () => {
    await nodeA.start(7001);
    await nodeB.start(7002, nodeA.getMultiaddrs());

    const kp = await generateKeypair();

    const normal = await createRecord(makeOpts(kp.canonicalId));
    const signedNormal = await signRecord(normal, kp);
    await nodeA.put(normal["u:canonicalId"]!, signedNormal);

    const revoked = await createRecord(
      makeOpts(kp.canonicalId, { revoked: true })
    );
    const signedRevoked = await signRecord(revoked, kp);
    await nodeA.put(revoked["u:canonicalId"]!, signedRevoked);

    const results = await nodeB.queryByName("example.uor");
    // Only non-revoked records
    expect(results.every((r) => !r["uns:revoked"])).toBe(true);
    expect(results.length).toBe(1);
  });

  // Test 7
  it("7. Newer record supersedes older in queryByName first result", async () => {
    await nodeA.start(7001);
    await nodeB.start(7002, nodeA.getMultiaddrs());

    const kp = await generateKeypair();

    const old = await createRecord(
      makeOpts(kp.canonicalId, { validFrom: "2025-01-01T00:00:00.000Z" })
    );
    const signedOld = await signRecord(old, kp);
    await nodeA.put(old["u:canonicalId"]!, signedOld);

    const newer = await createRecord(
      makeOpts(kp.canonicalId, { validFrom: "2026-01-01T00:00:00.000Z" })
    );
    const signedNewer = await signRecord(newer, kp);
    await nodeA.put(newer["u:canonicalId"]!, signedNewer);

    const results = await nodeB.queryByName("example.uor");
    expect(results[0]["uns:validFrom"]).toBe("2026-01-01T00:00:00.000Z");
  });

  // Test 8
  it("8. getMultiaddrs() returns at least one /ip6/ multiaddr", async () => {
    await nodeA.start(7001);
    const addrs = nodeA.getMultiaddrs();
    expect(addrs.length).toBeGreaterThanOrEqual(1);
    expect(addrs[0]).toMatch(/\/ip6\//);
  });

  // Test 9
  it("9. stop() cleanly shuts down both nodes", async () => {
    await nodeA.start(7001);
    await nodeB.start(7002, nodeA.getMultiaddrs());

    await nodeA.stop();
    await nodeB.stop();

    expect(nodeA.getMultiaddrs()).toHaveLength(0);
    expect(nodeB.getMultiaddrs()).toHaveLength(0);
  });
});
