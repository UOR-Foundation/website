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
