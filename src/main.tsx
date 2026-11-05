import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import CrashScreen from "./site/CrashScreen";
import "./index.css";
import "./analytics";

createRoot(document.getElementById("root")!).render(
  <CrashScreen>
    <App />
  </CrashScreen>,
);
