/**
 * usePwaInstall — PWA Install Prompt Hook (Enhanced)
 * ════════════════════════════════════════════════════
 *
 * Captures `beforeinstallprompt`, detects iOS Safari,
 * persists dismiss with a 3-day cooldown, tracks visit count
 * for smart prompt timing, and exposes rich install state.
 */

import { useState, useEffect, useCallback, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "hologram-pwa-dismiss";
const VISIT_KEY = "hologram-pwa-visits";
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const SHOW_DELAY_MS = 4000; // 4s delay before showing prompt

export interface PwaInstallState {
  /** Whether the native install prompt is available (Chrome/Edge) */
  canInstall: boolean;
  /** Whether we're on iOS Safari where manual add-to-home is needed */
  isIosSafari: boolean;
  /** Whether the app is running in standalone/PWA mode */
  isStandalone: boolean;
  /** Whether the banner should be shown (respects cooldown + delay) */
  shouldShow: boolean;
  /** Whether the user dismissed the install prompt */
  dismissed: boolean;
  /** Visit count (used for prompt timing) */
  visitCount: number;
  /** Trigger the native install prompt */
  install: () => Promise<boolean>;
  /** Dismiss with cooldown persistence */
  dismiss: () => void;
}

function detectIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS|Chrome/.test(ua);
  return isIos && isSafari;
}

function isDismissCoolingDown(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    return Date.now() - ts < COOLDOWN_MS;
  } catch { return false; }
}

function getVisitCount(): number {
  try {
    const v = localStorage.getItem(VISIT_KEY);
    return v ? parseInt(v, 10) : 0;
  } catch { return 0; }
}

function incrementVisitCount(): number {
  try {
    const next = getVisitCount() + 1;
    localStorage.setItem(VISIT_KEY, String(next));
    return next;
  } catch { return 1; }
}

export function usePwaInstall(): PwaInstallState {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [dismissed, setDismissed] = useState(() => isDismissCoolingDown());
  const [delayPassed, setDelayPassed] = useState(false);
  const [visitCount] = useState(() => incrementVisitCount());

  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true);

  const isIosSafari = detectIosSafari();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      deferredPrompt.current = null;
      setCanInstall(false);
    });

    // Delay showing the prompt to avoid interrupting the first experience
    const timer = setTimeout(() => setDelayPassed(true), SHOW_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  const shouldShow =
    delayPassed &&
    !dismissed &&
    !isStandalone &&
    (canInstall || (isIosSafari && visitCount >= 2));

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt.current) return false;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    deferredPrompt.current = null;
    setCanInstall(false);
    return outcome === "accepted";
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  }, []);

  return {
    canInstall,
    isIosSafari,
    isStandalone,
    shouldShow,
    dismissed,
    visitCount,
    install,
    dismiss,
  };
}
