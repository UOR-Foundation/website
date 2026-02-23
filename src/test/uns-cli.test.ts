/**
 * UNS CLI — Test Suite (Phase 5-C)
 *
 * Validates all CLI command handlers against the UOR Framework
 * requirements: canonical ID format, Dilithium-3 signing, content
 * addressing, and correct exit codes.
 *
 * 10 tests covering:
 *   1.  identity new → canonical ID in output
 *   2.  identity show → shows canonical ID from step 1
 *   3.  verify --file (matching) → "✓ VERIFIED"
 *   4.  verify --file (mismatch) → "✗ MISMATCH", exit 1
 *   5.  resolve --json → valid JSON with u:canonicalId
 *   6.  --help → shows all command groups
 *   7.  identity new (second) → different canonical ID
 *   8.  compute deploy → canonical ID in stdout
 *   9.  store put → canonical ID + IPv6 in stdout
 *   10. record get --json → valid JSON with @type field
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  identityNew,
  identityShow,
  verifyFile,
  resolve,
  help,
  computeDeploy,
  storePut,
  recordGet,
  nameRegister,
  clearCliState,
  getStoredKeypair,
} from "../modules/uns/cli";

/** Canonical ID pattern: urn:uor:derivation:sha256:{64 hex chars}. */
const CANONICAL_ID_RE = /^urn:uor:derivation:sha256:[0-9a-f]{64}$/;

/** IPv6 UOR pattern: fd00:0075:6f72:xxxx:xxxx:xxxx:xxxx:xxxx */
const IPV6_RE = /^fd00:0075:6f72:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}$/;

describe("UNS CLI — Phase 5-C", () => {
  beforeEach(() => {
    clearCliState();
  });

  // ── Test 1: identity new → canonical ID in output ─────────────────────
  it("1. identity new returns canonical ID matching identity hash", async () => {
    const result = await identityNew("test");

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("urn:uor:derivation:sha256");
    expect(result.json.canonicalId).toMatch(CANONICAL_ID_RE);
    expect(result.json.algorithm).toBe("CRYSTALS-Dilithium-3");
  });

  // ── Test 2: identity show → shows canonical ID from step 1 ────────────
  it("2. identity show returns the canonical ID from identity new", async () => {
    const created = await identityNew("test");
    const shown = await identityShow("test");

    expect(shown.exitCode).toBe(0);
    expect(shown.json.canonicalId).toBe(created.json.canonicalId);
    expect(shown.stdout).toContain(created.json.canonicalId as string);
  });

  // ── Test 3: verify --file (matching) → "✓ VERIFIED" ──────────────────
  it("3. verify --file with correct canonical ID → ✓ VERIFIED", async () => {
    const content = new TextEncoder().encode("hello world");

    // First, compute the canonical ID of this content
    const { singleProofHash } = await import("../modules/uns/core/identity");
    let binary = "";
    for (const b of content) binary += String.fromCharCode(b);
    const identity = await singleProofHash({ raw: btoa(binary) });
    const canonicalId = identity["u:canonicalId"];

    const result = await verifyFile(canonicalId, content);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("✓ VERIFIED");
    expect(result.json.verified).toBe(true);
  });

  // ── Test 4: verify --file (mismatch) → "✗ MISMATCH", exit 1 ──────────
  it("4. verify --file with wrong canonical ID → ✗ MISMATCH, exit 1", async () => {
    const content = new TextEncoder().encode("hello world");
    const wrongId = "urn:uor:derivation:sha256:0000000000000000000000000000000000000000000000000000000000000000";

    const result = await verifyFile(wrongId, content);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("✗ MISMATCH");
    expect(result.json.verified).toBe(false);
  });

  // ── Test 5: resolve --json → valid JSON with u:canonicalId ────────────
  it("5. resolve returns JSON with u:canonicalId after registering a name", async () => {
    // Setup: create identity and register a name
    await identityNew("resolver-key");
    const keypair = getStoredKeypair("resolver-key");
    expect(keypair).toBeDefined();

    await nameRegister(
      "test.uor.foundation",
      keypair!.canonicalId,
      "resolver-key"
    );

    const result = await resolve("test.uor.foundation");

    expect(result.exitCode).toBe(0);
    expect(result.json["u:canonicalId"]).toMatch(CANONICAL_ID_RE);
    expect(result.json.verified).toBe(true);
  });

  // ── Test 6: --help → shows all command groups ─────────────────────────
  it("6. help shows all command groups", () => {
    const result = help();

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("identity new");
    expect(result.stdout).toContain("identity show");
    expect(result.stdout).toContain("node start");
    expect(result.stdout).toContain("resolve");
    expect(result.stdout).toContain("name register");
    expect(result.stdout).toContain("compute deploy");
    expect(result.stdout).toContain("compute invoke");
    expect(result.stdout).toContain("store put");
    expect(result.stdout).toContain("store get");
    expect(result.stdout).toContain("verify");
    expect(result.stdout).toContain("record get");
    expect(result.stdout).toContain("--json");
  });

  // ── Test 7: identity new (second) → different canonical ID ────────────
  it("7. second identity new produces different canonical ID", async () => {
    const first = await identityNew("test1");
    const second = await identityNew("test2");

    expect(first.json.canonicalId).toMatch(CANONICAL_ID_RE);
    expect(second.json.canonicalId).toMatch(CANONICAL_ID_RE);
    expect(first.json.canonicalId).not.toBe(second.json.canonicalId);
  });

  // ── Test 8: compute deploy → canonical ID in stdout ───────────────────
  it("8. compute deploy returns canonical ID in stdout", async () => {
    const source = 'return input.x + input.y;';
    const result = await computeDeploy(source, "adder");

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("urn:uor:derivation:sha256");
    expect(result.json.canonicalId).toMatch(CANONICAL_ID_RE);
    expect(result.json.name).toBe("adder");
  });

  // ── Test 9: store put → canonical ID + IPv6 in stdout ─────────────────
  it("9. store put returns canonical ID and IPv6 in stdout", async () => {
    const content = new TextEncoder().encode("store test content");
    const result = await storePut(content);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("urn:uor:derivation:sha256");
    expect(result.json.canonicalId).toMatch(CANONICAL_ID_RE);
    expect(result.json.ipv6).toMatch(IPV6_RE);
    expect(result.json.sizeBytes).toBe(content.length);
  });

  // ── Test 10: record get --json → valid JSON with @type field ──────────
  it("10. record get returns JSON with @type field", async () => {
    const canonicalId = "urn:uor:derivation:sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
    const result = await recordGet(canonicalId);

    expect(result.exitCode).toBe(0);
    expect(result.json["@type"]).toBe("uns:NameRecord");
    expect(result.json.canonicalId).toBe(canonicalId);
    expect(result.json.coherenceProof).toBeDefined();
    expect((result.json.coherenceProof as Record<string, unknown>).verified).toBe(true);
  });
});
