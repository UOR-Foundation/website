import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/**
 * Cross-Origin Isolation bootstrap.
 *
 * SharedArrayBuffer requires `crossOriginIsolated === true`, which needs
 * COOP: same-origin + COEP: credentialless headers on the document response.
 * Many hosting platforms (including Lovable) don't serve these headers.
 *
 * Solution: register a lightweight service worker that intercepts navigation
 * responses and injects the headers. On first visit, the SW installs →
 * the page reloads once → subsequent loads have SAB available.
 *
 * This runs BEFORE React renders to ensure the reload happens immediately
 * rather than after the entire app has mounted.
 */
async function ensureCrossOriginIsolation(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  // Already isolated — nothing to do
  if (window.crossOriginIsolated) {
    console.log("[COI] Cross-origin isolated ✓ — SharedArrayBuffer available");
    return;
  }

  try {
    const reg = await navigator.serviceWorker.register("/coi-serviceworker.js");
    console.log("[COI] Service worker registered, scope:", reg.scope);

    // If the SW just installed and isn't controlling this page yet,
    // wait for it to activate then reload so headers take effect.
    if (!navigator.serviceWorker.controller) {
      const sw = reg.installing || reg.waiting;
      if (sw) {
        await new Promise<void>((resolve) => {
          sw.addEventListener("statechange", () => {
            if (sw.state === "activated") resolve();
          });
          // Safety timeout — don't block the app forever
          setTimeout(resolve, 3000);
        });
        console.log("[COI] Reloading to enable cross-origin isolation…");
        location.reload();
        // The reload will navigate away; returning prevents double-render
        return;
      }
    }
  } catch (err) {
    console.warn("[COI] Service worker registration failed:", err);
  }
}

// Run COI bootstrap, then render regardless
ensureCrossOriginIsolation().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});

createRoot(document.getElementById("root")!).render(<App />);
