import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/**
 * Register the COI (Cross-Origin Isolation) service worker BEFORE the app
 * renders. This worker injects COOP/COEP headers on navigation responses,
 * enabling `crossOriginIsolated = true` which unlocks SharedArrayBuffer
 * for zero-copy worker↔main thread transfers.
 *
 * On first load the SW installs → page auto-reloads → second load has
 * SAB available. The reload only happens once (when COI isn't active yet
 * and the SW isn't controlling the page).
 */
if ("serviceWorker" in navigator) {
  // Check if we need the COI shim (skip if headers are already set by host)
  if (!window.crossOriginIsolated) {
    navigator.serviceWorker
      .register("/coi-serviceworker.js")
      .then((reg) => {
        console.log("[COI] Service worker registered, scope:", reg.scope);
        // If the SW is newly installed and not yet controlling this page, reload
        // so the next navigation goes through the SW and gets the headers.
        if (reg.installing && !navigator.serviceWorker.controller) {
          reg.installing.addEventListener("statechange", (e) => {
            if ((e.target as ServiceWorker).state === "activated") {
              console.log("[COI] Reloading to enable cross-origin isolation…");
              location.reload();
            }
          });
        }
      })
      .catch((err) => {
        console.warn("[COI] Service worker registration failed:", err);
      });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
