/**
 * UOR SDK — Free Tier & Revenue Share Infrastructure (P14)
 *
 * Structurally sustainable tier system. Idle apps cost near-zero because
 * IPFS content addressing, Solid Pods activating only on access, and
 * Observer registration are all stateless or content-addressed.
 *
 * Tier economics:
 *   free          → 20% platform fee, 5GB storage, 10k req/mo, 100 users
 *   revenue-share → 15% platform fee, unlimited, qualifies at $10/mo gross
 *   enterprise    → 10% platform fee, unlimited, qualifies at $1000/mo gross
 *
 * Storage: UNS KV (same as monetization layer).
 *   account:{developerCanonicalId}       → DeveloperAccount
 *   app-activity:{appCanonicalId}        → AppActivityRecord
 *
 * @see monetization.ts — payment processing (P7)
 * @see discovery.ts    — observer zones affect idle demotion (P9)
 */

import { UnsKv } from "@/modules/uns/store/kv";

// ── Tier Definitions ────────────────────────────────────────────────────────

export type TierName = "free" | "revenue-share" | "enterprise";

export interface TierConfig {
  name: TierName;
  maxApps: number | null;
  maxStorageBytes: number | null;
  maxRequestsPerMonth: number | null;
  maxCertifiedUsers: number | null;
  platformFeePercent: number;
  qualifiesAt?: number;
}

export const TIERS: Record<TierName, TierConfig> = {
  free: {
    name: "free",
    maxApps: null,
    maxStorageBytes: 5 * 1024 * 1024 * 1024, // 5 GB
    maxRequestsPerMonth: 10_000,
    maxCertifiedUsers: 100,
    platformFeePercent: 20,
  },
  "revenue-share": {
    name: "revenue-share",
    maxApps: null,
    maxStorageBytes: null,
    maxRequestsPerMonth: null,
    maxCertifiedUsers: null,
    platformFeePercent: 15,
    qualifiesAt: 10,
  },
  enterprise: {
    name: "enterprise",
    maxApps: null,
    maxStorageBytes: null,
    maxRequestsPerMonth: null,
    maxCertifiedUsers: null,
    platformFeePercent: 10,
    qualifiesAt: 1000,
  },
};

// ── Developer Account ───────────────────────────────────────────────────────

export interface DeveloperAccount {
  developerCanonicalId: string;
  tier: TierName;
  currentMonthGross: number;
  currentMonthNet: number;
  platformFeesThisMonth: number;
  apiCostsThisMonth: number;
  totalPaidOut: number;
  requestsThisMonth: number;
  storageUsedBytes: number;
  certifiedUsersCount: number;
  /** Canonical IDs of apps owned by this developer. */
  appCanonicalIds: string[];
  /** Last activity timestamps per app. */
  appLastActivity: Record<string, string>;
}

// ── App Activity Record ─────────────────────────────────────────────────────

interface AppActivityRecord {
  appCanonicalId: string;
  lastRequestAt: string;
  requestsThisMonth: number;
}

// ── Limit Check Result ──────────────────────────────────────────────────────

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  upgradeHint?: string;
}

// ── Payout Result ───────────────────────────────────────────────────────────

export interface PayoutResult {
  gross: number;
  platformFee: number;
  apiCosts: number;
  netPayout: number;
}

// ── Serialization helpers ───────────────────────────────────────────────────

const enc = new TextEncoder();
const dec = new TextDecoder();
function toBytes(obj: unknown): Uint8Array {
  return enc.encode(JSON.stringify(obj));
}
function fromBytes<T>(bytes: Uint8Array): T {
  return JSON.parse(dec.decode(bytes)) as T;
}

// ── FreeTierManager ─────────────────────────────────────────────────────────

export class FreeTierManager {
  constructor(private readonly kv: UnsKv) {}

  // ── Limit Checking ──────────────────────────────────────────────────────

  /**
   * Check if a developer action is within their current tier limits.
   * Actions: 'request' (HTTP call), 'storage' (byte write), 'user' (new certified user).
   */
  async checkLimits(
    developerCanonicalId: string,
    action: "request" | "storage" | "user",
  ): Promise<LimitCheckResult> {
    const account = await this.getAccount(developerCanonicalId);
    const tier = TIERS[account.tier];

    switch (action) {
      case "request": {
        if (
          tier.maxRequestsPerMonth !== null &&
          account.requestsThisMonth >= tier.maxRequestsPerMonth
        ) {
          return {
            allowed: false,
            reason: `Monthly request limit reached (${tier.maxRequestsPerMonth})`,
            upgradeHint:
              "Earn $10+/month in app revenue to unlock unlimited requests.",
          };
        }
        return { allowed: true };
      }
      case "storage": {
        if (
          tier.maxStorageBytes !== null &&
          account.storageUsedBytes >= tier.maxStorageBytes
        ) {
          return {
            allowed: false,
            reason: `Storage limit reached (${formatBytes(tier.maxStorageBytes)})`,
            upgradeHint:
              "Earn $10+/month in app revenue to unlock unlimited storage.",
          };
        }
        return { allowed: true };
      }
      case "user": {
        if (
          tier.maxCertifiedUsers !== null &&
          account.certifiedUsersCount >= tier.maxCertifiedUsers
        ) {
          return {
            allowed: false,
            reason: `Certified user limit reached (${tier.maxCertifiedUsers})`,
            upgradeHint:
              "Earn $10+/month in app revenue to unlock unlimited users.",
          };
        }
        return { allowed: true };
      }
      default:
        return { allowed: true };
    }
  }

  // ── API Cost Accounting ─────────────────────────────────────────────────

  /**
   * Record an API cost (LLM inference, image gen, etc.) against a developer.
   * Costs are deducted from the developer's net payout at month-end.
   */
  async recordApiCost(
    developerCanonicalId: string,
    costUsd: number,
    _service: string,
  ): Promise<void> {
    const account = await this.getAccount(developerCanonicalId);
    account.apiCostsThisMonth = roundCents(account.apiCostsThisMonth + costUsd);
    await this.saveAccount(account);
  }

  // ── Account Retrieval ───────────────────────────────────────────────────

  /**
   * Get a developer account with current usage. Creates a default free-tier
   * account if none exists.
   */
  async getAccount(developerCanonicalId: string): Promise<DeveloperAccount> {
    const key = `account:${developerCanonicalId}`;
    const entry = await this.kv.get(key);
    if (!entry) {
      return this.defaultAccount(developerCanonicalId);
    }
    return fromBytes<DeveloperAccount>(entry.value);
  }

  // ── Tier Auto-Upgrade ───────────────────────────────────────────────────

  /**
   * Check if a developer's current month gross qualifies them for a higher tier.
   * Upgrades are automatic — no manual action required.
   */
  async checkTierUpgrade(developerCanonicalId: string): Promise<TierName> {
    const account = await this.getAccount(developerCanonicalId);
    const gross = account.currentMonthGross;

    let newTier: TierName = "free";
    if (gross >= (TIERS.enterprise.qualifiesAt ?? Infinity)) {
      newTier = "enterprise";
    } else if (gross >= (TIERS["revenue-share"].qualifiesAt ?? Infinity)) {
      newTier = "revenue-share";
    }

    if (newTier !== account.tier) {
      account.tier = newTier;
      await this.saveAccount(account);
    }

    return newTier;
  }

  // ── Payout Computation ──────────────────────────────────────────────────

  /**
   * Compute month-end payout for a developer.
   * netPayout = gross × (1 − platformFeePercent/100) − apiCosts
   */
  async computePayout(developerCanonicalId: string): Promise<PayoutResult> {
    const account = await this.getAccount(developerCanonicalId);
    const tier = TIERS[account.tier];

    const gross = account.currentMonthGross;
    const platformFee = roundCents(gross * (tier.platformFeePercent / 100));
    const apiCosts = account.apiCostsThisMonth;
    const netPayout = roundCents(gross - platformFee - apiCosts);

    return { gross, platformFee, apiCosts, netPayout };
  }

  // ── Idle App Detection ──────────────────────────────────────────────────

  /**
   * Detect apps with 0 requests in the last 30 days.
   * Idle apps remain live but get lower discovery priority.
   */
  async detectIdleApps(developerCanonicalId: string): Promise<string[]> {
    const account = await this.getAccount(developerCanonicalId);
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const idleApps: string[] = [];
    for (const appId of account.appCanonicalIds) {
      const lastActivity = account.appLastActivity[appId];
      if (!lastActivity || lastActivity < thirtyDaysAgo) {
        idleApps.push(appId);
      }
    }

    return idleApps;
  }

  // ── Usage Recording (used internally by SDK & middleware) ────────────────

  /**
   * Increment request count and update app last activity.
   */
  async recordRequest(
    developerCanonicalId: string,
    appCanonicalId: string,
  ): Promise<void> {
    const account = await this.getAccount(developerCanonicalId);
    account.requestsThisMonth += 1;
    if (!account.appCanonicalIds.includes(appCanonicalId)) {
      account.appCanonicalIds.push(appCanonicalId);
    }
    account.appLastActivity[appCanonicalId] = new Date().toISOString();
    await this.saveAccount(account);
  }

  /**
   * Record revenue from a payment for tier upgrade consideration.
   */
  async recordRevenue(
    developerCanonicalId: string,
    grossAmount: number,
  ): Promise<void> {
    const account = await this.getAccount(developerCanonicalId);
    const tier = TIERS[account.tier];
    account.currentMonthGross = roundCents(
      account.currentMonthGross + grossAmount,
    );
    const fee = roundCents(grossAmount * (tier.platformFeePercent / 100));
    account.platformFeesThisMonth = roundCents(
      account.platformFeesThisMonth + fee,
    );
    account.currentMonthNet = roundCents(
      account.currentMonthNet + grossAmount - fee,
    );
    await this.saveAccount(account);
    // Auto-upgrade tier after revenue event
    await this.checkTierUpgrade(developerCanonicalId);
  }

  /**
   * Add a certified user to account usage.
   */
  async recordCertifiedUser(developerCanonicalId: string): Promise<void> {
    const account = await this.getAccount(developerCanonicalId);
    account.certifiedUsersCount += 1;
    await this.saveAccount(account);
  }

  /**
   * Add storage usage to account.
   */
  async recordStorageUsage(
    developerCanonicalId: string,
    bytes: number,
  ): Promise<void> {
    const account = await this.getAccount(developerCanonicalId);
    account.storageUsedBytes += bytes;
    await this.saveAccount(account);
  }

  // ── Private Helpers ─────────────────────────────────────────────────────

  private async saveAccount(account: DeveloperAccount): Promise<void> {
    await this.kv.put(
      `account:${account.developerCanonicalId}`,
      toBytes(account),
    );
  }

  private defaultAccount(developerCanonicalId: string): DeveloperAccount {
    return {
      developerCanonicalId,
      tier: "free",
      currentMonthGross: 0,
      currentMonthNet: 0,
      platformFeesThisMonth: 0,
      apiCostsThisMonth: 0,
      totalPaidOut: 0,
      requestsThisMonth: 0,
      storageUsedBytes: 0,
      certifiedUsersCount: 0,
      appCanonicalIds: [],
      appLastActivity: {},
    };
  }
}

// ── Utilities ───────────────────────────────────────────────────────────────

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
