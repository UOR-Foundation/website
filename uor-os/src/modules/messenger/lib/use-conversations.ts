/**
 * useConversations — fetches conduit_sessions, resolves peer profiles
 * via get_peer_profiles RPC, subscribes to realtime.
 * Supports both direct and group conversations.
 * 
 * Optimized: batch queries for latest messages + unread counts,
 * debounced realtime refetch.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Conversation, GroupMember, GroupMeta, ConversationSettings } from "./types";

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchRef = useRef(0);

  const fetchConversations = useCallback(async () => {
    if (!user) { setConversations([]); setLoading(false); return; }

    const { data: sessions, error } = await supabase
      .from("conduit_sessions")
      .select("id, session_hash, session_type, created_at, participants, revoked_at, expires_after_seconds")
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (error || !sessions || sessions.length === 0) { setConversations([]); setLoading(false); return; }

    const sessionIds = sessions.map(s => s.id);

    // Collect all user IDs we need profiles for
    const allUserIds = new Set<string>();
    for (const s of sessions) {
      for (const p of (s.participants as string[])) {
        if (p !== user.id) allUserIds.add(p);
      }
    }

    // Batch-fetch: peer profiles, latest messages, unread counts, group data, settings — ALL in parallel
    const profilesPromise = allUserIds.size > 0
      ? supabase.rpc("get_peer_profiles", { peer_ids: Array.from(allUserIds) })
      : Promise.resolve({ data: [] });

    // Get latest message per session (batch query instead of N+1)
    const latestMsgsPromise = supabase
      .from("encrypted_messages")
      .select("id, sender_id, ciphertext, created_at, message_hash, envelope_cid, message_type, deleted_at, session_id")
      .in("session_id", sessionIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // Get unread counts per session (batch)
    const unreadPromise = supabase
      .from("encrypted_messages")
      .select("session_id, id", { count: "exact" })
      .in("session_id", sessionIds)
      .neq("sender_id", user.id)
      .is("read_at", null)
      .is("deleted_at", null);

    const groupSessionIds = sessions.filter(s => s.session_type === "group").map(s => s.id);

    const groupMetaPromise = groupSessionIds.length > 0
      ? supabase.from("group_metadata").select("session_id, name, description, avatar_url, created_by, is_public").in("session_id", groupSessionIds)
      : Promise.resolve({ data: [] });

    const groupMembersPromise = groupSessionIds.length > 0
      ? supabase.from("group_members").select("session_id, user_id, role, joined_at, invited_by, muted_until").in("session_id", groupSessionIds)
      : Promise.resolve({ data: [] });

    const settingsPromise = supabase
      .from("conversation_settings")
      .select("session_id, pinned, muted_until, archived")
      .eq("user_id", user.id);

    const [profilesRes, latestMsgsRes, unreadRes, groupMetaRes, groupMembersRes, settingsRes] = await Promise.all([
      profilesPromise, latestMsgsPromise, unreadPromise, groupMetaPromise, groupMembersPromise, settingsPromise,
    ]);

    // Build profile map
    const profileMap = new Map<string, { displayName: string; handle: string | null; avatarUrl: string | null; uorGlyph: string | null }>();
    if (profilesRes.data) {
      for (const p of profilesRes.data as any[]) {
        profileMap.set(p.user_id, { displayName: p.display_name ?? "User", handle: p.handle, avatarUrl: p.avatar_url, uorGlyph: p.uor_glyph });
      }
    }

    // Build latest message map (pick first per session since ordered desc)
    const latestMsgMap = new Map<string, any>();
    if (latestMsgsRes.data) {
      for (const msg of latestMsgsRes.data as any[]) {
        if (!latestMsgMap.has(msg.session_id)) {
          latestMsgMap.set(msg.session_id, msg);
        }
      }
    }

    // Build unread count map — count per session from the flat list
    const unreadMap = new Map<string, number>();
    if (unreadRes.data) {
      for (const row of unreadRes.data as any[]) {
        unreadMap.set(row.session_id, (unreadMap.get(row.session_id) ?? 0) + 1);
      }
    }

    // Build group metadata maps
    const groupMetaMap = new Map<string, GroupMeta>();
    if (groupMetaRes.data) {
      for (const gm of groupMetaRes.data as any[]) {
        groupMetaMap.set(gm.session_id, { name: gm.name, description: gm.description, avatarUrl: gm.avatar_url, createdBy: gm.created_by, isPublic: gm.is_public });
      }
    }

    const groupMembersMap = new Map<string, GroupMember[]>();
    if (groupMembersRes.data) {
      for (const gm of groupMembersRes.data as any[]) {
        const list = groupMembersMap.get(gm.session_id) ?? [];
        const profile = profileMap.get(gm.user_id);
        list.push({
          userId: gm.user_id, role: gm.role as "admin" | "member", joinedAt: gm.joined_at,
          invitedBy: gm.invited_by, mutedUntil: gm.muted_until,
          displayName: gm.user_id === user.id ? "You" : (profile?.displayName ?? "User"),
          handle: profile?.handle ?? null, avatarUrl: profile?.avatarUrl ?? null, uorGlyph: profile?.uorGlyph ?? null,
        });
        groupMembersMap.set(gm.session_id, list);
      }
    }

    // Build settings map
    const settingsMap = new Map<string, ConversationSettings>();
    if (settingsRes.data) {
      for (const s of settingsRes.data as any[]) {
        settingsMap.set(s.session_id, { pinned: s.pinned, mutedUntil: s.muted_until, archived: s.archived });
      }
    }

    // Build conversations
    const convos: Conversation[] = sessions.map((s) => {
      const participants = s.participants as string[];
      const isGroup = s.session_type === "group";
      const peerId = participants.find((p: string) => p !== user.id) ?? participants[0];
      const peer = profileMap.get(peerId) ?? { displayName: "User", handle: null, avatarUrl: null, uorGlyph: null };
      const groupMeta = groupMetaMap.get(s.id);
      const members = groupMembersMap.get(s.id);
      const settings = settingsMap.get(s.id);
      const lastMsg = latestMsgMap.get(s.id);
      const unreadCount = unreadMap.get(s.id) ?? 0;

      return {
        id: s.id,
        sessionHash: s.session_hash,
        sessionType: s.session_type as "direct" | "group",
        createdAt: s.created_at,
        expiresAfterSeconds: (s as any).expires_after_seconds,
        peer: {
          userId: peerId, ...peer,
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
        unread: unreadCount,
        pinned: settings?.pinned ?? false,
        muted: settings?.mutedUntil ? new Date(settings.mutedUntil) > new Date() : false,
        archived: settings?.archived ?? false,
        settings,
      };
    });

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
    lastFetchRef.current = Date.now();
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Debounced refetch — max once per 3s for realtime events
  const debouncedRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const elapsed = Date.now() - lastFetchRef.current;
    if (elapsed > 3000) {
      fetchConversations();
    } else {
      debounceRef.current = setTimeout(fetchConversations, 3000 - elapsed);
    }
  }, [fetchConversations]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("messenger-sessions")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conduit_sessions" }, debouncedRefetch)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "encrypted_messages" }, debouncedRefetch)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conduit_sessions" }, debouncedRefetch)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [user, debouncedRefetch]);

  return { conversations, loading, refetch: fetchConversations };
}
