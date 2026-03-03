/**
 * CeremonyPage — SEALED: Redirects to MySpace canonical gateway
 * ═══════════════════════════════════════════════════════════════
 *
 * SECURITY SEAL: This page previously contained a parallel ceremony
 * path that bypassed the vault-isolated founding ceremony in MySpacePanel.
 *
 * All identity creation now routes through the single canonical entry:
 * MySpacePanel → CeremonyVault (7-layer isolation).
 *
 * Quantum principle: multiple observation points collapse entanglement.
 * One door in, one door out.
 */

import { useEffect } from "react";
import { useNavigate } from "../../platform/bridge";

export default function CeremonyPage() {
  const navigate = useNavigate();

  useEffect(() => {
    console.warn(
      "[SecuritySeal] /ceremony route intercepted — redirecting to canonical identity gateway. " +
      "Parallel ceremony paths are sealed to prevent observer-collapse violations."
    );
    navigate("/hologram-os", { replace: true });
  }, [navigate]);

  return null;
}
