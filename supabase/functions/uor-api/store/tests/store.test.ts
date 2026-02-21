// Full integration test suite for the UOR × IPFS store/ namespace.
// Run: deno test --allow-net supabase/functions/uor-api/store/tests/store.test.ts

import { assertEquals, assertExists, assertNotEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeUorAddress, computeCid, canonicalJsonLd, validateStorableType, KERNEL_SPACE_TYPES } from "../../lib/store.ts";

const BASE_URL = Deno.env.get("API_BASE_URL") ?? "https://api.uor.foundation/v1";

// ============================================================
// UNIT TESTS — No network calls
// ============================================================

Deno.test("Unit: Braille bijection — byte 0 maps to U+2800", () => {
  const bytes = new Uint8Array([0]);
  const result = computeUorAddress(bytes);
  assertEquals(result.glyph, "\u2800");
  assertEquals(result.length, 1);
});

Deno.test("Unit: Braille bijection — byte 255 maps to U+28FF", () => {
  const bytes = new Uint8Array([255]);
  const result = computeUorAddress(bytes);
  assertEquals(result.glyph, "\u28FF");
  assertEquals(result.length, 1);
});

Deno.test("Unit: Braille bijection — byte 42 maps to U+282A", () => {
  const bytes = new Uint8Array([42]);
  const result = computeUorAddress(bytes);
  assertEquals(result.glyph.codePointAt(0), 0x2800 + 42);
});

Deno.test("Unit: Braille bijection — 'hello' encodes to 5 glyphs", () => {
  const bytes = new TextEncoder().encode("hello");
  const result = computeUorAddress(bytes);
  assertEquals(result.length, 5);
  // h=104, e=101, l=108, l=108, o=111
  assertEquals(result.glyph.codePointAt(0), 0x2800 + 104); // h
  assertEquals(result.glyph.codePointAt(1), 0x2800 + 101); // e
  assertEquals(result.glyph.codePointAt(2), 0x2800 + 108); // l
  assertEquals(result.glyph.codePointAt(3), 0x2800 + 108); // l
  assertEquals(result.glyph.codePointAt(4), 0x2800 + 111); // o
});

Deno.test("Unit: Braille bijection — deterministic (same bytes, same address)", () => {
  const bytes = new TextEncoder().encode("UOR Framework");
  const result1 = computeUorAddress(bytes);
  const result2 = computeUorAddress(bytes);
  assertEquals(result1.glyph, result2.glyph);
  assertEquals(result1.length, result2.length);
});

Deno.test("Unit: Braille bijection — different bytes produce different addresses", () => {
  const bytes1 = new TextEncoder().encode("hello");
  const bytes2 = new TextEncoder().encode("world");
  const result1 = computeUorAddress(bytes1);
  const result2 = computeUorAddress(bytes2);
  assertNotEquals(result1.glyph, result2.glyph);
});

Deno.test("Unit: Braille bijection — empty bytes produce empty address", () => {
  const result = computeUorAddress(new Uint8Array(0));
  assertEquals(result.glyph, "");
  assertEquals(result.length, 0);
});

Deno.test("Unit: CID computation — produces string starting with 'b'", async () => {
  const bytes = new TextEncoder().encode("hello world");
  const cid = await computeCid(bytes);
  assert(cid.startsWith("b"), `CID must start with 'b' (base32lower). Got: ${cid}`);
});

Deno.test("Unit: CID computation — deterministic (same bytes, same CID)", async () => {
  const bytes = new TextEncoder().encode("UOR Framework test content");
  const cid1 = await computeCid(bytes);
  const cid2 = await computeCid(bytes);
  assertEquals(cid1, cid2);
});

Deno.test("Unit: CID computation — different bytes produce different CIDs", async () => {
  const cid1 = await computeCid(new TextEncoder().encode("content A"));
  const cid2 = await computeCid(new TextEncoder().encode("content B"));
  assertNotEquals(cid1, cid2);
});

Deno.test("Unit: CID computation — minimum valid length", async () => {
  const bytes = new TextEncoder().encode("x");
  const cid = await computeCid(bytes);
  // CIDv1 dag-json sha2-256 base32: 'b' + base32(1+2+2+32 = 37 bytes) = 'b' + 60 chars = 61 chars minimum
  assert(cid.length >= 59, `CID too short: ${cid.length} chars`);
});

Deno.test("Unit: Canonical JSON — keys sorted alphabetically", () => {
  const obj = { "z": 1, "a": 2, "m": 3 };
  const result = canonicalJsonLd(obj);
  const parsed = JSON.parse(result);
  const keys = Object.keys(parsed);
  assertEquals(keys, ["a", "m", "z"]);
});

Deno.test("Unit: Canonical JSON — nested keys sorted", () => {
  const obj = { "outer": { "z": 1, "a": 2 } };
  const result = canonicalJsonLd(obj);
  const parsed = JSON.parse(result);
  const innerKeys = Object.keys(parsed.outer);
  assertEquals(innerKeys, ["a", "z"]);
});

Deno.test("Unit: Canonical JSON — minified (no extra whitespace)", () => {
  const obj = { "a": 1, "b": 2 };
  const result = canonicalJsonLd(obj);
  assert(!result.includes("\n"), "Canonical JSON must not contain newlines.");
  assert(!result.includes("  "), "Canonical JSON must not contain double spaces.");
});

Deno.test("Unit: validateStorableType — accepts cert:TransformCertificate", () => {
  validateStorableType("cert:TransformCertificate");
});

Deno.test("Unit: validateStorableType — accepts proof:CriticalIdentityProof", () => {
  validateStorableType("proof:CriticalIdentityProof");
});

Deno.test("Unit: validateStorableType — accepts state:Binding", () => {
  validateStorableType("state:Binding");
});

Deno.test("Unit: validateStorableType — rejects schema:Datum (kernel space)", () => {
  let threw = false;
  try { validateStorableType("schema:Datum"); }
  catch { threw = true; }
  assert(threw, "schema:Datum must be rejected as a kernel-space type.");
});

Deno.test("Unit: validateStorableType — rejects u:Address (kernel space)", () => {
  let threw = false;
  try { validateStorableType("u:Address"); }
  catch { threw = true; }
  assert(threw, "u:Address must be rejected as a kernel-space type.");
});

Deno.test("Unit: validateStorableType — rejects op:Operation (kernel space)", () => {
  let threw = false;
  try { validateStorableType("op:Operation"); }
  catch { threw = true; }
  assert(threw, "op:Operation must be rejected as a kernel-space type.");
});

Deno.test("Unit: validateStorableType — rejects all kernel-space types", () => {
  for (const type of KERNEL_SPACE_TYPES) {
    let threw = false;
    try { validateStorableType(type); }
    catch { threw = true; }
    assert(threw, `Kernel-space type "${type}" must be rejected.`);
  }
});

// ============================================================
// INTEGRATION TESTS — Require live API
// ============================================================

Deno.test("Integration: GET /store/resolve — returns 200 with UOR address", async () => {
  const res = await fetch(`${BASE_URL}/store/resolve?url=https://uor.foundation/llms.md`);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body["@type"], "store:RetrievedObject");
  assertExists(body["store:uorAddress"]);
  assertExists(body["store:uorAddress"]["u:glyph"]);
  assert(body["store:byteLength"] > 0, "Byte length must be positive.");
  assertEquals(body["store:verified"], null, "Resolve-only calls must have verified:null.");
});

Deno.test("Integration: GET /store/resolve — rejects non-HTTP protocol", async () => {
  const res = await fetch(`${BASE_URL}/store/resolve?url=ftp://example.com/file`);
  assertEquals(res.status, 400);
  const body = await res.json();
  assertExists(body["error"]);
});

Deno.test("Integration: GET /store/resolve — returns 400 for missing url", async () => {
  const res = await fetch(`${BASE_URL}/store/resolve`);
  assertEquals(res.status, 400);
});

Deno.test("Integration: GET /store/resolve — X-UOR-Address header present", async () => {
  const res = await fetch(`${BASE_URL}/store/resolve?url=https://uor.foundation/llms.md`);
  assertEquals(res.status, 200);
  const header = res.headers.get("X-UOR-Address");
  assertExists(header, "X-UOR-Address header must be present.");
  assert(header!.length > 0, "X-UOR-Address must not be empty.");
});

Deno.test("Integration: POST /store/write — dry run returns stored object", async () => {
  const res = await fetch(`${BASE_URL}/store/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: {
        "@type": "cert:TransformCertificate",
        "cert:verified": true,
        "cert:quantum": 8,
      },
      pin: false,
    }),
  });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body["@type"], "store:StoredObject");
  assertExists(body["store:cid"]);
  assertExists(body["store:uorAddress"]);
  assert(body["store:cid"].startsWith("b"), "CID must start with 'b'.");
});

Deno.test("Integration: POST /store/write — rejects kernel-space type", async () => {
  const res = await fetch(`${BASE_URL}/store/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: { "@type": "schema:Datum", "schema:value": 42 },
      pin: false,
    }),
  });
  assertEquals(res.status, 422);
});

Deno.test("Integration: POST /store/write — rejects missing @type", async () => {
  const res = await fetch(`${BASE_URL}/store/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ object: { "value": 42 }, pin: false }),
  });
  assertEquals(res.status, 400);
});

Deno.test("Integration: POST /store/write — deterministic (same object, same CID)", async () => {
  const payload = {
    object: {
      "@type": "cert:TransformCertificate",
      "cert:verified": true,
      "cert:quantum": 8,
      "cert:test": "determinism-check",
    },
    pin: false,
  };
  const res1 = await fetch(`${BASE_URL}/store/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const res2 = await fetch(`${BASE_URL}/store/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body1 = await res1.json();
  const body2 = await res2.json();
  assertEquals(body1["store:cid"], body2["store:cid"]);
  assertEquals(
    body1["store:uorAddress"]["u:glyph"],
    body2["store:uorAddress"]["u:glyph"],
  );
});

Deno.test("Integration: POST /store/write-context — dry run returns context", async () => {
  const res = await fetch(`${BASE_URL}/store/write-context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context: {
        name: "test-session",
        quantum: 8,
        bindings: [
          { address: "hello", value: 42 },
          { address: "world", value: 99 },
        ],
      },
      pin: false,
    }),
  });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body["@type"], "store:StoreContext");
  assertExists(body["store:rootCid"]);
  assertExists(body["store:bindings"]);
  assertEquals(body["store:bindingCount"], 2);
});

Deno.test("Integration: POST /store/write-context — rejects empty bindings", async () => {
  const res = await fetch(`${BASE_URL}/store/write-context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context: { name: "empty", bindings: [] },
      pin: false,
    }),
  });
  assertEquals(res.status, 400);
});

Deno.test("Integration: GET /store/gateways — returns gateway registry", async () => {
  const res = await fetch(`${BASE_URL}/store/gateways`);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body["@type"], "store:GatewayRegistry");
  assertExists(body["store:gateways"]);
  assert(Array.isArray(body["store:gateways"]), "Gateways must be an array.");
  assert(body["store:gateways"].length >= 3, "Must have at least 3 gateways.");

  // Each gateway must have required fields
  for (const gw of body["store:gateways"]) {
    assertExists(gw["store:id"], "Gateway must have store:id.");
    assertExists(gw["store:capabilities"], "Gateway must have store:capabilities.");
    assertExists(gw["store:health"], "Gateway must have store:health.");
    assert(
      ["healthy", "degraded", "unreachable"].includes(gw["store:health"]),
      `Invalid health: ${gw["store:health"]}`,
    );
  }
});

Deno.test("Integration: GET /store/gateways — default gateways specified", async () => {
  const res = await fetch(`${BASE_URL}/store/gateways`);
  const body = await res.json();
  assertExists(body["store:defaultReadGateway"]);
  assertExists(body["store:defaultWriteGateway"]);
});

Deno.test("Integration: Full round-trip — write (dry-run) then verify addresses match", async () => {
  // Step 1: Write with pin:false
  const writeRes = await fetch(`${BASE_URL}/store/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: {
        "@type": "proof:CriticalIdentityProof",
        "proof:holds": true,
        "proof:quantum": 8,
        "proof:test": "round-trip",
      },
      pin: false,
    }),
  });
  assertEquals(writeRes.status, 200);
  const writeBody = await writeRes.json();
  const cid = writeBody["store:cid"];
  const uorGlyph = writeBody["store:uorAddress"]["u:glyph"];
  assertExists(cid);
  assertExists(uorGlyph);

  // Step 2: Recompute locally and verify match
  const payload = {
    "@type": "proof:CriticalIdentityProof",
    "proof:holds": true,
    "proof:quantum": 8,
    "proof:test": "round-trip",
  };
  const localCanonical = canonicalJsonLd(writeBody["payload"] ?? payload);
  const localBytes = new TextEncoder().encode(localCanonical);
  const localUor = computeUorAddress(localBytes);
  const localCid = await computeCid(localBytes);

  assertEquals(localCid, cid, "Local CID must match API CID.");
  assertEquals(localUor.glyph, uorGlyph, "Local UOR address must match API UOR address.");
});
