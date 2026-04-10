/**
 * Sovereign Spaces — Peer Discovery
 * ═════════════════════════════════════════════════════════════════
 *
 * Discovers peers across all active transports and maintains
 * a live registry of known devices and their sync heads.
 */

import { supabase } from "@/integrations/supabase/client";
import type { PeerInfo, SpaceHead } from "../types";

// ── Peer Registry ──────────────────────────────────────────────────────────

const peers = new Map<string, PeerInfo>();
let peerListeners: Array<(peers: PeerInfo[]) => void> = [];

export const peerDiscovery = {
  getPeers(): PeerInfo[] {
    return [...peers.values()];
  },

  getPeerCount(spaceId?: string): number {
    return peers.size;
  },

  subscribe(fn: (peers: PeerInfo[]) => void): () => void {
    peerListeners.push(fn);
    return () => { peerListeners = peerListeners.filter(l => l !== fn); };
  },

  registerPeer(info: PeerInfo): void {
    peers.set(info.peerId, info);
    peerListeners.forEach(fn => fn([...peers.values()]));
  },

  removePeer(peerId: string): void {
    peers.delete(peerId);
    peerListeners.forEach(fn => fn([...peers.values()]));
  },

  /**
   * Fetch all device heads for a space from the cloud.
   * This tells us how many devices are synced and their last known state.
   */
  async getSpaceDevices(spaceId: string): Promise<SpaceHead[]> {
    const { data } = await supabase
      .from("space_heads")
      .select("*")
      .eq("space_id", spaceId);

    return (data ?? []).map(r => ({
      spaceId: r.space_id,
      deviceId: r.device_id,
      userId: r.user_id,
      headCid: r.head_cid,
      updatedAt: r.updated_at,
    }));
  },

  /**
   * Subscribe to realtime head updates for a space.
   * When another device updates its head, we get notified instantly.
   */
  subscribeToSpaceHeads(
    spaceId: string,
    onUpdate: (head: SpaceHead) => void,
  ): () => void {
    const channel = supabase
      .channel(`space-heads:${spaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "space_heads",
          filter: `space_id=eq.${spaceId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row) {
            onUpdate({
              spaceId: row.space_id,
              deviceId: row.device_id,
              userId: row.user_id,
              headCid: row.head_cid,
              updatedAt: row.updated_at,
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
