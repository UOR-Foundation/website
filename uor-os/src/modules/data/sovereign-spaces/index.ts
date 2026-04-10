/**
 * Sovereign Spaces — Module Index
 * ═════════════════════════════════════════════════════════════════
 */

export { spaceManager } from "./space-manager";
export { peerDiscovery } from "./sync/peer-discovery";
export { createTransports } from "./sync/transport";
export {
  createChange, pushChanges, pullChanges,
  announceHead, getSpaceHeads, mergeChanges,
  computeHead, getLocalHead,
} from "./sync/change-dag";
export { deriveSpaceKey, encryptPayload, decryptPayload, generateSpaceSecret } from "./space-keys";
export type * from "./types";
