/**
 * P29 — Schema.org Extension + Semantic Web Surface — 12 verification tests.
 */
import { describe, it, expect } from "vitest";
import {
  recordToSchemaOrg,
  functionToSchemaOrg,
  objectToSchemaOrg,
  nodeToSchemaOrg,
  negotiateFormat,
  serializeSchemaOrg,
  generateSitemap,
  generateRobotsTxt,
} from "@/modules/kg-store/schema-org";
import { validateShaclShapes } from "@/modules/shacl/shacl-engine";

const VALID_CID = "urn:uor:derivation:sha256:" + "ab".repeat(32);

describe("P29 — Schema.org Extension", () => {
  // Test 1: dual context
  it("1. recordToSchemaOrg() includes both schema.org and UOR contexts", () => {
    const out = recordToSchemaOrg({
      "uns:name": "example.uns",
      "uns:canonicalId": VALID_CID,
      "u:ipv6": "fd00:0075:6f72:abcd::",
    }) as any;
    expect(out["@context"]).toContain("https://schema.org");
    expect(out["@context"]).toContain(
      "https://uor.foundation/contexts/uns-v1.jsonld"
    );
  });

  // Test 2: schema:identifier includes derivation:derivationId
  it("2. schema:identifier includes derivation:derivationId", () => {
    const out = recordToSchemaOrg({
      "uns:canonicalId": VALID_CID,
      "derivation:derivationId": VALID_CID,
    }) as any;
    const ident = out["schema:identifier"][0];
    expect(ident["schema:propertyID"]).toBe("derivation:derivationId");
  });

  // Test 3: identifier value matches canonical pattern
  it("3. identifier value matches canonicalId pattern", () => {
    const out = recordToSchemaOrg({
      "uns:canonicalId": VALID_CID,
      "derivation:derivationId": VALID_CID,
    }) as any;
    expect(out["schema:identifier"][0]["schema:value"]).toMatch(
      /^urn:uor:derivation:sha256:[0-9a-f]{64}$/
    );
  });

  // Test 4: output passes SHACL (no violations for schema.org output)
  it("4. recordToSchemaOrg() output passes SHACL with conforms:true", () => {
    const out = recordToSchemaOrg({ "uns:canonicalId": VALID_CID });
    const result = validateShaclShapes(out);
    expect(result.conforms).toBe(true);
  });

  // Test 5: functionToSchemaOrg @type
  it("5. functionToSchemaOrg() @type includes schema:SoftwareApplication", () => {
    const out = functionToSchemaOrg({
      canonicalId: VALID_CID,
      name: "hash-fn",
    }) as any;
    expect(out["@type"]).toBe("schema:SoftwareApplication");
  });

  // Test 6: objectToSchemaOrg for JSON → Dataset
  it("6. objectToSchemaOrg() for JSON → schema:Dataset", () => {
    const out = objectToSchemaOrg(
      { canonicalId: VALID_CID, byteLength: 512 },
      "application/json"
    ) as any;
    expect(out["@type"]).toBe("schema:Dataset");
  });

  // Test 7: negotiateFormat JSON-LD
  it("7. Accept:application/ld+json → json-ld format", () => {
    expect(negotiateFormat("application/ld+json")).toBe("json-ld");
  });

  // Test 8: negotiateFormat Turtle
  it("8. Accept:text/turtle → turtle format", () => {
    expect(negotiateFormat("text/turtle")).toBe("turtle");
  });

  // Test 9: Turtle output is parseable (contains valid triples)
  it("9. Turtle output contains valid triple syntax", () => {
    const obj = recordToSchemaOrg({
      "uns:name": "test.uns",
      "uns:canonicalId": VALID_CID,
    }) as Record<string, unknown>;
    const { body, contentType } = serializeSchemaOrg(obj, "turtle");
    expect(contentType).toBe("text/turtle");
    // Valid Turtle: should contain angle-bracket URIs and end with period
    expect(body).toContain("<");
    expect(body).toContain("> .");
    // Should contain the name
    expect(body).toContain("test.uns");
  });

  // Test 10: sitemap returns valid XML with <loc>
  it("10. generateSitemap() returns XML with <loc> elements", () => {
    const xml = generateSitemap([
      { canonicalId: VALID_CID, ipv6: "fd00:0075:6f72:abcd::" },
    ]);
    expect(xml).toContain("<?xml");
    expect(xml).toContain("<loc>");
    expect(xml).toContain("</loc>");
  });

  // Test 11: sitemap has changefreq=never
  it("11. Content-addressed URLs have changefreq=never", () => {
    const xml = generateSitemap([{ canonicalId: VALID_CID }]);
    expect(xml).toContain("<changefreq>never</changefreq>");
  });

  // Test 12: robots.txt has Sitemap directive
  it("12. generateRobotsTxt() includes Sitemap: directive", () => {
    const txt = generateRobotsTxt("https://uor.foundation");
    expect(txt).toContain("Sitemap:");
    expect(txt).toContain("/uns/graph/sitemap.xml");
    expect(txt).toContain("Allow: /uns/schema-org/");
  });
});
