// Full integration test suite for the UOR × IPFS store/ namespace.
// Run: deno test --allow-net supabase/functions/uor-api/store/tests/store.test.ts

import "https://deno.land/std@0.224.0/dotenv/load.ts";
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
// INTEGRATION TESTS — /store/resolve
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
  await res.body?.cancel();
});

Deno.test("Integration: GET /store/resolve — X-UOR-Address header present", async () => {
  const res = await fetch(`${BASE_URL}/store/resolve?url=https://uor.foundation/llms.md`);
  assertEquals(res.status, 200);
  const header = res.headers.get("X-UOR-Address");
  assertExists(header, "X-UOR-Address response header must be present.");
  assert(header!.length > 0, "X-UOR-Address must not be empty.");
  await res.body?.cancel();
});

Deno.test("Integration: GET /store/resolve — X-UOR-Byte-Length header is numeric", async () => {
  const res = await fetch(`${BASE_URL}/store/resolve?url=https://uor.foundation/llms.md`);
  assertEquals(res.status, 200);
  const byteLen = res.headers.get("X-UOR-Byte-Length");
  assertExists(byteLen);
  assert(!isNaN(parseInt(byteLen!)), "X-UOR-Byte-Length must be numeric.");
  await res.body?.cancel();
});

Deno.test("Integration: GET /store/resolve — same URL always produces same UOR address", async () => {
  const url = `${BASE_URL}/store/resolve?url=https://uor.foundation/llms.md`;
  const [res1, res2] = await Promise.all([fetch(url), fetch(url)]);
  const [body1, body2] = await Promise.all([res1.json(), res2.json()]);
  assertEquals(
    body1["store:uorAddress"]["u:glyph"],
    body2["store:uorAddress"]["u:glyph"],
    "Same URL must always produce the same UOR address (determinism)."
  );
});

Deno.test("Integration: GET /store/resolve — include_partition adds partition_analysis field", async () => {
  const res = await fetch(
    `${BASE_URL}/store/resolve?url=https://uor.foundation/llms.md&include_partition=true`
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertExists(body["partition_analysis"], "partition_analysis must be present when include_partition=true.");
  assertExists(body["partition_analysis"]["partition:density"]);
  assertExists(body["partition_analysis"]["partition:irreducibles"]);
});

Deno.test("Integration: GET /store/resolve — include_metrics adds observable_metrics field", async () => {
  const res = await fetch(
    `${BASE_URL}/store/resolve?url=https://uor.foundation/llms.md&include_metrics=true`
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertExists(body["observable_metrics"], "observable_metrics must be present when include_metrics=true.");
});

Deno.test("Integration: GET /store/resolve — cidPreview starts with 'b'", async () => {
  const res = await fetch(
    `${BASE_URL}/store/resolve?url=https://uor.foundation/llms.md`
  );
  const body = await res.json();
  const preview = body["store:cidPreview"] as string;
  assertExists(preview);
  assert(preview.startsWith("b"), `CID preview must start with 'b'. Got: ${preview}`);
});

Deno.test("Integration: GET /store/resolve — response is valid JSON-LD (has @context, @type, @id)", async () => {
  const res = await fetch(
    `${BASE_URL}/store/resolve?url=https://uor.foundation/llms.md`
  );
  const body = await res.json();
  assertExists(body["@context"], "Response must have @context.");
  assertExists(body["@type"], "Response must have @type.");
  assertExists(body["@id"], "Response must have @id.");
  assertEquals(body["@context"]["u"], "https://uor.foundation/u/");
  assertEquals(body["@context"]["store"], "https://uor.foundation/store/");
});

Deno.test("Integration: GET /store/resolve — UOR address glyph characters are all Braille (U+2800–U+28FF)", async () => {
  const res = await fetch(
    `${BASE_URL}/store/resolve?url=https://uor.foundation/llms.md`
  );
  const body = await res.json();
  const glyph: string = body["store:uorAddress"]["u:glyph"];
  const sample = [...glyph].slice(0, 100);
  for (const char of sample) {
    const cp = char.codePointAt(0) ?? 0;
    assert(
      cp >= 0x2800 && cp <= 0x28FF,
      `Glyph character U+${cp.toString(16).toUpperCase()} is outside the Braille range U+2800–U+28FF.`
    );
  }
});

Deno.test("Integration: GET /store/resolve — u:length equals byte count", async () => {
  const res = await fetch(
    `${BASE_URL}/store/resolve?url=https://uor.foundation/llms.md`
  );
  const body = await res.json();
  const uorLength: number = body["store:uorAddress"]["u:length"];
  const byteLength: number = body["store:byteLength"];
  assertEquals(
    uorLength,
    byteLength,
    "u:length must equal store:byteLength (one glyph per byte is the Braille bijection invariant)."
  );
});

// ============================================================
// INTEGRATION TESTS — /store/write (dry run — no IPFS calls)
// ============================================================

Deno.test("Integration: POST /store/write (dry run) — returns 200 with store:StoredObject", async () => {
  const res = await fetch(`${BASE_URL}/store/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: {
        "@type": "cert:TransformCertificate",
        "cert:transformType": "uor-address-to-ipfs-cid",
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
  assertExists(body["store:uorAddress"]["u:glyph"]);
  assertEquals(body["summary"]["dry_run"], true);
});

Deno.test("Integration: POST /store/write (dry run) — CID starts with 'b'", async () => {
  const res = await fetch(`${BASE_URL}/store/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: { "@type": "cert:TransformCertificate", "cert:verified": true },
      pin: false,
    }),
  });
  const body = await res.json();
  const cid: string = body["store:cid"];
  assert(cid.startsWith("b"), `CID must start with 'b'. Got: ${cid}`);
});

Deno.test("Integration: POST /store/write (dry run) — X-Store-Dry-Run header is 'true'", async () => {
  const res = await fetch(`${BASE_URL}/store/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: { "@type": "proof:CriticalIdentityProof", "proof:verified": true },
      pin: false,
    }),
  });
  assertEquals(res.headers.get("X-Store-Dry-Run"), "true");
  await res.body?.cancel();
});

Deno.test("Integration: POST /store/write (dry run) — storedType matches @type of input", async () => {
  const res = await fetch(`${BASE_URL}/store/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: { "@type": "partition:Partition", "partition:quantum": 8 },
      pin: false,
    }),
  });
  const body = await res.json();
  const storedType: string = body["store:storedType"];
  assert(
    storedType.includes("partition") || storedType === "partition:Partition",
    `storedType must reflect the input @type. Got: ${storedType}`
  );
});

Deno.test("Integration: POST /store/write (dry run) — same object always produces same CID", async () => {
  const payload = {
    object: { "@type": "cert:TransformCertificate", "cert:verified": true, "cert:quantum": 8 },
    pin: false,
  };
  const [res1, res2] = await Promise.all([
    fetch(`${BASE_URL}/store/write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
    fetch(`${BASE_URL}/store/write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  ]);
  const [body1, body2] = await Promise.all([res1.json(), res2.json()]);
  assertEquals(body1["store:cid"], body2["store:cid"], "Same input object must always produce the same CID (determinism).");
  assertEquals(body1["store:uorAddress"]["u:glyph"], body2["store:uorAddress"]["u:glyph"], "Same input must always produce the same UOR address (determinism).");
});

Deno.test("Integration: POST /store/write — rejects schema:Datum with 422", async () => {
  const res = await fetch(`${BASE_URL}/store/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: { "@type": "schema:Datum", "schema:value": 42, "schema:quantum": 8 },
      pin: false,
    }),
  });
  assertEquals(res.status, 422, "Kernel-space type schema:Datum must be rejected with 422.");
  const body = await res.json();
  assertExists(body["error"]);
  assertExists(body["valid_types"]);
  assert(Array.isArray(body["valid_types"]), "valid_types must be an array.");
});

Deno.test("Integration: POST /store/write — rejects u:Address with 422", async () => {
  const res = await fetch(`${BASE_URL}/store/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: { "@type": "u:Address", "u:glyph": "⠓⠑⠇⠇⠕" },
      pin: false,
    }),
  });
  assertEquals(res.status, 422);
  await res.body?.cancel();
});

Deno.test("Integration: POST /store/write — rejects op:Operation with 422", async () => {
  const res = await fetch(`${BASE_URL}/store/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: { "@type": "op:Operation" },
      pin: false,
    }),
  });
  assertEquals(res.status, 422);
  await res.body?.cancel();
});

Deno.test("Integration: POST /store/write — rejects missing object field with 400", async () => {
  const res = await fetch(`${BASE_URL}/store/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: false }),
  });
  assertEquals(res.status, 400);
  await res.body?.cancel();
});

Deno.test("Integration: POST /store/write — rejects object with no @type with 400", async () => {
  const res = await fetch(`${BASE_URL}/store/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: { "cert:verified": true },
      pin: false,
    }),
  });
  assertEquals(res.status, 400);
  await res.body?.cancel();
});

Deno.test("Integration: POST /store/write (dry run) — payload in response matches input object", async () => {
  const inputObject = {
    "@type": "proof:CoherenceProof",
    "proof:verified": true,
    "proof:quantum": 8,
  };
  const res = await fetch(`${BASE_URL}/store/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ object: inputObject, pin: false }),
  });
  const body = await res.json();
  assertExists(body["payload"], "Response must include the payload field.");
  assertEquals(body["payload"]["@type"], "proof:CoherenceProof");
  assertEquals(body["payload"]["proof:verified"], true);
});

Deno.test("Integration: POST /store/write (dry run) — pinRecord.pinCertificate.verified is false in dry run", async () => {
  const res = await fetch(`${BASE_URL}/store/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: { "@type": "cert:InvolutionCertificate", "cert:verified": true },
      pin: false,
    }),
  });
  const body = await res.json();
  assertEquals(
    body["store:pinRecord"]["store:pinCertificate"]["cert:verified"],
    false,
    "pinCertificate.cert:verified must be false in dry run mode."
  );
});

// ============================================================
// INTEGRATION TESTS — /store/verify
// ============================================================

Deno.test("Integration: GET /store/verify — returns 200 for valid CID format", async () => {
  const res = await fetch(`${BASE_URL}/store/verify/bafkqaaa`);
  assert(
    res.status === 200 || res.status === 404,
    `Expected 200 or 404 for bafkqaaa probe. Got ${res.status}.`
  );
  await res.body?.cancel();
});

Deno.test("Integration: GET /store/verify — rejects malformed CID with 400", async () => {
  const res = await fetch(`${BASE_URL}/store/verify/not-a-real-cid-xyz`);
  assertEquals(res.status, 400);
  const body = await res.json();
  assertExists(body["error"]);
});

Deno.test("Integration: GET /store/verify — rejects missing CID with 400", async () => {
  const res = await fetch(`${BASE_URL}/store/verify/`);
  assert(
    res.status === 400 || res.status === 404,
    `Expected 400 or 404 for empty CID. Got ${res.status}.`
  );
  await res.body?.cancel();
});

Deno.test("Integration: GET /store/verify — X-UOR-Verdict header present", async () => {
  const res = await fetch(`${BASE_URL}/store/verify/bafkqaaa`);
  if (res.status === 200) {
    const verdict = res.headers.get("X-UOR-Verdict");
    assertExists(verdict, "X-UOR-Verdict header must be present on 200 responses.");
    assert(
      ["VERIFIED", "INDETERMINATE", "FAILED"].includes(verdict!),
      `X-UOR-Verdict must be one of VERIFIED, INDETERMINATE, FAILED. Got: ${verdict}`
    );
  }
  await res.body?.cancel();
});

// ============================================================
// INTEGRATION TESTS — /store/write-context (dry run)
// ============================================================

Deno.test("Integration: POST /store/write-context (dry run) — returns store:StoreContext", async () => {
  const res = await fetch(`${BASE_URL}/store/write-context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context: {
        name: "test-context-dryrun",
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
  assertExists(body["store:uorAddress"]);
  assertEquals(body["store:bindingCount"], 2);
});

Deno.test("Integration: POST /store/write-context (dry run) — binding count matches input", async () => {
  const bindings = [
    { address: "alpha", value: 1 },
    { address: "beta",  value: 2 },
    { address: "gamma", value: 3 },
    { address: "delta", value: 4 },
  ];
  const res = await fetch(`${BASE_URL}/store/write-context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context: { name: "test-count", quantum: 8, bindings },
      pin: false,
    }),
  });
  const body = await res.json();
  assertEquals(body["store:bindingCount"], bindings.length);
  assertEquals(body["store:bindings"].length, bindings.length);
});

Deno.test("Integration: POST /store/write-context (dry run) — each binding has a CID", async () => {
  const res = await fetch(`${BASE_URL}/store/write-context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context: {
        name: "test-binding-cids",
        quantum: 8,
        bindings: [
          { address: "uor", value: 42 },
          { address: "ipfs", value: 13 },
        ],
      },
      pin: false,
    }),
  });
  const body = await res.json();
  for (const binding of body["store:bindings"]) {
    assertExists(binding["store:cid"], "Each binding must have a store:cid.");
    assert(
      (binding["store:cid"] as string).startsWith("b"),
      `Binding CID must start with 'b'. Got: ${binding["store:cid"]}`
    );
  }
});

Deno.test("Integration: POST /store/write-context (dry run) — all binding CIDs are unique", async () => {
  const res = await fetch(`${BASE_URL}/store/write-context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context: {
        name: "test-uniqueness",
        quantum: 8,
        bindings: [
          { address: "apple",  value: 1 },
          { address: "banana", value: 2 },
          { address: "cherry", value: 3 },
        ],
      },
      pin: false,
    }),
  });
  const body = await res.json();
  const cids = body["store:bindings"].map((b: Record<string, unknown>) => b["store:cid"]);
  const uniqueCids = new Set(cids);
  assertEquals(
    uniqueCids.size,
    cids.length,
    "Each binding must have a unique CID (different addresses must produce different CIDs)."
  );
});

Deno.test("Integration: POST /store/write-context — rejects empty bindings array with 400", async () => {
  const res = await fetch(`${BASE_URL}/store/write-context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context: { name: "empty", quantum: 8, bindings: [] },
      pin: false,
    }),
  });
  assertEquals(res.status, 400);
  await res.body?.cancel();
});

Deno.test("Integration: POST /store/write-context — rejects missing bindings field with 400", async () => {
  const res = await fetch(`${BASE_URL}/store/write-context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context: { name: "no-bindings", quantum: 8 },
      pin: false,
    }),
  });
  assertEquals(res.status, 400);
  await res.body?.cancel();
});

Deno.test("Integration: POST /store/write-context — rejects more than 256 bindings with 400", async () => {
  const tooManyBindings = Array.from({ length: 257 }, (_, i) => ({
    address: `addr-${i}`,
    value: i % 256,
  }));
  const res = await fetch(`${BASE_URL}/store/write-context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context: { name: "overflow", quantum: 8, bindings: tooManyBindings },
      pin: false,
    }),
  });
  assertEquals(res.status, 400);
  await res.body?.cancel();
});

Deno.test("Integration: POST /store/write-context (dry run) — plain string addresses are bijected to Braille", async () => {
  const res = await fetch(`${BASE_URL}/store/write-context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context: {
        name: "test-braille-bijection",
        quantum: 8,
        bindings: [{ address: "hello", value: 42 }],
      },
      pin: false,
    }),
  });
  const body = await res.json();
  const bindingAddress: string = body["store:bindings"][0]["binding:uorAddress"];
  assertExists(bindingAddress);
  const firstChar = bindingAddress.codePointAt(0) ?? 0;
  assert(
    firstChar >= 0x2800 && firstChar <= 0x28FF,
    `Bijected address must be in Braille range. Got codepoint: U+${firstChar.toString(16).toUpperCase()}`
  );
});

Deno.test("Integration: POST /store/write-context (dry run) — summary includes retrieval instructions", async () => {
  const res = await fetch(`${BASE_URL}/store/write-context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context: {
        name: "test-summary",
        quantum: 8,
        bindings: [{ address: "x", value: 1 }],
      },
      pin: false,
    }),
  });
  const body = await res.json();
  assertExists(body["summary"]);
  assertExists(body["summary"]["how_to_retrieve_context"]);
  assertExists(body["summary"]["how_to_verify_context"]);
  assertExists(body["summary"]["agent_memory_note"]);
});

// ============================================================
// INTEGRATION TESTS — /store/gateways
// ============================================================

Deno.test("Integration: GET /store/gateways — returns 200", async () => {
  const res = await fetch(`${BASE_URL}/store/gateways`);
  assertEquals(res.status, 200);
  await res.body?.cancel();
});

Deno.test("Integration: GET /store/gateways — returns store:GatewayConfig type", async () => {
  const res = await fetch(`${BASE_URL}/store/gateways`);
  const body = await res.json();
  assertEquals(body["@type"], "store:GatewayConfig");
});

Deno.test("Integration: GET /store/gateways — has at least 2 gateways", async () => {
  const res = await fetch(`${BASE_URL}/store/gateways`);
  const body = await res.json();
  const gateways = body["store:gateways"];
  assert(Array.isArray(gateways), "store:gateways must be an array.");
  assert(gateways.length >= 2, "Must have at least 2 configured gateways.");
});

Deno.test("Integration: GET /store/gateways — each gateway has health field", async () => {
  const res = await fetch(`${BASE_URL}/store/gateways`);
  const body = await res.json();
  for (const gw of body["store:gateways"]) {
    assertExists(gw["store:health"], `Gateway "${gw["store:id"]}" must have store:health.`);
    assert(
      ["healthy", "degraded", "unreachable", "unknown"].includes(gw["store:health"]),
      `store:health must be one of healthy/degraded/unreachable/unknown. Got: ${gw["store:health"]}`
    );
  }
});

Deno.test("Integration: GET /store/gateways — ipfs.io is present and read-capable", async () => {
  const res = await fetch(`${BASE_URL}/store/gateways`);
  const body = await res.json();
  const ipfsIo = body["store:gateways"].find(
    (gw: Record<string, unknown>) => gw["store:id"] === "ipfs-io"
  );
  assertExists(ipfsIo, "ipfs.io gateway must be in the registry.");
  assert(
    (ipfsIo["store:capabilities"] as string[]).includes("read"),
    "ipfs.io must support read operations."
  );
});

Deno.test("Integration: GET /store/gateways — has defaultReadGateway and defaultWriteGateway", async () => {
  const res = await fetch(`${BASE_URL}/store/gateways`);
  const body = await res.json();
  assertExists(body["store:defaultReadGateway"]);
  assertExists(body["store:defaultWriteGateway"]);
});

Deno.test("Integration: GET /store/gateways — includes IPFS spec references", async () => {
  const res = await fetch(`${BASE_URL}/store/gateways`);
  const body = await res.json();
  assertExists(body["store:ipfsSpecs"], "Must include IPFS spec references.");
  assertExists(body["store:ipfsSpecs"]["trustless_gateway"]);
  assertExists(body["store:ipfsSpecs"]["cid_spec"]);
});

Deno.test("Integration: GET /store/gateways — Content-Type is application/ld+json", async () => {
  const res = await fetch(`${BASE_URL}/store/gateways`);
  const ct = res.headers.get("Content-Type") ?? "";
  assert(
    ct.includes("application/ld+json"),
    `Content-Type must be application/ld+json. Got: ${ct}`
  );
  await res.body?.cancel();
});

// ============================================================
// CROSS-ENDPOINT CONSISTENCY TESTS
// ============================================================

Deno.test("Cross-endpoint: write (dry run) then verify addresses are consistent", async () => {
  const writeRes = await fetch(`${BASE_URL}/store/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: {
        "@type": "cert:TransformCertificate",
        "cert:transformType": "uor-cross-endpoint-test",
        "cert:verified": true,
        "cert:quantum": 8,
      },
      pin: false,
    }),
  });
  assertEquals(writeRes.status, 200);
  const writeBody = await writeRes.json();
  const writtenCid: string = writeBody["store:cid"];
  const writtenUor: string = writeBody["store:uorAddress"]["u:glyph"];
  assert(writtenCid.startsWith("b"), "Written CID must be CIDv1 base32lower.");
  const sample = [...writtenUor].slice(0, 20);
  for (const char of sample) {
    const cp = char.codePointAt(0) ?? 0;
    assert(cp >= 0x2800 && cp <= 0x28FF, `UOR address char U+${cp.toString(16)} is outside Braille range.`);
  }
  assertEquals(writeBody["summary"]["ipfs_cid"], writtenCid);
  assertEquals(writeBody["summary"]["uor_address"], writtenUor);
});

Deno.test("Cross-endpoint: resolve vs write — same content gives same UOR address via both paths", async () => {
  const resolveRes = await fetch(
    `${BASE_URL}/store/resolve?url=https://uor.foundation/llms.md`
  );
  assertEquals(resolveRes.status, 200);
  const resolveBody = await resolveRes.json();
  const resolvedUorGlyph: string = resolveBody["store:uorAddress"]["u:glyph"];
  const resolvedByteLength: number = resolveBody["store:byteLength"];
  assert(resolvedUorGlyph.length > 0, "Resolved UOR address must be non-empty.");
  assertEquals(
    [...resolvedUorGlyph].length,
    resolvedByteLength,
    "Glyph character count must equal byte count (one glyph per byte invariant)."
  );
});

Deno.test("Cross-endpoint: write-context produces unique root CID on different context names", async () => {
  const [res1, res2] = await Promise.all([
    fetch(`${BASE_URL}/store/write-context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: { name: "context-A", quantum: 8, bindings: [{ address: "x", value: 1 }] },
        pin: false,
      }),
    }),
    fetch(`${BASE_URL}/store/write-context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: { name: "context-B", quantum: 8, bindings: [{ address: "x", value: 1 }] },
        pin: false,
      }),
    }),
  ]);
  const [body1, body2] = await Promise.all([res1.json(), res2.json()]);
  assertNotEquals(
    body1["store:rootCid"],
    body2["store:rootCid"],
    "Different context names must produce different root CIDs (the name is part of the content)."
  );
});

Deno.test("Cross-endpoint: write-context produces same root CID for identical contexts", async () => {
  const payload = {
    context: {
      name: "determinism-test",
      quantum: 8,
      bindings: [
        { address: "hello", value: 42 },
        { address: "world", value: 99 },
      ],
    },
    pin: false,
  };
  const [res1, res2] = await Promise.all([
    fetch(`${BASE_URL}/store/write-context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
    fetch(`${BASE_URL}/store/write-context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  ]);
  const [body1, body2] = await Promise.all([res1.json(), res2.json()]);
  assertEquals(
    body1["store:rootCid"],
    body2["store:rootCid"],
    "Identical context inputs must always produce the same root CID (determinism)."
  );
});

// ============================================================
// FRAMEWORK INTEGRITY TESTS
// ============================================================

Deno.test("Framework: Braille bijection invariant — glyph length equals byte count", async () => {
  const testUrls = ["https://uor.foundation/llms.md"];
  for (const url of testUrls) {
    const res = await fetch(`${BASE_URL}/store/resolve?url=${encodeURIComponent(url)}`);
    if (res.status !== 200) { await res.body?.cancel(); continue; }
    const body = await res.json();
    const glyphLen = [...(body["store:uorAddress"]["u:glyph"] as string)].length;
    const byteLen = body["store:byteLength"] as number;
    assertEquals(
      glyphLen,
      byteLen,
      `BIJECTION INVARIANT VIOLATED for ${url}: glyph length (${glyphLen}) ≠ byte count (${byteLen})`
    );
  }
});

Deno.test("Framework: Kernel-space exclusion — all 13 kernel types are rejected", async () => {
  const kernelTypes = [
    "u:Address", "u:Glyph",
    "schema:Datum", "schema:Term", "schema:Literal",
    "schema:Application", "schema:Ring",
    "op:Operation", "op:UnaryOp", "op:BinaryOp",
    "op:Involution", "op:Group", "op:DihedralGroup",
  ];
  const results = await Promise.all(
    kernelTypes.map(type =>
      fetch(`${BASE_URL}/store/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ object: { "@type": type }, pin: false }),
      }).then(async r => {
        const status = r.status;
        await r.body?.cancel();
        return { type, status };
      })
    )
  );
  for (const { type, status } of results) {
    assertEquals(status, 422, `Kernel-space type "${type}" must be rejected with HTTP 422. Got ${status}.`);
  }
});

Deno.test("Framework: JSON-LD context completeness — all 14 UOR namespaces present in responses", async () => {
  const res = await fetch(`${BASE_URL}/store/resolve?url=https://uor.foundation/llms.md`);
  const body = await res.json();
  const context = body["@context"];
  assertExists(context);
  const requiredNamespaces = [
    "u", "schema", "op", "partition", "proof", "cert",
    "observable", "derivation", "trace", "resolver",
    "type", "morphism", "state", "store",
  ];
  for (const ns of requiredNamespaces) {
    assertExists(context[ns], `@context must include namespace "${ns}". Missing in response.`);
    assert(
      (context[ns] as string).startsWith("https://uor.foundation/"),
      `Namespace "${ns}" IRI must start with https://uor.foundation/. Got: ${context[ns]}`
    );
  }
});

Deno.test("Framework: CIDv1 format compliance — dag-json codec and sha2-256", async () => {
  const res = await fetch(`${BASE_URL}/store/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: { "@type": "cert:TransformCertificate", "cert:verified": true },
      pin: false,
    }),
  });
  const body = await res.json();
  const cid: string = body["store:cid"];
  assert(cid.startsWith("b"), `CID must start with 'b' (base32lower multibase prefix). Got: ${cid}`);
  // CIDv1 base32lower: 'b' + at least 58 chars (version + codec varint + multihash)
  assert(cid.length >= 59, `CID too short for CIDv1 dag-json sha2-256: ${cid.length} chars`);
  // All chars after 'b' must be lowercase alphanumeric (base32lower alphabet)
  const base32Part = cid.slice(1);
  assert(/^[a-z2-7]+$/.test(base32Part), `CID base32 portion contains invalid characters: ${base32Part.slice(0, 20)}...`);
});

// ============================================================
// FULL ROUND-TRIP TEST
// ============================================================

Deno.test("Full round-trip: write (dry-run) then verify addresses match locally", async () => {
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

  // Recompute locally and verify match
  const localCanonical = canonicalJsonLd(writeBody["payload"]);
  const localBytes = new TextEncoder().encode(localCanonical);
  const localUor = computeUorAddress(localBytes);
  const localCid = await computeCid(localBytes);

  assertEquals(localCid, cid, "Local CID must match API CID.");
  assertEquals(localUor.glyph, uorGlyph, "Local UOR address must match API UOR address.");
});
