import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/**
 * Iframe / preview-host guard.
 * Service workers inside Lovable's preview iframe cause stale caching
 * and navigation interference. Detect and bail early.
 */
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  typeof window !== "undefined" &&
  window.location.hostname.includes("id-preview--");

const shouldSkipSW = isInIframe || isPreviewHost;

// Unregister stale service workers in preview contexts
if (shouldSkipSW && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

/**
 * Cross-Origin Isolation bootstrap.
 *
 * SharedArrayBuffer requires `crossOriginIsolated === true`, which needs
 * COOP: same-origin + COEP: credentialless headers on the document response.
 *
 * Solution: register a lightweight service worker that intercepts navigation
 * responses and injects the headers. On first visit, the SW installs →
 * the page reloads once → subsequent loads have SAB available.
 */
async function ensureCrossOriginIsolation(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (shouldSkipSW) return;

  if (window.crossOriginIsolated) {
    console.log("[COI] Cross-origin isolated ✓ — SharedArrayBuffer available");
    return;
  }

  try {
    const reg = await navigator.serviceWorker.register("/coi-serviceworker.js");
    console.log("[COI] Service worker registered, scope:", reg.scope);

    if (!navigator.serviceWorker.controller) {
      const sw = reg.installing || reg.waiting;
      if (sw) {
        await new Promise<void>((resolve) => {
          sw.addEventListener("statechange", () => {
            if (sw.state === "activated") resolve();
          });
          setTimeout(resolve, 3000);
        });
        console.log("[COI] Reloading to enable cross-origin isolation…");
        location.reload();
        return;
      }
    }
  } catch (err) {
    console.warn("[COI] Service worker registration failed:", err);
  }
}

// Single render path
ensureCrossOriginIsolation().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
