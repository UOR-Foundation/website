/**
 * Sovereign User Data Layer (P4) — 10/10 Test Suite
 *
 * Validates Solid Pod provisioning, app binding, data access,
 * audit trail, and GDPR export.
 */

import { describe, it, expect } from "vitest";
import {
  PodManager,
  connectUser,
  writeUserData,
  readUserData,
  getUserHistory,
  exportUserData,
} from "@/modules/uor-sdk/sovereign-data";

// ── Fixtures ────────────────────────────────────────────────────────────────

const USER_ID =
  "urn:uor:derivation:sha256:user000000000000000000000000000000000000000000000000000000000000";
const APP_ID =
  "urn:uor:derivation:sha256:app0000000000000000000000000000000000000000000000000000000000000";
const APP_ID_2 =
  "urn:uor:derivation:sha256:app1111111111111111111111111111111111111111111111111111111111111";

// ── Tests ───────────────────────────────────────────────────────────────────

describe("Sovereign User Data Layer (P4)", () => {
  // Test 1: Pod provisioning creates valid pod context
  it("PodManager.provision() creates pod context with valid podUrl", async () => {
    const pm = new PodManager();
    const ctx = await pm.provision(USER_ID);

    expect(ctx.podUrl).toMatch(/^https:\/\/pod\.uor\.app\/[a-z0-9]+\/$/);
    expect(ctx.userCanonicalId).toBe(USER_ID);
    expect(ctx.accessToken).toBeTruthy();
    expect(ctx.createdAt).toBeTruthy();
  });

  // Test 2: getOrProvision is idempotent
  it("PodManager.getOrProvision() returns same pod on repeated calls", async () => {
    const pm = new PodManager();
    const ctx1 = await pm.getOrProvision(USER_ID);
    const ctx2 = await pm.getOrProvision(USER_ID);

    expect(ctx1.podUrl).toBe(ctx2.podUrl);
    expect(ctx1.createdAt).toBe(ctx2.createdAt);
  });

  // Test 3: bindApp returns cert:TransformCertificate
  it("PodManager.bindApp() returns a cert:TransformCertificate JSON-LD object", async () => {
    const pm = new PodManager();
    const ctx = await pm.provision(USER_ID);
    const cert = await pm.bindApp(ctx, APP_ID);

    expect(cert["@type"]).toBe("cert:TransformCertificate");
    expect(cert["cert:certifies"]).toContain(ctx.podUrl);
    expect(cert["cert:grantedActions"]).toContain("morphism:Read");
    expect(cert["cert:grantedActions"]).toContain("morphism:Write");
    expect(cert["cert:cid"]).toBeTruthy();
  });

  // Test 4: revokeBinding removes app from listBindings
  it("PodManager.revokeBinding() removes app from listBindings()", async () => {
    const pm = new PodManager();
    const ctx = await pm.provision(USER_ID);
    await pm.bindApp(ctx, APP_ID);
    await pm.bindApp(ctx, APP_ID_2);

    let bindings = await pm.listBindings(USER_ID);
    expect(bindings).toContain(APP_ID);
    expect(bindings).toContain(APP_ID_2);

    await pm.revokeBinding(USER_ID, APP_ID);

    bindings = await pm.listBindings(USER_ID);
    expect(bindings).not.toContain(APP_ID);
    expect(bindings).toContain(APP_ID_2);
  });

  // Test 5: connectUser returns binding certificate
  it("connectUser() returns bindingCertificate with cert:TransformCertificate type", async () => {
    const pm = new PodManager();
    const result = await connectUser(USER_ID, APP_ID, pm);

    expect(result.bindingCertificate["@type"]).toBe(
      "cert:TransformCertificate"
    );
    expect(result.podUrl).toMatch(/^https:\/\/pod\.uor\.app\//);
  });

  // Test 6: writeUserData returns canonical ID
  it("writeUserData() returns canonical ID of stored value", async () => {
    const pm = new PodManager();
    await connectUser(USER_ID, APP_ID, pm);

    const result = await writeUserData(
      USER_ID,
      APP_ID,
      "preferences",
      { theme: "dark", lang: "en" },
      pm
    );

    expect(result.canonicalId).toMatch(
      /^urn:uor:derivation:sha256:[0-9a-f]{64}$/
    );
    expect(result.writtenAt).toBeTruthy();
  });

  // Test 7: readUserData returns same value as written
  it("readUserData() returns same value as previously written", async () => {
    const pm = new PodManager();
    await connectUser(USER_ID, APP_ID, pm);

    const testValue = { score: 42, level: "expert" };
    await writeUserData(USER_ID, APP_ID, "game-state", testValue, pm);

    const result = await readUserData(USER_ID, APP_ID, "game-state", pm);

    expect(result).not.toBeNull();
    expect(result!.value).toEqual(testValue);
  });

  // Test 8: getUserHistory includes both read and write events
  it("getUserHistory() includes both read and write events in chronological order", async () => {
    const pm = new PodManager();
    await connectUser(USER_ID, APP_ID, pm);

    await writeUserData(USER_ID, APP_ID, "settings", { volume: 80 }, pm);
    await readUserData(USER_ID, APP_ID, "settings", pm);

    const history = await getUserHistory(USER_ID, APP_ID, pm);

    expect(history.length).toBeGreaterThanOrEqual(2);

    const actions = history.map((e) => e.action);
    expect(actions).toContain("write");
    expect(actions).toContain("read");

    // Chronological: first event timestamp <= last event timestamp
    const first = new Date(history[0].timestamp).getTime();
    const last = new Date(history[history.length - 1].timestamp).getTime();
    expect(last).toBeGreaterThanOrEqual(first);
  });

  // Test 9: getUserHistory shows correct appCanonicalId
  it("getUserHistory() shows correct appCanonicalId for each access", async () => {
    const pm = new PodManager();
    await connectUser(USER_ID, APP_ID, pm);

    await writeUserData(USER_ID, APP_ID, "data", { x: 1 }, pm);
    const history = await getUserHistory(USER_ID, APP_ID, pm);

    for (const event of history) {
      expect(event.appCanonicalId).toBe(APP_ID);
    }
  });

  // Test 10: exportUserData returns W3C Verifiable Credential
  it("exportUserData() returns object with W3C Verifiable Credential type", async () => {
    const pm = new PodManager();
    await connectUser(USER_ID, APP_ID, pm);
    await writeUserData(USER_ID, APP_ID, "profile", { name: "Alice" }, pm);

    const credential = await exportUserData(USER_ID, pm);

    const types = credential["@type"] as string[];
    expect(types).toContain("VerifiableCredential");
    expect(types).toContain("cert:PortabilityCredential");
    expect(credential["credentialSubject"]).toBeTruthy();
    expect(credential["proof"]).toBeTruthy();
    expect(credential["issuer"]).toBe("https://uor.foundation");
  });
});
