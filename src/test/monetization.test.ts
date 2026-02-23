import { describe, it, expect, beforeEach } from "vitest";
import { MonetizationEngine, createPaymentGateMiddleware } from "@/modules/uor-sdk/monetization";
import { UnsKv } from "@/modules/uns/store/kv";
import type { MonetizationConfig, PaymentProof } from "@/modules/uor-sdk/monetization-types";

// ── Fixtures ────────────────────────────────────────────────────────────────

const APP_ID = "urn:uor:derivation:sha256:a3f8c2d1e4b5f6901a2b3c4d5e6f7890a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";
const USER_ID = "urn:uor:derivation:sha256:1111111111111111111111111111111111111111111111111111111111111111";

const PAYMENT_PROOF: PaymentProof = {
  provider: "stripe",
  receiptId: "pi_test_abc123",
  confirmedAt: new Date().toISOString(),
};

const CONFIG: MonetizationConfig = {
  appCanonicalId: APP_ID,
  model: "subscription",
  price: 15,
  currency: "USD",
  interval: "monthly",
  gate: "premium",
  trialDays: 0,
};

// ═══════════════════════════════════════════════════════════════════════════
// P7 Tests — 10/10
// ═══════════════════════════════════════════════════════════════════════════

describe("Monetization — P7", () => {
  let kv: UnsKv;
  let engine: MonetizationEngine;

  beforeEach(() => {
    kv = new UnsKv();
    engine = new MonetizationEngine(kv);
  });

  // Test 1
  it("1. configureMonetization() returns configCanonicalId matching canonical ID pattern", async () => {
    const { configCanonicalId } = await engine.configureMonetization(CONFIG);
    expect(configCanonicalId).toMatch(/^urn:uor:derivation:sha256:[a-f0-9]{64}$/);
  });

  // Test 2
  it("2. processPayment() returns PaymentRecord with correct developerNet (100%)", async () => {
    await engine.configureMonetization(CONFIG);
    const record = await engine.processPayment(APP_ID, USER_ID, 100, PAYMENT_PROOF);
    expect(record.developerNet).toBe(100);
  });

  // Test 3
  it("3. processPayment() returns PaymentRecord with correct platformFee (0%)", async () => {
    await engine.configureMonetization(CONFIG);
    const record = await engine.processPayment(APP_ID, USER_ID, 100, PAYMENT_PROOF);
    expect(record.platformFee).toBe(0);
  });

  // Test 4
  it("4. processPayment() issues accessCertificate with cert:grantedActions including configured gate", async () => {
    await engine.configureMonetization(CONFIG);
    const record = await engine.processPayment(APP_ID, USER_ID, 15, PAYMENT_PROOF);
    expect(record.accessCertificate["cert:grantedActions"]).toContain("premium");
    expect(record.accessCertificate["@type"]).toBe("cert:TransformCertificate");
    expect(record.accessCertificate["cert:cid"]).toBeTruthy();
  });

  // Test 5
  it("5. checkAccess() returns allowed: true for user with valid payment certificate", async () => {
    await engine.configureMonetization(CONFIG);
    await engine.processPayment(APP_ID, USER_ID, 15, PAYMENT_PROOF);
    const result = await engine.checkAccess(USER_ID, APP_ID, "premium");
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("valid_certificate");
  });

  // Test 6
  it("6. checkAccess() returns allowed: false for user with no certificate", async () => {
    const result = await engine.checkAccess(USER_ID, APP_ID, "premium");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("no_certificate");
  });

  // Test 7
  it("7. checkAccess() returns allowed: false for revoked certificate", async () => {
    await engine.configureMonetization(CONFIG);
    await engine.processPayment(APP_ID, USER_ID, 15, PAYMENT_PROOF);
    await engine.revokeAccess(USER_ID, APP_ID);
    const result = await engine.checkAccess(USER_ID, APP_ID, "premium");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("certificate_revoked");
  });

  // Test 8
  it("8. getDeveloperBalance() correctly accumulates net from multiple payments", async () => {
    await engine.configureMonetization(CONFIG);
    await engine.processPayment(APP_ID, USER_ID, 10, PAYMENT_PROOF);
    await engine.processPayment(APP_ID, USER_ID, 20, PAYMENT_PROOF);
    await engine.processPayment(APP_ID, USER_ID, 30, PAYMENT_PROOF);

    const balance = await engine.getDeveloperBalance(APP_ID);
    expect(balance.gross).toBe(60);
    expect(balance.platformFees).toBe(0);
    expect(balance.net).toBe(60);
    expect(balance.paymentCount).toBe(3);
  });

  // Test 9
  it("9. paymentGateMiddleware returns 402 when no valid certificate", async () => {
    const middleware = createPaymentGateMiddleware(engine, APP_ID, "premium");
    const result = await middleware({
      headers: { get: (n: string) => (n === "X-UOR-User-Canonical-ID" ? USER_ID : null) },
    });
    expect(result.status).toBe(402);
  });

  // Test 10
  it("10. paymentGateMiddleware passes when valid certificate present", async () => {
    await engine.configureMonetization(CONFIG);
    await engine.processPayment(APP_ID, USER_ID, 15, PAYMENT_PROOF);

    const middleware = createPaymentGateMiddleware(engine, APP_ID, "premium");
    const result = await middleware({
      headers: { get: (n: string) => (n === "X-UOR-User-Canonical-ID" ? USER_ID : null) },
    });
    expect(result.status).toBe(200);
  });
});
