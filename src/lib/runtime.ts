/**
 * UOR Runtime Detection Layer
 * ═══════════════════════════════════════════════════════════════
 *
 * Thin abstraction that lets the entire app behave correctly
 * regardless of whether it's running in:
 *   - Browser (PWA / standard web)
 *   - Tauri (native desktop shell)
 *   - Mobile (Tauri mobile / PWA)
 *
 * Import `runtime` from anywhere to branch on the execution context.
 *
 * @layer 0
 */

// ── Tauri type augmentation ─────────────────────────────────────────────

declare global {
  interface Window {
    __TAURI__?: {
      core?: {
        invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
    };
    __TAURI_INTERNALS__?: unknown;
  }
}

// ── Types ───────────────────────────────────────────────────────────────

export type RuntimeType = "tauri" | "browser" | "mobile-pwa";
export type StorageBackend = "sqlite" | "indexeddb" | "hybrid";

export interface PlatformInfo {
  runtime: RuntimeType;
  os: string;
  arch: string;
  hostname: string;
  deviceId: string;
  storageBackend: StorageBackend;
  version: string;
}

// ── Detection ───────────────────────────────────────────────────────────

/** True when running inside a Tauri native shell */
export function isLocal(): boolean {
  return typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;
}

/** True when running in a standard browser (no Tauri) */
export function isWeb(): boolean {
  return !isLocal();
}

/** True on mobile (touch-primary + small viewport OR Tauri mobile) */
export function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const narrow = window.innerWidth < 768;
  return touch && narrow;
}

/** True when running inside an iframe (editor preview) */
export function isPreview(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

// ── Storage Backend ─────────────────────────────────────────────────────

export function getStorageBackend(): StorageBackend {
  if (isLocal()) return "sqlite";
  return "indexeddb";
}

// ── Platform Info ───────────────────────────────────────────────────────

let _cachedPlatform: PlatformInfo | null = null;

/**
 * Retrieve full platform info.
 * When running in Tauri, calls the native `get_platform_info` IPC command
 * for accurate OS/arch/hostname. In browser, infers from navigator.
 */
export async function getPlatformInfo(): Promise<PlatformInfo> {
  if (_cachedPlatform) return _cachedPlatform;

  if (isLocal() && window.__TAURI__?.core) {
    try {
      const native = await window.__TAURI__.core.invoke<{
        runtime: string;
        os: string;
        arch: string;
        hostname: string;
        device_id: string;
      }>("get_platform_info");

      _cachedPlatform = {
        runtime: "tauri",
        os: native.os,
        arch: native.arch,
        hostname: native.hostname,
        deviceId: native.device_id,
        storageBackend: "sqlite",
        version: "2.0.0",
      };
      return _cachedPlatform;
    } catch {
      // Fall through to browser detection
    }
  }

  // Browser fallback
  const ua = navigator.userAgent;
  const os = ua.includes("Mac") ? "macos"
    : ua.includes("Win") ? "windows"
    : ua.includes("Linux") ? "linux"
    : ua.includes("Android") ? "android"
    : ua.includes("iPhone") ? "ios"
    : "unknown";

  let deviceId = localStorage.getItem("uor:device-id");
  if (!deviceId) {
    deviceId = `browser-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem("uor:device-id", deviceId);
  }

  _cachedPlatform = {
    runtime: isMobile() ? "mobile-pwa" : "browser",
    os,
    arch: "wasm",
    hostname: window.location.hostname,
    deviceId,
    storageBackend: "indexeddb",
    version: "2.0.0",
  };
  return _cachedPlatform;
}

// ── Tauri IPC Bridge ────────────────────────────────────────────────────

/**
 * Call a Tauri IPC command. No-ops gracefully in browser context.
 * Returns `undefined` if not running in Tauri.
 */
export async function invoke<T = unknown>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T | undefined> {
  if (!isLocal() || !window.__TAURI__?.core) return undefined;
  return window.__TAURI__.core.invoke<T>(cmd, args);
}

// ── Convenience singleton ───────────────────────────────────────────────

export const runtime = {
  isLocal,
  isWeb,
  isMobile,
  isPreview,
  getStorageBackend,
  getPlatformInfo,
  invoke,
} as const;
