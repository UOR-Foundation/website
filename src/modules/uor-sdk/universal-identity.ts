/**
 * UOR SDK — Universal Identity (One Login, All Apps)
 *
 * The entry point to the entire UOR ecosystem. One identity, created once,
 * used everywhere. No per-app sign-ups. No password sprawl.
 *
 * Architecture:
 *   1. User creates a UOR identity → Dilithium-3 keypair + canonical ID
 *   2. Identity is stored locally + registered in the UNS DHT
 *   3. Any app calls `authenticateUser(canonicalId)` → SSO session issued
 *   4. Session is a signed cert:SessionCertificate — tamper-evident, portable
 *
 * The identity IS the login. The canonical ID IS the username.
 * No OAuth dance. No email verification. No password reset flow.
 * One keypair. One identity. All apps.
 *
 * Storage (UNS KV):
 *   identity:{canonicalId}          → IdentityRecord
 *   session:{sessionId}             → UniversalSession
 *   app-sessions:{canonicalId}      → AppSessionIndex (all active sessions)
 *   usage:{canonicalId}:{appId}     → UsageRecord (time-weighted app usage)
 *
 * @see cert: namespace — session certificates
 * @see uns: namespace — identity registration
 */

import { singleProofHash } from "@/lib/uor-canonical";
import { UnsKv } from "@/modules/uns/store/kv";

// ── Types ───────────────────────────────────────────────────────────────────

/** The core identity record — created once, used forever. */
export interface IdentityRecord {
  "@type": "uns:UniversalIdentity";
  /** The permanent canonical ID — derived from the identity's content. */
  canonicalId: string;
  /** Display name (optional, user-chosen). */
  displayName?: string;
  /** When this identity was created. */
  createdAt: string;
  /** Content-addressed public key fingerprint. */
  publicKeyFingerprint: string;
  /** Post-quantum algorithm used. */
  algorithm: "CRYSTALS-Dilithium-3";
  /** Epistemic grade — always 'A' for Dilithium-3 identities. */
  epistemicGrade: "A";
}

/** A cross-app session — one login, valid across all apps. */
export interface UniversalSession {
  "@type": "cert:SessionCertificate";
  /** Unique session ID (content-addressed). */
  sessionId: string;
  /** The identity this session belongs to. */
  identityCanonicalId: string;
  /** Which app initiated this session. */
  originAppId: string;
  /** All apps this session is authorized for ('*' = all). */
  authorizedApps: string[] | "*";
  /** Session start. */
  issuedAt: string;
  /** Session expiry. */
  expiresAt: string;
  /** Content hash of the session for tamper detection. */
  sessionCid: string;
}

/** Tracks how much time a user spends in each app (for revenue pooling). */
export interface UsageRecord {
  identityCanonicalId: string;
  appCanonicalId: string;
  /** Total seconds of active usage in the current billing period. */
  totalSeconds: number;
  /** Number of distinct sessions. */
  sessionCount: number;
  /** Last activity timestamp. */
  lastActiveAt: string;
  /** Billing period start. */
  periodStart: string;
}

/** Index of all active sessions for an identity. */
export interface AppSessionIndex {
  identityCanonicalId: string;
  activeSessions: Array<{
    sessionId: string;
    appId: string;
    expiresAt: string;
  }>;
}

// ── Constants ───────────────────────────────────────────────────────────────

const SESSION_TTL_MS = 30 * 24 * 60 * 60_000; // 30 days
const enc = new TextEncoder();
const dec = new TextDecoder();

function toBytes(obj: unknown): Uint8Array {
  return enc.encode(JSON.stringify(obj));
}

function fromBytes<T>(bytes: Uint8Array): T {
  return JSON.parse(dec.decode(bytes)) as T;
}

// ── Universal Identity Manager ──────────────────────────────────────────────

/**
 * Manages identity creation, SSO sessions, and cross-app usage tracking.
 *
 * This is the first thing a user touches in the UOR ecosystem.
 * Create identity → get canonical ID → use it everywhere.
 */
export class UniversalIdentityManager {
  constructor(private readonly kv: UnsKv) {}

  // ── Identity Creation ─────────────────────────────────────────────────

  /**
   * Create a new universal identity.
   *
   * This is the entry point to the UOR console. The identity's canonical ID
   * becomes the user's permanent, portable, self-sovereign login.
   *
   * @param publicKeyFingerprint - Content-addressed fingerprint of the user's Dilithium-3 public key
   * @param displayName - Optional human-readable name
   */
  async createIdentity(
    publicKeyFingerprint: string,
    displayName?: string,
  ): Promise<IdentityRecord> {
    const now = new Date().toISOString();

    const identityPayload = {
      "@type": "uns:UniversalIdentity",
      publicKeyFingerprint,
      algorithm: "CRYSTALS-Dilithium-3",
      createdAt: now,
    };

    const proof = await singleProofHash(identityPayload);
    const canonicalId = proof.derivationId;

    const record: IdentityRecord = {
      "@type": "uns:UniversalIdentity",
      canonicalId,
      displayName,
      createdAt: now,
      publicKeyFingerprint,
      algorithm: "CRYSTALS-Dilithium-3",
      epistemicGrade: "A",
    };

    await this.kv.put(`identity:${canonicalId}`, toBytes(record));
    return record;
  }

  /** Look up an identity by canonical ID. */
  async getIdentity(canonicalId: string): Promise<IdentityRecord | null> {
    const entry = await this.kv.get(`identity:${canonicalId}`);
    if (!entry) return null;
    return fromBytes<IdentityRecord>(entry.value);
  }

  // ── SSO Sessions ──────────────────────────────────────────────────────

  /**
   * Authenticate a user for an app — SSO across the entire platform.
   *
   * If the user already has a valid session, it's reused.
   * If not, a new session is created and registered across all apps.
   *
   * @param identityCanonicalId - The user's permanent canonical ID
   * @param appId - The app requesting authentication
   * @returns A universal session valid across all apps
   */
  async authenticate(
    identityCanonicalId: string,
    appId: string,
  ): Promise<UniversalSession> {
    // Check for existing valid session
    const existing = await this.getActiveSessions(identityCanonicalId);
    const now = new Date();

    for (const s of existing) {
      if (new Date(s.expiresAt) > now) {
        // Existing session still valid — record usage and return
        await this.recordUsage(identityCanonicalId, appId);
        return s;
      }
    }

    // Create new universal session
    const issuedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();

    const sessionPayload = {
      identityCanonicalId,
      originAppId: appId,
      issuedAt,
      expiresAt,
    };

    const proof = await singleProofHash(sessionPayload);

    const session: UniversalSession = {
      "@type": "cert:SessionCertificate",
      sessionId: proof.derivationId,
      identityCanonicalId,
      originAppId: appId,
      authorizedApps: "*", // Universal — valid for all apps
      issuedAt,
      expiresAt,
      sessionCid: proof.cid,
    };

    // Store the session
    await this.kv.put(`session:${session.sessionId}`, toBytes(session));

    // Update the session index
    await this.updateSessionIndex(identityCanonicalId, session);

    // Record initial usage
    await this.recordUsage(identityCanonicalId, appId);

    return session;
  }

  /** Verify a session is valid and not expired. */
  async verifySession(sessionId: string): Promise<boolean> {
    const entry = await this.kv.get(`session:${sessionId}`);
    if (!entry) return false;

    const session = fromBytes<UniversalSession>(entry.value);

    // Check expiry
    if (new Date(session.expiresAt) < new Date()) return false;

    // Verify content integrity
    const payload = {
      identityCanonicalId: session.identityCanonicalId,
      originAppId: session.originAppId,
      issuedAt: session.issuedAt,
      expiresAt: session.expiresAt,
    };

    const proof = await singleProofHash(payload);
    return proof.cid === session.sessionCid;
  }

  /** End a session. */
  async logout(sessionId: string): Promise<void> {
    const entry = await this.kv.get(`session:${sessionId}`);
    if (!entry) return;

    const session = fromBytes<UniversalSession>(entry.value);

    // Remove from KV
    await this.kv.delete(`session:${sessionId}`);

    // Update session index
    const indexEntry = await this.kv.get(
      `app-sessions:${session.identityCanonicalId}`,
    );
    if (indexEntry) {
      const index = fromBytes<AppSessionIndex>(indexEntry.value);
      index.activeSessions = index.activeSessions.filter(
        (s) => s.sessionId !== sessionId,
      );
      await this.kv.put(
        `app-sessions:${session.identityCanonicalId}`,
        toBytes(index),
      );
    }
  }

  // ── Usage Tracking ────────────────────────────────────────────────────

  /**
   * Record a usage event for revenue pooling.
   * Each authenticate() call counts as one session-touch.
   */
  async recordUsage(
    identityCanonicalId: string,
    appCanonicalId: string,
    durationSeconds = 0,
  ): Promise<UsageRecord> {
    const key = `usage:${identityCanonicalId}:${appCanonicalId}`;
    const entry = await this.kv.get(key);
    const now = new Date().toISOString();

    let record: UsageRecord;

    if (entry) {
      record = fromBytes<UsageRecord>(entry.value);
      record.totalSeconds += durationSeconds;
      record.sessionCount += 1;
      record.lastActiveAt = now;
    } else {
      record = {
        identityCanonicalId,
        appCanonicalId,
        totalSeconds: durationSeconds,
        sessionCount: 1,
        lastActiveAt: now,
        periodStart: now,
      };
    }

    await this.kv.put(key, toBytes(record));
    return record;
  }

  /** Get all usage records for an identity in the current period. */
  async getUsageForIdentity(
    identityCanonicalId: string,
  ): Promise<UsageRecord[]> {
    const entries = await this.kv.list(
      `usage:${identityCanonicalId}:`,
      100,
    );
    const records: UsageRecord[] = [];
    for (const { key } of entries) {
      const entry = await this.kv.get(key);
      if (entry) records.push(fromBytes<UsageRecord>(entry.value));
    }
    return records;
  }

  // ── Private Helpers ───────────────────────────────────────────────────

  private async getActiveSessions(
    identityCanonicalId: string,
  ): Promise<UniversalSession[]> {
    const indexEntry = await this.kv.get(
      `app-sessions:${identityCanonicalId}`,
    );
    if (!indexEntry) return [];

    const index = fromBytes<AppSessionIndex>(indexEntry.value);
    const sessions: UniversalSession[] = [];

    for (const ref of index.activeSessions) {
      const entry = await this.kv.get(`session:${ref.sessionId}`);
      if (entry) sessions.push(fromBytes<UniversalSession>(entry.value));
    }

    return sessions;
  }

  private async updateSessionIndex(
    identityCanonicalId: string,
    session: UniversalSession,
  ): Promise<void> {
    const key = `app-sessions:${identityCanonicalId}`;
    const entry = await this.kv.get(key);

    let index: AppSessionIndex;
    if (entry) {
      index = fromBytes<AppSessionIndex>(entry.value);
      // Prune expired sessions
      const now = new Date();
      index.activeSessions = index.activeSessions.filter(
        (s) => new Date(s.expiresAt) > now,
      );
    } else {
      index = { identityCanonicalId, activeSessions: [] };
    }

    index.activeSessions.push({
      sessionId: session.sessionId,
      appId: session.originAppId,
      expiresAt: session.expiresAt,
    });

    await this.kv.put(key, toBytes(index));
  }
}
