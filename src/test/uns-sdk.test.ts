/**
 * UNS SDK — Integration Test Suite (Phase 5-D)
 *
 * 10 tests covering all UNS services via the UnsClient.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { UnsClient } from "../modules/uns/sdk/client";
import { generateKeypair } from "../modules/uns/core/keypair";
import { createRecord, clearRecordStore } from "../modules/uns/core/record";
import { clearRegistry } from "../modules/uns/compute/registry";
import { buildAgentMessage } from "../modules/uns/compute/agent-gateway";
import type { UnsKeypair } from "../modules/uns/core/keypair";

const CANONICAL_RE = /^urn:uor:derivation:sha256:[0-9a-f]{64}$/;
const IPV6_RE = /^fd00:0075:6f72:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}$/;

describe("UNS SDK — Phase 5-D Integration Tests", () => {
  let keypair: UnsKeypair;
  let client: UnsClient;

  beforeEach(async () => {
    keypair = await generateKeypair();
    client = new UnsClient({
      nodeUrl: "http://localhost:8080",
      identity: keypair,
    });
    client.clear();
    clearRecordStore();
    clearRegistry();
  });

  it("1. computeCanonicalId returns valid URN format", async () => {
    const id = await client.computeCanonicalId({ hello: "world" });
    expect(id).toMatch(CANONICAL_RE);
  });

  it("2. computeIPv6 returns UOR prefix pattern", async () => {
    const ipv6 = await client.computeIPv6({ hello: "world" });
    expect(ipv6).toMatch(IPV6_RE);
  });

  it("3. publishRecord + resolve returns the published record", async () => {
    const targetIdentity = await client.computeFullIdentity({ target: "test" });
    const targetId = targetIdentity["u:canonicalId"];

    const record = await createRecord({
      name: "sdk-test.uor.foundation",
      target: {
        "u:canonicalId": targetId,
        "u:ipv6": targetIdentity["u:ipv6"],
        "u:cid": targetIdentity["u:cid"],
      },
      signerCanonicalId: keypair.canonicalId,
    });

    await client.publishRecord(record, keypair);
    const resolved = await client.resolve("sdk-test.uor.foundation");

    expect(resolved.found).toBe(true);
    expect(resolved.canonicalId).toBe(targetId);
    expect(resolved.verified).toBe(true);
  });

  it("4. deployFunction + invokeFunction returns correct output", async () => {
    const { canonicalId } = await client.deployFunction(
      "return input.x * 2;",
      { name: "doubler" }
    );
    expect(canonicalId).toMatch(CANONICAL_RE);

    const result = await client.invokeFunction(canonicalId, { x: 21 });
    expect(result.output).toBe(42);
    expect(result.outputCanonicalId).toMatch(CANONICAL_RE);
  });

  it("5. putObject + getObject round-trips bytes perfectly", async () => {
    const original = new TextEncoder().encode("UOR content-addressed storage");
    const stored = await client.putObject(original, "text/plain");
    expect(stored.canonicalId).toMatch(CANONICAL_RE);

    const retrieved = await client.getObject(stored.canonicalId);
    expect(retrieved).not.toBeNull();
    expect(Array.from(retrieved!.bytes)).toEqual(Array.from(original));
  });

  it("6. kvPut + kvGet round-trips value", async () => {
    const value = new TextEncoder().encode("kv-test-value");
    const { canonicalId } = await client.kvPut("test-key", value);
    expect(canonicalId).toMatch(CANONICAL_RE);

    const retrieved = await client.kvGet("test-key");
    expect(retrieved).not.toBeNull();
    expect(Array.from(retrieved!.value)).toEqual(Array.from(value));
    expect(retrieved!.canonicalId).toBe(canonicalId);
  });

  it("7. ledgerMigrate + ledgerQuery returns rows with queryProof", async () => {
    await client.ledgerMigrate(
      "CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)",
      "Create items table"
    );
    await client.ledgerExecute(
      "INSERT INTO items (id, name) VALUES (1, 'Alpha')"
    );

    const result = await client.ledgerQuery("SELECT * FROM items");
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].name).toBe("Alpha");
    expect(result.queryProof).toBeDefined();
    expect(result.queryProof["@type"]).toBe("proof:QueryProof");
  });

  it("8. registerAgent + sendAgentMessage delivers valid morphism", async () => {
    const registration = await client.registerAgent(keypair.publicKeyObject);
    expect(registration.canonicalId).toMatch(CANONICAL_RE);

    const message = await buildAgentMessage(
      "morphism:Transform",
      keypair,
      registration.canonicalId,
      { greeting: "hello" }
    );

    const result = await client.sendAgentMessage(message);
    expect(result.delivered).toBe(true);
    expect(result.traceCanonicalId).toMatch(/^urn:uor:derivation:sha256/);
  });

  it("9. verifyObject returns true for stored object", async () => {
    const content = new TextEncoder().encode("verify-me");
    const stored = await client.putObject(content, "text/plain");
    const verified = await client.verifyObject(stored.canonicalId);
    expect(verified).toBe(true);
  });

  it("10. verifyExecution returns true for genuine trace", async () => {
    const { canonicalId } = await client.deployFunction(
      "return input.v + 1;",
      { name: "inc" }
    );
    const input = { v: 10 };
    const result = await client.invokeFunction(canonicalId, input);
    const verification = await client.verifyExecution(result, input);
    expect(verification.verified).toBe(true);
  });
});
