import { describe, it, expect, beforeEach } from "vitest";
import { UnsKv, UnsCache, UnsObjectStore } from "@/modules/uns/store";

// ── Helpers ─────────────────────────────────────────────────────────────────

const enc = (s: string) => new TextEncoder().encode(s);

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// ═════════════════════════════════════════════════════════════════════════════
// Phase 3-C Tests — 12/12
// ═════════════════════════════════════════════════════════════════════════════

describe("UNS KV — Phase 3-C", () => {
  let kv: UnsKv;

  beforeEach(() => {
    kv = new UnsKv();
  });

  // Test 1
  it("1. put() returns canonical ID of value bytes", async () => {
    const { canonicalId } = await kv.put("greeting", enc("hello"));
    expect(canonicalId).toMatch(/^urn:uor:derivation:sha256:[a-f0-9]{64}$/);
  });

  // Test 2
  it("2. get() returns exact bytes from put()", async () => {
    const bytes = enc("UNS KV value");
    await kv.put("mykey", bytes);
    const result = await kv.get("mykey");
    expect(result).not.toBeNull();
    expect(bytesEqual(result!.value, bytes)).toBe(true);
  });

  // Test 3
  it("3. putIfMatch succeeds when expectedCanonicalId matches", async () => {
    const { canonicalId } = await kv.put("config", enc("v1"));
    const result = await kv.putIfMatch("config", enc("v2"), canonicalId);
    expect(result.ok).toBe(true);
    expect(result.canonicalId).toMatch(/^urn:uor:derivation:sha256:/);
  });

  // Test 4
  it("4. putIfMatch fails when expectedCanonicalId does not match", async () => {
    await kv.put("config", enc("v1"));
    const result = await kv.putIfMatch("config", enc("v2"), "urn:uor:derivation:sha256:wrong");
    expect(result.ok).toBe(false);
    expect(result.canonicalId).toBeUndefined();
  });

  // Test 5
  it("5. delete() removes key; get() returns null", async () => {
    await kv.put("temp", enc("data"));
    await kv.delete("temp");
    const result = await kv.get("temp");
    expect(result).toBeNull();
  });

  // Test 6
  it("6. list() returns keys matching prefix", async () => {
    await kv.put("user:1", enc("alice"));
    await kv.put("user:2", enc("bob"));
    await kv.put("config:theme", enc("dark"));

    const users = await kv.list("user:");
    expect(users.length).toBe(2);
    expect(users.every((e) => e.key.startsWith("user:"))).toBe(true);

    const all = await kv.list();
    expect(all.length).toBe(3);
  });
});

describe("UNS Cache — Phase 3-C", () => {
  let store: UnsObjectStore;
  let cache: UnsCache;

  beforeEach(() => {
    store = new UnsObjectStore();
    cache = new UnsCache(1024); // 1 KB cache
  });

  // Test 7
  it("7. First get() → miss, bytes fetched from origin", async () => {
    const meta = await store.put(enc("origin-data"), "text/plain");
    const result = await cache.get(meta.canonicalId, store);
    expect(result).not.toBeNull();
    expect(result!.hit).toBe(false);
    expect(bytesEqual(result!.bytes, enc("origin-data"))).toBe(true);
  });

  // Test 8
  it("8. Second get() same canonical ID → hit, no origin call", async () => {
    const meta = await store.put(enc("cached-data"), "text/plain");

    // First: miss
    await cache.get(meta.canonicalId, store);
    // Second: hit
    const result = await cache.get(meta.canonicalId, store);
    expect(result).not.toBeNull();
    expect(result!.hit).toBe(true);
  });

  // Test 9
  it("9. Cache HIT bytes are identical to original bytes", async () => {
    const original = enc("integrity-check-payload");
    const meta = await store.put(original, "text/plain");

    await cache.get(meta.canonicalId, store); // miss → populate
    const result = await cache.get(meta.canonicalId, store); // hit
    expect(bytesEqual(result!.bytes, original)).toBe(true);
  });

  // Test 10
  it("10. stats().hits and stats().misses correctly increment", async () => {
    const meta = await store.put(enc("stats-test"), "text/plain");

    await cache.get(meta.canonicalId, store); // miss
    await cache.get(meta.canonicalId, store); // hit
    await cache.get(meta.canonicalId, store); // hit

    const s = cache.stats();
    expect(s.misses).toBe(1);
    expect(s.hits).toBe(2);
  });

  // Test 11
  it("11. LRU eviction: adding more bytes than maxBytes evicts oldest", async () => {
    // Cache is 1024 bytes. Store 3 × 400-byte entries → third evicts first.
    const a = new Uint8Array(400).fill(0x41);
    const b = new Uint8Array(400).fill(0x42);
    const c = new Uint8Array(400).fill(0x43);

    const metaA = await store.put(a, "application/octet-stream");
    const metaB = await store.put(b, "application/octet-stream");
    const metaC = await store.put(c, "application/octet-stream");

    await cache.get(metaA.canonicalId, store); // miss → cache A
    await cache.get(metaB.canonicalId, store); // miss → cache B
    await cache.get(metaC.canonicalId, store); // miss → evicts A, caches C

    // A should be evicted → next get is a miss
    const resultA = await cache.get(metaA.canonicalId, store);
    expect(resultA!.hit).toBe(false);

    // C should still be cached
    const resultC = await cache.get(metaC.canonicalId, store);
    expect(resultC!.hit).toBe(true);
  });

  // Test 12
  it("12. warm() pre-populates cache; subsequent get() is a HIT", async () => {
    const meta = await store.put(enc("pre-warmed"), "text/plain");

    await cache.warm(meta.canonicalId, store);

    const result = await cache.get(meta.canonicalId, store);
    expect(result).not.toBeNull();
    expect(result!.hit).toBe(true);
    expect(cache.stats().misses).toBe(0);
  });
});
