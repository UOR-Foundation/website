/**
 * usePwaInstall — PWA Install Prompt Hook
 * ═══════════════════════════════════════
 *
 * Captures the `beforeinstallprompt` event and exposes
 * install state for the Hologram OS shell.
 */

import { useState, useEffect, useCallback, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface PwaInstallState {
  /** Whether the app can be installed (prompt available) */
  canInstall: boolean;
  /** Whether the app is already running in standalone/PWA mode */
  isStandalone: boolean;
  /** Whether the user dismissed the install prompt this session */
  dismissed: boolean;
  /** Trigger the native install prompt */
  install: () => Promise<boolean>;
  /** Dismiss the install suggestion for this session */
  dismiss: () => void;
}

export function usePwaInstall(): PwaInstallState {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Detect if installed after prompt
    window.addEventListener("appinstalled", () => {
      deferredPrompt.current = null;
      setCanInstall(false);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

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
  }, []);

  return { canInstall, isStandalone, dismissed, install, dismiss };
}
