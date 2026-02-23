import { describe, it, expect, beforeEach } from "vitest";
import {
  generateKeypair,
  signRecord,
  verifyRecord,
  createRecord,
  publishRecord,
  resolveByName,
  clearRecordStore,
  singleProofHash,
} from "@/modules/uns/core";
import type {
  UnsTarget,
  UnsNameRecord,
  CreateRecordOpts,
} from "@/modules/uns/core";

// ── Shared Fixtures ─────────────────────────────────────────────────────────

const TARGET: UnsTarget = {
  "u:canonicalId": "urn:uor:derivation:sha256:0000000000000000000000000000000000000000000000000000000000000000",
  "u:ipv6": "fd00:0075:6f72:0000:0000:0000:0000:0000",
  "u:cid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
};

function makeOpts(
  keypairCanonicalId: string,
  overrides?: Partial<CreateRecordOpts>
): CreateRecordOpts {
  return {
    name: "example.uor",
    target: TARGET,
    services: [{ "uns:serviceType": "https", "uns:port": 443, "uns:priority": 1 }],
    signerCanonicalId: keypairCanonicalId,
    validFrom: "2025-01-01T00:00:00.000Z",
    validUntil: "2030-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 0-B Tests — 10/10
// ═══════════════════════════════════════════════════════════════════════════

describe("UNS Core — Phase 0-B: Records + PQC Signing", () => {
  beforeEach(() => {
    clearRecordStore();
  });

  // Test 1
  it("1. generateKeypair() returns keypair with algorithm === 'CRYSTALS-Dilithium-3'", async () => {
    const kp = await generateKeypair();
    expect(kp.algorithm).toBe("CRYSTALS-Dilithium-3");
  });

  // Test 2
  it("2. keypair.canonicalId matches derivation URN pattern", async () => {
    const kp = await generateKeypair();
    expect(kp.canonicalId).toMatch(
      /^urn:uor:derivation:sha256:[0-9a-f]{64}$/
    );
  });

  // Test 3
  it("3. publicKeyBytes.length === 1952", async () => {
    const kp = await generateKeypair();
    expect(kp.publicKeyBytes.length).toBe(1952);
  });

  // Test 4
  it("4. signRecord() produces cert:signature block", async () => {
    const kp = await generateKeypair();
    const record = await createRecord(makeOpts(kp.canonicalId));
    const signed = await signRecord(record, kp);
    expect(signed["cert:signature"]).toBeDefined();
    expect(signed["cert:signature"]["@type"]).toBe("cert:Signature");
    expect(signed["cert:signature"]["cert:algorithm"]).toBe("CRYSTALS-Dilithium-3");
    expect(signed["cert:signature"]["cert:signatureBytes"]).toBeTruthy();
  });

  // Test 5
  it("5. verifyRecord() returns true for unmodified signed record", async () => {
    const kp = await generateKeypair();
    const record = await createRecord(makeOpts(kp.canonicalId));
    const signed = await signRecord(record, kp);
    expect(await verifyRecord(signed)).toBe(true);
  });

  // Test 6
  it("6. verifyRecord() returns false if any field is tampered post-signing", async () => {
    const kp = await generateKeypair();
    const record = await createRecord(makeOpts(kp.canonicalId));
    const signed = await signRecord(record, kp);

    // Tamper with the name field
    const tampered = { ...signed, "uns:name": "evil.uor" };
    tampered["cert:signature"] = signed["cert:signature"]; // keep original sig
    expect(await verifyRecord(tampered)).toBe(false);
  });

  // Test 7
  it("7. Two createRecord() calls with same inputs → same u:canonicalId (deterministic)", async () => {
    const kp = await generateKeypair();
    const opts = makeOpts(kp.canonicalId);
    const r1 = await createRecord(opts);
    const r2 = await createRecord(opts);
    expect(r1["u:canonicalId"]).toBe(r2["u:canonicalId"]);
  });

  // Test 8
  it("8. Newer validFrom record supersedes older in resolveByName()", async () => {
    const kp = await generateKeypair();

    const oldOpts = makeOpts(kp.canonicalId, {
      validFrom: "2025-01-01T00:00:00.000Z",
    });
    const newOpts = makeOpts(kp.canonicalId, {
      validFrom: "2025-06-01T00:00:00.000Z",
    });

    const oldRecord = await createRecord(oldOpts);
    const newRecord = await createRecord(newOpts);

    await publishRecord(oldRecord, kp);
    await publishRecord(newRecord, kp);

    const resolved = resolveByName("example.uor");
    expect(resolved).not.toBeNull();
    expect(resolved!["uns:validFrom"]).toBe("2025-06-01T00:00:00.000Z");
  });

  // Test 9
  it("9. Revoked record (uns:revoked: true) is excluded from resolveByName()", async () => {
    const kp = await generateKeypair();

    const normalRecord = await createRecord(makeOpts(kp.canonicalId));
    const revokedRecord = await createRecord(
      makeOpts(kp.canonicalId, { revoked: true })
    );

    await publishRecord(normalRecord, kp);
    await publishRecord(revokedRecord, kp);

    const resolved = resolveByName("example.uor");
    expect(resolved).not.toBeNull();
    expect(resolved!["uns:revoked"]).toBeUndefined();
  });

  // Test 10
  it("10. partition:irreducibleDensity is present and between 0 and 1", async () => {
    const kp = await generateKeypair();
    const record = await createRecord(makeOpts(kp.canonicalId));
    const density = record["partition:irreducibleDensity"];
    expect(density).toBeGreaterThanOrEqual(0);
    expect(density).toBeLessThanOrEqual(1);
  });
});
