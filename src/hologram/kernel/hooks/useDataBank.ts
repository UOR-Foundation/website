/**
 * useDataBank — Adapter for encrypted data persistence
 * ═════════════════════════════════════════════════════
 *
 * Thin proxy to the data-bank module. When migrated to a standalone
 * repo, replace this with a platform-storage-based implementation.
 *
 * @module hologram/kernel/hooks/useDataBank
 */

export { useDataBank, type DataBankHandle } from "@/modules/data-bank";
