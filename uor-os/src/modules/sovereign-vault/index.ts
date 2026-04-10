/**
 * Sovereign Context Vault — Zero-Knowledge Private File Aggregation
 * ══════════════════════════════════════════════════════════════════
 *
 * Every file is content-addressed via UOR, encrypted client-side,
 * and stored in the user's private vault. The server never sees plaintext.
 *
 * @module sovereign-vault
 */

export { useVault } from "./hooks/useVault";
export { chunkText } from "./lib/chunker";
export { extractText } from "./lib/extract";
export { vaultStore } from "./lib/vault-store";
export { searchVault } from "./lib/vault-search";
export { projectDocuments } from "./lib/project-documents";
export type { VaultDocument, VaultChunk, VaultSearchResult } from "./lib/types";
