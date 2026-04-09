import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/**
 * Environment detection — skip PWA service workers in iframes / editor previews.
 */
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isEditorPreview =
  typeof window !== "undefined" &&
  window.location.hostname.includes("id-preview--");

const shouldSkipPWA = isInIframe || isEditorPreview;

if (shouldSkipPWA && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

/**
 * Cross-Origin Isolation bootstrap.
 *
 * The unified service worker (custom-sw.ts) injects COOP/COEP headers on
 * every navigation response. After its first install we need one reload for
 * the headers to take effect. On subsequent visits the headers are already
 * present and SharedArrayBuffer is immediately available.
 */
function ensureCrossOriginIsolation(): void {
  if (typeof window === "undefined") return;

  if (window.crossOriginIsolated) {
    console.log("[COI] Cross-origin isolated ✓ — SharedArrayBuffer available");
    return;
  }

  if (isInIframe) {
    console.log("[COI] Running inside iframe — SAB unavailable (parent controls isolation).");
    return;
  }

  if (!("serviceWorker" in navigator)) {
    console.log("[COI] No Service Worker support — SAB unavailable.");
    return;
  }

  // If a SW is active but not yet controlling this page, one reload activates it
  navigator.serviceWorker.ready.then(() => {
    if (!window.crossOriginIsolated && navigator.serviceWorker.controller) {
      // Controller is present but isolation not achieved — headers will be
      // injected on the *next* navigation. Reload once.
      console.log("[COI] Service worker active — reloading for isolation…");
      location.reload();
    }
  });
}

ensureCrossOriginIsolation();
createRoot(document.getElementById("root")!).render(<App />);
