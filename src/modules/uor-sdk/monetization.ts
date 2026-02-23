/**
 * UOR SDK — Monetization Layer
 *
 * Certificate-gated payments with provider-agnostic revenue share.
 * Payment triggers cert:TransformCertificate issuance → certificate IS
 * the entitlement. No Stripe dashboard, no custom payment logic required.
 *
 * Architecture:
 *   PaymentProof (from any provider) → processPayment() → AccessCertificate
 *   AccessCertificate + checkAccess() → allowed/denied
 *
 * Storage (UNS KV):
 *   monetize:{appCanonicalId}:{gate}  → MonetizationConfig
 *   payment:{paymentId}               → PaymentRecord
 *   balance:{appCanonicalId}          → DeveloperBalance
 *   access:{userCanonicalId}:{appCanonicalId} → AccessCertificate[]
 *
 * @see cert: namespace — UOR certificate standard
 * @see morphism: namespace — gated endpoint types
 */

import { singleProofHash } from "@/lib/uor-canonical";
import { UnsKv } from "@/modules/uns/store/kv";
import type {
  MonetizationConfig,
  PaymentProof,
  PaymentRecord,
  AccessCertificate,
  DeveloperBalance,
  AccessCheckResult,
  RevenueSplit,
  Currency,
} from "./monetization-types";
import { DEFAULT_REVENUE_SPLIT } from "./monetization-types";

// ── Text encoder (shared) ───────────────────────────────────────────────────

const enc = new TextEncoder();
const dec = new TextDecoder();

// ── Serialization helpers ───────────────────────────────────────────────────

function toBytes(obj: unknown): Uint8Array {
  return enc.encode(JSON.stringify(obj));
}

function fromBytes<T>(bytes: Uint8Array): T {
  return JSON.parse(dec.decode(bytes)) as T;
}

// ── MonetizationEngine ──────────────────────────────────────────────────────

/**
 * Payment-provider agnostic monetization engine.
 *
 * Accepts a UNS KV instance for storage and an optional RevenueSplit
 * for custom split ratios (defaults to 80/20).
 */
export class MonetizationEngine {
  constructor(
    private readonly kv: UnsKv,
    private readonly split: RevenueSplit = DEFAULT_REVENUE_SPLIT,
  ) {}

  // ── Configuration ───────────────────────────────────────────────────────

  /**
   * Configure a payment gate for a morphism endpoint.
   * Returns the canonical ID of the stored config.
   */
  async configureMonetization(
    config: MonetizationConfig,
  ): Promise<{ configCanonicalId: string }> {
    const key = `monetize:${config.appCanonicalId}:${config.gate}`;
    const { canonicalId } = await this.kv.put(key, toBytes(config));
    return { configCanonicalId: canonicalId };
  }

  /**
   * Retrieve monetization config for an app+gate pair.
   */
  async getConfig(
    appCanonicalId: string,
    gate: string,
  ): Promise<MonetizationConfig | null> {
    const key = `monetize:${appCanonicalId}:${gate}`;
    const entry = await this.kv.get(key);
    if (!entry) return null;
    return fromBytes<MonetizationConfig>(entry.value);
  }

  // ── Payment Processing ──────────────────────────────────────────────────

  /**
   * Process a payment and issue an access certificate.
   *
   * Provider-agnostic: accepts any PaymentProof (Stripe, crypto, x402, etc.).
   * The certificate is the entitlement — stored under the user's access key.
   */
  async processPayment(
    appCanonicalId: string,
    userCanonicalId: string,
    amountGross: number,
    paymentProof: PaymentProof,
    currency: Currency = "USD",
  ): Promise<PaymentRecord> {
    // 1. Compute revenue split
    const platformFee = roundCents(amountGross * this.split.platformShare);
    const developerNet = roundCents(amountGross * this.split.developerShare);

    // 2. Look up config to determine which gates to unlock
    const configs = await this.kv.list(`monetize:${appCanonicalId}:`);
    const grantedActions: string[] = [];
    for (const c of configs) {
      const cfg = await this.kv.get(c.key);
      if (cfg) {
        const parsed = fromBytes<MonetizationConfig>(cfg.value);
        grantedActions.push(parsed.gate);
      }
    }
    // If no specific config, grant the proof's receipt as a generic gate
    if (grantedActions.length === 0) {
      grantedActions.push("default");
    }

    // 3. Compute expiry for subscriptions
    const now = new Date();
    let expiresAt: string | undefined;
    if (configs.length > 0) {
      const firstCfg = await this.kv.get(configs[0].key);
      if (firstCfg) {
        const parsed = fromBytes<MonetizationConfig>(firstCfg.value);
        if (parsed.model === "subscription" && parsed.interval) {
          const expiry = new Date(now);
          if (parsed.interval === "monthly") expiry.setMonth(expiry.getMonth() + 1);
          else expiry.setFullYear(expiry.getFullYear() + 1);
          expiresAt = expiry.toISOString();
        }
      }
    }

    // 4. Issue cert:TransformCertificate
    // Hash the semantic payload (without @context/@type to avoid JSON-LD
    // safe-mode expansion — singleProofHash wraps plain objects correctly).
    const certSemantics = {
      subject: userCanonicalId,
      issuer: appCanonicalId,
      grantedActions: grantedActions,
      issuedAt: now.toISOString(),
      ...(expiresAt ? { expiresAt } : {}),
      paymentProvider: paymentProof.provider,
      paymentReceipt: paymentProof.receiptId,
    };

    const proof = await singleProofHash(certSemantics);
    const accessCertificate: AccessCertificate = {
      "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
      "@type": "cert:TransformCertificate",
      "cert:subject": userCanonicalId,
      "cert:issuer": appCanonicalId,
      "cert:grantedActions": grantedActions,
      "cert:issuedAt": now.toISOString(),
      ...(expiresAt ? { "cert:expiresAt": expiresAt } : {}),
      "cert:paymentProof": paymentProof,
      "cert:specification": "1.0.0",
      "cert:cid": proof.cid,
    };

    // 5. Build payment record
    const paymentRecordPayload = {
      appCanonicalId,
      userCanonicalId,
      amountGross,
      currency,
      platformFee,
      developerNet,
      apiCosts: 0,
      paidAt: now.toISOString(),
      paymentProof,
    };
    const paymentProofHash = await singleProofHash(paymentRecordPayload);
    const paymentId = paymentProofHash.derivationId;

    const paymentRecord: PaymentRecord = {
      paymentId,
      ...paymentRecordPayload,
      accessCertificate,
    };

    // 6. Store payment record
    await this.kv.put(`payment:${paymentId}`, toBytes(paymentRecord));

    // 7. Store access certificate under user's key
    await this.storeAccessCertificate(userCanonicalId, appCanonicalId, accessCertificate);

    // 8. Update developer balance
    await this.updateBalance(appCanonicalId, amountGross, platformFee, developerNet, currency);

    return paymentRecord;
  }

  // ── Access Control ──────────────────────────────────────────────────────

  /**
   * Check if a user has access to a gated morphism endpoint.
   * Reads the certificate from the user's access key.
   */
  async checkAccess(
    userCanonicalId: string,
    appCanonicalId: string,
    gate: string,
  ): Promise<AccessCheckResult> {
    const certs = await this.getAccessCertificates(userCanonicalId, appCanonicalId);

    if (certs.length === 0) {
      return { allowed: false, reason: "no_certificate" };
    }

    // Find a valid, non-expired, non-revoked cert granting the requested gate
    const now = new Date();
    for (const cert of certs) {
      // Skip revoked
      if (cert["cert:revokedAt"]) {
        continue;
      }

      // Skip expired
      if (cert["cert:expiresAt"] && new Date(cert["cert:expiresAt"]) < now) {
        continue;
      }

      // Check gate
      if (cert["cert:grantedActions"].includes(gate)) {
        return { allowed: true, certificate: cert, reason: "valid_certificate" };
      }
    }

    // All certs either revoked, expired, or don't grant this gate
    const hasRevoked = certs.some((c) => c["cert:revokedAt"]);
    if (hasRevoked) {
      return { allowed: false, reason: "certificate_revoked" };
    }

    return { allowed: false, reason: "gate_not_granted" };
  }

  /**
   * Revoke a user's access certificate for a specific app.
   */
  async revokeAccess(
    userCanonicalId: string,
    appCanonicalId: string,
  ): Promise<void> {
    const certs = await this.getAccessCertificates(userCanonicalId, appCanonicalId);
    const now = new Date().toISOString();

    const revoked = certs.map((c) => ({
      ...c,
      "cert:revokedAt": now,
    }));

    const key = `access:${userCanonicalId}:${appCanonicalId}`;
    await this.kv.put(key, toBytes(revoked));
  }

  // ── Balance ─────────────────────────────────────────────────────────────

  /**
   * Get accumulated developer balance for an app.
   */
  async getDeveloperBalance(appCanonicalId: string): Promise<DeveloperBalance> {
    const key = `balance:${appCanonicalId}`;
    const entry = await this.kv.get(key);

    if (!entry) {
      return {
        appCanonicalId,
        gross: 0,
        platformFees: 0,
        apiCosts: 0,
        net: 0,
        currency: "USD",
        paymentCount: 0,
      };
    }

    return fromBytes<DeveloperBalance>(entry.value);
  }

  // ── Private Helpers ─────────────────────────────────────────────────────

  private async storeAccessCertificate(
    userCanonicalId: string,
    appCanonicalId: string,
    cert: AccessCertificate,
  ): Promise<void> {
    const key = `access:${userCanonicalId}:${appCanonicalId}`;
    const existing = await this.getAccessCertificates(userCanonicalId, appCanonicalId);
    existing.push(cert);
    await this.kv.put(key, toBytes(existing));
  }

  private async getAccessCertificates(
    userCanonicalId: string,
    appCanonicalId: string,
  ): Promise<AccessCertificate[]> {
    const key = `access:${userCanonicalId}:${appCanonicalId}`;
    const entry = await this.kv.get(key);
    if (!entry) return [];
    return fromBytes<AccessCertificate[]>(entry.value);
  }

  private async updateBalance(
    appCanonicalId: string,
    gross: number,
    platformFee: number,
    developerNet: number,
    currency: Currency,
  ): Promise<void> {
    const current = await this.getDeveloperBalance(appCanonicalId);
    const updated: DeveloperBalance = {
      appCanonicalId,
      gross: roundCents(current.gross + gross),
      platformFees: roundCents(current.platformFees + platformFee),
      apiCosts: current.apiCosts,
      net: roundCents(current.net + developerNet),
      currency,
      paymentCount: current.paymentCount + 1,
      lastPaymentAt: new Date().toISOString(),
    };
    await this.kv.put(`balance:${appCanonicalId}`, toBytes(updated));
  }
}

// ── Middleware Factory ──────────────────────────────────────────────────────

/**
 * Creates a middleware function that gates access behind a valid
 * cert:TransformCertificate. Returns 402 Payment Required if no
 * valid certificate exists for the requesting user.
 *
 * Provider-agnostic: works with any payment flow that calls processPayment().
 */
export function createPaymentGateMiddleware(
  engine: MonetizationEngine,
  appCanonicalId: string,
  gate: string,
): (req: { headers: { get(name: string): string | null } }) => Promise<
  | { status: 402; body: { error: string; reason: string; gate: string } }
  | { status: 200; pass: true }
> {
  return async (req) => {
    const userCanonicalId = req.headers.get("X-UOR-User-Canonical-ID");
    if (!userCanonicalId) {
      return {
        status: 402,
        body: {
          error: "Payment Required",
          reason: "missing_user_id",
          gate,
        },
      };
    }

    const result = await engine.checkAccess(userCanonicalId, appCanonicalId, gate);
    if (!result.allowed) {
      return {
        status: 402,
        body: {
          error: "Payment Required",
          reason: result.reason,
          gate,
        },
      };
    }

    return { status: 200, pass: true };
  };
}

// ── Utility ─────────────────────────────────────────────────────────────────

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}
