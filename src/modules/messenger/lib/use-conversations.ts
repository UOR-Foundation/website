/**
 * useConversations — fetches conduit_sessions, resolves peer profiles
 * via get_peer_profiles RPC, subscribes to realtime.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Conversation } from "./types";

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) { setConversations([]); setLoading(false); return; }

    const { data: sessions, error } = await supabase
      .from("conduit_sessions")
      .select("id, session_hash, session_type, created_at, participants, revoked_at, expires_after_seconds")
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (error || !sessions) { setLoading(false); return; }

    // Collect peer user IDs
    const peerIds = new Set<string>();
    for (const s of sessions) {
      for (const p of (s.participants as string[])) {
        if (p !== user.id) peerIds.add(p);
      }
    }

    // Batch-fetch peer profiles via SECURITY DEFINER function
    const profileMap = new Map<string, { displayName: string; handle: string | null; avatarUrl: string | null; uorGlyph: string | null }>();

    if (peerIds.size > 0) {
      const { data: profiles } = await supabase.rpc("get_peer_profiles", {
        peer_ids: Array.from(peerIds),
      });

      if (profiles) {
        for (const p of profiles as any[]) {
          profileMap.set(p.user_id, {
            displayName: p.display_name ?? "User",
            handle: p.handle,
            avatarUrl: p.avatar_url,
            uorGlyph: p.uor_glyph,
          });
        }
      }
    }

    // Build conversations with latest message
    const convos: Conversation[] = [];
    for (const s of sessions) {
      const participants = s.participants as string[];
      const peerId = participants.find((p: string) => p !== user.id) ?? participants[0];
      const peer = profileMap.get(peerId) ?? { displayName: "User", handle: null, avatarUrl: null, uorGlyph: null };

      const { data: latestMsgs } = await supabase
        .from("encrypted_messages")
        .select("id, sender_id, ciphertext, created_at, message_hash, envelope_cid, message_type")
        .eq("session_id", s.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const lastMsg = latestMsgs?.[0] as any;

      // Count unread (messages from peer without read_at)
      const { count: unreadCount } = await supabase
        .from("encrypted_messages")
        .select("id", { count: "exact", head: true })
        .eq("session_id", s.id)
        .neq("sender_id", user.id)
        .is("read_at", null);

      convos.push({
        id: s.id,
        sessionHash: s.session_hash,
        sessionType: s.session_type as "direct" | "group",
        createdAt: s.created_at,
        expiresAfterSeconds: (s as any).expires_after_seconds,
        peer: { userId: peerId, ...peer },
        lastMessage: lastMsg ? {
          plaintext: lastMsg.message_type === "file" ? "📎 File" :
                     lastMsg.message_type === "image" ? "📷 Image" :
                     lastMsg.message_type === "voice" ? "🎤 Voice" :
                     "Encrypted message",
          sentByMe: lastMsg.sender_id === user.id,
          createdAt: lastMsg.created_at,
          messageType: lastMsg.message_type,
        } : undefined,
        unread: unreadCount ?? 0,
      });
    }

    setConversations(convos);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("messenger-sessions")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "conduit_sessions",
      }, () => fetchConversations())
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "encrypted_messages",
      }, () => fetchConversations())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
}
