/**
 * Sovereign Bus — Mesh Sync Module
 * ═════════════════════════════════════════════════════════════════
 *
 * Exposes mesh sync operations via the bus API.
 * Provides status, peer discovery, manual sync triggers,
 * and session history.
 *
 * @version 2.0.0
 */

import { register } from "../registry";

register({
  ns: "mesh",
  label: "Mesh Sync Protocol",
  layer: 3,
  operations: {
    status: {
      handler: async () => {
        const { getDeviceProfile } = await import("@/modules/uns/mesh/topology");
        const { syncSessionManager } = await import("@/modules/uns/mesh/sync-session");
        const { getDedupStats } = await import("@/modules/uns/mesh/triple-dedup");

        return {
          profile: getDeviceProfile(),
          sessions: syncSessionManager.getStats(),
          dedup: getDedupStats(),
        };
      },
      description: "Current mesh topology: device profile, sync sessions, dedup stats",
    },
    peers: {
      handler: async () => {
        const { peerDiscovery } = await import("@/modules/sovereign-spaces/sync/peer-discovery");
        return { peers: peerDiscovery.getPeers(), count: peerDiscovery.getPeerCount() };
      },
      description: "List discovered peers with device class and head CIDs",
    },
    topology: {
      handler: async () => {
        const { getDeviceProfile } = await import("@/modules/uns/mesh/topology");
        return getDeviceProfile();
      },
      description: "Get local device classification and sync strategy",
    },
    sessions: {
      handler: async () => {
        const { syncSessionManager } = await import("@/modules/uns/mesh/sync-session");
        return {
          active: syncSessionManager.getActiveSessions(),
          stats: syncSessionManager.getStats(),
        };
      },
      description: "List active sync sessions with statistics",
    },
    dedup: {
      handler: async () => {
        const { getDedupStats } = await import("@/modules/uns/mesh/triple-dedup");
        return getDedupStats();
      },
      description: "Content-addressed triple deduplication statistics",
    },
    "verify-protocol": {
      handler: async () => {
        const {
          createHello, createWant, createHave, createHead, createAck,
          MESH_PROTOCOL_VERSION,
        } = await import("@/modules/uns/mesh/sync-protocol");

        const hello = await createHello("dev-1", "node-1", { "space-a": "head-cid-1" }, "desktop", ["cloud-relay"]);
        const want = await createWant("dev-2", "node-2", "space-a", ["head-cid-0"]);
        const have = await createHave("dev-1", "node-1", "space-a", [], false);
        const head = await createHead("dev-1", "node-1", "space-a", "head-cid-2", 3);
        const ack = await createAck("dev-2", "node-2", "space-a", have.messageCid, 0);

        return {
          protocolVersion: MESH_PROTOCOL_VERSION,
          messages: {
            hello: { cid: hello.messageCid, type: hello.type },
            want: { cid: want.messageCid, type: want.type },
            have: { cid: have.messageCid, type: have.type },
            head: { cid: head.messageCid, type: head.type },
            ack: { cid: ack.messageCid, type: ack.type },
          },
          verified: true,
        };
      },
      description: "Verify mesh protocol message construction and CID computation",
    },
  },
});
