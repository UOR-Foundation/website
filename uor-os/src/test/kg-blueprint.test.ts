/**
 * Knowledge Graph — Object Blueprint Tests.
 *
 * Verifies the edge-defined node system:
 *   - Decompose → serialize → deserialize → materialize round-trips
 *   - Blueprint verification (tamper detection)
 *   - Type validation via blueprint registry
 */
import { describe, it, expect } from "vitest";
import {
  type ObjectBlueprint,
  type GroundObjectBlueprint,
  materializeFromBlueprint,
  serializeBlueprint,
  deserializeBlueprint,
  verifyBlueprint,
} from "@/modules/data/knowledge-graph/blueprint";
import {
  validateBlueprint,
  registerNodeType,
} from "@/modules/data/knowledge-graph/blueprint-registry";

const CONTEXT = "https://uor.foundation/contexts/uor-v1.jsonld";

function makeBlueprint(overrides?: Partial<ObjectBlueprint>): ObjectBlueprint {
  return {
    "@context": CONTEXT,
    "@type": "uor:ObjectBlueprint",
    createdAt: "2026-04-09T00:00:00.000Z",
    spaceDefinition: {
      kind: "file",
      localDomain: "DataSpace",
      rdfType: "schema:Dataset",
    },
    attributes: [
      { predicate: "schema:filename", valueType: "literal", value: "data.csv" },
      { predicate: "schema:size", valueType: "literal", value: 1024 },
      { predicate: "schema:hasColumn", valueType: "reference", targetAddress: "urn:uor:column:abc123" },
    ],
    compositionRules: [
      { parentPredicate: "schema:hasColumn", decomposition: "reference" },
    ],
    derivationRules: [
      { operation: "sha256", inputs: ["canonical-blueprint-bytes"], plan: "UOR-blueprint-v1" },
    ],
    ...overrides,
  };
}

describe("KG Object Blueprint System", () => {

  it("1. materializeFromBlueprint produces node + edges from blueprint", async () => {
    const bp = makeBlueprint();
    const { node, edges } = await materializeFromBlueprint(bp);

    expect(node.uorAddress).toBeTruthy();
    expect(node.nodeType).toBe("file");
    expect(node.rdfType).toBe("schema:Dataset");
    expect(node.properties.filename).toBe("data.csv");
    expect(node.properties.size).toBe(1024);

    expect(edges.length).toBe(1);
    expect(edges[0].predicate).toBe("schema:hasColumn");
    expect(edges[0].object).toBe("urn:uor:column:abc123");
  });

  it("2. serialize → deserialize round-trip preserves blueprint", async () => {
    const bp = makeBlueprint();
    const { node } = await materializeFromBlueprint(bp);

    // Ground the blueprint manually
    const ground: GroundObjectBlueprint = {
      blueprint: bp,
      uorCanonicalId: node.uorAddress,
      uorCid: node.uorCid || "",
      uorGlyph: "",
      uorIpv6: "",
    };

    const serialized = serializeBlueprint(ground);
    expect(typeof serialized).toBe("string");

    const deserialized = deserializeBlueprint(serialized);
    expect(deserialized.blueprint["@type"]).toBe("uor:ObjectBlueprint");
    expect(deserialized.blueprint.attributes.length).toBe(bp.attributes.length);
  });

  it("3. deserializeBlueprint rejects invalid JSON", () => {
    expect(() => deserializeBlueprint('{"blueprint":null}')).toThrow();
    expect(() => deserializeBlueprint('{"blueprint":{"@type":"wrong"},"uorCanonicalId":"x"}')).toThrow();
  });

  it("4. verifyBlueprint returns true for untampered blueprint", async () => {
    const bp = makeBlueprint();
    // Use materializeFromBlueprint which internally grounds the blueprint
    // Then reconstruct a GroundObjectBlueprint from the result
    const { node } = await materializeFromBlueprint(bp);

    // Re-ground using the same path verifyBlueprint uses internally
    const { sha256, buildIdentity } = await import("@/modules/identity/uns/core/address");
    const { canonicalJsonLd } = await import("@/lib/uor-address");
    const forHashing = JSON.parse(JSON.stringify({ ...bp, createdAt: undefined }));
    const canonical = canonicalJsonLd(forHashing);
    const canonicalBytes = new TextEncoder().encode(canonical);
    const hashBytes = await sha256(canonicalBytes);
    const identity = await buildIdentity(hashBytes, canonicalBytes);

    const ground: GroundObjectBlueprint = {
      blueprint: bp,
      uorCanonicalId: identity["u:canonicalId"],
      uorCid: identity["u:cid"],
      uorGlyph: identity["u:glyph"],
      uorIpv6: identity["u:ipv6"],
    };

    // Verify the node address matches
    expect(node.uorAddress).toBe(ground.uorCanonicalId);

    const result = await verifyBlueprint(ground);
    expect(result).toBe(true);
  });

  it("5. verifyBlueprint returns false when attribute is tampered", async () => {
    const bp = makeBlueprint();
    const { sha256, buildIdentity } = await import("@/modules/identity/uns/core/address");
    const { canonicalJsonLd } = await import("@/lib/uor-address");
    const forHashing = { ...bp, createdAt: undefined };
    const canonical = canonicalJsonLd(forHashing);
    const canonicalBytes = new TextEncoder().encode(canonical);
    const hashBytes = await sha256(canonicalBytes);
    const identity = buildIdentity(hashBytes, canonicalBytes);

    const ground: GroundObjectBlueprint = {
      blueprint: { ...bp },
      uorCanonicalId: identity["u:canonicalId"],
      uorCid: identity["u:cid"],
      uorGlyph: identity["u:glyph"],
      uorIpv6: identity["u:ipv6"],
    };

    // Tamper with a deep copy of attributes
    ground.blueprint = {
      ...ground.blueprint,
      attributes: ground.blueprint.attributes.map((a, i) =>
        i === 0 ? { ...a, value: "tampered.csv" } : a
      ),
    };

    const result = await verifyBlueprint(ground);
    expect(result).toBe(false);
  });

  it("6. validateBlueprint passes for conformant Dataset blueprint", () => {
    const bp = makeBlueprint();
    const result = validateBlueprint(bp);
    expect(result.valid).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  it("7. validateBlueprint fails for Dataset missing required filename", () => {
    const bp = makeBlueprint({
      attributes: [
        { predicate: "schema:size", valueType: "literal", value: 1024 },
      ],
    });
    const result = validateBlueprint(bp);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.predicate === "schema:filename")).toBe(true);
  });

  it("8. validateBlueprint warns on wrong valueType", () => {
    const bp = makeBlueprint({
      attributes: [
        { predicate: "schema:filename", valueType: "reference", targetAddress: "urn:wrong" },
      ],
    });
    const result = validateBlueprint(bp);
    expect(result.issues.some((i) => i.severity === "warning")).toBe(true);
  });

  it("9. validateBlueprint passes for unknown rdfType (open world)", () => {
    const bp = makeBlueprint({
      spaceDefinition: { kind: "custom", localDomain: "CustomSpace", rdfType: "schema:UnknownThing" },
    });
    const result = validateBlueprint(bp);
    expect(result.valid).toBe(true);
  });

  it("10. same blueprint content produces same UOR identity", async () => {
    const bp1 = makeBlueprint();
    const bp2 = makeBlueprint();
    const { node: n1 } = await materializeFromBlueprint(bp1);
    const { node: n2 } = await materializeFromBlueprint(bp2);
    expect(n1.uorAddress).toBe(n2.uorAddress);
  });

  it("11. different blueprint content produces different UOR identity", async () => {
    const bp1 = makeBlueprint();
    const bp2 = makeBlueprint({
      attributes: [
        { predicate: "schema:filename", valueType: "literal", value: "other.csv" },
      ],
    });
    const { node: n1 } = await materializeFromBlueprint(bp1);
    const { node: n2 } = await materializeFromBlueprint(bp2);
    expect(n1.uorAddress).not.toBe(n2.uorAddress);
  });

  it("12. custom type registration + validation works", () => {
    registerNodeType("schema:CustomWidget", {
      rdfType: "schema:CustomWidget",
      label: "Custom Widget",
      attributes: [
        { predicate: "schema:widgetId", valueType: "literal", required: true },
        { predicate: "schema:parentRef", valueType: "reference", required: true },
      ],
    });

    const bp = makeBlueprint({
      spaceDefinition: { kind: "widget", localDomain: "WidgetSpace", rdfType: "schema:CustomWidget" },
      attributes: [
        { predicate: "schema:widgetId", valueType: "literal", value: "w-42" },
      ],
    });

    const result = validateBlueprint(bp);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.predicate === "schema:parentRef")).toBe(true);
  });
});
