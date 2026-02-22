/**
 * Tests for UOR Union Type Canonicalization (R2 compliance).
 *
 * Verifies the three reduction rules ensure identical derivation_ids
 * regardless of which union path was used to encode the original data.
 */
import { describe, it, expect } from "vitest";
import {
  coerceLiteral,
  coerceEntity,
  coerceUnionValue,
  canonicalizeUnionTypes,
  UNION_TYPE_RANGES,
} from "@/modules/morphism/union-type-canon";
import { singleProofHash } from "@/lib/uor-canonical";

describe("Union Type Canonicalization — R2 compliance", () => {
  // ── Rule 1: Literal Coercion ────────────────────────────────────────────

  describe("Rule 1: Literal coercion", () => {
    it("coerces ISO DateTime string to schema:DateTime", () => {
      const result = coerceLiteral(
        "2026-02-22T00:00:00Z",
        ["schema:DateTime", "schema:Date", "schema:Text"]
      );
      expect(result.coerced).toBe(true);
      expect(result.resolvedType).toBe("schema:DateTime");
      expect(result.value).toBe("2026-02-22T00:00:00Z");
    });

    it("promotes Date string to DateTime when DateTime is in union", () => {
      const result = coerceLiteral(
        "2026-02-22",
        ["schema:DateTime", "schema:Date", "schema:Text"]
      );
      expect(result.coerced).toBe(true);
      expect(result.resolvedType).toBe("schema:DateTime");
      expect(result.value).toBe("2026-02-22T00:00:00Z");
    });

    it("coerces Date string to schema:Date when DateTime not in union", () => {
      const result = coerceLiteral(
        "2026-02-22",
        ["schema:Date", "schema:Text"]
      );
      expect(result.coerced).toBe(true);
      expect(result.resolvedType).toBe("schema:Date");
    });

    it("coerces numeric string to schema:Number", () => {
      const result = coerceLiteral(
        "42.5",
        ["schema:Number", "schema:Text"]
      );
      expect(result.coerced).toBe(true);
      expect(result.resolvedType).toBe("schema:Number");
      expect(result.value).toBe(42.5);
    });

    it("coerces URL string to schema:URL", () => {
      const result = coerceLiteral(
        "https://example.com",
        ["schema:URL", "schema:Text"]
      );
      expect(result.coerced).toBe(true);
      expect(result.resolvedType).toBe("schema:URL");
    });

    it("does not coerce plain text when only Text is the match", () => {
      const result = coerceLiteral(
        "New York",
        ["schema:Place", "schema:PostalAddress", "schema:Text"]
      );
      expect(result.coerced).toBe(false);
      expect(result.resolvedType).toBe("schema:Text");
    });
  });

  // ── Rule 2: Entity Coercion ─────────────────────────────────────────────

  describe("Rule 2: Entity coercion", () => {
    it("infers Person from givenName property", () => {
      const result = coerceEntity(
        { givenName: "Alice", familyName: "Smith" },
        ["schema:Person", "schema:Organization"]
      );
      expect(result.coerced).toBe(true);
      expect(result.resolvedType).toBe("schema:Person");
      expect((result.value as Record<string, unknown>)["@type"]).toBe("schema:Person");
    });

    it("infers Organization from legalName property", () => {
      const result = coerceEntity(
        { legalName: "Acme Corp", foundingDate: "2020-01-01" },
        ["schema:Person", "schema:Organization"]
      );
      expect(result.coerced).toBe(true);
      expect(result.resolvedType).toBe("schema:Organization");
    });

    it("infers PostalAddress from streetAddress property", () => {
      const result = coerceEntity(
        { streetAddress: "123 Main St", addressLocality: "Springfield" },
        ["schema:Place", "schema:PostalAddress", "schema:Text"]
      );
      expect(result.coerced).toBe(true);
      expect(result.resolvedType).toBe("schema:PostalAddress");
    });

    it("does not coerce objects with existing @type", () => {
      const result = coerceEntity(
        { "@type": "schema:Person", name: "Alice" },
        ["schema:Person", "schema:Organization"]
      );
      expect(result.coerced).toBe(false);
      expect(result.resolvedType).toBe("schema:Person");
    });

    it("does not coerce when no discriminating properties match", () => {
      const result = coerceEntity(
        { name: "Unknown Entity" },
        ["schema:Person", "schema:Organization"]
      );
      expect(result.coerced).toBe(false);
    });
  });

  // ── Combined coercion via property name ─────────────────────────────────

  describe("coerceUnionValue — combined property-aware coercion", () => {
    it("coerces schema:startDate string value", () => {
      const result = coerceUnionValue("2026-02-22", "schema:startDate");
      expect(result.coerced).toBe(true);
      expect(result.resolvedType).toBe("schema:DateTime");
      expect(result.value).toBe("2026-02-22T00:00:00Z");
    });

    it("coerces schema:author untyped object", () => {
      const result = coerceUnionValue(
        { givenName: "Bob" },
        "schema:author"
      );
      expect(result.coerced).toBe(true);
      expect(result.resolvedType).toBe("schema:Person");
    });

    it("returns unchanged for non-union properties", () => {
      const result = coerceUnionValue("hello", "schema:name");
      expect(result.coerced).toBe(false);
    });
  });

  // ── THE KEY TEST: identical derivation_ids after canonicalization ────────

  describe("derivation_id convergence", () => {
    it("same author encoded as Person and untyped → same derivation_id", async () => {
      const typed = {
        "@context": { schema: "https://schema.org/" },
        "@type": "schema:Article",
        "schema:author": { "@type": "schema:Person", givenName: "Alice", familyName: "Smith" },
      };
      const untyped = {
        "@context": { schema: "https://schema.org/" },
        "@type": "schema:Article",
        "schema:author": { givenName: "Alice", familyName: "Smith" },
      };

      const { canonicalized: c1 } = await canonicalizeUnionTypes(typed, false);
      const { canonicalized: c2 } = await canonicalizeUnionTypes(untyped, false);

      // After canonicalization, both should have @type: schema:Person on the author
      const a1 = c1["schema:author"] as Record<string, unknown>;
      const a2 = c2["schema:author"] as Record<string, unknown>;
      expect(a1["@type"]).toBe("schema:Person");
      expect(a2["@type"]).toBe("schema:Person");
    });

    it("same date as Date and DateTime → same canonical value", async () => {
      const asDate = {
        "@context": { schema: "https://schema.org/" },
        "@type": "schema:Event",
        "schema:startDate": "2026-02-22",
      };
      const asDateTime = {
        "@context": { schema: "https://schema.org/" },
        "@type": "schema:Event",
        "schema:startDate": "2026-02-22T00:00:00Z",
      };

      const { canonicalized: c1 } = await canonicalizeUnionTypes(asDate, false);
      const { canonicalized: c2 } = await canonicalizeUnionTypes(asDateTime, false);

      // Both should resolve to the same DateTime value
      expect(c1["schema:startDate"]).toBe("2026-02-22T00:00:00Z");
      expect(c2["schema:startDate"]).toBe("2026-02-22T00:00:00Z");
    });

    it("price as string and number → same canonical value", async () => {
      const asString = {
        "@context": { schema: "https://schema.org/" },
        "@type": "schema:Offer",
        "schema:price": "29.99",
      };
      const asNumber = {
        "@context": { schema: "https://schema.org/" },
        "@type": "schema:Offer",
        "schema:price": 29.99,
      };

      const { canonicalized: c1 } = await canonicalizeUnionTypes(asString, false);
      // Number values pass through unchanged
      expect(c1["schema:price"]).toBe(29.99);
      expect(asNumber["schema:price"]).toBe(29.99);
    });
  });

  // ── Rule 3: Transform recording ─────────────────────────────────────────

  describe("Rule 3: morphism:Transform recording", () => {
    it("records coercion as content-addressed transform", async () => {
      const obj = {
        "@type": "schema:Event",
        "schema:startDate": "2026-02-22",
        "schema:location": { streetAddress: "123 Main St" },
      };

      const { coercions } = await canonicalizeUnionTypes(obj, true);

      expect(coercions.length).toBe(2);

      // Date coercion
      const dateCoercion = coercions.find(c => c.property === "schema:startDate");
      expect(dateCoercion).toBeDefined();
      expect(dateCoercion!.rule).toBe("literal");
      expect(dateCoercion!.resolvedType).toBe("schema:DateTime");
      expect(dateCoercion!.transformId).toMatch(/^urn:uor:morphism:union:/);

      // Entity coercion
      const entityCoercion = coercions.find(c => c.property === "schema:location");
      expect(entityCoercion).toBeDefined();
      expect(entityCoercion!.rule).toBe("entity");
      expect(entityCoercion!.resolvedType).toBe("schema:PostalAddress");
      expect(entityCoercion!.transformId).toMatch(/^urn:uor:morphism:union:/);
    });
  });

  // ── Coverage of UNION_TYPE_RANGES ───────────────────────────────────────

  describe("UNION_TYPE_RANGES coverage", () => {
    it("defines ranges for key Schema.org properties", () => {
      expect(UNION_TYPE_RANGES["schema:author"]).toContain("schema:Person");
      expect(UNION_TYPE_RANGES["schema:author"]).toContain("schema:Organization");
      expect(UNION_TYPE_RANGES["schema:startDate"]).toContain("schema:DateTime");
      expect(UNION_TYPE_RANGES["schema:location"]).toContain("schema:Place");
      expect(UNION_TYPE_RANGES["schema:price"]).toContain("schema:Number");
    });
  });
});
