import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { UnsLedger } from "@/modules/uns/ledger";
import { generateKeypair, verifyRecord } from "@/modules/uns/core/keypair";
import type { UnsKeypair } from "@/modules/uns/core/keypair";
import { singleProofHash } from "@/modules/uns/core/identity";

// ── Setup ───────────────────────────────────────────────────────────────────

let operator: UnsKeypair;
let ledger: UnsLedger;

beforeAll(async () => {
  operator = await generateKeypair();
});

beforeEach(() => {
  ledger = new UnsLedger(operator);
});

// ═════════════════════════════════════════════════════════════════════════════
// Phase 3-D Tests — 10/10
// ═════════════════════════════════════════════════════════════════════════════

describe("UNS Ledger — Phase 3-D: Verifiable SQL", () => {
  // Test 1
  it("1. migrate() creates table and returns signed SchemaMigration", async () => {
    const migration = await ledger.migrate(
      "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT)",
      "Create users table"
    );
    expect(migration["@type"]).toBe("uns:SchemaMigration");
    expect(migration["uns:migrationCanonicalId"]).toMatch(/^urn:uor:derivation:sha256:/);
    expect(migration["cert:signature"]["@type"]).toBe("cert:Signature");
  });

  // Test 2
  it("2. execute() INSERT returns StateTransition with before/after canonical IDs", async () => {
    await ledger.migrate(
      "CREATE TABLE items (id INTEGER PRIMARY KEY, label TEXT)",
      "Create items"
    );
    const transition = await ledger.execute(
      "INSERT INTO items (id, label) VALUES (?, ?)",
      [1, "widget"]
    );
    expect(transition["@type"]).toBe("state:Transition");
    expect(transition["state:previousCanonicalId"]).toMatch(/^urn:uor:derivation:sha256:/);
    expect(transition["state:nextCanonicalId"]).toMatch(/^urn:uor:derivation:sha256:/);
    expect(transition["state:previousCanonicalId"]).not.toBe(transition["state:nextCanonicalId"]);
  });

  // Test 3
  it("3. query() SELECT returns rows + queryProof with all three canonical IDs", async () => {
    await ledger.migrate("CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT)", "notes");
    await ledger.execute("INSERT INTO notes (id, body) VALUES (?, ?)", [1, "hello"]);

    const result = await ledger.query("SELECT * FROM notes");
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].body).toBe("hello");
    expect(result.queryProof["proof:queryCanonicalId"]).toMatch(/^urn:uor:derivation:sha256:/);
    expect(result.queryProof["proof:dbStateCanonicalId"]).toMatch(/^urn:uor:derivation:sha256:/);
    expect(result.queryProof["proof:resultCanonicalId"]).toMatch(/^urn:uor:derivation:sha256:/);
  });

  // Test 4
  it("4. verifyQueryProof() returns true for genuine proof", async () => {
    await ledger.migrate("CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)", "t");
    await ledger.execute("INSERT INTO t (id, v) VALUES (?, ?)", [1, "a"]);
    const result = await ledger.query("SELECT * FROM t");
    const valid = await ledger.verifyQueryProof(result.queryProof);
    expect(valid).toBe(true);
  });

  // Test 5
  it("5. verifyQueryProof() returns false if rows are tampered", async () => {
    await ledger.migrate("CREATE TABLE t2 (id INTEGER PRIMARY KEY, v TEXT)", "t2");
    await ledger.execute("INSERT INTO t2 (id, v) VALUES (?, ?)", [1, "x"]);
    const result = await ledger.query("SELECT * FROM t2");

    // Tamper: change result canonical ID
    const tampered = {
      ...result.queryProof,
      "proof:resultCanonicalId": "urn:uor:derivation:sha256:0000000000000000000000000000000000000000000000000000000000000000",
    };
    const valid = await ledger.verifyQueryProof(tampered);
    expect(valid).toBe(false);
  });

  // Test 6
  it("6. getMigrationHistory() returns all migrations in order", async () => {
    await ledger.migrate("CREATE TABLE a (id INTEGER PRIMARY KEY)", "table a");
    await ledger.migrate("CREATE TABLE b (id INTEGER PRIMARY KEY)", "table b");
    await ledger.migrate("CREATE TABLE c (id INTEGER PRIMARY KEY)", "table c");

    const history = await ledger.getMigrationHistory();
    expect(history.length).toBe(3);
    expect(history[0]["uns:description"]).toBe("table a");
    expect(history[2]["uns:description"]).toBe("table c");
  });

  // Test 7
  it("7. queryProof cert:signature is valid Dilithium-3", async () => {
    await ledger.migrate("CREATE TABLE s (id INTEGER PRIMARY KEY)", "s");
    const result = await ledger.query("SELECT * FROM s");
    const sig = result.queryProof["cert:signature"];
    expect(sig["cert:algorithm"]).toBe("CRYSTALS-Dilithium-3");
    expect(sig["cert:signerCanonicalId"]).toBe(operator.canonicalId);
    const valid = await verifyRecord(result.queryProof);
    expect(valid).toBe(true);
  });

  // Test 8
  it("8. stateTransition cert:signature is valid Dilithium-3", async () => {
    await ledger.migrate("CREATE TABLE w (id INTEGER PRIMARY KEY, v INTEGER)", "w");
    const transition = await ledger.execute("INSERT INTO w (id, v) VALUES (?, ?)", [1, 42]);
    const sig = transition["cert:signature"];
    expect(sig["cert:algorithm"]).toBe("CRYSTALS-Dilithium-3");
    const valid = await verifyRecord(transition);
    expect(valid).toBe(true);
  });

  // Test 9
  it("9. Two identical queries → same proof:queryCanonicalId", async () => {
    await ledger.migrate("CREATE TABLE d (id INTEGER PRIMARY KEY)", "d");
    const r1 = await ledger.query("SELECT * FROM d");
    const r2 = await ledger.query("SELECT * FROM d");
    expect(r1.queryProof["proof:queryCanonicalId"]).toBe(
      r2.queryProof["proof:queryCanonicalId"]
    );
  });

  // Test 10
  it("10. Different rows → different proof:resultCanonicalId", async () => {
    await ledger.migrate("CREATE TABLE e (id INTEGER PRIMARY KEY, v TEXT)", "e");

    const r1 = await ledger.query("SELECT * FROM e"); // empty
    await ledger.execute("INSERT INTO e (id, v) VALUES (?, ?)", [1, "data"]);
    const r2 = await ledger.query("SELECT * FROM e"); // one row

    expect(r1.queryProof["proof:resultCanonicalId"]).not.toBe(
      r2.queryProof["proof:resultCanonicalId"]
    );
  });
});
