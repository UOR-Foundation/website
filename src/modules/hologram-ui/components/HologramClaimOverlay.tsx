/**
 * HologramClaimOverlay — DEPRECATED: Redirects to MySpacePanel
 * ═════════════════════════════════════════════════════════════
 *
 * SECURITY: This overlay previously contained a parallel authentication
 * and identity creation flow — a "bug door" that bypassed the
 * vault-isolated ceremony in MySpacePanel.
 *
 * It has been sealed. All identity operations now route through the
 * single canonical entry point: MySpacePanel → CeremonyVault.
 *
 * The principle: like quantum entanglement, any additional observer
 * (entry point) collapses the security guarantee. One door in,
 * one door out.
 */

import { useEffect } from "react";

interface HologramClaimOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function HologramClaimOverlay({ open, onClose }: HologramClaimOverlayProps) {
  useEffect(() => {
    if (open) {
      // Seal this entry point — redirect to canonical MySpace gateway
      console.warn(
        "[SecuritySeal] HologramClaimOverlay intercepted — redirecting to canonical identity gateway (MySpacePanel). " +
        "Parallel auth paths are sealed to prevent observer-collapse violations."
      );
      onClose();
    }
  }, [open, onClose]);

  return null;
}
