/**
 * P27 — Attribution Protocol — 12 verification tests.
 *
 * Tests cert:AttributionCertificate, GDPR Article 20 export,
 * EU Data Act compliance, and royalty reporting.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { UnsAttribution } from "@/modules/uns/trust/attribution";
import { generateKeypair } from "@/modules/uns/core/keypair";
import type { UnsKeypair } from "@/modules/uns/core/keypair";

describe("P27 — Attribution Protocol", () => {
  let keypair: UnsKeypair;
  let attribution: UnsAttribution;

  const VALID_DERIVATION_ID =
    "urn:uor:derivation:sha256:" + "a".repeat(64);
  const OBJECT_ID = "urn:uor:object:test-object-42";
  const CREATOR_ID = "urn:uor:creator:alice";

  beforeAll(async () => {
    keypair = await generateKeypair();
    attribution = new UnsAttribution(keypair);
  });

  // Test 1: register() returns correct @type
  it("1. register() returns cert:AttributionCertificate", async () => {
    const cert = await attribution.register(
      OBJECT_ID,
      CREATOR_ID,
      VALID_DERIVATION_ID
    );
    expect(cert["@type"]).toBe("cert:AttributionCertificate");
    expect(cert["@context"]).toBe(
      "https://uor.foundation/contexts/uns-v1.jsonld"
    );
  });

  // Test 2: derivation:derivationId matches Grade-A pattern
  it("2. cert derivation:derivationId matches Grade-A pattern", async () => {
    const cert = attribution.getCertificate(OBJECT_ID);
    expect(cert).not.toBeNull();
    expect(cert!["derivation:derivationId"]).toMatch(
      /^urn:uor:derivation:sha256:[0-9a-f]{64}$/
    );
  });

  // Test 3: eu_data_act_compliant === true
  it("3. cert.eu_data_act_compliant === true", () => {
    const cert = attribution.getCertificate(OBJECT_ID)!;
    expect(cert.eu_data_act_compliant).toBe(true);
  });

  // Test 4: gdpr_article_20 === true
  it("4. cert.gdpr_article_20 === true", () => {
    const cert = attribution.getCertificate(OBJECT_ID)!;
    expect(cert.gdpr_article_20).toBe(true);
  });

  // Test 5: epistemic_grade === 'A'
  it("5. cert.epistemic_grade === 'A'", () => {
    const cert = attribution.getCertificate(OBJECT_ID)!;
    expect(cert.epistemic_grade).toBe("A");
  });

  // Test 6: cert:signature is valid Dilithium-3 signature
  it("6. cert:signature is Dilithium-3", () => {
    const cert = attribution.getCertificate(OBJECT_ID)!;
    expect(cert["cert:signature"]).toBeDefined();
    expect(cert["cert:signature"]["@type"]).toBe("cert:Signature");
    expect(cert["cert:signature"]["cert:algorithm"]).toBe(
      "CRYSTALS-Dilithium-3"
    );
    expect(cert["cert:signature"]["cert:signatureBytes"]).toBeTruthy();
  });

  // Test 7: verify → verified: true for registered object
  it("7. verify(objectId) → verified: true", async () => {
    const result = await attribution.verify(OBJECT_ID);
    expect(result.verified).toBe(true);
    expect(result.creatorCanonicalId).toBe(CREATOR_ID);
    expect(result.derivationId).toBe(VALID_DERIVATION_ID);
    expect(result.signatureValid).toBe(true);
  });

  // Test 8: verify unknown → verified: false
  it("8. verify(unknownId) → verified: false", async () => {
    const result = await attribution.verify("urn:uor:object:nonexistent");
    expect(result.verified).toBe(false);
  });

  // Test 9: register without valid derivationId → throws
  it("9. register() without valid derivationId → throws", async () => {
    await expect(
      attribution.register(
        "urn:uor:object:bad",
        CREATOR_ID,
        "not-a-valid-derivation-id"
      )
    ).rejects.toThrow("Attribution requires Grade-A");
  });

  // Test 10: gdprExport returns valid JSON-LD with dc:rights
  it("10. gdprExport(creatorId) returns valid JSON-LD with dc:rights", async () => {
    const exportDoc = await attribution.gdprExport(CREATOR_ID);
    expect(exportDoc["@type"]).toBe("void:Dataset");
    expect(exportDoc["dc:rights"]).toBe(
      "GDPR Article 20 — Right to Data Portability"
    );
    expect(exportDoc["dc:subject"]).toBe(CREATOR_ID);
    expect(exportDoc.eu_data_act_compliant).toBe(true);
    expect(exportDoc.epistemic_grade).toBe("A");
  });

  // Test 11: gdprExport includes all registered objects
  it("11. gdprExport includes all registered objects for creator", async () => {
    // Register a second object for same creator
    const secondId = "urn:uor:object:test-object-99";
    await attribution.register(secondId, CREATOR_ID, VALID_DERIVATION_ID);

    const exportDoc = await attribution.gdprExport(CREATOR_ID);
    expect(exportDoc.totalObjects).toBe(2);
    expect(exportDoc.objects.length).toBe(2);
  });

  // Test 12: royaltyReport filters by date range
  it("12. royaltyReport returns certificates within date range only", async () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 86400000).toISOString(); // 1 day ago
    const futureDate = new Date(now.getTime() + 86400000).toISOString(); // 1 day ahead

    // Should include certs created just now
    const report = await attribution.royaltyReport({
      creatorCanonicalId: CREATOR_ID,
      from: pastDate,
      until: futureDate,
    });
    expect(report.totalObjects).toBe(2);
    expect(report.creator).toBe(CREATOR_ID);

    // Should exclude certs when range is in the past
    const oldReport = await attribution.royaltyReport({
      creatorCanonicalId: CREATOR_ID,
      from: "2020-01-01T00:00:00Z",
      until: "2020-12-31T23:59:59Z",
    });
    expect(oldReport.totalObjects).toBe(0);
  });
});
