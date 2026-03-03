/**
 * External Adapters — Single boundary for all host-app dependencies
 * ══════════════════════════════════════════════════════════════════
 *
 * Every import that crosses outside `src/hologram/` is registered here.
 * When migrating to a standalone repo, this is the ONLY directory
 * that needs rewriting. Everything else is self-contained.
 *
 * @module hologram/platform/adapters
 */

// ── useScreenTheme ───────────────────────────────────────────────
// Source: @/modules/hologram-ui/hooks/useScreenTheme
// Purpose: Cascading light/dark theme based on kernel desktop mode
// Migration: Replace with localStorage preference or your own theme system
export { useScreenTheme } from "@/modules/hologram-ui/hooks/useScreenTheme";
export type { ScreenTheme } from "@/modules/hologram-ui/hooks/useScreenTheme";

// ── useDataBank ──────────────────────────────────────────────────
// Source: @/modules/data-bank
// Purpose: Encrypted localStorage + cloud sync for notebook snapshots
// Migration: Replace with platform StorageAdapter (getStorage())
export { useDataBank, type DataBankHandle } from "@/modules/data-bank";
