import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./modules/core/styles/transitions.css";

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
 * every navigation response. The flow is:
 *
 *   1. First visit: SW registers, activates, calls clients.claim()
 *   2. `controllerchange` fires → we reload once through the SW
 *   3. SW intercepts the navigation, injects COOP/COEP headers
 *   4. Page loads with crossOriginIsolated === true → SAB available
 *
 * A sessionStorage guard prevents infinite reload loops.
 */
const COI_RELOAD_KEY = "coi-reload-attempted";

function ensureCrossOriginIsolation(): void {
  if (typeof window === "undefined") return;

  // Already isolated — nothing to do
  if (window.crossOriginIsolated) {
    console.log("[COI] Cross-origin isolated ✓ — SharedArrayBuffer available");
    sessionStorage.removeItem(COI_RELOAD_KEY);
    return;
  }

  // Inside an iframe — parent controls isolation, we can't fix it
  if (isInIframe) {
    console.log("[COI] Running inside iframe — SAB unavailable (parent controls isolation).");
    return;
  }

  if (!("serviceWorker" in navigator)) {
    console.log("[COI] No Service Worker support — SAB unavailable.");
    return;
  }

  // Check if we already tried a reload this session
  const alreadyReloaded = sessionStorage.getItem(COI_RELOAD_KEY);
  if (alreadyReloaded) {
    console.warn(
      "[COI] Already reloaded once this session but isolation not achieved. " +
      "SharedArrayBuffer unavailable — using Transferable ArrayBuffer fallback."
    );
    return;
  }

  // Listen for `controllerchange` — this fires when clients.claim() completes
  // in the SW, meaning our page now has a controller that will inject headers
  // on the next navigation.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!window.crossOriginIsolated) {
      console.log("[COI] Service worker took control — reloading for isolation…");
      sessionStorage.setItem(COI_RELOAD_KEY, "1");
      location.reload();
    }
  });

  // If a controller already exists (SW was installed on a previous visit)
  // but we're not isolated, we need one reload for headers to take effect.
  if (navigator.serviceWorker.controller) {
    console.log("[COI] SW controller present but not isolated — reloading…");
    sessionStorage.setItem(COI_RELOAD_KEY, "1");
    location.reload();
    return;
  }

  // No controller yet — the SW will be registered by VitePWA's auto-register.
  // Once it activates and calls clients.claim(), the `controllerchange`
  // listener above will trigger the reload.
  console.log("[COI] Waiting for service worker to claim this page…");
}

ensureCrossOriginIsolation();
createRoot(document.getElementById("root")!).render(<App />);
