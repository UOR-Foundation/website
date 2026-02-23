/**
 * Free Tier & Revenue Share Infrastructure — 10/10 Test Suite (P14)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { FreeTierManager, TIERS } from "@/modules/uor-sdk/free-tier";
import { UnsKv } from "@/modules/uns/store/kv";

describe("Free Tier Manager (P14)", () => {
  let kv: UnsKv;
  let mgr: FreeTierManager;
  const devId = "urn:uor:derivation:sha256:dev001";

  beforeEach(() => {
    kv = new UnsKv();
    mgr = new FreeTierManager(kv);
  });

  // Test 1: checkLimits returns allowed: true within free tier limits
  it("checkLimits returns allowed: true within free tier limits", async () => {
    const result = await mgr.checkLimits(devId, "request");
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  // Test 2: checkLimits returns allowed: false with upgradeHint when over limit
  it("checkLimits returns allowed: false with upgradeHint when over limit", async () => {
    // Exhaust request limit by recording 10,000 requests
    for (let i = 0; i < 10_000; i++) {
      await mgr.recordRequest(devId, "app1");
    }
    const result = await mgr.checkLimits(devId, "request");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("10000");
    expect(result.upgradeHint).toBeDefined();
    expect(result.upgradeHint).toContain("$10");
  });

  // Test 3: recordApiCost correctly accumulates cost
  it("recordApiCost correctly accumulates cost in developer account", async () => {
    await mgr.recordApiCost(devId, 1.50, "llm-inference");
    await mgr.recordApiCost(devId, 0.75, "image-gen");
    const account = await mgr.getAccount(devId);
    expect(account.apiCostsThisMonth).toBe(2.25);
  });

  // Test 4: getAccount returns DeveloperAccount with all numeric fields
  it("getAccount returns DeveloperAccount with all numeric fields", async () => {
    const account = await mgr.getAccount(devId);
    expect(typeof account.currentMonthGross).toBe("number");
    expect(typeof account.currentMonthNet).toBe("number");
    expect(typeof account.platformFeesThisMonth).toBe("number");
    expect(typeof account.apiCostsThisMonth).toBe("number");
    expect(typeof account.totalPaidOut).toBe("number");
    expect(typeof account.requestsThisMonth).toBe("number");
    expect(typeof account.storageUsedBytes).toBe("number");
    expect(typeof account.certifiedUsersCount).toBe("number");
    expect(account.tier).toBe("free");
  });

  // Test 5: checkTierUpgrade returns 'revenue-share' when gross >= $10
  it("checkTierUpgrade returns 'revenue-share' when gross >= $10", async () => {
    await mgr.recordRevenue(devId, 15);
    const tier = await mgr.checkTierUpgrade(devId);
    expect(tier).toBe("revenue-share");
  });

  // Test 6: checkTierUpgrade returns 'enterprise' when gross >= $1000
  it("checkTierUpgrade returns 'enterprise' when gross >= $1000", async () => {
    await mgr.recordRevenue(devId, 1200);
    const tier = await mgr.checkTierUpgrade(devId);
    expect(tier).toBe("enterprise");
  });

  // Test 7: computePayout correctly applies 20% fee at free tier
  it("computePayout correctly applies 20% fee at free tier (gross $100 → net $80)", async () => {
    await mgr.recordRevenue(devId, 5); // keep under $10 to stay free
    // Reset to exactly $100 gross for clean math
    const account = await mgr.getAccount(devId);
    account.currentMonthGross = 100;
    account.tier = "free";
    account.apiCostsThisMonth = 0;
    await (mgr as any).saveAccount(account);

    const payout = await mgr.computePayout(devId);
    expect(payout.gross).toBe(100);
    expect(payout.platformFee).toBe(20);
    expect(payout.netPayout).toBe(80);
  });

  // Test 8: computePayout correctly applies 15% fee at revenue-share tier
  it("computePayout correctly applies 15% fee at revenue-share tier", async () => {
    await mgr.recordRevenue(devId, 50); // auto-upgrades to revenue-share
    const account = await mgr.getAccount(devId);
    account.currentMonthGross = 100;
    account.apiCostsThisMonth = 0;
    await (mgr as any).saveAccount(account);

    const payout = await mgr.computePayout(devId);
    expect(payout.platformFee).toBe(15);
    expect(payout.netPayout).toBe(85);
  });

  // Test 9: computePayout subtracts apiCosts from developer net
  it("computePayout subtracts apiCosts from developer net", async () => {
    const account = await mgr.getAccount(devId);
    account.currentMonthGross = 100;
    account.tier = "free";
    account.apiCostsThisMonth = 5;
    await (mgr as any).saveAccount(account);

    const payout = await mgr.computePayout(devId);
    expect(payout.gross).toBe(100);
    expect(payout.platformFee).toBe(20);
    expect(payout.apiCosts).toBe(5);
    expect(payout.netPayout).toBe(75); // 100 - 20 - 5
  });

  // Test 10: detectIdleApps returns apps with no requests in last 30 days
  it("detectIdleApps returns apps with no requests in last 30 days", async () => {
    // Register apps with old activity
    const account = await mgr.getAccount(devId);
    account.appCanonicalIds = ["app-active", "app-idle"];
    account.appLastActivity = {
      "app-active": new Date().toISOString(),
      "app-idle": new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
    };
    await (mgr as any).saveAccount(account);

    const idle = await mgr.detectIdleApps(devId);
    expect(idle).toContain("app-idle");
    expect(idle).not.toContain("app-active");
  });
});
