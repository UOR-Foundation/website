/**
 * Data Bank Box — Module Barrel Export
 * ═════════════════════════════════════
 *
 * Encrypted, content-addressed, multi-device user storage.
 * Zero-knowledge: server only sees AES-256-GCM ciphertext.
 */

export { useDataBank, type DataBankHandle } from "./hooks/useDataBank";
export { type DataBankSlot, type DataBankSyncStatus } from "./lib/sync";
export { type EncryptedPayload } from "./lib/encryption";
export {
  compressTriples,
  decompressTriples,
  compressToBase64,
  decompressFromBase64,
  type CompressibleTriple,
  type CompressionStats,
} from "./lib/graph-compression";
