/**
 * UNS Mesh. BGP Content Orbit Routing, Node Orchestrator & Mesh Sync (Phase 4-C)
 */

export {
  canonicalIdToOrbitPrefix,
  canonicalIdToBgpCommunity,
  bgpCommunityToOrbitPrefix,
  buildRouteAnnouncements,
  ANYCAST_RESOLVER,
  ANYCAST_DOH,
  ANYCAST_DHT_BOOTSTRAP,
} from "./bgp";

export type { OrbitRouteAnnouncement } from "./bgp";

export { UnsNode } from "./node";
export type { UnsNodeConfig, ServiceStatus, HealthResponse } from "./node";

// ── Mesh Sync Protocol ──────────────────────────────────────────────────────

export {
  type MeshMessage,
  type MeshMessageType,
  type HelloMessage,
  type WantMessage,
  type HaveMessage,
  type HeadMessage,
  type AckMessage,
  type DeviceClass,
  createHello,
  createWant,
  createHave,
  createHead,
  createAck,
  isValidMessage,
  markSeen,
  tickLamport,
  receiveLamport,
  currentLamport,
  MESH_PROTOCOL_VERSION,
  MAX_CHANGES_PER_HAVE,
  HELLO_INTERVAL_MS,
  PEER_TIMEOUT_MS,
  SYNC_DEBOUNCE_MS,
} from "./sync-protocol";

export { MeshSyncService, type SyncServiceConfig } from "./sync-service";
export { syncSessionManager, type SyncSessionState, type SessionPhase } from "./sync-session";
export {
  tripleCid,
  payloadTripleCid,
  applyWithDedup,
  detectConflicts,
  getDedupStats,
  getDedupIndex,
  clearDedupIndex,
  type DedupResult,
} from "./triple-dedup";
export {
  getDeviceProfile,
  setDeviceClass,
  peerPriority,
  sortPeersByPriority,
  type DeviceProfile,
  type SyncStrategy,
} from "./topology";
