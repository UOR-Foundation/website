/**
 * Messenger Protocol Adapter
 * ═══════════════════════════
 *
 * Thin wrapper between the messenger UI and the UMP protocol core.
 * Manages local session key cache and provides a simple API for
 * the UI components to send/receive encrypted messages.
 *
 * For now, operates alongside mock-data for demo purposes.
 * When connected to a real backend, this adapter handles:
 *   - Session creation/retrieval from conduit_sessions table
 *   - Message encryption/decryption via UMP
 *   - Realtime subscription to encrypted_messages
 *   - Local key cache (IndexedDB in production)
 */

import type { UmpSession } from "@/modules/identity/uns/trust/messaging";
import {
  isSessionActive,
  getSessionSecurity,
} from "@/modules/identity/uns/trust/messaging";

// ── Local Session Cache ─────────────────────────────────────────────────────

/**
 * In-memory session key cache.
 *
 * In production, this would be backed by IndexedDB with encryption.
 * Keys NEVER leave the client. The server only stores session_hash
 * and ciphertext — zero knowledge of plaintext or symmetric keys.
 */
const sessionCache = new Map<string, UmpSession>();

/** Store a session in the local cache. */
export function cacheSession(session: UmpSession): void {
  sessionCache.set(session.sessionHash, session);
}

/** Retrieve a session from the local cache. */
export function getCachedSession(sessionHash: string): UmpSession | undefined {
  return sessionCache.get(sessionHash);
}

/** Remove a session from the local cache (after revocation). */
export function evictSession(sessionHash: string): void {
  const session = sessionCache.get(sessionHash);
  if (session) {
    // Zero out key material before evicting
    session.symmetricKey.fill(0);
    sessionCache.delete(sessionHash);
  }
}

/** Get all cached sessions. */
export function getAllCachedSessions(): UmpSession[] {
  return Array.from(sessionCache.values());
}

// ── Session Status Helpers ──────────────────────────────────────────────────

export type SessionStatus = "active" | "expired" | "revoked" | "none";

/**
 * Get the status of a session by its hash.
 * Returns 'none' if the session is not in the local cache.
 */
export function getSessionStatus(sessionHash: string): SessionStatus {
  const session = sessionCache.get(sessionHash);
  if (!session) return "none";
  if (!isSessionActive(session)) {
    return session.revokedAt ? "revoked" : "expired";
  }
  return "active";
}

/**
 * Get security info for display in the UI.
 */
export function getSessionSecurityInfo(sessionHash: string) {
  const session = sessionCache.get(sessionHash);
  if (!session) return null;
  return getSessionSecurity(session);
}

// ── Protocol Constants ──────────────────────────────────────────────────────

/** Protocol version identifier. */
export const UMP_VERSION = "UMP/1.0";

/** Maximum session age before automatic re-key suggestion. */
export const MAX_SESSION_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Encryption algorithm display string. */
export const ENCRYPTION_LABEL = "Kyber-1024 + AES-256-GCM";

/** Signature algorithm display string. */
export const SIGNATURE_LABEL = "Dilithium-3 (ML-DSA-65)";
