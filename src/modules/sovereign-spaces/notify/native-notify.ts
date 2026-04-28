/**
 * Native Notifications Bridge
 * ═════════════════════════════════════════════════════════════════
 *
 * Dual-dispatch notification system:
 *   - Tauri: OS-level notifications via @tauri-apps/plugin-notification
 *   - Browser: Web Notification API fallback
 *
 * Used for sync events, collaboration, conflict alerts, AI completion.
 *
 * @layer sovereign-spaces/notify
 */

import { isLocal } from "@/lib/runtime";

// ── Types ───────────────────────────────────────────────────────────────

export interface NotifyOptions {
  title: string;
  body?: string;
  icon?: string;
  /** Channel for grouping (Tauri Android) */
  channel?: string;
  /** Action ID for click routing */
  actionId?: string;
}

// ── Core ────────────────────────────────────────────────────────────────

/**
 * Send a notification. Uses native Tauri plugin when available,
 * falls back to Web Notification API in browser.
 */
export async function notify(opts: NotifyOptions): Promise<void> {
  if (isLocal()) {
    try {
      // @ts-ignore — Tauri plugin only available in desktop builds
      const mod = await import(/* @vite-ignore */ "@tauri-apps/plugin-notification");
      let permResult = await mod.isPermissionGranted();
      if (!permResult) {
        const perm = await mod.requestPermission();
        permResult = perm === "granted";
      }
      if (permResult) {
        await mod.sendNotification({
          title: opts.title,
          body: opts.body,
          icon: opts.icon,
        });
        return;
      }
    } catch {
      // fall through to browser
    }
  }

  // Browser fallback
  if (typeof Notification !== "undefined") {
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (Notification.permission === "granted") {
      new Notification(opts.title, {
        body: opts.body,
        icon: opts.icon,
      });
    }
  }
}

// ── Convenience wrappers ────────────────────────────────────────────────

export async function notifySyncComplete(deviceName: string): Promise<void> {
  await notify({
    title: "Sync Complete",
    body: `Your space is now synced with ${deviceName}`,
    actionId: "sync-complete",
  });
}

export async function notifyPeerJoined(peerName: string): Promise<void> {
  await notify({
    title: "Peer Connected",
    body: `${peerName} joined your sovereign space`,
    actionId: "peer-joined",
  });
}

export async function notifyConflict(details: string): Promise<void> {
  await notify({
    title: "Merge Conflict",
    body: details,
    actionId: "conflict",
  });
}

export async function notifyAIComplete(taskSummary: string): Promise<void> {
  await notify({
    title: "AI Task Complete",
    body: taskSummary,
    actionId: "ai-complete",
  });
}
