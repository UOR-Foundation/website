/**
 * UOR SDK — Monetization Types
 *
 * Payment-provider agnostic type definitions for the monetization layer.
 * Designed so that fiat (Stripe), crypto, x402, or any future payment
 * provider can plug in without changing the core certificate-gated logic.
 *
 * @see cert: namespace — access certificates
 * @see morphism: namespace — gated endpoints
 * @see state: namespace — revenue accounting
 */

// ── Payment Models ──────────────────────────────────────────────────────────

/** Supported billing models. Extensible for future types (e.g. 'metered'). */
export type BillingModel = "subscription" | "one-time" | "usage";

/** Subscription intervals. */
export type BillingInterval = "monthly" | "annual";

/** Currency codes. Fiat and crypto are treated uniformly. */
export type Currency = "USD" | "EUR" | "GBP" | "BTC" | "ETH" | "USDC";

// ── Payment Provider Abstraction ────────────────────────────────────────────

/**
 * A payment proof is an opaque token from any payment provider.
 * The monetization layer doesn't interpret it — it just stores it
 * alongside the certificate for auditability.
 */
export interface PaymentProof {
  /** Provider identifier: 'stripe', 'x402', 'crypto', 'manual', etc. */
  provider: string;
  /** Provider-specific receipt ID (e.g. Stripe payment_intent, tx hash). */
  receiptId: string;
  /** ISO-8601 timestamp of when payment was confirmed by provider. */
  confirmedAt: string;
}

// ── Monetization Config ─────────────────────────────────────────────────────

/**
 * Developer-facing monetization configuration.
 * One config per gated morphism endpoint per app.
 * Stored in KV under key `monetize:{appCanonicalId}:{gate}`.
 */
export interface MonetizationConfig {
  /** Canonical ID of the app being monetized. */
  appCanonicalId: string;
  /** Billing model. */
  model: BillingModel;
  /** Price in the specified currency. */
  price: number;
  /** Currency (default: USD). */
  currency: Currency;
  /** Billing interval (only for 'subscription' model). */
  interval?: BillingInterval;
  /** Morphism endpoint name to gate (e.g. 'premium', 'export', 'ai-gen'). */
  gate: string;
  /** Free trial days before payment required (subscription only). */
  trialDays?: number;
}

// ── Revenue Split ───────────────────────────────────────────────────────────

/**
 * Revenue split ratios. Defaults: developer 80%, platform 20%.
 * Platform share decreases with volume (future: volume-based tiers).
 */
export interface RevenueSplit {
  developerShare: number; // 0.0–1.0 (default 0.80)
  platformShare: number;  // 0.0–1.0 (default 0.20)
}

export const DEFAULT_REVENUE_SPLIT: RevenueSplit = {
  developerShare: 1.00,
  platformShare: 0.00,
};

// ── Access Certificate ──────────────────────────────────────────────────────

/**
 * A cert:TransformCertificate granting a user access to a gated morphism.
 * This IS the entitlement — stored in the user's Solid Pod.
 */
export interface AccessCertificate {
  "@context": "https://uor.foundation/contexts/uor-v1.jsonld";
  "@type": "cert:TransformCertificate";
  "cert:subject": string;            // user canonical ID
  "cert:issuer": string;             // app canonical ID
  "cert:grantedActions": string[];   // morphism gates this cert unlocks
  "cert:issuedAt": string;           // ISO-8601
  "cert:expiresAt"?: string;         // ISO-8601 (subscriptions)
  "cert:revokedAt"?: string;         // ISO-8601 if revoked
  "cert:paymentProof": PaymentProof;
  "cert:cid": string;                // content hash of this certificate
  "cert:specification": "1.0.0";
}

// ── Payment Record ──────────────────────────────────────────────────────────

/**
 * Immutable record of a processed payment.
 * Stored in KV under `payment:{paymentId}`.
 */
export interface PaymentRecord {
  paymentId: string;           // canonical ID of this payment record
  appCanonicalId: string;
  userCanonicalId: string;
  amountGross: number;
  currency: Currency;
  platformFee: number;         // platformShare * amountGross
  developerNet: number;        // developerShare * amountGross
  apiCosts: number;            // deducted from developer net (LLM usage etc.)
  paidAt: string;              // ISO-8601
  paymentProof: PaymentProof;
  accessCertificate: AccessCertificate;
}

// ── Developer Balance ───────────────────────────────────────────────────────

/**
 * Accumulated balance for an app developer.
 * Stored in KV under `balance:{appCanonicalId}`.
 */
export interface DeveloperBalance {
  appCanonicalId: string;
  gross: number;
  platformFees: number;
  apiCosts: number;
  net: number;
  currency: Currency;
  paymentCount: number;
  lastPaymentAt?: string;
}

// ── Access Check Result ─────────────────────────────────────────────────────

export interface AccessCheckResult {
  allowed: boolean;
  certificate?: AccessCertificate;
  reason: string;
}
