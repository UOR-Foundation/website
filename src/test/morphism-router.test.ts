/**
 * App Composition Layer / Morphism Router (P10) — 10/10 Test Suite
 */

import { describe, it, expect } from "vitest";
import {
  MorphismRouter,
  type MorphismInterface,
  type MorphismCall,
} from "@/modules/uor-sdk/morphism-router";

const APP_A =
  "urn:uor:derivation:sha256:appA000000000000000000000000000000000000000000000000000000000000";
const APP_B =
  "urn:uor:derivation:sha256:appB000000000000000000000000000000000000000000000000000000000000";

const paymentIface: MorphismInterface = {
  appCanonicalId: APP_A,
  endpoint: "payment",
  morphismType: "morphism:Transform",
  requiresCertificate: false,
  description: "Process a payment",
  inputSchema: { amount: "number", currency: "string" },
  outputSchema: { success: "boolean", txId: "string" },
};

const secureIface: MorphismInterface = {
  appCanonicalId: APP_A,
  endpoint: "admin",
  morphismType: "morphism:Action",
  requiresCertificate: true,
  description: "Admin action requiring certificate",
  inputSchema: { action: "string" },
  outputSchema: { result: "string" },
};

const echoIface: MorphismInterface = {
  appCanonicalId: APP_B,
  endpoint: "echo",
  morphismType: "morphism:Isometry",
  requiresCertificate: false,
  description: "Echo back input (structure-preserving)",
  inputSchema: { data: "string", seq: "number" },
  outputSchema: { data: "string", seq: "number" },
};

describe("App Composition Layer / Morphism Router (P10)", () => {
  // Test 1
  it("registerInterface stores interface retrievable by app+endpoint", async () => {
    const router = new MorphismRouter();
    await router.registerInterface(paymentIface);
    const ifaces = await router.listInterfaces(APP_A);
    expect(ifaces.length).toBe(1);
    expect(ifaces[0].endpoint).toBe("payment");
  });

  // Test 2
  it("call returns delivered: true for valid Transform call", async () => {
    const router = new MorphismRouter();
    await router.registerInterface(paymentIface);
    router.registerHandler(APP_A, "payment", (p: unknown) => ({
      success: true,
      txId: "tx-123",
    }));

    const result = await router.call({
      fromAppCanonicalId: APP_B,
      toAppCanonicalId: APP_A,
      endpoint: "payment",
      morphismType: "morphism:Transform",
      payload: { amount: 100, currency: "USD" },
    });
    expect(result.delivered).toBe(true);
    expect(result.output).toEqual({ success: true, txId: "tx-123" });
  });

  // Test 3
  it("call returns delivered: false when certificate required but missing", async () => {
    const router = new MorphismRouter();
    await router.registerInterface(secureIface);

    const result = await router.call({
      fromAppCanonicalId: APP_B,
      toAppCanonicalId: APP_A,
      endpoint: "admin",
      morphismType: "morphism:Action",
      payload: { action: "delete" },
    });
    expect(result.delivered).toBe(false);
    expect(result.reason).toContain("Certificate required");
  });

  // Test 4
  it("call returns injectionDetected: false for normal payload", async () => {
    const router = new MorphismRouter();
    await router.registerInterface(paymentIface);

    const result = await router.call({
      fromAppCanonicalId: APP_B,
      toAppCanonicalId: APP_A,
      endpoint: "payment",
      morphismType: "morphism:Transform",
      payload: { amount: 50, currency: "EUR" },
    });
    expect(result.injectionDetected).toBe(false);
  });

  // Test 5
  it("call returns traceCanonicalId matching canonical pattern", async () => {
    const router = new MorphismRouter();
    await router.registerInterface(paymentIface);

    const result = await router.call({
      fromAppCanonicalId: APP_B,
      toAppCanonicalId: APP_A,
      endpoint: "payment",
      morphismType: "morphism:Transform",
      payload: { amount: 10 },
    });
    expect(result.traceCanonicalId).toMatch(
      /^urn:uor:derivation:sha256:[0-9a-f]{64}$/,
    );
  });

  // Test 6
  it("Isometry call rejected when schema structure mismatches", async () => {
    const router = new MorphismRouter();
    // Register an isometry with mismatched schemas
    const badIso: MorphismInterface = {
      appCanonicalId: APP_A,
      endpoint: "bad-iso",
      morphismType: "morphism:Isometry",
      requiresCertificate: false,
      description: "Bad isometry",
      inputSchema: { x: "number" },
      outputSchema: { y: "number", z: "string" }, // different structure
    };
    await router.registerInterface(badIso);

    const result = await router.call({
      fromAppCanonicalId: APP_B,
      toAppCanonicalId: APP_A,
      endpoint: "bad-iso",
      morphismType: "morphism:Isometry",
      payload: { x: 42 },
    });
    expect(result.delivered).toBe(false);
    expect(result.reason).toContain("Isometry violation");
  });

  // Test 7
  it("listInterfaces returns all registered public interfaces", async () => {
    const router = new MorphismRouter();
    await router.registerInterface(paymentIface);
    await router.registerInterface(secureIface);
    await router.registerInterface(echoIface);

    const all = await router.listInterfaces();
    expect(all.length).toBe(3);
  });

  // Test 8
  it("listInterfaces(appId) filters to specific app", async () => {
    const router = new MorphismRouter();
    await router.registerInterface(paymentIface);
    await router.registerInterface(secureIface);
    await router.registerInterface(echoIface);

    const appA = await router.listInterfaces(APP_A);
    expect(appA.length).toBe(2);
    expect(appA.every((i) => i.appCanonicalId === APP_A)).toBe(true);
  });

  // Test 9
  it("getCallHistory returns calls in reverse-chronological order", async () => {
    const router = new MorphismRouter();
    await router.registerInterface(paymentIface);

    await router.call({
      fromAppCanonicalId: APP_B,
      toAppCanonicalId: APP_A,
      endpoint: "payment",
      morphismType: "morphism:Transform",
      payload: { first: true },
    });

    await router.call({
      fromAppCanonicalId: APP_B,
      toAppCanonicalId: APP_A,
      endpoint: "payment",
      morphismType: "morphism:Transform",
      payload: { second: true },
    });

    const history = await router.getCallHistory(APP_B);
    expect(history.length).toBe(2);
    // Most recent first
    expect((history[0].payload as Record<string, boolean>).second).toBe(true);
  });

  // Test 10
  it("two apps can call each other bidirectionally", async () => {
    const router = new MorphismRouter();
    await router.registerInterface(paymentIface); // APP_A
    await router.registerInterface(echoIface); // APP_B

    // APP_B → APP_A
    const r1 = await router.call({
      fromAppCanonicalId: APP_B,
      toAppCanonicalId: APP_A,
      endpoint: "payment",
      morphismType: "morphism:Transform",
      payload: { amount: 100 },
    });
    expect(r1.delivered).toBe(true);

    // APP_A → APP_B
    const r2 = await router.call({
      fromAppCanonicalId: APP_A,
      toAppCanonicalId: APP_B,
      endpoint: "echo",
      morphismType: "morphism:Isometry",
      payload: { data: "hello", seq: 1 },
    });
    expect(r2.delivered).toBe(true);
  });
});
