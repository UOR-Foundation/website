/**
 * usePlatform — Detects the user's native device and provides platform-aware
 * values for shortcuts, typography, chrome styling, and interaction patterns.
 * Runs detection once; caches result in React context.
 */

import { createContext, useContext, useMemo, useEffect } from "react";
import type { ReactNode } from "react";

export type Platform = "macos" | "windows" | "linux" | "ios" | "android";

export interface PlatformInfo {
  platform: Platform;
  isMac: boolean;
  isWindows: boolean;
  isAndroid: boolean;
  isLinux: boolean;
  isTouchDevice: boolean;
  /** Display glyph for the primary modifier key */
  modKey: string;
  /** KeyboardEvent property name for the primary modifier */
  modKeyCode: "metaKey" | "ctrlKey";
  /** Display glyph for the alt/option key */
  altKey: string;
  /** Display string for the Ring chord prefix */
  ringKey: string;
  /** Platform-native system font stack */
  fontStack: string;
  /** Side for window control buttons */
  windowControls: "left" | "right";
  /** Scrollbar behavior hint */
  scrollbarStyle: "overlay" | "always";
  /** Window corner radius in px */
  cornerRadius: number;
  /** Mobile bottom-nav style hint */
  mobileNavStyle: "ios" | "material";
}

function detectPlatform(): Platform {
  // Modern API first
  const uaData = (navigator as any).userAgentData;
  if (uaData?.platform) {
    const p = uaData.platform.toLowerCase();
    if (p === "macos") return "macos";
    if (p === "windows") return "windows";
    if (p === "android") return "android";
    if (p === "ios") return "ios";
    if (p === "linux" || p === "chromeos") return "linux";
  }

  const ua = navigator.userAgent;
  const plat = navigator.platform || "";

  // iOS detection (must come before Mac since iPads report "MacIntel")
  if (/iPad|iPhone|iPod/.test(ua) || (plat === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (/Android/i.test(ua)) return "android";
  if (/Mac/i.test(plat)) return "macos";
  if (/Win/i.test(plat)) return "windows";
  return "linux"; // fallback for Linux, ChromeOS, etc.
}

function buildPlatformInfo(platform: Platform): PlatformInfo {
  const isMac = platform === "macos" || platform === "ios";
  const isWindows = platform === "windows";
  const isAndroid = platform === "android";
  const isLinux = platform === "linux";
  const isTouchDevice = platform === "ios" || platform === "android";

  const modKey = isMac ? "⌘" : "Ctrl";
  const modKeyCode: "metaKey" | "ctrlKey" = isMac ? "metaKey" : "ctrlKey";
  const altKey = isMac ? "⌥" : "Alt";
  const ringKey = isMac ? "⌘." : "Ctrl+.";

  const fontStack = isWindows
    ? "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif"
    : isMac
      ? "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
      : "system-ui, 'Ubuntu', 'Cantarell', sans-serif";

  const windowControls: "left" | "right" = isMac ? "left" : "right";
  const scrollbarStyle: "overlay" | "always" = isMac ? "overlay" : "always";
  const cornerRadius = isWindows ? 8 : isMac ? 10 : 8;
  const mobileNavStyle: "ios" | "material" = isAndroid ? "material" : "ios";

  return {
    platform, isMac, isWindows, isAndroid, isLinux, isTouchDevice,
    modKey, modKeyCode, altKey, ringKey, fontStack,
    windowControls, scrollbarStyle, cornerRadius, mobileNavStyle,
  };
}

const detected = detectPlatform();
const defaultInfo = buildPlatformInfo(detected);

const PlatformContext = createContext<PlatformInfo>(defaultInfo);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const info = useMemo(() => defaultInfo, []);

  // Set data-platform on <html> for CSS hooks
  useEffect(() => {
    document.documentElement.setAttribute("data-platform", info.platform);
    return () => { document.documentElement.removeAttribute("data-platform"); };
  }, [info.platform]);

  return (
    <PlatformContext.Provider value={info}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformInfo {
  return useContext(PlatformContext);
}
