/**
 * Disappearing Messages — Signal-style ephemeral messaging.
 * Client-side timer that removes messages from view after TTL.
 * Supports both session-level and per-message TTL.
 */

import type { DecryptedMessage } from "./types";

/**
 * Filter messages that haven't expired yet.
 * Checks both session-level TTL and per-message selfDestructSeconds.
 */
export function filterExpiredMessages(
  messages: DecryptedMessage[],
  expiresAfterSeconds: number | null | undefined,
): DecryptedMessage[] {
  const now = Date.now();

  return messages.filter((msg) => {
    // Check per-message self-destruct
    if (msg.selfDestructSeconds) {
      const createdAt = new Date(msg.createdAt).getTime();
      const expiresAt = createdAt + msg.selfDestructSeconds * 1000;
      if (now >= expiresAt) return false;
    }

    // Check session-level TTL
    if (expiresAfterSeconds) {
      const createdAt = new Date(msg.createdAt).getTime();
      const expiresAt = createdAt + expiresAfterSeconds * 1000;
      if (now >= expiresAt) return false;
    }

    return true;
  });
}

/**
 * Calculate time remaining for a message.
 * Returns null if no expiry is set.
 * Checks per-message selfDestructSeconds first, then session-level.
 */
export function getTimeRemaining(
  createdAt: string,
  expiresAfterSeconds: number | null | undefined,
): { expired: boolean; remainingMs: number; label: string } | null {
  if (!expiresAfterSeconds) return null;

  const createdMs = new Date(createdAt).getTime();
  const expiresMs = createdMs + expiresAfterSeconds * 1000;
  const remainingMs = expiresMs - Date.now();

  if (remainingMs <= 0) return { expired: true, remainingMs: 0, label: "Expired" };

  const secs = Math.floor(remainingMs / 1000);
  if (secs < 60) return { expired: false, remainingMs, label: `${secs}s` };
  const mins = Math.floor(secs / 60);
  if (mins < 60) return { expired: false, remainingMs, label: `${mins}m` };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return { expired: false, remainingMs, label: `${hrs}h` };
  const days = Math.floor(hrs / 24);
  return { expired: false, remainingMs, label: `${days}d` };
}

/** Available TTL presets for the UI. */
export const EPHEMERAL_PRESETS = [
  { label: "Off", seconds: null },
  { label: "30 seconds", seconds: 30 },
  { label: "5 minutes", seconds: 300 },
  { label: "1 hour", seconds: 3600 },
  { label: "24 hours", seconds: 86400 },
  { label: "7 days", seconds: 604800 },
] as const;
