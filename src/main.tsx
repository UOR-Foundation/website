import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/**
 * Environment detection — separate concerns for PWA vs COI service workers.
 */
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

/** True only for Lovable's ephemeral editor preview subdomains */
const isEditorPreview =
  typeof window !== "undefined" &&
  window.location.hostname.includes("id-preview--");

/**
 * PWA / caching service workers should NOT run inside the editor iframe
 * or ephemeral previews — they cause stale caching and nav interference.
 */
const shouldSkipPWA = isInIframe || isEditorPreview;

if (shouldSkipPWA && "serviceWorker" in navigator) {
  // Only unregister PWA workers, preserve COI worker
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => {
      const swUrl = r.active?.scriptURL || r.installing?.scriptURL || "";
      // Keep the COI service worker alive
      if (!swUrl.includes("coi-serviceworker")) {
        r.unregister();
      }
    });
  });
}

/**
 * Cross-Origin Isolation bootstrap — enables SharedArrayBuffer.
 *
 * Strategy:
 *  1. If already isolated (server headers or prior SW), done.
 *  2. If in iframe, SAB can't work (parent must also be isolated) — skip gracefully.
 *  3. Otherwise register the COI service worker to inject COOP/COEP headers.
 *  4. On mobile browsers that don't support service workers or COI, fall back silently.
 *
 * The COI SW only intercepts navigation requests to add headers — it does NOT
 * cache anything and is safe to run alongside PWA workers.
 */
async function ensureCrossOriginIsolation(): Promise<void> {
  if (typeof window === "undefined") return;

  // Already isolated — nothing to do
  if (window.crossOriginIsolated) {
    console.log("[COI] Cross-origin isolated ✓ — SharedArrayBuffer available");
    return;
  }

  // In iframe: parent document controls isolation; we can't fix it from here
  if (isInIframe) {
    console.log(
      "[COI] Running inside iframe — SharedArrayBuffer unavailable (parent controls isolation). " +
      "Using Transferable ArrayBuffer fallback."
    );
    return;
  }

  // No service worker support (rare, but possible on some mobile browsers)
  if (!("serviceWorker" in navigator)) {
    console.log("[COI] No Service Worker support — SharedArrayBuffer unavailable. Using fallback.");
    return;
  }

  try {
    // Check for existing COI registration first
    const existing = await navigator.serviceWorker.getRegistration("/coi-serviceworker.js");
    
    if (existing?.active && !navigator.serviceWorker.controller) {
      // SW is active but not controlling — need reload
      console.log("[COI] Service worker active but not controlling — reloading…");
      location.reload();
      return;
    }

    if (!existing) {
      const reg = await navigator.serviceWorker.register("/coi-serviceworker.js");
      console.log("[COI] Service worker registered, scope:", reg.scope);

      const sw = reg.installing || reg.waiting;
      if (sw) {
        await new Promise<void>((resolve) => {
          sw.addEventListener("statechange", () => {
            if (sw.state === "activated") resolve();
          });
          // Safety timeout — don't hang forever
          setTimeout(resolve, 4000);
        });

        if (!window.crossOriginIsolated) {
          console.log("[COI] Reloading to enable cross-origin isolation…");
          location.reload();
          return;
        }
      }
    }

    // Final check
    if (window.crossOriginIsolated) {
      console.log("[COI] Cross-origin isolated ✓ — SharedArrayBuffer available");
    } else {
      console.log(
        "[COI] Service worker active but isolation not achieved. " +
        "This can happen if the browser doesn't support COEP:credentialless. " +
        "Using Transferable ArrayBuffer fallback."
      );
    }
  } catch (err) {
    console.warn("[COI] Service worker registration failed:", err);
    console.log("[COI] Using Transferable ArrayBuffer fallback.");
  }
}

// Boot: attempt COI, then render regardless
ensureCrossOriginIsolation().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
