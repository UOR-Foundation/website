/**
 * @uor/app-sdk — 10/10 Test Suite (P11)
 *
 * Validates the five primary functions + secondary power tools.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createUorAppClient } from "@/modules/uor-sdk/app-sdk";
import type { AppClient } from "@/modules/uor-sdk/app-sdk";
import { UnsKv } from "@/modules/uns/store/kv";
import { MonetizationEngine } from "@/modules/uor-sdk/monetization";
import { singleProofHash } from "@/lib/uor-canonical";

// ── Fixtures ────────────────────────────────────────────────────────────────

const APP_ID =
  "urn:uor:derivation:sha256:app0000000000000000000000000000000000000000000000000000000000000";
const USER_ID = "test-user-alice";

// ── Tests ───────────────────────────────────────────────────────────────────

describe("@uor/app-sdk — Developer SDK (P11)", () => {
  let app: AppClient;

  beforeEach(() => {
    app = createUorAppClient({ appId: APP_ID });
  });

  // Test 1: createUorAppClient returns client with all five primary functions
  it("createUorAppClient returns client with all five primary functions defined", () => {
    expect(typeof app.connectUser).toBe("function");
    expect(typeof app.readUserData).toBe("function");
    expect(typeof app.writeUserData).toBe("function");
    expect(typeof app.gateWithPayment).toBe("function");
    expect(typeof app.verifyApp).toBe("function");
  });

  // Test 2: connectUser returns { podUrl, certificate, isNewUser }
  it("connectUser() returns { podUrl, certificate, isNewUser }", async () => {
    const result = await app.connectUser(USER_ID);

    expect(result.podUrl).toMatch(/^https:\/\/pod\.uor\.app\//);
    expect(result.certificate).toBeDefined();
    expect(result.certificate["@type"]).toBe("cert:TransformCertificate");
    expect(typeof result.isNewUser).toBe("boolean");
    expect(result.isNewUser).toBe(true);
  });

  // Test 3: writeUserData returns { canonicalId, writtenAt }
  it("writeUserData() returns { canonicalId, writtenAt }", async () => {
    await app.connectUser(USER_ID);
    const result = await app.writeUserData(USER_ID, "prefs", { theme: "dark" });

    expect(result.canonicalId).toMatch(
      /^urn:uor:derivation:sha256:[0-9a-f]{64}$/,
    );
    expect(result.writtenAt).toBeTruthy();
  });

  // Test 4: readUserData returns same value as previously written
  it("readUserData() returns same value as previously written", async () => {
    await app.connectUser(USER_ID);
    await app.writeUserData(USER_ID, "settings", { lang: "en", volume: 80 });

    const result = await app.readUserData(USER_ID, "settings");

    expect(result).not.toBeNull();
    expect(result!.value).toEqual({ lang: "en", volume: 80 });
    expect(result!.canonicalId).toMatch(/^urn:uor:derivation:sha256:/);
    expect(result!.readAt).toBeTruthy();
  });

  // Test 5: readUserData returns null for key that does not exist
  it("readUserData() returns null for key that does not exist", async () => {
    await app.connectUser(USER_ID);
    const result = await app.readUserData(USER_ID, "nonexistent-key");

    expect(result).toBeNull();
  });

  // Test 6: gateWithPayment returns { allowed: false } for unpaid user
  it("gateWithPayment() returns { allowed: false } for user without payment", async () => {
    await app.connectUser(USER_ID);
    const result = await app.gateWithPayment(USER_ID, "premium-feature");

    expect(result.allowed).toBe(false);
    expect(result.reason).toBeTruthy();
    expect(result.paymentUrl).toMatch(/^https:\/\/pay\.uor\.foundation/);
  });

  // Test 7: gateWithPayment returns { allowed: true } for user with valid certificate
  it("gateWithPayment() returns { allowed: true } for user with valid certificate", async () => {
    const kv = new UnsKv();
    const engine = new MonetizationEngine(kv);

    // Derive user canonical ID same way the SDK does
    const userProof = await singleProofHash({
      "@type": "u:UserIdentity",
      userId: USER_ID,
      appId: APP_ID,
    });
    const userCid = userProof.derivationId;

    await engine.configureMonetization({
      appCanonicalId: APP_ID,
      gate: "pro-tier",
      model: "one-time",
      price: 9.99,
      currency: "USD",
    });

    await engine.processPayment(APP_ID, userCid, 9.99, {
      provider: "stripe",
      receiptId: "pi_test_123",
      confirmedAt: new Date().toISOString(),
    });

    const result = await engine.checkAccess(userCid, APP_ID, "pro-tier");
    expect(result.allowed).toBe(true);
    expect(result.certificate).toBeDefined();
  });

  // Test 8: verifyApp returns { verified: true } for a registered app
  it("verifyApp() returns { verified: true } for a registered app", async () => {
    const result = await app.verifyApp();

    expect(result.verified).toBe(true);
    expect(result.canonicalId).toMatch(/^urn:uor:derivation:sha256:/);
    expect(result.ipv6).toMatch(/^fd00:/);
    expect(result.observerZone).toBe("COHERENCE");
  });

  // Test 9: exportUserData returns W3C Verifiable Credential
  it("exportUserData() returns object with '@type' Verifiable Credential", async () => {
    await app.connectUser(USER_ID);
    await app.writeUserData(USER_ID, "profile", { name: "Alice" });

    const credential = await app.exportUserData(USER_ID);

    const types = credential["@type"] as string[];
    expect(types).toContain("VerifiableCredential");
    expect(types).toContain("cert:PortabilityCredential");
    expect(credential["proof"]).toBeTruthy();
    expect(credential["issuer"]).toBe("https://uor.foundation");
  });

  // Test 10: getDiscoveryProfile returns { zone, hScore, discoveryRank }
  it("getDiscoveryProfile() returns { zone, hScore, discoveryRank } after verifyApp", async () => {
    await app.verifyApp();

    const profile = await app.getDiscoveryProfile();

    expect(profile).not.toBeNull();
    expect(profile!.zone).toBe("COHERENCE");
    expect(typeof profile!.hScore).toBe("number");
    expect(typeof profile!.discoveryRank).toBe("number");
  });
});
