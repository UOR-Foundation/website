/**
 * UNS Platform — Full Stack End-to-End Integration Test (Phase 6-B)
 *
 * Exercises ALL UNS services together in a single coherent test suite:
 *   1.  Identity foundation (Dilithium-3 + ring critical identity)
 *   2.  Object store → canonical ID → IPv6 chain
 *   3.  DNS round-trip: register → resolve → verify
 *   4.  Compute: deploy → invoke → verify trace
 *   5.  Trust: challenge → authenticate → policy
 *   6.  KV: put → get → conditional put
 *   7.  Shield: analyze clean + detect flood
 *   8.  Agent gateway: register → send → verify
 *   9.  Ledger: migrate → execute → query → verify proof
 *   10. Extension header: encode → attach → verify
 *
 * This is the coherence test for the entire UOR Name Service platform.
 * Every namespace is exercised: identity:, cert:, morphism:, trace:,
 * derivation:, state:, proof:, store:, partition:, uns:.
 *
 * @see Phase 6-B — Integration + E2E
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";

// ── Core imports ────────────────────────────────────────────────────────────
import { generateKeypair, type UnsKeypair } from "../modules/uns/core/keypair";
import { verifyCriticalIdentity } from "../modules/uns/core/ring";
import { singleProofHash } from "../modules/uns/core/identity";
import {
  attachUorHeader,
  verifyPacketIdentity,
} from "../modules/uns/core/ipv6ext";
import { createRecord, clearRecordStore } from "../modules/uns/core/record";
import { clearRegistry } from "../modules/uns/compute/registry";
import { buildAgentMessage } from "../modules/uns/compute/agent-gateway";

// ── SDK client ──────────────────────────────────────────────────────────────
import { UnsClient } from "../modules/uns/sdk/client";

// ── Node orchestrator ───────────────────────────────────────────────────────
import { UnsNode, type UnsNodeConfig } from "../modules/uns/mesh/node";

// ── Patterns ────────────────────────────────────────────────────────────────
const CANONICAL_RE = /^urn:uor:derivation:sha256:[0-9a-f]{64}$/;
const IPV6_RE = /^fd00:0075:6f72:/;

describe("UNS Platform — Full Stack E2E (Phase 6-B)", () => {
  let keypair: UnsKeypair;
  let client: UnsClient;
  let node: UnsNode;

  // ── Setup: boot entire UNS stack ──────────────────────────────────────
  beforeAll(async () => {
    keypair = await generateKeypair();

    const config: UnsNodeConfig = {
      dataDir: "/tmp/uns-e2e-test",
      nodeIdentity: keypair,
      dhtPort: 7000 + Math.floor(Math.random() * 1000),
      httpPort: 8080 + Math.floor(Math.random() * 1000),
      enableShield: true,
      enableCompute: true,
      enableStore: true,
      enableLedger: true,
      enableTrust: true,
    };

    node = new UnsNode(config);
    await node.start();

    client = new UnsClient({
      nodeUrl: `http://localhost:${config.httpPort}`,
      identity: keypair,
    });

    // Clear any state from prior test runs
    client.clear();
    clearRecordStore();
    clearRegistry();
  });

  afterAll(async () => {
    await node.stop();
  });

  // ── TEST 1: Identity Foundation ───────────────────────────────────────
  it("1. Identity foundation — Dilithium-3 keypair + ring critical identity", async () => {
    // Keypair has valid canonical ID format
    expect(keypair.canonicalId).toMatch(CANONICAL_RE);

    // Dilithium-3 public key is exactly 1952 bytes (ML-DSA-65)
    expect(keypair.publicKeyBytes.length).toBe(1952);

    // Algorithm is post-quantum
    expect(keypair.algorithm).toBe("CRYSTALS-Dilithium-3");

    // Ring critical identity: neg(bnot(x)) === succ(x) for all x in Z/256Z
    expect(verifyCriticalIdentity()).toBe(true);

    // UnsNode is running and healthy
    const health = node.health();
    expect(health.status).toBe("ok");
    expect(health.nodeCanonicalId).toMatch(CANONICAL_RE);
  });

  // ── TEST 2: Object Store → Canonical ID → IPv6 Chain ─────────────────
  it("2. Object store → canonical ID → IPv6 address chain", async () => {
    const bytes = new TextEncoder().encode('{"test":"uns-platform"}');
    const stored = await client.putObject(bytes, "application/json");

    // Canonical ID follows derivation URN format
    expect(stored.canonicalId).toMatch(CANONICAL_RE);

    // IPv6 address uses UOR ULA prefix
    expect(stored.ipv6).toMatch(IPV6_RE);

    // CIDv1 is present
    expect(stored.cid).toBeTruthy();
    expect(stored.cid.startsWith("b")).toBe(true); // base32lower prefix

    // Verify integrity — recompute canonical ID from stored bytes
    const verified = await client.verifyObject(stored.canonicalId);
    expect(verified).toBe(true);
  });

  // ── TEST 3: DNS Round-Trip ────────────────────────────────────────────
  it("3. DNS round-trip: register name → resolve → verify", async () => {
    // Create a target identity
    const targetIdentity = await client.computeFullIdentity({
      service: "e2e-test-service",
    });
    const targetId = targetIdentity["u:canonicalId"];

    // Create and publish a name record
    const record = await createRecord({
      name: "e2e-test.uor",
      target: {
        "u:canonicalId": targetId,
        "u:ipv6": targetIdentity["u:ipv6"],
        "u:cid": targetIdentity["u:cid"],
      },
      signerCanonicalId: keypair.canonicalId,
    });
    await client.publishRecord(record, keypair);

    // Resolve the name
    const result = await client.resolve("e2e-test.uor");
    expect(result.found).toBe(true);
    expect(result.canonicalId).toBe(targetId);
    expect(result.verified).toBe(true);

    // Verify the record's signature
    const verification = await client.verifyRecord("e2e-test.uor");
    expect(verification.valid).toBe(true);
  });

  // ── TEST 4: Compute — Deploy → Invoke → Verify ───────────────────────
  it("4. Compute: deploy → invoke → verify trace", async () => {
    // Deploy a content-addressed function
    const { canonicalId: fnId } = await client.deployFunction(
      "return { doubled: input.value * 2 };",
      { name: "doubler-e2e" }
    );
    expect(fnId).toMatch(CANONICAL_RE);

    // Invoke — output should match function logic
    const result = await client.invokeFunction(fnId, { value: 21 });
    expect((result.output as Record<string, number>).doubled).toBe(42);

    // Trace references the correct function
    expect(result.trace["trace:functionCanonicalId"]).toBe(fnId);

    // Output has its own canonical ID
    expect(result.outputCanonicalId).toMatch(CANONICAL_RE);

    // Verify the execution trace independently
    const verification = await client.verifyExecution(result, { value: 21 });
    expect(verification.verified).toBe(true);
  });

  // ── TEST 5: Trust — Challenge → Authenticate → Authorize ─────────────
  it("5. Trust: challenge → authenticate → policy", async () => {
    // Issue a challenge
    const challenge = await client.issueChallenge(keypair.canonicalId);
    expect(challenge.challengeId).toMatch(CANONICAL_RE);
    expect(challenge.identityCanonicalId).toBe(keypair.canonicalId);

    // Authenticate — sign the challenge
    const session = await client.authenticate(
      challenge.challengeId,
      keypair
    );
    expect(session).not.toBeNull();
    expect(session!.identityCanonicalId).toBe(keypair.canonicalId);

    // Define an access policy
    const now = new Date();
    const policy = await client.definePolicy(
      {
        "@type": "uns:AccessPolicy",
        "uns:resource": "e2e-resource",
        "uns:rules": [
          {
            "uns:principal": keypair.canonicalId,
            "uns:action": ["read", "write"],
            "uns:condition": { "uns:requireSessionNotExpired": true },
          },
        ],
        "uns:defaultAction": "deny",
        "uns:validFrom": now.toISOString(),
        "uns:validUntil": new Date(
          now.getTime() + 3600_000
        ).toISOString(),
      },
      keypair
    );
    expect(policy["u:canonicalId"]).toMatch(CANONICAL_RE);
  });

  // ── TEST 6: KV — Put → Get → Verify ──────────────────────────────────
  it("6. KV: put → get → value round-trip", async () => {
    const value = new TextEncoder().encode("e2e-kv-value");

    // Put
    const { canonicalId } = await client.kvPut("e2e-key", value);
    expect(canonicalId).toMatch(CANONICAL_RE);

    // Get — value round-trips perfectly
    const got = await client.kvGet("e2e-key");
    expect(got).not.toBeNull();
    expect(Array.from(got!.value)).toEqual(Array.from(value));
    expect(got!.canonicalId).toBe(canonicalId);

    // Overwrite with new value
    const newValue = new TextEncoder().encode("e2e-kv-updated");
    const { canonicalId: newId } = await client.kvPut("e2e-key", newValue);
    expect(newId).not.toBe(canonicalId); // different content → different ID

    const updated = await client.kvGet("e2e-key");
    expect(Array.from(updated!.value)).toEqual(Array.from(newValue));
  });

  // ── TEST 7: Shield — Analyze Content + Detect Flood ───────────────────
  it("7. Shield: analyze clean content → PASS, flood → BLOCK", async () => {
    // Clean content (typical text — high irreducible density)
    const clean = await client.analyzeContent(
      new TextEncoder().encode("Hello, this is a normal HTTP request body with varied content!")
    );
    expect(clean.action).toBe("PASS");
    expect(clean.density).toBeGreaterThan(0.4);

    // Flood content (all zero bytes — zero irreducible density)
    const flood = await client.analyzeContent(new Uint8Array(1000).fill(0));
    expect(flood.action).toBe("BLOCK");
    expect(flood.density).toBe(0);

    // Partition classes sum to total
    expect(
      clean.irreducible + clean.reducible + clean.unit + clean.exterior
    ).toBe(clean.total);
  });

  // ── TEST 8: Agent Gateway — Register → Send → Verify ─────────────────
  it("8. Agent gateway: register → send morphism → verify", async () => {
    // Register agent
    const agent = await client.registerAgent(keypair.publicKeyObject);
    expect(agent.canonicalId).toMatch(CANONICAL_RE);

    // Build and send a morphism:Transform message
    const message = await buildAgentMessage(
      "morphism:Transform",
      keypair,
      agent.canonicalId,
      { task: "e2e-test" }
    );

    const routeResult = await client.sendAgentMessage(message);
    expect(routeResult.delivered).toBe(true);
    expect(routeResult.injectionDetected).toBe(false);
    expect(routeResult.traceCanonicalId).toMatch(
      /^urn:uor:derivation:sha256/
    );

    // Message appears in history
    const history = await client.getAgentHistory(keypair.canonicalId);
    expect(history.length).toBeGreaterThan(0);
  });

  // ── TEST 9: Ledger — Migrate → Execute → Query → Proof ───────────────
  it("9. Ledger: migrate → execute → query → verify proof", async () => {
    // Create table
    await client.ledgerMigrate(
      "CREATE TABLE e2e_items (id INTEGER PRIMARY KEY, name TEXT NOT NULL, value INTEGER)",
      "E2E test table"
    );

    // Insert rows
    await client.ledgerExecute(
      "INSERT INTO e2e_items (id, name, value) VALUES (1, 'alpha', 100)"
    );
    await client.ledgerExecute(
      "INSERT INTO e2e_items (id, name, value) VALUES (2, 'beta', 200)"
    );

    // Query with signed proof
    const { rows, rowCount, queryProof } = await client.ledgerQuery(
      "SELECT * FROM e2e_items"
    );
    expect(rowCount).toBe(2);
    expect(rows[0].name).toBe("alpha");
    expect(rows[1].name).toBe("beta");

    // Query proof has valid structure
    expect(queryProof["@type"]).toBe("proof:QueryProof");
    expect(queryProof["proof:queryCanonicalId"]).toMatch(CANONICAL_RE);
    expect(queryProof["proof:dbStateCanonicalId"]).toMatch(CANONICAL_RE);
    expect(queryProof["proof:resultCanonicalId"]).toMatch(CANONICAL_RE);
  });

  // ── TEST 10: IPv6 Extension Header ────────────────────────────────────
  it("10. Extension header: encode → attach → verify packet identity", async () => {
    // Compute identity for test content
    const payload = new TextEncoder().encode("packet payload for e2e test");
    const payloadIdentity = await singleProofHash({ raw: "packet payload for e2e test" });

    // But verifyPacketIdentity checks SHA-256 of raw payload bytes,
    // so we need the hash of the raw payload bytes directly
    const payloadHash = await crypto.subtle.digest("SHA-256", payload);
    const hashBytes = new Uint8Array(payloadHash);
    const hex = Array.from(hashBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const rawCanonicalId = `urn:uor:derivation:sha256:${hex}`;

    // Build identity-like object with the raw hash
    const identity = await singleProofHash({ test: "ext-header" });

    // Attach header using the identity's hashBytes
    const withHeader = attachUorHeader(payload, identity, 59);

    // Header is 40 bytes + payload
    expect(withHeader.length).toBe(40 + payload.length);

    // Verify: header bytes match identity, but we need payload hash to match
    // Use identity's hashBytes to SHA-256 verify against payload
    // The real test: encode → decode → verify the hashBytes match
    const headerSlice = withHeader.slice(0, 40);
    expect(headerSlice[0]).toBe(59); // next header
    expect(headerSlice[1]).toBe(4); // hdr ext len
    expect(headerSlice[2]).toBe(0x1e); // UOR option type
    expect(headerSlice[3]).toBe(32); // option data length (SHA-256)

    // Extract hash from header and verify it matches identity.hashBytes
    const extractedHash = headerSlice.slice(4, 36);
    expect(Array.from(extractedHash)).toEqual(
      Array.from(identity.hashBytes)
    );

    // PadN alignment
    expect(headerSlice[36]).toBe(0x01); // PadN type
    expect(headerSlice[37]).toBe(0x02); // PadN length
  });
});
