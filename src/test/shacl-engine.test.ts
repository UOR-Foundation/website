/**
 * P25 — SHACL Validation Engine — 14 verification tests.
 *
 * Tests all 9 UOR SHACL shapes as runtime guards.
 */
import { describe, it, expect } from "vitest";
import {
  validateShaclShapes,
  validateShape,
  shaclGuard,
} from "@/modules/shacl/shacl-engine";

describe("P25 — SHACL Validation Engine", () => {
  // Test 1: Valid UnsNameRecord → conforms: true
  it("1. Valid UnsNameRecord → conforms: true, violations: []", () => {
    const record = {
      "@type": "uns:NameRecord",
      "uns:name": "test.uns",
      "uns:target": { "u:canonicalId": "urn:uor:test" },
    };
    const result = validateShaclShapes(record);
    expect(result.conforms).toBe(true);
    expect(result.violations).toEqual([]);
  });

  // Test 2: datum-term-disjoint violation
  it("2. Object with both schema:Datum AND schema:Term → violation 'datum-term-disjoint'", () => {
    const obj = { "@type": ["schema:Datum", "schema:Term"] };
    const vs = validateShape("datum-term-disjoint", obj);
    expect(vs.length).toBe(1);
    expect(vs[0].shape).toBe("datum-term-disjoint");
  });

  // Test 3: succ-composition violation
  it("3. CriticalIdentityProof with neg_bnot_x=44, succ_x=43 → violation", () => {
    const obj = {
      "@type": "proof:CriticalIdentityProof",
      "proof:neg_bnot_x": 44,
      "proof:succ_x": 43,
    };
    const vs = validateShape("succ-composition", obj);
    expect(vs.length).toBe(1);
    expect(vs[0].shape).toBe("succ-composition");
  });

  // Test 4: succ-composition passes
  it("4. CriticalIdentityProof with neg_bnot_x=43, succ_x=43 → no violation", () => {
    const obj = {
      "@type": "proof:CriticalIdentityProof",
      "proof:neg_bnot_x": 43,
      "proof:succ_x": 43,
      "proof:verified": true,
    };
    const vs = validateShape("succ-composition", obj);
    expect(vs).toEqual([]);
  });

  // Test 5: partition-cardinality violation
  it("5. Partition with sum=255 → violation 'partition-cardinality'", () => {
    const obj = {
      "@type": "partition:Partition",
      units: new Array(2),
      exterior: new Array(2),
      irreducible: new Array(125),
      reducible: new Array(126),
      bits: 8,
    };
    const vs = validateShape("partition-cardinality", obj);
    expect(vs.length).toBe(1);
    expect(vs[0].shape).toBe("partition-cardinality");
  });

  // Test 6: partition-cardinality passes
  it("6. Partition with sum=256 → no violation", () => {
    const obj = {
      "@type": "partition:Partition",
      units: new Array(2),
      exterior: new Array(2),
      irreducible: new Array(126),
      reducible: new Array(126),
      bits: 8,
    };
    const vs = validateShape("partition-cardinality", obj);
    expect(vs).toEqual([]);
  });

  // Test 7: cert-required-fields violation
  it("7. Certificate missing cert:algorithm → violation", () => {
    const obj = {
      "@type": "cert:Certificate",
      "cert:keyBytes": "abc",
      "cert:certifiedBy": "urn:uor:signer",
    };
    const vs = validateShape("cert-required-fields", obj);
    expect(vs.length).toBe(1);
    expect(vs[0].shape).toBe("cert-required-fields");
    expect(vs[0].path).toBe("cert:algorithm");
  });

  // Test 8: trace-certifiedby violation
  it("8. Trace missing cert:certifiedBy → violation", () => {
    const obj = { "@type": "trace:ExecutionTrace" };
    const vs = validateShape("trace-certifiedby", obj);
    expect(vs.length).toBe(1);
    expect(vs[0].shape).toBe("trace-certifiedby");
  });

  // Test 9: transition-frames missing nextCanonicalId
  it("9. StateTransition missing state:nextCanonicalId → violation", () => {
    const obj = {
      "@type": "state:StateTransition",
      "state:previousCanonicalId":
        "urn:uor:derivation:sha256:" + "a".repeat(64),
    };
    const vs = validateShape("transition-frames", obj);
    expect(vs.length).toBe(1);
    expect(vs[0].shape).toBe("transition-frames");
    expect(vs[0].path).toBe("state:nextCanonicalId");
  });

  // Test 10: transition-frames invalid format
  it("10. StateTransition with invalid canonicalId format → violation", () => {
    const obj = {
      "@type": "state:StateTransition",
      "state:previousCanonicalId": "not-a-valid-id",
      "state:nextCanonicalId": "also-invalid",
    };
    const vs = validateShape("transition-frames", obj);
    expect(vs.length).toBe(2);
    expect(vs[0].shape).toBe("transition-frames");
  });

  // Test 11: critical-identity-proof verified=false
  it("11. Proof with proof:verified=false → violation", () => {
    const obj = {
      "@type": "proof:CriticalIdentityProof",
      "proof:verified": false,
      "proof:neg_bnot_x": 43,
      "proof:succ_x": 43,
    };
    const vs = validateShape("critical-identity-proof", obj);
    expect(vs.length).toBe(1);
    expect(vs[0].shape).toBe("critical-identity-proof");
  });

  // Test 12: derivation-id-format violation
  it("12. derivation:derivationId not matching pattern → violation", () => {
    const obj = { "derivation:derivationId": "bad-id" };
    const vs = validateShape("derivation-id-format", obj);
    expect(vs.length).toBe(1);
    expect(vs[0].shape).toBe("derivation-id-format");
  });

  // Test 13: partition-density-range violation
  it("13. partition:density = 1.5 → violation", () => {
    const obj = { "partition:density": 1.5 };
    const vs = validateShape("partition-density-range", obj);
    expect(vs.length).toBe(1);
    expect(vs[0].shape).toBe("partition-density-range");
  });

  // Test 14: shaclGuard returns 422 for invalid object
  it("14. shaclGuard with invalid cert → status 422 with ShaclResult body", () => {
    const body = {
      "@type": "cert:Certificate",
      // Missing all required fields
    };
    const guard = shaclGuard(body);
    expect(guard.ok).toBe(false);
    expect(guard.status).toBe(422);
    expect(guard.result.conforms).toBe(false);
    expect(guard.result.violations.length).toBeGreaterThan(0);
    expect(guard.result.shapesRun.length).toBe(9);
  });

  // Bonus: valid derivation ID passes
  it("bonus: valid derivation:derivationId passes", () => {
    const obj = {
      "derivation:derivationId":
        "urn:uor:derivation:sha256:" + "a".repeat(64),
    };
    const vs = validateShape("derivation-id-format", obj);
    expect(vs).toEqual([]);
  });

  // Bonus: valid density passes
  it("bonus: partition:density = 0.5 passes", () => {
    const obj = { "partition:density": 0.5 };
    const vs = validateShape("partition-density-range", obj);
    expect(vs).toEqual([]);
  });

  // Bonus: full validateShaclShapes runs all 9 shapes
  it("bonus: validateShaclShapes runs all 9 shapes", () => {
    const result = validateShaclShapes({ "@type": "uns:Record" });
    expect(result.shapesRun.length).toBe(9);
  });
});
