/**
 * Certified Developer-User Relationship (P6) — 10/10 Test Suite
 */

import { describe, it, expect } from "vitest";
import {
  issueCertificate,
  verifyCertificate,
  revokeCertificate,
  getCertificate,
  exportCertificateChain,
} from "@/modules/uor-sdk/relationship";

const APP_ID =
  "urn:uor:derivation:sha256:app6000000000000000000000000000000000000000000000000000000000000";
const USER_POD = "https://pod.uor.app/user6abcdef01234/";
const USER_HASH = "user6abcdef01234";

describe("Certified Developer-User Relationship (P6)", () => {
  // Test 1
  it("issueCertificate returns cert:TransformCertificate", async () => {
    const cert = await issueCertificate(APP_ID, USER_POD);
    expect(cert["@type"]).toBe("cert:TransformCertificate");
    expect(cert["cert:certifies"]).toBe(APP_ID);
    expect(cert["cert:subject"]).toBe(USER_POD);
  });

  // Test 2
  it("certificate u:canonicalId matches derivation pattern", async () => {
    const cert = await issueCertificate(APP_ID, USER_POD);
    expect(cert["u:canonicalId"]).toMatch(
      /^urn:uor:derivation:sha256:[0-9a-f]{64}$/,
    );
  });

  // Test 3
  it("verifyCertificate returns valid: true for fresh certificate", async () => {
    const cert = await issueCertificate(APP_ID, USER_POD);
    const result = await verifyCertificate(cert);
    expect(result.valid).toBe(true);
  });

  // Test 4
  it("verifyCertificate returns valid: false for expired certificate", async () => {
    const cert = await issueCertificate(APP_ID, USER_POD);
    // Force expiry into the past
    const expired = { ...cert, "cert:expiresAt": "2020-01-01T00:00:00.000Z" };
    const result = await verifyCertificate(expired);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("expired");
  });

  // Test 5
  it("revokeCertificate sets cert:revoked and cert:revokedAt", async () => {
    const cert = await issueCertificate(APP_ID, USER_POD);
    const revoked = await revokeCertificate(cert);
    expect(revoked["cert:revoked"]).toBe(true);
    expect(revoked["cert:revokedAt"]).toBeTruthy();
  });

  // Test 6
  it("verifyCertificate returns valid: false for revoked certificate", async () => {
    const cert = await issueCertificate(APP_ID, USER_POD);
    const revoked = await revokeCertificate(cert);
    const result = await verifyCertificate(revoked);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("revoked");
  });

  // Test 7
  it("getCertificate retrieves same certificate by app+user", async () => {
    const cert = await issueCertificate(APP_ID, USER_POD);
    const retrieved = await getCertificate(APP_ID, USER_HASH);
    expect(retrieved).not.toBeNull();
    expect(retrieved!["u:canonicalId"]).toBe(cert["u:canonicalId"]);
  });

  // Test 8
  it("exportCertificateChain excludes revoked certificates", async () => {
    // Issue two certs for different apps
    const app2 =
      "urn:uor:derivation:sha256:app6200000000000000000000000000000000000000000000000000000000000";
    const podUrl = "https://pod.uor.app/exporttest8abc/";
    const cert1 = await issueCertificate(APP_ID, podUrl);
    await issueCertificate(app2, podUrl);

    // Revoke first
    await revokeCertificate(cert1);

    const chain = await exportCertificateChain(podUrl);
    // Only the non-revoked cert should remain
    expect(chain.length).toBe(1);
    expect(chain[0]["cert:certifies"]).toBe(app2);
  });

  // Test 9
  it("certificate stored in pod is retrievable by userPodUrl path", async () => {
    const podUrl = "https://pod.uor.app/podpath9test/";
    const cert = await issueCertificate(APP_ID, podUrl);
    const chain = await exportCertificateChain(podUrl);
    expect(chain.length).toBeGreaterThanOrEqual(1);
    const found = chain.find((c) => c["u:canonicalId"] === cert["u:canonicalId"]);
    expect(found).toBeTruthy();
  });

  // Test 10
  it("two issueCertificate calls for same app+user produce same u:canonicalId", async () => {
    const podUrl = "https://pod.uor.app/determin10abc/";
    const cert1 = await issueCertificate(APP_ID, podUrl, ["read", "write"]);
    const cert2 = await issueCertificate(APP_ID, podUrl, ["read", "write"]);
    // Same content → same canonical ID (deterministic)
    expect(cert1["u:canonicalId"]).toBe(cert2["u:canonicalId"]);
  });
});
