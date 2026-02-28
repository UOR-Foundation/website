/**
 * useShortcutMastery — Kernel-projected shortcut learning analytics
 * ═══════════════════════════════════════════════════════════════════
 *
 * Thin projection layer over KernelConfig.shortcutMastery.
 * The kernel is the single source of truth — this hook just
 * exposes the syscalls in a convenient API shape.
 *
 * No localStorage access — all state flows through kernel:config.
 */

import { useCallback } from "react";
import { useKernel } from "@/modules/hologram-os/hooks/useKernel";

export function useShortcutMastery() {
  const k = useKernel();

  /** Record that the user just used a shortcut (kernel syscall) */
  const record = useCallback((key: string) => {
    k.recordShortcut(key);
  }, [k.recordShortcut]);

  /** Get the opacity multiplier for a hint (1 = learning, 0 = mastered) */
  const hintOpacity = useCallback((key: string): number => {
    return k.shortcutHintOpacity(key);
  }, [k.shortcutHintOpacity]);

  /** Whether a shortcut is fully mastered */
  const isMastered = useCallback((key: string): boolean => {
    return k.isShortcutMastered(key);
  }, [k.isShortcutMastered]);

  return { record, hintOpacity, isMastered };
}
