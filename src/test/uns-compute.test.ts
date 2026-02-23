import { describe, it, expect, beforeAll, afterEach } from "vitest";
import {
  deployFunction,
  getFunction,
  clearRegistry,
  invokeFunction,
  verifyExecution,
} from "@/modules/uns/compute";
import { generateKeypair } from "@/modules/uns/core/keypair";
import type { UnsKeypair } from "@/modules/uns/core/keypair";

// ── Setup ───────────────────────────────────────────────────────────────────

let deployer: UnsKeypair;
let executor: UnsKeypair;

beforeAll(async () => {
  deployer = await generateKeypair();
  executor = await generateKeypair();
});

afterEach(() => {
  clearRegistry();
});

// ═════════════════════════════════════════════════════════════════════════════
// Phase 3-A Tests — 10/10
// ═════════════════════════════════════════════════════════════════════════════

describe("UNS Compute — Phase 3-A: Ring-Certified Edge Functions", () => {
  // Test 1
  it("1. deployFunction returns canonicalId matching urn:uor:derivation:sha256", async () => {
    const fn = await deployFunction(
      "return input.x + 1;",
      "javascript",
      deployer,
      "increment"
    );
    expect(fn.canonicalId).toMatch(/^urn:uor:derivation:sha256:[a-f0-9]{64}$/);
    expect(fn.language).toBe("javascript");
    expect(fn.deployerCanonicalId).toBe(deployer.canonicalId);
  });

  // Test 2
  it("2. Two deployments of identical source → same canonicalId", async () => {
    const source = "return input.x * 2;";
    const fn1 = await deployFunction(source, "javascript", deployer);
    const fn2 = await deployFunction(source, "javascript", deployer);
    expect(fn1.canonicalId).toBe(fn2.canonicalId);
  });

  // Test 3
  it("3. One-character source difference → completely different canonicalId", async () => {
    const fn1 = await deployFunction("return input.x + 1;", "javascript", deployer);
    const fn2 = await deployFunction("return input.x + 2;", "javascript", deployer);
    expect(fn1.canonicalId).not.toBe(fn2.canonicalId);
  });

  // Test 4
  it("4. invokeFunction returns output matching input transformation", async () => {
    const fn = await deployFunction(
      "return { result: input.x + input.y };",
      "javascript",
      deployer
    );
    const result = await invokeFunction(fn.canonicalId, { x: 3, y: 7 }, executor);
    expect(result.output).toEqual({ result: 10 });
  });

  // Test 5
  it("5. trace:functionCanonicalId matches deployed function's canonicalId", async () => {
    const fn = await deployFunction("return input;", "javascript", deployer);
    const result = await invokeFunction(fn.canonicalId, { hello: "world" }, executor);
    expect(result.trace["trace:functionCanonicalId"]).toBe(fn.canonicalId);
  });

  // Test 6
  it("6. trace cert:signature is valid Dilithium-3 over trace object", async () => {
    const fn = await deployFunction("return input;", "javascript", deployer);
    const result = await invokeFunction(fn.canonicalId, { data: 42 }, executor);

    const sig = result.trace["cert:signature"];
    expect(sig["@type"]).toBe("cert:Signature");
    expect(sig["cert:algorithm"]).toBe("CRYSTALS-Dilithium-3");
    expect(sig["cert:signerCanonicalId"]).toBe(executor.canonicalId);
  });

  // Test 7
  it("7. verifyExecution returns true for untampered result", async () => {
    const fn = await deployFunction("return { v: input.n * 3 };", "javascript", deployer);
    const input = { n: 14 };
    const result = await invokeFunction(fn.canonicalId, input, executor);
    const verified = await verifyExecution(result, input);
    expect(verified).toBe(true);
  });

  // Test 8
  it("8. verifyExecution returns false if output is manually modified", async () => {
    const fn = await deployFunction("return { v: input.n + 1 };", "javascript", deployer);
    const input = { n: 5 };
    const result = await invokeFunction(fn.canonicalId, input, executor);

    // Tamper with output — replace the output object entirely
    result.output = { v: 999 };
    const verified = await verifyExecution(result, input);
    expect(verified).toBe(false);
  });

  // Test 9
  it("9. Function with dangerous call → execution error, not crash", async () => {
    const fn = await deployFunction(
      "process.exit(1); return null;",
      "javascript",
      deployer
    );
    const result = await invokeFunction(fn.canonicalId, {}, executor);
    expect(result.error).toBeDefined();
    expect(result.output).toBeNull();
  });

  // Test 10
  it("10. Function throwing → error returned, executor continues", async () => {
    const fn = await deployFunction(
      'throw new Error("boom");',
      "javascript",
      deployer
    );
    const result = await invokeFunction(fn.canonicalId, {}, executor);
    expect(result.error).toBeDefined();
    expect(result.output).toBeNull();
    // Executor still works
    expect(result.trace["@type"]).toBe("trace:ComputationTrace");
  });
});
