/**
 * Data Bank Box — Module Barrel Export
 * ═════════════════════════════════════
 *
 * Encrypted, content-addressed, multi-device user storage.
 * Zero-knowledge: server only sees AES-256-GCM ciphertext.
 *
 * Usage:
 *   import { useDataBank } from "@/modules/data-bank";
 *   const { get, set, sync, status } = useDataBank();
 */

export { useDataBank, type DataBankHandle } from "./hooks/useDataBank";
export { type DataBankSlot, type DataBankSyncStatus } from "./lib/sync";
export { type EncryptedPayload } from "./lib/encryption";
