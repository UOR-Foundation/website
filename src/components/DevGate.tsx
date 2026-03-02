/**
 * DevGate — Invisible route guard for technical/internal pages.
 * 
 * Regular users are seamlessly redirected to /hologram-os.
 * Developers unlock access via ?dev=1 (persisted in sessionStorage).
 * 
 * Usage: <Route path="/hologram" element={<DevGate><HologramConsolePage /></DevGate>} />
 */

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const DEV_KEY = "hologram:dev";

function isDevUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(DEV_KEY) === "1";
}

export default function DevGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Secret unlock: ?dev=1 on any guarded route
    if (searchParams.get("dev") === "1") {
      sessionStorage.setItem(DEV_KEY, "1");
      return; // allow through
    }

    if (!isDevUnlocked()) {
      navigate("/hologram-os", { replace: true });
    }
  }, [navigate, searchParams]);

  // During the redirect frame, render nothing to avoid flash
  if (!isDevUnlocked() && searchParams.get("dev") !== "1") {
    return null;
  }

  return <>{children}</>;
}
