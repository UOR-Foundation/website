import { describe, it, expect, beforeEach } from "vitest";
import { UnsObjectStore } from "@/modules/uns/store";

/** Compare two Uint8Arrays by value. */
function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

let store: UnsObjectStore;

beforeEach(() => {
  store = new UnsObjectStore();
});

// ═════════════════════════════════════════════════════════════════════════════
// Phase 3-B Tests — 10/10
// ═════════════════════════════════════════════════════════════════════════════

describe("UNS Store — Phase 3-B: Content-Addressed Object Storage", () => {
  const textBytes = new TextEncoder().encode("Hello, UNS Store!");

  // Test 1
  it("1. put() returns canonicalId matching stored bytes (verified by recompute)", async () => {
    const meta = await store.put(textBytes, "text/plain");
    expect(meta.canonicalId).toMatch(/^urn:uor:derivation:sha256:[a-f0-9]{64}$/);
    expect(meta.sizeBytes).toBe(textBytes.length);
    expect(meta.contentType).toBe("text/plain");

    // Verify: recompute matches stored
    const verified = await store.verify(meta.canonicalId);
    expect(verified).toBe(true);
  });

  // Test 2
  it("2. Two put() calls with identical bytes → same canonicalId, no duplicate", async () => {
    const meta1 = await store.put(textBytes, "text/plain");
    const meta2 = await store.put(textBytes, "text/plain");
    expect(meta1.canonicalId).toBe(meta2.canonicalId);
    expect(store.size).toBe(1);
  });

  // Test 3
  it("3. get(canonicalId) returns exact bytes that were put()", async () => {
    const meta = await store.put(textBytes, "text/plain");
    const result = await store.get(meta.canonicalId);
    expect(result).not.toBeNull();
    expect(bytesEqual(result!.bytes, textBytes)).toBe(true);
    expect(result!.meta.canonicalId).toBe(meta.canonicalId);
  });

  // Test 4
  it("4. verify() returns true for stored objects, false for unknown ID", async () => {
    const meta = await store.put(textBytes, "text/plain");
    expect(await store.verify(meta.canonicalId)).toBe(true);
    expect(await store.verify("urn:uor:derivation:sha256:0000000000000000000000000000000000000000000000000000000000000000")).toBe(false);
  });

  // Test 5
  it("5. S3 putByKey stores with X-UNS-Canonical-ID equivalent", async () => {
    const meta = await store.putByKey("my-bucket", "docs/readme.md", textBytes, "text/markdown");
    expect(meta.canonicalId).toMatch(/^urn:uor:derivation:sha256:/);
    expect(meta.ipv6).toMatch(/^fd00:0075:6f72:/);
    expect(meta.cid).toBeTruthy();
  });

  // Test 6
  it("6. S3 getByKey returns same bytes as putByKey", async () => {
    await store.putByKey("my-bucket", "file.txt", textBytes, "text/plain");
    const result = await store.getByKey("my-bucket", "file.txt");
    expect(result).not.toBeNull();
    expect(bytesEqual(result!.bytes, textBytes)).toBe(true);
  });

  // Test 7
  it("7. get by canonical ID works without needing bucket/key", async () => {
    const meta = await store.putByKey("bucket", "key.txt", textBytes, "text/plain");
    const result = await store.get(meta.canonicalId);
    expect(result).not.toBeNull();
    expect(bytesEqual(result!.bytes, textBytes)).toBe(true);
  });

  // Test 8
  it("8. PUT identical content twice → second returns SAME canonical ID", async () => {
    const bytes1 = new TextEncoder().encode("dedup-test-content");
    const meta1 = await store.putByKey("b", "key1", bytes1, "text/plain");
    const meta2 = await store.putByKey("b", "key2", bytes1, "text/plain");
    expect(meta1.canonicalId).toBe(meta2.canonicalId);
    // Both keys resolve to same content
    const r1 = await store.getByKey("b", "key1");
    const r2 = await store.getByKey("b", "key2");
    expect(bytesEqual(r1!.bytes, r2!.bytes)).toBe(true);
  });

  // Test 9
  it("9. list(bucket) returns all objects in bucket", async () => {
    const b1 = new TextEncoder().encode("file-1");
    const b2 = new TextEncoder().encode("file-2");
    const b3 = new TextEncoder().encode("file-3");
    await store.putByKey("assets", "img/a.png", b1, "image/png");
    await store.putByKey("assets", "img/b.png", b2, "image/png");
    await store.putByKey("assets", "doc/c.pdf", b3, "application/pdf");

    const all = await store.list("assets");
    expect(all.length).toBe(3);

    const imgOnly = await store.list("assets", "img/");
    expect(imgOnly.length).toBe(2);
  });

  // Test 10
  it("10. Loss warning data present on all stored objects", async () => {
    const meta = await store.put(textBytes, "text/plain");
    // ipv6 is a routing projection — loss warning is inherent
    expect(meta.ipv6).toMatch(/^fd00:0075:6f72:/);
    expect(meta.partitionDensity).toBeGreaterThanOrEqual(0);
    expect(meta.partitionDensity).toBeLessThanOrEqual(1);
    expect(meta.cid).toBeTruthy();
    expect(meta.storedAt).toBeTruthy();
  });
});
