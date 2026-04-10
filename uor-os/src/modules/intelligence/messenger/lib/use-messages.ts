/**
 * useMessages — fetches encrypted_messages for a session,
 * subscribes to realtime inserts for live updates.
 * Supports reactions, soft-delete, and group sender names.
 * 
 * Optimized: optimistic local append on INSERT, full refetch only for UPDATE.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { DecryptedMessage, MessageType, DeliveryStatus, Reaction } from "./types";
import { getCachedSession } from "./messaging-protocol";
import { openMessage } from "@/modules/identity/uns/trust/messaging";
import { anchorMessage } from "./kg-anchoring";
import { showMessageNotification } from "./notifications";

export function useMessages(sessionId: string | null, sessionHash?: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const senderNameCacheRef = useRef(new Map<string, string>());

  const fetchMessages = useCallback(async () => {
    if (!sessionId || !user) { setMessages([]); setLoading(false); return; }

    const { data, error } = await supabase
      .from("encrypted_messages")
      .select("id, sender_id, ciphertext, created_at, message_hash, envelope_cid, parent_hashes, session_id, message_type, file_manifest, reply_to_hash, delivered_at, read_at, self_destruct_seconds, edited_at, deleted_at, source_platform")
      .eq("session_id", sessionId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error || !data) { setLoading(false); return; }

    // Fetch reactions + profiles in parallel
    const messageIds = data.map((r: any) => r.id);
    const senderIds = new Set(data.map((r: any) => r.sender_id).filter((id: string) => id !== user.id));

    const [reactionsRes, profilesRes] = await Promise.all([
      messageIds.length > 0
        ? supabase.from("message_reactions").select("message_id, user_id, emoji, created_at").in("message_id", messageIds)
        : Promise.resolve({ data: [] }),
      senderIds.size > 0
        ? supabase.rpc("get_peer_profiles", { peer_ids: Array.from(senderIds) })
        : Promise.resolve({ data: [] }),
    ]);

    const reactionsMap = new Map<string, Reaction[]>();
    if (reactionsRes.data) {
      for (const r of reactionsRes.data as any[]) {
        const list = reactionsMap.get(r.message_id) ?? [];
        list.push({ emoji: r.emoji, userId: r.user_id, createdAt: r.created_at });
        reactionsMap.set(r.message_id, list);
      }
    }

    const senderNameMap = senderNameCacheRef.current;
    if (profilesRes.data) {
      for (const p of profilesRes.data as any[]) {
        senderNameMap.set(p.user_id, p.display_name ?? "User");
      }
    }

    const session = sessionHash ? getCachedSession(sessionHash) : undefined;

    const msgs: DecryptedMessage[] = data.map((row: any) => {
      const sentByMe = row.sender_id === user.id;
      let deliveryStatus: DeliveryStatus = "sent";
      if (sentByMe) {
        if (row.read_at) deliveryStatus = "read";
        else if (row.delivered_at) deliveryStatus = "delivered";
      }

      return {
        id: row.id, sessionId: row.session_id, senderId: row.sender_id,
        senderName: sentByMe ? "You" : (senderNameMap.get(row.sender_id) ?? "User"),
        plaintext: "🔒 Encrypted", createdAt: row.created_at,
        messageHash: row.message_hash, envelopeCid: row.envelope_cid, sentByMe,
        messageType: (row.message_type ?? "text") as MessageType,
        deliveryStatus, deliveredAt: row.delivered_at, readAt: row.read_at,
        replyToHash: row.reply_to_hash, fileManifest: row.file_manifest,
        reactions: reactionsMap.get(row.id) ?? [],
        selfDestructSeconds: row.self_destruct_seconds,
        editedAt: row.edited_at, deletedAt: row.deleted_at,
        sourcePlatform: row.source_platform ?? "native",
      };
    });

    // Decrypt if session available
    if (session) {
      const decrypted = await Promise.all(
        data.map(async (row: any) => {
          try {
            const result = await openMessage(
              session, row.ciphertext,
              { envelope: {}, projections: { cid: row.envelope_cid } } as any,
              row.message_hash, row.parent_hashes as string[],
            );
            return result.plaintext;
          } catch { return "🔒 Encrypted"; }
        })
      );
      const decryptedMsgs = msgs.map((m, i) => ({ ...m, plaintext: decrypted[i] }));
      setMessages(decryptedMsgs);

      for (const msg of decryptedMsgs) {
        if (msg.plaintext !== "🔒 Encrypted" && sessionHash) {
          anchorMessage(msg, user.id, sessionHash).catch(() => {});
        }
      }
    } else {
      setMessages(msgs);
    }

    setLoading(false);
  }, [sessionId, sessionHash, user]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription — optimistic for INSERTs, full refetch for UPDATEs
  useEffect(() => {
    if (!sessionId || !user) return;

    const channel = supabase
      .channel(`messages-${sessionId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "encrypted_messages",
        filter: `session_id=eq.${sessionId}`,
      }, (payload: any) => {
        const row = payload.new;
        if (!row) { fetchMessages(); return; }

        // Optimistic append
        const sentByMe = row.sender_id === user.id;
        const newMsg: DecryptedMessage = {
          id: row.id, sessionId: row.session_id, senderId: row.sender_id,
          senderName: sentByMe ? "You" : (senderNameCacheRef.current.get(row.sender_id) ?? "User"),
          plaintext: "🔒 Encrypted", createdAt: row.created_at,
          messageHash: row.message_hash, envelopeCid: row.envelope_cid, sentByMe,
          messageType: (row.message_type ?? "text") as MessageType,
          deliveryStatus: "sent", deliveredAt: row.delivered_at, readAt: row.read_at,
          replyToHash: row.reply_to_hash, fileManifest: row.file_manifest,
          reactions: [], selfDestructSeconds: row.self_destruct_seconds,
          editedAt: row.edited_at, deletedAt: row.deleted_at,
          sourcePlatform: row.source_platform ?? "native",
        };

        setMessages(prev => {
          if (prev.some(m => m.id === row.id)) return prev;
          return [...prev, newMsg];
        });

        // Full refetch in background for decryption
        fetchMessages();

        if (!sentByMe) {
          showMessageNotification("New message", "Encrypted message", sessionId);
        }
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "encrypted_messages",
        filter: `session_id=eq.${sessionId}`,
      }, () => fetchMessages())
      .subscribe();

    // Reactions — patch locally when possible
    const reactionsChannel = supabase
      .channel(`reactions-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(reactionsChannel);
    };
  }, [sessionId, user, fetchMessages]);

  return { messages, loading, refetch: fetchMessages };
}
