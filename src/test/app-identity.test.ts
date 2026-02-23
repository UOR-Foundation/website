/**
 * App Identity Layer (P2) — 10/10 Test Suite
 *
 * Validates manifest creation, determinism, versioning,
 * verification, and registry operations.
 */

import { describe, it, expect } from "vitest";
import {
  createManifest,
  updateManifest,
  verifyManifest,
  buildVersionChain,
  AppRegistry,
  type ManifestInput,
} from "@/modules/uor-sdk/app-identity";

// ── Test fixture ────────────────────────────────────────────────────────────

const BASE_INPUT: ManifestInput = {
  "@type": "app:Manifest",
  "app:name": "test-app",
  "app:version": "1.0.0",
  "app:sourceUrl": "https://github.com/test/app",
  "app:entrypoint": "/index.html",
  "app:tech": ["React", "Tailwind"],
  "app:deployedAt": "2025-01-01T00:00:00.000Z",
  "app:developerCanonicalId": "urn:uor:derivation:sha256:abcd1234",
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe("App Identity Layer (P2)", () => {
  // Test 1
  it("createManifest returns u:canonicalId matching derivation pattern", async () => {
    const m = await createManifest(BASE_INPUT);
    expect(m["u:canonicalId"]).toMatch(
      /^urn:uor:derivation:sha256:[0-9a-f]{64}$/
    );
  });

  // Test 2
  it("createManifest returns u:ipv6 starting with fd00:0075:6f72", async () => {
    const m = await createManifest(BASE_INPUT);
    expect(m["u:ipv6"]).toMatch(/^fd00:0075:6f72:/);
  });

  // Test 3
  it("createManifest returns u:cid (content identifier)", async () => {
    const m = await createManifest(BASE_INPUT);
    expect(m["u:cid"]).toBeTruthy();
    // CIDv1 base32 starts with 'b'
    expect(m["u:cid"]!.length).toBeGreaterThan(10);
  });

  // Test 4: deterministic — identical inputs produce same canonical ID
  it("identical inputs produce identical u:canonicalId", async () => {
    const m1 = await createManifest(BASE_INPUT);
    const m2 = await createManifest(BASE_INPUT);
    expect(m1["u:canonicalId"]).toBe(m2["u:canonicalId"]);
  });

  // Test 5: content sensitivity — one field change → different ID
  it("one field changed produces completely different u:canonicalId", async () => {
    const m1 = await createManifest(BASE_INPUT);
    const m2 = await createManifest({
      ...BASE_INPUT,
      "app:version": "1.0.1",
    });
    expect(m1["u:canonicalId"]).not.toBe(m2["u:canonicalId"]);
  });

  // Test 6
  it("updateManifest sets app:previousCanonicalId", async () => {
    const v1 = await createManifest(BASE_INPUT);
    const v2 = await updateManifest(v1, { "app:version": "2.0.0" });
    expect(v2["app:previousCanonicalId"]).toBe(v1["u:canonicalId"]);
  });

  // Test 7
  it("verifyManifest returns true for unmodified manifest", async () => {
    const m = await createManifest(BASE_INPUT);
    expect(await verifyManifest(m)).toBe(true);
  });

  // Test 8
  it("verifyManifest returns false if any field is tampered", async () => {
    const m = await createManifest(BASE_INPUT);
    const tampered = { ...m, "app:name": "hacked-app" };
    expect(await verifyManifest(tampered)).toBe(false);
  });

  // Test 9
  it("buildVersionChain orders oldest to newest", async () => {
    const v1 = await createManifest(BASE_INPUT);
    const v2 = await updateManifest(v1, { "app:version": "2.0.0" });
    const v3 = await updateManifest(v2, { "app:version": "3.0.0" });

    // Pass in shuffled order
    const chain = buildVersionChain([v3, v1, v2]);
    expect(chain).toHaveLength(3);
    expect(chain[0]["u:canonicalId"]).toBe(v1["u:canonicalId"]);
    expect(chain[1]["u:canonicalId"]).toBe(v2["u:canonicalId"]);
    expect(chain[2]["u:canonicalId"]).toBe(v3["u:canonicalId"]);
  });

  // Test 10
  it("AppRegistry.getHistory returns newest-first order", async () => {
    const registry = new AppRegistry();
    const v1 = await createManifest(BASE_INPUT);
    const v2 = await updateManifest(v1, { "app:version": "2.0.0" });

    await registry.register(v1);
    await registry.register(v2);

    const history = await registry.getHistory("test-app");
    expect(history).toHaveLength(2);
    expect(history[0]["u:canonicalId"]).toBe(v2["u:canonicalId"]);
    expect(history[1]["u:canonicalId"]).toBe(v1["u:canonicalId"]);
  });
});
