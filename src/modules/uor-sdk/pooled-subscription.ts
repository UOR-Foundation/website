/**
 * UOR SDK — Pooled Subscription (YouTube Premium Model)
 *
 * One subscription. All apps. Revenue divided by usage.
 *
 * How it works:
 *   1. User pays one monthly subscription (e.g., $9.99/month)
 *   2. Platform tracks usage across all apps (via UniversalIdentityManager)
 *   3. At billing cycle end, revenue is pooled and distributed:
 *      - Platform takes 0% (default, configurable)
 *      - 100% of revenue minus fees is divided proportionally by usage time
 *      - Developer of app used 60% of the time → gets 60% of the pool
 *
 * This makes monetization invisible to vibe coders:
 *   - No Stripe setup per app
 *   - No pricing decisions per feature
 *   - No checkout flow implementation
 *   - Just deploy → users subscribe → money flows
 *
 * Storage (UNS KV):
 *   pool-sub:{identityCanonicalId}          → PooledSubscription
 *   pool-period:{periodId}                  → BillingPeriod
 *   pool-payout:{periodId}:{appId}          → AppPayout
 *   pool-balance:{appCanonicalId}           → PooledDeveloperBalance
 *
 * @see monetization: namespace — per-app payment gates
 * @see universal-identity: namespace — usage tracking
 */

import { singleProofHash } from "@/lib/uor-canonical";
import { UnsKv } from "@/modules/uns/store/kv";
import type { UsageRecord } from "./universal-identity";
import { DEFAULT_REVENUE_SPLIT } from "./monetization-types";
import type { RevenueSplit, Currency, PaymentProof } from "./monetization-types";

// ── Types ───────────────────────────────────────────────────────────────────

/** A user's pooled subscription. */
export interface PooledSubscription {
  "@type": "monetize:PooledSubscription";
  /** The subscriber's universal identity. */
  identityCanonicalId: string;
  /** Monthly price. */
  priceMonthly: number;
  currency: Currency;
  /** When this subscription started. */
  startedAt: string;
  /** Current billing period start. */
  currentPeriodStart: string;
  /** Current billing period end. */
  currentPeriodEnd: string;
  /** Payment proof from the subscription provider. */
  paymentProof: PaymentProof;
  /** Whether the subscription is active. */
  active: boolean;
  /** Content hash for tamper detection. */
  subscriptionCid: string;
}

/** A completed billing period with usage data and payouts. */
export interface BillingPeriod {
  "@type": "monetize:BillingPeriod";
  periodId: string;
  periodStart: string;
  periodEnd: string;
  /** Total revenue collected in this period. */
  totalRevenue: number;
  /** Platform's share. */
  platformShare: number;
  /** Pool available for distribution. */
  developerPool: number;
  currency: Currency;
  /** Number of active subscribers. */
  subscriberCount: number;
  /** Per-app payout breakdown. */
  payouts: AppPayout[];
  /** Canonical ID of this period record. */
  periodCid: string;
}

/** A single app's payout from the pool. */
export interface AppPayout {
  appCanonicalId: string;
  /** Weighted usage share (0.0–1.0). */
  usageShare: number;
  /** Total usage seconds across all subscribers. */
  totalUsageSeconds: number;
  /** Payout amount in currency. */
  payoutAmount: number;
  /** Number of unique users who used this app. */
  uniqueUsers: number;
}

/** Accumulated balance for a developer across all billing periods. */
export interface PooledDeveloperBalance {
  appCanonicalId: string;
  totalEarned: number;
  totalPeriods: number;
  averageUsageShare: number;
  currency: Currency;
  lastPayoutAt?: string;
}

/** Input for subscribing a user. */
export interface SubscribeInput {
  identityCanonicalId: string;
  priceMonthly: number;
  currency?: Currency;
  paymentProof: PaymentProof;
}

/** Usage data from all subscribers for a billing period. */
export interface PeriodUsageData {
  /** Usage records from all subscribers. */
  records: UsageRecord[];
  /** All active subscriptions in this period. */
  subscriptions: PooledSubscription[];
}

// ── Constants ───────────────────────────────────────────────────────────────

const enc = new TextEncoder();
const dec = new TextDecoder();

function toBytes(obj: unknown): Uint8Array {
  return enc.encode(JSON.stringify(obj));
}

function fromBytes<T>(bytes: Uint8Array): T {
  return JSON.parse(dec.decode(bytes)) as T;
}

// ── Pooled Subscription Engine ──────────────────────────────────────────────

/**
 * YouTube Premium-style revenue pooling engine.
 *
 * Users pay one subscription. Revenue is divided by actual app usage.
 * Vibe coders deploy and earn — zero payment configuration required.
 */
export class PooledSubscriptionEngine {
  constructor(
    private readonly kv: UnsKv,
    private readonly split: RevenueSplit = DEFAULT_REVENUE_SPLIT,
  ) {}

  // ── Subscription Management ───────────────────────────────────────────

  /**
   * Subscribe a user to the pooled plan.
   * One subscription covers all apps on the platform.
   */
  async subscribe(input: SubscribeInput): Promise<PooledSubscription> {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subPayload = {
      "@type": "monetize:PooledSubscription",
      identityCanonicalId: input.identityCanonicalId,
      priceMonthly: input.priceMonthly,
      startedAt: now.toISOString(),
    };

    const proof = await singleProofHash(subPayload);

    const subscription: PooledSubscription = {
      "@type": "monetize:PooledSubscription",
      identityCanonicalId: input.identityCanonicalId,
      priceMonthly: input.priceMonthly,
      currency: input.currency ?? "USD",
      startedAt: now.toISOString(),
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      paymentProof: input.paymentProof,
      active: true,
      subscriptionCid: proof.cid,
    };

    await this.kv.put(
      `pool-sub:${input.identityCanonicalId}`,
      toBytes(subscription),
    );

    return subscription;
  }

  /** Get a user's subscription. */
  async getSubscription(
    identityCanonicalId: string,
  ): Promise<PooledSubscription | null> {
    const entry = await this.kv.get(`pool-sub:${identityCanonicalId}`);
    if (!entry) return null;
    return fromBytes<PooledSubscription>(entry.value);
  }

  /** Cancel a subscription. */
  async cancel(identityCanonicalId: string): Promise<void> {
    const sub = await this.getSubscription(identityCanonicalId);
    if (!sub) return;
    sub.active = false;
    await this.kv.put(`pool-sub:${identityCanonicalId}`, toBytes(sub));
  }

  // ── Revenue Distribution ──────────────────────────────────────────────

  /**
   * Close a billing period and distribute revenue.
   *
   * This is the YouTube Premium moment:
   *   1. Sum all subscription payments in this period
   *   2. Platform takes its share (default 0%)
   *   3. Remaining pool is divided by weighted usage
   *   4. Each app creator receives their proportional share
   *
   * Usage is measured in seconds of active time per app per user.
   * More time in your app = more revenue for you.
   */
  async closePeriod(data: PeriodUsageData): Promise<BillingPeriod> {
    const now = new Date();

    // 1. Calculate total revenue from active subscriptions
    const activeSubscriptions = data.subscriptions.filter((s) => s.active);
    const totalRevenue = activeSubscriptions.reduce(
      (sum, s) => sum + s.priceMonthly,
      0,
    );

    // 2. Platform share
    const platformShare = roundCents(totalRevenue * this.split.platformShare);
    const developerPool = roundCents(totalRevenue * this.split.developerShare);

    // 3. Aggregate usage per app across all subscribers
    const appUsage = new Map<
      string,
      { totalSeconds: number; uniqueUsers: Set<string> }
    >();

    for (const record of data.records) {
      const existing = appUsage.get(record.appCanonicalId) ?? {
        totalSeconds: 0,
        uniqueUsers: new Set<string>(),
      };
      existing.totalSeconds += record.totalSeconds;
      existing.uniqueUsers.add(record.identityCanonicalId);
      appUsage.set(record.appCanonicalId, existing);
    }

    // 4. Calculate total usage across all apps
    let totalUsageSeconds = 0;
    for (const usage of appUsage.values()) {
      totalUsageSeconds += usage.totalSeconds;
    }

    // 5. Distribute proportionally
    const payouts: AppPayout[] = [];

    for (const [appId, usage] of appUsage) {
      const usageShare =
        totalUsageSeconds > 0 ? usage.totalSeconds / totalUsageSeconds : 0;
      const payoutAmount = roundCents(developerPool * usageShare);

      payouts.push({
        appCanonicalId: appId,
        usageShare,
        totalUsageSeconds: usage.totalSeconds,
        payoutAmount,
        uniqueUsers: usage.uniqueUsers.size,
      });

      // Update developer balance
      await this.updateDeveloperBalance(appId, payoutAmount, usageShare);
    }

    // 6. Create period record
    const periodPayload = {
      "@type": "monetize:BillingPeriod",
      totalRevenue,
      platformShare,
      developerPool,
      subscriberCount: activeSubscriptions.length,
      closedAt: now.toISOString(),
    };

    const proof = await singleProofHash(periodPayload);

    const period: BillingPeriod = {
      "@type": "monetize:BillingPeriod",
      periodId: proof.derivationId,
      periodStart: activeSubscriptions[0]?.currentPeriodStart ?? now.toISOString(),
      periodEnd: now.toISOString(),
      totalRevenue,
      platformShare,
      developerPool,
      currency: activeSubscriptions[0]?.currency ?? "USD",
      subscriberCount: activeSubscriptions.length,
      payouts,
      periodCid: proof.cid,
    };

    await this.kv.put(`pool-period:${period.periodId}`, toBytes(period));

    // Store individual payouts
    for (const payout of payouts) {
      await this.kv.put(
        `pool-payout:${period.periodId}:${payout.appCanonicalId}`,
        toBytes(payout),
      );
    }

    return period;
  }

  /** Get a developer's accumulated pooled balance. */
  async getDeveloperBalance(
    appCanonicalId: string,
  ): Promise<PooledDeveloperBalance> {
    const entry = await this.kv.get(`pool-balance:${appCanonicalId}`);
    if (!entry) {
      return {
        appCanonicalId,
        totalEarned: 0,
        totalPeriods: 0,
        averageUsageShare: 0,
        currency: "USD",
      };
    }
    return fromBytes<PooledDeveloperBalance>(entry.value);
  }

  // ── Private ───────────────────────────────────────────────────────────

  private async updateDeveloperBalance(
    appCanonicalId: string,
    payoutAmount: number,
    usageShare: number,
  ): Promise<void> {
    const current = await this.getDeveloperBalance(appCanonicalId);

    const totalPeriods = current.totalPeriods + 1;
    const updated: PooledDeveloperBalance = {
      appCanonicalId,
      totalEarned: roundCents(current.totalEarned + payoutAmount),
      totalPeriods,
      averageUsageShare:
        (current.averageUsageShare * current.totalPeriods + usageShare) /
        totalPeriods,
      currency: current.currency,
      lastPayoutAt: new Date().toISOString(),
    };

    await this.kv.put(`pool-balance:${appCanonicalId}`, toBytes(updated));
  }
}

// ── Utility ─────────────────────────────────────────────────────────────────

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}
