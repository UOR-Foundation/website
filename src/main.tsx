import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./modules/core/styles/transitions.css";

// Defensive cleanup: unregister any previously-installed service workers
// from earlier PWA builds so they cannot intercept navigation in preview.
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  }).catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);

// Lazy-load non-critical font weights on idle to keep first paint snappy.
const loadDeferredFonts = () => {
  import("@fontsource/playfair-display/400.css");
  import("@fontsource/playfair-display/500.css");
  import("@fontsource/playfair-display/600.css");
  import("@fontsource/dm-sans/500.css");
  import("@fontsource/dm-sans/600.css");
};
if (typeof window !== "undefined") {
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(loadDeferredFonts, { timeout: 2000 });
  } else {
    setTimeout(loadDeferredFonts, 1500);
  }
}
