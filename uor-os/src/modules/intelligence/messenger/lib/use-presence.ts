/**
 * usePresence — Realtime presence + typing indicators
 * ════════════════════════════════════════════════════
 *
 * Uses Supabase Realtime Presence to track:
 *   - Online/offline status per user
 *   - Typing indicators per session (debounced 3s timeout)
 *   - Last seen timestamps
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { PresenceState } from "./types";

export function usePresence(sessionId: string | null) {
  const { user } = useAuth();
  const [peers, setPeers] = useState<Map<string, PresenceState>>(new Map());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!sessionId || !user) return;

    const channel = supabase.channel(`presence-${sessionId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ userId: string; typing: boolean; lastSeen: string }>();
        const newPeers = new Map<string, PresenceState>();

        for (const [, presences] of Object.entries(state)) {
          for (const p of presences) {
            if (p.userId !== user.id) {
              newPeers.set(p.userId, {
                userId: p.userId,
                online: true,
                typing: p.typing ?? false,
                lastSeen: p.lastSeen,
              });
            }
          }
        }

        setPeers(newPeers);
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        setPeers((prev) => {
          const next = new Map(prev);
          for (const p of leftPresences) {
            const existing = next.get((p as any).userId);
            if (existing) {
              next.set((p as any).userId, { ...existing, online: false, typing: false, lastSeen: new Date().toISOString() });
            }
          }
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: user.id,
            typing: false,
            lastSeen: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [sessionId, user]);

  /** Signal that the current user is typing. Auto-clears after 3s. */
  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!channelRef.current || !user) return;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      await channelRef.current.track({
        userId: user.id,
        typing: isTyping,
        lastSeen: new Date().toISOString(),
      });

      if (isTyping) {
        typingTimeoutRef.current = setTimeout(async () => {
          await channelRef.current?.track({
            userId: user.id,
            typing: false,
            lastSeen: new Date().toISOString(),
          });
        }, 3000);
      }
    },
    [user],
  );

  /** Get the first peer's presence state (for direct messages). */
  const peerPresence: PresenceState | null =
    peers.size > 0 ? Array.from(peers.values())[0] : null;

  return { peers, peerPresence, setTyping };
}
