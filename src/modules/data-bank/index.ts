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
export {
  diffObjects,
  snapshotToTriples,
  deltaToTriples,
  applyDelta,
  reconstructChain,
  compressSessionChain,
  decompressSessionChain,
  DELTA_PREDICATES,
  type DeltaChainStats,
} from "./lib/delta-compression";
export {
  assembleFusionGraph,
  persistFusionGraph,
  loadFusionGraph,
  fusionToContextBlock,
  getFusionContextBlock,
  projectAudio,
  projectProofs,
  projectMemories,
  projectContext,
  type FusionGraphStats,
  type FusionGraphResult,
} from "./lib/fusion-graph";
export {
  ingestAudioTracks,
  ingestAudioFeatures,
  ingestMemories,
  ingestProofs,
  ingestCheckpoints,
  ingestRelationships,
  unionTriples,
  type AudioTrackInput,
  type AudioFeatureInput,
  type MemoryInput,
  type ReasoningProofInput,
  type ProofStepInput,
  type SessionCheckpointInput,
  type RelationshipInput,
} from "./lib/ingesters";
