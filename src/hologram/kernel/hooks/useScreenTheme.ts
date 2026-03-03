/**
 * useScreenTheme — Adapter for kernel-projected screen themes
 * ════════════════════════════════════════════════════════════
 *
 * Thin proxy to the hologram-ui hook. When migrated to a standalone
 * repo, replace this with a direct implementation or a simple
 * localStorage-based theme preference.
 *
 * @module hologram/kernel/hooks/useScreenTheme
 */

export { useScreenTheme } from "@/modules/hologram-ui/hooks/useScreenTheme";
export type { ScreenTheme } from "@/modules/hologram-ui/hooks/useScreenTheme";
