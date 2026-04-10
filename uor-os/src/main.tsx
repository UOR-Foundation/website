import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./modules/core/styles/transitions.css";

/**
 * Environment detection — skip PWA service workers in iframes / editor previews.
 */
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
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
 */
const COI_RELOAD_KEY = "coi-reload-attempted";

function ensureCrossOriginIsolation(): void {
  if (typeof window === "undefined") return;
  if (window.crossOriginIsolated) {
    console.log("[COI] Cross-origin isolated ✓");
    sessionStorage.removeItem(COI_RELOAD_KEY);
    return;
  }
  if (isInIframe) return;
  if (!("serviceWorker" in navigator)) return;

  const alreadyReloaded = sessionStorage.getItem(COI_RELOAD_KEY);
  if (alreadyReloaded) return;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!window.crossOriginIsolated) {
      sessionStorage.setItem(COI_RELOAD_KEY, "1");
      location.reload();
    }
  });

  if (navigator.serviceWorker.controller) {
    sessionStorage.setItem(COI_RELOAD_KEY, "1");
    location.reload();
    return;
  }
}

ensureCrossOriginIsolation();
createRoot(document.getElementById("root")!).render(<App />);
