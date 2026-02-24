/**
 * Universal Identity + Pooled Subscription — Tests
 *
 * Verifies one-login SSO and YouTube Premium-style revenue distribution.
 */

import { describe, it, expect } from "vitest";
import { UniversalIdentityManager } from "@/modules/uor-sdk/universal-identity";
import {
  PooledSubscriptionEngine,
} from "@/modules/uor-sdk/pooled-subscription";
import type { UsageRecord } from "@/modules/uor-sdk/universal-identity";
import type { PooledSubscription } from "@/modules/uor-sdk/pooled-subscription";
import { UnsKv } from "@/modules/uns/store/kv";

describe("Universal Identity — One Login, All Apps", () => {
  it("creates an identity with a canonical ID and Dilithium-3 grade", async () => {
    const kv = new UnsKv();
    const mgr = new UniversalIdentityManager(kv);

    const identity = await mgr.createIdentity("pk-fingerprint-abc", "Alice");

    expect(identity["u:canonicalId"]).toMatch(/^urn:uor:derivation:sha256:[0-9a-f]{64}$/);
    expect(identity["cert:algorithm"]).toBe("CRYSTALS-Dilithium-3");
    expect(identity["derivation:epistemicGrade"]).toBe("A");
    expect(identity.displayName).toBe("Alice");
    expect(identity["@context"]).toBe("https://uor.foundation/contexts/uor-v1.jsonld");
    expect(identity["store:uorCid"]).toBeTruthy();
    expect(identity["u:ipv6"]).toBeTruthy();
  });

  it("different fingerprints produce different canonical IDs", async () => {
    const kv = new UnsKv();
    const mgr = new UniversalIdentityManager(kv);

    const id1 = await mgr.createIdentity("pk-fingerprint-xyz");
    const id2 = await mgr.createIdentity("pk-fingerprint-abc");

    expect(id1["u:canonicalId"]).not.toBe(id2["u:canonicalId"]);
  });

  it("persists and retrieves identity from KV", async () => {
    const kv = new UnsKv();
    const mgr = new UniversalIdentityManager(kv);

    const created = await mgr.createIdentity("pk-001", "Bob");
    const retrieved = await mgr.getIdentity(created["u:canonicalId"]);

    expect(retrieved).not.toBeNull();
    expect(retrieved!["u:canonicalId"]).toBe(created["u:canonicalId"]);
    expect(retrieved!.displayName).toBe("Bob");
  });

  it("authenticate creates a universal session valid for all apps", async () => {
    const kv = new UnsKv();
    const mgr = new UniversalIdentityManager(kv);

    const identity = await mgr.createIdentity("pk-002");
    const session = await mgr.authenticate(identity["u:canonicalId"], "app-1");

    expect(session["@type"]).toBe("cert:SessionCertificate");
    expect(session.identityCanonicalId).toBe(identity["u:canonicalId"]);
    expect(session.authorizedApps).toBe("*");
    expect(session.sessionId).toMatch(/^urn:uor:derivation:sha256:/);
  });

  it("reuses existing session on subsequent authenticate calls", async () => {
    const kv = new UnsKv();
    const mgr = new UniversalIdentityManager(kv);

    const identity = await mgr.createIdentity("pk-003");
    const s1 = await mgr.authenticate(identity["u:canonicalId"], "app-1");
    const s2 = await mgr.authenticate(identity["u:canonicalId"], "app-2");

    // Same session reused (not expired)
    expect(s1.sessionId).toBe(s2.sessionId);
  });

  it("verifySession returns true for valid session", async () => {
    const kv = new UnsKv();
    const mgr = new UniversalIdentityManager(kv);

    const identity = await mgr.createIdentity("pk-004");
    const session = await mgr.authenticate(identity["u:canonicalId"], "app-1");

    expect(await mgr.verifySession(session.sessionId)).toBe(true);
  });

  it("logout invalidates a session", async () => {
    const kv = new UnsKv();
    const mgr = new UniversalIdentityManager(kv);

    const identity = await mgr.createIdentity("pk-005");
    const session = await mgr.authenticate(identity["u:canonicalId"], "app-1");

    await mgr.logout(session.sessionId);
    expect(await mgr.verifySession(session.sessionId)).toBe(false);
  });

  it("tracks usage across apps for revenue pooling", async () => {
    const kv = new UnsKv();
    const mgr = new UniversalIdentityManager(kv);

    const identity = await mgr.createIdentity("pk-006");

    await mgr.recordUsage(identity["u:canonicalId"], "app-A", 3600);
    await mgr.recordUsage(identity["u:canonicalId"], "app-B", 1800);
    await mgr.recordUsage(identity["u:canonicalId"], "app-A", 600);

    const usage = await mgr.getUsageForIdentity(identity["u:canonicalId"]);
    expect(usage).toHaveLength(2);

    const appA = usage.find((u) => u.appCanonicalId === "app-A");
    expect(appA!.totalSeconds).toBe(4200);
    expect(appA!.sessionCount).toBe(2);
  });
});

describe("Pooled Subscription — YouTube Premium Revenue Model", () => {
  function makeSub(
    identityCanonicalId: string,
    price = 9.99,
  ): PooledSubscription {
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    return {
      "@type": "monetize:PooledSubscription",
      identityCanonicalId,
      priceMonthly: price,
      currency: "USD",
      startedAt: now.toISOString(),
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: end.toISOString(),
      paymentProof: {
        provider: "stripe",
        receiptId: `sub_${identityCanonicalId}`,
        confirmedAt: now.toISOString(),
      },
      active: true,
      subscriptionCid: "test-cid",
    };
  }

  it("creates a subscription and retrieves it", async () => {
    const kv = new UnsKv();
    const engine = new PooledSubscriptionEngine(kv);

    const sub = await engine.subscribe({
      identityCanonicalId: "user-001",
      priceMonthly: 9.99,
      paymentProof: {
        provider: "stripe",
        receiptId: "sub_test_001",
        confirmedAt: new Date().toISOString(),
      },
    });

    expect(sub.active).toBe(true);
    expect(sub.priceMonthly).toBe(9.99);

    const retrieved = await engine.getSubscription("user-001");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.priceMonthly).toBe(9.99);
  });

  it("cancels a subscription", async () => {
    const kv = new UnsKv();
    const engine = new PooledSubscriptionEngine(kv);

    await engine.subscribe({
      identityCanonicalId: "user-cancel",
      priceMonthly: 9.99,
      paymentProof: {
        provider: "stripe",
        receiptId: "sub_cancel",
        confirmedAt: new Date().toISOString(),
      },
    });

    await engine.cancel("user-cancel");
    const sub = await engine.getSubscription("user-cancel");
    expect(sub!.active).toBe(false);
  });

  it("distributes revenue proportionally by usage (YouTube Premium model)", async () => {
    const kv = new UnsKv();
    const engine = new PooledSubscriptionEngine(kv);

    const subscriptions = [
      makeSub("user-A", 9.99),
      makeSub("user-B", 9.99),
      makeSub("user-C", 9.99),
    ];

    const records: UsageRecord[] = [
      { identityCanonicalId: "user-A", appCanonicalId: "app-X", totalSeconds: 3600, sessionCount: 5, lastActiveAt: "", periodStart: "" },
      { identityCanonicalId: "user-A", appCanonicalId: "app-Y", totalSeconds: 1800, sessionCount: 3, lastActiveAt: "", periodStart: "" },
      { identityCanonicalId: "user-B", appCanonicalId: "app-X", totalSeconds: 1800, sessionCount: 2, lastActiveAt: "", periodStart: "" },
      { identityCanonicalId: "user-B", appCanonicalId: "app-Z", totalSeconds: 1800, sessionCount: 4, lastActiveAt: "", periodStart: "" },
      { identityCanonicalId: "user-C", appCanonicalId: "app-X", totalSeconds: 3600, sessionCount: 10, lastActiveAt: "", periodStart: "" },
    ];

    const period = await engine.closePeriod({ records, subscriptions });

    expect(period.totalRevenue).toBe(29.97);
    expect(period.platformShare).toBe(0);
    expect(period.developerPool).toBe(29.97);

    const appX = period.payouts.find((p) => p.appCanonicalId === "app-X");
    const appY = period.payouts.find((p) => p.appCanonicalId === "app-Y");
    const appZ = period.payouts.find((p) => p.appCanonicalId === "app-Z");

    expect(appX).toBeDefined();
    expect(appY).toBeDefined();
    expect(appZ).toBeDefined();

    expect(appX!.payoutAmount).toBeGreaterThan(appY!.payoutAmount);
    expect(appX!.payoutAmount).toBeGreaterThan(appZ!.payoutAmount);
    expect(appY!.payoutAmount).toBe(appZ!.payoutAmount);

    const totalPayouts = period.payouts.reduce((s, p) => s + p.payoutAmount, 0);
    expect(totalPayouts).toBeCloseTo(period.developerPool, 1);

    expect(appX!.uniqueUsers).toBe(3);
    expect(appZ!.uniqueUsers).toBe(1);
  });

  it("updates developer balance across periods", async () => {
    const kv = new UnsKv();
    const engine = new PooledSubscriptionEngine(kv);

    const subs = [makeSub("user-1", 10)];
    const records: UsageRecord[] = [
      { identityCanonicalId: "user-1", appCanonicalId: "my-app", totalSeconds: 3600, sessionCount: 1, lastActiveAt: "", periodStart: "" },
    ];

    await engine.closePeriod({ records, subscriptions: subs });
    await engine.closePeriod({ records, subscriptions: subs });

    const balance = await engine.getDeveloperBalance("my-app");
    expect(balance.totalPeriods).toBe(2);
    expect(balance.totalEarned).toBe(20);
    expect(balance.averageUsageShare).toBe(1);
  });

  it("period has a content-addressed canonical ID", async () => {
    const kv = new UnsKv();
    const engine = new PooledSubscriptionEngine(kv);

    const subs = [makeSub("user-period", 9.99)];
    const records: UsageRecord[] = [
      { identityCanonicalId: "user-period", appCanonicalId: "app-1", totalSeconds: 100, sessionCount: 1, lastActiveAt: "", periodStart: "" },
    ];

    const period = await engine.closePeriod({ records, subscriptions: subs });

    expect(period.periodId).toMatch(/^urn:uor:derivation:sha256:[0-9a-f]{64}$/);
    expect(period.periodCid).toBeTruthy();
  });
});
