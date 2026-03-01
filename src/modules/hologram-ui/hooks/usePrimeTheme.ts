/**
 * usePrimeTheme — Theme Toggle Hook
 * ══════════════════════════════════
 *
 * Subscribes to the global theme state and triggers re-renders.
 *
 * @module hologram-prime/hooks/usePrimeTheme
 */

import { useState, useEffect, useCallback } from "react";
import { getPrimeTheme, setPrimeTheme, onThemeChange, type PrimeTheme } from "@/modules/hologram-ui/theme/prime-palette";

export function usePrimeTheme() {
  const [theme, setTheme] = useState<PrimeTheme>(getPrimeTheme);

  useEffect(() => {
    return onThemeChange(setTheme);
  }, []);

  const toggle = useCallback(() => {
    setPrimeTheme(theme === "dark" ? "light" : "dark");
  }, [theme]);

  const set = useCallback((t: PrimeTheme) => {
    setPrimeTheme(t);
  }, []);

  return { theme, toggle, set, isDark: theme === "dark" };
}
