/**
 * Schema.org Functor — Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  SCHEMA_ORG_HIERARCHY,
  SCHEMA_ORG_TYPE_NAMES,
  SCHEMA_ORG_TYPE_COUNT,
  getAncestorChain,
  getChildren,
  getDepth,
} from "../vocabulary";
import { addressType, schemaToUor, clearCache } from "../functor";

describe("Schema.org Vocabulary", () => {
  it("has Thing as root with no parents", () => {
    expect(SCHEMA_ORG_HIERARCHY["Thing"]).toEqual([]);
  });

  it("has 400+ types", () => {
    expect(SCHEMA_ORG_TYPE_COUNT).toBeGreaterThan(400);
  });

  it("computes ancestor chain for BlogPosting", () => {
    const chain = getAncestorChain("BlogPosting");
    expect(chain[0]).toBe("BlogPosting");
    expect(chain).toContain("SocialMediaPosting");
    expect(chain).toContain("Article");
    expect(chain).toContain("CreativeWork");
    expect(chain).toContain("Thing");
    expect(chain[chain.length - 1]).toBe("Thing");
  });

  it("computes children of Thing", () => {
    const children = getChildren("Thing");
    expect(children).toContain("Person");
    expect(children).toContain("Organization");
    expect(children).toContain("CreativeWork");
    expect(children).toContain("Event");
  });

  it("Thing has depth 0", () => {
    expect(getDepth("Thing")).toBe(0);
  });

  it("Person has depth 1", () => {
    expect(getDepth("Person")).toBe(1);
  });

  it("BlogPosting has depth > 2", () => {
    expect(getDepth("BlogPosting")).toBeGreaterThan(2);
  });
});

describe("Schema.org → UOR Functor", () => {
  beforeEach(() => clearCache());

  it("content-addresses Thing type", async () => {
    const identity = await addressType("Thing");
    expect(identity.schemaType).toBe("Thing");
    expect(identity.derivationId).toMatch(/^urn:uor:derivation:sha256:[0-9a-f]{64}$/);
    expect(identity.cid).toBeTruthy();
    expect(identity.hashHex).toHaveLength(64);
  });

  it("content-addresses Person type", async () => {
    const identity = await addressType("Person");
    expect(identity.schemaType).toBe("Person");
    expect(identity.derivationId).toMatch(/^urn:uor:derivation:sha256:[0-9a-f]{64}$/);
  });

  it("produces different identities for different types", async () => {
    const thing = await addressType("Thing");
    const person = await addressType("Person");
    expect(thing.derivationId).not.toBe(person.derivationId);
    expect(thing.cid).not.toBe(person.cid);
  });

  it("is deterministic — same type always produces same identity", async () => {
    const a = await addressType("Event");
    clearCache();
    const b = await addressType("Event");
    expect(a.derivationId).toBe(b.derivationId);
    expect(a.cid).toBe(b.cid);
  });

  it("applies functor to a Schema.org Person instance", async () => {
    const result = await schemaToUor({
      "@type": "Person",
      "name": "Ada Lovelace",
      "birthDate": "1815-12-10",
    });
    expect(result.schemaType).toBe("Person");
    expect(result.derivationId).toMatch(/^urn:uor:derivation:sha256:[0-9a-f]{64}$/);
    expect(result.dualJsonLd["@context"]).toBeTruthy();
    expect(result.nquads).toBeTruthy();
  });

  it("same instance produces same identity (content-addressing)", async () => {
    const instance = {
      "@type": "Organization",
      "name": "UOR Foundation",
      "url": "https://uor.foundation",
    };
    const a = await schemaToUor(instance);
    const b = await schemaToUor(instance);
    expect(a.derivationId).toBe(b.derivationId);
  });

  it("different instances produce different identities", async () => {
    const a = await schemaToUor({
      "@type": "Person",
      "name": "Alice",
    });
    const b = await schemaToUor({
      "@type": "Person",
      "name": "Bob",
    });
    expect(a.derivationId).not.toBe(b.derivationId);
  });
});
