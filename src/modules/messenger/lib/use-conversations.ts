/**
 * useConversations — fetches conduit_sessions, resolves peer profiles
 * via get_peer_profiles RPC, subscribes to realtime.
 * Supports both direct and group conversations.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Conversation, GroupMember, GroupMeta, ConversationSettings } from "./types";

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

    // Collect all user IDs we need profiles for
    const allUserIds = new Set<string>();
    for (const s of sessions) {
      for (const p of (s.participants as string[])) {
        if (p !== user.id) allUserIds.add(p);
      }
    }

    // Batch-fetch peer profiles via SECURITY DEFINER function
    const profileMap = new Map<string, { displayName: string; handle: string | null; avatarUrl: string | null; uorGlyph: string | null }>();

    if (allUserIds.size > 0) {
      const { data: profiles } = await supabase.rpc("get_peer_profiles", {
        peer_ids: Array.from(allUserIds),
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

    // Fetch group metadata for group sessions
    const groupSessionIds = sessions.filter(s => s.session_type === "group").map(s => s.id);
    const groupMetaMap = new Map<string, GroupMeta>();
    const groupMembersMap = new Map<string, GroupMember[]>();

    if (groupSessionIds.length > 0) {
      const { data: groupMeta } = await supabase
        .from("group_metadata")
        .select("session_id, name, description, avatar_url, created_by, is_public")
        .in("session_id", groupSessionIds);

      if (groupMeta) {
        for (const gm of groupMeta as any[]) {
          groupMetaMap.set(gm.session_id, {
            name: gm.name,
            description: gm.description,
            avatarUrl: gm.avatar_url,
            createdBy: gm.created_by,
            isPublic: gm.is_public,
          });
        }
      }

      const { data: groupMembers } = await supabase
        .from("group_members")
        .select("session_id, user_id, role, joined_at, invited_by, muted_until")
        .in("session_id", groupSessionIds);

      if (groupMembers) {
        for (const gm of groupMembers as any[]) {
          const list = groupMembersMap.get(gm.session_id) ?? [];
          const profile = profileMap.get(gm.user_id);
          list.push({
            userId: gm.user_id,
            role: gm.role as "admin" | "member",
            joinedAt: gm.joined_at,
            invitedBy: gm.invited_by,
            mutedUntil: gm.muted_until,
            displayName: gm.user_id === user.id ? "You" : (profile?.displayName ?? "User"),
            handle: profile?.handle ?? null,
            avatarUrl: profile?.avatarUrl ?? null,
            uorGlyph: profile?.uorGlyph ?? null,
          });
          groupMembersMap.set(gm.session_id, list);
        }
      }
    }

    // Fetch conversation settings
    const { data: settingsData } = await supabase
      .from("conversation_settings")
      .select("session_id, pinned, muted_until, archived")
      .eq("user_id", user.id);

    const settingsMap = new Map<string, ConversationSettings>();
    if (settingsData) {
      for (const s of settingsData as any[]) {
        settingsMap.set(s.session_id, {
          pinned: s.pinned,
          mutedUntil: s.muted_until,
          archived: s.archived,
        });
      }
    }

    // Build conversations with latest message
    const convos: Conversation[] = [];
    for (const s of sessions) {
      const participants = s.participants as string[];
      const isGroup = s.session_type === "group";
      const peerId = participants.find((p: string) => p !== user.id) ?? participants[0];
      const peer = profileMap.get(peerId) ?? { displayName: "User", handle: null, avatarUrl: null, uorGlyph: null };

      const groupMeta = groupMetaMap.get(s.id);
      const members = groupMembersMap.get(s.id);
      const settings = settingsMap.get(s.id);

      const { data: latestMsgs } = await supabase
        .from("encrypted_messages")
        .select("id, sender_id, ciphertext, created_at, message_hash, envelope_cid, message_type, deleted_at")
        .eq("session_id", s.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1);

      const lastMsg = latestMsgs?.[0] as any;

      // Count unread (messages from others without read_at)
      const { count: unreadCount } = await supabase
        .from("encrypted_messages")
        .select("id", { count: "exact", head: true })
        .eq("session_id", s.id)
        .neq("sender_id", user.id)
        .is("read_at", null)
        .is("deleted_at", null);

      // Skip archived conversations unless no filter
      const isArchived = settings?.archived ?? false;

      convos.push({
        id: s.id,
        sessionHash: s.session_hash,
        sessionType: s.session_type as "direct" | "group",
        createdAt: s.created_at,
        expiresAfterSeconds: (s as any).expires_after_seconds,
        peer: {
          userId: peerId,
          ...peer,
          // Override displayName with group name for group chats
          displayName: isGroup && groupMeta ? groupMeta.name : peer.displayName,
        },
        groupMeta: isGroup ? groupMeta : undefined,
        members: isGroup ? members : undefined,
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
        pinned: settings?.pinned ?? false,
        muted: settings?.mutedUntil ? new Date(settings.mutedUntil) > new Date() : false,
        archived: isArchived,
        settings,
      });
    }

    // Sort: pinned first, then by last message time
    convos.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const aTime = a.lastMessage?.createdAt ?? a.createdAt;
      const bTime = b.lastMessage?.createdAt ?? b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

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
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "conduit_sessions",
      }, () => fetchConversations())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
}
