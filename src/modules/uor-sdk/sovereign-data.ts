/**
 * UOR SDK — Sovereign User Data Layer (P4)
 *
 * User data lives in Solid Pods — personal sovereign data stores governed
 * by the Solid LDP protocol. The developer's app never holds raw user data.
 * Every data access is a certified morphism:Action logged as a
 * cert:TransformCertificate in the user's pod.
 *
 * Architecture:
 *   - PodManager: provisions and manages Solid Pod lifecycle
 *   - Data Access: five developer-facing functions that replace a database
 *   - Audit Trail: every read/write is certificate-logged
 *   - GDPR Export: one-call W3C Verifiable Credential portability
 *
 * @see state:PodContext — user pod session state
 * @see store: namespace — sovereign storage
 * @see cert: namespace — access certificates
 */

import { singleProofHash } from "@/lib/uor-canonical";
import { UnsKv } from "@/modules/uns/store/kv";

// ── Types ───────────────────────────────────────────────────────────────────

/** Solid Pod context for a provisioned user. */
export interface UserPodContext {
  userCanonicalId: string;
  podUrl: string;
  accessToken: string;
  createdAt: string;
  appBindings: Record<string, string>;
}

/** A single audit log entry for a data access event. */
export interface DataAccessEvent {
  key: string;
  action: "read" | "write";
  timestamp: string;
  canonicalId: string;
  appCanonicalId: string;
}

/** Result of a write operation. */
export interface WriteResult {
  canonicalId: string;
  writtenAt: string;
}

/** Result of a read operation. */
export interface ReadResult {
  value: unknown;
  canonicalId: string;
}

/** Binding certificate issued when an app connects to a user's pod. */
export interface BindingCertificate {
  "@context": {
    cert: string;
    morphism: string;
    xsd: string;
  };
  "@type": "cert:TransformCertificate";
  "cert:certifies": string;
  "cert:grantedActions": string[];
  "cert:subject": string;
  "cert:issuer": string;
  "cert:issuedAt": string;
  "cert:cid": string;
}

// ── Constants ───────────────────────────────────────────────────────────────

const POD_BASE = "https://pod.uor.app";

// ── Pod Manager ─────────────────────────────────────────────────────────────

/**
 * Manages Solid Pod lifecycle: provisioning, app binding, and revocation.
 *
 * In production, this integrates with a Solid Community Server (CSS).
 * The current implementation uses UNS KV as the persistence layer,
 * maintaining the same interface and certificate guarantees.
 */
export class PodManager {
  private readonly kv: UnsKv;

  constructor(kv?: UnsKv) {
    this.kv = kv ?? new UnsKv();
  }

  /** Access the underlying KV store (for data access layer). */
  getKv(): UnsKv {
    return this.kv;
  }

  /**
   * Provision a new Solid Pod for a user.
   * Creates a pod context with a content-derived pod URL.
   */
  async provision(userCanonicalId: string): Promise<UserPodContext> {
    const userHash = userCanonicalId
      .replace("urn:uor:derivation:sha256:", "")
      .slice(0, 16);

    const ctx: UserPodContext = {
      userCanonicalId,
      podUrl: `${POD_BASE}/${userHash}/`,
      accessToken: await this.generateAccessToken(userCanonicalId),
      createdAt: new Date().toISOString(),
      appBindings: {},
    };

    await this.storePodContext(ctx);
    return ctx;
  }

  /**
   * Get existing pod context or provision if not exists.
   * Idempotent: repeated calls return the same pod.
   */
  async getOrProvision(userCanonicalId: string): Promise<UserPodContext> {
    const existing = await this.getPodContext(userCanonicalId);
    if (existing) return existing;
    return this.provision(userCanonicalId);
  }

  /**
   * Bind an app to a user's pod.
   * Creates a container path for the app and issues a cert:TransformCertificate.
   */
  async bindApp(
    podCtx: UserPodContext,
    appCanonicalId: string
  ): Promise<BindingCertificate> {
    const appHash = appCanonicalId
      .replace("urn:uor:derivation:sha256:", "")
      .slice(0, 12);

    const containerPath = `apps/${appHash}/`;
    podCtx.appBindings[appCanonicalId] = containerPath;

    await this.storePodContext(podCtx);

    // Issue binding certificate
    const certProof = await singleProofHash({
      "@type": "cert:AppBinding",
      user: podCtx.userCanonicalId,
      app: appCanonicalId,
      container: containerPath,
      boundAt: new Date().toISOString(),
    });

    return {
      "@context": {
        cert: "https://uor.foundation/cert/",
        morphism: "https://uor.foundation/morphism/",
        xsd: "http://www.w3.org/2001/XMLSchema#",
      },
      "@type": "cert:TransformCertificate",
      "cert:certifies": `${podCtx.podUrl}${containerPath}`,
      "cert:grantedActions": [
        "morphism:Read",
        "morphism:Write",
        "morphism:List",
      ],
      "cert:subject": podCtx.userCanonicalId,
      "cert:issuer": appCanonicalId,
      "cert:issuedAt": new Date().toISOString(),
      "cert:cid": certProof.cid,
    };
  }

  /**
   * List all apps bound to a user's pod.
   */
  async listBindings(userCanonicalId: string): Promise<string[]> {
    const ctx = await this.getPodContext(userCanonicalId);
    if (!ctx) return [];
    return Object.keys(ctx.appBindings);
  }

  /**
   * Revoke an app's access to a user's pod.
   * Logs the revocation as a certificate event.
   */
  async revokeBinding(
    userCanonicalId: string,
    appCanonicalId: string
  ): Promise<void> {
    const ctx = await this.getPodContext(userCanonicalId);
    if (!ctx) return;

    delete ctx.appBindings[appCanonicalId];
    await this.storePodContext(ctx);

    // Log revocation event in audit trail
    const event: DataAccessEvent = {
      key: `__revoke:${appCanonicalId}`,
      action: "write",
      timestamp: new Date().toISOString(),
      canonicalId: appCanonicalId,
      appCanonicalId,
    };

    await this.appendAuditEvent(userCanonicalId, appCanonicalId, event);
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async generateAccessToken(userCanonicalId: string): Promise<string> {
    const proof = await singleProofHash({
      "@type": "state:AccessToken",
      subject: userCanonicalId,
      issuedAt: new Date().toISOString(),
    });
    return proof.cid;
  }

  private async storePodContext(ctx: UserPodContext): Promise<void> {
    const bytes = new TextEncoder().encode(JSON.stringify(ctx));
    await this.kv.put(`pod:${ctx.userCanonicalId}`, bytes);
  }

  async getPodContext(
    userCanonicalId: string
  ): Promise<UserPodContext | null> {
    const entry = await this.kv.get(`pod:${userCanonicalId}`);
    if (!entry) return null;
    return JSON.parse(new TextDecoder().decode(entry.value));
  }

  /** Append an audit event to the user+app audit log. */
  async appendAuditEvent(
    userCanonicalId: string,
    appCanonicalId: string,
    event: DataAccessEvent
  ): Promise<void> {
    const key = `audit:${userCanonicalId}:${appCanonicalId}`;
    const existing = await this.kv.get(key);
    const events: DataAccessEvent[] = existing
      ? JSON.parse(new TextDecoder().decode(existing.value))
      : [];
    events.push(event);
    await this.kv.put(key, new TextEncoder().encode(JSON.stringify(events)));
  }

  /** Retrieve the audit log for a user+app pair. */
  async getAuditLog(
    userCanonicalId: string,
    appCanonicalId: string
  ): Promise<DataAccessEvent[]> {
    const key = `audit:${userCanonicalId}:${appCanonicalId}`;
    const entry = await this.kv.get(key);
    if (!entry) return [];
    return JSON.parse(new TextDecoder().decode(entry.value));
  }
}

// ── Data Access Layer ───────────────────────────────────────────────────────

/**
 * Connect a user to an app — provision pod, bind app, return certificate.
 * This is the first function a developer calls when a user opens their app.
 */
export async function connectUser(
  userCanonicalId: string,
  appCanonicalId: string,
  podManager?: PodManager
): Promise<{ podUrl: string; bindingCertificate: BindingCertificate }> {
  const pm = podManager ?? new PodManager();
  const ctx = await pm.getOrProvision(userCanonicalId);
  const cert = await pm.bindApp(ctx, appCanonicalId);
  return { podUrl: ctx.podUrl, bindingCertificate: cert };
}

/**
 * Write data to a user's pod container for this app.
 * Returns the canonical ID of the stored value. Logs write as cert.
 */
export async function writeUserData(
  userCanonicalId: string,
  appCanonicalId: string,
  key: string,
  value: unknown,
  podManager?: PodManager
): Promise<WriteResult> {
  const pm = podManager ?? new PodManager();

  // Ensure pod and binding exist
  const ctx = await pm.getOrProvision(userCanonicalId);
  if (!ctx.appBindings[appCanonicalId]) {
    await pm.bindApp(ctx, appCanonicalId);
  }

  // Compute canonical ID of the value
  const proof = await singleProofHash({
    "@type": "store:PodEntry",
    key,
    value,
    app: appCanonicalId,
  });

  // Store in KV (simulating Solid Pod LDP resource)
  const storageKey = `pod-data:${userCanonicalId}:${appCanonicalId}:${key}`;
  const payload = { value, canonicalId: proof.derivationId };
  await pm.getKv().put(
    storageKey,
    new TextEncoder().encode(JSON.stringify(payload))
  );

  const writtenAt = new Date().toISOString();

  // Log write event
  await pm.appendAuditEvent(userCanonicalId, appCanonicalId, {
    key,
    action: "write",
    timestamp: writtenAt,
    canonicalId: proof.derivationId,
    appCanonicalId,
  });

  return { canonicalId: proof.derivationId, writtenAt };
}

/**
 * Read data from a user's pod container for this app.
 * Logs the read as a morphism:Action cert.
 */
export async function readUserData(
  userCanonicalId: string,
  appCanonicalId: string,
  key: string,
  podManager?: PodManager
): Promise<ReadResult | null> {
  const pm = podManager ?? new PodManager();

  const storageKey = `pod-data:${userCanonicalId}:${appCanonicalId}:${key}`;
  const entry = await pm.getKv().get(storageKey);
  if (!entry) return null;

  const parsed = JSON.parse(new TextDecoder().decode(entry.value));

  // Log read event
  await pm.appendAuditEvent(userCanonicalId, appCanonicalId, {
    key,
    action: "read",
    timestamp: new Date().toISOString(),
    canonicalId: parsed.canonicalId,
    appCanonicalId,
  });

  return { value: parsed.value, canonicalId: parsed.canonicalId };
}

/**
 * Get the full audit history of all data accesses for a user+app pair.
 * Returns events in chronological order.
 */
export async function getUserHistory(
  userCanonicalId: string,
  appCanonicalId: string,
  podManager?: PodManager
): Promise<DataAccessEvent[]> {
  const pm = podManager ?? new PodManager();
  return pm.getAuditLog(userCanonicalId, appCanonicalId);
}

/**
 * Export all user data as a W3C Verifiable Credential (GDPR Art. 20).
 * Returns a self-contained credential with all pod data and access history.
 */
export async function exportUserData(
  userCanonicalId: string,
  podManager?: PodManager
): Promise<Record<string, unknown>> {
  const pm = podManager ?? new PodManager();
  const ctx = await pm.getPodContext(userCanonicalId);

  // Collect all data across all bound apps
  const appData: Record<string, unknown> = {};
  const allHistory: DataAccessEvent[] = [];

  if (ctx) {
    for (const appId of Object.keys(ctx.appBindings)) {
      const history = await pm.getAuditLog(userCanonicalId, appId);
      allHistory.push(...history);

      // Collect stored data keys from history
      const writtenKeys = new Set(
        history
          .filter((e) => e.action === "write" && !e.key.startsWith("__"))
          .map((e) => e.key)
      );

      const appEntries: Record<string, unknown> = {};
      for (const key of writtenKeys) {
        const storageKey = `pod-data:${userCanonicalId}:${appId}:${key}`;
        const entry = await pm.getKv().get(storageKey);
        if (entry) {
          appEntries[key] = JSON.parse(
            new TextDecoder().decode(entry.value)
          ).value;
        }
      }

      if (Object.keys(appEntries).length > 0) {
        appData[appId] = appEntries;
      }
    }
  }

  // Compute credential identity
  const credentialProof = await singleProofHash({
    "@type": "cert:PortabilityCredential",
    subject: userCanonicalId,
    exportedAt: new Date().toISOString(),
    appCount: Object.keys(appData).length,
  });

  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://uor.foundation/contexts/uor-v1.jsonld",
    ],
    "@type": ["VerifiableCredential", "cert:PortabilityCredential"],
    "credentialSubject": {
      id: userCanonicalId,
      podUrl: ctx?.podUrl ?? null,
      appBindings: ctx?.appBindings ?? {},
      data: appData,
      accessHistory: allHistory,
    },
    "issuanceDate": new Date().toISOString(),
    "issuer": "https://uor.foundation",
    "proof": {
      type: "UorSingleProofHash",
      derivationId: credentialProof.derivationId,
      cid: credentialProof.cid,
    },
  };
}
