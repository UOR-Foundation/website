/**
 * UOR App SDK — @uor/app-sdk (P11)
 *
 * Five primary functions for 90% of use cases:
 *   1. connectUser()     — provision pod, issue relationship certificate
 *   2. readUserData()    — certified read from user's Solid Pod
 *   3. writeUserData()   — certified write to user's Solid Pod
 *   4. gateWithPayment() — check access certificate for a feature
 *   5. verifyApp()       — canonical ID check of this app
 *
 * No UOR jargon in the primary API surface. Simple verbs.
 * Feels like localStorage but backed by sovereign data + post-quantum security.
 *
 * @example
 * ```typescript
 * import { createUorAppClient } from "@/modules/uor-sdk/app-sdk";
 *
 * const app = createUorAppClient({
 *   appId: "urn:uor:derivation:sha256:abc123...",
 * });
 *
 * const user = await app.connectUser("user-123");
 * await app.writeUserData("user-123", "prefs", { theme: "dark" });
 * const prefs = await app.readUserData("user-123", "prefs");
 * ```
 */

import { singleProofHash } from "@/lib/uor-canonical";
import { UnsKv } from "@/modules/uns/store/kv";
import {
  PodManager,
  connectUser as rawConnectUser,
  writeUserData as rawWriteUserData,
  readUserData as rawReadUserData,
  getUserHistory as rawGetUserHistory,
  exportUserData as rawExportUserData,
} from "./sovereign-data";
import type { DataAccessEvent } from "./sovereign-data";
import { MonetizationEngine } from "./monetization";
import type { AccessCheckResult } from "./monetization-types";
import {
  createManifest,
  verifyManifest,
  AppRegistry,
} from "./app-identity";
import type { AppManifest } from "./app-identity";
import { DiscoveryEngine } from "./discovery";
import type { AppObserverProfile } from "./discovery";
import { RuntimeWitness } from "./runtime-witness";
import type { ExecutionTrace } from "./runtime-witness";
import { MorphismRouter } from "./morphism-router";
import type { MorphismResult } from "./morphism-router";
import {
  revokeCertificate,
  getCertificate,
} from "./relationship";

// ── Config ──────────────────────────────────────────────────────────────────

/** Configuration for the UOR App SDK client. */
export interface UorAppClientConfig {
  /** The canonical ID of this deployed app (from deploy step). */
  appId: string;
  /** UOR API node URL. Defaults to https://api.uor.foundation/v1 */
  nodeUrl?: string;
}

// ── Result types (simple, no UOR jargon) ────────────────────────────────────

/** Result of connecting a user. */
export interface ConnectUserResult {
  podUrl: string;
  certificate: Record<string, unknown>;
  isNewUser: boolean;
}

/** Result of writing data. */
export interface WriteDataResult {
  canonicalId: string;
  writtenAt: string;
}

/** Result of reading data. */
export interface ReadDataResult {
  value: unknown;
  canonicalId: string;
  readAt: string;
}

/** Result of a payment gate check. */
export interface PaymentGateResult {
  allowed: boolean;
  certificate?: Record<string, unknown>;
  reason: string;
  paymentUrl?: string;
}

/** Result of verifying this app. */
export interface VerifyAppResult {
  verified: boolean;
  canonicalId: string;
  ipv6: string;
  observerZone: string;
}

/** Result of calling another app. */
export interface CallAppResult {
  delivered: boolean;
  output?: unknown;
  traceId: string;
}

/** Developer revenue summary. */
export interface RevenueResult {
  gross: number;
  platformFees: number;
  net: number;
  paymentCount: number;
  currency: string;
}

// ── AppClient interface ─────────────────────────────────────────────────────

/** The UOR App SDK client — five primary functions + secondary power tools. */
export interface AppClient {
  connectUser(userId: string): Promise<ConnectUserResult>;
  readUserData(userId: string, key: string): Promise<ReadDataResult | null>;
  writeUserData(userId: string, key: string, value: unknown): Promise<WriteDataResult>;
  gateWithPayment(userId: string, gate: string): Promise<PaymentGateResult>;
  verifyApp(): Promise<VerifyAppResult>;

  getUserHistory(userId: string): Promise<DataAccessEvent[]>;
  exportUserData(userId: string): Promise<Record<string, unknown>>;
  revokeUserAccess(userId: string): Promise<void>;
  getExecutionHistory(): Promise<ExecutionTrace[]>;
  callApp(targetAppId: string, endpoint: string, payload: unknown): Promise<CallAppResult>;
  getDiscoveryProfile(): Promise<AppObserverProfile | null>;
  getRevenue(): Promise<RevenueResult>;
}

// ── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create a UOR App SDK client.
 *
 * Five simple functions cover 90% of use cases. No UOR jargon visible.
 *
 * @param config - App ID and optional node URL
 * @returns A fully initialized App SDK client
 */
export function createUorAppClient(config: UorAppClientConfig): AppClient {
  const kv = new UnsKv();
  const podManager = new PodManager(kv);
  const monetization = new MonetizationEngine(kv);
  const discovery = new DiscoveryEngine(kv);
  const witness = new RuntimeWitness(config.appId);
  const morphismRouter = new MorphismRouter();
  const appRegistry = new AppRegistry(kv);

  // Derive a stable user canonical ID from a plain user ID
  async function deriveUserId(userId: string): Promise<string> {
    const proof = await singleProofHash({
      "@type": "u:UserIdentity",
      userId,
      appId: config.appId,
    });
    return proof.derivationId;
  }

  let cachedManifest: AppManifest | null = null;

  return {
    // ── 1. connectUser ─────────────────────────────────────────────────
    async connectUser(userId: string): Promise<ConnectUserResult> {
      const userCid = await deriveUserId(userId);
      const existingPod = await podManager.getPodContext(userCid);
      const isNewUser = !existingPod;
      const result = await rawConnectUser(userCid, config.appId, podManager);
      return {
        podUrl: result.podUrl,
        certificate: result.bindingCertificate as unknown as Record<string, unknown>,
        isNewUser,
      };
    },

    // ── 2. readUserData ────────────────────────────────────────────────
    async readUserData(userId: string, key: string): Promise<ReadDataResult | null> {
      const userCid = await deriveUserId(userId);
      const result = await rawReadUserData(userCid, config.appId, key, podManager);
      if (!result) return null;
      return {
        value: result.value,
        canonicalId: result.canonicalId,
        readAt: new Date().toISOString(),
      };
    },

    // ── 3. writeUserData ───────────────────────────────────────────────
    async writeUserData(userId: string, key: string, value: unknown): Promise<WriteDataResult> {
      const userCid = await deriveUserId(userId);
      await rawConnectUser(userCid, config.appId, podManager);
      const result = await rawWriteUserData(userCid, config.appId, key, value, podManager);
      return { canonicalId: result.canonicalId, writtenAt: result.writtenAt };
    },

    // ── 4. gateWithPayment ─────────────────────────────────────────────
    async gateWithPayment(userId: string, gate: string): Promise<PaymentGateResult> {
      const userCid = await deriveUserId(userId);
      const result: AccessCheckResult = await monetization.checkAccess(userCid, config.appId, gate);
      if (result.allowed) {
        return {
          allowed: true,
          certificate: result.certificate as unknown as Record<string, unknown>,
          reason: "valid_certificate",
        };
      }
      return {
        allowed: false,
        reason: result.reason,
        paymentUrl: `https://pay.uor.foundation/checkout?app=${encodeURIComponent(config.appId)}&gate=${encodeURIComponent(gate)}&user=${encodeURIComponent(userCid)}`,
      };
    },

    // ── 5. verifyApp ───────────────────────────────────────────────────
    async verifyApp(): Promise<VerifyAppResult> {
      if (!cachedManifest) cachedManifest = await appRegistry.get(config.appId);

      if (!cachedManifest) {
        const freshManifest = await createManifest({
          "@type": "app:Manifest",
          "app:name": `app-${config.appId.slice(-8)}`,
          "app:version": "1.0.0",
          "app:sourceUrl": config.nodeUrl ?? "https://api.uor.foundation",
          "app:entrypoint": "index.ts",
          "app:tech": ["typescript"],
          "app:deployedAt": new Date().toISOString(),
          "app:developerCanonicalId": config.appId,
        });
        await appRegistry.register(freshManifest);
        cachedManifest = freshManifest;

        let profile: AppObserverProfile;
        try { profile = await discovery.registerApp(config.appId); }
        catch { profile = { zone: "COHERENCE" } as AppObserverProfile; }

        return {
          verified: true,
          canonicalId: freshManifest["u:canonicalId"]!,
          ipv6: freshManifest["u:ipv6"]!,
          observerZone: profile.zone,
        };
      }

      const verified = await verifyManifest(cachedManifest);
      const profile = await discovery.getProfile(config.appId);
      return {
        verified,
        canonicalId: cachedManifest["u:canonicalId"] ?? config.appId,
        ipv6: cachedManifest["u:ipv6"] ?? "fd00::1",
        observerZone: profile?.zone ?? "COHERENCE",
      };
    },

    // ── Secondary ──────────────────────────────────────────────────────
    async getUserHistory(userId: string): Promise<DataAccessEvent[]> {
      const userCid = await deriveUserId(userId);
      return rawGetUserHistory(userCid, config.appId, podManager);
    },

    async exportUserData(userId: string): Promise<Record<string, unknown>> {
      const userCid = await deriveUserId(userId);
      return rawExportUserData(userCid, podManager);
    },

    async revokeUserAccess(userId: string): Promise<void> {
      const userCid = await deriveUserId(userId);
      const userHash = userCid.replace("urn:uor:derivation:sha256:", "").slice(0, 12);
      const cert = await getCertificate(config.appId, userHash);
      if (cert) await revokeCertificate(cert);
      await podManager.revokeBinding(userCid, config.appId);
    },

    async getExecutionHistory(): Promise<ExecutionTrace[]> {
      return witness.getHistory();
    },

    async callApp(targetAppId: string, endpoint: string, payload: unknown): Promise<CallAppResult> {
      const result: MorphismResult = await morphismRouter.call({
        fromAppCanonicalId: config.appId,
        toAppCanonicalId: targetAppId,
        endpoint,
        morphismType: "morphism:Transform",
        payload,
      });
      return { delivered: result.delivered, output: result.output, traceId: result.traceCanonicalId };
    },

    async getDiscoveryProfile(): Promise<AppObserverProfile | null> {
      return discovery.getProfile(config.appId);
    },

    async getRevenue(): Promise<RevenueResult> {
      const balance = await monetization.getDeveloperBalance(config.appId);
      return {
        gross: balance.gross,
        platformFees: balance.platformFees,
        net: balance.net,
        paymentCount: balance.paymentCount,
        currency: balance.currency,
      };
    },
  };
}

// ── Browser CDN Shim ────────────────────────────────────────────────────────

/**
 * Auto-initializer for browser CDN usage.
 * Reads `data-uor-app-canonical` from script tag, initializes window.uorApp.
 * @internal
 */
export function browserAutoInit(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const scripts = document.querySelectorAll("script[data-uor-app-canonical]");
  const scriptTag = scripts[scripts.length - 1] as HTMLScriptElement | undefined;
  if (!scriptTag) return;
  const appId = scriptTag.getAttribute("data-uor-app-canonical");
  if (!appId) return;
  const client = createUorAppClient({ appId });
  (window as unknown as Record<string, unknown>).uorApp = client;
  if (!sessionStorage.getItem("uor-consent-shown")) {
    sessionStorage.setItem("uor-consent-shown", "1");
    let localUserId = localStorage.getItem("uor-user-id");
    if (!localUserId) {
      localUserId = crypto.randomUUID();
      localStorage.setItem("uor-user-id", localUserId);
    }
    client.connectUser(localUserId).catch(() => {});
  }
}
