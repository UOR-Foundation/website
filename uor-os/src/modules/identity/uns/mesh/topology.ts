/**
 * UNS Mesh — Device Topology & Sync Strategy
 * ═════════════════════════════════════════════════════════════════
 *
 * Classifies the local device and selects the optimal sync strategy
 * based on runtime environment, available transports, and peer set.
 *
 * Device Classes:
 *   desktop — Full DHT node, mDNS, BroadcastChannel, Cloud. Active mesh participant, can relay.
 *   mobile  — Cloud relay, BroadcastChannel. Passive — syncs via cloud, receives HEAD broadcasts.
 *   cloud   — Cloud DB, Realtime. Hub — always-on sync target, head arbiter.
 *   edge    — Lightweight, intermittent connectivity. Sync on reconnect only.
 *
 * @module uns/mesh/topology
 * @layer 3
 */

import { isLocal } from "@/lib/runtime";
import type { DeviceClass } from "./sync-protocol";

// ── Sync Strategy ───────────────────────────────────────────────────────────

export type SyncStrategy = "active-mesh" | "passive-relay" | "hub" | "opportunistic";

export interface DeviceProfile {
  /** Detected device class */
  deviceClass: DeviceClass;
  /** Selected sync strategy */
  strategy: SyncStrategy;
  /** Available transport types */
  transports: string[];
  /** Whether this device can relay changes to other peers */
  canRelay: boolean;
  /** Whether this device should participate in DHT routing */
  dhtParticipant: boolean;
  /** Suggested sync interval in ms (0 = realtime/push) */
  syncIntervalMs: number;
  /** Max concurrent sync sessions */
  maxConcurrentSessions: number;
}

// ── Device Detection ────────────────────────────────────────────────────────

function detectDeviceClass(): DeviceClass {
  if (typeof window === "undefined") return "cloud";

  // Tauri desktop
  if (isLocal()) return "desktop";

  // Mobile detection
  const ua = navigator.userAgent?.toLowerCase() ?? "";
  const isMobile = /android|iphone|ipad|ipod|mobile/.test(ua);
  if (isMobile) return "mobile";

  // Service worker / edge function context
  if (typeof ServiceWorkerGlobalScope !== "undefined") return "edge";

  // Default to desktop-class browser
  return "desktop";
}

function detectTransports(deviceClass: DeviceClass): string[] {
  const transports: string[] = [];

  // BroadcastChannel — available in all modern browsers and Tauri
  if (typeof BroadcastChannel !== "undefined") {
    transports.push("broadcast-channel");
  }

  // Cloud relay — always available (requires auth)
  transports.push("cloud-relay");

  // mDNS — only in Tauri
  if (deviceClass === "desktop" && isLocal()) {
    transports.push("tauri-mdns");
  }

  return transports;
}

// ── Strategy Selection ──────────────────────────────────────────────────────

function selectStrategy(deviceClass: DeviceClass): SyncStrategy {
  switch (deviceClass) {
    case "desktop":
      return "active-mesh";
    case "mobile":
      return "passive-relay";
    case "cloud":
      return "hub";
    case "edge":
      return "opportunistic";
    default:
      return "passive-relay";
  }
}

function getProfileParams(
  deviceClass: DeviceClass,
  strategy: SyncStrategy,
): Pick<DeviceProfile, "canRelay" | "dhtParticipant" | "syncIntervalMs" | "maxConcurrentSessions"> {
  switch (strategy) {
    case "active-mesh":
      return { canRelay: true, dhtParticipant: true, syncIntervalMs: 0, maxConcurrentSessions: 8 };
    case "passive-relay":
      return { canRelay: false, dhtParticipant: false, syncIntervalMs: 15_000, maxConcurrentSessions: 2 };
    case "hub":
      return { canRelay: true, dhtParticipant: true, syncIntervalMs: 0, maxConcurrentSessions: 32 };
    case "opportunistic":
      return { canRelay: false, dhtParticipant: false, syncIntervalMs: 60_000, maxConcurrentSessions: 1 };
    default:
      return { canRelay: false, dhtParticipant: false, syncIntervalMs: 30_000, maxConcurrentSessions: 2 };
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

let cachedProfile: DeviceProfile | null = null;

/**
 * Detect the local device's class and compute optimal sync profile.
 * Result is cached for the session lifetime.
 */
export function getDeviceProfile(): DeviceProfile {
  if (cachedProfile) return cachedProfile;

  const deviceClass = detectDeviceClass();
  const strategy = selectStrategy(deviceClass);
  const transports = detectTransports(deviceClass);
  const params = getProfileParams(deviceClass, strategy);

  cachedProfile = {
    deviceClass,
    strategy,
    transports,
    ...params,
  };

  return cachedProfile;
}

/**
 * Override the detected device class (useful for testing or forced modes).
 */
export function setDeviceClass(deviceClass: DeviceClass): DeviceProfile {
  cachedProfile = null;
  const strategy = selectStrategy(deviceClass);
  const transports = detectTransports(deviceClass);
  const params = getProfileParams(deviceClass, strategy);

  cachedProfile = {
    deviceClass,
    strategy,
    transports,
    ...params,
  };

  return cachedProfile;
}

/**
 * Determine if a peer should be preferred as a sync target based on
 * its device class (prefer hubs > desktops > mobile > edge).
 */
export function peerPriority(deviceClass: DeviceClass): number {
  switch (deviceClass) {
    case "cloud": return 4;   // Always-on, highest priority
    case "desktop": return 3; // Full capability
    case "mobile": return 2;  // Limited
    case "edge": return 1;    // Intermittent
    default: return 0;
  }
}

/**
 * Given a set of available peers, sort by sync priority (best first).
 */
export function sortPeersByPriority<T extends { deviceClass: DeviceClass }>(
  peers: T[],
): T[] {
  return [...peers].sort((a, b) => peerPriority(b.deviceClass) - peerPriority(a.deviceClass));
}
