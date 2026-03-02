/**
 * DevGate — Invisible route guard for technical/internal pages.
 * 
 * • Mobile users are ALWAYS redirected to /hologram-os (consoles aren't mobile-optimized).
 * • Desktop users without dev unlock are redirected to /hologram-os.
 * • Developers unlock access via ?dev=1 (persisted in sessionStorage).
 * 
 * Usage: <Route path="/hologram" element={<DevGate><HologramConsolePage /></DevGate>} />
 */

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const DEV_KEY = "hologram:dev";
const MOBILE_BREAKPOINT = 768;

function isDevUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(DEV_KEY) === "1";
}

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

export default function DevGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Mobile devices always get the portal — consoles aren't mobile-optimized
    if (isMobileDevice()) {
      navigate("/hologram-os", { replace: true });
      return;
    }

    // Secret unlock: ?dev=1 on any guarded route
    if (searchParams.get("dev") === "1") {
      sessionStorage.setItem(DEV_KEY, "1");
      return;
    }

    if (!isDevUnlocked()) {
      navigate("/hologram-os", { replace: true });
    }
  }, [navigate, searchParams]);

  // During the redirect frame, render nothing to avoid flash
  if (isMobileDevice() || (!isDevUnlocked() && searchParams.get("dev") !== "1")) {
    return null;
  }

  return <>{children}</>;
}
